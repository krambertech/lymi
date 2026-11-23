import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import {
  MITMUS_ADJECTIVES,
  MITMUS_CHANGED,
  MITMUS_FIX,
  MITMUS_SAME,
  MITMUS_SAY,
  MITMUS_SENTENCES,
  pluralSentence,
} from "../../../lib/learn/clips";
import type { DrillBank, FixDrill, FormDrill, SentenceDrill } from "../../../lib/learn/drill";

const MEANS: Record<string, MessageDescriptor> = {
  maja: msg`house`,
  auto: msg`car`,
  kass: msg`cat`,
  kool: msg`school`,
  linn: msg`town, city`,
  raamat: msg`book`,
  laps: msg`child`,
  uks: msg`door`,
  pood: msg`shop`,
  tuba: msg`room`,
  jõgi: msg`river`,
  mees: msg`man`,
  naine: msg`woman`,
  sõber: msg`friend`,
};

const SAY_MEANS: Record<(typeof MITMUS_SAY)[number]["id"], MessageDescriptor> = {
  lapsed: msg`The children are reading.`,
  kassid: msg`The cats are at home.`,
  toad: msg`The rooms are big.`,
  tootavad: msg`Mum and Dad work in Tallinn.`,
  sobrad: msg`The friends are waiting.`,
  uued: msg`The new books are on the table.`,
};

const PLURAL = msg`The plural is the genitive plus <et>-d</et>.`;
const STEM = msg`The plural keeps the genitive’s change inside.`;
const VERB = msg`With more than one person or thing, the verb takes the form of <et>nad</et>; <et>on</et> stays <et>on</et>.`;
const ADJECTIVE = msg`An adjective takes <et>-d</et> too, before the noun or after <et>on</et>.`;
const WHY = { plural: PLURAL, stem: STEM, verb: VERB, adjective: ADJECTIVE };
type Rule = keyof typeof WHY;

const SAY_RULE: Record<(typeof MITMUS_SAY)[number]["id"], Rule> = {
  lapsed: "verb",
  kassid: "plural",
  toad: "adjective",
  tootavad: "verb",
  sobrad: "stem",
  uued: "adjective",
};

const FIX_RULE: Record<(typeof MITMUS_FIX)[number]["id"], Rule> = {
  loevad: "verb",
  poed: "stem",
  tootavad: "verb",
  joovad: "verb",
  suured: "adjective",
  sobrad: "stem",
};

const asciiId = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z]/g, "");

const said = ({ id, said, also }: (typeof MITMUS_SAY)[number]): SentenceDrill => ({
  kind: "translate",
  id: `say-${id}`,
  rule: SAY_RULE[id],
  prompt: SAY_MEANS[id],
  answers: [said, ...also],
  say: said,
  explain: WHY[SAY_RULE[id]],
});

const fixed = ({ id, wrong, right }: (typeof MITMUS_FIX)[number]): FixDrill => ({
  kind: "fix",
  id: `fix-${id}`,
  rule: FIX_RULE[id],
  wrong,
  prompt: msg`It’s about more than one.`,
  answers: [right],
  say: right,
  explain: WHY[FIX_RULE[id]],
});

const many =
  (rule: Rule) =>
  (noun: { one: string; second: string; many: string }): FormDrill => ({
    kind: "form",
    id: `many-${asciiId(noun.one)}`,
    rule,
    base: noun.one,
    gloss: MEANS[noun.one] as MessageDescriptor,
    cue: msg`plural`,
    answers: [noun.many],
    say: noun.many,
    explain: msg`<et>${noun.one}, ${noun.second}</et>: the plural is <et>${noun.many}</et>.`,
  });

const rewritten = (row: (typeof MITMUS_SENTENCES)[number]): SentenceDrill => ({
  kind: "rewrite",
  id: `rewrite-${asciiId(row.one)}`,
  rule: "verb",
  from: pluralSentence(row, false),
  cue: msg`Make it many`,
  answers: [pluralSentence(row, true)],
  say: pluralSentence(row, true),
  explain: VERB,
});

const adjective = (pair: (typeof MITMUS_ADJECTIVES)[number]): SentenceDrill => ({
  kind: "rewrite",
  id: `adjective-${asciiId(pair.one)}`,
  rule: "adjective",
  from: pair.one,
  cue: msg`Make it many`,
  answers: [pair.many],
  say: pair.many,
  explain: ADJECTIVE,
});

export const DRILLS: DrillBank = {
  rules: {
    plural: { label: msg`The plural: the genitive plus -d`, section: "plural-d" },
    stem: { label: msg`Plurals that change inside`, section: "stem" },
    verb: { label: msg`The verb with many`, section: "verbs" },
    adjective: { label: msg`Adjectives with many`, section: "adjectives" },
  },
  items: [
    ...MITMUS_SAY.map(said),
    ...MITMUS_FIX.map(fixed),
    ...MITMUS_SENTENCES.map(rewritten),
    ...MITMUS_ADJECTIVES.slice(0, 4).map(adjective),
    ...MITMUS_SAME.slice(0, 4).map(many("plural")),
    ...MITMUS_CHANGED.slice(0, 4).map(many("stem")),
  ],
};
