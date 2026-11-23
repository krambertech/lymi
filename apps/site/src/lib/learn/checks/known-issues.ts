/**
 * Lessons merged before a check existed that still break it, by check. Each is fixed in its own
 * PR and then taken off; a lesson on this list is held to every other check, and a new lesson is
 * never added. A listed lesson that passes fails the check, so the list only shrinks.
 */
export const KNOWN_ISSUES: Readonly<Record<string, readonly string[]>> = {
  /** Bare Estonian in prose, such as “the ma form” or “after ei”, read in the page's voice. */
  "estonian-lang": [
    "eitus",
    "kaskiv",
    "kell",
    "kohad",
    "kusimused",
    "mina-sina-tema",
    "numbrid",
    "olevik",
    "paev-tallinnas",
  ],
  /** A quiz whose options for an answer never change, so the set names the answer. */
  "option-sets": ["eitus", "kell", "kusimused", "mina-sina-tema"],
  /**
   * A quiz whose answer favours a place in some round: fixed option orders under eachPairFirst, so
   * a round after the first can be answered by the place, or the word, no earlier round used.
   */
  "answer-place": ["haaldus", "kell", "kohad", "mina-sina-tema"],
  /**
   * A quiz, dialogue or passage whose answer is the option sharing the most words with the others:
   * each wrong reply changes one thing about the right one.
   */
  "majority-option": ["kaskiv", "tutvumine"],
  /**
   * A dialogue's replies or a passage's questions, or a quiz's options in Ukrainian or Russian, that
   * a length rule answers better than chance.
   */
  "cheap-strategy-parts": ["paev-tallinnas", "tutvumine"],
};
