import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import {
  DOCTOR_ANSWERS,
  DOCTOR_FIXES,
  DOCTOR_TELL,
  DOCTOR_TRANSLATE,
} from "../../../lib/learn/clips";
import type { ChoiceDrill, DrillBank, FormDrill } from "../../../lib/learn/drill";

const PAIN_RULE = msg`Pain usually uses <et>mul / sul / tal valutab</et> with the aching body part.`;
const SYMPTOM_RULE = msg`Symptoms usually use <et>mul on</et>: <et>Mul on palavik</et>, <et>Mul on köha</et>, <et>Mul on nohu</et>.`;
const VISIT_RULE = msg`Going to the doctor is <et>arsti juurde</et>; being there is <et>arsti juures</et>.`;
const ADVICE_RULE = msg`Polite medical instructions usually take <et>-ge / -ke</et>, and <et>veega</et> takes <et>-ga</et>.`;

const TELL_LABELS = {
  pain: { id: "pain", label: msg`What hurts` },
  symptom: { id: "symptom", label: msg`Symptom or medicine` },
} as const;

const TRANS_PROMPTS: Record<(typeof DOCTOR_TRANSLATE)[number], MessageDescriptor> = {
  "Mul valutab pea.": msg`My head hurts.`,
  "Mul on palavik ja köha.": msg`I have a fever and a cough.`,
  "Ma tahan arsti juurde tulla.": msg`I want to come to the doctor.`,
  "Mul valutab kurk juba kolm päeva.": msg`My throat has hurt for three days already.`,
  "Võtke seda rohtu kaks korda päevas.": msg`Take this medicine twice a day.`,
  "Ma pean kaks päeva kodus puhkama.": msg`I have to rest at home for two days.`,
};

const FIX_PROMPTS: Record<(typeof DOCTOR_FIXES)[number]["id"], MessageDescriptor> = {
  "mul-valutab": msg`My head hurts.`,
  "valutab-sg": msg`My throat hurts.`,
  "arsti-juures": msg`They are at the doctor’s today.`,
  apteegis: msg`I went to the pharmacy yesterday.`,
  veega: msg`Take this medicine with water.`,
  "kolm-paeva": msg`Rest at home for three days.`,
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

const formItem = (
  id: string,
  rule: "pain" | "symptom" | "visit" | "advice",
  base: string,
  gloss: MessageDescriptor,
  cue: string,
  answer: string,
  say: string,
): FormDrill => ({
  kind: "form",
  id: `form-${id}`,
  rule,
  base,
  gloss,
  cue: { et: cue },
  answers: [answer],
  say,
  explain:
    rule === "pain"
      ? PAIN_RULE
      : rule === "symptom"
        ? SYMPTOM_RULE
        : rule === "visit"
          ? VISIT_RULE
          : ADVICE_RULE,
});

const tellItem = (index: number): ChoiceDrill => {
  const item = DOCTOR_TELL[index] as (typeof DOCTOR_TELL)[number];
  return {
    kind: "choice",
    id: `tell-${item.id}`,
    rule: "tell",
    say: item.said,
    answer: TELL_LABELS[item.kind],
    wrong: [TELL_LABELS[item.kind === "pain" ? "symptom" : "pain"]],
    explain: item.kind === "pain" ? PAIN_RULE : SYMPTOM_RULE,
  };
};

export const DRILLS: DrillBank = {
  rules: {
    pain: { label: msg`What hurts: <et>Mul valutab pea</et>`, section: "words" },
    symptom: { label: msg`Symptoms: <et>Mul on palavik, köha, nohu</et>`, section: "words" },
    tell: { label: msg`Pain or symptom: <et>valutab</et> or <et>mul on</et>`, section: "tell" },
    visit: { label: msg`At the doctor’s: <et>arsti juurde, arsti juures</et>`, section: "write" },
    advice: {
      label: msg`Doctor’s advice: <et>Võtke seda rohtu, Puhake kodus</et>`,
      section: "fix",
    },
  },
  items: [
    formItem("mul-pea", "pain", "mina", msg`head`, "___ valutab pea.", "Mul", "Mul valutab pea."),
    formItem(
      "valutab-kurk",
      "pain",
      "valutama",
      msg`throat`,
      "Mul ___ kurk.",
      "valutab",
      "Mul valutab kurk.",
    ),
    formItem(
      "retsepti",
      "symptom",
      "retsept",
      msg`prescription`,
      "Arst kirjutab mulle ___.",
      "retsepti",
      "Arst kirjutab mulle retsepti.",
    ),
    formItem(
      "juures",
      "visit",
      "arst",
      msg`at the doctor’s`,
      "Ta on täna arsti ___.",
      "juures",
      "Ta on täna arsti juures.",
    ),
    formItem(
      "apteegis",
      "visit",
      "apteek",
      msg`at the pharmacy`,
      "Ma käisin eile ___.",
      "apteegis",
      "Ma käisin eile apteegis.",
    ),
    formItem(
      "veega",
      "advice",
      "vesi",
      msg`with water`,
      "Võtke seda rohtu ___.",
      "veega",
      "Võtke seda rohtu veega.",
    ),
    formItem(
      "paeva",
      "advice",
      "päev",
      msg`three days`,
      "Puhake kodus kolm ___.",
      "päeva",
      "Puhake kodus kolm päeva.",
    ),
    formItem(
      "on-palavik",
      "symptom",
      "olema",
      msg`I have`,
      "Mul ___ kõrge palavik.",
      "on",
      "Mul on kõrge palavik.",
    ),
    formItem(
      "on-koha",
      "symptom",
      "olema",
      msg`I have`,
      "Mul ___ tugev köha.",
      "on",
      "Mul on tugev köha.",
    ),
    tellItem(0),
    tellItem(1),
    tellItem(2),
    tellItem(3),
    tellItem(4),
    tellItem(5),
    tellItem(6),
    tellItem(7),
    ...DOCTOR_TRANSLATE.map((said) => {
      const rule = said.includes("valutab")
        ? "pain"
        : said.includes("palavik")
          ? "symptom"
          : said.includes("arsti")
            ? "visit"
            : "advice";
      return {
        kind: "translate" as const,
        id: `write-${toAsciiId(said)}`,
        rule: rule as "pain" | "symptom" | "visit" | "advice",
        prompt: TRANS_PROMPTS[said],
        answers: DOCTOR_ANSWERS[said],
        say: said,
        explain:
          rule === "pain"
            ? PAIN_RULE
            : rule === "symptom"
              ? SYMPTOM_RULE
              : rule === "visit"
                ? VISIT_RULE
                : ADVICE_RULE,
      };
    }),
    ...DOCTOR_FIXES.map((item) => {
      const rule =
        item.id === "mul-valutab" || item.id === "valutab-sg"
          ? "pain"
          : item.id === "arsti-juures" || item.id === "apteegis"
            ? "visit"
            : "advice";
      return {
        kind: "fix" as const,
        id: `fix-${item.id}`,
        rule: rule as "pain" | "symptom" | "visit" | "advice",
        wrong: item.wrong,
        prompt: FIX_PROMPTS[item.id],
        answers: [item.right] as readonly [string, ...string[]],
        say: item.right,
        explain: rule === "pain" ? PAIN_RULE : rule === "visit" ? VISIT_RULE : ADVICE_RULE,
      };
    }),
  ],
};
