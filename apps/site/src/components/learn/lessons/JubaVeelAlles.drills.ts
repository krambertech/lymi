import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import {
  JUBA_ANSWERS,
  JUBA_FIXES,
  JUBA_GAPS,
  JUBA_TELL,
  JUBA_TRANSLATE,
} from "../../../lib/learn/clips";
import type { ChoiceDrill, DrillBank, FormDrill } from "../../../lib/learn/drill";

const JUBA_ALLES_RULE = msg`<et>Juba</et> means already (sooner than expected); <et>alles</et> means only, just recently, or not until.`;
const VEEL_RULE = msg`<et>Veel</et> means still in a positive sentence and not yet with <et>ei</et>.`;
const ENAM_RULE = msg`<et>Ei … enam</et> means no longer; <et>enam</et> usually appears only in negative sentences.`;

const GAP_GLOSS: Record<(typeof JUBA_GAPS)[number]["id"], MessageDescriptor> = {
  "already-ten": msg`already`,
  "only-seven": msg`only, not until`,
  "still-work": msg`still`,
  "not-yet-home": msg`not yet`,
  "no-longer-live": msg`no longer`,
  "only-yesterday": msg`only yesterday`,
  "no-longer-rain": msg`no longer`,
  "not-yet-bus": msg`not yet`,
};

const TELL_LABELS = {
  juba: { id: "juba", label: msg`Already (sooner than expected)` },
  alles: { id: "alles", label: msg`Only / not until (less or later)` },
} as const;

const TRANS_PROMPTS: Record<(typeof JUBA_TRANSLATE)[number], MessageDescriptor> = {
  "Kell on juba kümme.": msg`It is already ten o’clock.`,
  "Kell on alles seitse.": msg`It is only seven o’clock.`,
  "Ta ei ole veel kodus.": msg`He or she is not home yet.`,
  "Ma ei ela enam seal.": msg`I no longer live there.`,
  "Kas sa oled veel tööl?": msg`Are you still at work?`,
  "Ta tuli alles eile.": msg`He or she came only yesterday.`,
};

const FIX_PROMPTS: Record<(typeof JUBA_FIXES)[number]["id"], MessageDescriptor> = {
  eaten: msg`I have not eaten yet.`,
  live: msg`He or she no longer lives here.`,
  bus: msg`The bus has not come yet.`,
  work: msg`I am still at work.`,
  seven: msg`It is only seven o’clock.`,
  rain: msg`It is no longer raining.`,
};

const gapSaid = (item: { before: string; answer: string; after: string }) =>
  `${item.before} ${item.answer}${/^[.,!?]/.test(item.after) ? "" : " "}${item.after}`;

const ruleFor = (word: string): "juba-alles" | "veel" | "enam" =>
  word === "enam" ? "enam" : word === "veel" ? "veel" : "juba-alles";

const explainFor = (rule: "juba-alles" | "veel" | "enam") =>
  rule === "enam" ? ENAM_RULE : rule === "veel" ? VEEL_RULE : JUBA_ALLES_RULE;

const gapItem = (index: number): FormDrill => {
  const item = JUBA_GAPS[index] as (typeof JUBA_GAPS)[number];
  const rule = ruleFor(item.answer);
  return {
    kind: "form",
    id: `pick-${item.id}`,
    rule,
    base: "aeg",
    gloss: GAP_GLOSS[item.id],
    cue: { et: `${item.before} ___${/^[.,!?]/.test(item.after) ? "" : " "}${item.after}` },
    answers: [item.answer],
    say: gapSaid(item),
    explain: explainFor(rule),
  };
};

const tellItem = (index: number): ChoiceDrill => {
  const item = JUBA_TELL[index] as (typeof JUBA_TELL)[number];
  return {
    kind: "choice",
    id: `tell-${item.id}`,
    rule: "juba-alles",
    say: item.said,
    answer: TELL_LABELS[item.kind],
    wrong: [TELL_LABELS[item.kind === "juba" ? "alles" : "juba"]],
    explain: JUBA_ALLES_RULE,
  };
};

const toAsciiId = (text: string) =>
  text
    .toLowerCase()
    .replaceAll("ä", "a")
    .replaceAll("ö", "o")
    .replaceAll("ü", "u")
    .replaceAll("õ", "o")
    .replace(/[^a-z]+/g, "-")
    .replace(/^-|-$/g, "");

export const DRILLS: DrillBank = {
  rules: {
    "juba-alles": { label: msg`Already vs only: <et>juba, alles</et>`, section: "words" },
    veel: { label: msg`Still and not yet: <et>veel</et>`, section: "words" },
    enam: { label: msg`No longer: <et>ei … enam</et>`, section: "words" },
  },
  items: [
    gapItem(0),
    gapItem(1),
    gapItem(2),
    gapItem(3),
    gapItem(4),
    gapItem(5),
    gapItem(6),
    gapItem(7),
    tellItem(0),
    tellItem(1),
    tellItem(2),
    tellItem(3),
    tellItem(4),
    tellItem(5),
    ...JUBA_TRANSLATE.map((said) => {
      const rule = said.includes("enam") ? "enam" : said.includes("veel") ? "veel" : "juba-alles";
      return {
        kind: "translate" as const,
        id: `write-${toAsciiId(said)}`,
        rule: rule as "juba-alles" | "veel" | "enam",
        prompt: TRANS_PROMPTS[said],
        answers: JUBA_ANSWERS[said],
        say: said,
        explain: explainFor(rule),
      };
    }),
    ...JUBA_FIXES.map((item) => {
      const rule = item.right.includes("enam")
        ? "enam"
        : item.right.includes("veel")
          ? "veel"
          : "juba-alles";
      return {
        kind: "fix" as const,
        id: `fix-${item.id}`,
        rule: rule as "juba-alles" | "veel" | "enam",
        wrong: item.wrong,
        prompt: FIX_PROMPTS[item.id],
        answers: [item.right] as readonly [string, ...string[]],
        say: item.right,
        explain: explainFor(rule),
      };
    }),
  ],
};
