import { markKnownTamil, tamilPairs, tamilSegments, tamilTermReading } from "./indic";
import {
  jyutpingExampleSegments,
  jyutpingKey,
  jyutpingPairs,
  jyutpingTermReading,
} from "./jyutping";
import { EXAMPLE_NOTATION, type ReadingEngine, readingEngine, stressRules } from "./languages";
import { pinyinExampleSegments, pinyinKey, pinyinPairs, pinyinTermReading } from "./pinyin";
import { addsStress, markedForm, missingStress, stressKey } from "./stress";
import type { PronunciationDisplay } from "./types";

export type ReadingSegment = { text: string; reading?: string; known?: boolean };

type Segments = (term: string, pronunciation: string) => ReadingSegment[] | null;

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

function syllableEngine(language: string | null | undefined): SyllableEngine | null {
  const engine = readingEngine(language);
  return (engine && SYLLABLE_ENGINES[engine]) ?? null;
}

const PITCH = /\s*(?:\[\d{1,2}\]\s*)+$/u;

const BASE = /[\p{Script=Han}〆ヵヶ]/u;
const KANA = /[\p{Script=Hiragana}\p{Script=Katakana}ー]/u;
const KANA_TEXT = /^[\p{Script=Hiragana}\p{Script=Katakana}ー・\s]+$/u;
const INLINE = EXAMPLE_NOTATION.furigana.pattern;

const LOOK_BACK = 20;

const ALIGN_MAX = 80;

const isBase = (char: string) => BASE.test(char);
const isKana = (char: string) => KANA.test(char) && !isBase(char);

export const SMALL_KANA = /[ゃゅょぁぃぅぇぉゎャュョァィゥェォヮ]/;

export function moraCount(text: string): number {
  return [...text].filter((char) => KANA.test(char) && !SMALL_KANA.test(char)).length;
}

export function toHiragana(text: string): string {
  return text.replace(/[ァ-ヶ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60));
}

export function foldReading(reading: string): string {
  return toHiragana(reading.normalize("NFC").replace(/[\s・]/g, ""));
}

export function isKanaText(text: string): boolean {
  return KANA_TEXT.test(text);
}

export function withoutPitch(text: string): string {
  return text.replace(PITCH, "");
}

export function kanaReading(card: {
  language?: string | null | undefined;
  pronunciation?: string | null | undefined;
}): string | null {
  const reading = card.pronunciation?.normalize("NFC").trim();
  if (readingEngine(card.language) !== "furigana" || !reading) return null;
  const kana = withoutPitch(reading);
  return KANA_TEXT.test(kana) ? kana : null;
}

export function pronunciationText(card: {
  language?: string | null | undefined;
  pronunciation?: string | null | undefined;
}): string | null {
  return kanaReading(card) ?? card.pronunciation ?? null;
}

export function sameSpokenReading(
  card: { language?: string | null | undefined; pronunciation?: string | null | undefined },
  pronunciation: string | null,
): boolean {
  return pronunciationText(card) === pronunciationText({ ...card, pronunciation });
}

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

function cleanReading(reading: string): string {
  const text = reading.normalize("NFC").trim();
  return KANA_TEXT.test(text) ? foldReading(text) : text;
}

export function alignReading(term: string, reading: string): ReadingSegment[] {
  const clean = cleanReading(reading);
  if (![...term].some(isBase) || !clean) return term ? [{ text: term }] : [];
  if (toHiragana(term) === clean) return [{ text: term }];
  const aligned = Array.from(term).length <= ALIGN_MAX ? align(term, clean) : null;
  return aligned ? merged(aligned) : [{ text: term, reading: clean }];
}

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

export function termShowsPronunciation(card: {
  term: string;
  language?: string | null | undefined;
  pronunciation?: string | null | undefined;
}): boolean {
  const kana = kanaReading(card);
  return (
    termReading(card) !== null ||
    markedTerm(card) !== null ||
    (kana !== null && foldReading(kana) === foldReading(card.term))
  );
}

export function cueShowsPronunciation({
  revealed,
  known,
  display,
}: {
  revealed: boolean;
  known: boolean;
  display: PronunciationDisplay | undefined;
}): boolean {
  if (display === "separate") return false;
  return revealed || !known;
}

export function lettersReading(reading: string): boolean {
  return /\p{Script=Latin}/u.test(reading);
}

const TONE_NUMBER = /(?<=\p{L})[1-6]/gu;

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

export function drawsTermReading(card: {
  term: string;
  language?: string | null | undefined;
  pronunciation?: string | null | undefined;
}): boolean {
  return termReading(card) !== null;
}

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

export type KnownReadings = ReadonlySet<string>;

const JOIN_MAX = 4;

const pairKey = (text: string, reading: string) =>
  `${text.normalize("NFC")}[${foldReading(reading)}]`;

const INFLECTED: Record<string, readonly string[]> = { "来[く]": ["来[き]", "来[こ]"] };

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

export function exampleSegments(
  text: string,
  language: string | null | undefined,
): ReadingSegment[] {
  if (readingEngine(language) === "indic") return tamilSegments(text);
  return syllableEngine(language)?.example(text) ?? parseReadings(text);
}

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

export function stripReadings(text: string, language: string | null | undefined): string {
  return exampleSegments(text, language)
    .map((segment) => segment.text)
    .join("");
}

export function hasReadings(text: string, language: string | null | undefined): boolean {
  return exampleSegments(text, language).some((segment) => segment.reading !== undefined);
}

export function missingReadings(text: string, language: string | null | undefined): boolean {
  const rules = stressRules(language);
  if (rules) return missingStress(text, rules);
  return exampleSegments(text, language).some(
    (segment) => segment.reading === undefined && [...segment.text].some(isBase),
  );
}

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

export function addsReadingsOnly(
  before: string,
  after: string,
  language: string | null | undefined,
): boolean {
  if (stressRules(language)) return addsStress(before, after);
  return (
    after !== before && stripReadings(after, language) === before && hasReadings(after, language)
  );
}
