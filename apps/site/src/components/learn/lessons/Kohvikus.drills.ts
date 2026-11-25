import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import {
  clipId,
  KOHVIKUS_FIXES,
  KOHVIKUS_HEARD,
  KOHVIKUS_MENU,
  KOHVIKUS_TRANSLATED,
} from "../../../lib/learn/clips";
import type { ChoiceDrill, DrillBank, FixDrill, SentenceDrill } from "../../../lib/learn/drill";

type Thing = (typeof KOHVIKUS_MENU)[number];
type Heard = (typeof KOHVIKUS_HEARD)[number];

const MEANS: Record<Thing, MessageDescriptor> = {
  kohv: msg`coffee`,
  tee: msg`tea`,
  vesi: msg`water`,
  mahl: msg`juice`,
  piim: msg`milk`,
  suhkur: msg`sugar`,
  kook: msg`cake`,
  saiake: msg`bun`,
  võileib: msg`sandwich`,
  supp: msg`soup`,
  arve: msg`bill`,
};

const SLIPS: Record<Heard["item"], Thing> = {
  mahl: "piim",
  piim: "mahl",
  supp: "kook",
  kook: "supp",
  vesi: "mahl",
  võileib: "saiake",
};

const option = (word: Thing) => ({ id: word, label: { et: word }, sub: MEANS[word] });

const heard = ({ item, said }: Heard): ChoiceDrill => ({
  kind: "choice",
  id: `hear-${clipId(item)}`,
  rule: "words",
  say: said,
  answer: option(item),
  slip: option(SLIPS[item]),
  wrong: KOHVIKUS_MENU.filter((each) => each !== item && each !== SLIPS[item]).map(option),
  explain: msg`The thing comes after <et>palun üks</et>: <et>${item}</et>.`,
});

const WHY: Record<string, MessageDescriptor> = {
  order: msg`You usually ask with <et>palun</et>, and the café asks <et>Siin või kaasa?</et>`,
  have: msg`You usually ask with <et>Kas teil on …?</et>, and the thing usually takes an ending after <et>on</et>.`,
  pay: msg`You usually pay <et>kaardiga</et>, by card, or <et>sularahas</et>, in cash, and ask the price with <et>Kui palju see maksab?</et>`,
};

const MEANT: readonly MessageDescriptor[] = [
  msg`A coffee, please.`,
  msg`A tea and a bun, please.`,
  msg`Here or to take away?`,
  msg`Do you have soup?`,
  msg`Do you have juice?`,
  msg`Card or cash?`,
  msg`The bill, please.`,
  msg`How much is it?`,
];

const translated = (each: (typeof KOHVIKUS_TRANSLATED)[number], i: number): SentenceDrill => ({
  kind: "translate",
  id: `translate-${clipId(each.answers[0])}`,
  rule: each.kind,
  prompt: MEANT[i] as MessageDescriptor,
  say: each.answers[0],
  answers: each.answers,
  explain: WHY[each.kind] as MessageDescriptor,
});

const fixed = ({ wrong, said, kind }: (typeof KOHVIKUS_FIXES)[number]): FixDrill => ({
  kind: "fix",
  id: `fix-${clipId(wrong)}`,
  rule: kind,
  wrong,
  say: said,
  answers: [said],
  explain: WHY[kind] as MessageDescriptor,
});

const written = (said: string, rule: string): SentenceDrill => ({
  kind: "dictation",
  id: `write-${clipId(said)}`,
  rule,
  say: said,
  answers: [said],
  explain: WHY[rule] as MessageDescriptor,
});

export const DRILLS: DrillBank = {
  rules: {
    words: { label: msg`Things on the counter`, section: "heard" },
    order: { label: msg`Ordering with <et>palun</et>`, section: "ordering" },
    have: { label: msg`Asking <et>Kas teil on …?</et>`, section: "phrases" },
    pay: { label: msg`Paying and asking the price`, section: "which" },
  },
  items: [
    ...KOHVIKUS_HEARD.map(heard),
    ...KOHVIKUS_TRANSLATED.map(translated),
    ...KOHVIKUS_FIXES.map(fixed),
    written("Palun üks mahl ja üks kook.", "order"),
    written("Siin, palun.", "order"),
    written("Kas teil on kooki?", "have"),
    written("Kas teil on vett?", "have"),
    written("Kas teil on teed?", "have"),
    written("Kaardiga, palun.", "pay"),
  ],
};
