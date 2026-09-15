/** Anki's own field syntax: cloze deletions, furigana and the fields a template asks from. */

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

/** The text as read, kanji replaced by their readings: `漢字[かんじ]` → `かんじ`. */
export function furiganaReading(text: string): string {
  return text.replace(FURIGANA, (match, base: string, reading: string) =>
    HAN.test(base) && !reading.startsWith("sound:") ? reading : match,
  );
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
