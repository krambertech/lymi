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

/** A run of Latin letters, which Cantonese may read a syllable a letter (A貨, ei1 fo3) or as one. */
const LATIN = /^\p{Script=Latin}+$/u;

type Queued = { text: string; word: boolean };

/** The ways a run of letters or digits may take the reading at `next`: how many items, and whether they are drawn over it. */
function wordOptions(run: Run, queue: readonly Queued[], next: number) {
  const out: { take: number; drawn: boolean }[] = [];
  if (queue[next]?.text.toLowerCase() === run.text.toLowerCase())
    out.push({ take: 1, drawn: false });
  if (LATIN.test(run.text)) {
    const letters = [...run.text].length;
    const syllables = (take: number) =>
      take > 0 && queue.slice(next, next + take).filter((item) => !item.word).length === take;
    if (letters > 1 && syllables(letters)) out.push({ take: letters, drawn: true });
    if (syllables(1)) out.push({ take: 1, drawn: true });
  }
  out.push({ take: 0, drawn: false });
  return out;
}

/**
 * The term with one syllable over each Han character, or null when they do not fit. Letters take
 * a word of the reading that is them as written (卡拉OK, kaa1 laa1 OK), else a syllable a letter or
 * one for the run (T恤, ti1 seot1), else none; digits stay plain.
 */
export function alignJyutping(
  term: string,
  tokens: readonly ReadingToken[],
): JyutpingSegment[] | null {
  const queue = tokens.flatMap<Queued>((token) =>
    token.syllables
      ? token.syllables.map((text) => ({ text, word: false }))
      : [{ text: token.word, word: true }],
  );
  const parts = runs(term);
  const failed = new Set<string>();
  const visit = (at: number, next: number): JyutpingSegment[] | null => {
    const run = parts[at];
    if (!run) return next === queue.length ? [] : null;
    if (failed.has(`${at}:${next}`)) return null;
    const options =
      run.kind === "han"
        ? queue[next]?.word === false
          ? [{ take: 1, drawn: true }]
          : []
        : run.kind === "word"
          ? wordOptions(run, queue, next)
          : [{ take: 0, drawn: false }];
    for (const { take, drawn } of options) {
      const rest = visit(at + 1, next + take);
      if (!rest) continue;
      const reading = queue
        .slice(next, next + take)
        .map((item) => item.text)
        .join(" ");
      return [drawn ? { text: run.text, reading } : { text: run.text }, ...rest];
    }
    failed.add(`${at}:${next}`);
    return null;
  };
  const segments = visit(0, 0);
  if (!segments) return null;
  const out: JyutpingSegment[] = [];
  for (const segment of segments) {
    const last = out.at(-1);
    if (segment.reading === undefined && last && last.reading === undefined)
      last.text += segment.text;
    else out.push(segment);
  }
  return out;
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
