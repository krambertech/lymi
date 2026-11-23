import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import {
  daForm,
  VERB_FORMS,
  type VerbForms,
  VORMID_COMMANDS,
  VORMID_DRILL,
  VORMID_FIX,
  VORMID_SAY,
} from "../../../lib/learn/clips";
import type { DrillBank, FixDrill, FormDrill, SentenceDrill } from "../../../lib/learn/drill";

type Verb = VerbForms["ma"];

const MEANS: Record<Verb, MessageDescriptor> = {
  elama: msg`to live`,
  lugema: msg`to read`,
  rääkima: msg`to speak, to talk`,
  õppima: msg`to learn, to study`,
  istuma: msg`to sit, to sit down`,
  töötama: msg`to work`,
  armastama: msg`to love`,
  ootama: msg`to wait`,
  kuulama: msg`to listen`,
  vaatama: msg`to look, to watch`,
  olema: msg`to be`,
  tulema: msg`to come`,
  minema: msg`to go`,
  tegema: msg`to do, to make`,
  nägema: msg`to see`,
  sööma: msg`to eat`,
  jooma: msg`to drink`,
};

const SAY_MEANS: Record<(typeof VORMID_SAY)[number]["id"], MessageDescriptor> = {
  lugeda: msg`I want to read.`,
  lugege: msg`Read, please! To more than one.`,
  ootan: msg`I’m waiting in the café.`,
  oodake: msg`Wait, please! To more than one.`,
  suua: msg`I want to eat.`,
  teeme: msg`We’re working.`,
};

const DRILL_MEANS: Record<(typeof VORMID_DRILL)[number]["id"], MessageDescriptor> = {
  tulge: msg`Come here! To more than one.`,
  juua: msg`I want to drink coffee.`,
  raagime: msg`We speak Estonian.`,
  vaadake: msg`Look, please! To more than one.`,
  elavad: msg`They live in Tartu.`,
  oppida: msg`I want to learn Estonian.`,
};

const FIX_MEANS: Record<(typeof VORMID_FIX)[number]["id"], MessageDescriptor> = {
  loen: msg`I’m reading a book.`,
  oodake: msg`Wait, please! To more than one.`,
  teen: msg`I’m working.`,
  suua: msg`I want to eat.`,
  kuulake: msg`Listen, please! To more than one.`,
  tulla: msg`I want to come.`,
};

const DA = msg`After <et>tahan</et>, the -da infinitive: <et>lugeda, süüa, tulla</et>.`;
const PRESENT = msg`What someone does takes the present, which can have a stem of its own: <et>loen, teen</et>.`;
const COMMAND = msg`A command to more than one usually builds on the -da infinitive: <et>tulla, Tulge!</et> Where the -da infinitive ends in -ta, or in -a after h, it takes -ke: <et>oodata, Oodake!</et> <et>teha, Tehke!</et>`;
const WHY = { da: DA, present: PRESENT, command: COMMAND };
const MAKE_DA = msg`Most verbs swap -ma for -da; some take -ta, and a few others -la, -na, -ra or a bare -a.`;
type Rule = keyof typeof WHY;

const SAY_RULE: Record<(typeof VORMID_SAY)[number]["id"], Rule> = {
  lugeda: "da",
  lugege: "command",
  ootan: "present",
  oodake: "command",
  suua: "da",
  teeme: "present",
};

const FIX_RULE: Record<(typeof VORMID_FIX)[number]["id"], Rule> = {
  loen: "present",
  oodake: "command",
  teen: "present",
  suua: "da",
  kuulake: "command",
  tulla: "da",
};

const asciiId = (text: string) => text.normalize("NFD").replace(/[^a-z]/g, "");

const verbOf = (ma: Verb) => VERB_FORMS.find((each) => each.ma === ma) as VerbForms;

const sentence = (
  id: string,
  rule: Rule,
  prompt: MessageDescriptor,
  said: string,
  also: readonly string[],
): SentenceDrill => ({
  kind: "translate",
  id: `say-${id}`,
  rule,
  prompt,
  answers: [said, ...also],
  say: said,
  explain: WHY[rule],
});

const fixed = ({ id, wrong, right }: (typeof VORMID_FIX)[number]): FixDrill => ({
  kind: "fix",
  id: `fix-${id}`,
  rule: FIX_RULE[id],
  wrong,
  prompt: FIX_MEANS[id],
  answers: [right],
  say: right,
  explain: WHY[FIX_RULE[id]],
});

const daOf = (ma: Verb): FormDrill => {
  const verb = verbOf(ma);
  return {
    kind: "form",
    id: `da-${asciiId(ma)}`,
    rule: "da",
    base: verb.ma,
    gloss: MEANS[ma],
    cue: { et: "-da" },
    answers: [daForm(verb)],
    say: daForm(verb),
    explain: MAKE_DA,
  };
};

const commandOf = (ma: Verb): FormDrill => {
  const verb = verbOf(ma);
  return {
    kind: "form",
    id: `command-${asciiId(ma)}`,
    rule: "command",
    base: verb.ma,
    gloss: MEANS[ma],
    cue: msg`a command to more than one`,
    answers: [verb.ge.replace("!", "")],
    say: verb.ge,
    explain: COMMAND,
  };
};

export const DRILLS: DrillBank = {
  rules: {
    da: { label: msg`The -da infinitive`, section: "da" },
    present: { label: msg`The present`, section: "three" },
    command: { label: msg`Commands`, section: "commands" },
  },
  items: [
    ...VORMID_SAY.map(({ id, said, also }) =>
      sentence(id, SAY_RULE[id], SAY_MEANS[id], said, also),
    ),
    ...VORMID_DRILL.map(({ id, said, rule, also }) =>
      sentence(id, rule, DRILL_MEANS[id], said, also),
    ),
    ...VORMID_FIX.map(fixed),
    ...(["elama", "ootama", "olema", "tegema", "sööma", "kuulama"] as const).map(daOf),
    ...(
      VORMID_COMMANDS.filter((ma) =>
        ["istuma", "ootama", "tulema", "tegema"].includes(ma),
      ) as Verb[]
    ).map(commandOf),
  ],
};
