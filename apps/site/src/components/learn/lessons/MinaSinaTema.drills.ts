import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import {
  capital,
  PRONOUN_BUILT,
  PRONOUN_SENTENCES,
  PRONOUNS,
  pronounOrders,
} from "../../../lib/learn/clips";
import type {
  ChoiceDrill,
  DrillBank,
  DrillOption,
  FormDrill,
  SentenceDrill,
} from "../../../lib/learn/drill";

type Short = (typeof PRONOUNS)[number]["short"];

const MEANS: Record<Short, MessageDescriptor> = {
  ma: msg`I`,
  sa: msg`you, to one person`,
  ta: msg`he or she`,
  me: msg`we`,
  te: msg`you, to more than one; polite you`,
  nad: msg`they`,
};

const person = (short: Short) =>
  PRONOUNS.find((each) => each.short === short) as (typeof PRONOUNS)[number];

const typed = (short: Short): FormDrill => {
  const { long, verb } = person(short);
  return {
    kind: "form",
    id: `olema-${short}`,
    rule: "olema",
    base: "olema",
    gloss: msg`to be`,
    cue: { et: long },
    answers: [verb],
    say: `${capital(short)} ${verb}`,
    explain: msg`<et>${capital(long)} ${verb}</et>; the short form is <et>${short} ${verb}</et>.`,
  };
};

const option = (short: Short): DrillOption => ({
  id: short,
  label: { et: short },
  sub: MEANS[short],
});

const WHO: readonly { id: keyof typeof PRONOUN_SENTENCES; who: Short; why: MessageDescriptor }[] = [
  { id: "s-olen-kodus", who: "ma", why: msg`<et>Olen</et> can only be I am.` },
  { id: "s-oled-tubli", who: "sa", why: msg`<et>Oled</et> can only be you are, to one person.` },
  { id: "s-ta-opetaja", who: "ta", why: msg`<et>On</et> with <et>ta</et>: he or she is.` },
  { id: "s-oleme-valmis", who: "me", why: msg`<et>Oleme</et> can only be we are.` },
  {
    id: "s-olete-tublid",
    who: "te",
    why: msg`<et>Olete</et> can only be you are, to more than one, or polite you are.`,
  },
  { id: "s-nad-kodus", who: "nad", why: msg`<et>On</et> with <et>nad</et>: they are.` },
];

const heard = ({ id, who, why }: (typeof WHO)[number]): ChoiceDrill => ({
  kind: "choice",
  id: `who-${id.slice(2)}`,
  rule: "who",
  say: PRONOUN_SENTENCES[id],
  answer: option(who),
  ...(who === "ta" ? { slip: option("nad") } : who === "nad" ? { slip: option("ta") } : {}),
  wrong: PRONOUNS.map(({ short }) => short)
    .filter(
      (short) =>
        short !== who && !(who === "ta" && short === "nad") && !(who === "nad" && short === "ta"),
    )
    .map(option),
  explain: why,
});

const DROP = msg`The ending says who, so the pronoun can go.`;

const dropped = (id: string, from: string, said: string): SentenceDrill => {
  const [verb = "", ...words] = said.slice(0, -1).split(" ");
  return {
    kind: "rewrite",
    id: `drop-${id}`,
    rule: "drop",
    from,
    cue: msg`without the pronoun`,
    say: said,
    answers: [said, `${capital(words.join(" "))} ${verb.toLowerCase()}${said.slice(-1)}`],
    explain: DROP,
  };
};

const built = (index: number): SentenceDrill => {
  const { pronoun, word, said } = PRONOUN_BUILT[index] as (typeof PRONOUN_BUILT)[number];
  const { verb } = person(pronoun);
  return {
    kind: "build",
    id: `make-${pronoun}-${word.normalize("NFD").replace(/[^a-z]/g, "")}`,
    rule: "build",
    words: [pronoun, "olema", word],
    say: said,
    answers: pronounOrders(said),
    explain: msg`<et>${capital(pronoun)}</et> takes <et>${verb}</et>.`,
  };
};

export const DRILLS: DrillBank = {
  rules: {
    olema: { label: msg`The forms of <et>olema</et>`, section: "type" },
    who: { label: msg`Who the sentence is about`, section: "who" },
    drop: { label: msg`When the pronoun can go`, section: "drop" },
    build: { label: msg`Sentences with <et>olema</et>`, section: "build" },
  },
  items: [
    ...PRONOUNS.map(({ short }) => typed(short)),
    ...WHO.map(heard),
    {
      kind: "dictation",
      id: "hear-ta-vasinud",
      rule: "who",
      say: PRONOUN_SENTENCES["s-ta-vasinud"],
      answers: [PRONOUN_SENTENCES["s-ta-vasinud"]],
      explain: msg`<et>On</et> has no ending, so <et>ta</et> usually stays.`,
    },
    {
      kind: "dictation",
      id: "hear-te-opetajad",
      rule: "who",
      say: PRONOUN_SENTENCES["s-te-opetajad"],
      answers: [PRONOUN_SENTENCES["s-te-opetajad"]],
      explain: msg`<et>Te olete</et>: you are, to more than one; <et>õpetajad</et> is more than one teacher.`,
    },
    dropped("olen-kodus", "Ma olen kodus.", PRONOUN_SENTENCES["s-olen-kodus"]),
    dropped("oleme-valmis", "Me oleme valmis.", PRONOUN_SENTENCES["s-oleme-valmis"]),
    dropped("oled-tubli", "Sa oled väga tubli.", PRONOUN_SENTENCES["s-oled-tubli"]),
    dropped("olete-tublid", "Te olete väga tublid.", PRONOUN_SENTENCES["s-olete-tublid"]),
    ...PRONOUN_BUILT.map((_, index) => index)
      .slice(6)
      .map(built),
  ],
};
