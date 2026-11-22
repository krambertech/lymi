export type TextSeparators = { field: string; row: string };

export const MAX_TEXT_IMPORT_CARDS = 5000;
export const MAX_TEXT_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_SEPARATOR_LENGTH = 10;

export type TextCard = { term: string; definition: string };

export type ParsedText = {
  cards: TextCard[];
  oneSided: number;
  blank: number;
  repeated: number;
};

export type DetectedSeparators = TextSeparators & {
  confidence: number;
};

// oxlint-disable-next-line eslint/no-control-regex -- the control characters are the point.
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g;

export function normaliseText(text: string): string {
  return text
    .replace(/^\ufeff/, "")
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL, "");
}

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

export function splitRow(row: string, field: string): [string, string] {
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
  if (rows.length > 1 && rows[rows.length - 1]?.trim() === "") rows.pop();
  return rows;
}

const termKey = (term: string) => term.normalize("NFC").toLocaleLowerCase().replace(/\s+/g, " ");

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

export const TEXT_IMPORT_MAGIC = "LYMI-TEXT-IMPORT 1";

export type TextImportMeta = {
  separators: TextSeparators;
  deckName: string;
  deckId?: string | null | undefined;
};

export function encodeTextImport(meta: TextImportMeta, text: string): string {
  return `${TEXT_IMPORT_MAGIC}\n${JSON.stringify(meta)}\n${text}`;
}

function isSeparator(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_SEPARATOR_LENGTH;
}

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
