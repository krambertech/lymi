import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import {
  DIR_ANSWERS,
  DIR_FIXES,
  DIR_GAPS,
  DIR_TELL,
  DIR_TRANSLATE,
} from "../../../lib/learn/clips";
import type { ChoiceDrill, DrillBank, FormDrill } from "../../../lib/learn/drill";

const HERE_RULE = msg`Here has three forms: <et>siia</et> (to here), <et>siin</et> (here), <et>siit</et> (from here).`;
const THERE_RULE = msg`There has three forms: <et>sinna</et> (to there), <et>seal</et> (there), <et>sealt</et> (from there).`;
const VERB_RULE = msg`<et>Minema</et> takes the where-to form (<et>sinna, poodi</et>); <et>käima</et> usually takes the where form (<et>seal, poes</et>).`;

const GAP_GLOSS: Record<(typeof DIR_GAPS)[number]["id"], MessageDescriptor> = {
  "come-here": msg`Please come here!`,
  "live-here": msg`I live here.`,
  "bus-from": msg`The bus goes from here to Tartu.`,
  "go-there": msg`We are going there tomorrow.`,
  "work-there": msg`He or she works there.`,
  "came-from": msg`He or she just came from there.`,
  "visited-there": msg`I went there yesterday (and came back).`,
  "put-here": msg`Put the bag here.`,
};

const TELL_LABELS = {
  go: { id: "go", label: msg`Heading there (one way)` },
  visit: { id: "visit", label: msg`Visiting / round trip` },
} as const;

const gapSaid = (item: { before: string; answer: string; after: string }) =>
  `${item.before} ${item.answer}${/^[.,!?]/.test(item.after) ? "" : " "}${item.after}`;

const gapItem = (index: number): FormDrill => {
  const item = DIR_GAPS[index] as (typeof DIR_GAPS)[number];
  const isHere = item.answer.startsWith("sii");
  return {
    kind: "form",
    id: `pick-${item.id}`,
    rule: item.id === "visited-there" ? "verbs" : isHere ? "here" : "there",
    base: isHere ? "siin" : "seal",
    gloss: GAP_GLOSS[item.id],
    cue: { et: `${item.before} ___${/^[.,!?]/.test(item.after) ? "" : " "}${item.after}` },
    answers: [item.answer],
    say: gapSaid(item),
    explain: item.id === "visited-there" ? VERB_RULE : isHere ? HERE_RULE : THERE_RULE,
  };
};

const tellItem = (index: number): ChoiceDrill => {
  const item = DIR_TELL[index] as (typeof DIR_TELL)[number];
  return {
    kind: "choice",
    id: `tell-${item.id}`,
    rule: "verbs",
    say: item.said,
    answer: TELL_LABELS[item.kind],
    wrong: [TELL_LABELS[item.kind === "go" ? "visit" : "go"]],
    explain: VERB_RULE,
  };
};

const TRANS_PROMPTS: Record<(typeof DIR_TRANSLATE)[number], MessageDescriptor> = {
  "Tule palun siia!": msg`Please come here!`,
  "Ma elan siin.": msg`I live here.`,
  "Buss sõidab siit Tartusse.": msg`The bus goes from here to Tartu.`,
  "Me läheme homme sinna.": msg`We are going there tomorrow.`,
  "Ma käisin eile seal.": msg`I went there yesterday (and came back).`,
  "Ta tuli just sealt.": msg`He or she just came from there.`,
};

const FIX_PROMPTS: Record<(typeof DIR_FIXES)[number]["id"], MessageDescriptor> = {
  come: msg`Please come here!`,
  visited: msg`I went there yesterday (and came back).`,
  live: msg`He or she lives here.`,
  go: msg`We are going there tomorrow.`,
  shop: msg`I went to the shop yesterday (and came back).`,
  from: msg`He or she just came from there.`,
};

export const DRILLS: DrillBank = {
  rules: {
    here: { label: msg`Here: <et>siia, siin, siit</et>`, section: "words" },
    there: { label: msg`There: <et>sinna, seal, sealt</et>`, section: "words" },
    verbs: { label: msg`Movement verbs: <et>minema, tulema, käima</et>`, section: "verbs" },
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
    ...DIR_TRANSLATE.map((said) => ({
      kind: "translate" as const,
      id: `write-${said
        .toLowerCase()
        .replaceAll("ä", "a")
        .replaceAll("õ", "o")
        .replace(/[^a-z]+/g, "-")
        .replace(/^-|-$/g, "")}`,
      rule: (said.includes("käisin") ? "verbs" : said.includes("sii") ? "here" : "there") as
        | "here"
        | "there"
        | "verbs",
      prompt: TRANS_PROMPTS[said],
      answers: DIR_ANSWERS[said],
      say: said,
      explain: said.includes("käisin") ? VERB_RULE : said.includes("sii") ? HERE_RULE : THERE_RULE,
    })),
    ...DIR_FIXES.map((item) => ({
      kind: "fix" as const,
      id: `fix-${item.id}`,
      rule: (item.id === "visited" || item.id === "shop" || item.id === "go"
        ? "verbs"
        : item.id === "come" || item.id === "live"
          ? "here"
          : "there") as "here" | "there" | "verbs",
      wrong: item.wrong,
      prompt: FIX_PROMPTS[item.id],
      answers: [item.right] as readonly [string, ...string[]],
      say: item.right,
      explain:
        item.id === "visited" || item.id === "shop" || item.id === "go"
          ? VERB_RULE
          : item.id === "come" || item.id === "live"
            ? HERE_RULE
            : THERE_RULE,
    })),
  ],
};
