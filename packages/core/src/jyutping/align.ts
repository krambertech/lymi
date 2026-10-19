import { isHan } from "../pinyin/align";
import { cleanJyutping, type ReadingToken, readingTokens } from "./split";

/** One run of text, with the Jyutping drawn over it when it has some. */
export type JyutpingSegment = { text: string; reading?: string };

/** Letters and digits, which stay plain and may be read as written. */
const WORD = /[\p{L}\p{N}]/u;

/** Past this many characters a term is a passage, and its reading goes over it whole. */
const ALIGN_MAX = 80;

type Run = { kind: "han" | "word" | "other"; text: string };

/** Each Han character alone, by code point so 𨋢 is one, letters and digits together, and the rest together. */
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
 * The term with one syllable over each Han character, or null when they do not fit. Letters and
 * digits stay plain and take a word of the reading only when it is them as written (卡拉OK, kaa1
 * laa1 OK).
 */
export function alignJyutping(
  term: string,
  tokens: readonly ReadingToken[],
): JyutpingSegment[] | null {
  const queue = tokens.flatMap((token) =>
    token.syllables
      ? token.syllables.map((text) => ({ text, word: false }))
      : [{ text: token.word, word: true }],
  );
  const out: JyutpingSegment[] = [];
  let next = 0;
  for (const run of runs(term)) {
    if (run.kind === "han") {
      const syllable = queue[next];
      if (!syllable || syllable.word) return null;
      next += 1;
      out.push({ text: run.text, reading: syllable.text });
      continue;
    }
    if (run.kind === "word" && queue[next]?.text.toLowerCase() === run.text.toLowerCase())
      next += 1;
    const last = out.at(-1);
    if (last && last.reading === undefined) last.text += run.text;
    else out.push({ text: run.text });
  }
  return next === queue.length ? out : null;
}

/**
 * A term and its Jyutping as runs to draw: one syllable over each Han character, or the reading
 * over the whole term when the two do not fit. A term without Han characters carries none.
 */
export function jyutpingTermSegments(term: string, reading: string): JyutpingSegment[] {
  const clean = cleanJyutping(reading);
  if (![...term].some(isHan) || !clean) return term ? [{ text: term }] : [];
  const aligned =
    Array.from(term).length <= ALIGN_MAX ? alignJyutping(term, readingTokens(clean)) : null;
  return aligned ?? [{ text: term, reading: clean }];
}
