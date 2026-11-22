const VOWELS: Readonly<Record<string, string>> = {
  அ: "a",
  ஆ: "ā",
  இ: "i",
  ஈ: "ī",
  உ: "u",
  ஊ: "ū",
  எ: "e",
  ஏ: "ē",
  ஐ: "ai",
  ஒ: "o",
  ஓ: "ō",
  ஔ: "au",
};

const SIGNS: Readonly<Record<string, string>> = {
  "ா": "ā",
  "ி": "i",
  "ீ": "ī",
  "ு": "u",
  "ூ": "ū",
  "ெ": "e",
  "ே": "ē",
  "ை": "ai",
  "ொ": "o",
  "ோ": "ō",
  "ௌ": "au",
};

const PULLI = "்";
const AYTHAM = "ஃ";
const JOINERS = /[\u{200c}\u{200d}]/u;

const CONSONANTS: Readonly<Record<string, string>> = {
  க: "k",
  ங: "ṅ",
  ச: "ch",
  ஞ: "ñ",
  ட: "ṭ",
  ண: "ṇ",
  த: "t",
  ந: "n",
  ப: "p",
  ம: "m",
  ய: "y",
  ர: "r",
  ல: "l",
  வ: "v",
  ழ: "zh",
  ள: "ḷ",
  ற: "r",
  ன: "n",
  ஜ: "j",
  ஷ: "sh",
  ஸ: "s",
  ஶ: "sh",
  ஹ: "h",
};

const VOICED: Readonly<Record<string, { vowel: string; nasal: string }>> = {
  க: { vowel: "g", nasal: "g" },
  ச: { vowel: "s", nasal: "j" },
  ட: { vowel: "ḍ", nasal: "ḍ" },
  த: { vowel: "d", nasal: "d" },
  ப: { vowel: "b", nasal: "b" },
};

const NASALS = new Set(["ங", "ஞ", "ண", "ந", "ம", "ன"]);
const VOICELESS = new Set(["க", "ச", "ட", "த", "ப", "ற", "ஷ", "ஸ", "ஶ"]);

const AYTHAM_LOANS: Readonly<Record<string, string>> = { ப: "f", ஜ: "z" };

const TAMIL_DIGITS = "௦௧௨௩௪௫௬௭௮௯";

type Consonant = { kind: "consonant"; letter: string; vowel: string | null };
type Unit =
  | Consonant
  | { kind: "vowel"; vowel: string }
  | { kind: "aytham" }
  | { kind: "other"; text: string };

function units(word: string): Unit[] {
  const out: Unit[] = [];
  const chars = [...word.normalize("NFC")].filter((char) => !JOINERS.test(char));
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i] as string;
    const next = chars[i + 1];
    if (Object.hasOwn(CONSONANTS, char)) {
      if (next === PULLI) {
        out.push({ kind: "consonant", letter: char, vowel: null });
        i += 1;
      } else if (next !== undefined && Object.hasOwn(SIGNS, next)) {
        out.push({ kind: "consonant", letter: char, vowel: SIGNS[next] as string });
        i += 1;
      } else out.push({ kind: "consonant", letter: char, vowel: "a" });
    } else if (Object.hasOwn(VOWELS, char)) {
      out.push({ kind: "vowel", vowel: VOWELS[char] as string });
    } else if (char === AYTHAM) out.push({ kind: "aytham" });
    else {
      const digit = TAMIL_DIGITS.indexOf(char);
      out.push({ kind: "other", text: digit >= 0 ? String(digit) : char });
    }
  }
  return out;
}

function stop(letter: string, before: Unit | undefined): string {
  const plain = CONSONANTS[letter] as string;
  const voiced = VOICED[letter] as { vowel: string; nasal: string };
  if (before === undefined || before.kind === "other") return letter === "ச" ? "s" : plain;
  if (before.kind === "aytham") return plain;
  if (before.kind === "vowel" || before.vowel !== null) return voiced.vowel;
  if (NASALS.has(before.letter)) return voiced.nasal;
  if (VOICELESS.has(before.letter)) return plain;
  return voiced.vowel;
}

function consonant(unit: Consonant, before: Unit | undefined, after: Unit | undefined): string {
  const { letter, vowel } = unit;
  const next = after?.kind === "consonant" ? after.letter : null;
  if (letter === "ற") {
    if (vowel === null && next === "ற") return "t";
    const prior = before?.kind === "consonant" && before.vowel === null ? before.letter : null;
    return prior === "ன" ? "dr" : "r";
  }
  if (vowel === null) return letter === "ச" && next === "ச" ? "c" : (CONSONANTS[letter] as string);
  return Object.hasOwn(VOICED, letter) ? stop(letter, before) : (CONSONANTS[letter] as string);
}

export function readTamilWord(word: string): string {
  const parts = units(word);
  let out = "";
  for (let i = 0; i < parts.length; i++) {
    const unit = parts[i] as Unit;
    if (unit.kind === "vowel") out += unit.vowel;
    else if (unit.kind === "other") out += unit.text;
    else if (unit.kind === "aytham") {
      const after = parts[i + 1];
      const loan = after?.kind === "consonant" ? AYTHAM_LOANS[after.letter] : undefined;
      if (loan !== undefined && after?.kind === "consonant") {
        out += loan + (after.vowel ?? "");
        i += 1;
      } else out += "h";
    } else out += consonant(unit, parts[i - 1], parts[i + 1]) + (unit.vowel ?? "");
  }
  return out;
}
