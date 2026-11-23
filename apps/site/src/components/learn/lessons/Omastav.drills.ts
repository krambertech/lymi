import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import {
  OMASTAV_FIX,
  OMASTAV_PHRASES,
  OMASTAV_SAID_ALSO,
  OMASTAV_SAY,
  OMASTAV_WHOSE,
  phraseOf,
} from "../../../lib/learn/clips";
import type {
  ChoiceDrill,
  DrillBank,
  DrillOption,
  FixDrill,
  FormDrill,
  SentenceDrill,
} from "../../../lib/learn/drill";

const WHOSE_MEANS: Record<(typeof OMASTAV_WHOSE)[number]["said"], MessageDescriptor> = {
  "See on minu raamat.": msg`This is my book.`,
  "Mu nimi on Kati.": msg`My name is Kati.`,
  "See on sinu kohv.": msg`This is your coffee. To one person.`,
  "Kas see on su kass?": msg`Is this your cat? To one person.`,
  "Tema raamat on laual.": msg`His or her book is on the table.`,
  "Tema vend töötab haiglas.": msg`His or her brother works in a hospital.`,
  "Meie kool on Tartus.": msg`Our school is in Tartu.`,
  "Meie ema on õpetaja.": msg`Our mother is a teacher.`,
  "Kas see on teie kohvik?": msg`Is this your café? To more than one, or polite.`,
  "Teie kass on kodus.": msg`Your cat is at home. To more than one, or polite.`,
  "Nende kontor on Tallinnas.": msg`Their office is in Tallinn.`,
  "See on nende pilt.": msg`This is their picture.`,
};

const SAY_MEANS: Record<(typeof OMASTAV_SAY)[number]["id"], MessageDescriptor> = {
  jaani: msg`This is Jaan’s book.`,
  kelle: msg`Whose coffee is this?`,
  vend: msg`My brother lives in Tallinn.`,
  nende: msg`Their cat is at home.`,
  mari: msg`Mari’s café is in Tartu.`,
  opetaja: msg`Our teacher’s name is Kati.`,
};

const PHRASE_MEANS: Record<string, MessageDescriptor> = {
  "kooli uks": msg`the school door`,
  "kohviku nimi": msg`the café’s name`,
  "kontori aken": msg`the office window`,
  "Tallinna turg": msg`the Tallinn market`,
  "poe uks": msg`the shop door`,
  "toa aken": msg`the room’s window`,
  "turu kohvik": msg`the market café`,
  "jõe nimi": msg`the river’s name`,
};

const WORD_MEANS: Record<string, MessageDescriptor> = {
  kool: msg`school`,
  kohvik: msg`café`,
  kontor: msg`office`,
  Tallinn: msg`Tallinn`,
  pood: msg`shop`,
  tuba: msg`room`,
  turg: msg`market`,
  jõgi: msg`river`,
};

const PRONOUN = msg`To say whose, use the pronoun’s genitive: <et>minu, sinu, tema, meie, teie, nende</et>.`;
const OWNER = msg`The owner goes first, in the genitive.`;

const FIX_WHY: Record<(typeof OMASTAV_FIX)[number]["id"], MessageDescriptor> = {
  minu: msg`The name belongs to the speaker, so my: <et>minu</et>.`,
  mina: msg`The speaker does the living, so I: <et>mina</et>.`,
  nende: msg`The cat is theirs, so their: <et>nende</et>.`,
  jaani: msg`The owner goes first in the genitive: <et>Jaani kass</et>.`,
  poe: msg`The shop owns the door, so the genitive: <et>poe uks</et>.`,
  tallinnas: msg`To say in Tallinn, put <et>-s</et> on the genitive: <et>Tallinnas</et>.`,
};

const WHO_SAID = [
  { said: "Mina elan Tartus.", also: ["Ma elan Tartus."], means: msg`I live in Tartu.` },
  {
    said: "Minu nimi on Mari.",
    also: ["Mu nimi on Mari."],
    means: msg({ message: "My name is Mari.", context: "genitive lesson" }),
  },
] as const;

const WHOSE_WHERE = {
  whose: { id: "whose", label: msg`Whose` },
  where: { id: "where", label: msg`Where` },
} satisfies Record<string, DrillOption>;

const HEARD_FORMS = [
  { form: "raamatu", which: "whose" },
  { form: "raamatus", which: "where" },
  { form: "poe", which: "whose" },
  { form: "poes", which: "where" },
] as const;

const asciiId = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z]/g, "");

const whose = ({ said }: (typeof OMASTAV_WHOSE)[number]): SentenceDrill => ({
  kind: "translate",
  id: `whose-${asciiId(said)}`,
  rule: "pronoun",
  prompt: WHOSE_MEANS[said],
  answers: [said, ...OMASTAV_SAID_ALSO[said]],
  say: said,
  explain: PRONOUN,
});

const owned = ({ id, said, also }: (typeof OMASTAV_SAY)[number]): SentenceDrill => ({
  kind: "translate",
  id: `say-${id}`,
  rule: "owner",
  prompt: SAY_MEANS[id],
  answers: [said, ...also],
  say: said,
  explain: OWNER,
});

const FIX_MEANS: Record<(typeof OMASTAV_FIX)[number]["id"], MessageDescriptor> = {
  minu: msg`My name is Kati.`,
  mina: msg`I live in Tartu.`,
  nende: msg`Their cat is in Pärnu.`,
  jaani: msg`Jaan’s cat is at home.`,
  poe: msg`This is the shop’s door.`,
  tallinnas: msg`I live in Tallinn.`,
};

const fixed = ({ id, rule, wrong, right, also }: (typeof OMASTAV_FIX)[number]): FixDrill => ({
  kind: "fix",
  id: `fix-${id}`,
  rule,
  wrong,
  prompt: FIX_MEANS[id],
  answers: [right, ...also],
  say: right,
  explain: FIX_WHY[id],
});

const phrase = (each: (typeof OMASTAV_PHRASES)[number]): FormDrill => ({
  kind: "form",
  id: `genitive-${asciiId(each.word)}`,
  rule: "owner",
  base: each.word,
  gloss: WORD_MEANS[each.word] as MessageDescriptor,
  cue: PHRASE_MEANS[phraseOf(each)] as MessageDescriptor,
  answers: [each.whose],
  say: phraseOf(each),
  explain: msg`<et>${each.where}</et> without its ending is the genitive: <et>${each.whose}</et>.`,
});

const who = ({ said, also, means }: (typeof WHO_SAID)[number]): SentenceDrill => ({
  kind: "translate",
  id: `who-${asciiId(said)}`,
  rule: "who",
  prompt: means,
  answers: [said, ...also],
  say: said,
  explain: msg`<et>Mina</et> is I, the one who does something; <et>minu</et> is my.`,
});

const heardForm = ({ form, which }: (typeof HEARD_FORMS)[number]): ChoiceDrill => ({
  kind: "choice",
  id: `hear-${asciiId(form)}`,
  rule: "place",
  say: form,
  answer: WHOSE_WHERE[which],
  wrong: [WHOSE_WHERE[which === "whose" ? "where" : "whose"]],
  explain:
    which === "whose"
      ? msg`<et>${form}</et> is the genitive: it says whose.`
      : msg`<et>${form}</et> has <et>-s</et> on the genitive: it says where.`,
});

export const DRILLS: DrillBank = {
  rules: {
    pronoun: { label: msg`My, your and their`, section: "my-your" },
    owner: { label: msg`The owner comes first`, section: "owner" },
    who: { label: msg`Who or whose`, section: "who-or-whose" },
    place: { label: msg`Whose or where`, section: "whose-or-where" },
  },
  items: [
    ...OMASTAV_WHOSE.map(whose),
    ...OMASTAV_SAY.map(owned),
    ...OMASTAV_FIX.map(fixed),
    ...OMASTAV_PHRASES.map(phrase),
    ...WHO_SAID.map(who),
    ...HEARD_FORMS.map(heardForm),
  ],
};
