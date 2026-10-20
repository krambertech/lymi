import { SYLLABLES } from "./syllables";

/** Each vowel with its first to fourth tone marks. */
const MARKED: Record<string, string> = {
  a: "āáǎà",
  e: "ēéěè",
  i: "īíǐì",
  o: "ōóǒò",
  u: "ūúǔù",
  ü: "ǖǘǚǜ",
};

/** Each marked vowel, either case, as its plain vowel. */
const PLAIN = new Map<string, string>(
  Object.entries(MARKED).flatMap(([vowel, marks]) =>
    [...marks].flatMap((mark) => [
      [mark, vowel],
      [mark.toUpperCase(), vowel.toUpperCase()],
    ]),
  ),
);

/** A letter without its tone mark, and whether it carried one; ü keeps its dots. */
export function untoned(char: string): { plain: string; toned: boolean } {
  const plain = PLAIN.get(char);
  return plain ? { plain, toned: true } : { plain: char, toned: false };
}

/** Whether text carries any tone mark. */
export function hasToneMark(text: string): boolean {
  return [...text.normalize("NFC")].some((char) => PLAIN.has(char));
}

/** Which vowel takes the mark: a or e, else the o of ou, else the last vowel. */
function markAt(syllable: string): number {
  const lower = syllable.toLowerCase();
  const ae = lower.search(/[ae]/);
  if (ae >= 0) return ae;
  const ou = lower.indexOf("ou");
  if (ou >= 0) return ou;
  for (let i = lower.length - 1; i >= 0; i--) if ("iouü".includes(lower[i] as string)) return i;
  return -1;
}

/** A toneless syllable with tone 1–4 marked on it; 5 or 0 is the neutral tone and takes none. */
function marked(syllable: string, tone: number): string {
  const at = tone >= 1 && tone <= 4 ? markAt(syllable) : -1;
  if (at < 0) return syllable;
  const vowel = syllable[at] as string;
  const mark = (MARKED[vowel.toLowerCase()] as string)[tone - 1] as string;
  const cased = vowel === vowel.toLowerCase() ? mark : mark.toUpperCase();
  return syllable.slice(0, at) + cased + syllable.slice(at + 1);
}

const NUMBERED = /([a-zü:]+)([0-5])/giu;

/** Whether letters are a syllable, or a syllable with an erhua r. */
function isSyllable(letters: string): boolean {
  const lower = letters.toLowerCase();
  return SYLLABLES.has(lower) || (lower.endsWith("r") && SYLLABLES.has(lower.slice(0, -1)));
}

/** An erhua r written as its own neutral syllable, as CC-CEDICT does: yi1 dian3 r5. */
const APART_R = /^r$/i;

/**
 * Pinyin written with tone numbers as tone marks: ni3 hao3 → nǐ hǎo, lv4 and lu:4 → lǜ, ma5 → ma,
 * and an erhua r5 → r.
 * Text is returned as written unless every digit in it ends a syllable, since only then can it
 * mean one thing.
 */
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
