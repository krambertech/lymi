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
    lesson: "peal-all-taga",
    quiz: "where-is-miisu",
    reason:
      "Each gap offers one place word's kus, kuhu and kust forms: peal against peale and pealt is the lesson, and the verb before each gap decides it.",
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
    lesson: "raamatut-voi-raamatu",
    quiz: "part-or-whole",
    reason:
      "Each round offers the forms of one noun: raamatu against raamatut and pileti against piletit is the lesson, and the words around the gap decide it.",
  },
  {
    lesson: "raamatuid-maju",
    quiz: "two-or-many",
    reason:
      "Each round offers one noun's singular third form, plural third form and plural: õuna against õunad is the lesson, and the word before the gap decides it.",
  },
  {
    lesson: "laheksin",
    quiz: "would-endings",
    reason:
      "Each round offers one verb's conditional for sa, me and ta: läheks against läheksid and läheksime is the lesson, and the pronoun before the gap decides it.",
  },
  {
    lesson: "labi-metsa",
    quiz: "which-form",
    reason:
      "Each round offers one noun's genitive and partitive: pargi against parki is the lesson, and the word before the gap decides it.",
  },
  {
    lesson: "lahme-las",
    quiz: "lets-or-las",
    reason:
      "Each round offers one verb's ta, nad and let's forms: sööb against söövad and sööme is the lesson, and the words before the gap decide it.",
  },
  {
    lesson: "raagitakse",
    quiz: "who-does-it",
    reason:
      "Each round offers one verb's personal, impersonal and past impersonal forms: avab against avatakse and avati is the lesson, and the words around the gap decide it.",
  },
  {
    lesson: "jalg-jala",
    quiz: "kati-room",
    reason:
      "Each gap offers forms of one word: toa against toas and kapi against kapis is the lesson, and the words around each gap decide the case.",
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
