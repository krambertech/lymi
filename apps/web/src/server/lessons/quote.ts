import { EXAMPLE_LENGTH, fitsExample } from "@lymi/core";

const UNSPACED =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;

function wordStart(text: string, at: number, needle: string): boolean {
  if (at === 0) return true;
  const before = String.fromCodePoint(text.codePointAt(at - 1) ?? 32);
  return !/[\p{L}\p{M}\p{N}]/u.test(before) || UNSPACED.test(before) || UNSPACED.test(needle);
}

export function findTerm(sentence: string, term: string): { start: number; end: number } | null {
  const text = sentence.toLowerCase();
  const tries = [term, term.split(" · ")[0] ?? ""]
    .map((t) => t.toLowerCase().trim())
    .filter(Boolean);
  for (const word of (term.split(" · ")[0] ?? "").toLowerCase().split(/\s+/)) {
    const chars = [...word];
    if (chars.length >= 4) tries.push(chars.slice(0, Math.max(3, chars.length - 2)).join(""));
  }
  for (const needle of tries) {
    for (let start = text.indexOf(needle); start >= 0; start = text.indexOf(needle, start + 1)) {
      if (wordStart(text, start, needle)) return { start, end: start + needle.length };
    }
  }
  return null;
}

function findChangedForm(sentence: string, term: string): { start: number; end: number } | null {
  const text = sentence.toLowerCase();
  const words = (term.split(" · ")[0] ?? "").toLowerCase().split(/[\s'’]+/);
  for (const word of words.filter((w) => [...w].length >= 4)) {
    for (let length = [...word].length - 3; length >= 3; length--) {
      const needle = [...word].slice(0, length).join("");
      for (let at = text.indexOf(needle); at >= 0; at = text.indexOf(needle, at + 1)) {
        if (wordStart(text, at, needle)) return { start: at, end: at + needle.length };
      }
    }
  }
  return null;
}

export function holdsEveryWord(sentence: string, term: string): boolean {
  const words = (term.split(" · ")[0] ?? "").split(/[\s'’]+/).filter(Boolean);
  const long = words.filter((word) => [...word].length >= 4);
  const needed = long.length > 0 ? long : words;
  return needed.length > 0 && needed.every((word) => findTerm(sentence, word) !== null);
}

export function quoteAround(sentence: string, term: string): string {
  const text = sentence.replace(/\s+/g, " ").trim();
  if (fitsExample(text)) return text;
  const chars = [...text];
  const found = findTerm(text, term) ?? findChangedForm(text, term);
  const at = found
    ? {
        start: [...text.slice(0, found.start)].length,
        end: [...text.slice(0, found.end)].length,
      }
    : { start: 0, end: 0 };
  const room = EXAMPLE_LENGTH - 2;
  const middle = Math.floor((at.start + at.end) / 2);
  let end = Math.min(chars.length, Math.max(room, middle + Math.ceil(room / 2)));
  let start = Math.max(0, end - room);
  end = Math.min(chars.length, start + room);
  if (start > 0) {
    const space = chars.indexOf(" ", start);
    if (space >= 0 && space < at.start) start = space + 1;
  }
  if (end < chars.length) {
    const space = chars.lastIndexOf(" ", end);
    if (space > start && space >= at.end) end = space;
  }
  const quote = chars.slice(start, end).join("").trim();
  return `${start > 0 ? "…" : ""}${quote}${end < chars.length ? "…" : ""}`;
}
