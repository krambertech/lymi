import type { ReadingSegment } from "@lymi/core";

/** Runs that stay together on one line: a line breaks only between boxes. */
export type Box = ReadingSegment[];

/** Characters a Japanese line may break after: kana, kanji and their marks and full-width forms. */
const CJK = /[　-〿぀-ヿㇰ-ㇿ㐀-䶿一-鿿豈-﫿＀-￯]/u;
/** What never starts a line: closing marks, small kana and the long vowel mark, as kinsoku has it. */
const NO_START =
  /^[、。，．・：；？！ー～」』）】〕〉》｝’”ぁぃぅぇぉっゃゅょゎゕゖァィゥェォッャュョヮヵヶㇰ-ㇿ々ゝゞヽヾ!),.:;?\]}%…‥]/u;
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
export function furiganaBoxes(segments: readonly ReadingSegment[]): Box[] {
  const boxes: Box[] = [];
  const add = (run: ReadingSegment) => {
    const last = boxes.at(-1);
    if (last && (NO_START.test(run.text) || NO_END.test(textOf(last)))) {
      const end = last.at(-1);
      if (end && end.reading === undefined && run.reading === undefined) end.text += run.text;
      else last.push({ ...run });
    } else boxes.push([{ ...run }]);
  };
  for (const segment of segments) {
    if (!segment.text) continue;
    if (segment.reading !== undefined) add(segment);
    else for (const text of pieces(segment.text)) add({ text });
  }
  return boxes;
}

/** What VoiceOver says for the runs: the reading in place of the kanji it is drawn over, while shown. */
export function spokenReading(segments: readonly ReadingSegment[], shown: boolean): string {
  return segments
    .map((segment) => (shown && segment.reading?.trim() ? segment.reading : segment.text))
    .join("");
}
