import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import {
  INFINITIVE_BUILD,
  INFINITIVE_FIX,
  INFINITIVE_GAPS,
  INFINITIVE_ORDERS,
  INFINITIVE_SAY,
  infinitiveGapSaid,
} from "../../../lib/learn/clips";
import type { DrillBank, FixDrill, FormDrill, SentenceDrill } from "../../../lib/learn/drill";

const DA = msg`After <et>tahan, võin, saan, oskan, tohin, proovin, armastan</et> and <et>mulle meeldib</et>, the -da infinitive.`;
const MA = msg`After <et>pean, hakkan, lähen, tule</et> and <et>jään</et>, the -ma infinitive.`;
const LAST = msg`Only the first verb takes a person ending. The second verb usually goes last, after words for when and where: <et>Ma pean homme tööle minema.</et>`;
const WHY = { da: DA, ma: MA, last: LAST };
const LAST_DA = msg`After <et>tahan</et> or <et>võin</et>, the -da infinitive, and it usually goes last: <et>Ma tahan homme linna minna.</et>`;
const CHANGES_FORM: readonly string[] = ["linna", "lugeda", "oodata"];
type Rule = keyof typeof WHY;

const SAY_MEANS: Record<(typeof INFINITIVE_SAY)[number]["id"], MessageDescriptor> = {
  juua: msg`I want to drink coffee.`,
  minema: msg`I have to go home.`,
  oppima: msg`I’m starting to learn Estonian.`,
  tulla: msg`I can come tomorrow.`,
  lugeda: msg`I like reading.`,
  sooma: msg`Come and eat! To one person.`,
};

const SAY_RULE: Record<(typeof INFINITIVE_SAY)[number]["id"], Rule> = {
  juua: "da",
  minema: "ma",
  oppima: "ma",
  tulla: "da",
  lugeda: "da",
  sooma: "ma",
};

const FIX_MEANS: Record<(typeof INFINITIVE_FIX)[number]["id"], MessageDescriptor> = {
  minna: msg`I want to go to town.`,
  tulema: msg`I have to come tomorrow.`,
  jooma: msg`I’m going for a coffee.`,
  raakida: msg`I can speak Estonian.`,
  oppima: msg`I’m starting to study tomorrow.`,
  lugeda: msg`I like reading.`,
};

const FIX_RULE: Record<(typeof INFINITIVE_FIX)[number]["id"], Rule> = {
  minna: "da",
  tulema: "ma",
  jooma: "ma",
  raakida: "da",
  oppima: "ma",
  lugeda: "da",
};

const said = ({ id, said, also }: (typeof INFINITIVE_SAY)[number]): SentenceDrill => ({
  kind: "translate",
  id: `say-${id}`,
  rule: SAY_RULE[id],
  prompt: SAY_MEANS[id],
  answers: [said, ...also],
  say: said,
  explain: WHY[SAY_RULE[id]],
});

const fixed = ({ id, wrong, right }: (typeof INFINITIVE_FIX)[number]): FixDrill => ({
  kind: "fix",
  id: `fix-${id}`,
  rule: FIX_RULE[id],
  wrong,
  prompt: FIX_MEANS[id],
  answers: [right],
  say: right,
  explain: WHY[FIX_RULE[id]],
});

const BASE_MEANS: Record<(typeof INFINITIVE_GAPS)[number]["id"], MessageDescriptor> = {
  juua: msg`to drink`,
  tulla: msg`to come`,
  teha: msg`to do, to make`,
  olla: msg`to be`,
  minema: msg`to go`,
  sooma: msg`to eat`,
  tegema: msg`to do, to make`,
  olema: msg`to be`,
};

const BASE: Record<(typeof INFINITIVE_GAPS)[number]["id"], string> = {
  juua: "jooma",
  tulla: "tulema",
  teha: "tegema",
  olla: "olema",
  minema: "minema",
  sooma: "sööma",
  tegema: "tegema",
  olema: "olema",
};

const formed = (item: (typeof INFINITIVE_GAPS)[number]): FormDrill => ({
  kind: "form",
  id: `form-${item.id}`,
  rule: item.takes,
  base: BASE[item.id],
  gloss: BASE_MEANS[item.id],
  cue: { et: `${item.before}…${item.after === "." ? "" : item.after}` },
  answers: [item.answer],
  say: infinitiveGapSaid(item),
  explain: WHY[item.takes],
});

const built = ({ id, words }: (typeof INFINITIVE_BUILD)[number]): SentenceDrill => ({
  kind: "build",
  id: `build-${id}`,
  rule: "last",
  words,
  answers: INFINITIVE_ORDERS[id],
  say: INFINITIVE_ORDERS[id][0],
  explain: CHANGES_FORM.includes(id) ? LAST_DA : LAST,
});

export const DRILLS: DrillBank = {
  rules: {
    da: { label: msg`The -da infinitive after a verb`, section: "da" },
    ma: { label: msg`The -ma infinitive after a verb`, section: "ma" },
    last: { label: msg`The second verb usually goes last`, section: "last" },
  },
  items: [
    ...INFINITIVE_SAY.map(said),
    ...INFINITIVE_FIX.map(fixed),
    ...INFINITIVE_GAPS.map(formed),
    ...INFINITIVE_BUILD.map(built),
  ],
};
