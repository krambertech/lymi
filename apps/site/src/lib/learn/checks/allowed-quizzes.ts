/**
 * Options the near-option check flags that stay, each with its reason: the quiz is about telling
 * such forms apart, so the learner has to hear which one it was. Without `pair`, every near pair
 * the quiz offers stays.
 */
export const ALLOWED_NEAR_PAIRS: readonly {
  lesson: string;
  quiz: string;
  pair?: readonly [string, string];
  reason: string;
}[] = [
  {
    lesson: "eitus",
    quiz: "make-no",
    reason:
      "The quiz asks whether the ending stays after ei: Ma ei õpi against Ma ei õpin is the lesson.",
  },
  {
    lesson: "eitus",
    quiz: "answer-no",
    reason:
      "The quiz asks whether the ending stays after ei: Ei loe against Ei loed is the lesson.",
  },
  {
    lesson: "laual-lauale-laualt",
    quiz: "which-question",
    pair: ["kus?", "kust?"],
    reason:
      "The options are the three question words, each the answer twice in six rounds; the learner hears tööl or töölt alone and tells kus from kust by that ending.",
  },
  {
    lesson: "mul-on",
    quiz: "maris-note",
    reason: "-l against the bare form is the lesson: Emal against Ema, Jaanil against Jaan.",
  },
  {
    lesson: "omastav",
    quiz: "kati-family",
    reason:
      "Each gap asks who or whose: Jaan against Jaani and kass against kassi is the lesson, and the pronoun gaps (mina, minu) are the same length.",
  },
  {
    lesson: "majas-majja-majast",
    quiz: "which-question",
    pair: ["kus?", "kust?"],
    reason:
      "The options are the three questions, all offered every round in a shuffled order, so shape picks nothing: kus against kust is the lesson.",
  },
  {
    lesson: "meeldima",
    quiz: "mari-message",
    reason:
      "The gaps ask for the -l form or the -le form: mul on igav against mulle meeldib is the lesson, and the words around each gap decide it.",
  },
  {
    lesson: "osastav",
    quiz: "one-or-more",
    reason:
      "The quiz asks for the first or the third form after a number: kass after üks, kassi after kaks. Each run asks three of each, so the longer form wins half the time.",
  },
  {
    lesson: "osastav",
    quiz: "market-day",
    reason:
      "Each gap asks for the first or the third form: üks leib against kilo juustu. Three of seven gaps want the first, so the longer form scores four of seven.",
  },
];

/**
 * Quizzes where a cheap rule beats chance because the rule is what the lesson teaches, each with
 * its reason. `strategy` is the rule's name in `STRATEGIES` (giveaways.ts).
 */
export const ALLOWED_STRATEGIES: readonly {
  lesson: string;
  quiz: string;
  strategy: string;
  reason: string;
}[] = [
  {
    lesson: "eitus",
    quiz: "make-no",
    strategy: "pick the shortest",
    reason:
      "After ei the verb drops its ending, so the shortest form is the grammar being taught: Ma ei õpi, not Ma ei õpin.",
  },
  {
    lesson: "eitus",
    quiz: "answer-no",
    strategy: "pick the shortest",
    reason:
      "After ei the verb drops its ending, so the shortest form is the grammar being taught: Ei loe, not Ei loed.",
  },
];
