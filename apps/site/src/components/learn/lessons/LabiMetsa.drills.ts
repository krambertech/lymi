import { msg } from "@lingui/core/macro";
import { ROUTE_ANSWERS, ROUTE_FIX_ANSWERS } from "../../../lib/learn/clips";
import type { ChoiceDrill, DrillBank, FormDrill } from "../../../lib/learn/drill";

const GEN = msg`<et>Läbi</et>, <et>üle</et>, <et>ümber</et> and <et>kaudu</et> take the genitive.`;
const PART = msg`<et>Mööda</et>, along, takes the partitive.`;

const MEANS = {
  through: msg`through`,
  across: msg`across`,
  along: msg`along`,
  around: msg`around`,
} as const;
type Means = keyof typeof MEANS;

const hear = (id: string, say: string, answer: Means, explain: ChoiceDrill["explain"]) =>
  ({
    kind: "choice",
    id,
    rule: "meaning",
    say,
    answer: { id: answer, label: MEANS[answer] },
    wrong: (Object.keys(MEANS) as Means[])
      .filter((each) => each !== answer)
      .map((each) => ({ id: each, label: MEANS[each] })),
    explain,
  }) satisfies ChoiceDrill;

const form = (
  id: string,
  base: string,
  gloss: FormDrill["gloss"],
  cue: string,
  answer: string,
  say: string,
  explain: FormDrill["explain"],
): FormDrill => ({
  kind: "form",
  id,
  rule: "case",
  base,
  gloss,
  cue: { et: cue },
  answers: [answer],
  say,
  explain,
});

export const DRILLS: DrillBank = {
  rules: {
    meaning: { label: msg`Through, across, along, around`, section: "hear" },
    case: { label: msg`Genitive or partitive after the word`, section: "case" },
    after: { label: msg`Words that go after the noun`, section: "words" },
  },
  items: [
    hear("hear-akna", "Valgus tuleb läbi akna.", "through", msg`<et>Läbi</et>: through.`),
    hear("hear-tanava", "Lapsed jooksid üle tänava.", "across", msg`<et>Üle</et>: across.`),
    hear("hear-randa", "Me jalutasime mööda randa.", "along", msg`<et>Mööda</et>: along.`),
    hear("hear-maja", "Koer jooksis ümber maja.", "around", msg`<et>Ümber</et>: around.`),
    hear("hear-linna", "Ma lähen tööle läbi linna.", "through", msg`<et>Läbi</et>: through.`),
    hear("hear-joge", "Ta sõitis rattaga mööda jõge.", "along", msg`<et>Mööda</et>: along.`),
    {
      kind: "translate",
      id: "write-forest",
      rule: "meaning",
      prompt: msg`We walked through the forest.`,
      answers: ROUTE_ANSWERS["Me kõndisime läbi metsa."] as readonly [string, ...string[]],
      say: "Me kõndisime läbi metsa.",
      explain: GEN,
    },
    {
      kind: "translate",
      id: "write-road",
      rule: "meaning",
      prompt: msg`The children ran across the road.`,
      answers: ROUTE_ANSWERS["Lapsed jooksid üle tee."] as readonly [string, ...string[]],
      say: "Lapsed jooksid üle tee.",
      explain: GEN,
    },

    form(
      "form-aia",
      "aed",
      msg`garden, fence`,
      "Kass tuli läbi … .",
      "aia",
      "Kass tuli läbi aia.",
      GEN,
    ),
    form(
      "form-silla",
      "sild",
      msg`bridge`,
      "Me sõitsime üle … .",
      "silla",
      "Me sõitsime üle silla.",
      GEN,
    ),
    form(
      "form-teed",
      "tee",
      msg`road`,
      "Ma kõnnin mööda … .",
      "teed",
      "Ma kõnnin mööda teed.",
      PART,
    ),
    form(
      "form-tanavat",
      "tänav",
      msg`street`,
      "Nad jalutasid mööda … .",
      "tänavat",
      "Nad jalutasid mööda tänavat.",
      PART,
    ),
    form("form-joe", "jõgi", msg`river`, "Me ujusime üle … .", "jõe", "Me ujusime üle jõe.", GEN),
    form(
      "form-linna",
      "linn",
      msg`town`,
      "Buss sõidab läbi … .",
      "linna",
      "Buss sõidab läbi linna.",
      GEN,
    ),
    {
      kind: "fix",
      id: "fix-teed",
      rule: "case",
      wrong: "Me kõndisime mööda tee.",
      answers: ROUTE_FIX_ANSWERS["Me kõndisime mööda teed."] as readonly [string, ...string[]],
      say: "Me kõndisime mööda teed.",
      explain: PART,
    },
    {
      kind: "fix",
      id: "fix-tee",
      rule: "case",
      wrong: "Lapsed jooksid üle teed.",
      answers: ROUTE_FIX_ANSWERS["Lapsed jooksid üle tee."] as readonly [string, ...string[]],
      say: "Lapsed jooksid üle tee.",
      explain: GEN,
    },
    {
      kind: "fix",
      id: "fix-joge",
      rule: "case",
      wrong: "Me jalutasime mööda jõe.",
      answers: ROUTE_FIX_ANSWERS["Me jalutasime mööda jõge."] as readonly [string, ...string[]],
      say: "Me jalutasime mööda jõge.",
      explain: PART,
    },
    {
      kind: "fix",
      id: "fix-linna",
      rule: "case",
      wrong: "Me sõitsime läbi linnas.",
      answers: ROUTE_FIX_ANSWERS["Me sõitsime läbi linna."] as readonly [string, ...string[]],
      say: "Me sõitsime läbi linna.",
      explain: GEN,
    },

    form(
      "form-laua",
      "laud",
      msg`table`,
      "Me istusime … ümber.",
      "laua",
      "Me istusime laua ümber.",
      msg`<et>Ümber</et> usually goes after the genitive: <et>laua ümber</et>.`,
    ),
    form(
      "form-sobra",
      "sõber",
      msg`friend`,
      "Ma sain selle töö … kaudu.",
      "sõbra",
      "Ma sain selle töö sõbra kaudu.",
      msg`<et>Kaudu</et> goes after the genitive: <et>sõbra kaudu</et>.`,
    ),
    {
      kind: "translate",
      id: "write-riga",
      rule: "after",
      prompt: msg`We flew via Riga.`,
      answers: ROUTE_ANSWERS["Me lendasime Riia kaudu."] as readonly [string, ...string[]],
      say: "Me lendasime Riia kaudu.",
      explain: msg`<et>Kaudu</et> goes after the genitive: <et>Riia kaudu</et>.`,
    },
    {
      kind: "translate",
      id: "write-table",
      rule: "after",
      prompt: msg`We sat around the table.`,
      answers: ROUTE_ANSWERS["Me istusime laua ümber."] as readonly [string, ...string[]],
      say: "Me istusime laua ümber.",
      explain: msg`<et>Ümber</et> usually goes after the genitive: <et>laua ümber</et>.`,
    },
    {
      kind: "dictation",
      id: "dictate-tartu",
      rule: "after",
      answers: ["Ma sõidan tööle Tartu kaudu."],
      say: "Ma sõidan tööle Tartu kaudu.",
      explain: msg`<et>Kaudu</et> goes after the noun: <et>Tartu kaudu</et>.`,
    },
    {
      kind: "fix",
      id: "fix-riia",
      rule: "after",
      wrong: "Me lendasime Riiast kaudu.",
      answers: ROUTE_FIX_ANSWERS["Me lendasime Riia kaudu."] as readonly [string, ...string[]],
      say: "Me lendasime Riia kaudu.",
      explain: msg`<et>Kaudu</et> takes the genitive: <et>Riia</et>.`,
    },
    {
      kind: "fix",
      id: "fix-laua",
      rule: "after",
      wrong: "Nad istusid lauda ümber.",
      answers: ROUTE_FIX_ANSWERS["Nad istusid laua ümber."] as readonly [string, ...string[]],
      say: "Nad istusid laua ümber.",
      explain: msg`<et>Ümber</et> takes the genitive: <et>laua</et>.`,
    },
  ],
};
