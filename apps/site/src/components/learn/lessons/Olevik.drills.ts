import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import {
  PRESENT_ENDINGS,
  PRESENT_FIXES,
  PRESENT_SENTENCES,
  PRESENT_TURNED,
  PRESENT_VERBS,
  presentWithPronoun,
} from "../../../lib/learn/clips";
import type {
  ChoiceDrill,
  DrillBank,
  FixDrill,
  FormDrill,
  SentenceDrill,
} from "../../../lib/learn/drill";

type Verb = (typeof PRESENT_VERBS)[number];
type Ending = (typeof PRESENT_ENDINGS)[number]["ending"];

const MEANS: Record<Verb["verb"], MessageDescriptor> = {
  elama: msg`to live`,
  õppima: msg`to learn, to study`,
  lugema: msg`to read`,
  tegema: msg`to do, to make`,
  rääkima: msg`to speak, to talk`,
  töötama: msg`to work`,
  ootama: msg`to wait`,
  armastama: msg`to love`,
  sööma: msg`to eat`,
  jooma: msg`to drink`,
};

const verbOf = (name: Verb["verb"]) => PRESENT_VERBS.find((each) => each.verb === name) as Verb;
const personOf = (ending: Ending) =>
  PRESENT_ENDINGS.find((each) => each.ending === ending) as (typeof PRESENT_ENDINGS)[number];

const ascii = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z]/g, "");

const typed = (rule: string, name: Verb["verb"], ending: Ending): FormDrill => {
  const verb = verbOf(name);
  const { pronoun } = personOf(ending);
  const mine = `${verb.stem}n`;
  return {
    kind: "form",
    id: `form-${ascii(name)}-${pronoun}`,
    rule,
    base: name,
    gloss: MEANS[name],
    cue: { et: pronoun },
    answers: [`${verb.stem}${ending}`],
    say: presentWithPronoun(pronoun, verb.stem, ending),
    explain: msg`The stem is <et>${verb.stem}-</et>, as in <et>ma ${mine}</et>, and <et>${pronoun}</et> takes <et>-${ending}</et>.`,
  };
};

const heard = (name: Verb["verb"], ending: Ending, wrong: readonly Ending[]): ChoiceDrill => {
  const verb = verbOf(name);
  const { pronoun } = personOf(ending);
  const form = (each: Ending) => ({ id: each, label: { et: `${verb.stem}${each}` } });
  return {
    kind: "choice",
    id: `hear-${ascii(name)}-${pronoun}`,
    rule: "heard",
    say: presentWithPronoun(pronoun, verb.stem, ending),
    answer: form(ending),
    wrong: wrong.map(form),
    explain: msg`With <et>${pronoun}</et>, the ending is <et>-${ending}</et>.`,
  };
};

const STEM = msg`The ending goes on the stem of the I form, not of the -ma form.`;
const ENDING = msg`The ending goes with the pronoun at the start of the sentence.`;

const fixed = ({ wrong, said, kind }: (typeof PRESENT_FIXES)[number]): FixDrill => ({
  kind: "fix",
  id: `fix-${ascii(wrong)}`,
  rule: kind === "stem" ? "stem" : "ending",
  wrong,
  say: said,
  answers: [said],
  explain: kind === "stem" ? STEM : ENDING,
});

const LONG = { ma: "Mina", sa: "Sina", ta: "Tema", me: "Meie", te: "Teie", nad: "Nemad" } as const;

const turned = ({ from, to, said }: (typeof PRESENT_TURNED)[number]): SentenceDrill => {
  const rest = said.slice(said.indexOf(" ") + 1);
  const dropped = to === "ta" || to === "nad" ? [] : [rest.charAt(0).toUpperCase() + rest.slice(1)];
  return {
    kind: "rewrite",
    id: `turn-${ascii(said)}`,
    rule: "ending",
    from: PRESENT_SENTENCES[from],
    cue: msg`with ${to}`,
    say: said,
    answers: [said, `${LONG[to]} ${rest}`, ...dropped],
    explain: msg`The verb takes the ending for <et>${to}</et>.`,
  };
};

export const DRILLS: DrillBank = {
  rules: {
    ending: { label: msg`The ending for each pronoun`, section: "fill" },
    heard: { label: msg`Hearing who does it`, section: "hear" },
    stem: { label: msg`Stems that change`, section: "stems" },
  },
  items: [
    typed("ending", "elama", "vad"),
    typed("ending", "töötama", "b"),
    typed("ending", "ootama", "te"),
    typed("ending", "armastama", "d"),
    typed("ending", "jooma", "me"),
    typed("stem", "lugema", "b"),
    typed("stem", "rääkima", "vad"),
    typed("stem", "õppima", "me"),
    typed("stem", "tegema", "d"),
    typed("stem", "lugema", "n"),
    heard("rääkima", "b", ["d", "vad", "me"]),
    heard("rääkima", "vad", ["b", "te", "me"]),
    heard("elama", "d", ["n", "te", "b"]),
    heard("elama", "te", ["d", "me", "vad"]),
    heard("jooma", "me", ["n", "te", "vad"]),
    heard("jooma", "n", ["d", "me", "b"]),
    ...PRESENT_FIXES.map(fixed),
    ...PRESENT_TURNED.slice(4).map(turned),
  ],
};
