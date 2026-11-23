import { msg } from "@lingui/core/macro";
import { STEM_FIX, STEM_SAID_ALSO, STEM_WORDS, type StemKind } from "../../../lib/learn/clips";
import type {
  ChoiceDrill,
  DrillBank,
  FixDrill,
  FormDrill,
  SentenceDrill,
} from "../../../lib/learn/drill";

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

const SAID_MEANS = {
  "Ema on poes.": msg`Mum is at the shop.`,
  "Ta on toas.": msg`He or she is in the room.`,
  "Me ujume jões.": msg`We swim in the river.`,
  "Raamat on laual.": msg`The book is on the table.`,
  "Nad on turul.": msg`They’re at the market.`,
  "Kohv on aknal.": msg`The coffee is on the windowsill.`,
  "Ta õpib koolis.": msg`He or she studies at school.`,
  "Pilt on raamatus.": msg`The picture is in the book.`,
  "Jaan on uksel.": msg`Jaan is at the door.`,
  "Ma elan Tallinnas.": msg`I live in Tallinn.`,
  "Pilt on seinal.": msg`The picture is on the wall.`,
  "Me oleme kohvikus.": msg`We’re in a café.`,
  "Ta töötab kodus.": msg`He or she works at home.`,
  "Mari töötab haiglas.": msg`Mari works in a hospital.`,
  "Nad õpivad Tartus.": msg`They study in Tartu.`,
  "Ma olen tööl.": msg`I’m at work.`,
  "Jaan elab Pärnus.": msg`Jaan lives in Pärnu.`,
  "Ma elan Soomes.": msg`I live in Finland.`,
} satisfies Record<Noun["said"], ReturnType<typeof msg>>;

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

const translated = (noun: Noun): SentenceDrill => ({
  kind: "translate",
  id: `say-${asciiId(noun.word)}`,
  rule: noun.kind,
  prompt: SAID_MEANS[noun.said],
  answers: [noun.said, ...STEM_SAID_ALSO[noun.said]],
  say: noun.said,
  explain: rule(noun),
});

const heardSentence = (noun: Noun): SentenceDrill => ({
  kind: "dictation",
  id: `write-${asciiId(noun.word)}`,
  rule: noun.kind,
  answers: [noun.said],
  say: noun.said,
  explain: rule(noun),
});

const fixed = ({ word, wrong }: (typeof STEM_FIX)[number]): FixDrill => {
  const noun = STEM_WORDS.find((each) => each.word === word) as Noun;
  return {
    kind: "fix",
    id: `fix-${asciiId(noun.word)}`,
    rule: noun.kind,
    wrong,
    answers: [noun.said],
    say: noun.said,
    explain: rule(noun),
  };
};

export const DRILLS: DrillBank = {
  rules: {
    inside: { label: msg`Stems where a letter inside drops or changes`, section: "inside" },
    vowel: { label: msg`Stems that gain a vowel`, section: "vowel" },
    same: { label: msg`Stems like the word itself`, section: "same" },
  },
  items: [
    ...STEM_WORDS.map(typedForm),
    ...ofKind("inside").map(typedStem),
    ...ofKind("vowel").map(typedStem),
    ...ofKind("inside").map(heardWord),
    ...ofKind("same").map(pickedForm),
    ...ofKind("inside").map(translated),
    ...ofKind("vowel").map(translated),
    ...ofKind("same").map(heardSentence),
    ...STEM_FIX.map(fixed),
  ],
};
