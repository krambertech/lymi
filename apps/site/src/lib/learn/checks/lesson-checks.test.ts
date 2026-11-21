/**
 * The review findings on the first Estonian lessons, as checks every lesson runs. Each lesson
 * page is rendered as the server renders it, and the kit's parts record what they were given, so
 * a check can read a quiz's items and run its order the way the browser does.
 *
 * A failure names the file and line, the rule, and the fix. The rules and the PRs they come from
 * are in .agents/skills/estonian-lesson/references/checklists.md.
 */
import { appendFileSync } from "node:fs";
import { afterAll, describe, expect, it, vi } from "vitest";
import { CLIPS, clipText, isPassage } from "../clips";
import { gapLine } from "../passage";
import { shuffledRun } from "../quiz";
import VERIFIED from "../verified-forms.json";
import { formsIn, lessonForms, VERIFIED_FORMS_PATH } from "./forms";
import { elements, textOf, textRuns } from "./html";
import { KNOWN_ISSUES } from "./known-issues";
import { LOCALES, labelSource, rendered, renderLesson, SLUGS, type Slug, where } from "./lessons";

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

/** As `expectNone`, except for a lesson `known-issues.ts` lists for this check. */
function expectNoneUnlessKnown(
  problems: readonly string[],
  rule: string,
  check: string,
  slug: string,
) {
  if (!KNOWN_ISSUES[check]?.includes(slug)) return expectNone(problems, rule);
  if (problems.length) stillKnown.add(`${check}/${slug}`);
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
const QUIZ_PARTS = new Set(["Quiz", "GapPassage", "Dialogue", "Listening", "Reading"]);

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

describe.each(SLUGS)("lesson %s", (slug) => {
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
      // Every item its own key: the pairs only stop repeats, and there is nothing to cover.
      if (keys.size === quiz.items.length) continue;
      if (total(quiz) < keys.size) {
        problems.push(
          `${at}: quiz "${quiz.id}" has ${keys.size} keys (${[...keys].join(", ")}) but ${total(quiz)} rounds, so a run always leaves one out. Fix: set rounds={${keys.size}}.`,
        );
        continue;
      }
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
    const recorded = new Set(
      Object.entries(CLIPS).flatMap(([lesson, clips]) =>
        Object.keys(clips).map((id) => `${lesson}/${id}`),
      ),
    );
    for (const name of new Set(page.recording.clips.map(({ lesson, id }) => `${lesson}/${id}`)))
      if (!recorded.has(name))
        problems.push(
          `${where(slug, `"${name.split("/")[1]}"`, `w="${name.split("/")[1]}"`)}: the page plays ${name}, which CLIPS in apps/site/src/lib/learn/clips.ts doesn't list, so it has no recording. Fix: add it under CLIPS["${name.split("/")[0]}"] and run lesson:audio, or give the gloss clip: false.`,
        );
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
        const sentences = props.sentences as string[];
        if (
          !recordedClip ||
          !isPassage(recordedClip) ||
          recordedClip.sentences.join(" ") !== sentences.join(" ")
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
      if (isPassage(each))
        for (const sentence of each.sentences)
          if (!/[.!?…»”"]$/.test(sentence.trim()))
            problems.push(
              `apps/site/src/lib/learn/clips.ts: passage ${slug}/${id} has a sentence without a full stop: “${sentence}”. Fix: end it with . ! or ?, and give a last gap after: ".".`,
            );
    expectNone(problems, "Shown text and recorded text match (#1241, #1242)");
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
