import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import {
  PAST_ANSWERS,
  PAST_FIXES,
  PAST_NOW_OR_THEN,
  PAST_TRANSLATE,
} from "../../../lib/learn/clips";
import type { ChoiceDrill, DrillBank, FormDrill } from "../../../lib/learn/drill";

const SI_RULE = msg`Most verbs usually add <et>-si-</et> to the <et>-ma</et> stem (<et>lugema</et> → <et>lugesin</et>); <et>ta</et> takes only <et>-s</et> and <et>nad</et> takes <et>-sid</et>.`;
const I_RULE = msg`Seven common verbs take <et>-i-</et> instead of <et>-si-</et>: <et>olin, tulin, läksin, tegin, nägin, sõin, jõin</et>.`;
const WHEN_RULE = msg`Listen to the verb ending: <et>-b</et> is present, <et>-s</et> or <et>-i</et> is past.`;
const USE_RULE = msg`Build the past verb from its <et>-ma</et> stem with <et>-si-</et> or its <et>-i-</et> form, matching the person.`;

const WHEN_LABELS = {
  now: { id: "now", label: msg`Now` },
  past: { id: "past", label: msg`In the past` },
} as const;

const ASCII_ID = (s: string) =>
  s
    .toLowerCase()
    .replaceAll("õ", "o")
    .replaceAll("ä", "a")
    .replaceAll("ö", "o")
    .replaceAll("ü", "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const when = (index: number, kind: "now" | "past"): ChoiceDrill => {
  const row = PAST_NOW_OR_THEN[index] as (typeof PAST_NOW_OR_THEN)[number];
  return {
    kind: "choice",
    id: `when-${ASCII_ID(row.verb)}-${kind}`,
    rule: "when",
    say: row[kind],
    answer: WHEN_LABELS[kind],
    wrong: [WHEN_LABELS[kind === "now" ? "past" : "now"]],
    explain: WHEN_RULE,
  };
};

const form = (
  id: string,
  rule: "si" | "i",
  base: string,
  gloss: MessageDescriptor,
  cue: MessageDescriptor,
  answer: string,
  say: string,
  explain: MessageDescriptor,
): FormDrill => ({
  kind: "form",
  id,
  rule,
  base,
  gloss,
  cue,
  answers: [answer],
  say,
  explain,
});

const TRANS_PROMPTS: Record<(typeof PAST_TRANSLATE)[number], MessageDescriptor> = {
  "Eile ma lugesin raamatut.": msg`Yesterday I read a book.`,
  "Me käisime eile poes.": msg`We went to the shop yesterday.`,
  "Ta läks eile koju.": msg`He or she went home yesterday.`,
  "Ma sõin hommikul leiba.": msg`I ate bread in the morning.`,
  "Nad tulid eile Tartust.": msg`They came from Tartu yesterday.`,
  "Ma töötasin eile kodus.": msg`I worked at home yesterday.`,
};

const FIX_PROMPTS: Record<(typeof PAST_FIXES)[number]["id"], MessageDescriptor> = {
  read: msg`I read a book yesterday.`,
  lived: msg`He or she lived in Tartu last year.`,
  went: msg`I went to work in the morning.`,
  ate: msg`He or she ate soup yesterday.`,
  we: msg`We lived in Tallinn before.`,
  came: msg`He or she came home in the evening.`,
};

export const DRILLS: DrillBank = {
  rules: {
    si: { label: msg`The past with <et>-si-</et>`, section: "with-si" },
    i: { label: msg`The past with <et>-i-</et>`, section: "with-i" },
    when: { label: msg`Present or past`, section: "when" },
    use: { label: msg`Past sentences`, section: "write" },
  },
  items: [
    form("si-elasin", "si", "elama", msg`to live`, msg`past, ma`, "elasin", "Ma elasin", SI_RULE),
    form(
      "si-lugesin",
      "si",
      "lugema",
      msg`to read`,
      msg`past, ma`,
      "lugesin",
      "Ma lugesin",
      SI_RULE,
    ),
    form(
      "si-raakis",
      "si",
      "rääkima",
      msg`to speak`,
      msg`past, ta`,
      "rääkis",
      "Ta rääkis",
      SI_RULE,
    ),
    form(
      "si-ootasime",
      "si",
      "ootama",
      msg`to wait`,
      msg`past, me`,
      "ootasime",
      "Me ootasime",
      SI_RULE,
    ),
    form(
      "si-oppisid",
      "si",
      "õppima",
      msg`to study`,
      msg`past, nad`,
      "õppisid",
      "Nad õppisid",
      SI_RULE,
    ),
    form("i-olin", "i", "olema", msg`to be`, msg`past, ma`, "olin", "olin", I_RULE),
    form("i-tuli", "i", "tulema", msg`to come`, msg`past, ta`, "tuli", "tuli", I_RULE),
    form("i-laksin", "i", "minema", msg`to go`, msg`past, ma`, "läksin", "läksin", I_RULE),
    form("i-tegin", "i", "tegema", msg`to do`, msg`past, ma`, "tegin", "tegin", I_RULE),
    form("i-soi", "i", "sööma", msg`to eat`, msg`past, ta`, "sõi", "sõi", I_RULE),
    form("i-join", "i", "jooma", msg`to drink`, msg`past, ma`, "jõin", "jõin", I_RULE),
    when(0, "past"),
    when(1, "now"),
    when(2, "past"),
    when(3, "past"),
    when(4, "now"),
    when(5, "past"),
    ...PAST_TRANSLATE.map((said) => ({
      kind: "translate" as const,
      id: `write-${said
        .toLowerCase()
        .replace(/[^a-z]+/g, "-")
        .replace(/^-|-$/g, "")}`,
      rule: "use" as const,
      prompt: TRANS_PROMPTS[said],
      answers: PAST_ANSWERS[said],
      say: said,
      explain: USE_RULE,
    })),
    ...PAST_FIXES.map((item) => ({
      kind: "fix" as const,
      id: `fix-${item.id}`,
      rule: (item.id === "went" || item.id === "ate" || item.id === "came" ? "i" : "si") as
        | "i"
        | "si",
      wrong: item.wrong,
      prompt: FIX_PROMPTS[item.id],
      answers: [item.right] as readonly [string, ...string[]],
      say: item.right,
      explain: item.id === "went" || item.id === "ate" || item.id === "came" ? I_RULE : SI_RULE,
    })),
    {
      kind: "dictation",
      id: "dictate-studied",
      rule: "use",
      answers: ["Eile õppisin eesti keelt."],
      say: "Eile õppisin eesti keelt.",
      explain: SI_RULE,
    },
    {
      kind: "dictation",
      id: "dictate-read",
      rule: "use",
      answers: ["Eelmisel nädalal lugesin palju."],
      say: "Eelmisel nädalal lugesin palju.",
      explain: SI_RULE,
    },
  ],
};
