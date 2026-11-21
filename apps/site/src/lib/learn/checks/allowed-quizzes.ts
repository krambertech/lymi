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
