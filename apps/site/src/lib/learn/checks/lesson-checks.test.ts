/**
 * The review findings on the first Estonian lessons, as checks every lesson runs. Each lesson
 * page is rendered as the server renders it, and the kit's parts record what they were given, so
 * a check can read a quiz's items and run its order the way the browser does.
 *
 * A failure names the file and line, the rule, and the fix. The rules and the PRs they come from
 * are in .agents/skills/estonian-lesson/references/checklists.md.
 */
import { appendFileSync, readFileSync } from "node:fs";
import { I18nProvider } from "@lingui/react";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { LearnPage, prepareLearnPage } from "../../../components/learn/learn-page";
import { CLIPS, clipSentences, clipText, isConversation, isPassage } from "../clips";
import { gapLine } from "../passage";
import type { PassageQuestion } from "../questions";
import { shuffledRun } from "../quiz";
import { SENTENCE_KINDS } from "../sentences";
import VERIFIED from "../verified-forms.json";
import { ALLOWED_NEAR_PAIRS, ALLOWED_STRATEGIES } from "./allowed-quizzes";
import { formsIn, lessonForms, VERIFIED_FORMS_PATH } from "./forms";
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
import { elements, parse, textOf, textRuns } from "./html";
import { KNOWN_ISSUES } from "./known-issues";
import {
  type CheckLocale,
  CHECK_I18N,
  LOCALES,
  labelSource,
  rendered,
  renderLesson,
  SLUGS,
  type Slug,
  where,
} from "./lessons";
import { nameProblems, questionProblems } from "./questions";
import { recording, resetRecording } from "./record";
import { repeatedIds, sentenceProblems, writtenItems } from "./sentences";

/**
 * Every `Object.fromEntries` the lesson modules make while they load. A glossary built from a list
 * keeps only the last entry for a form, so the glossary check reads what each call was given.
 */
const madeEntries = vi.hoisted(() => {
  const calls: {
    entries: (readonly [PropertyKey, unknown])[];
    made: Record<PropertyKey, unknown>;
  }[] = [];
  const original = Object.fromEntries;
  Object.fromEntries = ((entries: Iterable<readonly [PropertyKey, unknown]>) => {
    const list = [...entries];
    const made = original(list);
    calls.push({ entries: list, made });
    return made;
  }) as typeof Object.fromEntries;
  return { calls, original };
});
// The lessons have loaded by now; renders don't build glossaries.
Object.fromEntries = madeEntries.original;

vi.mock("../../../components/learn/Quiz", async (importOriginal) => {
  const kit = await importOriginal<typeof import("../../../components/learn/Quiz")>();
  const { recorded } = await import("./record");
  return { ...kit, Quiz: recorded("Quiz", kit.Quiz as never) as unknown as typeof kit.Quiz };
});
vi.mock("../../../components/learn/GapPassage", async (importOriginal) => {
  const kit = await importOriginal<typeof import("../../../components/learn/GapPassage")>();
  const { recorded } = await import("./record");
  return { ...kit, GapPassage: recorded("GapPassage", kit.GapPassage as never) };
});
vi.mock("../../../components/learn/Dialogue", async (importOriginal) => {
  const kit = await importOriginal<typeof import("../../../components/learn/Dialogue")>();
  const { recorded } = await import("./record");
  return { ...kit, Dialogue: recorded("Dialogue", kit.Dialogue as never) };
});
vi.mock("../../../components/learn/Passage", async (importOriginal) => {
  const kit = await importOriginal<typeof import("../../../components/learn/Passage")>();
  const { recorded } = await import("./record");
  return {
    ...kit,
    Listening: recorded("Listening", kit.Listening as never),
    Reading: recorded("Reading", kit.Reading as never),
  };
});
vi.mock("../../../components/learn/Explore", async (importOriginal) => {
  const kit = await importOriginal<typeof import("../../../components/learn/Explore")>();
  const { recorded } = await import("./record");
  return {
    ...kit,
    Chips: recorded("Chips", kit.Chips as never) as unknown as typeof kit.Chips,
    Compare: recorded("Compare", kit.Compare as never) as unknown as typeof kit.Compare,
  };
});
vi.mock("../player", async (importOriginal) => {
  const player = await importOriginal<typeof import("../player")>();
  const { recording } = await import("./record");
  return {
    ...player,
    playSound: (src: string) => {
      recording.played.push(src);
      return Promise.resolve();
    },
    playInTurn: (items: readonly { src: string }[]) => {
      recording.played.push(...items.map((item) => item.src));
      return Promise.resolve();
    },
    playSlowly: (src: string) => {
      recording.played.push(src);
      return Promise.resolve();
    },
    // Never settles: a press only needs to show which clip it asks for.
    loudness: (src: string) => {
      recording.played.push(src);
      return new Promise(() => {});
    },
  };
});

/**
 * A state the clip check renders the page in: every `useState` whose first value is `from` starts
 * at `to` instead, as if the learner had pressed the chip for `to`.
 */
const forced = vi.hoisted(() => ({ state: null as { from: unknown; to: unknown } | null }));
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return {
    ...react,
    useState: (initial: unknown) =>
      react.useState(
        forced.state !== null && Object.is(initial, forced.state.from) ? forced.state.to : initial,
      ),
  };
});
vi.mock("../../../components/learn/LessonView", async (importOriginal) => {
  const kit = await importOriginal<typeof import("../../../components/learn/LessonView")>();
  const { recording } = await import("./record");
  return {
    ...kit,
    LessonView: (props: Parameters<typeof kit.LessonView>[0]) => {
      recording.view = props as never;
      return kit.LessonView(props);
    },
  };
});
vi.mock("../../../components/learn/lesson-context", async (importOriginal) => {
  const kit = await importOriginal<typeof import("../../../components/learn/lesson-context")>();
  const { recording } = await import("./record");
  return {
    ...kit,
    useWord: (word: string) => {
      const found = kit.useWord(word);
      recording.words.push({ word, glossed: !!found.gloss, clip: found.src });
      return found;
    },
  };
});
vi.mock("../clips", async (importOriginal) => {
  const clips = await importOriginal<typeof import("../clips")>();
  const { recording } = await import("./record");
  return {
    ...clips,
    clipUrl: (lesson: string, id: string) => {
      recording.clips.push({ lesson, id });
      return clips.clipUrl(lesson, id);
    },
  };
});

/** Fails with every problem at once, one per line, so a lesson is fixed in one pass. */
function expectNone(problems: readonly string[], rule: string) {
  expect(problems, `${rule}\n\n${problems.join("\n\n")}\n`).toEqual([]);
}

/** The known issues each listed lesson still has, so a fixed lesson comes off the list. */
const stillKnown = new Set<string>();

/** The problems `known-issues.ts` doesn't excuse for this lesson and check. */
function unlessKnown(problems: readonly string[], check: string, slug: string): readonly string[] {
  if (!KNOWN_ISSUES[check]?.includes(slug)) return problems;
  if (problems.length) stillKnown.add(`${check}/${slug}`);
  return [];
}

/** As `expectNone`, except for a lesson `known-issues.ts` lists for this check. */
function expectNoneUnlessKnown(
  problems: readonly string[],
  rule: string,
  check: string,
  slug: string,
) {
  expectNone(unlessKnown(problems, check, slug), rule);
}

afterAll(() => {
  // A run filtered with -t sees no known issue at all, and says nothing.
  if (stillKnown.size === 0) return;
  const fixed = Object.entries(KNOWN_ISSUES).flatMap(([check, slugs]) =>
    slugs.filter((slug) => !stillKnown.has(`${check}/${slug}`)).map((slug) => `${check}: ${slug}`),
  );
  expect(
    fixed,
    "These lessons now pass. Take them off KNOWN_ISSUES in apps/site/src/lib/learn/checks/known-issues.ts.",
  ).toEqual([]);
});

const RUNS = 300;
const QUIZ_PARTS = new Set([
  "Quiz",
  "GapPassage",
  "Dialogue",
  "Listening",
  "Reading",
  "Sort",
  "Match",
]);

interface QuizProps {
  id: string;
  items: readonly Record<string, unknown>[];
  rounds?: number;
  order?: (items: readonly unknown[], pinned?: unknown) => readonly unknown[];
}

const quizzes = (slug: Slug) =>
  rendered(slug, "en")
    .recording.parts.filter((call) => call.part === "Quiz")
    .map((call) => call.props as unknown as QuizProps);

/** A quiz's runs as the browser makes them: the first pins the server's first item, later ones don't. */
function runs(quiz: QuizProps): (readonly Record<string, unknown>[])[] {
  const order = quiz.order ?? shuffledRun;
  return Array.from(
    { length: RUNS },
    (_, run) =>
      order(quiz.items, run === 0 ? quiz.items[0] : undefined) as Record<string, unknown>[],
  );
}

const total = (quiz: QuizProps) => Math.min(quiz.rounds ?? quiz.items.length, quiz.items.length);
const optionId = (option: unknown) =>
  typeof option === "string" ? option : String((option as { id: string }).id);

const labelTexts = new WeakMap<object, string>();
/** An option's visible text: the string itself, or its label rendered the way the page renders it. */
function shown(option: unknown, locale: CheckLocale): string {
  if (typeof option === "string") return option;
  const { id, label } = option as { id: string; label?: unknown };
  if (typeof label === "string" || typeof label === "number") return String(label);
  if (typeof label !== "object" || label === null) return String(id);
  let text = labelTexts.get(label);
  if (text === undefined) {
    const html = renderToStaticMarkup(
      // oxlint-disable-next-line react/no-children-prop -- I18nProvider's props type requires children, and this .ts file has no JSX.
      createElement(I18nProvider, { i18n: CHECK_I18N[locale], children: label as ReactNode }),
    );
    text = textOf(parse(html, locale)).trim() || String(id);
    labelTexts.set(label, text);
  }
  return text;
}

/** A quiz whose every item offers options to pick from: ChoiceRound, GapRound and their kin. */
const picks = (quiz: QuizProps) =>
  quiz.items.length > 1 &&
  quiz.items.every((item) => Array.isArray(item.options) && "answer" in item);

/** A round as the learner sees it, or undefined when its options don't hold the answer. */
function pickRound(item: Record<string, unknown>, locale: CheckLocale): PickRound | undefined {
  const options = item.options as unknown[];
  const answer = options.findIndex((option) => optionId(option) === String(item.answer));
  return answer < 0
    ? undefined
    : {
        options: options.map((option) => shown(option, locale)),
        answer,
        heard: heardText(item.src),
      };
}

/** What a round's clip says, found from its URL's lesson and id. */
function heardText(src: unknown): string | undefined {
  const [, lesson, id] = String(src).match(/([^/]+)\/([^/]+)\.mp3$/) ?? [];
  const clip = lesson && id ? CLIPS[lesson]?.[id] : undefined;
  return clip === undefined ? undefined : clipText(clip);
}

const SIMULATED = 200;

/**
 * A quiz's runs as learners meet them, drawn from a seeded random source: `first` as the page
 * opens, its first round pinned to the server's, and `later` after Try again.
 */
function simulate(
  quiz: QuizProps,
  locale: CheckLocale,
): { first: PickRound[][]; later: PickRound[][] } {
  const order = quiz.order ?? shuffledRun;
  const spy = vi.spyOn(Math, "random").mockImplementation(seeded(quiz.id.length * 7919 + 1));
  try {
    const run = (pinned: boolean) =>
      (order(quiz.items, pinned ? quiz.items[0] : undefined) as Record<string, unknown>[])
        .slice(0, total(quiz))
        .map((item) => pickRound(item, locale))
        .filter((round) => round !== undefined);
    return {
      first: Array.from({ length: SIMULATED }, () => run(true)),
      later: Array.from({ length: SIMULATED }, () => run(false)),
    };
  } finally {
    spy.mockRestore();
  }
}

interface GapProps {
  id: string;
  mode: "pick" | "drag";
  gaps: readonly { answer: string; options?: readonly string[] }[];
}

interface PickUnit {
  /** A pick quiz, a gap passage, a dialogue's replies, or a listening or reading part's questions. */
  kind: "quiz" | "passage" | "dialogue" | "questions";
  id: string;
  /** A quiz's first runs, or the one run of a part whose options keep their order. */
  first: PickRound[][];
  later: PickRound[][];
}

interface DialogueProps {
  id: string;
  turns: readonly (
    | { who: "them"; clip: string }
    | { who: "you"; clip: string; replies: readonly { line: string; right?: boolean }[] }
  )[];
}

interface QuestionsProps {
  id: string;
  clip?: string;
  questions: readonly PassageQuestion[];
}

const unitsBySlug = new Map<string, PickUnit[]>();

/**
 * Each place a learner picks from, with its options as `locale` shows them: a pick quiz's
 * simulated runs, a pick passage's gaps, a dialogue's turns, a passage's questions.
 */
function pickUnits(slug: Slug, locale: CheckLocale): PickUnit[] {
  const key = `${slug}/${locale}`;
  const known = unitsBySlug.get(key);
  if (known) return known;
  const units: PickUnit[] = [];
  unitsBySlug.set(key, units);
  for (const { part, props } of rendered(slug, locale).recording.parts) {
    if (part === "Quiz" && picks(props as unknown as QuizProps)) {
      const quiz = props as unknown as QuizProps;
      units.push({ kind: "quiz", id: quiz.id, ...simulate(quiz, locale) });
    }
    if (part === "GapPassage" && (props as unknown as GapProps).mode === "pick") {
      const passage = props as unknown as GapProps;
      const gaps = passage.gaps
        .filter((gap) => (gap.options?.length ?? 0) > 1)
        .map((gap) => pickRound(gap as unknown as Record<string, unknown>, locale))
        .filter((round) => round !== undefined);
      units.push({ kind: "passage", id: passage.id, first: [gaps], later: [] });
    }
    if (part === "Dialogue") {
      const dialogue = props as unknown as DialogueProps;
      const turns = dialogue.turns.flatMap((turn) =>
        turn.who === "you" && turn.replies.some((reply) => reply.right)
          ? [
              {
                options: turn.replies.map((reply) => reply.line),
                answer: turn.replies.findIndex((reply) => reply.right),
              },
            ]
          : [],
      );
      units.push({ kind: "dialogue", id: dialogue.id, first: [turns], later: [] });
    }
    if (part === "Listening" || part === "Reading") {
      const { id, questions } = props as unknown as QuestionsProps;
      const asked = questions
        .filter((question) => question.kind === undefined || question.kind === "pick")
        .map((question) => pickRound(question as unknown as Record<string, unknown>, locale))
        .filter((round) => round !== undefined);
      units.push({ kind: "questions", id, first: [asked], later: [] });
    }
  }
  return units;
}

/** The fewest rounds a part whose options keep their order needs before a rule's score means much. */
const FEWEST_FIXED = { passage: 4, dialogue: 3, questions: 3 } as const;

const MANIFEST = JSON.parse(
  readFileSync(
    new URL("../../../../public/audio/estonian-lessons/manifest.json", import.meta.url),
    "utf8",
  ),
) as Record<string, unknown>;

/** A clip URL's `lesson/id`, or undefined for any other sound. */
const clipName = (src: string) => src.match(/\/estonian-lessons\/([^/]+\/[^/]+)\.mp3$/)?.[1];

interface ChipsProps {
  label: string;
  items: readonly { value: string | number }[];
  value: string | number | null;
  onPick: (value: string | number) => void;
}

/** A chip row by its label and values, since two rows can share a label. */
const chipKey = (chip: ChipsProps) =>
  JSON.stringify([chip.label, chip.items.map((item) => item.value)]);

/** How a learner reaches a clip, and what in the lesson's source to point a failure at. */
interface Reach {
  how: string;
  near: readonly string[];
}

const reachBySlug = new Map<Slug, Map<string, Reach>>();

/**
 * Every clip the page can play, each with how a learner reaches it: on the page as rendered, in a
 * dialogue turn not shown yet, by pressing a chip, or on the page as a chip leaves it. A server
 * render shows one state, so this presses each chip and renders the page once per chip value.
 */
function reachableClips(slug: Slug): Map<string, Reach> {
  const known = reachBySlug.get(slug);
  if (known) return known;
  const reach = new Map<string, Reach>();
  reachBySlug.set(slug, reach);
  const add = (name: string | undefined, how: string, near: readonly string[] = []) => {
    if (!name || reach.has(name)) return;
    const id = name.split("/")[1] ?? "";
    reach.set(name, { how, near: [...near, `"${id}"`, `w="${id}"`] });
  };
  const chipNear = (chip: ChipsProps) => [`t\`${chip.label}\``, "<Chips"];
  const page = rendered(slug, "en");
  for (const { lesson, id } of page.recording.clips) add(`${lesson}/${id}`, "the page plays");
  const chips: ChipsProps[] = [];
  for (const { part, props } of page.recording.parts) {
    if (part === "Dialogue")
      for (const turn of (props as unknown as DialogueProps).turns)
        add(`${slug}/${turn.clip}`, `dialogue "${String(props.id)}" plays`, [
          `id="${String(props.id)}"`,
        ]);
    if (part === "Chips") chips.push(props as unknown as ChipsProps);
    if (part === "Compare") {
      const compare = props as unknown as {
        pairs: readonly (readonly string[])[];
        src: (word: string) => string;
      };
      for (const word of compare.pairs.flat())
        add(clipName(compare.src(word)), `the Compare pairs play, as for “${word}”,`, ["<Compare"]);
    }
  }
  // A press after the server render sets state on a page that is gone, which React ignores.
  for (const chip of chips)
    for (const { value } of chip.items) {
      resetRecording();
      chip.onPick(value);
      const how = `pressing the ${chip.label} chip “${value}” plays`;
      for (const { lesson, id } of recording.clips) add(`${lesson}/${id}`, how, chipNear(chip));
      for (const src of recording.played) add(clipName(src), how, chipNear(chip));
    }
  for (const chip of chips) {
    // A chip's value usually starts as its own useState; booleans and null say too little to find it.
    if (typeof chip.value !== "string" && typeof chip.value !== "number") continue;
    for (const { value } of chip.items) {
      if (value === chip.value) continue;
      forced.state = { from: chip.value, to: value };
      try {
        const after = renderLesson(slug, "en");
        // Another state that started at the same value moved instead, and the chip stayed.
        const moved = after.recording.parts.some(
          ({ part, props }) =>
            part === "Chips" &&
            props.value === value &&
            chipKey(props as unknown as ChipsProps) === chipKey(chip),
        );
        if (!moved) continue;
        for (const { lesson, id } of after.recording.clips)
          add(
            `${lesson}/${id}`,
            `after pressing the ${chip.label} chip “${value}”, the page plays`,
            chipNear(chip),
          );
      } catch {
        // Another state that starts at the same value can't take this one; the page never gets there.
      } finally {
        forced.state = null;
      }
    }
  }
  resetRecording();
  return reach;
}

function askedProblems(part: string, props: Record<string, unknown>, at: string): string[] {
  if (part !== "Listening" && part !== "Reading") return [];
  const { questions } = props as unknown as QuestionsProps;
  const shown = ("turns" in props ? { turns: props.turns } : props) as unknown as Parameters<
    typeof clipSentences
  >[0];
  return [
    ...questionProblems(questions, clipSentences(shown)),
    ...(isConversation(shown)
      ? [...nameProblems(shown, props.names as Parameters<typeof nameProblems>[1])]
      : []),
  ].map((problem) => `${at}: ${part} "${String(props.id)}": ${problem}.`);
}

const spokenLines = (clip: Parameters<typeof clipSentences>[0]) =>
  isConversation(clip)
    ? clip.turns.map((turn) => `${turn.voice}: ${[turn.text].flat().join(" ")}`).join("\n")
    : clip.sentences.join(" ");

const percent = (share: number) => `${Math.round(share * 100)}%`;

/** The rules that find the answer as the option most like the rest. */
const MAJORITY = new Set([
  "pick the one sharing the most words with the others",
  "pick the one sharing the most letters at its ends with the others",
]);

const KIND_NAMES = {
  quiz: "quiz",
  passage: "gap passage",
  dialogue: "dialogue",
  questions: "the questions of",
} as const;

/** A unit's options and answers, to tell whether another language shows the same. */
const roundsKey = (unit: PickUnit) =>
  JSON.stringify(
    [...unit.first, ...unit.later].flat().map((round) => [round.options, round.answer]),
  );

const SENTENCE_KNOWN = { verified: VERIFIED as Record<string, string>, clipSays: heardText };
const SENTENCE_RULE = "Written sentences can be marked fairly (checklists.md#quizzes)";

describe("the kit page", () => {
  it.each(LOCALES)("shows written sentences that can be marked fairly, in %s", async (locale) => {
    await prepareLearnPage({ kind: "kit" }, locale);
    resetRecording();
    renderToStaticMarkup(createElement(LearnPage, { target: { kind: "kit" }, locale }));
    const items = writtenItems(recording.parts);
    resetRecording();
    expect(new Set(items.map(({ item }) => item.kind))).toEqual(
      new Set([...SENTENCE_KINDS, "fix"]),
    );
    expectNone(
      [
        ...items.flatMap(({ item }) => sentenceProblems(item, SENTENCE_KNOWN)),
        ...repeatedIds(items),
      ],
      SENTENCE_RULE,
    );
  });

  it("asks questions its recordings and texts can answer", async () => {
    await prepareLearnPage({ kind: "kit" }, "en");
    resetRecording();
    renderToStaticMarkup(createElement(LearnPage, { target: { kind: "kit" }, locale: "en" }));
    const parts = [...recording.parts];
    resetRecording();
    expect(parts.filter(({ part }) => part === "Listening").length).toBeGreaterThan(1);
    expectNone(
      parts.flatMap(({ part, props }) =>
        askedProblems(part, props, "apps/site/src/components/learn/KitListening.tsx"),
      ),
      "Questions match what was said (checklists.md#quizzes)",
    );
  });
});

describe.each(SLUGS)("lesson %s", (slug) => {
  // Simulating every pick quiz's runs is the slow part, and pickUnits caches it. Warming it here,
  // with its own timeout, keeps a loaded CI runner from timing out whichever test comes first.
  beforeAll(() => {
    for (const locale of LOCALES) pickUnits(slug, locale);
    reachableClips(slug);
  }, 120_000);

  it("gives each quiz a fixed id of lowercase letters, digits and hyphens, once", () => {
    const problems: string[] = [];
    const seen = new Set<string>();
    for (const call of rendered(slug, "en").recording.parts) {
      if (!QUIZ_PARTS.has(call.part)) continue;
      const id = call.props.id;
      const at = where(slug, `id="${String(id)}"`, `<${call.part}`);
      if (typeof id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))
        problems.push(
          `${at}: ${call.part} id ${JSON.stringify(id)} is not lowercase letters, digits and hyphens. Fix: give it a fixed id such as "which-place"; it is the quiz property of learn_quiz_finished.`,
        );
      else if (seen.has(id))
        problems.push(
          `${at}: two parts share the id "${id}", so analytics can't tell them apart. Fix: rename one.`,
        );
      else seen.add(id);
    }
    expectNone(problems, "Quiz ids (checklists.md#quizzes)");
  });

  it("asks every key of a paired quiz before any comes back", () => {
    const problems: string[] = [];
    for (const quiz of quizzes(slug)) {
      const paired = quiz.items.filter((item) => Array.isArray(item.pair));
      if (paired.length === 0) continue;
      const at = where(slug, `id="${quiz.id}"`);
      if (paired.length < quiz.items.length) {
        problems.push(
          `${at}: quiz "${quiz.id}" gives pair to some items, not all. Fix: give every item a pair.`,
        );
        continue;
      }
      const key = (item: Record<string, unknown>) => String((item.pair as string[])[0]);
      const keys = new Set(quiz.items.map(key));
      if (total(quiz) < keys.size) {
        problems.push(
          `${at}: quiz "${quiz.id}" has ${keys.size} keys (${[...keys].join(", ")}) but ${total(quiz)} rounds, so a run always leaves one out. Fix: set rounds={${keys.size}}, or key pair on what the quiz tests so fewer keys cover it.`,
        );
        continue;
      }
      // Every item its own key and every item asked: nothing can be left out.
      if (keys.size === quiz.items.length) continue;
      let missed = 0;
      const left = new Set<string>();
      for (const run of runs(quiz)) {
        const asked = new Set(run.slice(0, total(quiz)).map(key));
        const gone = [...keys].filter((each) => !asked.has(each));
        if (gone.length) missed++;
        for (const each of gone) left.add(each);
      }
      if (missed)
        problems.push(
          `${at}: quiz "${quiz.id}" left out ${[...left].join(", ")} in ${missed} of ${RUNS} runs. Fix: key pair on what the quiz tests (pair: [ending, id]) and pass order={eachPairFirst}, or build its order on eachPairFirst.`,
        );
    }
    expectNone(problems, "Every item comes up before any repeats (checklists.md#quizzes)");
  });

  it("puts each answer in every place and never names it by its options", () => {
    const problems: string[] = [];
    for (const quiz of quizzes(slug)) {
      const choice = quiz.items.every((item) => Array.isArray(item.options) && "answer" in item);
      if (!choice || quiz.items.length < 2) continue;
      const at = where(slug, `id="${quiz.id}"`);
      const places = new Set<number>();
      let fewest = Number.POSITIVE_INFINITY;
      const setsByAnswer = new Map<string, Set<string>>();
      const answersBySet = new Map<string, Set<string>>();
      for (const run of runs(quiz))
        for (const item of run.slice(0, total(quiz))) {
          const options = (item.options as unknown[]).map(optionId);
          const answer = String(item.answer);
          fewest = Math.min(fewest, options.length);
          places.add(options.indexOf(answer));
          const set = [...options].sort().join(" · ");
          setsByAnswer.set(answer, (setsByAnswer.get(answer) ?? new Set()).add(set));
          answersBySet.set(set, (answersBySet.get(set) ?? new Set()).add(answer));
        }
      const never = Array.from({ length: fewest }, (_, i) => i).filter((i) => !places.has(i));
      if (never.length)
        problems.push(
          `${at}: quiz "${quiz.id}" never puts the answer in place ${never.map((i) => i + 1).join(", ")} of ${fewest}, so a learner can find it by its place. Fix: shuffle each round's options in the quiz's order function after the first run (heardRun in Kohad.tsx).`,
        );
      const named = [...setsByAnswer].filter(
        ([, sets]) => sets.size === 1 && answersBySet.get([...sets][0] as string)?.size === 1,
      );
      if (answersBySet.size > 1 && named.length)
        problems.push(
          `${at}: quiz "${quiz.id}" always offers the same options with ${named
            .slice(0, 3)
            .map(([answer, sets]) => `${answer} (${[...sets][0]})`)
            .join(
              "; ",
            )}, so the set alone names the answer. Fix: draw the wrong options at random from the rest on every run (threeEndings in Olevik.tsx).`,
        );
    }
    expectNoneUnlessKnown(
      problems,
      "The options never give the answer away (checklists.md#quizzes)",
      "option-sets",
      slug,
    );
  });

  it("never offers an option that is another plus a letter or two", () => {
    const problems: string[] = [];
    const pairKey = (a: string, b: string) => [plain(a), plain(b)].sort().join("|");
    const allowed = (id: string, a: string, b: string) =>
      ALLOWED_NEAR_PAIRS.some(
        (each) =>
          each.lesson === slug &&
          each.quiz === id &&
          (!each.pair || pairKey(a, b) === pairKey(...each.pair)),
      );
    for (const unit of pickUnits(slug, "en")) {
      if (unit.kind !== "quiz" && unit.kind !== "passage") continue;
      const found = new Map<string, string>();
      for (const { options } of [...unit.first, ...unit.later].flat())
        for (const [i, a] of options.entries())
          for (const b of options.slice(i + 1)) {
            if (!nearPair(a, b) || allowed(unit.id, a, b) || found.has(pairKey(a, b))) continue;
            const [short, long] = [a, b].sort((x, y) => plain(x).length - plain(y).length);
            found.set(
              pairKey(a, b),
              `${where(slug, `id="${unit.id}"`, `"${short}"`)}: ${unit.kind} "${unit.id}" offers ${options.join(", ")}, and ${long} is ${short} with a letter or two more, so a learner can pick by shape, such as the one between the others, without listening. Fix: show the cue outside the options, such as ${short} above the choices and only what changes as the options; or, where telling these two apart is the point, list the pair in ALLOWED_NEAR_PAIRS (apps/site/src/lib/learn/checks/allowed-quizzes.ts) with the reason.`,
            );
          }
      // A few per quiz is enough to see the pattern.
      problems.push(...[...found.values()].slice(0, 3));
    }
    expectNoneUnlessKnown(
      problems,
      "No option is another plus a letter or two (checklists.md#quizzes)",
      "near-options",
      slug,
    );
  });

  it("spreads each answer over every place, round by round", () => {
    const problems: string[] = [];
    for (const unit of pickUnits(slug, "en")) {
      if (unit.kind !== "quiz") continue;
      const at = where(slug, `id="${unit.id}"`);
      // The first round of the first run is the server's, fixed by design.
      const groups: [string, PickRound[]][] = [
        ["over all its runs", [...unit.first, ...unit.later].flat()],
      ];
      const rounds = Math.max(...unit.first.map((run) => run.length));
      for (let r = 1; r < rounds; r++)
        groups.push([
          `in round ${r + 1} as the page opens`,
          unit.first.map((run) => run[r]).filter((each) => each !== undefined),
        ]);
      for (let r = 0; r < rounds; r++)
        groups.push([
          `in round ${r + 1} after Try again`,
          unit.later.map((run) => run[r]).filter((each) => each !== undefined),
        ]);
      for (const [when, group] of groups)
        for (const count of new Set(group.map((round) => round.options.length))) {
          if (group.filter((round) => round.options.length === count).length < 50) continue;
          const shares = placeShares(group, count);
          const off = shares
            .map((share, place) => ({ share, place }))
            .filter(({ share }) => share === 0 || share > fairCap(count));
          if (off.length === 0) continue;
          problems.push(
            `${at}: quiz "${unit.id}" ${when} puts the answer ${off
              .map(
                ({ share, place }) =>
                  `in place ${place + 1} of ${count} ${share === 0 ? "never" : `${percent(share)} of the time`}`,
              )
              .join(
                ", ",
              )}; each place should take about ${percent(1 / count)} and at most ${percent(fairCap(count))}. A learner can find it by its place, or by the place no earlier round used. Fix: shuffle each round's options in the quiz's order function after the first round (heardRun in Kaskiv.tsx), not a fixed order per item.`,
          );
          break;
        }
    }
    expectNoneUnlessKnown(
      problems.slice(0, 12),
      "The answer's place gives nothing away (checklists.md#quizzes)",
      "answer-place",
      slug,
    );
  });

  it("puts a gap passage's answers in more than one place", () => {
    const problems: string[] = [];
    for (const unit of pickUnits(slug, "en")) {
      if (unit.kind !== "passage") continue;
      const gaps = unit.first.flat();
      const places = new Map<number, number>();
      for (const gap of gaps) places.set(gap.answer, (places.get(gap.answer) ?? 0) + 1);
      // Two-thirds or more, unless an even split can't do better, as two of three gaps.
      for (const [place, count] of places)
        if (count >= (gaps.length * 2) / 3 && count > Math.ceil(gaps.length / 2))
          problems.push(
            `${where(slug, `id="${unit.id}"`)}: gap passage "${unit.id}" puts the answer in place ${place + 1} in ${count} of its ${gaps.length} gaps, so a learner can fill it by place. Fix: reorder the gaps' options so each place holds less than two-thirds of the answers.`,
          );
    }
    expectNoneUnlessKnown(
      problems,
      "A gap passage's answers move between places (checklists.md#quizzes)",
      "gap-place",
      slug,
    );
  });

  it("gives each Estonian form one glossary entry", () => {
    const glossary = (rendered(slug, "en").recording.view?.glossary ?? {}) as Record<
      string,
      unknown
    >;
    const meaning = (gloss: unknown) => {
      const en = (gloss as { en?: { message?: string; id?: string } }).en;
      return en?.message ?? en?.id ?? "?";
    };
    const problems = new Set<string>();
    const at = where(slug, "const GLOSSARY");
    for (const { entries, made } of madeEntries.calls) {
      const keys = Object.keys(made);
      const part = keys.some(
        (key) => typeof made[key] === "object" && made[key] !== null && glossary[key] === made[key],
      );
      if (!part) continue;
      const seen = new Map<PropertyKey, unknown>();
      for (const [key, gloss] of entries) {
        const before = seen.get(key);
        if (before !== undefined && meaning(before) !== meaning(gloss))
          problems.add(
            `${at}: the glossary gives “${String(key)}” twice, so “${meaning(gloss)}” replaced “${meaning(before)}” and the first meaning never shows. Fix: one entry with both meanings, such as ${String(key)}: { en: msg\`${meaning(before)}; ${meaning(gloss)}\` }.`,
          );
        seen.set(key, gloss);
      }
      for (const key of keys)
        if (key in glossary && meaning(glossary[key]) !== meaning(made[key]))
          problems.add(
            `${at}: the glossary gives “${key}” twice, so “${meaning(glossary[key])}” replaced “${meaning(made[key])}” and the first meaning never shows. Fix: one entry with both meanings.`,
          );
    }
    expectNoneUnlessKnown([...problems], "One glossary entry per form", "glossary-twice", slug);
  });

  it("renders the same page whatever the clock and the dice say", () => {
    const monday = renderLesson(slug, "en", {
      random: 0.01,
      now: new Date("2026-11-23T08:00:00Z"),
    });
    const saturday = renderLesson(slug, "en", {
      random: 0.99,
      now: new Date("2026-11-28T20:00:00Z"),
    });
    if (monday.html === saturday.html) return;
    let at = 0;
    while (monday.html[at] === saturday.html[at]) at++;
    const near = (html: string) =>
      html.slice(Math.max(0, at - 120), at + 80).replace(/<[^>]+>/g, " ");
    expectNone(
      [
        `${where(slug, "useState(", "Math.random", "new Date")}: the server's page changes with the time or a random draw, so the browser's first paint jumps. Here:\n  one render: …${near(monday.html)}…\n  another:    …${near(saturday.html)}…\nFix: show a placeholder until an effect knows the value, and keep a quiz's first round as the server rendered it.`,
      ],
      "Nothing random or dated renders on the server (checklists.md#quizzes)",
    );
  });

  it("glosses every Word and has a clip for everything it plays", () => {
    const problems: string[] = [];
    const page = rendered(slug, "en");
    for (const word of new Set(
      page.recording.words.filter((each) => !each.glossed).map((each) => each.word),
    ))
      problems.push(
        `${where(slug, `w="${word}"`)}: <Word w="${word}" /> has no entry in the lesson's glossary. Fix: add "${word.toLowerCase()}" to GLOSSARY with its meaning (keys are lower case), or write it as <b lang="et">.`,
      );
    const listed = new Set(
      Object.entries(CLIPS).flatMap(([lesson, clips]) =>
        Object.keys(clips).map((id) => `${lesson}/${id}`),
      ),
    );
    for (const [name, { how, near }] of reachableClips(slug)) {
      const lesson = name.split("/")[0] as string;
      const at = where(slug, ...near);
      if (!listed.has(name))
        problems.push(
          `${at}: ${how} ${name}, which CLIPS in apps/site/src/lib/learn/clips.ts doesn't list, so it has no recording. Fix: add it under CLIPS["${lesson}"] and run lesson:audio, or give the gloss clip: false.`,
        );
      else if (!(name in MANIFEST))
        problems.push(
          `${at}: ${how} ${name}, which CLIPS lists but public/audio/estonian-lessons/manifest.json doesn't, so it was never recorded. Fix: run pnpm --filter @lymi/site lesson:audio.`,
        );
    }
    expectNone(problems, "Words and clips (SKILL.md step 4 and 6)");
  });

  it("shows the same words its passages and dialogues say", () => {
    const problems: string[] = [];
    const clip = (id: unknown) => CLIPS[slug]?.[String(id)];
    const said = (id: unknown) => {
      const found = clip(id);
      return found === undefined ? undefined : clipText(found);
    };
    for (const { part, props } of rendered(slug, "en").recording.parts) {
      const at = where(slug, `id="${String(props.id)}"`, `<${part}`);
      if (part === "GapPassage" && props.clip) {
        const gaps = props.gaps as { before: string; answer: string; after: string }[];
        const text = gaps.map((gap) => gapLine(gap.before, gap.answer, gap.after)).join(" ");
        if (text !== said(props.clip))
          problems.push(
            `${at}: gap passage "${String(props.id)}" filled in reads\n  ${text}\nbut its clip ${String(props.clip)} says\n  ${said(props.clip)}\nFix: make the gaps and the clip's sentences the same, then run lesson:audio.`,
          );
      }
      if ((part === "Listening" || part === "Reading") && props.clip) {
        const recordedClip = clip(props.clip);
        const shownClip = (
          "turns" in props ? { turns: props.turns } : { sentences: props.sentences }
        ) as Parameters<typeof clipSentences>[0];
        if (
          !recordedClip ||
          !(isPassage(recordedClip) || isConversation(recordedClip)) ||
          spokenLines(recordedClip) !== spokenLines(shownClip)
        )
          problems.push(
            `${at}: ${part} "${String(props.id)}" shows sentences its clip ${String(props.clip)} doesn't say. Fix: pass the clip's own sentences (TUTVUMINE_PASSAGES.kati) rather than a copy.`,
          );
      }
      if (part === "Dialogue")
        for (const turn of props.turns as {
          who: string;
          clip: string;
          line?: string;
          replies?: { line: string; right?: boolean }[];
        }[]) {
          const line =
            turn.who === "them" ? turn.line : turn.replies?.find((reply) => reply.right)?.line;
          if (line !== undefined && said(turn.clip) !== line)
            problems.push(
              `${at}: dialogue "${String(props.id)}" shows “${line}” but its clip ${turn.clip} says “${said(turn.clip)}”. Fix: read the line from the clip in clips.ts.`,
            );
        }
    }
    for (const [id, each] of Object.entries(CLIPS[slug] ?? {}))
      if (isPassage(each) || isConversation(each))
        for (const sentence of clipSentences(each))
          if (!/[.!?…»”"]$/.test(sentence.trim()))
            problems.push(
              `apps/site/src/lib/learn/clips.ts: passage ${slug}/${id} has a sentence without a full stop: “${sentence}”. Fix: end it with . ! or ?, and give a last gap after: ".".`,
            );
    expectNone(problems, "Shown text and recorded text match (#1241, #1242)");
  });

  it("can mark its written sentences fairly", () => {
    const items = writtenItems(rendered(slug, "en").recording.parts);
    expectNone(
      [
        ...items.flatMap(({ quiz, item }) =>
          sentenceProblems(item, SENTENCE_KNOWN).map(
            (problem) =>
              `${where(slug, `id: "${item.id}"`, `id="${quiz}"`)}: quiz "${quiz}", ${problem}`,
          ),
        ),
        ...repeatedIds(items).map((problem) => `${where(slug)}: ${problem}`),
      ],
      SENTENCE_RULE,
    );
  });

  it("asks questions its recordings and texts can answer", () => {
    expectNone(
      rendered(slug, "en").recording.parts.flatMap(({ part, props }) =>
        askedProblems(part, props, where(slug, `id="${String(props.id)}"`, `<${part}`)),
      ),
      "Questions match what was said (checklists.md#quizzes)",
    );
  });

  it("uses only Estonian forms checked in Sõnaveeb", () => {
    const missing = [...lessonForms(rendered(slug, "en"))].filter(([form]) => !(form in VERIFIED));
    if (process.env.LESSON_FORMS_OUT)
      appendFileSync(process.env.LESSON_FORMS_OUT, missing.map(([form]) => `${form}\n`).join(""));
    expectNone(
      missing.map(
        ([form, from]) =>
          `${where(slug, form)}: “${form}” (${from}) isn't in ${VERIFIED_FORMS_PATH}.`,
      ),
      `Every Estonian form is checked (SKILL.md step 2). Run \`pnpm --filter @lymi/site lesson:forms\`: it looks each new form up in Sõnaveeb and adds the ones it confirms. A form it can't confirm is listed; fix the word, or, if a source you can name confirms it, add it by hand as "<form>": "by hand: <source>".`,
    );
  });

  describe.each(LOCALES)("in %s", (locale) => {
    const lesson = () => rendered(slug, locale);
    const main = () =>
      [...elements(lesson().tree)].find((each) => each.tag === "main") ?? lesson().tree;
    const verified = VERIFIED as Record<string, string>;
    /** Every word a checked Estonian form; a name alone reads well enough in any voice. */
    const estonian = (text: string) => {
      const forms = formsIn(text);
      return (
        forms.length > 0 &&
        forms.every((form) => form in verified) &&
        !forms.every((form) => verified[form]?.includes("a name"))
      );
    };

    it("scores a learner who doesn't listen at chance", () => {
      // By the known-issues check each finding falls under; the last two came after the first.
      const problems: Record<string, string[]> = {
        "cheap-strategy": [],
        "majority-option": [],
        "cheap-strategy-parts": [],
      };
      const english = new Map(
        pickUnits(slug, "en").map((unit) => [`${unit.kind}/${unit.id}`, roundsKey(unit)]),
      );
      for (const unit of pickUnits(slug, locale)) {
        // Options the same in every language fail once, in English.
        if (locale !== "en" && english.get(`${unit.kind}/${unit.id}`) === roundsKey(unit)) continue;
        // Two options leave a rule nothing to choose between.
        const rounds = [...unit.first, ...unit.later]
          .flat()
          .filter((round) => round.options.length > 2);
        for (const strategy of STRATEGIES) {
          const { score, chance, rounds: scored } = strategyScore(strategy, rounds);
          if (unit.kind === "quiz" ? scored === 0 : scored < FEWEST_FIXED[unit.kind]) continue;
          const allowed = ALLOWED_STRATEGIES.some(
            (each) =>
              each.lesson === slug && each.quiz === unit.id && each.strategy === strategy.name,
          );
          if (score <= chance + 0.25 || allowed) continue;
          const examples = rounds
            .filter((round) => strategy.applies?.(round) ?? true)
            .filter((round) => strategy.pick(round.options, round.heard).includes(round.answer))
            .slice(0, 2)
            .map(
              (round) =>
                `${round.heard ? `hearing “${round.heard}”, ` : ""}${round.options.join(" | ")} → ${round.options[round.answer]}`,
            );
          const check = MAJORITY.has(strategy.name)
            ? "majority-option"
            : unit.kind === "dialogue" || unit.kind === "questions" || locale !== "en"
              ? "cheap-strategy-parts"
              : "cheap-strategy";
          problems[check]?.push(
            `${where(slug, `id="${unit.id}"`, `id: "${unit.id}"`)}: ${KIND_NAMES[unit.kind]} "${unit.id}"${locale === "en" ? "" : ` in ${locale}`}: “${strategy.name}” scores ${percent(score)} where chance is ${percent(chance)}, so a learner can score without what it tests. Example: ${examples.join("; ")}. Fix: ${strategy.fix}; or, where the rule is the lesson, list it in ALLOWED_STRATEGIES (apps/site/src/lib/learn/checks/allowed-quizzes.ts) with the reason.`,
          );
        }
      }
      expectNone(
        Object.entries(problems).flatMap(([check, found]) => unlessKnown(found, check, slug)),
        "No cheap rule beats chance (checklists.md#quizzes)",
      );
    });

    it("marks Estonian outside a Word with lang", () => {
      const problems = new Set<string>();
      const fix = `Fix: wrap it in <b lang="et">, or give the element holding it lang="et".`;
      for (const each of elements(main())) {
        if (each.lang === "et" || !["b", "strong", "i", "em"].includes(each.tag)) continue;
        const text = textOf(each).trim();
        if (estonian(text))
          problems.add(
            `${where(slug, `<${each.tag}>${text}`, text)}: <${each.tag}>${text}</${each.tag}> is Estonian without lang="et", so a screen reader reads it in the page's voice. ${fix}`,
          );
      }
      // Estonian is the only Latin script on a Ukrainian or Russian page.
      if (locale !== "en")
        for (const run of textRuns(main())) {
          if (run.lang === "et" || !/\p{Script=Latin}/u.test(run.text)) continue;
          const latin = run.text.match(/[\p{Script=Latin}][\p{Script=Latin}\s’'-]*/gu) ?? [];
          for (const piece of latin)
            if (estonian(piece))
              problems.add(
                `${where(slug, piece.trim())}: “${piece.trim()}” in “${run.text.trim().slice(0, 60)}” is Estonian without lang="et". ${fix}`,
              );
        }
      expectNoneUnlessKnown(
        [...problems],
        'Estonian carries lang="et" (checklists.md#accessibility)',
        "estonian-lang",
        slug,
      );
    });

    // The labels are the same in every language, so English is enough.
    it.runIf(locale === "en")("lets a button's visible text name it", () => {
      const problems = new Map<string, string>();
      const squash = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
      for (const each of elements(main())) {
        const label = each.attrs["aria-label"];
        if (!label || !(each.tag === "button" || each.tag === "a" || each.attrs.role === "button"))
          continue;
        const shown = textOf(each, true).replace(/\s+/g, " ").trim();
        const hidden = (shown.match(/[\p{L}\p{N}]+/gu) ?? []).filter(
          (word) => !squash(label).includes(squash(word)),
        );
        const at = labelSource(slug, label);
        if (hidden.length && !problems.has(at))
          problems.set(
            at,
            `${at}: a ${each.tag} labelled “${label}” shows “${shown}”, and the label hides “${hidden.join(" ")}” from screen readers. Fix: drop the aria-label and let the visible text name the button, with lang="et" on its Estonian.`,
          );
      }
      expectNone(
        [...problems.values()],
        "Visible text names a button (checklists.md#accessibility)",
      );
    });

    it("starts every sentence with a capital", () => {
      const problems = new Set<string>();
      for (const block of elements(main())) {
        if (!["p", "h2", "h3", "h4", "figcaption", "legend"].includes(block.tag)) continue;
        const text = textOf(block).replace(/\s+/g, " ").trim();
        // A sentence: three words or more, ending as a sentence does. Word lists and keys are not.
        if (text.split(" ").length < 3 || !/[.!?…:]$/.test(text)) continue;
        // An ending leads with its hyphen: “-s or -l?”.
        const first = text.match(/^[^\p{L}\p{N}-]*(\p{L})/u)?.[1];
        if (first && first !== first.toUpperCase())
          problems.add(
            `${where(slug, text.slice(0, 24), text.split(" ")[0] ?? "")}: “${text.slice(0, 70)}” starts with a small letter. Fix: give the Word a capital (<Word w="Pool" />), or reorder the sentence so the Estonian is not first.`,
          );
      }
      expectNone([...problems], "A sentence starts with a capital (copy.md)");
    });

    it.runIf(locale === "en")("gives every lesson it names a number", () => {
      const problems = new Set<string>();
      for (const block of elements(main())) {
        if (!["p", "li", "h2", "h3", "a", "span"].includes(block.tag)) continue;
        const text = textOf(block).replace(/\s+/g, " ");
        const empty = text.match(/\blessons? (?=[.,;:)–—]|and\b|or\b|$)/i);
        if (empty)
          problems.add(
            `${where(slug, "LESSONS.find", "lessonBySlug")}: “${text.trim().slice(0, 80)}” names a lesson with no number. Fix: find a built lesson with lessonBySlug("<slug>") and a planned one by an et that LESSONS holds.`,
          );
      }
      expectNone([...problems], "Lesson numbers render (#1213, #1224)");
    });

    it("writes day names in lower case inside a sentence", () => {
      const problems = new Set<string>();
      const days =
        /(?<![.!?…:—–]\s*|^\s*|[“«"(]\s*)(?<!\p{L})(Esmaspäev|Teisipäev|Kolmapäev|Neljapäev|Reede|Laupäev|Pühapäev)\p{L}*/gu;
      for (const block of elements(main())) {
        if (!["p", "li", "figcaption", "dd", "td"].includes(block.tag)) continue;
        const text = textOf(block).replace(/\s+/g, " ").trim();
        for (const match of text.matchAll(days)) {
          const at = match.index ?? 0;
          problems.add(
            `${where(slug, match[0])}: “${match[0]}” has a capital mid-sentence: “…${text.slice(Math.max(0, at - 50), at + 30)}…”. Estonian writes day names in lower case. Fix: <Word w="${match[0].toLowerCase()}" /> here.`,
          );
        }
      }
      expectNone(
        [...problems],
        "Day names are lower case (checklists.md#estonian-slips-reviews-caught)",
      );
    });
  });
});
