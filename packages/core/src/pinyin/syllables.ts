/**
 * Pinyin's closed set of toneless syllables, built from initials and finals with the spelling
 * rules: y and w for a missing initial, ü written u after j, q, x and y, and the contracted iu, ui
 * and un.
 */

const OPEN = ["a", "e", "ai", "ei", "ao", "ou", "an", "en", "ang", "eng"];
const OPEN_ONG = [...OPEN, "ong"];
const FRONT = ["i", "ie", "iao", "iu", "ian", "in", "ing"];
const FRONT_FULL = [...FRONT, "ia", "iang"];

/** The finals each class of initial takes, written as they follow a consonant. */
const CLASSES: readonly [initials: string[], finals: string[]][] = [
  [
    ["b", "p", "m", "f"],
    [...OPEN, "o", ...FRONT, "u"],
  ],
  [
    ["d", "t"],
    [...OPEN_ONG, ...FRONT_FULL, "u", "uo", "ui", "uan", "un"],
  ],
  [
    ["n", "l"],
    [...OPEN_ONG, "o", ...FRONT_FULL, "u", "uo", "uan", "un", "ü", "üe"],
  ],
  [
    ["g", "k", "h"],
    [...OPEN_ONG, "u", "ua", "uo", "uai", "ui", "uan", "un", "uang"],
  ],
  [
    ["j", "q", "x"],
    [...FRONT_FULL, "iong", "u", "ue", "uan", "un"],
  ],
  [
    ["zh", "ch", "sh", "r"],
    [...OPEN_ONG, "i", "u", "ua", "uo", "uai", "ui", "uan", "un", "uang"],
  ],
  [
    ["z", "c", "s"],
    [...OPEN_ONG, "i", "u", "uo", "ui", "uan", "un"],
  ],
];

/** Syllables with no initial, in their written forms. */
const BARE = [
  ...[...OPEN, "o", "er"],
  ...["yi", "ya", "ye", "yao", "you", "yan", "yin", "yang", "ying", "yong", "yo"],
  ...["wu", "wa", "wo", "wai", "wei", "wan", "wen", "wang", "weng"],
  ...["yu", "yue", "yuan", "yun"],
];

const SPELLED_BUT_NEVER_READ = new Set(
  `be bou biu pe piu fe fai fao fi fie fiu fian fin fing din diang ten tiu tin tia tiang
  no nia len chei shong ra rai rei ruai ruang sei`.split(/\s+/),
);

/** Interjections outside the table, accepted only as a whole word so they never cut another apart. */
export const INTERJECTIONS: ReadonlySet<string> = new Set(["ê", "m", "n", "ng", "hm", "hng"]);

export const SYLLABLES: ReadonlySet<string> = new Set([
  ...BARE,
  ...CLASSES.flatMap(([initials, finals]) =>
    initials.flatMap((initial) => finals.map((final) => initial + final)),
  ).filter((syllable) => !SPELLED_BUT_NEVER_READ.has(syllable)),
]);

/** The longest syllable, zhuang, with an erhua r. */
export const SYLLABLE_MAX = 7;
