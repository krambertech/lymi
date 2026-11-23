import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import {
  PLACE_WORD_FIX,
  PLACE_WORD_SAY,
  PLACE_WORD_TYPED,
  PLACE_WORDS,
  type PlaceDirection,
  type PlaceWordId,
} from "../../../lib/learn/clips";
import type {
  ChoiceDrill,
  DrillBank,
  DrillOption,
  FixDrill,
  FormDrill,
  SentenceDrill,
} from "../../../lib/learn/drill";

type PlaceWord = (typeof PLACE_WORDS)[number];
const wordOf = (id: PlaceWordId) => PLACE_WORDS.find((each) => each.id === id) as PlaceWord;

const MEANS: Record<PlaceWordId, MessageDescriptor> = {
  peal: msg`on, on top of`,
  all: msg`under`,
  taga: msg`behind`,
  ees: msg`in front of`,
  korval: msg`next to`,
  sees: msg`inside`,
};

const SAY_MEANS: Record<(typeof PLACE_WORD_SAY)[number]["id"], MessageDescriptor> = {
  all: msg`The cat is under the table.`,
  taga: msg`The car is behind the house.`,
  ees: msg`I’m waiting in front of the shop.`,
  korval: msg`The café is next to the school.`,
  sisse: msg`The cat goes into the box.`,
  juurde: msg`I’m going to Mum’s.`,
};

const FIX_MEANS: Record<(typeof PLACE_WORD_FIX)[number]["id"], MessageDescriptor> = {
  laua: msg`The book is on the table.`,
  peale: msg`The cat jumps onto the box.`,
  seest: msg`The cat comes out of the box.`,
  taga: msg`The car is behind the house.`,
  poe: msg`I’m waiting in front of the shop.`,
  juures: msg`I’m at Mum’s.`,
};

const GENITIVE = msg`The thing before a place word is in the genitive: <et>laua peal, poe ees</et>.`;
const TO_FROM = msg`Each place word has a form for <et>kus</et>, <et>kuhu</et> and <et>kust</et>: <et>taga, taha, tagant</et>.`;
const WHY = { genitive: GENITIVE, tofrom: TO_FROM, which: TO_FROM };
type Rule = keyof typeof WHY;

const SAY_RULE: Record<(typeof PLACE_WORD_SAY)[number]["id"], Rule> = {
  all: "genitive",
  taga: "genitive",
  ees: "genitive",
  korval: "genitive",
  sisse: "tofrom",
  juurde: "tofrom",
};

const FIX_RULE: Record<(typeof PLACE_WORD_FIX)[number]["id"], Rule> = {
  laua: "genitive",
  peale: "tofrom",
  seest: "tofrom",
  taga: "tofrom",
  poe: "genitive",
  juures: "tofrom",
};

const QUESTIONS = {
  kus: { id: "kus", label: msg`Where it is` },
  kuhu: { id: "kuhu", label: msg`Where it goes` },
  kust: { id: "kust", label: msg`Where it comes from` },
} satisfies Record<PlaceDirection, DrillOption>;

const HEARD: readonly { form: string; way: PlaceDirection }[] = [
  { form: "peale", way: "kuhu" },
  { form: "alt", way: "kust" },
  { form: "taga", way: "kus" },
  { form: "ette", way: "kuhu" },
  { form: "kõrvalt", way: "kust" },
  { form: "sees", way: "kus" },
];

const asciiId = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z]/g, "");

const typed = ({ id, way }: (typeof PLACE_WORD_TYPED)[number]): FormDrill => {
  const word = wordOf(id);
  return {
    kind: "form",
    id: `${way}-${id}`,
    rule: "tofrom",
    base: word.kus,
    gloss: MEANS[id],
    cue: { et: `${way}?` },
    answers: [word[way]],
    say: word[way],
    explain: TO_FROM,
  };
};

const said = ({ id, said: text, also }: (typeof PLACE_WORD_SAY)[number]): SentenceDrill => ({
  kind: "translate",
  id: `say-${id}`,
  rule: SAY_RULE[id],
  prompt: SAY_MEANS[id],
  answers: [text, ...also],
  say: text,
  explain: WHY[SAY_RULE[id]],
});

const fixed = ({ id, wrong, right }: (typeof PLACE_WORD_FIX)[number]): FixDrill => ({
  kind: "fix",
  id: `fix-${id}`,
  rule: FIX_RULE[id],
  wrong,
  prompt: FIX_MEANS[id],
  answers: [right],
  say: right,
  explain: WHY[FIX_RULE[id]],
});

const heard = ({ form, way }: (typeof HEARD)[number]): ChoiceDrill => ({
  kind: "choice",
  id: `hear-${asciiId(form)}`,
  rule: "which",
  say: form,
  answer: QUESTIONS[way],
  wrong: (["kus", "kuhu", "kust"] as const)
    .filter((each) => each !== way)
    .map((each) => QUESTIONS[each]),
  explain: TO_FROM,
});

export const DRILLS: DrillBank = {
  rules: {
    genitive: { label: msg`The genitive before a place word`, section: "genitive" },
    tofrom: { label: msg`Where, where to and where from`, section: "to-and-from" },
    which: { label: msg`Which question a form answers`, section: "to-and-from" },
  },
  items: [
    ...PLACE_WORD_TYPED.map(typed),
    ...PLACE_WORD_SAY.map(said),
    ...PLACE_WORD_FIX.map(fixed),
    ...HEARD.map(heard),
  ],
};
