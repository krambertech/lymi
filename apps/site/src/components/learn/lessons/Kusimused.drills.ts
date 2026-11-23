import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { clipId, KUSIMUSED_ASKED, KUSIMUSED_TRANSLATED } from "../../../lib/learn/clips";
import type { ChoiceDrill, DrillBank, SentenceDrill } from "../../../lib/learn/drill";

type Asked = (typeof KUSIMUSED_ASKED)[number];
type Word = Asked["word"];

const ABOUT: Record<Word, MessageDescriptor> = {
  kes: msg`who`,
  mis: msg`what`,
  kus: msg`where`,
  millal: msg`when`,
  miks: msg`why`,
  kuidas: msg`how`,
  "kui palju": msg`how much, how many`,
};

const WORDS = KUSIMUSED_ASKED.map(({ word }) => word);

const option = (word: Word) => ({ id: clipId(word), label: { et: word }, sub: ABOUT[word] });

const SLIPS: Partial<Record<Word, Word>> = { kes: "kus", kus: "kes", mis: "miks", miks: "mis" };

const heard = ({ word, answers }: Asked): ChoiceDrill => {
  const slip = SLIPS[word];
  return {
    kind: "choice",
    id: `hear-${clipId(word)}`,
    rule: "word",
    say: answers[0],
    answer: option(word),
    ...(slip ? { slip: option(slip) } : {}),
    wrong: WORDS.filter((each) => each !== word && each !== slip).map(option),
    explain: msg`The question word comes first: <et>${word}</et>.`,
  };
};

const asked = ({ word, reply, answers }: Asked): SentenceDrill => ({
  kind: "ask",
  id: `ask-${clipId(word)}`,
  rule: "ask",
  reply,
  say: answers[0],
  answers,
  explain: msg`Start with <et>${word}</et>, and give the verb the ending for the person you ask.`,
});

const MEANS: readonly MessageDescriptor[] = [
  msg`Do you live in Tallinn?`,
  msg`Where do you work?`,
  msg`Do you speak Estonian?`,
  msg`Who speaks Estonian?`,
  msg`Is he at home?`,
  msg`Where is he?`,
  msg`Do you drink coffee?`,
  msg`What are you reading?`,
];

const KAS = msg`A yes-or-no question starts with <et>kas</et>.`;
const WORD = msg`A question word replaces <et>kas</et>; never use both.`;

const translated = (index: number): SentenceDrill => {
  const { kind, answers } = KUSIMUSED_TRANSLATED[index] as (typeof KUSIMUSED_TRANSLATED)[number];
  return {
    kind: "translate",
    id: `translate-${clipId(answers[0])}`,
    rule: "kas",
    prompt: MEANS[index] as MessageDescriptor,
    say: answers[0],
    answers,
    explain: kind === "kas" ? KAS : WORD,
  };
};

const made = (from: string, index: number): SentenceDrill => {
  const { answers } = KUSIMUSED_TRANSLATED[index] as (typeof KUSIMUSED_TRANSLATED)[number];
  return {
    kind: "rewrite",
    id: `kas-${clipId(answers[0])}`,
    rule: "kas",
    from,
    cue: msg`ask with kas`,
    say: answers[0],
    answers: [answers[0]],
    explain: msg`Put <et>kas</et> in front; every other word stays where it was.`,
  };
};

export const DRILLS: DrillBank = {
  rules: {
    word: { label: msg`The question word by ear`, section: "which-word" },
    ask: { label: msg`Writing the question for an answer`, section: "ask" },
    kas: { label: msg`<et>Kas</et> or a question word`, section: "kas-or-word" },
  },
  items: [
    ...KUSIMUSED_ASKED.map(heard),
    {
      kind: "dictation",
      id: "write-kus-ta-on",
      rule: "word",
      say: "Kus ta on?",
      answers: ["Kus ta on?"],
      explain: msg`<et>Kus</et>, where, not <et>kes</et>, who.`,
    },
    {
      kind: "dictation",
      id: "write-kes-raagib",
      rule: "word",
      say: "Kes räägib eesti keelt?",
      answers: ["Kes räägib eesti keelt?"],
      explain: msg`<et>Kes</et>, who, not <et>kus</et>, where.`,
    },
    ...KUSIMUSED_ASKED.map(asked),
    ...[0, 1, 2, 3, 5, 7].map(translated),
    made("Sa elad Tallinnas.", 0),
    made("Sa räägid eesti keelt.", 2),
    made("Ta on kodus.", 4),
    made("Sa jood kohvi.", 6),
  ],
};
