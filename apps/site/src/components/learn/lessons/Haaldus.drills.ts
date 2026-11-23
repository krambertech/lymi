import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { type ApartKind, apartSaid, clipId, HAALDUS_APART } from "../../../lib/learn/clips";
import type { ChoiceDrill, DrillBank, DrillOption, SentenceDrill } from "../../../lib/learn/drill";

const MEANS = {
  kõrv: msg`ear`,
  korv: msg`basket`,
  üks: msg`one`,
  uks: msg`door`,
  säng: msg`bed`,
  sang: msg`bucket handle`,
  tüli: msg`a quarrel`,
  tuli: msg`fire`,
  sada: msg`a hundred`,
  saada: msg`send!`,
  koli: msg`junk`,
  kooli: msg`to school`,
  kana: msg`a hen`,
  kanna: msg`carry!`,
  lina: msg`linen`,
  linna: msg`into town`,
  tule: msg`come!`,
  tuule: msg`of the wind`,
} satisfies Record<string, MessageDescriptor>;

type Known = keyof typeof MEANS;

const VOWEL_PAIRS = [
  ["kõrv", "korv"],
  ["üks", "uks"],
  ["säng", "sang"],
  ["tüli", "tuli"],
] as const satisfies readonly (readonly [Known, Known])[];

const LENGTH_PAIRS = [
  ["sada", "saada"],
  ["koli", "kooli"],
  ["kana", "kanna"],
  ["lina", "linna"],
  ["tule", "tuule"],
] as const satisfies readonly (readonly [Known, Known])[];

const option = (word: Known): DrillOption => ({ id: word, label: { et: word }, sub: MEANS[word] });

const heardVowel = (word: Known, other: Known): ChoiceDrill => ({
  kind: "choice",
  id: `hear-${clipId(word)}`,
  rule: "vowel",
  say: word,
  answer: option(word),
  wrong: [option(other)],
  explain: msg`It was <et>${word}</et>; <et>${other}</et> is another word.`,
});

const written = (rule: string, word: Known, other: Known): SentenceDrill => ({
  kind: "dictation",
  word: true,
  id: `write-${clipId(word)}`,
  rule,
  say: word,
  answers: [word],
  explain: msg`It was <et>${word}</et>; <et>${other}</et> is another word.`,
});

const APART_LABELS: Record<ApartKind, MessageDescriptor> = {
  same: msg`The same word twice`,
  vowel: msg`A different vowel`,
  length: msg`A different length`,
};

const APART_WHY: Record<ApartKind, MessageDescriptor> = {
  same: msg`The same word, said twice.`,
  vowel: msg`One vowel changes, and the word with it.`,
  length: msg`One sound is held longer, and that makes another word.`,
};

const apart = (each: (typeof HAALDUS_APART)[number]): ChoiceDrill => {
  const say = apartSaid(each);
  const others = (["same", "vowel", "length"] as const).filter((kind) => kind !== each.kind);
  return {
    kind: "choice",
    id: `apart-${clipId(say)}`,
    rule: "apart",
    say,
    answer: { id: each.kind, label: APART_LABELS[each.kind] },
    wrong: others.map((kind) => ({ id: kind, label: APART_LABELS[kind] })),
    explain: APART_WHY[each.kind],
  };
};

export const DRILLS: DrillBank = {
  rules: {
    vowel: { label: msg`Vowels with marks`, section: "pairs" },
    length: { label: msg`One letter or two`, section: "write-length" },
    apart: { label: msg`Vowel or length`, section: "apart" },
  },
  items: [
    ...VOWEL_PAIRS.flatMap(([a, b]) => [heardVowel(a, b), heardVowel(b, a)]),
    ...VOWEL_PAIRS.map(([a, b]) => written("vowel", a, b)),
    ...LENGTH_PAIRS.flatMap(([a, b]) => [written("length", a, b), written("length", b, a)]),
    {
      kind: "dictation",
      id: "write-tule-linna",
      rule: "length",
      say: "Tule linna.",
      answers: ["Tule linna."],
      explain: msg`<et>Linna</et>, into town, has a double n; <et>lina</et> is linen.`,
    },
    {
      kind: "dictation",
      id: "write-kanna-korv",
      rule: "length",
      say: "Kanna korv kooli.",
      answers: ["Kanna korv kooli."],
      explain: msg`Double n in <et>kanna</et>, carry, and double o in <et>kooli</et>, to school.`,
    },
    ...HAALDUS_APART.map(apart),
  ],
};
