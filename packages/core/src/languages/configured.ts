/**
 * Configured languages: a row of data each, with no engine. docs/proposals/supported-languages.md,
 * Tiers, and docs/proposals/long-tail-languages.md for the enrichment gate.
 */
import type { LanguageFormat } from "./types";

/** A field a language deck lets the AI fill from the start, besides the meaning and the example. */
type StartingField = "notes" | "pronunciation";

export interface LanguageConfig {
  /** What the card form calls the field. */
  pronunciation: "pronunciation";
  /** ISO 15924 codes of the scripts its terms are written in. */
  scripts: readonly string[];
  /** How its cards are written where that differs from the general way, or null where it does not. */
  format: LanguageFormat | null;
  /** Other primary subtags learners use for the same language, such as `tl` for Filipino. */
  aliases?: readonly string[];
  starts: readonly StartingField[];
  /**
   * Whether enrichment fills a new language deck's cards unasked. True only while the language's
   * recorded evaluation passes the bar, which recorded-run.test.ts in apps/web holds it to.
   */
  enrichByDefault: boolean;
}

export const CONFIGURED: Readonly<Record<string, LanguageConfig>> = {
  ko: {
    pronunciation: "pronunciation",
    scripts: ["Kore"],
    format: {
      name: "Korean",
      pronunciation: "How the term is said, in Hangul, only where that differs from its spelling.",
      empty: "the term is said as written",
      never: "Not romanization or IPA.",
      sample: { term: "학교", pronunciation: "학꾜" },
      duplicates: "term",
    },
    starts: ["notes", "pronunciation"],
    enrichByDefault: true,
  },
  fil: {
    pronunciation: "pronunciation",
    scripts: ["Latn"],
    aliases: ["tl"],
    format: {
      name: "Filipino",
      pronunciation:
        "The term with its stress marks: an acute on the stressed vowel (báhay), a grave on a final vowel that ends in a glottal stop (bátà), and a circumflex where the two meet (basâ).",
      empty: null,
      never: "Not IPA.",
      sample: { term: "bata", pronunciation: "bátà" },
      duplicates: "term",
    },
    starts: ["notes", "pronunciation"],
    enrichByDefault: true,
  },
  vi: {
    pronunciation: "pronunciation",
    scripts: ["Latn"],
    format: {
      name: "Vietnamese",
      pronunciation:
        "How the term is said, in Vietnamese spelling with every tone mark, only where the term does not show it: a term typed without its tone marks, or an abbreviation (km → ki-lô-mét).",
      empty: "the term is written with its tone marks",
      never: "Not IPA.",
      sample: { term: "cam on", pronunciation: "cảm ơn" },
      duplicates: "term",
    },
    starts: ["pronunciation"],
    enrichByDefault: true,
  },
  ka: {
    pronunciation: "pronunciation",
    scripts: ["Geor"],
    format: {
      name: "Georgian",
      pronunciation:
        "The term romanized letter by letter in the national system, with an apostrophe after each ejective: კ k', პ p', ტ t', წ ts', ჭ ch', ყ q'.",
      empty: null,
      never: "Not IPA.",
      sample: { term: "ჭიქა", pronunciation: "ch'ika" },
      duplicates: "term",
    },
    starts: ["pronunciation"],
    enrichByDefault: true,
  },
  hy: {
    pronunciation: "pronunciation",
    scripts: ["Armn"],
    format: {
      name: "Armenian",
      pronunciation:
        "How the term is said in Eastern Armenian, romanized: an apostrophe after each aspirated consonant (թ t', փ p', ք k', ց ts', չ ch'), ու as u, ը as ə, and ե as ye, ո as vo and և as yev at the start of a word.",
      empty: null,
      never: "Not IPA.",
      sample: { term: "քույր", pronunciation: "k'uyr" },
      duplicates: "term",
    },
    starts: ["pronunciation"],
    enrichByDefault: true,
  },
  ta: {
    pronunciation: "pronunciation",
    scripts: ["Taml"],
    format: {
      name: "Tamil",
      pronunciation:
        "The written term as it is read aloud, romanized: long vowels with a macron (ā ī ū ē ō), retroflex consonants with a dot below (ṭ ḍ ṇ ḷ), ழ as zh, both ந and ன as n, and each stop voiced where it is said voiced.",
      empty: null,
      never: "Not IPA.",
      sample: { term: "தம்பி", pronunciation: "tambi" },
      duplicates: "term",
    },
    starts: ["pronunciation"],
    enrichByDefault: true,
  },
  et: {
    pronunciation: "pronunciation",
    scripts: ["Latn"],
    format: null,
    starts: ["notes"],
    enrichByDefault: true,
  },
  fi: {
    pronunciation: "pronunciation",
    scripts: ["Latn"],
    format: null,
    starts: ["notes"],
    enrichByDefault: true,
  },
  lv: {
    pronunciation: "pronunciation",
    scripts: ["Latn"],
    format: null,
    starts: ["notes"],
    enrichByDefault: true,
  },
  lt: {
    pronunciation: "pronunciation",
    scripts: ["Latn"],
    format: {
      name: "Lithuanian",
      pronunciation:
        "The term with its accent mark, as Lithuanian dictionaries print it: an acute, grave or tilde on the stressed syllable (výras, kalbà).",
      empty: null,
      never: "Not IPA.",
      sample: { term: "namas", pronunciation: "nãmas" },
      duplicates: "term",
    },
    // Its accents miss often enough live that pronunciation waits for the owner to turn it on.
    starts: ["notes"],
    enrichByDefault: true,
  },
  nb: {
    pronunciation: "pronunciation",
    scripts: ["Latn"],
    aliases: ["no"],
    format: null,
    starts: ["notes"],
    enrichByDefault: true,
  },
  nn: {
    pronunciation: "pronunciation",
    scripts: ["Latn"],
    format: null,
    starts: ["notes"],
    enrichByDefault: true,
  },
  da: {
    pronunciation: "pronunciation",
    scripts: ["Latn"],
    format: {
      name: "Danish",
      pronunciation:
        "How the word is said, in IPA as Den Danske Ordbog writes it: stress ˈ, length ː and stød ˀ, leaving out the letters that are not said.",
      empty: null,
      never: "Not a respelling.",
      sample: { term: "hus", pronunciation: "ˈhuˀs" },
      duplicates: "term",
    },
    starts: ["notes", "pronunciation"],
    enrichByDefault: true,
  },
  sv: {
    pronunciation: "pronunciation",
    scripts: ["Latn"],
    format: null,
    starts: ["notes"],
    enrichByDefault: true,
  },
  is: {
    pronunciation: "pronunciation",
    scripts: ["Latn"],
    format: null,
    starts: ["notes"],
    enrichByDefault: true,
  },
  pl: {
    pronunciation: "pronunciation",
    scripts: ["Latn"],
    format: null,
    starts: ["notes"],
    enrichByDefault: true,
  },
  nl: {
    pronunciation: "pronunciation",
    scripts: ["Latn"],
    format: null,
    starts: ["notes"],
    enrichByDefault: true,
  },
  de: {
    pronunciation: "pronunciation",
    scripts: ["Latn"],
    format: null,
    starts: ["notes"],
    enrichByDefault: true,
  },
  fr: {
    pronunciation: "pronunciation",
    scripts: ["Latn"],
    format: {
      name: "French",
      pronunciation:
        "IPA, without slashes. In a phrase, mark each liaison with ‿ (les amis → lez‿ami).",
      empty: null,
      never: "Not a respelling.",
      sample: { term: "oiseau", pronunciation: "wazo" },
      duplicates: "term",
    },
    starts: [],
    enrichByDefault: true,
  },
  es: {
    pronunciation: "pronunciation",
    scripts: ["Latn"],
    format: null,
    starts: [],
    enrichByDefault: true,
  },
  it: {
    pronunciation: "pronunciation",
    scripts: ["Latn"],
    format: null,
    starts: [],
    enrichByDefault: true,
  },
  pt: {
    pronunciation: "pronunciation",
    scripts: ["Latn"],
    format: {
      name: "Portuguese",
      pronunciation:
        "IPA as the word is said in Brazil, without slashes; a pt-PT deck is said as in Portugal.",
      empty: null,
      never: "Not a respelling.",
      sample: { term: "obrigado", pronunciation: "obɾiˈɡadu" },
      duplicates: "term",
    },
    starts: [],
    enrichByDefault: true,
  },
  "pt-PT": {
    pronunciation: "pronunciation",
    scripts: ["Latn"],
    format: {
      name: "European Portuguese",
      pronunciation: "IPA as the word is said in Portugal, without slashes.",
      empty: null,
      never: "Not a respelling.",
      sample: { term: "obrigado", pronunciation: "ɔbɾiˈɣaðu" },
      duplicates: "term",
    },
    starts: [],
    enrichByDefault: true,
  },
  hu: {
    pronunciation: "pronunciation",
    scripts: ["Latn"],
    format: null,
    starts: [],
    enrichByDefault: true,
  },
  cs: {
    pronunciation: "pronunciation",
    scripts: ["Latn"],
    format: null,
    starts: [],
    enrichByDefault: true,
  },
};

/** The row's own tag for each tag a configured row answers to, in lower case, its aliases included. */
export const CONFIGURED_TAGS: ReadonlyMap<string, string> = new Map(
  Object.entries(CONFIGURED).flatMap(([tag, row]) =>
    [tag, ...(row.aliases ?? [])].map((each) => [each.toLowerCase(), tag] as const),
  ),
);
