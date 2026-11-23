import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import {
  clipId,
  commandTo,
  KASKIV_TURNED,
  KASKIV_TYPED,
  notSentence,
} from "../../../lib/learn/clips";
import type { ChoiceDrill, DrillBank, FormDrill, SentenceDrill } from "../../../lib/learn/drill";

const MEANS: Record<string, MessageDescriptor> = {
  rääkima: msg`to speak`,
  ootama: msg`to wait`,
  sööma: msg`to eat`,
  jooma: msg`to drink`,
  õppima: msg`to learn, to study`,
  kuulama: msg`to listen`,
  vaatama: msg`to look`,
};

const STEM = msg`The command to one person is usually the I form of the present without its <et>-n</et>.`;
const DONT = msg`<et>Ära</et> before the stem tells one person not to do it.`;
const ARGE = msg`<et>Ära</et> becomes <et>ärge</et>, and the verb takes its <et>-ge</et> or <et>-ke</et> form: <et>Ärge istuge!</et>`;
const MORE = msg`To more than one, or politely, the verb ends in <et>-ge</et> or <et>-ke</et>.`;

const typed = ({ verb, ma, stem, answers }: (typeof KASKIV_TYPED)[number]): FormDrill => ({
  kind: "form",
  id: `command-${clipId(stem)}`,
  rule: "one",
  base: ma,
  gloss: MEANS[verb] as MessageDescriptor,
  cue: msg`to one person you’d call sa`,
  answers,
  say: commandTo(stem),
  explain: msg`<et>Ma ${ma}</et>, so the command is <et>${commandTo(stem)}</et>`,
});

const dont = (stem: string): SentenceDrill => ({
  kind: "rewrite",
  id: `dont-${clipId(stem)}`,
  rule: "dont",
  from: commandTo(stem),
  cue: msg`don’t`,
  say: commandTo(stem, true),
  answers: [commandTo(stem, true)],
  explain: DONT,
});

const turned = ({ from, to, kind, answers }: (typeof KASKIV_TURNED)[number]): SentenceDrill => ({
  kind: "rewrite",
  id: `${kind}-${clipId(to)}`,
  rule: kind,
  from,
  cue: kind === "dont" ? msg`don’t` : msg`to more than one`,
  say: to,
  answers,
  explain: kind === "dont" ? DONT : from.startsWith("Ära") ? ARGE : MORE,
});

const HEARD: Record<
  string,
  { dont: MessageDescriptor; not: MessageDescriptor; doIt: MessageDescriptor }
> = {
  istu: { dont: msg`Don’t sit down.`, not: msg`I’m not sitting down.`, doIt: msg`Sit down.` },
  oota: { dont: msg`Don’t wait.`, not: msg`I’m not waiting.`, doIt: msg`Wait.` },
  loe: { dont: msg`Don’t read.`, not: msg`I’m not reading.`, doIt: msg`Read.` },
  joo: { dont: msg`Don’t drink.`, not: msg`I’m not drinking.`, doIt: msg`Drink.` },
};

const heard = (stem: keyof typeof HEARD, saidNot: boolean): ChoiceDrill => {
  const means = HEARD[stem] as (typeof HEARD)[string];
  const dontOption = { id: "dont", label: means.dont };
  const notOption = { id: "not", label: means.not };
  return {
    kind: "choice",
    id: `${saidNot ? "not" : "dont"}-heard-${clipId(stem)}`,
    rule: "dont",
    say: saidNot ? notSentence(stem) : commandTo(stem, true),
    answer: saidNot ? notOption : dontOption,
    slip: saidNot ? dontOption : notOption,
    wrong: [{ id: "do", label: means.doIt }],
    explain: msg`<et>Ära</et> tells someone not to do it; <et>ei</et> says what someone doesn’t do.`,
  };
};

export const DRILLS: DrillBank = {
  rules: {
    one: { label: msg`The command to one person`, section: "stem" },
    dont: { label: msg`<et>Ära</et>, don’t`, section: "ara" },
    more: { label: msg`To more than one`, section: "more" },
  },
  items: [
    ...KASKIV_TYPED.map(typed),
    ...KASKIV_TURNED.map(turned),
    dont("räägi"),
    heard("istu", false),
    heard("istu", true),
    heard("loe", false),
    heard("loe", true),
    heard("oota", false),
    heard("oota", true),
    {
      kind: "dictation",
      id: "write-raagi-aeglasemalt",
      rule: "one",
      say: "Räägi aeglasemalt, palun.",
      answers: ["Räägi aeglasemalt, palun."],
      explain: STEM,
    },
    {
      kind: "dictation",
      id: "write-raakige-aeglasemalt",
      rule: "more",
      say: "Rääkige aeglasemalt, palun.",
      answers: ["Rääkige aeglasemalt, palun."],
      explain: MORE,
    },
  ],
};
