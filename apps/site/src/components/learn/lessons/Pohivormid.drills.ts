import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import {
  NOUN_FORMS,
  type NounForms,
  nounEntry,
  POHIVORMID_DRILL,
  POHIVORMID_FIX,
  POHIVORMID_HEARD,
  POHIVORMID_SAY,
  POHIVORMID_TYPED,
} from "../../../lib/learn/clips";
import type {
  ChoiceDrill,
  DrillBank,
  DrillOption,
  FixDrill,
  FormDrill,
  SentenceDrill,
} from "../../../lib/learn/drill";

type First = (typeof NOUN_FORMS)[number][0];
type TypedFirst = (typeof POHIVORMID_TYPED)[number]["forms"][0];

const formsOf = (first: First) => NOUN_FORMS.find((forms) => forms[0] === first) as NounForms;

const MEANS: Record<TypedFirst, MessageDescriptor> = {
  inimene: msg`person`,
  hobune: msg`horse`,
  vastus: msg`answer`,
  harjutus: msg`exercise`,
  maa: msg`land, country`,
  tee: msg`road; also tea`,
  puu: msg`tree`,
};

const SAY_MEANS: Record<(typeof POHIVORMID_SAY)[number]["id"], MessageDescriptor> = {
  koolis: msg`The child is at school.`,
  majas: msg`The man is in the house.`,
  toas: msg`The woman is in the room.`,
  laual: msg`The book is on the table.`,
  linnas: msg`We’re in town.`,
  kodus: msg`The car is at home.`,
};

const DRILL_MEANS: Record<(typeof POHIVORMID_DRILL)[number]["said"], MessageDescriptor> = {
  "Mees on linnas.": msg`The man is in town.`,
  "Naine on poes.": msg`The woman is at the shop.`,
  "Laps on autos.": msg`The child is in the car.`,
  "Mees on uksel.": msg`The man is at the door.`,
  "Laps on turul.": msg`The child is at the market.`,
  "Naine on tööl.": msg`The woman is at work.`,
};

const SAY_FIRST: Record<(typeof POHIVORMID_SAY)[number]["id"], First> = {
  koolis: "kool",
  majas: "maja",
  toas: "tuba",
  laual: "laud",
  linnas: "linn",
  kodus: "kodu",
};

const ENDING_RULE = {
  ne: msg`<et>-ne</et> becomes <et>-st</et>.`,
  us: msg`<et>-us</et> takes <et>-t</et>.`,
  long: msg`A one-syllable word ending in a long vowel takes <et>-d</et>.`,
} as const;

const SLOTS = {
  nominative: { id: "nominative", label: msg`The nominative` },
  genitive: { id: "genitive", label: msg`The genitive` },
  partitive: { id: "partitive", label: msg`The partitive` },
} satisfies Record<string, DrillOption>;

const asciiId = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z]/g, "");

const onGenitive = (first: First) => {
  const forms = formsOf(first);
  return msg`<et>${forms[1]}</et> is the genitive of <et>${forms[0]}</et>, and the ending goes on it.`;
};

const translated = (
  id: string,
  first: First,
  said: string,
  also: readonly string[],
  prompt: MessageDescriptor,
): SentenceDrill => ({
  kind: "translate",
  id: `say-${id}`,
  rule: "genitive",
  prompt,
  answers: [said, ...also],
  say: said,
  explain: onGenitive(first),
});

const fixed = ({ first, wrong }: (typeof POHIVORMID_FIX)[number]): FixDrill => {
  const entry = nounEntry(formsOf(first));
  return {
    kind: "fix",
    id: `fix-${asciiId(first)}`,
    rule: "forms",
    wrong,
    answers: [entry],
    say: entry,
    explain: msg`A dictionary gives <et>${entry}</et>.`,
  };
};

const typedPartitive = ({ forms, pattern }: (typeof POHIVORMID_TYPED)[number]): FormDrill => ({
  kind: "form",
  id: `partitive-${asciiId(forms[0])}`,
  rule: "endings",
  base: forms[0],
  gloss: MEANS[forms[0]],
  cue: msg`Partitive`,
  answers: [forms[2]],
  say: nounEntry(forms),
  explain: ENDING_RULE[pattern],
});

const heardForm = ({ form, first, slot }: (typeof POHIVORMID_HEARD)[number]): ChoiceDrill => {
  const entry = nounEntry(formsOf(first));
  return {
    kind: "choice",
    id: `which-${asciiId(form)}`,
    rule: "which",
    say: form,
    answer: SLOTS[slot],
    wrong: (["nominative", "genitive", "partitive"] as const)
      .filter((each) => each !== slot)
      .map((each) => SLOTS[each]),
    explain: msg`A dictionary gives <et>${entry}</et>.`,
  };
};

export const DRILLS: DrillBank = {
  rules: {
    forms: { label: msg`A noun’s three forms`, section: "three" },
    genitive: { label: msg`-s and -l on the genitive`, section: "say-it" },
    which: { label: msg`Telling the genitive from the partitive`, section: "tell" },
    endings: { label: msg`Endings that tell you the partitive`, section: "endings" },
  },
  items: [
    ...POHIVORMID_SAY.map(({ id, said, also }) =>
      translated(id, SAY_FIRST[id], said, also, SAY_MEANS[id]),
    ),
    ...POHIVORMID_DRILL.map(({ first, said, also }) =>
      translated(asciiId(said), first, said, also, DRILL_MEANS[said]),
    ),
    ...POHIVORMID_FIX.map(fixed),
    ...POHIVORMID_TYPED.map(typedPartitive),
    ...POHIVORMID_HEARD.map(heardForm),
  ],
};
