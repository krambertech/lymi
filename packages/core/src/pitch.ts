import { readingEngine } from "./languages";
import {
  foldReading,
  isKanaText,
  kanaReading,
  moraCount,
  SMALL_KANA,
  withoutPitch,
} from "./reading";

const DOWNSTEP = "ꜜ";

const CHART_MORAE = 12;

const positionsIn = (text: string) =>
  [...text.slice(withoutPitch(text).length).matchAll(/\d+/g)].map((match) => Number(match[0]));

export function storedPitch(pronunciation: string): string {
  const typed = pronunciation.replace(/[［］０-９]/g, (char) => char.normalize("NFKC")).trim();
  const written = withoutPitch(typed).trimEnd();
  const kana = written.replaceAll(DOWNSTEP, "");
  if (kana === typed) return pronunciation;
  if (!isKanaText(kana)) return pronunciation;
  const mark = written.indexOf(DOWNSTEP);
  const positions = [
    ...(mark < 0 ? [] : [moraCount(written.slice(0, mark))]),
    ...positionsIn(typed),
  ].filter((position, at, all) => position <= moraCount(kana) && all.indexOf(position) === at);
  return positions.length === 0
    ? kana
    : `${kana} ${positions.map((position) => `[${position}]`).join("")}`;
}

function isHigh(at: number, position: number): boolean {
  if (position === 1) return at === 0;
  return at >= 1 && (position === 0 || at < position);
}

export interface PitchPattern {
  position: number;
  morae: { text: string; high: boolean }[];
  particleHigh: boolean;
}

function morae(reading: string): string[] {
  const out: string[] = [];
  for (const char of reading.replace(/[\s・]/g, "")) {
    if (SMALL_KANA.test(char) && out.length > 0) out[out.length - 1] += char;
    else out.push(char);
  }
  return out;
}

export function pitchPattern(card: {
  term?: string | undefined;
  language?: string | null | undefined;
  pronunciation?: string | null | undefined;
}): PitchPattern | null {
  const kana = kanaReading(card);
  if (kana === null || !card.pronunciation || readingEngine(card.language) !== "furigana") {
    return null;
  }
  const term = card.term?.normalize("NFC").trim();
  const shown = morae(term && foldReading(term) === foldReading(kana) ? term : kana);
  if (shown.length > CHART_MORAE) return null;
  const position = positionsIn(card.pronunciation.normalize("NFC").trim()).find(
    (at) => at <= shown.length,
  );
  if (position === undefined) return null;
  return {
    position,
    morae: shown.map((text, at) => ({ text, high: isHigh(at, position) })),
    particleHigh: position === 0,
  };
}

export function readingWithoutPitch(card: {
  term: string;
  language?: string | null | undefined;
  pronunciation?: string | null | undefined;
}): string | null {
  if (readingEngine(card.language) !== "furigana") return null;
  const sent = card.pronunciation?.normalize("NFC").trim();
  if (!sent) return isKanaText(card.term.normalize("NFC").trim()) ? card.term.trim() : null;
  return withoutPitch(sent) === sent ? kanaReading(card) : null;
}

export function withPitch(reading: string, position: number): string {
  return storedPitch(`${reading} [${position}]`);
}

const moraWidth = (text: string) => (text.length > 1 ? 21 : 11);

const TAIL = 9;

export const PITCH_DOT = 1.7;

const dotY = (high: boolean) => (high ? 2 : 8);

export interface PitchLayout {
  width: number;
  morae: { text: string; start: number; width: number; x: number; y: number }[];
  segments: { x1: number; y1: number; x2: number; y2: number }[];
}

export function pitchLayout(pattern: PitchPattern): PitchLayout {
  let width = 0;
  const morae = pattern.morae.map((mora) => {
    const start = width;
    const own = moraWidth(mora.text);
    width += own;
    return { text: mora.text, start, width: own, x: start + own / 2, y: dotY(mora.high) };
  });
  const end = width + TAIL;
  const tail = { x: end, y: dotY(pattern.particleHigh) };
  const segments = morae.map((from, at) => {
    const to = morae[at + 1] ?? tail;
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const stepX = (to.x - from.x) / length;
    const stepY = (to.y - from.y) / length;
    const stop = at + 1 < morae.length ? PITCH_DOT : 0;
    return {
      x1: from.x + stepX * PITCH_DOT,
      y1: from.y + stepY * PITCH_DOT,
      x2: to.x - stepX * stop,
      y2: to.y - stepY * stop,
    };
  });
  return { width: end, morae, segments };
}

export function sourcePitch(text: string, reading: string): number[] | null {
  const kana = foldReading(reading);
  const positions: number[] = [];
  for (const item of text.split(" · ")) {
    const line = item.replace(/\s+/g, "").trim();
    if (/^(\[\d{1,2}\])+$/.test(line)) {
      positions.push(...positionsIn(line));
      continue;
    }
    const stored = storedPitch(line);
    if (foldReading(withoutPitch(stored)) !== kana) return null;
    const found = positionsIn(stored);
    if (found.length !== 1) return null;
    positions.push(...found);
  }
  const unique = positions.filter(
    (position, at) => position <= moraCount(kana) && positions.indexOf(position) === at,
  );
  return unique.length > 0 ? unique : null;
}
