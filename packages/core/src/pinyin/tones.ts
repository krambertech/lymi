import { SYLLABLES } from "./syllables";

const MARKED: Record<string, string> = {
  a: "āáǎà",
  e: "ēéěè",
  i: "īíǐì",
  o: "ōóǒò",
  u: "ūúǔù",
  ü: "ǖǘǚǜ",
};

const PLAIN = new Map<string, string>(
  Object.entries(MARKED).flatMap(([vowel, marks]) =>
    [...marks].flatMap((mark) => [
      [mark, vowel],
      [mark.toUpperCase(), vowel.toUpperCase()],
    ]),
  ),
);

export function untoned(char: string): { plain: string; toned: boolean } {
  const plain = PLAIN.get(char);
  return plain ? { plain, toned: true } : { plain: char, toned: false };
}

export function hasToneMark(text: string): boolean {
  return [...text.normalize("NFC")].some((char) => PLAIN.has(char));
}

function markAt(syllable: string): number {
  const lower = syllable.toLowerCase();
  const ae = lower.search(/[ae]/);
  if (ae >= 0) return ae;
  const ou = lower.indexOf("ou");
  if (ou >= 0) return ou;
  for (let i = lower.length - 1; i >= 0; i--) if ("iouü".includes(lower[i] as string)) return i;
  return -1;
}

function marked(syllable: string, tone: number): string {
  const at = tone >= 1 && tone <= 4 ? markAt(syllable) : -1;
  if (at < 0) return syllable;
  const vowel = syllable[at] as string;
  const mark = (MARKED[vowel.toLowerCase()] as string)[tone - 1] as string;
  const cased = vowel === vowel.toLowerCase() ? mark : mark.toUpperCase();
  return syllable.slice(0, at) + cased + syllable.slice(at + 1);
}

const NUMBERED = /([a-zü:]+)([0-5])/giu;

function isSyllable(letters: string): boolean {
  const lower = letters.toLowerCase();
  return SYLLABLES.has(lower) || (lower.endsWith("r") && SYLLABLES.has(lower.slice(0, -1)));
}

const APART_R = /^r$/i;

export function toneMarks(text: string): string {
  let whole = true;
  let matched = false;
  const out = text.normalize("NFC").replace(NUMBERED, (match, letters: string, tone: string) => {
    if (APART_R.test(letters) && (tone === "5" || tone === "0")) return letters;
    const spelled = letters.replace(/u:/gi, (u) => (u[0] === "U" ? "Ü" : "ü"));
    const syllable = spelled.replace(/v/g, "ü").replace(/V/g, "Ü");
    if (!isSyllable(syllable)) {
      whole = false;
      return match;
    }
    matched = true;
    const erhua =
      syllable.length > 1 && /r$/i.test(syllable) && !SYLLABLES.has(syllable.toLowerCase());
    return erhua
      ? `${marked(syllable.slice(0, -1), Number(tone))}${syllable.slice(-1)}`
      : marked(syllable, Number(tone));
  });
  return matched && whole && !/\d/.test(out) ? out : text;
}
