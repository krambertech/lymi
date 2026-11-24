import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import {
  EMAL_ANSWERS,
  EMAL_FIXES,
  EMAL_FORMS,
  EMAL_TELL,
  EMAL_TRANSLATE,
} from "../../../lib/learn/clips";
import type { ChoiceDrill, DrillBank, FormDrill } from "../../../lib/learn/drill";

const HAVE_RULE = msg`<et>-l, -le, -lt</et> on a person usually express having, giving or receiving: <et>Emal on aed</et>, <et>helistan sõbrale</et>, <et>sain õelt kirja</et>.`;
const PLACE_RULE = msg`Being at, going to or coming from a person’s place usually uses the genitive plus <et>juures, juurde, juurest</et>.`;
const GEN_RULE = msg`Before <et>juures, juurde</et> and <et>juurest</et>, nouns and pronouns take the genitive: <et>ema juures, sõbra juurde, minu juurde</et>.`;

const FORM_GLOSS: Record<(typeof EMAL_FORMS)[number]["id"], MessageDescriptor> = {
  "ema-place": msg`at mother’s place`,
  "arst-to": msg`to the doctor`,
  "sober-from": msg`from a friend’s place`,
  "mina-to": msg`to my place`,
  "ema-have": msg`mother has`,
  "sober-to": msg`to a friend (calling)`,
  "ode-from": msg`from sister (getting)`,
  "vend-have": msg`brother has`,
};

const TELL_LABELS = {
  have: { id: "have", label: msg`Having, giving or getting` },
  place: { id: "place", label: msg`At, to or from their place` },
} as const;

const TRANS_PROMPTS: Record<(typeof EMAL_TRANSLATE)[number], MessageDescriptor> = {
  "Ma olen täna ema juures.": msg`I am at my mother’s place today.`,
  "Ma lähen homme arsti juurde.": msg`I am going to the doctor tomorrow.`,
  "Ta tuli just sõbra juurest.": msg`He or she just came from a friend’s place.`,
  "Emal on väike aed.": msg`Mother has a small garden.`,
  "Ma sain õelt kirja.": msg`I got a letter from my sister.`,
  "Tule õhtul minu juurde!": msg`Come to my place in the evening!`,
};

const FIX_PROMPTS: Record<(typeof EMAL_FIXES)[number]["id"], MessageDescriptor> = {
  at: msg`I am at my mother’s place today.`,
  to: msg`I am going to the doctor tomorrow.`,
  from: msg`He or she just came from a friend’s place.`,
  genEma: msg`I am going to my mother’s place tomorrow.`,
  genSober: msg`He or she is at a friend’s place today.`,
  genMina: msg`Come to my place in the evening!`,
};

const formSaid = (item: { before: string; answer: string; after: string }) =>
  `${item.before ? `${item.before} ` : ""}${item.answer}${/^[.,!?]/.test(item.after) ? "" : " "}${item.after}`;

const formItem = (index: number): FormDrill => {
  const item = EMAL_FORMS[index] as (typeof EMAL_FORMS)[number];
  const isPlace = item.answer.includes("juur");
  return {
    kind: "form",
    id: `form-${item.id}`,
    rule: item.id === "mina-to" ? "genitive" : isPlace ? "place" : "have",
    base: item.base,
    gloss: FORM_GLOSS[item.id],
    cue: {
      et: `${item.before ? `${item.before} ` : ""}___${/^[.,!?]/.test(item.after) ? "" : " "}${item.after}`,
    },
    answers: item.answers,
    say: formSaid(item),
    explain: item.id === "mina-to" ? GEN_RULE : isPlace ? PLACE_RULE : HAVE_RULE,
  };
};

const tellItem = (index: number): ChoiceDrill => {
  const item = EMAL_TELL[index] as (typeof EMAL_TELL)[number];
  return {
    kind: "choice",
    id: `tell-${item.id}`,
    rule: "place",
    say: item.said,
    answer: TELL_LABELS[item.kind],
    wrong: [TELL_LABELS[item.kind === "have" ? "place" : "have"]],
    explain: item.kind === "have" ? HAVE_RULE : PLACE_RULE,
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
    have: { label: msg`Having and giving: <et>-l, -le, -lt</et>`, section: "contrast" },
    place: {
      label: msg`At someone’s place: <et>juures, juurde, juurest</et>`,
      section: "contrast",
    },
    genitive: { label: msg`Genitive before <et>juures</et>`, section: "forms" },
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
    ...EMAL_TRANSLATE.map((said) => {
      const rule = said.includes("minu juurde")
        ? "genitive"
        : said.includes("juur")
          ? "place"
          : "have";
      return {
        kind: "translate" as const,
        id: `write-${toAsciiId(said)}`,
        rule: rule as "have" | "place" | "genitive",
        prompt: TRANS_PROMPTS[said],
        answers: EMAL_ANSWERS[said],
        say: said,
        explain: rule === "genitive" ? GEN_RULE : rule === "place" ? PLACE_RULE : HAVE_RULE,
      };
    }),
    ...EMAL_FIXES.map((item) => {
      const isGen = item.id.startsWith("gen");
      return {
        kind: "fix" as const,
        id: `fix-${item.id.toLowerCase()}`,
        rule: (isGen ? "genitive" : "place") as "have" | "place" | "genitive",
        wrong: item.wrong,
        prompt: FIX_PROMPTS[item.id],
        answers: [item.right] as readonly [string, ...string[]],
        say: item.right,
        explain: isGen ? GEN_RULE : PLACE_RULE,
      };
    }),
  ],
};
