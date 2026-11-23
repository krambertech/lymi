import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { OUTER_FIX, OUTER_PLACES, OUTER_SAY, OUTER_TYPED } from "../../../lib/learn/clips";
import type {
  ChoiceDrill,
  DrillBank,
  DrillOption,
  FixDrill,
  FormDrill,
  SentenceDrill,
} from "../../../lib/learn/drill";

type Place = (typeof OUTER_PLACES)[number];
type Way = "kus" | "kuhu" | "kust";

const placeOf = (name: Place["place"]) => OUTER_PLACES.find((each) => each.place === name) as Place;

const PLACE_MEANS: Record<Place["place"], MessageDescriptor> = {
  laud: msg`table`,
  töö: msg`work, job`,
  turg: msg`market`,
  Saaremaa: msg`Saaremaa, Estonia’s largest island`,
};

const SAY_MEANS: Record<(typeof OUTER_SAY)[number]["id"], MessageDescriptor> = {
  toole: msg`I’m going to work.`,
  turult: msg`I’m coming from the market.`,
  lauale: msg`The cat jumps onto the table.`,
  emale: msg`I’m calling Mum.`,
  isalt: msg`I’ll ask Dad.`,
  saaremaal: msg`We live on Saaremaa.`,
};

const ON = msg`Being on or at a place answers <et>kus</et> and takes <et>-l</et>.`;
const ONTO = msg`Going onto or to a place answers <et>kuhu</et> and takes <et>-le</et>.`;
const OFF = msg`Coming off or from a place answers <et>kust</et> and takes <et>-lt</et>.`;
const PEOPLE = msg`The person you call takes <et>-le</et>, and the person you ask takes <et>-lt</et>.`;
const WHY = { on: ON, onto: ONTO, off: OFF, people: PEOPLE };
type Rule = keyof typeof WHY;
const RULE_OF: Record<Way, Rule> = { kus: "on", kuhu: "onto", kust: "off" };

const SAY_RULE: Record<(typeof OUTER_SAY)[number]["id"], Rule> = {
  toole: "onto",
  turult: "off",
  lauale: "onto",
  emale: "people",
  isalt: "people",
  saaremaal: "on",
};

const FIX_RULE: Record<(typeof OUTER_FIX)[number]["id"], Rule> = {
  toole: "onto",
  turult: "off",
  laual: "on",
  emale: "people",
  emalt: "people",
  turule: "onto",
};

const QUESTIONS = {
  kus: { id: "kus", label: msg`Where it is` },
  kuhu: { id: "kuhu", label: msg`Where it goes` },
  kust: { id: "kust", label: msg`Where it comes from` },
} satisfies Record<Way, DrillOption>;

const HEARD: readonly { form: string; way: Way }[] = [
  { form: "lauale", way: "kuhu" },
  { form: "tööl", way: "kus" },
  { form: "turult", way: "kust" },
  { form: "Saaremaale", way: "kuhu" },
  { form: "laualt", way: "kust" },
  { form: "turul", way: "kus" },
];

const asciiId = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z]/g, "");

const typed = ({ place, way }: (typeof OUTER_TYPED)[number]): FormDrill => {
  const form = placeOf(place)[way];
  return {
    kind: "form",
    id: `${way}-${asciiId(place)}`,
    rule: RULE_OF[way],
    base: place,
    gloss: PLACE_MEANS[place],
    cue: { et: `${way}?` },
    answers: [form],
    say: form,
    explain: WHY[RULE_OF[way]],
  };
};

const said = ({ id, said: text, also }: (typeof OUTER_SAY)[number]): SentenceDrill => ({
  kind: "translate",
  id: `say-${id}`,
  rule: SAY_RULE[id],
  prompt: SAY_MEANS[id],
  answers: [text, ...also],
  say: text,
  explain: WHY[SAY_RULE[id]],
});

const FIX_MEANS: Record<(typeof OUTER_FIX)[number]["id"], MessageDescriptor> = {
  toole: msg`I’m going to work.`,
  turult: msg`I’m coming from the market.`,
  laual: msg`The cat is on the table.`,
  emale: msg`I’m calling Mum.`,
  emalt: msg`I’m asking Mum.`,
  turule: msg`I’m going to the market.`,
};

const fixed = ({ id, wrong, right, also }: (typeof OUTER_FIX)[number]): FixDrill => ({
  kind: "fix",
  id: `fix-${id}`,
  rule: FIX_RULE[id],
  wrong,
  prompt: FIX_MEANS[id],
  answers: [right, ...also],
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
  explain: WHY[RULE_OF[way]],
});

export const DRILLS: DrillBank = {
  rules: {
    which: { label: msg`Which question a form answers`, section: "hearing" },
    on: { label: msg`On or at: -l`, section: "table" },
    onto: { label: msg`Onto or to: -le`, section: "endings" },
    off: { label: msg`Off or from: -lt`, section: "endings" },
    people: { label: msg`People with -le and -lt`, section: "people" },
  },
  items: [
    ...OUTER_TYPED.map(typed),
    ...OUTER_SAY.map(said),
    ...OUTER_FIX.map(fixed),
    ...HEARD.map(heard),
  ],
};
