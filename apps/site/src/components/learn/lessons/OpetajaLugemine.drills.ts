import { msg } from "@lingui/core/macro";
import { AGENT_ANSWERS, AGENT_FIX_ANSWERS } from "../../../lib/learn/clips";
import type { ChoiceDrill, DrillBank, FormDrill } from "../../../lib/learn/drill";

const JA = msg`For the person, usually drop <et>-ma</et> and add <et>-ja</et>.`;
const MINE = msg`For the doing, usually drop <et>-ma</et> and add <et>-mine</et>.`;
const TELL = msg`<et>-ma</et> is the verb itself, as a dictionary lists it.`;

const make = (
  id: string,
  rule: "ja" | "mine",
  verb: string,
  gloss: FormDrill["gloss"],
  answer: string,
): FormDrill => ({
  kind: "form",
  id,
  rule,
  base: verb,
  gloss,
  cue: rule === "ja" ? msg`who does it` : msg`the doing`,
  answers: [answer],
  say: answer,
  explain: rule === "ja" ? JA : MINE,
});

const LABELS = {
  laul: { ja: msg`a singer`, mine: msg`singing`, ma: msg`to sing` },
  luge: { ja: msg`a reader`, mine: msg`reading`, ma: msg`to read` },
  ost: { ja: msg`a buyer`, mine: msg`buying`, ma: msg`to buy` },
} as const;
type Kind = "ja" | "mine" | "ma";

const hear = (id: string, group: keyof typeof LABELS, kind: Kind, say: string): ChoiceDrill => ({
  kind: "choice",
  id,
  rule: "tell",
  say,
  answer: { id: kind, label: LABELS[group][kind] },
  wrong: (["ja", "mine", "ma"] as const)
    .filter((each) => each !== kind)
    .map((each) => ({ id: each, label: LABELS[group][each] })),
  explain: kind === "ja" ? JA : kind === "mine" ? MINE : TELL,
});

export const DRILLS: DrillBank = {
  rules: {
    ja: { label: msg`The person: <et>-ja</et>`, section: "who" },
    mine: { label: msg`The doing: <et>-mine</et>`, section: "doing" },
    use: { label: msg`Their case in a sentence`, section: "write" },
    tell: { label: msg`Person, doing or verb`, section: "hear" },
  },
  items: [
    hear("hear-laulja", "laul", "ja", "laulja"),
    hear("hear-lugeja", "luge", "ja", "lugeja"),
    hear("hear-laulmine", "laul", "mine", "laulmine"),
    hear("hear-ostmine", "ost", "mine", "ostmine"),
    hear("hear-laulma", "laul", "ma", "laulma"),
    hear("hear-lugemine", "luge", "mine", "lugemine"),
    hear("hear-ostma", "ost", "ma", "ostma"),
    make("make-opetaja", "ja", "õpetama", msg`to teach`, "õpetaja"),
    make("make-muuja", "ja", "müüma", msg`to sell`, "müüja"),
    make("make-jooksja", "ja", "jooksma", msg`to run`, "jooksja"),
    make("make-kuulaja", "ja", "kuulama", msg`to listen`, "kuulaja"),
    {
      kind: "translate",
      id: "write-sister",
      rule: "ja",
      prompt: msg`My sister is a teacher.`,
      answers: AGENT_ANSWERS["Mu õde on õpetaja."] as readonly [string, ...string[]],
      say: "Mu õde on õpetaja.",
      explain: JA,
    },
    {
      kind: "translate",
      id: "write-buyer",
      rule: "ja",
      prompt: msg`The buyer paid in cash.`,
      answers: AGENT_ANSWERS["Ostja maksis sularahas."] as readonly [string, ...string[]],
      say: "Ostja maksis sularahas.",
      explain: JA,
    },

    make("make-ujumine", "mine", "ujuma", msg`to swim`, "ujumine"),
    make("make-suitsetamine", "mine", "suitsetama", msg`to smoke`, "suitsetamine"),
    make("make-parkimine", "mine", "parkima", msg`to park`, "parkimine"),
    make("make-oppimine", "mine", "õppima", msg`to learn`, "õppimine"),
    {
      kind: "translate",
      id: "write-smoking",
      rule: "mine",
      prompt: msg`Smoking is not allowed here.`,
      answers: AGENT_ANSWERS["Suitsetamine on siin keelatud."] as readonly [string, ...string[]],
      say: "Suitsetamine on siin keelatud.",
      explain: MINE,
    },
    {
      kind: "fix",
      id: "fix-parkimine",
      rule: "mine",
      wrong: "Siin on parkima keelatud.",
      answers: AGENT_FIX_ANSWERS["Siin on parkimine keelatud."] as readonly [string, ...string[]],
      say: "Siin on parkimine keelatud.",
      explain: msg`Use the noun <et>parkimine</et> or the -da infinitive <et>parkida</et>.`,
    },

    {
      kind: "translate",
      id: "write-reading",
      rule: "use",
      prompt: msg`I like reading.`,
      answers: AGENT_ANSWERS["Mulle meeldib lugemine."] as readonly [string, ...string[]],
      say: "Mulle meeldib lugemine.",
      explain: msg`With <et>meeldima</et>, what you like is the subject: <et>lugemine</et>.`,
    },
    {
      kind: "translate",
      id: "write-learning",
      rule: "use",
      prompt: msg`Learning Estonian takes time.`,
      answers: AGENT_ANSWERS["Eesti keele õppimine võtab aega."] as readonly [string, ...string[]],
      say: "Eesti keele õppimine võtab aega.",
      explain: msg`What is learnt usually goes in the genitive first: <et>eesti keele õppimine</et>.`,
    },
    {
      kind: "fix",
      id: "fix-lugemine",
      rule: "use",
      wrong: "Mulle meeldib lugemist.",
      answers: AGENT_FIX_ANSWERS["Mulle meeldib lugemine."] as readonly [string, ...string[]],
      say: "Mulle meeldib lugemine.",
      explain: msg`With <et>meeldima</et>, what you like is the subject: <et>lugemine</et>.`,
    },
    {
      kind: "fix",
      id: "fix-ujumist",
      rule: "use",
      wrong: "Ma armastan ujumine.",
      answers: AGENT_FIX_ANSWERS["Ma armastan ujumist."] as readonly [string, ...string[]],
      say: "Ma armastan ujumist.",
      explain: msg`<et>Armastama</et> takes the partitive: <et>ujumist</et>.`,
    },
    {
      kind: "fix",
      id: "fix-muujana",
      rule: "use",
      wrong: "Ta töötab müüja.",
      answers: AGENT_FIX_ANSWERS["Ta töötab müüjana."] as readonly [string, ...string[]],
      say: "Ta töötab müüjana.",
      explain: msg`You work as something: <et>müüjana</et>.`,
    },
    {
      kind: "fix",
      id: "fix-opetajad",
      rule: "use",
      wrong: "Kõik õpetajat olid koosolekul.",
      answers: AGENT_FIX_ANSWERS["Kõik õpetajad olid koosolekul."] as readonly [
        string,
        ...string[],
      ],
      say: "Kõik õpetajad olid koosolekul.",
      explain: msg`Here the subject is plural and ends in <et>-d</et>: <et>õpetajad</et>.`,
    },
    {
      kind: "dictation",
      id: "dictate-love-reading",
      rule: "use",
      answers: ["Ma armastan lugemist."],
      say: "Ma armastan lugemist.",
      explain: msg`<et>Armastama</et> takes the partitive: <et>lugemist</et>.`,
    },
    {
      kind: "dictation",
      id: "dictate-listeners",
      rule: "ja",
      answers: ["Kuulajad plaksutasid."],
      say: "Kuulajad plaksutasid.",
      explain: msg`<et>Kuulama</et>, to listen, gives <et>kuulaja</et>; the plural is <et>kuulajad</et>.`,
    },
    {
      kind: "dictation",
      id: "dictate-seller",
      rule: "ja",
      answers: ["Müüja aitas mind."],
      say: "Müüja aitas mind.",
      explain: JA,
    },
    {
      kind: "dictation",
      id: "dictate-singer",
      rule: "ja",
      answers: ["Laulja laulis kolm laulu."],
      say: "Laulja laulis kolm laulu.",
      explain: JA,
    },
    {
      kind: "dictation",
      id: "dictate-learning",
      rule: "mine",
      answers: ["Õppimine on raske."],
      say: "Õppimine on raske.",
      explain: MINE,
    },
    {
      kind: "dictation",
      id: "dictate-swimming",
      rule: "mine",
      answers: ["Ujumine on tervisele hea."],
      say: "Ujumine on tervisele hea.",
      explain: MINE,
    },
  ],
};
