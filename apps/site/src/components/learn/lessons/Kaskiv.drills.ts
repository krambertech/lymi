import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import {
  clipId,
  commandTo,
  KASKIV_FLIP,
  KASKIV_MORE,
  KASKIV_STEMS,
  notSentence,
} from "../../../lib/learn/clips";
import type { ChoiceDrill, DrillBank, FormDrill, SentenceDrill } from "../../../lib/learn/drill";

const MEANS: Record<(typeof KASKIV_STEMS)[number]["verb"], MessageDescriptor> = {
  lugema: msg`to read`,
  rääkima: msg`to speak`,
  ootama: msg`to wait`,
  sööma: msg`to eat`,
  jooma: msg`to drink`,
  õppima: msg`to study`,
};

const STEM = msg`The command to one person is the I form without its <et>-n</et>.`;
const DONT = msg`<et>Ära</et> before the stem tells one person not to do it.`;
const MORE = msg`To more than one, or politely, the command ends in <et>-ge</et> or <et>-ke</et>.`;

const typed = ({ verb, ma, stem }: (typeof KASKIV_STEMS)[number]): FormDrill => ({
  kind: "form",
  id: `command-${clipId(stem)}`,
  rule: "one",
  base: verb,
  gloss: MEANS[verb],
  cue: msg`to one person`,
  answers: [stem, `${stem}!`],
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

const more = ({ one, more: many }: (typeof KASKIV_MORE)[number]): SentenceDrill => ({
  kind: "rewrite",
  id: `more-${clipId(many)}`,
  rule: "more",
  from: one,
  cue: msg`to more than one`,
  say: many,
  answers: [many],
  explain: MORE,
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
    explain: msg`<et>Ära</et> tells someone not to; <et>ei</et> says what isn’t so.`,
  };
};

export const DRILLS: DrillBank = {
  rules: {
    one: { label: msg`The command to one person`, section: "stem" },
    dont: { label: msg`<et>Ära</et>, don’t`, section: "ara" },
    more: { label: msg`To more than one`, section: "more" },
  },
  items: [
    ...KASKIV_STEMS.map(typed),
    ...KASKIV_FLIP.map(dont),
    heard("istu", false),
    heard("istu", true),
    heard("loe", false),
    heard("loe", true),
    ...KASKIV_MORE.slice(0, 6).map(more),
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
