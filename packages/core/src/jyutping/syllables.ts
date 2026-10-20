/**
 * Jyutping's closed set of toneless syllables, built from initials and finals. Each class of
 * initial takes the rhymes its sounds allow: labials and ng never take a rounded front vowel, the
 * labialised gw, kw and w take few, and a bare vowel stands alone only where Cantonese has one. A
 * rare pairing the classes allow is accepted; it only ever widens a split.
 */

/** A nucleus with the codas it takes, written as finals. */
const rhymes = (nucleus: string, codas: readonly string[]) => codas.map((coda) => nucleus + coda);

const AA = rhymes("aa", ["", "i", "u", "m", "n", "ng", "p", "t", "k"]);
const A = rhymes("a", ["i", "u", "m", "n", "ng", "p", "t", "k"]);
const E = rhymes("e", ["", "i", "u", "m", "ng", "p", "k"]);
const I = rhymes("i", ["", "u", "m", "n", "ng", "p", "t", "k"]);
const O = rhymes("o", ["", "i", "u", "n", "ng", "t", "k"]);
const U = rhymes("u", ["", "i", "n", "ng", "t", "k"]);
const OE = rhymes("oe", ["", "ng", "k"]);
const EO = rhymes("eo", ["i", "n", "t"]);
const YU = rhymes("yu", ["", "n", "t"]);

/** The finals each class of initial takes. */
const CLASSES: readonly [initials: string[], finals: string[]][] = [
  [
    ["d", "t", "n", "l", "g", "k", "h", "z", "c", "s", "j"],
    [...AA, ...A, ...E, ...I, ...O, ...U, ...OE, ...EO, ...YU],
  ],
  [
    ["b", "p", "m", "f"],
    [...AA, ...A, ...E, ...I, ...O, ...U],
  ],
  [["ng"], [...AA, ...A, ...O]],
  [
    ["gw", "kw"],
    [...AA, ...A, "ing", "ik", "o", "ong", "ok"],
  ],
  [["w"], [...AA, ...A, "ing", "ik", "o", "ong", "ok", "u", "ui", "un", "ut"]],
];

/** Syllables with no initial: open vowels, and the syllabic nasals of 唔 m4 and 五 ng5. */
const BARE = [...AA, ...A, ...O, "ei", "uk", "ung", "m", "ng"];

/** Interjections outside the table, accepted only as a whole word so they never cut another apart. */
export const INTERJECTIONS: ReadonlySet<string> = new Set(["hm", "hng"]);

export const SYLLABLES: ReadonlySet<string> = new Set([
  ...BARE,
  ...CLASSES.flatMap(([initials, finals]) =>
    initials.flatMap((initial) => finals.map((final) => initial + final)),
  ),
]);

/** The longest toneless syllable, such as gwaang. */
export const SYLLABLE_MAX = 6;

/** A Jyutping tone: 1 to 6, written as a digit after the syllable. */
export const TONE = /^[1-6]$/u;
