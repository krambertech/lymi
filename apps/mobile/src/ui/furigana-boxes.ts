import { lettersReading, type ReadingSegment } from "@lymi/core";

export type Run = ReadingSegment & { tail?: boolean };

export type Box = Run[];

const CJK = /[　-〿぀-ヿㇰ-ㇿ㐀-䶿一-鿿豈-﫿＀-￯]/u;
const NO_START =
  /^[\s、。，．・：；？！ー～」』）】〕〉》｝’”ぁぃぅぇぉっゃゅょゎゕゖァィゥェォッャュョヮヵヶㇰ-ㇿ々ゝゞヽヾ!),.:;?\]}%…‥]/u;
const NO_END = /[「『（【〔〈《｛‘“([{]$/u;

const textOf = (box: Box) => box.map((run) => run.text).join("");

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

export type Frame = { top: number; end: number };

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

export function readingInset(reading: string, readingSize: number): number {
  return lettersReading(reading) ? Math.ceil(readingSize * 0.125) : 0;
}

export function spokenReading(segments: readonly ReadingSegment[], shown: boolean): string {
  return segments
    .map((segment) =>
      shown && !segment.known && segment.reading?.trim() ? segment.reading : segment.text,
    )
    .join("");
}
