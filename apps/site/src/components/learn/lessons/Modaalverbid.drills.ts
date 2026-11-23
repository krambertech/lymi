import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import {
  MODAL_DRILL,
  MODAL_FIX,
  MODAL_FORMS,
  MODAL_SAY,
  modalFormSaid,
} from "../../../lib/learn/clips";
import type { DrillBank, FixDrill, FormDrill, SentenceDrill } from "../../../lib/learn/drill";

const SKILL = msg`<et>Oskan</et> is for what you know how to do; <et>saan</et> usually says nothing stops you. Both take the -da infinitive.`;
const ALLOWED = msg`<et>Võin</et> and <et>tohin</et> say it’s allowed, and <et>ei tohi</et> says it isn’t. All take the -da infinitive.`;
const MUST = msg`<et>Pean</et> and <et>ei pea</et> take the -ma infinitive; <et>mul on vaja</et>, and <et>tuleb</et> meaning has to, take the -da infinitive.`;
const WHY = { skill: SKILL, allowed: ALLOWED, must: MUST };
const OFFER = msg`<et>Võin</et> also offers: <et>Ma võin sind oodata.</et> It takes the -da infinitive.`;
type Rule = keyof typeof WHY;

const SAY_MEANS: Record<(typeof MODAL_SAY)[number]["id"], MessageDescriptor> = {
  oskan: msg`I can speak Estonian.`,
  "ei-saa": msg`I can’t come today.`,
  void: msg`You may wait here.`,
  "ei-tohi": msg`You mustn’t eat here.`,
  pean: msg`I have to work tomorrow.`,
  "ei-pea": msg`You don’t have to come tomorrow.`,
};

const SAY_RULE: Record<(typeof MODAL_SAY)[number]["id"], Rule> = {
  oskan: "skill",
  "ei-saa": "skill",
  void: "allowed",
  "ei-tohi": "allowed",
  pean: "must",
  "ei-pea": "must",
};

const DRILL_MEANS: Record<(typeof MODAL_DRILL)[number]["id"], MessageDescriptor> = {
  oskab: msg`She can swim well.`,
  saad: msg`Can you come tomorrow?`,
  tohin: msg`May I sit here?`,
  voin: msg`I can wait for you.`,
  "ei-pea": msg`You don’t have to swim.`,
  pean: msg`I have to go.`,
};

const FIX_MEANS: Record<(typeof MODAL_FIX)[number]["id"], MessageDescriptor> = {
  saan: msg`I can come tomorrow.`,
  oskab: msg`My brother knows Estonian.`,
  tootama: msg`I have to work tomorrow.`,
  minna: msg`I need to go.`,
  ujuda: msg`You mustn’t swim here.`,
  tulema: msg`You don’t have to come.`,
};

const FIX_RULE: Record<(typeof MODAL_FIX)[number]["id"], Rule> = {
  saan: "skill",
  oskab: "skill",
  tootama: "must",
  minna: "must",
  ujuda: "allowed",
  tulema: "must",
};

const BASE_MEANS: Record<(typeof MODAL_FORMS)[number]["base"], MessageDescriptor> = {
  lugema: msg`to read`,
  ujuma: msg`to swim`,
  istuma: msg`to sit`,
  ootama: msg`to wait`,
  tulema: msg`to come`,
  minema: msg`to go`,
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
  explain: id === "more-voin" ? OFFER : WHY[rule],
});

const fixed = ({ id, wrong, right, also }: (typeof MODAL_FIX)[number]): FixDrill => ({
  kind: "fix",
  id: `fix-${id}`,
  rule: FIX_RULE[id],
  wrong,
  prompt: FIX_MEANS[id],
  answers: [right, ...also],
  say: right,
  explain: WHY[FIX_RULE[id]],
});

const formed = (item: (typeof MODAL_FORMS)[number]): FormDrill => ({
  kind: "form",
  id: `form-${item.id}`,
  rule: item.rule,
  base: item.base,
  gloss: BASE_MEANS[item.base],
  cue: { et: `${item.before}…${item.after === "." ? "" : item.after}` },
  answers: [item.answer],
  say: modalFormSaid(item),
  explain: WHY[item.rule],
});

export const DRILLS: DrillBank = {
  rules: {
    skill: { label: msg`Can: knowing how or able to`, section: "oskan-saan" },
    allowed: { label: msg`May and mustn’t`, section: "voin-tohin" },
    must: { label: msg`Have to and don’t have to`, section: "pean" },
  },
  items: [
    ...MODAL_SAY.map(({ id, said, also }) => sentence(id, SAY_RULE[id], SAY_MEANS[id], said, also)),
    ...MODAL_DRILL.map(({ id, rule, said, also }) =>
      sentence(`more-${id}`, rule, DRILL_MEANS[id], said, also),
    ),
    ...MODAL_FIX.map(fixed),
    ...MODAL_FORMS.map(formed),
  ],
};
