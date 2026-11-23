import { msg } from "@lingui/core/macro";
import { STEM_WORDS, type StemKind } from "../../../lib/learn/clips";
import type { ChoiceDrill, DrillBank, FormDrill } from "../../../lib/learn/drill";

type Noun = (typeof STEM_WORDS)[number];

const WORD_MEANS = {
  pood: msg`shop`,
  tuba: msg`room`,
  jõgi: msg`river`,
  laud: msg`table`,
  turg: msg`market`,
  aken: msg`window`,
  kool: msg`school`,
  raamat: msg`book`,
  uks: msg`door`,
  Tallinn: msg`Tallinn, the capital`,
  sein: msg`wall`,
  kohvik: msg`café`,
  kodu: msg`home`,
  haigla: msg`hospital`,
  Tartu: msg`Tartu, a university town`,
  töö: msg`work`,
  Pärnu: msg`Pärnu, a town by the sea`,
  Soome: msg`Finland`,
} satisfies Record<Noun["word"], ReturnType<typeof msg>>;

const WHERE_MEANS = {
  poes: msg`in the shop`,
  toas: msg`in the room`,
  jões: msg`in the river`,
  laual: msg`on the table`,
  turul: msg`at the market`,
  aknal: msg`on the windowsill`,
  koolis: msg`at school, in a school`,
  raamatus: msg`in the book`,
  uksel: msg`at the door`,
  Tallinnas: msg`in Tallinn`,
  seinal: msg`on the wall`,
  kohvikus: msg`in a café`,
  kodus: msg`at home`,
  haiglas: msg`in a hospital`,
  Tartus: msg`in Tartu`,
  tööl: msg`at work`,
  Pärnus: msg`in Pärnu`,
  Soomes: msg`in Finland`,
} satisfies Record<Noun["where"], ReturnType<typeof msg>>;

const asciiId = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z]/g, "");

const ofKind = (kind: StemKind): readonly Noun[] => STEM_WORDS.filter((noun) => noun.kind === kind);

const rule = ({ word, stem }: Noun) =>
  msg`<et>${word}, ${stem}</et>: the ending goes on <et>${stem}</et>.`;

const typedForm = (noun: Noun): FormDrill => ({
  kind: "form",
  id: `where-${asciiId(noun.word)}`,
  rule: noun.kind,
  base: noun.word,
  gloss: WORD_MEANS[noun.word],
  cue: WHERE_MEANS[noun.where],
  answers: [noun.where],
  say: noun.said,
  explain: rule(noun),
});

const pickedForm = (noun: Noun): FormDrill => ({
  ...typedForm(noun),
  id: `pick-${asciiId(noun.word)}`,
  wrong: noun.slips,
});

const typedStem = (noun: Noun): FormDrill => ({
  kind: "form",
  id: `stem-${asciiId(noun.word)}`,
  rule: noun.kind,
  base: noun.word,
  gloss: WORD_MEANS[noun.word],
  cue: msg`the stem`,
  answers: [noun.stem],
  say: noun.stem,
  explain: msg`A dictionary gives the pair: <et>${noun.word}, ${noun.stem}</et>.`,
});

const heardWord = (noun: Noun): ChoiceDrill => {
  const sub = WORD_MEANS[noun.word];
  return {
    kind: "choice",
    id: `hear-${asciiId(noun.word)}`,
    rule: noun.kind,
    say: noun.said,
    answer: { id: noun.word, label: { et: noun.word }, sub },
    slip: { id: noun.stem, label: { et: noun.stem }, sub },
    wrong: ofKind(noun.kind).flatMap((other) =>
      other === noun
        ? []
        : [{ id: other.word, label: { et: other.word }, sub: WORD_MEANS[other.word] }],
    ),
    explain: msg`<et>${noun.where}</et> is from <et>${noun.word}, ${noun.stem}</et>.`,
  };
};

export const DRILLS: DrillBank = {
  rules: {
    inside: { label: msg`Stems where a letter inside changes`, section: "inside" },
    vowel: { label: msg`Stems that gain a vowel`, section: "vowel" },
    same: { label: msg`Stems like the word itself`, section: "same" },
  },
  items: [
    ...STEM_WORDS.map(typedForm),
    ...ofKind("inside").map(typedStem),
    ...ofKind("vowel").map(typedStem),
    ...ofKind("inside").map(heardWord),
    ...ofKind("same").map(pickedForm),
  ],
};
