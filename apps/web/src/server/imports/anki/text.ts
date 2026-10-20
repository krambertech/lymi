/** Anki's own field syntax: cloze deletions, furigana, pinyin and the fields a template asks from. */
import { htmlToText, traditionalTerm } from "@lymi/core";
import {
  alignPinyin,
  cleanPinyin,
  formatPinyin,
  type PinyinSegment,
  parsePinyin,
  pinyinSyllables,
  readingTokens,
  stripPinyin,
} from "@lymi/core/pinyin";

type Cloze = { number: number; answer: string; hint: string | null; start: number; end: number };

/** Top-level cloze deletions in order. A nested deletion stays inside its parent's answer. */
function clozes(text: string): Cloze[] {
  const found: Cloze[] = [];
  const open = /\{\{c(\d+)::/g;
  let match = open.exec(text);
  while (match) {
    let depth = 1;
    let at = open.lastIndex;
    let separator = -1;
    while (at < text.length && depth > 0) {
      if (text.startsWith("{{", at)) {
        depth++;
        at += 2;
      } else if (text.startsWith("}}", at)) {
        depth--;
        at += 2;
      } else {
        if (depth === 1 && separator < 0 && text.startsWith("::", at)) separator = at;
        at++;
      }
    }
    if (depth > 0) break;
    const body = text.slice(open.lastIndex, at - 2);
    const split = separator < 0 ? -1 : separator - open.lastIndex;
    found.push({
      number: Number(match[1]),
      answer: split < 0 ? body : body.slice(0, split),
      hint: split < 0 ? null : body.slice(split + 2),
      start: match.index,
      end: at,
    });
    open.lastIndex = at;
    match = open.exec(text);
  }
  return found;
}

/** The text with every deletion replaced by its answer, nested ones included. */
export function revealCloze(text: string): string {
  let out = "";
  let at = 0;
  for (const cloze of clozes(text)) {
    out += text.slice(at, cloze.start) + revealCloze(cloze.answer);
    at = cloze.end;
  }
  return out + text.slice(at);
}

/** The cloze numbers a text uses, ascending, nested ones included. */
export function clozeNumbers(text: string): number[] {
  const numbers = new Set<number>();
  for (const match of text.matchAll(/\{\{c(\d+)::/g)) numbers.add(Number(match[1]));
  return [...numbers].sort((a, b) => a - b);
}

/** What one cloze number asks: its answers in order and its first hint. */
export function clozeAnswer(
  text: string,
  number: number,
): { answers: string[]; hint: string | null } {
  const answers: string[] = [];
  let hint: string | null = null;
  const visit = (value: string) => {
    for (const cloze of clozes(value)) {
      if (cloze.number === number) {
        answers.push(revealCloze(cloze.answer));
        hint ??= cloze.hint;
      } else visit(cloze.answer);
    }
  };
  visit(text);
  return { answers, hint };
}

// A reading attaches to the run of characters before it, back to a space or a tag.
const FURIGANA = / ?([^ >[\]]+?)\[([^\]]+)\]/g;
const HAN = /\p{Script=Han}/u;

/** Whether a text uses furigana: a bracketed reading after kanji. `[sound:]` is not one. */
export function hasFurigana(text: string): boolean {
  for (const match of text.matchAll(FURIGANA)) {
    if (HAN.test(match[1] ?? "") && !(match[2] ?? "").startsWith("sound:")) return true;
  }
  return false;
}

/** The text as written, readings removed: `漢字[かんじ]` → `漢字`. */
export function furiganaBase(text: string): string {
  return text.replace(FURIGANA, (match, base: string, reading: string) =>
    HAN.test(base) && !reading.startsWith("sound:") ? base : match,
  );
}

const KANA_READING = /^[\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u;

/** The text with every reading that is not kana taken out, so `我[wǒ]` → `我` and `漢字[かんじ]` stays. */
export function withoutOtherReadings(text: string): string {
  return text.replace(FURIGANA, (match, base: string, reading: string) =>
    HAN.test(base) && !reading.startsWith("sound:") && !KANA_READING.test(reading) ? base : match,
  );
}

/** The text as read, kanji replaced by their readings: `漢字[かんじ]` → `かんじ`. */
export function furiganaReading(text: string): string {
  return text.replace(FURIGANA, (match, base: string, reading: string) =>
    HAN.test(base) && !reading.startsWith("sound:") ? reading : match,
  );
}

/** A reading field as plain kana: bracket furigana is read through, plain text is kept. */
export function plainReading(text: string): string {
  return hasFurigana(text) ? furiganaReading(text) : text;
}

/**
 * The field a card template's question shows first, by index. Conditionals and FrontSide are
 * skipped and filters such as `type:` or `cloze:` are read through. Null when the question
 * shows no field, or only an image occlusion.
 */
export function questionField(template: string, fields: readonly string[]): number | null {
  const names = fields.map((name) => name.toLowerCase());
  for (const match of template.matchAll(/\{\{([^}]+)\}\}/g)) {
    const tag = (match[1] ?? "").trim();
    if (/^[#/^!]/.test(tag)) continue;
    const parts = tag.split(":");
    if (parts.some((part) => part.trim().toLowerCase() === "image-occlusion")) return null;
    const index = names.indexOf((parts.at(-1) ?? "").trim().toLowerCase());
    if (index >= 0) return index;
  }
  return null;
}

/** Whether a template is image occlusion, which Lymi cannot ask. */
export function isImageOcclusion(template: string): boolean {
  return /\{\{[^}]*image-occlusion:/i.test(template);
}

/**
 * A pinyin field as one line. Lines that read the term together, as `yì` and `diǎnr` read 一点儿,
 * join with a space; other lines are separate readings, as `xíng` and `háng` are for 行.
 */
export function pinyinReading(text: string, term: string): string {
  const lines = text
    .split("\n")
    .map((line) => line.replace(/\s+/gu, " ").trim())
    .filter(Boolean);
  const joined = lines.join(" ");
  return lines.length < 2 || alignPinyin(term, readingTokens(joined)) ? joined : lines.join(" / ");
}

const pinyinFold = (text: string) =>
  cleanPinyin(text)
    .toLowerCase()
    .replace(/[\s'’ʼ-]/gu, "");

/** Whether two fields are the same pinyin however written, as `ni3 hao3` beside `nǐ hǎo`. */
export function samePinyin(a: string, b: string): boolean {
  return pinyinSyllables(a) !== null && pinyinFold(a) === pinyinFold(b);
}

/**
 * Whether a field repeats a text with only markup or readings added, as Chinese Support Redux's
 * coloured `Color` and `<ruby>` fields repeat the term.
 */
export function repeatsText(html: string, text: string): boolean {
  const bare = (value: string) => stripPinyin(furiganaBase(value)).replace(/\s+/gu, "");
  const own = htmlToText(html.replace(/<(rt|rp)\b[^>]*>[\s\S]*?<\/\1>/giu, ""));
  return !!own && bare(own) === bare(text);
}

/** A sentence's pinyin as a notes line, tone numbers written as marks like the Reading's. */
export function pinyinLine(text: string): string {
  return pinyinSyllables(text) ? cleanPinyin(text) : text;
}

/** The language a note type's fields say its deck is in: Mandarin from a pinyin or zhuyin field. */
export function fieldLanguage(names: readonly string[]): string | null {
  if (!names.some((name) => /pinyin|zhuyin|bopomofo|拼音|注音/iu.test(name))) return null;
  if (names.some((name) => /jyutping|cantonese|粵|粤/iu.test(name))) return null;
  return traditionalTerm(names) ? "zh-Hant" : "zh";
}

/** An example's inline pinyin with tone numbers written as marks: `你好[ni3 hao3]` → `你好[nǐ hǎo]`. */
export function markedExample(text: string): string {
  return formatPinyin(
    parsePinyin(text).map((segment) =>
      segment.reading === undefined
        ? segment
        : { ...segment, reading: cleanPinyin(segment.reading) },
    ),
  );
}

/**
 * The sentence with its pinyin inline, one bracket per pinyin word (`我去银行[yín háng]`), or null
 * unless each syllable falls on one Han character in order.
 */
export function inlinePinyin(sentence: string, pinyin: string): string | null {
  const tokens = readingTokens(pinyin);
  if (tokens.length === 0 || tokens.some((token) => !token.syllables)) return null;
  const aligned = alignPinyin(sentence, tokens);
  if (!aligned) return null;
  const out: PinyinSegment[] = [];
  let at = 0;
  for (const token of tokens) {
    const syllables = token.syllables ?? [];
    while (aligned[at] && aligned[at]?.reading === undefined)
      out.push(aligned[at++] as PinyinSegment);
    const word = aligned.slice(at, at + syllables.length);
    // A word the sentence breaks with punctuation is not one pinyin word.
    if (word.length < syllables.length || word.some((s) => s.reading === undefined)) return null;
    out.push({
      text: word.map((s) => s.text).join(""),
      reading: syllables.map((s) => s.text).join(" "),
    });
    at += syllables.length;
  }
  out.push(...aligned.slice(at));
  const text = formatPinyin(out);
  return stripPinyin(text) === sentence ? text : null;
}
