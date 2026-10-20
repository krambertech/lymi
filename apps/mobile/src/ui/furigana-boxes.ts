import { lettersReading, type ReadingSegment } from "@lymi/core";

/** A run to draw: `tail` marks text after the term, such as its other forms, drawn in its own style. */
export type Run = ReadingSegment & { tail?: boolean };

/** Runs that stay together on one line: a line breaks only between boxes. */
export type Box = Run[];

/** Characters a Japanese line may break after: kana, kanji and their marks and full-width forms. */
const CJK = /[　-〿぀-ヿㇰ-ㇿ㐀-䶿一-鿿豈-﫿＀-￯]/u;
/** What never starts a line: closing marks, small kana and the long vowel mark, as kinsoku has it. */
const NO_START =
  /^[\s、。，．・：；？！ー～」』）】〕〉》｝’”ぁぃぅぇぉっゃゅょゎゕゖァィゥェォッャュョヮヵヶㇰ-ㇿ々ゝゞヽヾ!),.:;?\]}%…‥]/u;
/** What never ends a line: opening marks. */
const NO_END = /[「『（【〔〈《｛‘“([{]$/u;

const textOf = (box: Box) => box.map((run) => run.text).join("");

/**
 * Plain text in the pieces a line may break between: each kana or kanji alone, and any other word
 * whole with the spaces after it, so a line never starts with a space.
 */
function pieces(text: string): string[] {
  const out: string[] = [];
  let open = false;
  for (const char of text) {
    const last = out.length - 1;
    if (/\s/u.test(char) && last >= 0) {
      out[last] += char;
      open = false;
    } else if (CJK.test(char) || !open || last < 0) {
      out.push(char);
      open = !CJK.test(char) && !/\s/u.test(char);
    } else {
      out[last] += char;
    }
  }
  return out;
}

/**
 * Runs as the boxes a line of furigana wraps between. A run with a reading is one box, since its
 * reading spans it; plain text breaks between characters, as Japanese does, but a closing mark or
 * a small kana keeps to the box before it and an opening mark to the box after it.
 */
export function furiganaBoxes(segments: readonly Run[]): Box[] {
  const boxes: Box[] = [];
  const add = (run: Run) => {
    const last = boxes.at(-1);
    if (last && (NO_START.test(run.text) || NO_END.test(textOf(last)))) {
      const end = last.at(-1);
      const plain = end?.reading === undefined && run.reading === undefined;
      if (end && plain && !end.tail === !run.tail) end.text += run.text;
      else last.push({ ...run });
    } else boxes.push([{ ...run }]);
  };
  for (const segment of segments) {
    if (!segment.text) continue;
    if (segment.reading !== undefined) add(segment);
    else for (const text of pieces(segment.text)) add({ ...segment, text });
  }
  return boxes;
}

/** Where a drawn box sits: its line's top, and how far along the line its end reaches. */
export type Frame = { top: number; end: number };

/**
 * How many boxes to keep so they fill at most `lines` lines and leave `room` at the end of the last
 * for an ellipsis and a mark, or null when every box fits.
 */
export function clampBoxes(
  frames: readonly Frame[],
  lines: number,
  lineWidth: number,
  room: number,
): number | null {
  const tops = [...new Set(frames.map((f) => Math.round(f.top)))].sort((a, b) => a - b);
  const last = tops[lines - 1];
  if (last === undefined || tops.length <= lines) return null;
  let keep = frames.findIndex((f) => Math.round(f.top) > last);
  if (keep < 0) keep = frames.length;
  while (keep > 0) {
    const f = frames[keep - 1] as Frame;
    if (Math.round(f.top) < last || f.end + room <= lineWidth) break;
    keep -= 1;
  }
  return keep;
}

/**
 * The room each side of a reading written in letters, so pinyin wider than its hanzi never runs
 * into the syllable beside it, as the web's `rt` pads it; kana readings take none.
 */
export function readingInset(reading: string, readingSize: number): number {
  return lettersReading(reading) ? Math.ceil(readingSize * 0.2) : 0;
}

/**
 * What VoiceOver says for the runs: the reading in place of the kanji it is drawn over, while shown
 * and while the language says its reading; a Chinese voice reads hanzi better than pinyin.
 */
export function spokenReading(segments: readonly ReadingSegment[], shown: boolean): string {
  return segments
    .map((segment) =>
      shown && !segment.known && segment.reading?.trim() ? segment.reading : segment.text,
    )
    .join("");
}
