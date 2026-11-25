import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import {
  REP_ASK,
  REP_ASK_ANSWERS,
  REP_FIX_ANSWERS,
  REP_HEARD,
  REP_SAY,
  REP_SAY_ANSWERS,
  REP_STAYS,
  REP_VERBS,
  REP_WRITE_ANSWERS,
} from "../../../lib/learn/clips";
import type { ChoiceDrill, DrillBank, FormDrill } from "../../../lib/learn/drill";

const SAY = msg`After <et>ütles</et> or <et>rääkis</et>, put a comma and <et>et</et>. The person words change with the speaker, and the verb takes the new person’s ending.`;
const STAYS = msg`The verb usually keeps the tense it had when it was said, so it shows when the thing was true for the speaker.`;
const KAS = msg`A yes-or-no question follows <et>küsis</et> with <et>kas</et>. A question word stays where it was.`;
const VAT = msg`Drop <et>-ma</et> from the <et>-ma</et> form and add <et>-vat</et>. The form is the same for every person.`;
const APART = msg`<et>Ütles, et</et> and <et>rääkis, et</et> name who said it. <et>-vat</et> usually passes the news on without saying who said it.`;

const MEANS: Record<string, MessageDescriptor> = {
  lugema: msg`to read`,
  elama: msg`to live`,
  töötama: msg`to work`,
  olema: msg`to be`,
  minema: msg`to go`,
  jooma: msg`to drink`,
};

const ASCII: Record<string, string> = { töötama: "tootama" };

const entries = Object.values(REP_VERBS).flat();

const vat = (inf: string): FormDrill => {
  const each = entries.find((entry) => entry.inf === inf) as (typeof entries)[number];
  return {
    kind: "form",
    id: `vat-${ASCII[inf] ?? inf}`,
    rule: "vat",
    base: each.inf,
    gloss: MEANS[each.inf] as MessageDescriptor,
    cue: msg`the -vat form`,
    answers: [each.form],
    say: each.said,
    explain: VAT,
  };
};

const labels = {
  now: { id: "now", label: msg`at that moment` },
  before: { id: "before", label: msg`earlier` },
  later: { id: "later", label: msg`later` },
} as const;

const stays = (id: (typeof REP_STAYS)[number]["id"]): ChoiceDrill => {
  const each = REP_STAYS.find((entry) => entry.id === id) as (typeof REP_STAYS)[number];
  return {
    kind: "choice",
    id: `stays-${id}`,
    rule: "stays",
    say: each.said,
    answer: labels[each.means],
    wrong: Object.values(labels).filter((option) => option.id !== each.means),
    explain: STAYS,
  };
};

const apartLabels = {
  named: { id: "named", label: msg`someone named said it` },
  reported: { id: "reported", label: msg`only passed on` },
} as const;

const apart = (id: (typeof REP_HEARD)[number]["id"]): ChoiceDrill => {
  const each = REP_HEARD.find((entry) => entry.id === id) as (typeof REP_HEARD)[number];
  return {
    kind: "choice",
    id: `apart-${id}`,
    rule: "apart",
    say: each.said,
    answer: apartLabels[each.means],
    wrong: [apartLabels[each.means === "named" ? "reported" : "named"]],
    explain: APART,
  };
};

const said = (id: (typeof REP_SAY)[number]["id"]) => {
  const item = REP_SAY.find((entry) => entry.id === id) as (typeof REP_SAY)[number];
  const answers = REP_SAY_ANSWERS[id];
  return {
    kind: "rewrite" as const,
    id: `say-${id}`,
    rule: "say",
    from: item.from,
    cue: msg`report it`,
    answers,
    say: answers[0],
    explain: SAY,
  };
};

const asked = (id: (typeof REP_ASK)[number]["id"]) => {
  const item = REP_ASK.find((entry) => entry.id === id) as (typeof REP_ASK)[number];
  const answers = REP_ASK_ANSWERS[id];
  return {
    kind: "rewrite" as const,
    id: `ask-${id}`,
    rule: "kas",
    from: item.from,
    cue: msg`report the question`,
    answers,
    say: answers[0],
    explain: KAS,
  };
};

export const DRILLS: DrillBank = {
  rules: {
    say: { label: msg`Reporting with <et>ütles, et</et>`, section: "say" },
    stays: { label: msg`The verb usually keeps its tense`, section: "stays" },
    kas: { label: msg`Reporting with <et>küsis, kas</et>`, section: "kas" },
    vat: { label: msg`The <et>-vat</et> form`, section: "vat" },
    apart: { label: msg`Said, or passed on`, section: "apart" },
  },
  items: [
    vat("lugema"),
    vat("elama"),
    vat("töötama"),
    vat("olema"),
    vat("minema"),
    vat("jooma"),
    said("tired"),
    said("busy"),
    said("went"),
    said("sister"),
    {
      kind: "translate",
      id: "write-tomorrow",
      rule: "say",
      prompt: msg`Peeter said he is coming tomorrow.`,
      answers: REP_WRITE_ANSWERS["Peeter ütles, et ta tuleb homme."] as readonly [
        string,
        ...string[],
      ],
      say: "Peeter ütles, et ta tuleb homme.",
      explain: SAY,
    },
    stays("ill-before"),
    stays("come-later"),
    stays("lives-now"),
    stays("went-before"),
    asked("come"),
    asked("ill"),
    asked("when"),
    asked("speak"),
    {
      kind: "translate",
      id: "write-speak",
      rule: "kas",
      prompt: msg`I asked if you speak Estonian.`,
      answers: REP_WRITE_ANSWERS["Ma küsisin, kas sa räägid eesti keelt."] as readonly [
        string,
        ...string[],
      ],
      say: "Ma küsisin, kas sa räägid eesti keelt.",
      explain: KAS,
    },
    apart("liisa-said"),
    apart("liisa-vat"),
    apart("kalev-said"),
    apart("kalev-vat"),
    apart("rain-vat"),
    apart("concert-said"),
    {
      kind: "fix",
      id: "fix-busy",
      rule: "say",
      wrong: "Mari ütles, et mul on kiire.",
      prompt: msg`Mari said she is busy.`,
      answers: REP_FIX_ANSWERS["Mari ütles, et tal on kiire."] as readonly [string, ...string[]],
      say: "Mari ütles, et tal on kiire.",
      explain: SAY,
    },
    {
      kind: "fix",
      id: "fix-kas",
      rule: "kas",
      wrong: "Mari küsis, et ma tulen.",
      prompt: msg`Mari asked if I am coming.`,
      answers: REP_FIX_ANSWERS["Mari küsis, kas ma tulen."] as readonly [string, ...string[]],
      say: "Mari küsis, kas ma tulen.",
      explain: KAS,
    },
    {
      kind: "fix",
      id: "fix-coming",
      rule: "vat",
      wrong: "Ta tulemat homme.",
      prompt: msg`Reportedly, he is coming tomorrow.`,
      answers: REP_FIX_ANSWERS["Ta tulevat homme."] as readonly [string, ...string[]],
      say: "Ta tulevat homme.",
      explain: VAT,
    },
    {
      kind: "dictation",
      id: "dictate-ill",
      rule: "vat",
      answers: ["Ta olevat haige."],
      say: "Ta olevat haige.",
      explain: VAT,
    },
    {
      kind: "dictation",
      id: "dictate-said",
      rule: "say",
      answers: ["Mari ütles, et ta on väsinud."],
      say: "Mari ütles, et ta on väsinud.",
      explain: SAY,
    },
  ],
};
