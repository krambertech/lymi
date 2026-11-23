import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { MUL_ON_AM_HAVE, MUL_ON_FIX, MUL_ON_NAMES, MUL_ON_SAY } from "../../../lib/learn/clips";
import type {
  ChoiceDrill,
  DrillBank,
  DrillOption,
  FixDrill,
  SentenceDrill,
} from "../../../lib/learn/drill";

const SAY_MEANS: Record<(typeof MUL_ON_SAY)[number]["id"], MessageDescriptor> = {
  kass: msg`I have a cat.`,
  auto: msg`Do you have a car?`,
  maril: msg`Mari has a question.`,
  aega: msg`We don’t have time.`,
  kellel: msg`Who has a dog?`,
  abi: msg`I need help.`,
};

const SAY_RULE: Record<(typeof MUL_ON_SAY)[number]["id"], string> = {
  kass: "owner",
  auto: "owner",
  maril: "names",
  aega: "no",
  kellel: "owner",
  abi: "owner",
};

const NAME_MEANS: Record<(typeof MUL_ON_NAMES)[number]["said"], MessageDescriptor> = {
  "Maril on kass.": msg`Mari has a cat.`,
  "Jaanil on auto.": msg`Jaan has a car.`,
  "Emal on küsimus.": msg`Mum has a question.`,
  "Isal on koer.": msg`Dad has a dog.`,
  "Minu sõbral on maja.": msg`My friend has a house.`,
  "Õpetajal on raamat.": msg`The teacher has a book.`,
};

const FIX_WHY: Record<(typeof MUL_ON_FIX)[number]["id"], MessageDescriptor> = {
  mul: msg`I have is <et>mul on</et>: the owner takes <et>-l</et>.`,
  sul: msg`Do you have is <et>kas sul on</et>: the owner takes <et>-l</et>.`,
  jaanil: msg`A name takes <et>-l</et> on its genitive: <et>Jaan, Jaani, Jaanil</et>.`,
  emal: msg`A noun takes <et>-l</et> on its genitive: <et>ema, emal</et>.`,
  on: msg`The verb is <et>on</et> whoever has it: <et>meil on</et>.`,
  ole: msg`After <et>ei</et>, <et>on</et> becomes <et>ole</et>: <et>mul ei ole</et>, or <et>mul pole</et>.`,
};

const OWNER = msg`The owner takes <et>-l</et>, and the verb is <et>on</et>.`;

const FIX_MEANS: Record<(typeof MUL_ON_FIX)[number]["id"], MessageDescriptor> = {
  mul: msg`I have a cat.`,
  sul: msg`Do you have time?`,
  jaanil: msg`Jaan has a car.`,
  emal: msg`Mum has a question.`,
  on: msg`We have a house.`,
  ole: msg`I don’t have time.`,
};
const NAME = msg`A name or noun takes <et>-l</et> on its genitive.`;
const NO = msg`No: <et>pole</et>, or <et>ei ole</et>.`;
const RULE_EXPLAIN: Record<string, MessageDescriptor> = { owner: OWNER, names: NAME, no: NO };

const AM_HAVE = {
  am: { id: "am", label: msg`am, are or is` },
  have: { id: "have", label: msg`have or has` },
} satisfies Record<string, DrillOption>;

const YES_NO = [
  {
    said: "Mul pole aega.",
    also: ["Mul ei ole aega.", "Minul pole aega.", "Minul ei ole aega."],
    means: msg`I don’t have time.`,
  },
  {
    said: "Ei, mul pole homme aega.",
    also: [
      "Ei, mul ei ole homme aega.",
      "Ei, homme mul pole aega.",
      "Ei, homme pole mul aega.",
      "Ei, homme ei ole mul aega.",
      "Ei, mul homme pole aega.",
      "Ei, mul homme ei ole aega.",
      "Ei, homme mul ei ole aega.",
    ],
    means: msg`No, I don’t have time tomorrow.`,
  },
] as const;

const asciiId = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z]/g, "");

const said = ({ id, said, also }: (typeof MUL_ON_SAY)[number]): SentenceDrill => ({
  kind: "translate",
  id: `say-${id}`,
  rule: SAY_RULE[id],
  prompt: SAY_MEANS[id],
  answers: [said, ...also],
  say: said,
  explain: RULE_EXPLAIN[SAY_RULE[id]] as MessageDescriptor,
});

const named = ({ said }: (typeof MUL_ON_NAMES)[number]): SentenceDrill => ({
  kind: "translate",
  id: `name-${asciiId(said)}`,
  rule: "names",
  prompt: NAME_MEANS[said],
  answers: [said, ...(said === "Minu sõbral on maja." ? ["Mu sõbral on maja."] : [])],
  say: said,
  explain: NAME,
});

const fixed = ({ id, rule, wrong, right, also }: (typeof MUL_ON_FIX)[number]): FixDrill => ({
  kind: "fix",
  id: `fix-${id}`,
  rule,
  wrong,
  prompt: FIX_MEANS[id],
  answers: [right, ...also],
  say: right,
  explain: FIX_WHY[id],
});

const heard = (sentence: string, which: "am" | "have"): ChoiceDrill => ({
  kind: "choice",
  id: `hear-${asciiId(sentence)}`,
  rule: "am-have",
  say: sentence,
  answer: AM_HAVE[which],
  wrong: [AM_HAVE[which === "am" ? "have" : "am"]],
  explain:
    which === "am"
      ? msg`<et>${sentence}</et> starts with who it is: am, are or is.`
      : msg`<et>${sentence}</et> starts with an <et>-l</et> form: have or has.`,
});

const yesNo = ({ said, also, means }: (typeof YES_NO)[number]): SentenceDrill => ({
  kind: "translate",
  id: `no-${asciiId(said)}`,
  rule: "no",
  prompt: means,
  answers: [said, ...also],
  say: said,
  explain: NO,
});

const askTime: SentenceDrill = {
  kind: "translate",
  id: "ask-aega",
  rule: "owner",
  prompt: msg`Do you have time?`,
  answers: ["Kas sul on aega?", "Kas sinul on aega?", "Kas teil on aega?"],
  say: "Kas sul on aega?",
  explain: OWNER,
};

export const DRILLS: DrillBank = {
  rules: {
    owner: { label: msg`Saying who has it`, section: "mul-on" },
    "am-have": { label: msg`Am or have`, section: "am-or-have" },
    names: { label: msg`Names and nouns with -l`, section: "names" },
    no: { label: msg`Yes and no`, section: "yes-no" },
  },
  items: [
    ...MUL_ON_SAY.map(said),
    ...MUL_ON_NAMES.map(named),
    ...MUL_ON_FIX.map(fixed),
    ...YES_NO.map(yesNo),
    askTime,
    ...MUL_ON_AM_HAVE.flatMap(({ am, have }) => [heard(am, "am"), heard(have, "have")]),
  ],
};
