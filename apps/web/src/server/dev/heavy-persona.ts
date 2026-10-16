import type { Directions } from "@lymi/core";
import type { Persona, PersonaCard, PersonaDeck } from "./personas";

/**
 * The `heavy` persona: two years of daily study, so every list, count and draw runs at the size a
 * devoted learner reaches. Cards are generated from a fixed seed, so every seed is the same.
 */

/** A small deterministic generator, so the persona never changes between seeds. */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SYLLABLES: Record<string, string[]> = {
  it: [
    "ca",
    "so",
    "ri",
    "mel",
    "lo",
    "ta",
    "ven",
    "gio",
    "chia",
    "pre",
    "dol",
    "fi",
    "nu",
    "sca",
    "ber",
    "zo",
    "gna",
    "tre",
    "mon",
    "le",
  ],
  fi: [
    "ta",
    "lo",
    "kka",
    "sii",
    "mä",
    "jär",
    "vi",
    "ne",
    "kou",
    "lu",
    "pel",
    "to",
    "hy",
    "vää",
    "rin",
    "sa",
    "ke",
    "ää",
    "ruo",
    "kai",
  ],
  de: [
    "ver",
    "ge",
    "schaft",
    "lich",
    "keit",
    "an",
    "bau",
    "stein",
    "mit",
    "zug",
    "kraft",
    "werk",
    "un",
    "be",
    "sicht",
    "wald",
    "fahrt",
    "spiel",
    "zeit",
    "haus",
  ],
  es: [
    "ca",
    "mi",
    "no",
    "ra",
    "pe",
    "dor",
    "lle",
    "ta",
    "ción",
    "ven",
    "tu",
    "bra",
    "so",
    "gue",
    "rro",
    "fla",
    "mien",
    "to",
    "cue",
    "llo",
  ],
  "pt-BR": [
    "ção",
    "pa",
    "lha",
    "ver",
    "ma",
    "nho",
    "co",
    "tu",
    "ra",
    "bei",
    "jo",
    "pre",
    "gui",
    "sa",
    "dei",
    "ro",
    "fu",
    "lão",
    "cha",
    "ve",
  ],
  et: [
    "ma",
    "ja",
    "kõ",
    "nel",
    "li",
    "tee",
    "saa",
    "ri",
    "lu",
    "kas",
    "päe",
    "va",
    "mets",
    "jõ",
    "gi",
    "küla",
    "ne",
    "rand",
    "öö",
    "pa",
  ],
  ja: [
    "ka",
    "shi",
    "to",
    "mo",
    "ri",
    "na",
    "yu",
    "ki",
    "sa",
    "ko",
    "ha",
    "ru",
    "te",
    "ne",
    "mi",
    "zu",
    "ho",
    "ra",
    "tsu",
    "wa",
  ],
};

const NOUNS = [
  "window",
  "harbour",
  "receipt",
  "kettle",
  "bridge",
  "ladder",
  "meadow",
  "lantern",
  "ticket",
  "drawer",
  "orchard",
  "pillow",
  "market",
  "sleeve",
  "puddle",
  "chimney",
  "envelope",
  "ferry",
  "garden",
  "hinge",
  "island",
  "jacket",
  "kitchen",
  "letter",
  "mirror",
  "needle",
  "oven",
  "pebble",
  "quarrel",
  "river",
  "saddle",
  "thread",
  "umbrella",
  "valley",
  "wallet",
  "yard",
  "anchor",
  "basket",
  "candle",
  "dough",
];
const VERBS = [
  "to borrow",
  "to whisper",
  "to fold",
  "to wander",
  "to fix",
  "to promise",
  "to rinse",
  "to gather",
  "to lean",
  "to bargain",
  "to hesitate",
  "to sweep",
  "to admit",
  "to soak",
  "to stumble",
  "to measure",
  "to forgive",
  "to hang",
  "to deliver",
  "to notice",
];
const ADJECTIVES = [
  "quiet",
  "stubborn",
  "early",
  "crooked",
  "gentle",
  "sour",
  "narrow",
  "loose",
  "brave",
  "shallow",
  "polite",
  "rough",
  "hollow",
  "eager",
  "plain",
  "dusty",
  "steady",
  "clumsy",
  "bright",
  "thin",
];
const PHRASES = [
  "by the way",
  "in the end",
  "on the other hand",
  "at first sight",
  "for good",
  "in a hurry",
  "out of breath",
  "on purpose",
  "now and then",
  "at the latest",
];
const TAGS = [
  "verbs",
  "nouns",
  "food",
  "travel",
  "work",
  "home",
  "weather",
  "phrases",
  "grammar",
  "false friends",
  "idioms",
  "numbers",
  "body",
  "feelings",
  "time",
  "shopping",
  "health",
  "nature",
  "city",
  "school",
  "formal",
  "slang",
  "irregular",
  "exam",
  "podcast",
  "book",
  "film",
  "colleague",
  "trip 2025",
  "hard",
];

/** Generates a deck's cards: words, phrases and the odd sentence, with fields filled as a real deck's are. */
function cards(
  rng: () => number,
  used: Set<string>,
  language: string,
  count: number,
  ageDays: number,
  sections: string[],
): PersonaCard[] {
  const syllables = SYLLABLES[language] ?? SYLLABLES.it ?? [];
  const pick = <T>(list: readonly T[]): T => list[Math.floor(rng() * list.length)] as T;
  const word = () => {
    let w = "";
    const n = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) w += pick(syllables);
    return w;
  };
  const out: PersonaCard[] = [];
  while (out.length < count) {
    const shape = rng();
    const term =
      shape < 0.7
        ? word()
        : shape < 0.93
          ? `${word()} ${word()}`
          : `${word()} ${word()} ${word()} ${word()} ${word()} ${word()}`;
    const key = `${language} ${term}`;
    if (used.has(key)) continue;
    used.add(key);
    const meaning =
      shape < 0.4
        ? `the ${pick(NOUNS)}`
        : shape < 0.6
          ? pick(VERBS)
          : shape < 0.75
            ? pick(ADJECTIVES)
            : shape < 0.93
              ? `${pick(PHRASES)}; ${pick(ADJECTIVES)} ${pick(NOUNS)}`
              : `a ${pick(ADJECTIVES)} way of saying that the ${pick(NOUNS)} needs ${pick(VERBS).replace("to ", "")}ing before the ${pick(NOUNS)} can be used again`;
    const tagCount = rng() < 0.6 ? Math.floor(rng() * 4) : 0;
    const tags = [...new Set(Array.from({ length: tagCount }, () => pick(TAGS)))];
    out.push({
      term,
      // A few cards are still waiting for a meaning, as real ones do after a quick add.
      ...(rng() < 0.97 && { meaning }),
      ...(rng() < 0.35 && { example: `${word()} ${term} ${word()} ${word()}.` }),
      ...(rng() < 0.2 && { pronunciation: term.replace(/(.)(.)/g, "$1$2-").replace(/-$/, "") }),
      ...(rng() < 0.05 && { notes: `Seen in ${pick(TAGS)}. Not the same as ${word()}.` }),
      ...(tags.length > 0 && { tags }),
      ...(rng() < 0.25 && { source: `Lesson ${1 + Math.floor(rng() * 60)}` }),
      ...(sections.length > 0 && rng() < 0.95 && { section: pick(sections) }),
      // Cards arrive over the deck's life, most of them early.
      introducedDaysAgo: Math.floor(ageDays * (1 - rng() ** 2)),
    });
  }
  return out;
}

interface DeckPlan {
  name: string;
  language: string;
  size: number;
  ageDays: number;
  sections?: number;
  directions?: Directions;
  archived?: boolean;
}

const PLANS: DeckPlan[] = [
  { name: "Everything Italian", language: "it", size: 3000, ageDays: 720 },
  { name: "Suomi 1–24", language: "fi", size: 1500, ageDays: 600, sections: 24 },
  { name: "Deutsch im Beruf", language: "de", size: 800, ageDays: 500, directions: "both" },
  { name: "Español, curso B1", language: "es", size: 500, ageDays: 420, sections: 10 },
  { name: "Português do dia a dia", language: "pt-BR", size: 300, ageDays: 360 },
  { name: "Eesti keel", language: "et", size: 250, ageDays: 300 },
  { name: "日本語 N5", language: "ja", size: 200, ageDays: 260 },
  { name: "Italian verbs", language: "it", size: 150, ageDays: 240, directions: "both" },
  { name: "Finnish cases", language: "fi", size: 150, ageDays: 200 },
  { name: "German idioms", language: "de", size: 150, ageDays: 180 },
  { name: "Podcast words", language: "es", size: 100, ageDays: 150 },
  { name: "Recipes", language: "it", size: 100, ageDays: 130 },
  { name: "Work emails", language: "de", size: 100, ageDays: 110 },
  { name: "Trip to Lisbon", language: "pt-BR", size: 100, ageDays: 90 },
  { name: "Kalevala", language: "fi", size: 100, ageDays: 80 },
  { name: "Song lyrics", language: "es", size: 60, ageDays: 70 },
  { name: "Doctor visits", language: "it", size: 60, ageDays: 60 },
  { name: "Tallinn signs", language: "et", size: 60, ageDays: 50 },
  { name: "Kanji radicals", language: "ja", size: 60, ageDays: 45 },
  { name: "False friends", language: "de", size: 60, ageDays: 40 },
  {
    name: "A very long deck name that keeps going past where any row could hold it",
    language: "it",
    size: 30,
    ageDays: 30,
  },
  { name: "Market", language: "fi", size: 30, ageDays: 20 },
  { name: "Neighbours", language: "es", size: 30, ageDays: 10 },
  { name: "This week", language: "pt-BR", size: 30, ageDays: 5 },
  { name: "Today's lesson", language: "it", size: 12, ageDays: 0 },
  { name: "One card", language: "de", size: 1, ageDays: 3 },
  { name: "Empty for now", language: "es", size: 0, ageDays: 2 },
  { name: "Old Italian", language: "it", size: 100, ageDays: 700, archived: true },
  { name: "Old German", language: "de", size: 100, ageDays: 650, archived: true },
  { name: "Old Finnish", language: "fi", size: 100, ageDays: 550, archived: true },
];

function decks(): PersonaDeck[] {
  const rng = random(0x1e4a7);
  const used = new Set<string>();
  return PLANS.map((plan) => {
    const sections = Array.from({ length: plan.sections ?? 0 }, (_, i) => `Lesson ${i + 1}`);
    return {
      name: plan.name,
      defaultLanguage: plan.language,
      introducedDaysAgo: plan.ageDays,
      ...(plan.directions && { directions: plan.directions }),
      ...(sections.length > 0 && { sections }),
      ...(plan.archived && { archived: true }),
      // An archived deck's terms may come back in a live one, as they do after a fresh start.
      cards: cards(
        rng,
        plan.archived ? new Set() : used,
        plan.language,
        plan.size,
        plan.ageDays,
        sections,
      ),
    };
  });
}

/** Most days for two years, with a gap now and then: about one day in nine is missed. */
function studyDays(): number[] {
  const rng = random(0x5eed);
  return Array.from({ length: 720 }, (_, i) => i).filter((day) => day <= 1 || rng() > 0.11);
}

export const HEAVY: Persona = {
  id: "heavy",
  name: "Vera",
  description:
    "Two years of daily study. 27 decks and about 8,000 cards, tens of thousands of reviews, 400 due.",
  appLanguage: "en",
  reviewDays: studyDays(),
  reviewsPerDay: { min: 40, max: 160 },
  dueNow: 400,
  decks: decks(),
};
