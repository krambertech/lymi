import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { ChoiceDrill, DrillBank, FormDrill } from "../../../lib/learn/drill";
import { numberWords } from "../../../lib/learn/estonian-numbers";

const TEIST = msg`<et>-teist</et> makes eleven to nineteen; <et>-kümmend</et> makes the tens.`;
const BOTH = msg`The tens and the ones are two words.`;
const BIG = msg`Hundreds join into one word; thousands stay separate.`;

const typed = (n: number, rule: string, explain: MessageDescriptor): FormDrill => ({
  kind: "form",
  id: `words-${n}`,
  rule,
  base: String(n),
  gloss: msg`a number`,
  cue: msg`in words`,
  answers: [numberWords(n)],
  say: numberWords(n),
  explain,
});

const MEANS: Record<number, MessageDescriptor> = {
  2: msg`two`,
  6: msg`six`,
  8: msg`eight`,
  9: msg`nine`,
  17: msg`seventeen`,
  70: msg`seventy`,
};

const heard = (n: number, other: number, rule: string, explain: MessageDescriptor): ChoiceDrill => {
  const option = (v: number) => ({
    id: String(v),
    label: { et: numberWords(v) },
    sub: MEANS[v] as MessageDescriptor,
  });
  return {
    kind: "choice",
    id: `hear-${n}`,
    rule,
    say: numberWords(n),
    answer: option(n),
    wrong: [option(other)],
    explain,
  };
};

const ALIKE = msg`<et>Kaks</et> has a short <et>a</et> and a <et>k</et> before the <et>s</et>; <et>kuus</et> a long <et>uu</et>. <et>Kaheksa</et> starts with <et>ka</et>, <et>üheksa</et> with <et>ü</et>.`;

const heardIn = (id: string, said: string, answer: string, wrong: string): ChoiceDrill => ({
  kind: "choice",
  id,
  rule: "sentence",
  say: said,
  answer: { id: answer, label: { et: answer } },
  wrong: [{ id: wrong, label: { et: wrong } }],
  explain: ALIKE,
});

export const DRILLS: DrillBank = {
  rules: {
    teist: { label: msg`<et>-teist</et> or <et>-kümmend</et>`, section: "teist" },
    words: { label: msg`Numbers in words`, section: "words" },
    big: { label: msg`Hundreds and thousands`, section: "big" },
    alike: { label: msg`Numbers that sound alike`, section: "alike" },
    sentence: { label: msg`<et>Kaks</et> or <et>kuus</et> in a sentence`, section: "alike" },
  },
  items: [
    typed(16, "teist", TEIST),
    typed(60, "teist", TEIST),
    typed(15, "teist", TEIST),
    typed(50, "teist", TEIST),
    typed(17, "teist", TEIST),
    typed(70, "teist", TEIST),
    heard(17, 70, "teist", TEIST),
    heard(70, 17, "teist", TEIST),
    typed(27, "words", BOTH),
    typed(43, "words", BOTH),
    typed(68, "words", BOTH),
    typed(91, "words", BOTH),
    typed(400, "big", BIG),
    typed(300, "big", BIG),
    typed(1000, "big", msg`<et>Tuhat</et> alone, with no “one” in front.`),
    typed(3000, "big", BIG),
    heard(2, 6, "alike", ALIKE),
    heard(6, 2, "alike", ALIKE),
    heard(8, 9, "alike", ALIKE),
    heard(9, 8, "alike", ALIKE),
    heardIn("two-cats", "Mul on kaks kassi.", "kaks", "kuus"),
    heardIn("six-cats", "Mul on kuus kassi.", "kuus", "kaks"),
    heardIn("coffee-two", "Kohv maksab kaks eurot.", "kaks", "kuus"),
    heardIn("coffee-six", "Kohv maksab kuus eurot.", "kuus", "kaks"),
  ],
};
