import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import {
  GOING_DRILL,
  GOING_FIX,
  GOING_FORMS,
  GOING_SAY,
  goingFormSaid,
} from "../../../lib/learn/clips";
import type { DrillBank, FixDrill, FormDrill, SentenceDrill } from "../../../lib/learn/drill";

const MA = msg`Going or coming to do it, after <et>lähen</et> or <et>tule</et>: the -ma infinitive, <et>lähen ujuma, tule sööma</et>.`;
const MAS = msg`Out doing it, after <et>olen</et> or <et>käin</et>: the -mas form, <et>olen ujumas</et>.`;
const MAST = msg`Coming back from it: the -mast form, <et>tulen ujumast</et>.`;
const WHY = { ma: MA, mas: MAS, mast: MAST };
type Rule = keyof typeof WHY;

const SAY_MEANS: Record<(typeof GOING_SAY)[number]["id"], MessageDescriptor> = {
  ujuma: msg`I’m going swimming.`,
  ujumas: msg`Mari is out swimming.`,
  jooksmast: msg`Dad is coming back from his run.`,
  kain: msg`I go swimming every day.`,
  sooma: msg`We’re going off to eat.`,
  tuled: msg`Are you coming back from swimming?`,
};

const SAY_RULE: Record<(typeof GOING_SAY)[number]["id"], Rule> = {
  ujuma: "ma",
  ujumas: "mas",
  jooksmast: "mast",
  kain: "mas",
  sooma: "ma",
  tuled: "mast",
};

const DRILL_MEANS: Record<(typeof GOING_DRILL)[number]["id"], MessageDescriptor> = {
  jooksma: msg`She’s going for a run.`,
  tule: msg`Come and eat! To one person.`,
  joomas: msg`Mum is out having coffee.`,
  kaivad: msg`They go running every day.`,
  ujumast: msg`I’m coming back from swimming.`,
  soomast: msg`Kati is coming back from eating.`,
};

const FIX_MEANS: Record<(typeof GOING_FIX)[number]["id"], MessageDescriptor> = {
  ujuma: msg`I’m going swimming.`,
  ujumas: msg`Mari is out swimming.`,
  jooksmast: msg`Dad is coming back from his run.`,
  kain: msg`I go swimming every day.`,
  sooma: msg`The cat is going off to eat.`,
  soomast: msg`We’re coming back from eating.`,
};

const FIX_RULE: Record<(typeof GOING_FIX)[number]["id"], Rule> = {
  ujuma: "ma",
  ujumas: "mas",
  jooksmast: "mast",
  kain: "mas",
  sooma: "ma",
  soomast: "mast",
};

const BASE_MEANS: Record<(typeof GOING_FORMS)[number]["base"], MessageDescriptor> = {
  sööma: msg`to eat`,
  ujuma: msg`to swim`,
  jooksma: msg`to run`,
};

const sentence = (
  id: string,
  rule: Rule,
  prompt: MessageDescriptor,
  said: string,
  also: readonly string[],
): SentenceDrill => ({
  kind: "translate",
  id: `say-${id}`,
  rule,
  prompt,
  answers: [said, ...also],
  say: said,
  explain: WHY[rule],
});

const fixed = ({ id, wrong, right }: (typeof GOING_FIX)[number]): FixDrill => ({
  kind: "fix",
  id: `fix-${id}`,
  rule: FIX_RULE[id],
  wrong,
  prompt: FIX_MEANS[id],
  answers: [right],
  say: right,
  explain: WHY[FIX_RULE[id]],
});

const FORM_CUES: Partial<Record<(typeof GOING_FORMS)[number]["id"], MessageDescriptor>> = {
  ema: msg`Back from swimming: Ema tuleb …`,
  nad: msg`Back from eating: Nad tulevad …`,
};

const formed = (item: (typeof GOING_FORMS)[number]): FormDrill => ({
  kind: "form",
  id: `form-${item.id}`,
  rule: item.rule,
  base: item.base,
  gloss: BASE_MEANS[item.base],
  cue: FORM_CUES[item.id] ?? { et: `${item.before}…${item.after === "." ? "" : item.after}` },
  answers: [item.answer],
  say: goingFormSaid(item),
  explain: WHY[item.rule],
});

export const DRILLS: DrillBank = {
  rules: {
    ma: { label: msg`Setting off to do it`, section: "three-ways" },
    mas: { label: msg`Out doing it`, section: "three-ways" },
    mast: { label: msg`Coming back from it`, section: "three-ways" },
  },
  items: [
    ...GOING_SAY.map(({ id, said, also }) => sentence(id, SAY_RULE[id], SAY_MEANS[id], said, also)),
    ...GOING_DRILL.map(({ id, rule, said, also }) =>
      sentence(`more-${id}`, rule, DRILL_MEANS[id], said, also),
    ),
    ...GOING_FIX.map(fixed),
    ...GOING_FORMS.map(formed),
  ],
};
