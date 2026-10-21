import { cleanPinyin, type ReadingToken, readingTokens } from "./split";

/** One run of text, with the pinyin drawn over it when it has some. */
export type PinyinSegment = { text: string; reading?: string };

/** Characters pinyin is drawn over, one syllable each. */
const HAN = /\p{Script=Han}/u;
/** The erhua suffix, which shares the syllable before it. */
const ER = /[儿兒]/u;
/** Letters and digits, which stay plain and may be read as written. */
const WORD = /[\p{L}\p{N}]/u;

/** Past this many characters a term is a passage, and its reading goes over it whole. */
const ALIGN_MAX = 80;

export const isHan = (char: string) => HAN.test(char);

type Run = { kind: "han" | "word" | "other"; text: string };

/** Each Han character alone, letters and digits together, and the rest together. */
function runs(text: string): Run[] {
  const out: Run[] = [];
  for (const char of text) {
    const kind = isHan(char) ? "han" : WORD.test(char) ? "word" : "other";
    const last = out.at(-1);
    if (kind !== "han" && last?.kind === kind) last.text += char;
    else out.push({ kind, text: char });
  }
  return out;
}

/**
 * The term with one syllable over each Han character, or null when they do not fit. 儿 after a
 * syllable ending in erhua r shares it (一点儿, yīdiǎnr); letters and digits stay plain and take
 * a word of the reading only when it is them as written (卡拉OK, kǎlā OK).
 */
export function alignPinyin(term: string, tokens: readonly ReadingToken[]): PinyinSegment[] | null {
  const queue = tokens.flatMap((token) =>
    token.syllables
      ? token.syllables.map((syllable) => ({ ...syllable, word: false }))
      : [{ text: token.word, erhua: false, word: true }],
  );
  const out: PinyinSegment[] = [];
  let next = 0;
  let erhua = false;
  for (const run of runs(term)) {
    const last = out.at(-1);
    if (run.kind === "han") {
      if (ER.test(run.text) && erhua && last?.reading !== undefined) {
        last.text += run.text;
        erhua = false;
        continue;
      }
      const syllable = queue[next];
      if (!syllable || syllable.word) return null;
      next += 1;
      erhua = syllable.erhua;
      out.push({ text: run.text, reading: syllable.text });
      continue;
    }
    erhua = false;
    if (run.kind === "word" && queue[next]?.text.toLowerCase() === run.text.toLowerCase())
      next += 1;
    if (last && last.reading === undefined) last.text += run.text;
    else out.push({ text: run.text });
  }
  return next === queue.length ? out : null;
}

/**
 * A term and its pinyin as runs to draw: one syllable over each Han character, or the reading over
 * the whole term when the two do not fit. A term without Han characters carries none.
 */
export function pinyinTermSegments(term: string, reading: string): PinyinSegment[] {
  const clean = cleanPinyin(reading);
  if (![...term].some(isHan) || !clean) return term ? [{ text: term }] : [];
  const tokens = readingTokens(clean);
  const aligned = Array.from(term).length <= ALIGN_MAX ? alignPinyin(term, tokens) : null;
  return aligned ?? [{ text: term, reading: clean }];
}
