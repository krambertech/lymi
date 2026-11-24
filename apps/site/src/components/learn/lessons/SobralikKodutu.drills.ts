import { msg } from "@lingui/core/macro";
import { SUFFIX_ANSWERS, SUFFIX_FIX_ANSWERS } from "../../../lib/learn/clips";
import type { ChoiceDrill, DrillBank, FormDrill } from "../../../lib/learn/drill";

const LIK = msg`<et>-lik</et> makes an adjective: like it, or having it.`;
const TU = msg`<et>-tu</et> means without, and usually joins the genitive.`;
const KE = msg`<et>-ke</et> makes something small or dear, and usually joins the genitive.`;

const LABELS = {
  lik: msg`like it, having it`,
  tu: msg`without it`,
  ke: msg`a small one`,
} as const;
type Kind = keyof typeof LABELS;
const WHY: Record<Kind, typeof LIK> = { lik: LIK, tu: TU, ke: KE };

const hear = (id: string, kind: Kind, say: string): ChoiceDrill => ({
  kind: "choice",
  id,
  rule: "hear",
  say,
  answer: { id: kind, label: LABELS[kind] },
  wrong: (Object.keys(LABELS) as Kind[])
    .filter((each) => each !== kind)
    .map((each) => ({ id: each, label: LABELS[each] })),
  explain: WHY[kind],
});

const make = (
  id: string,
  kind: Kind,
  from: string,
  gloss: FormDrill["gloss"],
  answer: string,
  explain: FormDrill["explain"] = WHY[kind],
): FormDrill => ({
  kind: "form",
  id,
  rule: kind,
  base: from,
  gloss,
  cue: LABELS[kind],
  answers: [answer],
  say: answer,
  explain,
});

export const DRILLS: DrillBank = {
  rules: {
    lik: { label: msg`<et>-lik</et>: like it`, section: "endings" },
    tu: { label: msg`<et>-tu</et>: without it`, section: "endings" },
    ke: { label: msg`<et>-ke</et>: a small one`, section: "endings" },
    hear: { label: msg`Like, without or small`, section: "hear" },
  },
  items: [
    hear("hear-ohtlik", "lik", "ohtlik"),
    hear("hear-sobralik", "lik", "sõbralik"),
    hear("hear-loputu", "tu", "lõputu"),
    hear("hear-mottetu", "tu", "mõttetu"),
    hear("hear-linnake", "ke", "linnake"),
    hear("hear-poisike", "ke", "poisike"),
    make("make-sobralik", "lik", "sõber", msg`friend`, "sõbralik"),
    make("make-kohalik", "lik", "koht", msg`place`, "kohalik"),
    make("make-lapselik", "lik", "laps", msg`child`, "lapselik"),
    {
      kind: "translate",
      id: "write-neighbour",
      rule: "lik",
      prompt: msg`The new neighbour is very friendly.`,
      answers: SUFFIX_ANSWERS["Uus naaber on väga sõbralik."] as readonly [string, ...string[]],
      say: "Uus naaber on väga sõbralik.",
      explain: LIK,
    },
    {
      kind: "translate",
      id: "write-road",
      rule: "lik",
      prompt: msg`The road is dangerous in winter.`,
      answers: SUFFIX_ANSWERS["Talvel on tee ohtlik."] as readonly [string, ...string[]],
      say: "Talvel on tee ohtlik.",
      explain: LIK,
    },
    {
      kind: "fix",
      id: "fix-sobraliku",
      rule: "lik",
      wrong: "Ta rääkis sõbralik naisega.",
      answers: SUFFIX_FIX_ANSWERS["Ta rääkis sõbraliku naisega."] as readonly [string, ...string[]],
      say: "Ta rääkis sõbraliku naisega.",
      explain: msg`The adjective takes the genitive before <et>-ga</et>: <et>sõbraliku naisega</et>.`,
    },

    make("make-kodutu", "tu", "kodu", msg`home`, "kodutu"),
    make("make-tootu", "tu", "töö", msg`work`, "töötu"),
    make(
      "make-veatu",
      "tu",
      "viga",
      msg`mistake`,
      "veatu",
      msg`The genitive of <et>viga</et> is <et>vea</et>, so <et>veatu</et>.`,
    ),
    {
      kind: "translate",
      id: "write-soup",
      rule: "tu",
      prompt: msg`This soup is tasteless.`,
      answers: SUFFIX_ANSWERS["See supp on maitsetu."] as readonly [string, ...string[]],
      say: "See supp on maitsetu.",
      explain: TU,
    },
    {
      kind: "translate",
      id: "write-cat",
      rule: "tu",
      prompt: msg`We found a homeless cat.`,
      answers: SUFFIX_ANSWERS["Me leidsime kodutu kassi."] as readonly [string, ...string[]],
      say: "Me leidsime kodutu kassi.",
      explain: msg`The adjective and noun are both genitive here: <et>kodutu kassi</et>.`,
    },
    {
      kind: "fix",
      id: "fix-kodutud",
      rule: "tu",
      wrong: "Kodutu koerad otsivad toitu.",
      answers: SUFFIX_FIX_ANSWERS["Kodutud koerad otsivad toitu."] as readonly [
        string,
        ...string[],
      ],
      say: "Kodutud koerad otsivad toitu.",
      explain: msg`The adjective is plural like its noun: <et>kodutud koerad</et>.`,
    },

    make("make-majake", "ke", "maja", msg`house`, "majake"),
    make(
      "make-tukike",
      "ke",
      "tükk",
      msg`piece`,
      "tükike",
      msg`The genitive of <et>tükk</et> is <et>tüki</et>, so <et>tükike</et>.`,
    ),
    {
      kind: "translate",
      id: "write-town",
      rule: "ke",
      prompt: msg`We live in a small town.`,
      answers: SUFFIX_ANSWERS["Me elame väikeses linnakeses."] as readonly [string, ...string[]],
      say: "Me elame väikeses linnakeses.",
      explain: msg`<et>Linnake</et>, a small town; in it, <et>linnakeses</et>.`,
    },
    {
      kind: "translate",
      id: "write-cake",
      rule: "ke",
      prompt: msg`Give me a little piece of cake.`,
      answers: SUFFIX_ANSWERS["Anna mulle tükike kooki."] as readonly [string, ...string[]],
      say: "Anna mulle tükike kooki.",
      explain: msg`<et>Tükike</et> is a little piece; after it, the partitive: <et>kooki</et>.`,
    },
    {
      kind: "fix",
      id: "fix-majakeses",
      rule: "ke",
      wrong: "Nad elavad väikeses majake.",
      answers: SUFFIX_FIX_ANSWERS["Nad elavad väikeses majakeses."] as readonly [
        string,
        ...string[],
      ],
      say: "Nad elavad väikeses majakeses.",
      explain: msg`A <et>-ke</et> word changes like <et>-ne</et>: <et>majakeses</et>.`,
    },
    {
      kind: "fix",
      id: "fix-majakest",
      rule: "ke",
      wrong: "Lapsed ehitasid liivast kaks majaket.",
      answers: SUFFIX_FIX_ANSWERS["Lapsed ehitasid liivast kaks majakest."] as readonly [
        string,
        ...string[],
      ],
      say: "Lapsed ehitasid liivast kaks majakest.",
      explain: msg`The partitive of <et>majake</et> is <et>majakest</et>.`,
    },
    {
      kind: "dictation",
      id: "dictate-boy",
      rule: "ke",
      answers: ["Väike poisike nuttis."],
      say: "Väike poisike nuttis.",
      explain: msg`<et>Poisike</et> is a little boy, from <et>poiss</et>.`,
    },
    {
      kind: "dictation",
      id: "dictate-local",
      rule: "lik",
      answers: ["Kohalik pood on pühapäeval kinni."],
      say: "Kohalik pood on pühapäeval kinni.",
      explain: LIK,
    },
    {
      kind: "dictation",
      id: "dictate-unemployed",
      rule: "tu",
      answers: ["Ta on juba aasta töötu."],
      say: "Ta on juba aasta töötu.",
      explain: TU,
    },
    {
      kind: "dictation",
      id: "dictate-endless",
      rule: "tu",
      answers: ["Koosolek tundus lõputu."],
      say: "Koosolek tundus lõputu.",
      explain: TU,
    },
    {
      kind: "dictation",
      id: "dictate-kitten",
      rule: "ke",
      answers: ["Väike kassike magab diivanil."],
      say: "Väike kassike magab diivanil.",
      explain: KE,
    },
  ],
};
