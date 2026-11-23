import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LESSON_SLUGS, lessonBySlug, lessonName } from "../catalogue";
import { CLIPS, clipId, clipText } from "../clips";
import {
  type ChoiceDrill,
  type DrillBank,
  type DrillItem,
  type DrillText,
  drawOptions,
  drillWord,
} from "../drill";
import { learnI18n } from "../i18n";
import { formMatches } from "../practice";
import VERIFIED from "../verified-forms.json";
import { ALLOWED_NEAR_PAIRS, ALLOWED_STRATEGIES } from "./allowed-quizzes";
import { formsIn, VERIFIED_FORMS_PATH } from "./forms";
import {
  fairCap,
  nearPair,
  type PickRound,
  placeShares,
  plain,
  STRATEGIES,
  seeded,
  strategyScore,
} from "./giveaways";

const BANKS = import.meta.glob<{ DRILLS: DrillBank }>(
  "../../../components/learn/lessons/*.drills.ts",
  { eager: true },
);
const LOCALES = ["en", "uk", "ru"] as const;
const FEWEST_ITEMS = 24;
const FEWEST_RULES = 3;
const FEWEST_PER_RULE = 4;
const LONGEST_GAP = 12;
const DRAWS = 200;

const banks = Object.entries(BANKS).map(([path, { DRILLS }]) => {
  const file = path.split("/").at(-1) ?? "";
  const slug = LESSON_SLUGS.find((each) => `${lessonName(each)}.drills.ts` === file) ?? file;
  return { slug, file: `apps/site/src/components/learn/lessons/${file}`, bank: DRILLS };
});

const MANIFEST = JSON.parse(
  readFileSync(
    new URL("../../../../public/audio/estonian-lessons/manifest.json", import.meta.url),
    "utf8",
  ),
) as Record<string, unknown>;

const heardIn = (slug: string, item: DrillItem): string | undefined => {
  const clip = CLIPS[slug]?.[clipId(item.say)];
  return clip === undefined ? undefined : clipText(clip);
};

const estonianIn = (text: DrillText): string => ("et" in text ? text.et : "");

const choices = ({ answer, slip, wrong }: ChoiceDrill) => [
  answer,
  ...(slip ? [slip] : []),
  ...wrong,
];

function estonianOf(item: DrillItem): string {
  switch (item.kind) {
    case "form":
      return [
        item.base,
        estonianIn(item.cue),
        ...item.answers,
        ...(item.wrong ?? []),
        item.say,
      ].join(" ");
    case "choice":
      return [item.say, ...choices(item).map(({ label }) => estonianIn(label))].join(" ");
    case "gap":
      return [
        item.say,
        ...[item.answer, ...item.wrong].map((word) => `${item.before}${word}${item.after}`),
      ].join(" ");
  }
}

interface Pick {
  answer: string;
  slip?: string | undefined;
  wrong: readonly string[];
}

const offered = ({ answer, slip, wrong }: Pick) => [
  answer,
  ...(slip === undefined ? [] : [slip]),
  ...wrong,
];

const estonianInExplain = /<et>(.*?)<\/et>/g;

const picks = (item: DrillItem, read: (text: DrillText) => string): Pick | null => {
  switch (item.kind) {
    case "form":
      return item.wrong ? { answer: item.answers[0], wrong: item.wrong } : null;
    case "choice":
      return {
        answer: read(item.answer.label),
        slip: item.slip && read(item.slip.label),
        wrong: item.wrong.map(({ label }) => read(label)),
      };
    case "gap":
      return { answer: item.answer, wrong: item.wrong };
  }
};

function expectNone(problems: readonly string[], rule: string) {
  expect(problems, `${rule}\n\n${problems.join("\n\n")}\n`).toEqual([]);
}

describe.each(banks)("drill bank $slug", ({ slug, file, bank }) => {
  const at = (item: DrillItem) => `${file}: item "${item.id}"`;

  it("belongs to a built lesson and holds enough items on enough rules", () => {
    expect(lessonBySlug(slug)?.slug).toBe(slug);
    expect(bank.items.length).toBeGreaterThanOrEqual(FEWEST_ITEMS);
    const perRule = Object.keys(bank.rules).map(
      (rule) => bank.items.filter((item) => item.rule === rule).length,
    );
    expect(perRule.length).toBeGreaterThanOrEqual(FEWEST_RULES);
    expect(Math.min(...perRule)).toBeGreaterThanOrEqual(FEWEST_PER_RULE);
  });

  it("gives each item one id and a rule the bank holds", () => {
    const seen = new Set<string>();
    const problems = bank.items.flatMap((item) => {
      const found: string[] = [];
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id))
        found.push(`${at(item)}: not lowercase letters, digits and hyphens.`);
      if (seen.has(item.id))
        found.push(`${at(item)}: two items share this id, so they share one schedule.`);
      seen.add(item.id);
      if (!bank.rules[item.rule]) found.push(`${at(item)}: no rule “${item.rule}” in the bank.`);
      return found;
    });
    expectNone(problems, "Item ids and rules (checklists.md#drill-banks)");
    for (const rule of Object.keys(bank.rules)) expect(rule).toMatch(/^[a-z0-9-]+$/);
  });

  it("uses only Estonian forms checked in Sõnaveeb", async () => {
    const i18n = await learnI18n("en", lessonName(slug));
    const problems = bank.items.flatMap((item) => {
      const told = [...i18n._(item.explain).matchAll(estonianInExplain)].map(([, et]) => et ?? "");
      return formsIn([estonianOf(item), ...told].join(" "))
        .filter((form) => !(form in VERIFIED))
        .map((form) => `${at(item)}: “${form}” isn't in ${VERIFIED_FORMS_PATH}.`);
    });
    expectNone(problems, "Every Estonian form is checked (SKILL.md step 2)");
  });

  it("plays a recorded clip that says the item’s answer", () => {
    const problems = bank.items.flatMap((item) => {
      const name = `${slug}/${clipId(item.say)}`;
      const text = heardIn(slug, item);
      if (text === undefined || !(name in MANIFEST))
        return [`${at(item)}: plays ${name}, which CLIPS or the audio manifest doesn't hold.`];
      const found: string[] = [];
      if (text !== item.say)
        found.push(`${at(item)}: shows “${item.say}”, the clip says “${text}”.`);
      const word = item.kind === "choice" ? "" : drillWord(item);
      if (!` ${plain(text)} `.includes(` ${plain(word)} `.replace(/^ {2}$/, " ")))
        found.push(`${at(item)}: its clip says “${text}”, without the answer “${word}”.`);
      return found;
    });
    expectNone(problems, "Clips (SKILL.md step 6)");
  });

  it("offers the answer once and only wrong options that are wrong", () => {
    const problems = bank.items.flatMap((item) => {
      const pick = picks(item, (text) => ("et" in text ? text.et : (text.message ?? text.id)));
      if (!pick) return [];
      const options = offered(pick);
      const right = item.kind === "form" ? item.answers : [pick.answer];
      return [
        ...(pick.wrong.length === 0 ? [`${at(item)}: offers nothing but its answer.`] : []),
        ...(new Set(options.map(plain)).size < options.length
          ? [`${at(item)}: offers one option twice: ${options.join(", ")}.`]
          : []),
        ...offered(pick)
          .slice(1)
          .filter((wrong) => formMatches(wrong, right))
          .map((wrong) => `${at(item)}: marks the right answer “${wrong}” wrong.`),
      ];
    });
    expectNone(problems, "Options (checklists.md#drill-banks)");
  });

  it("keeps a gap’s sentence short enough for a phone", () => {
    const problems = bank.items.flatMap((item) =>
      item.kind === "gap"
        ? [item.answer, ...item.wrong]
            .map((word) => `${item.before}${word}${item.after}`)
            .filter((text) => [...text].length > LONGEST_GAP)
            .map(
              (text) =>
                `${at(item)}: “${text}” is longer than ${LONGEST_GAP} characters and runs past the card at 375 px. Fix: make it a form item, with the sentence as its cue.`,
            )
        : [],
    );
    expectNone(problems, "Gap length (checklists.md#which-kit-part)");
  });

  it("names its rules and sections that exist", async () => {
    const i18n = await learnI18n("en", lessonName(slug));
    const source = readFileSync(
      new URL(`../../../components/learn/lessons/${lessonName(slug)}.tsx`, import.meta.url),
      "utf8",
    );
    for (const { label, section } of Object.values(bank.rules)) {
      expect(i18n._(label).length).toBeGreaterThan(0);
      expect(source).toContain(`id: "${section}"`);
    }
  });

  it.each(["uk", "ru"] as const)(
    "labels every rule and explains every item in %s",
    async (locale) => {
      const [english, i18n] = await Promise.all([
        learnI18n("en", lessonName(slug)),
        learnI18n(locale, lessonName(slug)),
      ]);
      const lines = [
        ...Object.values(bank.rules).map(({ label }) => label),
        ...bank.items.map(({ explain }) => explain),
      ];
      const problems = lines.flatMap((line) => {
        const text = i18n._(line);
        const tags = (each: string) => each.match(/<et>/g)?.length ?? 0;
        if (!/\p{Script=Cyrillic}/u.test(text))
          return [`${file}: “${english._(line)}” has no ${locale} line.`];
        return tags(text) === tags(english._(line))
          ? []
          : [`${file}: the ${locale} line “${text}” marks less or more Estonian than the English.`];
      });
      expectNone(problems, "Rule labels and explanations in every language");
    },
  );

  describe.each(LOCALES)("its options in %s", (locale) => {
    const units = async () => {
      const i18n = await learnI18n(locale, lessonName(slug));
      const read = (text: DrillText) => ("et" in text ? text.et : i18n._(text));
      const found = new Map<string, { item: DrillItem; pick: Pick }[]>();
      for (const item of bank.items) {
        const pick = picks(item, read);
        const id = `drill-${item.rule}-${item.kind}`;
        if (pick) found.set(id, [...(found.get(id) ?? []), { item, pick }]);
      }
      return [...found].map(([id, items]) => {
        const random = seeded(id.length * 7919 + 1);
        const mix = <T>(list: readonly T[]): T[] => {
          const out = [...list];
          for (let i = out.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [out[i], out[j]] = [out[j] as T, out[i] as T];
          }
          return out;
        };
        const rounds = items.flatMap(({ item, pick }) =>
          Array.from({ length: DRAWS }, (): PickRound => {
            const options = drawOptions(pick, mix);
            return { options, answer: options.indexOf(pick.answer), heard: heardIn(slug, item) };
          }),
        );
        return { id, items, rounds };
      });
    };

    it.runIf(locale === "en")(
      "never offers an option that is another plus a letter or two",
      async () => {
        const problems = (await units()).flatMap(({ id, rounds }) => {
          if (ALLOWED_NEAR_PAIRS.some((each) => each.lesson === slug && each.quiz === id))
            return [];
          const near = new Set<string>();
          for (const { options } of rounds)
            options.forEach((a, i) => {
              for (const b of options.slice(i + 1)) if (nearPair(a, b)) near.add(`${a} / ${b}`);
            });
          return near.size
            ? [
                `${file}: ${id} offers ${[...near].slice(0, 3).join(", ")}, so a learner can pick by shape. Fix: choose other wrong options, or list the unit in ALLOWED_NEAR_PAIRS with the reason.`,
              ]
            : [];
        });
        expectNone(problems, "No option is another plus a letter or two (checklists.md#quizzes)");
      },
    );

    it.runIf(locale === "en")(
      "puts each answer in every place and never names it by its options",
      async () => {
        const problems = (await units()).flatMap(({ id, items, rounds }) => {
          const found: string[] = [];
          for (const count of new Set(rounds.map(({ options }) => options.length)))
            if (placeShares(rounds, count).some((share) => share === 0 || share > fairCap(count)))
              found.push(`${file}: ${id} favours a place among ${count} options.`);
          const answers = new Map<string, Set<string>>();
          for (const { pick } of items) {
            const set = offered(pick).sort().join(" · ");
            answers.set(set, (answers.get(set) ?? new Set()).add(pick.answer));
          }
          for (const { pick, item } of items) {
            const set = offered(pick).sort().join(" · ");
            if (offered(pick).length < 4 && answers.get(set)?.size === 1)
              found.push(
                `${file}: ${id} item "${item.id}" always offers ${set}, so the set names the answer. Fix: give it a third wrong option, or an item whose answer is another of them.`,
              );
          }
          return found;
        });
        expectNone(problems, "The options never give the answer away (checklists.md#quizzes)");
      },
    );

    it("scores a learner who doesn’t read or listen at chance", async () => {
      const problems = (await units()).flatMap(({ id, rounds }) => {
        const choices = rounds.filter(({ options }) => options.length > 2);
        return STRATEGIES.flatMap((strategy) => {
          const { score, chance, rounds: scored } = strategyScore(strategy, choices);
          const allowed = ALLOWED_STRATEGIES.some(
            (each) => each.lesson === slug && each.quiz === id && each.strategy === strategy.name,
          );
          return scored === 0 || score <= chance + 0.25 || allowed
            ? []
            : [
                `${file}: ${id} in ${locale}: “${strategy.name}” scores ${Math.round(score * 100)}% where chance is ${Math.round(chance * 100)}%. Fix: ${strategy.fix}.`,
              ];
        });
      });
      expectNone(problems, "No cheap rule beats chance (checklists.md#quizzes)");
    });
  });
});
