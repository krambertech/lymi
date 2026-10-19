import { TEXT_IMPORT_MAGIC } from "@lymi/core";

/**
 * Pleco's flashcard text export: one card per line as characters, pinyin and definition split by
 * tabs, under `//` lines that name a category. Characters are simplified, traditional, or both as
 * `我们[我們]`. A card in several categories is written once under each. Pleco's manual,
 * Flashcards, Import/Export.
 */

/** One card line as Pleco wrote it, with the category it sits under. */
export type PlecoLine = {
  simplified: string;
  traditional: string;
  /** The characters had a `[…]` form, so the file gives both scripts. */
  bracketed: boolean;
  pinyin: string;
  definition: string;
  /** The category path, such as `HSK 1/Verbs`, or null before the first `//` line. */
  category: string | null;
};

export type PlecoText = { lines: PlecoLine[]; categories: string[] };

const HAN = /\p{Script=Han}/u;
const BOTH = /^([^[\]]+)\[([^[\]]+)\]$/u;
/** Pinyin as Pleco writes it, with tone numbers such as `ni3hao3` and `kai1//xue2`, or with marks. */
const PINYIN = /^[\p{Script=Latin}\s'’/·,:0-5-]+$/u;
/** A link to another entry: Pleco hides its id, headword and pinyin, and shows the text before the close. */
const LINK = /[^]*([^]*)/gu;
/** Pleco's own formatting marks, such as bold, which it writes as private-use characters. */
const MARKUP = /[-]/gu;

/** The text of an export: UTF-8, or UTF-16 with its byte-order mark, as Pleco's encodings offer. */
export function decodePleco(bytes: Uint8Array, fatal = true): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le", { fatal }).decode(bytes.subarray(2));
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    const swapped = new Uint8Array(bytes.length - 2 - (bytes.length % 2));
    for (let i = 0; i < swapped.length; i += 2) {
      swapped[i] = bytes[i + 3] as number;
      swapped[i + 1] = bytes[i + 2] as number;
    }
    return new TextDecoder("utf-16le", { fatal }).decode(swapped);
  }
  return new TextDecoder("utf-8", { fatal }).decode(bytes).replace(/^﻿/, "");
}

/** A definition without Pleco's markup: a link keeps the text it shows. */
export function plainDefinition(text: string): string {
  return text.replace(LINK, "$1").replace(MARKUP, "").trim();
}

/** Pinyin without the `//` Pleco puts inside a separable word, such as kai1//xue2; tones stay as sent. */
export function plainPinyin(text: string): string {
  return text.replace(/\/\//g, "").trim();
}

/** A `//` line's category path with its parts trimmed, or null for a bare `//`. */
function categoryOf(line: string): string | null {
  const parts = line
    .slice(2)
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join("/") : null;
}

function cardOf(line: string, category: string | null): PlecoLine {
  const [chars = "", pinyin = "", ...rest] = line.split("\t");
  const headword = chars.trim();
  const both = BOTH.exec(headword);
  const simplified = (both?.[1] ?? headword).trim();
  const traditional = (both?.[2] ?? headword).trim();
  return {
    simplified,
    traditional,
    bracketed: !!both,
    pinyin: plainPinyin(pinyin),
    // Pleco warns that an extra tab misreads the fields, so anything past the third stays in the definition.
    definition: plainDefinition(rest.join(" ")),
    category,
  };
}

/** Every card line and category in the text, blank lines aside; a line may have no characters. */
export function parsePleco(text: string): PlecoText {
  const lines: PlecoLine[] = [];
  const categories = new Set<string>();
  let category: string | null = null;
  for (const raw of text.split(/\r\n|\r|\n/)) {
    if (!raw.trim()) continue;
    if (raw.startsWith("//")) {
      category = categoryOf(raw);
      if (category) categories.add(category);
      continue;
    }
    lines.push(cardOf(raw, category));
  }
  return { lines, categories: [...categories] };
}

/**
 * Whether text reads as a Pleco export rather than a Quizlet set: not the app's own pasted text,
 * its card lines start with Chinese characters with pinyin or nothing after them, and a category
 * line or a tone number shows it is Pleco's.
 */
export function looksLikePleco(text: string): boolean {
  if (text.startsWith(`${TEXT_IMPORT_MAGIC}\n`)) return false;
  let categories = 0;
  let cards = 0;
  let numbered = 0;
  let other = 0;
  for (const raw of text.split(/\r\n|\r|\n/).slice(0, 200)) {
    if (!raw.trim()) continue;
    if (raw.startsWith("//")) {
      categories++;
      continue;
    }
    const [chars = "", pinyin = ""] = raw.split("\t");
    const pinyinText = plainPinyin(pinyin).normalize("NFC");
    if (!HAN.test(chars) || (pinyinText && !PINYIN.test(pinyinText))) {
      other++;
      continue;
    }
    cards++;
    if (/[a-zü][0-5]/iu.test(pinyinText)) numbered++;
  }
  if (cards === 0 || other > cards) return false;
  return categories > 0 || numbered > 0;
}
