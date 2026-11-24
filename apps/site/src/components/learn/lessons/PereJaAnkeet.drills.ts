import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import {
  clipId,
  PERE_DRILL_ASKED,
  PERE_DRILL_COUNTED,
  PERE_DRILL_FIELDS,
  PERE_DRILL_FIXES,
  PERE_DRILL_HEARD,
  PERE_DRILL_TRANSLATED,
  PERE_FIXES,
  PERE_TRANSLATED,
  PERE_WRITTEN,
} from "../../../lib/learn/clips";
import type {
  ChoiceDrill,
  DrillBank,
  DrillOption,
  FixDrill,
  FormDrill,
  SentenceDrill,
} from "../../../lib/learn/drill";

const MEANS: Record<string, MessageDescriptor> = {
  ema: msg`mother`,
  isa: msg`father`,
  vend: msg`brother`,
  õde: msg`sister`,
  vanaema: msg`grandmother`,
  vanaisa: msg`grandfather`,
  laps: msg`child`,
  abikaasa: msg`husband or wife`,
  eesnimi: msg`first name`,
  perekonnanimi: msg`surname`,
  vanus: msg`age`,
  linn: msg`town, city`,
  aadress: msg`address`,
  riik: msg`country`,
};

const option = (word: string): DrillOption => ({
  id: word,
  label: { et: word },
  sub: MEANS[word] as MessageDescriptor,
});

const FAMILY_WRONG: Record<string, readonly string[]> = {
  isa: ["vend", "õde", "laps", "abikaasa"],
  vend: ["isa", "laps", "abikaasa"],
  õde: ["isa", "laps", "abikaasa"],
  vanaema: ["isa", "vend", "laps", "õde"],
};

const FAMILY_SLIP: Record<string, string> = {
  isa: "ema",
  vend: "õde",
  õde: "vend",
  vanaema: "ema",
};

const FIELD_WRONG: Record<string, readonly string[]> = {
  perekonnanimi: ["vanus", "linn", "aadress"],
  vanus: ["eesnimi", "linn", "riik"],
  linn: ["eesnimi", "vanus", "aadress"],
  eesnimi: ["linn", "riik", "vanus"],
};

const FIELD_SLIP: Record<string, string> = {
  perekonnanimi: "eesnimi",
  vanus: "aadress",
  linn: "riik",
  eesnimi: "perekonnanimi",
};

const WHY = {
  family: msg`Listen for the word after <et>minu</et>: it names the person.`,
  field: msg`The word after <et>minu</et> names the part of the form.`,
  count: msg`After a number from two up, a family word usually changes: <et>kaks venda</et>, <et>kolm last</et>. A few stay, as <et>õde</et> does.`,
  olema: msg`This is about <et>minu eesnimi</et>, not <et>mina</et>, so the verb is <et>on</et>.`,
  place: msg`To say where someone lives or is, the place usually takes <et>-s</et>: <et>Tartus</et>, <et>kodus</et>.`,
  minu: msg`<et>Minu</et> is my; <et>mina</et> is I.`,
  ask: msg`Ask for a part of a form with <et>Mis on sinu …?</et>`,
  form: msg`Start with <et>Minu</et>, then the word on the form, then <et>on</et>.`,
} as const;

const RULE = {
  family: "family",
  count: "count",
  form: "form",
  olema: "form",
  place: "family",
  minu: "form",
} as const;

const heard = ({ word, said }: (typeof PERE_DRILL_HEARD)[number]): ChoiceDrill => ({
  kind: "choice",
  id: `hear-${clipId(said)}`,
  rule: "family",
  say: said,
  answer: option(word),
  slip: option(FAMILY_SLIP[word] as string),
  wrong: (FAMILY_WRONG[word] as readonly string[]).map(option),
  explain: WHY.family,
});

const field = ({ word, said }: (typeof PERE_DRILL_FIELDS)[number]): ChoiceDrill => ({
  kind: "choice",
  id: `field-${clipId(said)}`,
  rule: "form",
  say: said,
  answer: option(word),
  slip: option(FIELD_SLIP[word] as string),
  wrong: (FIELD_WRONG[word] as readonly string[]).map(option),
  explain: WHY.field,
});

const counted = ({ base, number, form, said }: (typeof PERE_DRILL_COUNTED)[number]): FormDrill => ({
  kind: "form",
  id: `count-${clipId(`${number} ${base}`)}`,
  rule: "count",
  base,
  gloss: MEANS[base] as MessageDescriptor,
  cue: { et: `${number} …` },
  answers: [form],
  say: said,
  explain: WHY.count,
});

const asked = ({ reply, answers }: (typeof PERE_DRILL_ASKED)[number]): SentenceDrill => ({
  kind: "ask",
  id: `ask-${clipId(reply)}`,
  rule: "form",
  reply,
  say: answers[0],
  answers: [...answers],
  explain: WHY.ask,
});

const translate = (
  answers: readonly [string, ...string[]],
  prompt: MessageDescriptor,
  rule: keyof typeof RULE,
  explain: MessageDescriptor,
): SentenceDrill => ({
  kind: "translate",
  id: `translate-${clipId(answers[0])}`,
  rule: RULE[rule],
  prompt,
  say: answers[0],
  answers: [...answers],
  explain,
});

const fixed = (
  { kind, wrong, said }: { kind: keyof typeof RULE; wrong: string; said: string },
  prompt: MessageDescriptor,
): FixDrill => ({
  kind: "fix",
  id: `fix-${clipId(wrong)}`,
  rule: RULE[kind],
  prompt,
  wrong,
  say: said,
  answers: [said],
  explain: WHY[kind],
});

const written = (said: string, kind: keyof typeof RULE): SentenceDrill => ({
  kind: "dictation",
  id: `write-${clipId(said)}`,
  rule: RULE[kind],
  say: said,
  answers: [said],
  explain: WHY[kind],
});

const familyOf = (kind: string) => PERE_WRITTEN.filter((each) => each.kind === kind);

export const DRILLS: DrillBank = {
  rules: {
    family: { label: msg`Family words`, section: "hear-family" },
    count: { label: msg`A family word after a number`, section: "count" },
    form: { label: msg`The words on a form`, section: "form-sort" },
  },
  items: [
    ...PERE_DRILL_HEARD.map(heard),
    translate(PERE_TRANSLATED[0].answers, msg`My mother lives in Tartu.`, "family", WHY.family),
    translate(PERE_TRANSLATED[3].answers, msg`My grandfather is at home.`, "family", WHY.family),
    translate(
      PERE_DRILL_TRANSLATED[0].answers,
      msg`My brother studies in Tartu.`,
      "family",
      WHY.family,
    ),
    ...familyOf("family").map(({ said }) => written(said, "family")),
    ...PERE_DRILL_COUNTED.map(counted),
    translate(PERE_DRILL_TRANSLATED[1].answers, msg`I have three children.`, "count", WHY.count),
    translate(
      PERE_TRANSLATED[1].answers,
      msg`I have one sister and two brothers.`,
      "count",
      WHY.count,
    ),
    fixed(PERE_FIXES[0], msg`I have two brothers.`),
    fixed(PERE_DRILL_FIXES[0], msg`I have four brothers.`),
    fixed(PERE_FIXES[3], msg`I have three children.`),
    ...PERE_DRILL_FIELDS.map(field),
    ...PERE_DRILL_ASKED.map(asked),
    translate(PERE_DRILL_TRANSLATED[2].answers, msg`My surname is Mägi.`, "form", WHY.form),
    fixed(PERE_DRILL_FIXES[1], msg`My address is Kooli 5.`),
    fixed(PERE_FIXES[4], msg`I’m twenty-five.`),
  ],
};
