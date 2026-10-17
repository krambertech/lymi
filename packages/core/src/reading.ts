/**
 * Readings drawn over a term or an example: furigana over kanji. A term's reading is its
 * pronunciation, aligned at display; an example carries its readings inline, `食[た]べる`, where
 * a bracketed kana reading belongs to the kanji just before it. docs/card-writing.md.
 */

/** One run of text, with the reading drawn over it when it has one. */
export type ReadingSegment = { text: string; reading?: string };

/** Characters a reading is drawn over: kanji, their iteration marks, and the counter ヶ. */
const BASE = /[\p{Script=Han}〆ヵヶ]/u;
/** Characters a reading is written in. */
const KANA = /[\p{Script=Hiragana}\p{Script=Katakana}ー]/u;
const KANA_TEXT = /^[\p{Script=Hiragana}\p{Script=Katakana}ー・\s]+$/u;
/** An inline reading: up to 30 kana in square brackets. `[sound:…]` and other bracketed text are not. */
const INLINE = /\[([\p{Script=Hiragana}\p{Script=Katakana}ー]{1,30})\]/gu;

/** How far back an inline reading looks for its kanji, so a crafted example stays cheap to read. */
const LOOK_BACK = 20;

/** Languages whose terms Lymi draws a reading over. Chinese can follow once pinyin aligns. */
const DRAWN = new Set(["ja"]);

/** Past this many characters a term is a passage, and its reading goes over it whole. */
const ALIGN_MAX = 80;

const isBase = (char: string) => BASE.test(char);
const isKana = (char: string) => KANA.test(char) && !isBase(char);

/** Katakana as hiragana, so a reading written either way compares and shows as one. */
export function toHiragana(text: string): string {
  return text.replace(/[ァ-ヶ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60));
}

/** "ja" and "ja-JP" are one language: the primary subtag in lower case, "" for no language. */
export function languageKey(language: string | null | undefined): string {
  return language?.split("-")[0]?.toLowerCase() ?? "";
}

/**
 * A kana reading as one form, for duplicates, furigana and audio alike: NFC, no spaces or ・, and
 * katakana folded to hiragana, so ジョウズ, じょう ず and じょうず are one reading.
 */
export function foldReading(reading: string): string {
  return toHiragana(reading.normalize("NFC").replace(/[\s・]/g, ""));
}

/** A Japanese card's pronunciation when it is a kana reading, never IPA, romaji or a hint. */
export function kanaReading(card: {
  language?: string | null | undefined;
  pronunciation?: string | null | undefined;
}): string | null {
  const reading = card.pronunciation?.normalize("NFC").trim();
  if (languageKey(card.language) !== "ja" || !reading) return null;
  return KANA_TEXT.test(reading) ? reading : null;
}

/** The reading the duplicate rule compares: a Japanese card's folded kana reading, else null. */
export function readingKey(card: {
  language?: string | null | undefined;
  pronunciation?: string | null | undefined;
}): string | null {
  const reading = kanaReading(card);
  return reading ? foldReading(reading) : null;
}

/**
 * Whether a term cue shows the card's pronunciation as a line before the reveal: Chinese keeps its
 * pinyin until the card is Known; Japanese draws furigana instead, and other readings wait.
 */
export function cueKeepsReading(language: string | null | undefined, known: boolean): boolean {
  return languageKey(language) === "zh" && !known;
}

type Run = { kind: "base" | "kana" | "other"; text: string };

function runs(text: string): Run[] {
  const out: Run[] = [];
  for (const char of text) {
    const kind = isBase(char) ? "base" : isKana(char) ? "kana" : "other";
    const last = out.at(-1);
    if (last?.kind === kind) last.text += char;
    else out.push({ kind, text: char });
  }
  return out;
}

/**
 * The term's runs matched to the reading, or null when they do not fit: kana in the term must
 * appear in the reading where they stand, and each run of kanji takes the shortest reading that
 * lets the rest fit. Anything else in the term, such as a space, may be absent from the reading.
 */
function align(term: string, reading: string): ReadingSegment[] | null {
  const parts = runs(term);
  const read = toHiragana(reading);
  const failed = new Set<number>();
  const visit = (i: number, at: number): ReadingSegment[] | null => {
    if (i === parts.length) return at === read.length ? [] : null;
    const key = i * (read.length + 1) + at;
    if (failed.has(key)) return null;
    const part = parts[i] as Run;
    let found: ReadingSegment[] | null = null;
    if (part.kind === "base") {
      for (let end = at + 1; end <= read.length && !found; end++) {
        const rest = visit(i + 1, end);
        if (rest) found = [{ text: part.text, reading: reading.slice(at, end) }, ...rest];
      }
    } else {
      const folded = toHiragana(part.text);
      if (read.startsWith(folded, at)) {
        const rest = visit(i + 1, at + folded.length);
        if (rest) found = [{ text: part.text }, ...rest];
      }
      // A space or punctuation may be missing from the reading; a digit or a letter has a sound.
      if (!found && part.kind === "other" && !/[\p{L}\p{N}]/u.test(part.text)) {
        const rest = visit(i + 1, at);
        if (rest) found = [{ text: part.text }, ...rest];
      }
    }
    if (!found) failed.add(key);
    return found;
  };
  return visit(0, 0);
}

/** Plain runs side by side become one. */
function merged(segments: readonly ReadingSegment[]): ReadingSegment[] {
  const out: ReadingSegment[] = [];
  for (const segment of segments) {
    if (!segment.text) continue;
    const last = out.at(-1);
    if (last && last.reading === undefined && segment.reading === undefined) {
      last.text += segment.text;
    } else out.push({ ...segment });
  }
  return out;
}

/** The reading cleaned for drawing: kana as hiragana without spaces or dots; anything else trimmed. */
function cleanReading(reading: string): string {
  const text = reading.normalize("NFC").trim();
  return KANA_TEXT.test(text) ? foldReading(text) : text;
}

/**
 * A term and its reading as runs to draw: kana the two share stay plain and each run of kanji
 * carries its part of the reading (食べる, たべる → 食[た]べる). A word read as a whole, such as
 * 今日 read きょう, carries the reading over the whole run. When the two do not fit, the reading
 * goes over the whole term. A term with no kanji carries none.
 */
export function alignReading(term: string, reading: string): ReadingSegment[] {
  const clean = cleanReading(reading);
  if (![...term].some(isBase) || !clean) return term ? [{ text: term }] : [];
  if (toHiragana(term) === clean) return [{ text: term }];
  const aligned = Array.from(term).length <= ALIGN_MAX ? align(term, clean) : null;
  return aligned ? merged(aligned) : [{ text: term, reading: clean }];
}

/** Languages whose pronunciation is a reading of a script that does not show it, so the field is called Reading. */
export function writtenWithReading(language: string | null | undefined): boolean {
  return ["ja", "zh"].includes(languageKey(language));
}

/** Whether Lymi draws readings over this language's terms and examples. */
export function drawsReadings(language: string | null | undefined): boolean {
  return DRAWN.has(languageKey(language));
}

/**
 * The term as drawn with its reading, or null when nothing is drawn over it: the card is not in
 * a language Lymi draws readings for, it has no kana reading, or its term has no kanji. A term
 * that lists forms (食べる · 食べます) carries a one-form reading over its first form.
 */
export function termReading(card: {
  term: string;
  language?: string | null | undefined;
  pronunciation?: string | null | undefined;
}): ReadingSegment[] | null {
  const reading = drawsReadings(card.language) ? kanaReading(card) : null;
  if (!reading) return null;
  const clean = foldReading(reading);
  const at = card.term.indexOf(" · ");
  let segments: ReadingSegment[];
  if (at > 0 && !align(card.term, clean)) {
    segments = merged([
      ...alignReading(card.term.slice(0, at), clean),
      { text: card.term.slice(at) },
    ]);
  } else segments = alignReading(card.term, clean);
  return segments.some((segment) => segment.reading !== undefined) ? segments : null;
}

/**
 * Text with inline readings as runs to draw. A reading belongs to the run of kanji just before
 * it, or to a longer stretch when the reading fits it and it starts at a kanji or after a space
 * (`見せ物[みせもの]`, Anki's ` 食べる[たべる]`); the space Anki puts before such a stretch is
 * dropped. A bracket that fits nothing stays as written.
 */
export function parseReadings(text: string): ReadingSegment[] {
  if (!text.includes("[")) return text ? [{ text }] : [];
  const out: ReadingSegment[] = [];
  let cursor = 0;
  for (const match of text.matchAll(INLINE)) {
    const open = match.index;
    let start = open;
    const floor = Math.max(cursor, open - LOOK_BACK);
    while (
      start > floor &&
      (isBase(text[start - 1] as string) || isKana(text[start - 1] as string))
    ) {
      start -= 1;
    }
    // A stretch starts at a kanji, at the honorific お or ご right before one, or at kana only
    // where Anki starts one: after a space or at the start. So で in 駅で電車[でんしゃ] never joins
    // the word after it, while お茶[おちゃ] mid-sentence still reads お + 茶[ちゃ].
    const opens = (at: number) =>
      isBase(text[at] as string) ||
      (/[おご]/.test(text[at] ?? "") && isBase(text[at + 1] ?? "")) ||
      (at === start && (at === 0 || /\s/.test(text[at - 1] ?? "")));
    let found: { at: number; segments: ReadingSegment[] } | null = null;
    for (let at = start; at < open && !found; at++) {
      const base = text.slice(at, open);
      if (![...base].some(isBase)) break;
      if (!opens(at)) continue;
      const segments = align(base, toHiragana(match[1] as string));
      if (segments) found = { at, segments };
    }
    if (!found) continue;
    let before = text.slice(cursor, found.at);
    const prior = text[found.at - 2];
    if (
      found.at === start &&
      before.endsWith(" ") &&
      prior !== undefined &&
      (isBase(prior) || isKana(prior) || prior === "]")
    ) {
      before = before.slice(0, -1);
    }
    out.push({ text: before }, ...found.segments);
    cursor = open + match[0].length;
  }
  out.push({ text: text.slice(cursor) });
  return merged(out);
}

/** Text with its inline readings taken out: `毎朝[まいあさ]パンを食[た]べる` → `毎朝パンを食べる`. */
export function stripReadings(text: string): string {
  return parseReadings(text)
    .map((segment) => segment.text)
    .join("");
}

/** Whether text carries any inline reading. */
export function hasReadings(text: string): boolean {
  return parseReadings(text).some((segment) => segment.reading !== undefined);
}

/** Whether text has kanji that no inline reading covers. */
export function missingReadings(text: string): boolean {
  return parseReadings(text).some(
    (segment) => segment.reading === undefined && [...segment.text].some(isBase),
  );
}

/** Runs written back as text with inline readings, so `parseReadings` reads the same runs. */
export function formatReadings(segments: readonly ReadingSegment[]): string {
  const write = (spaced: boolean) => {
    let out = "";
    for (const { text, reading } of segments) {
      if (reading === undefined) {
        out += text;
        continue;
      }
      const last = out.at(-1);
      if (spaced && last !== undefined && (isBase(last) || isKana(last))) out += " ";
      out += `${text}[${reading}]`;
    }
    return out;
  };
  const plain = write(false);
  const same = (a: readonly ReadingSegment[], b: readonly ReadingSegment[]) =>
    a.length === b.length &&
    a.every((s, i) => s.text === b[i]?.text && s.reading === b[i]?.reading);
  return same(parseReadings(plain), merged(segments)) ? plain : write(true);
}

/** Whether `after` is `before` with readings added and nothing else changed. */
export function addsReadingsOnly(before: string, after: string): boolean {
  return after !== before && stripReadings(after) === before && hasReadings(after);
}
