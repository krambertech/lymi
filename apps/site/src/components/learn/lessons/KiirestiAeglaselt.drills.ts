import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import {
  ADV_ANSWERS,
  ADV_FIXES,
  ADV_FORMS,
  ADV_TELL,
  ADV_TRANSLATE,
} from "../../../lib/learn/clips";
import type { ChoiceDrill, DrillBank, FormDrill } from "../../../lib/learn/drill";

const LT_RULE = msg`Most adjectives usually add <et>-lt</et> to the genitive stem: <et>aeglane</et> → <et>aeglaselt</et>, <et>vaikne</et> → <et>vaikselt</et>.`;
const STI_RULE = msg`Several common adjectives take <et>-sti</et> on the genitive stem (<et>kiiresti</et>, <et>kindlasti</et>), and <et>hea</et> becomes <et>hästi</et>.`;
const TELL_RULE = msg`An adjective describes a noun (<et>kiire rong</et>); an adverb says how an action happens (<et>rong sõidab kiiresti</et>).`;

const ADJ_GLOSS: Record<string, MessageDescriptor> = {
  aeglane: msg`slow`,
  vaikne: msg`quiet`,
  selge: msg`clear`,
  lihtne: msg`simple`,
  kiire: msg`fast`,
  hea: msg`good`,
  halb: msg`bad`,
  kindel: msg`sure`,
};

const TELL_LABELS = {
  adj: { id: "adj", label: msg`Describes a thing` },
  adv: { id: "adv", label: msg`Says how it happens` },
} as const;

const gapSaid = (item: { before: string; answer: string; after: string }) =>
  `${item.before} ${item.answer}${/^[.,!?]/.test(item.after) ? "" : " "}${item.after}`;

const formItem = (index: number): FormDrill => {
  const item = ADV_FORMS[index] as (typeof ADV_FORMS)[number];
  const rule = item.answer.endsWith("lt") ? "lt" : "sti";
  return {
    kind: "form",
    id: `form-${item.id}`,
    rule,
    base: item.base,
    gloss: ADJ_GLOSS[item.base] as MessageDescriptor,
    cue: { et: `${item.before} ___${/^[.,!?]/.test(item.after) ? "" : " "}${item.after}` },
    answers: [item.answer],
    say: gapSaid(item),
    explain: rule === "lt" ? LT_RULE : STI_RULE,
  };
};

const tellItem = (index: number): ChoiceDrill => {
  const item = ADV_TELL[index] as (typeof ADV_TELL)[number];
  return {
    kind: "choice",
    id: `tell-${item.id}`,
    rule: "tell",
    say: item.said,
    answer: TELL_LABELS[item.kind],
    wrong: [TELL_LABELS[item.kind === "adj" ? "adv" : "adj"]],
    explain: TELL_RULE,
  };
};

const TRANS_PROMPTS: Record<(typeof ADV_TRANSLATE)[number], MessageDescriptor> = {
  "Ta räägib eesti keelt hästi.": msg`He or she speaks Estonian well.`,
  "Palun räägi aeglaselt.": msg`Please speak slowly.`,
  "Rong sõidab kiiresti.": msg`The train goes fast.`,
  "Laps magab vaikselt.": msg`The child sleeps quietly.`,
  "Ma tulen kindlasti.": msg`I will definitely come.`,
  "Ta vastas selgelt.": msg`He or she answered clearly.`,
};

const FIX_PROMPTS: Record<(typeof ADV_FIXES)[number]["id"], MessageDescriptor> = {
  good: msg`He or she speaks Estonian well.`,
  slow: msg`Please speak slowly.`,
  fast: msg`The bus goes fast.`,
  clear: msg`He or she explained it clearly.`,
  bad: msg`I slept badly at night.`,
  quiet: msg`We came in quietly.`,
};

export const DRILLS: DrillBank = {
  rules: {
    lt: { label: msg`Adverbs with <et>-lt</et>`, section: "forms" },
    sti: { label: msg`Adverbs with <et>-sti</et> and <et>hästi</et>`, section: "forms" },
    tell: { label: msg`Adjective or adverb`, section: "tell" },
  },
  items: [
    formItem(0),
    formItem(1),
    formItem(2),
    formItem(3),
    formItem(4),
    formItem(5),
    formItem(6),
    formItem(7),
    tellItem(0),
    tellItem(1),
    tellItem(2),
    tellItem(3),
    tellItem(4),
    tellItem(5),
    ...ADV_TRANSLATE.map((said) => ({
      kind: "translate" as const,
      id: `write-${said
        .toLowerCase()
        .replaceAll("ä", "a")
        .replaceAll("õ", "o")
        .replace(/[^a-z]+/g, "-")
        .replace(/^-|-$/g, "")}`,
      rule: (said.includes("hästi") || said.includes("kiiresti") || said.includes("kindlasti")
        ? "sti"
        : "lt") as "lt" | "sti",
      prompt: TRANS_PROMPTS[said],
      answers: ADV_ANSWERS[said],
      say: said,
      explain:
        said.includes("hästi") || said.includes("kiiresti") || said.includes("kindlasti")
          ? STI_RULE
          : LT_RULE,
    })),
    ...ADV_FIXES.map((item) => ({
      kind: "fix" as const,
      id: `fix-${item.id}`,
      rule: (item.id === "good" || item.id === "fast" || item.id === "bad" ? "sti" : "lt") as
        | "lt"
        | "sti",
      wrong: item.wrong,
      prompt: FIX_PROMPTS[item.id],
      answers: [item.right] as readonly [string, ...string[]],
      say: item.right,
      explain: item.id === "good" || item.id === "fast" || item.id === "bad" ? STI_RULE : LT_RULE,
    })),
  ],
};
