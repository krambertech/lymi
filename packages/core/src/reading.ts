/**
 * Readings drawn over a term or an example: furigana over kanji, or one syllable over each Han
 * character through `./pinyin` and `./jyutping`; `./stress` draws a term's marks in place instead.
 * A term's reading is its pronunciation, aligned at display; an example carries its readings inline,
 * `食[た]べる`, where a bracketed kana reading belongs to the kanji just before it, `你好[nǐ hǎo]` in
 * Chinese or `你好[nei5 hou2]` in Cantonese.
 * docs/card-writing.md.
 */

import { markKnownTamil, tamilPairs, tamilSegments, tamilTermReading } from "./indic";
import {
  jyutpingExampleSegments,
  jyutpingKey,
  jyutpingPairs,
  jyutpingTermReading,
} from "./jyutping";
import { EXAMPLE_NOTATION, type ReadingEngine, readingEngine, stressRules } from "./languages";
import { pinyinExampleSegments, pinyinKey, pinyinPairs, pinyinTermReading } from "./pinyin";
import {
  addsStress,
  markedForm,
  missingStress,
  type StressSpan,
  stressKey,
  stressSpans,
} from "./stress";

/** One run of text, with the reading drawn over it when it has one; `known` fades that reading. */
export type ReadingSegment = { text: string; reading?: string; known?: boolean };

type Segments = (term: string, pronunciation: string) => ReadingSegment[] | null;

/** An engine that puts one syllable over each Han character and fades character by character. */
interface SyllableEngine {
  termReading: Segments;
  key: (term: string, pronunciation: string) => string | null;
  pairs: (segments: readonly ReadingSegment[]) => string[];
  example: (text: string) => ReadingSegment[];
}

const SYLLABLE_ENGINES: Partial<Record<ReadingEngine, SyllableEngine>> = {
  pinyin: {
    termReading: pinyinTermReading,
    key: pinyinKey,
    pairs: pinyinPairs,
    example: pinyinExampleSegments,
  },
  jyutping: {
    termReading: jyutpingTermReading,
    key: jyutpingKey,
    pairs: jyutpingPairs,
    example: jyutpingExampleSegments,
  },
};

/** The language's syllable-per-character engine, or null for kana or stress. */
function syllableEngine(language: string | null | undefined): SyllableEngine | null {
  const engine = readingEngine(language);
  return (engine && SYLLABLE_ENGINES[engine]) ?? null;
}

/** Characters a reading is drawn over: kanji, their iteration marks, and the counter ヶ. */
const BASE = /[\p{Script=Han}〆ヵヶ]/u;
/** Characters a reading is written in. */
const KANA = /[\p{Script=Hiragana}\p{Script=Katakana}ー]/u;
const KANA_TEXT = /^[\p{Script=Hiragana}\p{Script=Katakana}ー・\s]+$/u;
/** An inline reading: up to 30 kana in square brackets. `[sound:…]` and other bracketed text are not. */
const INLINE = EXAMPLE_NOTATION.furigana.pattern;

/** How far back an inline reading looks for its kanji, so a crafted example stays cheap to read. */
const LOOK_BACK = 20;

/** Past this many characters a term is a passage, and its reading goes over it whole. */
const ALIGN_MAX = 80;

const isBase = (char: string) => BASE.test(char);
const isKana = (char: string) => KANA.test(char) && !isBase(char);

/** Kana that join the mora before them rather than make their own: きょ is one mora. */
const SMALL_KANA = /[ゃゅょぁぃぅぇぉゎャュョァィゥェォヮ]/;

/** How many morae a stretch of kana holds, as a pitch accent counts them. */
export function moraCount(text: string): number {
  return [...text].filter((char) => KANA.test(char) && !SMALL_KANA.test(char)).length;
}

/** Katakana as hiragana, so a reading written either way compares and shows as one. */
export function toHiragana(text: string): string {
  return text.replace(/[ァ-ヶ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60));
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
  if (readingEngine(card.language) !== "furigana" || !reading) return null;
  return KANA_TEXT.test(reading) ? reading : null;
}

/**
 * The reading the duplicate rule compares: a Japanese card's folded kana reading, a Chinese card's
 * toned pinyin, a Cantonese card's toned Jyutping or a Russian card's marked stress, when it fits the term, else null, so an IPA line
 * or another word's reading never splits one word into two cards.
 */
export function readingKey(card: {
  term: string;
  language?: string | null | undefined;
  pronunciation?: string | null | undefined;
}): string | null {
  const syllables = syllableEngine(card.language);
  if (syllables) return card.pronunciation ? syllables.key(card.term, card.pronunciation) : null;
  const rules = stressRules(card.language);
  if (rules) return card.pronunciation ? stressKey(card.term, card.pronunciation, rules) : null;
  const reading = kanaReading(card);
  if (!reading) return null;
  const folded = foldReading(reading);
  return fitsTerm(card.term, folded) ? folded : null;
}

/**
 * Whether a folded kana reading can be the term's: it aligns with the term or its first form. A
 * term too long to align, or with letters or digits alignment cannot read, such as Tシャツ, takes it.
 */
function fitsTerm(term: string, reading: string): boolean {
  const text = term.normalize("NFC").trim();
  if (Array.from(text).length > ALIGN_MAX) return true;
  if ([...text].some((char) => /[\p{L}\p{N}]/u.test(char) && !isBase(char) && !isKana(char))) {
    return true;
  }
  const at = text.indexOf(" · ");
  return align(text, reading) !== null || (at > 0 && align(text.slice(0, at), reading) !== null);
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

/**
 * The term as drawn with its reading, or null when nothing is drawn over it: the card is not in
 * a language Lymi draws readings for, it has no reading in its engine's script, or its term has
 * no kanji, hanzi or Tamil word. A Tamil term's reading comes from its spelling, or from its
 * pronunciation where that reads as the word. A term that lists forms (食べる · 食べます) carries a one-form reading over
 * its first form.
 */
export function termReading(card: {
  term: string;
  language?: string | null | undefined;
  pronunciation?: string | null | undefined;
}): ReadingSegment[] | null {
  if (readingEngine(card.language) === "indic") {
    return tamilTermReading(card.term, card.pronunciation);
  }
  const syllables = syllableEngine(card.language);
  if (syllables) {
    const segments = card.pronunciation
      ? syllables.termReading(card.term, card.pronunciation)
      : null;
    return segments?.some((segment) => segment.reading !== undefined) ? segments : null;
  }
  const reading = kanaReading(card);
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
 * The term with its stress marked in place, за́мок, or null when the card's language draws no marks
 * in place or its pronunciation is not the term with a mark added. A screen that draws a term's
 * first form alone (идти of идти · шёл) takes the first form of the pronunciation.
 */
export function markedTerm(card: {
  term: string;
  language?: string | null | undefined;
  pronunciation?: string | null | undefined;
}): string | null {
  const rules = stressRules(card.language);
  if (!rules || !card.pronunciation) return null;
  const at = card.pronunciation.indexOf(" · ");
  return (
    markedForm(card.term, card.pronunciation, rules) ??
    (at > 0 && !card.term.includes(" · ")
      ? markedForm(card.term, card.pronunciation.slice(0, at), rules)
      : null)
  );
}

/**
 * The term in runs with its stressed syllable marked, for a language that underlines it rather than
 * drawing the mark, or null where `markedTerm` draws nothing. Takes a first form as `markedTerm` does.
 */
export function stressedTerm(card: {
  term: string;
  language?: string | null | undefined;
  pronunciation?: string | null | undefined;
}): StressSpan[] | null {
  const rules = stressRules(card.language);
  if (rules?.draw !== "syllable" || !card.pronunciation) return null;
  const at = card.pronunciation.indexOf(" · ");
  return (
    stressSpans(card.term, card.pronunciation, rules) ??
    (at > 0 && !card.term.includes(" · ")
      ? stressSpans(card.term, card.pronunciation.slice(0, at), rules)
      : null)
  );
}

/** Whether the term as drawn shows the card's pronunciation, over it or in place, so no screen repeats it as a line. */
export function termShowsPronunciation(card: {
  term: string;
  language?: string | null | undefined;
  pronunciation?: string | null | undefined;
}): boolean {
  return termReading(card) !== null || markedTerm(card) !== null;
}

/** Whether a drawn reading is written in letters, as pinyin and Jyutping are, so it needs room from the reading beside it. */
export function lettersReading(reading: string): boolean {
  return /\p{Script=Latin}/u.test(reading);
}

/** A tone number after a letter, as Jyutping writes one after each syllable. */
const TONE_NUMBER = /(?<=\p{L})[1-6]/gu;

/**
 * A drawn reading as runs, each tone number its own run so a screen can raise it (gwong² dung¹)
 * while the stored text keeps plain digits. A reading without one is a single run.
 */
export function toneRuns(reading: string): { text: string; tone: boolean }[] {
  const out: { text: string; tone: boolean }[] = [];
  let at = 0;
  for (const match of reading.matchAll(TONE_NUMBER)) {
    if (match.index > at) out.push({ text: reading.slice(at, match.index), tone: false });
    out.push({ text: match[0], tone: true });
    at = match.index + match[0].length;
  }
  if (at < reading.length || out.length === 0) out.push({ text: reading.slice(at), tone: false });
  return out;
}

/** Whether a reading is drawn over the card's term, for a screen that lays out around it. */
export function drawsTermReading(card: {
  term: string;
  language?: string | null | undefined;
  pronunciation?: string | null | undefined;
}): boolean {
  return termReading(card) !== null;
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
    // the word after it, while お茶[おちゃ] mid-sentence still reads お + 茶[ちゃ]. A reading that
    // begins おお or ごご is the kanji's own, so the お ending なお in なお多[おお]く stays out.
    const read = toHiragana(match[1] as string);
    const honorific = (char: string) => /[おご]/.test(char) && !read.startsWith(char + char);
    const opens = (at: number) =>
      isBase(text[at] as string) ||
      (honorific(text[at] ?? "") && isBase(text[at + 1] ?? "")) ||
      (at === start && (at === 0 || /\s/.test(text[at - 1] ?? "")));
    let found: { at: number; segments: ReadingSegment[] } | null = null;
    for (let at = start; at < open && !found; at++) {
      const base = text.slice(at, open);
      if (![...base].some(isBase)) break;
      if (!opens(at)) continue;
      const segments = align(base, read);
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

/**
 * The runs of kanji and their readings on the learner's Known cards, so an example's furigana
 * fades over words they know. A pair is the kanji and its reading together, so 食べます still
 * meets the Known 食べる as 食 read た, while 食事 read しょくじ, sharing only the kanji, does not.
 */
export type KnownReadings = ReadonlySet<string>;

/** How many readings side by side an example may join to meet one Known word: 毎[まい]朝[あさ]. */
const JOIN_MAX = 4;

const pairKey = (text: string, reading: string) =>
  `${text.normalize("NFC")}[${foldReading(reading)}]`;

/** 来る is the one verb whose kanji changes its reading as it inflects: 来[き]ます, 来[こ]ない. */
const INFLECTED: Record<string, readonly string[]> = { "来[く]": ["来[き]", "来[こ]"] };

/**
 * The pairs a card's term gives: each run of kanji with its part of the reading, and for 来る the
 * readings its inflections take. A kana term gives none.
 */
export function readingPairs(card: {
  term: string;
  language?: string | null | undefined;
  pronunciation?: string | null | undefined;
}): string[] {
  if (readingEngine(card.language) === "indic") return tamilPairs(card.term);
  const syllables = syllableEngine(card.language);
  if (syllables) return syllables.pairs(termReading(card) ?? []);
  const keys: string[] = [];
  for (const { text, reading } of termReading(card) ?? []) {
    if (reading === undefined || ![...text].every(isBase)) continue;
    const key = pairKey(text, reading);
    keys.push(key, ...(INFLECTED[key] ?? []));
  }
  return keys;
}

/** The pairs of the cards that are Known, for `markKnownReadings`. */
export function knownReadings(
  cards: Iterable<{
    term: string;
    language?: string | null | undefined;
    pronunciation?: string | null | undefined;
    known: boolean;
  }>,
): Set<string> {
  const known = new Set<string>();
  for (const card of cards) {
    if (card.known) for (const key of readingPairs(card)) known.add(key);
  }
  return known;
}

/**
 * The runs with `known` on each reading whose characters and reading are a Known pair. Furigana
 * also joins the readings beside it, so 毎[まい]朝[あさ] fades for a Known 毎朝 but not for a Known
 * 毎; pinyin and Jyutping fade character by character, and a Tamil reading word by word.
 */
export function markKnownReadings(
  segments: readonly ReadingSegment[],
  known: KnownReadings | undefined,
  language: string | null | undefined,
): readonly ReadingSegment[] {
  if (!known?.size || !segments.some((segment) => segment.reading !== undefined)) return segments;
  if (readingEngine(language) === "indic") return markKnownTamil(segments, known);
  const syllables = syllableEngine(language);
  if (syllables) {
    return segments.map((segment) => {
      const pairs = segment.reading === undefined ? [] : syllables.pairs([segment]);
      return pairs.length && pairs.every((pair) => known.has(pair))
        ? { ...segment, known: true }
        : segment;
    });
  }
  const marked = segments.map((segment) => ({ ...segment }));
  for (let i = 0; i < marked.length; i++) {
    let text = "";
    let reading = "";
    for (let j = i; j < Math.min(marked.length, i + JOIN_MAX); j++) {
      const segment = marked[j] as ReadingSegment;
      if (segment.reading === undefined) break;
      text += segment.text;
      reading += segment.reading;
      if (known.has(pairKey(text, reading))) {
        for (let k = i; k <= j; k++) (marked[k] as ReadingSegment).known = true;
      }
    }
  }
  return marked;
}

/**
 * An example's readings as runs to draw, in its language's notation: one syllable per character
 * for Chinese and Cantonese, each word's reading from its spelling for Tamil, and kana brackets
 * for any other language.
 */
export function exampleSegments(
  text: string,
  language: string | null | undefined,
): ReadingSegment[] {
  if (readingEngine(language) === "indic") return tamilSegments(text);
  return syllableEngine(language)?.example(text) ?? parseReadings(text);
}

/** How many readings an example draws, and how many of them fade over the learner's Known words. */
export function exampleReadings(
  example: string | null | undefined,
  language: string | null | undefined,
  known?: KnownReadings | undefined,
): { readings: number; known: number } {
  const drawn = markKnownReadings(exampleSegments(example ?? "", language), known, language).filter(
    (segment) => segment.reading !== undefined,
  );
  return { readings: drawn.length, known: drawn.filter((segment) => segment.known).length };
}

/**
 * A term written with inline readings as the term and its whole reading, `食[た]べる` → 食べる read
 * たべる, or null unless every bracket is a reading and every kanji has one. Kana and punctuation
 * outside the brackets read as written; any other letter or digit leaves it null.
 */
export function splitTermReading(text: string): { term: string; reading: string } | null {
  const segments = parseReadings(text.normalize("NFC").trim());
  if (!segments.some((segment) => segment.reading !== undefined)) return null;
  let term = "";
  let reading = "";
  for (const segment of segments) {
    term += segment.text;
    if (segment.reading !== undefined) {
      reading += segment.reading;
      continue;
    }
    for (const char of segment.text) {
      if (isKana(char)) reading += char;
      else if (isBase(char) || /[\p{L}\p{N}[\]]/u.test(char)) return null;
    }
  }
  return { term: term.trim(), reading: foldReading(reading) };
}

/** Text with its inline readings taken out: `毎朝[まいあさ]パンを食[た]べる` → `毎朝パンを食べる`. */
export function stripReadings(text: string, language: string | null | undefined): string {
  return exampleSegments(text, language)
    .map((segment) => segment.text)
    .join("");
}

/** Whether text carries any inline reading. */
export function hasReadings(text: string, language: string | null | undefined): boolean {
  return exampleSegments(text, language).some((segment) => segment.reading !== undefined);
}

/** Whether text has kanji or hanzi that no inline reading covers, or a word of two or more syllables with no stress shown. */
export function missingReadings(text: string, language: string | null | undefined): boolean {
  const rules = stressRules(language);
  if (rules) return missingStress(text, rules);
  return exampleSegments(text, language).some(
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
export function addsReadingsOnly(
  before: string,
  after: string,
  language: string | null | undefined,
): boolean {
  const rules = stressRules(language);
  if (rules) return addsStress(before, after, rules.mark);
  return (
    after !== before && stripReadings(after, language) === before && hasReadings(after, language)
  );
}
