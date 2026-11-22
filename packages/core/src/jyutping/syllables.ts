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

const BARE = [...AA, ...A, ...O, "ei", "uk", "ung", "m", "ng"];

export const INTERJECTIONS: ReadonlySet<string> = new Set(["hm", "hng"]);

export const SYLLABLES: ReadonlySet<string> = new Set([
  ...BARE,
  ...CLASSES.flatMap(([initials, finals]) =>
    initials.flatMap((initial) => finals.map((final) => initial + final)),
  ),
]);

export const SYLLABLE_MAX = 6;

export const TONE = /^[1-6]$/u;
