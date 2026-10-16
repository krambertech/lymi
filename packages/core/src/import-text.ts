/**
 * Pasted flashcard text, as Quizlet's "Copy text" export writes it: one card per row, term and
 * definition split by a separator the learner picked, with no quoting or escaping. The client
 * previews with these functions and the server's Quizlet adapter imports with them, so the
 * preview and the import never disagree. Pure: no DOM, no network.
 */

/** The two separators a text export uses: between term and definition, and between rows. */
export type TextSeparators = { field: string; row: string };

/** The most cards one pasted import takes. */
export const MAX_TEXT_IMPORT_CARDS = 5000;
/** The most text one pasted import takes, in bytes. */
export const MAX_TEXT_IMPORT_BYTES = 5 * 1024 * 1024;
/** The longest custom separator. */
export const MAX_SEPARATOR_LENGTH = 10;

/** One parsed row with both sides. */
export type TextCard = { term: string; definition: string };

export type ParsedText = {
  cards: TextCard[];
  /** Rows with text on only one side, which are skipped. */
  oneSided: number;
  /** Rows with no text at all, which are dropped without a mention. */
  blank: number;
  /** Cards whose term an earlier card in the same text already had. All of them are imported. */
  repeated: number;
};

export type DetectedSeparators = TextSeparators & {
  /** Share of non-blank rows that split into two sides under these separators, 0 to 1. */
  confidence: number;
};

// Control characters other than tab and line breaks never belong on a card.
// biome-ignore lint/suspicious/noControlCharactersInRegex: the control characters are the point.
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g;

/** The text with a leading BOM removed, line endings as `\n` and control characters gone. */
export function normaliseText(text: string): string {
  return text
    .replace(/^\ufeff/, "")
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL, "");
}

/** A `"`-quoted first field as RFC 4180 reads it, or null when the row isn't quoted that way. */
function quotedField(row: string, field: string): { value: string; rest: string } | null {
  if (!row.startsWith('"')) return null;
  let value = "";
  let i = 1;
  while (i < row.length) {
    const ch = row[i];
    if (ch === '"') {
      if (row[i + 1] === '"') {
        value += '"';
        i += 2;
        continue;
      }
      const after = row.slice(i + 1);
      if (after.trimStart().startsWith(field)) {
        return { value, rest: after.trimStart().slice(field.length) };
      }
      return after.trim() === "" ? { value, rest: "" } : null;
    }
    value += ch;
    i++;
  }
  return null;
}

function unquote(side: string): string {
  const quoted = quotedField(side, "\u0000");
  return quoted && quoted.rest === "" ? quoted.value : side;
}

/** One row as term and definition, split on the first field separator. */
export function splitRow(row: string, field: string): [string, string] {
  // Quizlet never quotes, but a CSV saved elsewhere does: with commas, a quoted row reads as CSV.
  if (field === ",") {
    const quoted = quotedField(row.trimStart(), field);
    if (quoted) return [quoted.value.trim(), unquote(quoted.rest.trim()).trim()];
  }
  const at = field ? row.indexOf(field) : -1;
  if (at < 0) return [row.trim(), ""];
  return [row.slice(0, at).trim(), row.slice(at + field.length).trim()];
}

function rowsOf(text: string, row: string): string[] {
  const rows = row ? text.split(row) : [text];
  // A trailing row separator leaves one empty row, which is no row at all.
  if (rows.length > 1 && rows[rows.length - 1]?.trim() === "") rows.pop();
  return rows;
}

const termKey = (term: string) => term.normalize("NFC").toLocaleLowerCase().replace(/\s+/g, " ");

/** Every card the text holds under these separators, with what was left out. */
export function parseDelimited(text: string, separators: TextSeparators): ParsedText {
  const result: ParsedText = { cards: [], oneSided: 0, blank: 0, repeated: 0 };
  const seen = new Set<string>();
  for (const row of rowsOf(normaliseText(text), separators.row)) {
    const [term, definition] = splitRow(row, separators.field);
    if (!term && !definition) {
      result.blank++;
      continue;
    }
    if (!term || !definition) {
      result.oneSided++;
      continue;
    }
    const key = termKey(term);
    if (seen.has(key)) result.repeated++;
    else seen.add(key);
    result.cards.push({ term, definition });
  }
  return result;
}

const SAMPLE_CHARS = 50_000;

/** Runs of one repeated punctuation mark, such as `||` or `##`, that a custom separator could be. */
function customTokens(sample: string): string[] {
  const counts = new Map<string, number>();
  for (const match of sample.matchAll(/([^\p{L}\p{N}\s"'])\1{1,9}/gu)) {
    counts.set(match[0], (counts.get(match[0]) ?? 0) + 1);
  }
  return [...counts]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([token]) => token);
}

/**
 * The separators that split most rows into two sides. Ties go to Quizlet's defaults first
 * (Tab, then New line), so a short paste reads the way Quizlet most often writes it.
 */
export function detectSeparators(text: string): DetectedSeparators {
  const sample = normaliseText(text).slice(0, SAMPLE_CHARS);
  const custom = customTokens(sample);
  const fields = ["\t", ",", ...custom];
  const rows = ["\n", ";", ...custom];
  let best: DetectedSeparators & { score: number } = {
    field: "\t",
    row: "\n",
    confidence: 0,
    score: -1,
  };
  for (const row of rows) {
    for (const field of fields) {
      if (field === row || !sample.includes(field)) continue;
      let filled = 0;
      let paired = 0;
      for (const line of rowsOf(sample, row)) {
        if (!line.trim()) continue;
        filled++;
        const [term, definition] = splitRow(line, field);
        if (term && definition) paired++;
      }
      if (filled === 0) continue;
      const confidence = paired / filled;
      const score = paired * confidence;
      if (score > best.score) best = { field, row, confidence, score };
    }
  }
  return { field: best.field, row: best.row, confidence: Math.max(0, best.confidence) };
}

/**
 * What the web app uploads for a pasted import: a first line naming the format, a line of
 * JSON with the learner's choices, then the text exactly as pasted. A plain .txt sent through
 * the API has no header and is read with detected separators.
 */
export const TEXT_IMPORT_MAGIC = "LYMI-TEXT-IMPORT 1";

export type TextImportMeta = {
  separators: TextSeparators;
  /** The new deck's name. */
  deckName: string;
  /** An existing deck of the learner's to add the cards to, instead of a new deck. */
  deckId?: string | null | undefined;
};

export function encodeTextImport(meta: TextImportMeta, text: string): string {
  return `${TEXT_IMPORT_MAGIC}\n${JSON.stringify(meta)}\n${text}`;
}

function isSeparator(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_SEPARATOR_LENGTH;
}

/** The choices and text of an uploaded text import; choices are null for a plain .txt. */
export function decodeTextImport(raw: string): { meta: TextImportMeta | null; text: string } {
  const body = raw.replace(/^\ufeff/, "");
  if (!body.startsWith(`${TEXT_IMPORT_MAGIC}\n`)) return { meta: null, text: raw };
  const rest = body.slice(TEXT_IMPORT_MAGIC.length + 1);
  const end = rest.indexOf("\n");
  const line = end < 0 ? rest : rest.slice(0, end);
  const text = end < 0 ? "" : rest.slice(end + 1);
  try {
    const value = JSON.parse(line) as Partial<TextImportMeta>;
    const seps = value.separators;
    if (!seps || !isSeparator(seps.field) || !isSeparator(seps.row) || !seps.field) {
      return { meta: null, text };
    }
    return {
      meta: {
        separators: { field: seps.field, row: seps.row },
        deckName: typeof value.deckName === "string" ? value.deckName : "",
        deckId: typeof value.deckId === "string" ? value.deckId : null,
      },
      text,
    };
  } catch {
    return { meta: null, text };
  }
}
