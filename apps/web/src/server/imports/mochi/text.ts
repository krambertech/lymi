import { htmlToText } from "@lymi/core";

/** Mochi's own card syntax: sides, attachments and the fields a template shows. */

const SIDE = /^[ \t]*---[ \t]*$/m;
const AUDIO = /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|webm)$/i;
const IMAGE = /\.(png|jpe?g|gif|webp|avif|svg|bmp|heic|heif)$/i;

/** A card's content split at its first `---` line; later sides stay with the second. */
export function splitSides(content: string): [string] | [string, string] {
  const match = SIDE.exec(content);
  if (!match) return [content];
  const front = content.slice(0, match.index);
  const back = content.slice(match.index + match[0].length).replace(new RegExp(SIDE, "gm"), "");
  return [front, back];
}

/** Every attachment a text names with `@media/`, in order. */
export function attachments(text: string): string[] {
  const names: string[] = [];
  for (const match of text.matchAll(/@media\/([^\s)"'<>\]]+)/g)) {
    const raw = match[1] as string;
    try {
      names.push(decodeURIComponent(raw));
    } catch {
      names.push(raw);
    }
  }
  return names;
}

/** Mochi's furigana: a reading in brackets after kanji, `漢字(かんじ)`. */
const FURIGANA =
  /([\p{Script=Han}々〆ヶ]+)[(（]([\p{Script=Hiragana}\p{Script=Katakana}ー・]+)[)）]/gu;

/** The text as written and as read, when it carries furigana. */
export function furigana(text: string): { base: string; reading: string } | null {
  if (!text.match(FURIGANA)) return null;
  return {
    base: text.replace(FURIGANA, "$1"),
    reading: text.replace(FURIGANA, "$2"),
  };
}

export const isImage = (name: string) => IMAGE.test(name);
export const isAudio = (name: string) => AUDIO.test(name);

/**
 * Plain text with line breaks from Mochi Markdown: attachments, transclusions and code fences
 * go, links keep their text, emphasis and heading marks go, and any HTML goes the way an Anki
 * field's does.
 */
export function markdownToText(markdown: string): string {
  const text = markdown
    .replace(/^[ \t]*(```|~~~).*$/gm, "")
    .replace(/!\[\[[^\]]*\]\]/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[\[([^\]|]*)\|?([^\]]*)\]\]/g, (_, first: string, second: string) =>
      second ? first : "",
    )
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<audio\b[^>]*>(?:[\s\S]*?<\/audio>)?/gi, "")
    .replace(/\{\{(?:\d+::)?([\s\S]*?)\}\}/g, "$1")
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, "")
    .replace(/^[ \t]{0,3}>[ \t]?/gm, "")
    .replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, "$2")
    .replace(/(^|[^\w*])\*(?=\S)([^*\n]*?\S)\*(?!\*)/g, "$1$2")
    .replace(/(^|[^\w])_(?=\S)([^_\n]*?\S)_(?![\w])/g, "$1$2")
    .replace(/(~~|==)(?=\S)([\s\S]*?\S)\1/g, "$2")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/\\([\\`*_{}[\]()#+\-.!>~|])/g, "$1");
  // Markdown ends a line with a newline, not `<br>`, so HTML's own line breaks are all that change.
  return htmlToText(text.replace(/\n/g, "<br>"));
}

/**
 * The field names a template's first side shows, in order, from its `<< Field >>` placeholders.
 * Section tags such as `<< #flag >>` and `<</ flag >>` are not fields.
 */
export function questionFields(template: string): string[] {
  const [front] = splitSides(template);
  const names: string[] = [];
  for (const match of front.matchAll(/<<\s*(?![\s#^/])([^<>]+?)\s*>>/g)) {
    names.push(match[1] as string);
  }
  return names;
}
