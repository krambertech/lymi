import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { INNER_FIX, INNER_PLACES, INNER_SAY, INNER_TYPED } from "../../../lib/learn/clips";
import type {
  ChoiceDrill,
  DrillBank,
  DrillOption,
  FixDrill,
  FormDrill,
  SentenceDrill,
} from "../../../lib/learn/drill";

type Place = (typeof INNER_PLACES)[number];
type Way = "kus" | "kuhu" | "kust";

const placeOf = (name: Place["place"]) => INNER_PLACES.find((each) => each.place === name) as Place;

const PLACE_MEANS: Record<string, MessageDescriptor> = {
  Tallinn: msg`Tallinn, the capital`,
  haigla: msg`hospital`,
  kontor: msg`office`,
  kohvik: msg`café`,
  Pärnu: msg`Pärnu, a town by the sea`,
  maja: msg`house`,
  kodu: msg`home`,
  pood: msg`shop`,
};

const SAY_MEANS: Record<(typeof INNER_SAY)[number]["id"], MessageDescriptor> = {
  tartusse: msg`I’m going to Tartu.`,
  parit: msg`Where are you from?`,
  poest: msg`I’m coming from the shop.`,
  majja: msg`The cat goes into the house.`,
  linna: msg`We’re going to town.`,
  eestist: msg`I’m from Estonia.`,
};

const WHERE = msg`Being there answers <et>kus</et> and takes <et>-s</et>.`;
const INTO = msg`Going there answers <et>kuhu</et> and takes <et>-sse</et>.`;
const SHORT = msg`Some everyday places have a short form for where to: <et>kooli, poodi, linna, majja, koju</et>.`;
const OUT_OF = msg`Coming from a place, or being from it with <et>pärit</et>, answers <et>kust</et> and takes <et>-st</et>.`;
const WHY = { where: WHERE, into: INTO, short: SHORT, outof: OUT_OF };
type Rule = keyof typeof WHY;

const SHORT_PLACES: readonly string[] = ["kool", "pood", "linn", "maja", "kodu"];

const ruleOf = (place: Place, way: Way): Rule =>
  way === "kus"
    ? "where"
    : way === "kust"
      ? "outof"
      : SHORT_PLACES.includes(place.place)
        ? "short"
        : "into";

const SAY_RULE: Record<(typeof INNER_SAY)[number]["id"], Rule> = {
  tartusse: "into",
  parit: "outof",
  poest: "outof",
  majja: "short",
  linna: "short",
  eestist: "outof",
};

const FIX_RULE: Record<(typeof INNER_FIX)[number]["id"], Rule> = {
  tartusse: "into",
  poest: "outof",
  soomest: "outof",
  majas: "where",
  koju: "short",
  kodus: "where",
};

const QUESTIONS = {
  kus: { id: "kus", label: msg`Where it is` },
  kuhu: { id: "kuhu", label: msg`Where it goes` },
  kust: { id: "kust", label: msg`Where it comes from` },
} satisfies Record<Way, DrillOption>;

const HEARD: readonly { form: string; way: Way; rule: Rule }[] = [
  { form: "Tartusse", way: "kuhu", rule: "into" },
  { form: "kodus", way: "kus", rule: "where" },
  { form: "poest", way: "kust", rule: "outof" },
  { form: "koju", way: "kuhu", rule: "short" },
  { form: "Tartus", way: "kus", rule: "where" },
  { form: "kodust", way: "kust", rule: "outof" },
];

const asciiId = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z]/g, "");

const typed = ({
  place,
  way,
  also,
}: {
  place: Place["place"];
  way: Way;
  also: readonly string[];
}): FormDrill => {
  const forms = placeOf(place);
  const form = forms[way];
  const rule = ruleOf(forms, way);
  return {
    kind: "form",
    id: `${way}-${asciiId(place)}`,
    rule,
    base: place,
    gloss: PLACE_MEANS[place] as MessageDescriptor,
    cue: { et: `${way}?` },
    answers: [form, ...(way === "kuhu" && "long" in forms ? [forms.long] : []), ...also],
    say: form,
    explain: WHY[rule],
  };
};

const said = ({ id, said: text, also }: (typeof INNER_SAY)[number]): SentenceDrill => ({
  kind: "translate",
  id: `say-${id}`,
  rule: SAY_RULE[id],
  prompt: SAY_MEANS[id],
  answers: [text, ...also],
  say: text,
  explain: WHY[SAY_RULE[id]],
});

const FIX_MEANS: Record<(typeof INNER_FIX)[number]["id"], MessageDescriptor> = {
  tartusse: msg`I’m going to Tartu.`,
  poest: msg`I’m coming from the shop.`,
  soomest: msg`I’m from Finland.`,
  majas: msg`The cat is in the house.`,
  koju: msg`We’re going home.`,
  kodus: msg`I’m at home.`,
};

const fixed = ({ id, wrong, right, also }: (typeof INNER_FIX)[number]): FixDrill => ({
  kind: "fix",
  id: `fix-${id}`,
  rule: FIX_RULE[id],
  wrong,
  prompt: FIX_MEANS[id],
  answers: [right, ...also],
  say: right,
  explain: WHY[FIX_RULE[id]],
});

const heard = ({ form, way, rule }: (typeof HEARD)[number]): ChoiceDrill => ({
  kind: "choice",
  id: `hear-${asciiId(form)}`,
  rule: "which",
  say: form,
  answer: QUESTIONS[way],
  wrong: (["kus", "kuhu", "kust"] as const)
    .filter((each) => each !== way)
    .map((each) => QUESTIONS[each]),
  explain: WHY[rule],
});

export const DRILLS: DrillBank = {
  rules: {
    which: { label: msg`Which question a form answers`, section: "hearing" },
    where: { label: msg`Where: -s`, section: "three" },
    into: { label: msg`Where to: -sse`, section: "into" },
    short: { label: msg`Short forms for where to`, section: "short" },
    outof: { label: msg`Where from: -st`, section: "out-of" },
  },
  items: [
    ...[...INNER_TYPED, { place: "Tallinn", way: "kus", also: [] } as const].map(typed),
    ...INNER_SAY.map(said),
    ...INNER_FIX.map(fixed),
    ...HEARD.map(heard),
  ],
};
