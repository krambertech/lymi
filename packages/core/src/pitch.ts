/**
 * A Japanese word's pitch accent, held in its Reading after the kana as the mora the voice falls
 * after: `としょかん [2]`, `ともだち [0]` for no fall, and an import may keep a second accepted accent, `かんがえる [4][3]`, which no chart draws.
 * Nothing else reads it: `kanaReading` gives duplicates, furigana and audio the kana alone.
 * docs/card-writing.md.
 */

import { readingEngine } from "./languages";
import {
  foldReading,
  isKanaText,
  kanaReading,
  moraCount,
  SMALL_KANA,
  withoutPitch,
} from "./reading";

/** How a chart or a typed Reading marks the fall, as dictionaries print it: としょꜜかん. */
const DOWNSTEP = "ꜜ";

/** Past this many morae a Reading is a phrase, with no one accent, and a chart would not fit a phone. */
const CHART_MORAE = 12;

const positionsIn = (text: string) =>
  [...text.slice(withoutPitch(text).length).matchAll(/\d+/g)].map((match) => Number(match[0]));

/**
 * A Reading as stored: a downstep mark becomes its position and a position past the last mora
 * goes. Anything that is not kana, such as IPA, stays as sent.
 */
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

/** Whether a mora of a word stands high: from the second up to the fall, or the first alone before a fall after it. */
function isHigh(at: number, position: number): boolean {
  if (position === 1) return at === 0;
  return at >= 1 && (position === 0 || at < position);
}

/** One accent of a word: each mora high or low, and whether a particle after the word stays high. */
export interface PitchPattern {
  position: number;
  morae: { text: string; high: boolean }[];
  /** A word with a fall on its last mora differs from a flat one only here. */
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

/** The accent a card's chart draws, the first its Reading holds, or null when it holds none or is too long to chart. */
export function pitchPattern(card: {
  language?: string | null | undefined;
  pronunciation?: string | null | undefined;
}): PitchPattern | null {
  const kana = kanaReading(card);
  if (kana === null || !card.pronunciation || readingEngine(card.language) !== "furigana") {
    return null;
  }
  const shown = morae(kana);
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

/** A chart's width in tenths of an em for each mora: きょ takes two kana's room. */
const moraWidth = (text: string) => (text.length > 1 ? 21 : 11);

/** The tail past the last mora, where a particle would stand. */
const TAIL = 9;

/** A dot's radius, in the chart's units. */
export const PITCH_DOT = 1.7;

/** How far down the chart a high or a low mora stands. */
const dotY = (high: boolean) => (high ? 2 : 8);

/** A chart laid out in tenths of an em, so it scales with the kana under it. */
export interface PitchLayout {
  width: number;
  morae: { text: string; start: number; width: number; x: number; y: number }[];
  /** The line between dots, stopping at each dot's edge so the dots stay hollow on any surface. */
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

/**
 * The pitch accent a source wrote beside a word, such as an import's `はꜜし [1] · はし [0]` or a bare
 * `[1][3]`, as positions, or null when it says something else or names another Reading.
 */
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
    // One word beside a mark and a number that disagree says nothing reliable.
    if (found.length !== 1) return null;
    positions.push(...found);
  }
  const unique = positions.filter(
    (position, at) => position <= moraCount(kana) && positions.indexOf(position) === at,
  );
  return unique.length > 0 ? unique : null;
}
