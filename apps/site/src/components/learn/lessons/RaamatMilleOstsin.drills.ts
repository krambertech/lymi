import { msg } from "@lingui/core/macro";
import { REL_ANSWERS, REL_FIX_ANSWERS } from "../../../lib/learn/clips";
import type { ChoiceDrill, DrillBank, DrillOption, FormDrill } from "../../../lib/learn/drill";

const WHO = msg`<et>mis</et> usually follows a thing or an idea, and <et>kes</et> follows a person.`;
const CASE = msg`The word after the comma takes the case it would have inside its own clause.`;
const PLACE = msg`For a place where something is or happens, <et>kus</et> usually works. <et>Milles</et> also works.`;

const ROLES: Record<string, DrillOption> = {
  owner: { id: "owner", label: msg`Whose it is` },
  object: { id: "object", label: msg`What is done to` },
  with: { id: "with", label: msg`Together with` },
  to: { id: "to", label: msg`Given or sent to` },
  about: { id: "about", label: msg`What it is about` },
};

const word = (id: string): DrillOption => ({ id, label: { et: id } });

const who = (id: string, say: string, answer: "mis" | "kes"): ChoiceDrill => ({
  kind: "choice",
  id,
  rule: "who",
  say,
  answer: word(answer),
  wrong: [word(answer === "mis" ? "kes" : "mis")],
  explain: WHO,
});

const place = (id: string, say: string, answer: "kus" | "mis"): ChoiceDrill => ({
  kind: "choice",
  id,
  rule: "place",
  say,
  answer: word(answer),
  wrong: [word(answer === "kus" ? "mis" : "kus")],
  explain: PLACE,
});

const role = (id: string, say: string, answer: string, slip: string): ChoiceDrill => ({
  kind: "choice",
  id,
  rule: "case",
  say,
  answer: ROLES[answer] as DrillOption,
  slip: ROLES[slip] as DrillOption,
  wrong: Object.values(ROLES).filter(({ id }) => id !== answer && id !== slip),
  explain: CASE,
});

const form = (
  id: string,
  base: "kes" | "mis",
  answer: string,
  say: string,
  means: ReturnType<typeof msg>,
): FormDrill => ({
  kind: "form",
  id,
  rule: "case",
  base,
  gloss: base === "kes" ? msg`who` : msg`which, that`,
  cue: { et: say.replace(answer, "___") },
  means,
  answers: [answer],
  say,
  explain: CASE,
});

const first = (list: readonly [string, ...string[]]) => list as readonly [string, ...string[]];

export const DRILLS: DrillBank = {
  rules: {
    who: { label: msg`<et>mis</et> or <et>kes</et>`, section: "mis-kes" },
    case: { label: msg`The case of the word`, section: "forms" },
    place: { label: msg`Places: <et>kus</et>`, section: "places" },
  },
  items: [
    who("hear-neighbour", "Naaber, kes mängib klaverit, on sõbralik.", "kes"),
    who("hear-bag", "Kott, mis on laual, on raske.", "mis"),
    who("hear-teacher", "Õpetaja, kes räägib eesti keelt, on noor.", "kes"),
    who("hear-house-big", "Maja, mis on suur, on vana.", "mis"),
    {
      kind: "translate",
      id: "write-shop",
      rule: "who",
      prompt: msg`The woman who works in the shop is my mother.`,
      answers: first(REL_ANSWERS["Naine, kes töötab poes, on mu ema."] as never),
      say: "Naine, kes töötab poes, on mu ema.",
      explain: WHO,
    },
    {
      kind: "translate",
      id: "write-car",
      rule: "who",
      prompt: msg`The car that stands outside is red.`,
      answers: first(REL_ANSWERS["Auto, mis seisab õues, on punane."] as never),
      say: "Auto, mis seisab õues, on punane.",
      explain: WHO,
    },
    {
      kind: "fix",
      id: "fix-child",
      rule: "who",
      wrong: "Laps, mis mängib õues, on mu poeg.",
      prompt: msg`The child who plays outside is my son.`,
      answers: ["Laps, kes mängib õues, on mu poeg."],
      say: "Laps, kes mängib õues, on mu poeg.",
      explain: WHO,
    },
    {
      kind: "dictation",
      id: "dictate-man",
      rule: "who",
      answers: ["Mees, kes elab siin, on arst."],
      say: "Mees, kes elab siin, on arst.",
      explain: WHO,
    },
    form(
      "form-keda",
      "kes",
      "keda",
      "Ma tunnen meest, keda sa ootad.",
      msg`I know the man you are waiting for.`,
    ),
    form(
      "form-millega",
      "mis",
      "millega",
      "Ma nägin autot, millega sa sõitsid.",
      msg`I saw the car you were driving.`,
    ),
    form(
      "form-kellele",
      "kes",
      "kellele",
      "Ma tunnen meest, kellele sa helistasid.",
      msg`I know the man you phoned.`,
    ),
    form(
      "form-millest",
      "mis",
      "millest",
      "Ma vaatasin filmi, millest sa rääkisid.",
      msg`I watched the film you talked about.`,
    ),
    form(
      "form-kellel",
      "kes",
      "kellel",
      "Ma tunnen last, kellel on koer.",
      msg`I know the child who has a dog.`,
    ),
    role("hear-owner", "Ma tunnen naist, kelle auto on punane.", "owner", "object"),
    role("hear-to", "Ma tunnen meest, kellele sa helistasid.", "to", "with"),
    role("hear-with", "Ma nägin autot, millega sa sõitsid.", "with", "to"),
    {
      kind: "translate",
      id: "write-talked",
      rule: "case",
      prompt: msg`I know the woman you talked with.`,
      answers: first(REL_ANSWERS["Ma tunnen naist, kellega sa rääkisid."] as never),
      say: "Ma tunnen naist, kellega sa rääkisid.",
      explain: CASE,
    },
    {
      kind: "translate",
      id: "write-drove",
      rule: "case",
      prompt: msg`I saw the car you were driving.`,
      answers: first(REL_ANSWERS["Ma nägin autot, millega sa sõitsid."] as never),
      say: "Ma nägin autot, millega sa sõitsid.",
      explain: CASE,
    },
    {
      kind: "translate",
      id: "write-waiting",
      rule: "case",
      prompt: msg`I know the man you are waiting for.`,
      answers: first(REL_ANSWERS["Ma tunnen meest, keda sa ootad."] as never),
      say: "Ma tunnen meest, keda sa ootad.",
      explain: CASE,
    },
    {
      kind: "fix",
      id: "fix-whose",
      rule: "case",
      wrong: "Ma tunnen naist, keda auto on punane.",
      prompt: msg`I know the woman whose car is red.`,
      answers: first(REL_FIX_ANSWERS["Ma tunnen naist, kelle auto on punane."] as never),
      say: "Ma tunnen naist, kelle auto on punane.",
      explain: CASE,
    },
    {
      kind: "fix",
      id: "fix-phoned",
      rule: "case",
      wrong: "Ma tunnen meest, kellega sa helistasid.",
      prompt: msg`I know the man you phoned.`,
      answers: first(REL_FIX_ANSWERS["Ma tunnen meest, kellele sa helistasid."] as never),
      say: "Ma tunnen meest, kellele sa helistasid.",
      explain: CASE,
    },
    {
      kind: "rewrite",
      id: "join-car",
      rule: "case",
      from: "Ma nägin autot. Sa sõitsid sellega.",
      cue: msg`join with a relative clause`,
      answers: first(REL_ANSWERS["Ma nägin autot, millega sa sõitsid."] as never),
      say: "Ma nägin autot, millega sa sõitsid.",
      explain: CASE,
    },
    {
      kind: "rewrite",
      id: "join-owner",
      rule: "case",
      from: "Ma tunnen naist. Tema auto on punane.",
      cue: msg`join with a relative clause`,
      answers: first(REL_ANSWERS["Ma tunnen naist, kelle auto on punane."] as never),
      say: "Ma tunnen naist, kelle auto on punane.",
      explain: CASE,
    },
    place("hear-city", "Linn, kus ma elan, on väike.", "kus"),
    place("hear-park", "Park, kus lapsed mängivad, on suur.", "kus"),
    place("hear-film", "Film, mis algab kell kaheksa, on pikk.", "mis"),
    {
      kind: "translate",
      id: "write-house",
      rule: "place",
      prompt: msg`The house where I live is old.`,
      answers: first(REL_ANSWERS["Maja, kus ma elan, on vana."] as never),
      say: "Maja, kus ma elan, on vana.",
      explain: PLACE,
    },
    {
      kind: "fix",
      id: "fix-city",
      rule: "place",
      wrong: "Linn, mis ma elan, on väike.",
      prompt: msg`The city where I live is small.`,
      answers: first(REL_FIX_ANSWERS["Linn, kus ma elan, on väike."] as never),
      say: "Linn, kus ma elan, on väike.",
      explain: PLACE,
    },
    {
      kind: "rewrite",
      id: "join-house",
      rule: "place",
      from: "Ma elan majas. Maja on vana.",
      cue: msg`join with a relative clause`,
      answers: first(REL_ANSWERS["Maja, kus ma elan, on vana."] as never),
      say: "Maja, kus ma elan, on vana.",
      explain: PLACE,
    },
  ],
};
