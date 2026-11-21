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
