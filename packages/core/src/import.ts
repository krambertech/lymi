import { z } from "zod";
import { LanguageTag, type Rating, ReviewModeKey } from "./types";

/** Where an import's file came from. Each source is one adapter on the server. */
export const ImportSource = z.enum(["anki"]);
export type ImportSource = z.infer<typeof ImportSource>;

/**
 * Where an import is. `uploading` until every part has landed, `inspecting` while the server
 * reads the file, `ready` while the preview waits for the learner, `importing` while cards
 * are written, then `done`, `failed` or `cancelled`.
 */
export const ImportStatus = z.enum([
  "uploading",
  "inspecting",
  "ready",
  "importing",
  "done",
  "failed",
  "cancelled",
]);
export type ImportStatus = z.infer<typeof ImportStatus>;

/** Why an import stopped, as a code the app turns into a sentence. Never carries file content. */
export const ImportFailure = z.enum([
  "unrecognized",
  "damaged",
  "too_large",
  "empty",
  "upload_incomplete",
  "expired",
  "internal",
]);
export type ImportFailure = z.infer<typeof ImportFailure>;

/** What one source field becomes on a Lymi card. */
export const FieldRole = z.enum(["term", "meaning", "pronunciation", "example", "notes", "skip"]);
export type FieldRole = z.infer<typeof FieldRole>;

/** The text fields an imported card fills. */
export type ImportedFields = {
  term: string;
  meaning?: string | undefined;
  pronunciation?: string | undefined;
  example?: string | undefined;
  notes?: string | undefined;
};

/** One recall from the source's log, in the mode it was asked. */
export type ImportedReview = { at: Date; rating: Rating };

/** A mode's progress: its log, and the source's own schedule when it has one. */
export type ImportedProgress = {
  mode: ReviewModeKey;
  reviews: ImportedReview[];
  /** The source treats the mode as not started, as after a reset; its log is history only. */
  unstarted?: boolean | undefined;
  /** The due date the source had. Kept so the learner's schedule does not move on import. */
  due?: Date | undefined;
  /** The source's memory state, used only when the mode has a schedule and no log. */
  memory?: { stability: number; difficulty: number; lastReview: Date } | undefined;
};

/**
 * The one card shape every source adapter produces and the one writer consumes. `externalId`
 * is stable across exports of the same collection, so importing a file again updates.
 */
export type ImportedCard = {
  externalId: string;
  /** The adapter's key for the deck, as listed in the preview. */
  deckKey: string;
  /** The adapter's key for the kind of note it came from, as listed in the preview. */
  noteTypeKey: string;
  fields: ImportedFields;
  tags: string[];
  /** Text modes the source asked, in the order the source introduced them. */
  modes: ReviewModeKey[];
  /** A suspended card arrives archived. */
  archived: boolean;
  /** The adapter's name for the first picture, fetched only while writing. */
  picture?: string | undefined;
  progress: ImportedProgress[];
  /** Fields cut or moved to fit Lymi's limits, for the preview's count. */
  shortened: boolean;
};

/** The longest text each imported field keeps, from `CardInput` and `DeckInput`. */
export const IMPORT_LIMITS = {
  term: 500,
  meaning: 1000,
  pronunciation: 200,
  example: 1000,
  notes: 2000,
  tags: 20,
  tag: 40,
  deckName: 80,
  deckDescription: 500,
} as const;

/** Tags that are the source's own bookkeeping rather than the learner's labels. */
const DROPPED_TAGS = new Set(["marked", "leech"]);

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  laquo: "«",
  raquo: "»",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  shy: "",
  zwj: "\u200d",
  zwnj: "\u200c",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, name: string) => {
    if (name[0] === "#") {
      const code =
        name[1] === "x" || name[1] === "X"
          ? Number.parseInt(name.slice(2), 16)
          : Number.parseInt(name.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }
    return ENTITIES[name.toLowerCase()] ?? match;
  });
}

const BLOCK_TAGS = /<\/?(div|p|li|ul|ol|tr|table|h[1-6]|hr|blockquote|pre)\b[^>]*>/gi;
/** Stands for a block edge until adjacent edges merge, so `</div><div>` is one line break. */
const EDGE = "\ue000";

/**
 * Plain text with line breaks from an HTML field: block tags and `<br>` become newlines,
 * styles, scripts, comments and every other tag go, entities decode. Media references
 * such as `[sound:x.mp3]` are removed; pictures are read separately.
 */
export function htmlToText(html: string): string {
  const text = decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
      .replace(/\ue000/g, "")
      .replace(/<br\b[^>]*>/gi, "\n")
      .replace(BLOCK_TAGS, EDGE)
      .replace(/<[^>]*>/g, "")
      .replace(/\ue000[\s\ue000]*/g, (run) =>
        run.includes("\n") ? run.replaceAll(EDGE, "") : "\n",
      )
      .replace(/\[sound:[^\]]*\]/g, ""),
  );
  return text
    .split("\n")
    .map((line) => line.replace(/[ \t\f\v\u00a0]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Every `<img src>` in an HTML field, in order, entity-decoded. */
export function imageSources(html: string): string[] {
  const sources: string[] = [];
  for (const match of html.matchAll(/<img\b[^>]*?\bsrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
    const src = match[2] ?? match[3] ?? match[4];
    if (src) sources.push(decodeEntities(src));
  }
  return sources;
}

/** How many `[sound:]` references a field holds. Audio is dropped and counted. */
export function soundCount(html: string): number {
  return html.match(/\[sound:[^\]]*\]/g)?.length ?? 0;
}

function cut(text: string, limit: number): string {
  const chars = [...text];
  return chars.length <= limit
    ? text
    : `${chars
        .slice(0, limit - 1)
        .join("")
        .trimEnd()}…`;
}

function length(text: string): number {
  return [...text].length;
}

/**
 * Fields fitted to Lymi's limits. A meaning past its limit keeps what fits and moves the
 * whole text to the top of the notes; any other field past its limit is cut. `shortened`
 * says whether anything was cut or moved.
 */
export function fitFields(fields: ImportedFields): { fields: ImportedFields; shortened: boolean } {
  let shortened = false;
  const bounded = (value: string | undefined, limit: number) => {
    if (value === undefined || value === "") return undefined;
    if (length(value) <= limit) return value;
    shortened = true;
    return cut(value, limit);
  };
  let notes = fields.notes || undefined;
  let meaning = fields.meaning || undefined;
  if (meaning && length(meaning) > IMPORT_LIMITS.meaning) {
    notes = notes ? `${meaning}\n\n${notes}` : meaning;
    meaning = cut(meaning, IMPORT_LIMITS.meaning);
    shortened = true;
  }
  const fitted: ImportedFields = {
    term: bounded(fields.term, IMPORT_LIMITS.term) ?? "",
    meaning,
    pronunciation: bounded(fields.pronunciation, IMPORT_LIMITS.pronunciation),
    example: bounded(fields.example, IMPORT_LIMITS.example),
    notes: bounded(notes, IMPORT_LIMITS.notes),
  };
  return { fields: fitted, shortened };
}

/**
 * A source's tags as Lymi keeps them: bookkeeping tags dropped, each cut to the tag limit,
 * duplicates removed, at most the tag limit kept.
 */
export function importTags(tags: readonly string[]): { tags: string[]; shortened: boolean } {
  const kept: string[] = [];
  const seen = new Set<string>();
  let shortened = false;
  for (const raw of tags) {
    const tag = raw.trim();
    if (!tag || DROPPED_TAGS.has(tag.toLowerCase())) continue;
    const fitted =
      length(tag) > IMPORT_LIMITS.tag ? [...tag].slice(0, IMPORT_LIMITS.tag).join("") : tag;
    if (fitted !== tag) shortened = true;
    const key = fitted.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(fitted);
  }
  if (kept.length > IMPORT_LIMITS.tags) {
    shortened = true;
    kept.length = IMPORT_LIMITS.tags;
  }
  return { tags: kept, shortened };
}

const ROLE_PATTERNS: [Exclude<FieldRole, "term" | "skip">, RegExp][] = [
  [
    "pronunciation",
    /\b(reading|pronunciation|furigana|kana|ipa|romaji|pinyin|transcription)\b|読み/i,
  ],
  ["example", /\b(example|sentence|context|usage)s?\b|例文/i],
  ["notes", /\b(notes?|extra|comments?|hint|grammar|remarks?|mnemonic)\b/i],
  ["meaning", /\b(back|meaning|definition|translation|english|gloss|answer)\b|意味/i],
];
const TERM_PATTERN =
  /\b(front|word|term|expression|vocab(ulary)?|kanji|question|target|phrase)\b|単語/i;
const SKIP_PATTERN = /\b(audio|sound|image|picture|photo|add reverse)\b/i;

/**
 * A first guess at what each field is, by its name. A named term field wins; otherwise the
 * first field is the term. A named meaning field wins; otherwise the first unclaimed field
 * with no other role is the meaning. Everything else that is not media becomes notes. The
 * learner corrects this in the preview.
 */
export function guessFieldRoles(names: readonly string[]): FieldRole[] {
  const roles: (FieldRole | undefined)[] = names.map((name) => {
    if (SKIP_PATTERN.test(name)) return "skip";
    if (TERM_PATTERN.test(name)) return "term";
    return ROLE_PATTERNS.find(([, pattern]) => pattern.test(name))?.[0];
  });
  const claim = (role: FieldRole) => {
    let found = false;
    for (let i = 0; i < roles.length; i++) {
      if (roles[i] !== role) continue;
      if (found) roles[i] = "notes";
      found = true;
    }
    return found;
  };
  if (!claim("term")) {
    const first = roles.findIndex((role) => role !== "skip");
    if (first >= 0) roles[first] = "term";
  }
  if (!claim("meaning")) {
    const next = roles.indexOf(undefined);
    if (next >= 0) roles[next] = "meaning";
  }
  claim("pronunciation");
  claim("example");
  return roles.map((role) => role ?? "notes");
}

/**
 * Fields from a note's values under the chosen roles. Several fields with the notes role join
 * with a blank line; any other role takes its first non-empty field.
 */
export function fieldsFromRoles(
  values: readonly string[],
  roles: readonly FieldRole[],
): Partial<ImportedFields> {
  const fields: Partial<ImportedFields> = {};
  const notes: string[] = [];
  values.forEach((value, i) => {
    const role = roles[i] ?? "skip";
    if (!value || role === "skip") return;
    if (role === "notes") notes.push(value);
    else if (!fields[role]) fields[role] = value;
  });
  if (notes.length > 0) fields.notes = notes.join("\n\n");
  return fields;
}

/** The largest file an import accepts. A collection past the database limit is refused on inspection. */
export const MAX_IMPORT_BYTES = 1024 * 1024 * 1024;

/** Every part of an upload but the last is exactly this size, as R2 multipart uploads require. */
export const IMPORT_PART_BYTES = 10 * 1024 * 1024;

export const ImportStartInput = z.object({
  fileName: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(/\.(apkg|colpkg)$/i, "Choose the .apkg or .colpkg file Anki exports."),
  byteSize: z
    .number()
    .int()
    .positive()
    .max(MAX_IMPORT_BYTES, "The file is larger than 1 GB. Export one deck at a time instead."),
});
export type ImportStartInput = z.infer<typeof ImportStartInput>;

export const ImportChoicesInput = z.object({
  languages: z
    .record(z.string(), LanguageTag.nullable())
    .meta({ description: "Language per deck key from the summary; null is a deck of no language" }),
  roles: z
    .record(z.string(), z.array(FieldRole).max(64))
    .meta({ description: "What each field becomes, per note type key from the summary" }),
});
export type ImportChoicesInput = z.infer<typeof ImportChoicesInput>;

export const ImportDuplicate = z.object({
  term: z.string(),
  deckName: z.string().meta({ description: "The deck that already holds the term" }),
});

/** What an import will write, or wrote. */
export const ImportCounts = z
  .object({
    added: z.number().int().meta({ description: "New cards" }),
    existing: z.number().int().meta({
      description: "Cards an earlier import of the same file added; blank fields are filled in",
    }),
    duplicates: z
      .number()
      .int()
      .meta({ description: "Cards skipped because the term is already in Lymi in that language" }),
    duplicateExamples: z.array(ImportDuplicate).max(20),
    skipped: z.number().int().meta({ description: "Notes with no text for the term" }),
    archived: z
      .number()
      .int()
      .meta({ description: "New cards that arrive archived, from suspended cards" }),
    shortened: z.number().int().meta({ description: "New cards with text cut or moved to fit" }),
    reviews: z
      .number()
      .int()
      .meta({ description: "Past recalls brought across with the new cards" }),
    pictures: z.number().int(),
    picturesSkipped: z
      .number()
      .int()
      .meta({ description: "Pictures that could not be read or stored" }),
    decks: z.number().int().meta({ description: "Decks created" }),
  })
  .meta({ id: "ImportCounts" });
export type ImportCounts = z.infer<typeof ImportCounts>;

export const emptyImportCounts = (): ImportCounts => ({
  added: 0,
  existing: 0,
  duplicates: 0,
  duplicateExamples: [],
  skipped: 0,
  archived: 0,
  shortened: 0,
  reviews: 0,
  pictures: 0,
  picturesSkipped: 0,
  decks: 0,
});

export const ImportSummaryOut = z
  .object({
    decks: z.array(
      z.object({
        key: z.string(),
        name: z.string(),
        description: z.string().nullable(),
        cards: z.number().int(),
      }),
    ),
    noteTypes: z.array(
      z.object({
        key: z.string(),
        name: z.string(),
        kind: z.enum(["basic", "cloze"]),
        fields: z.array(z.string()),
        roles: z.array(FieldRole),
        questions: z.array(z.number().int().nullable()),
        notes: z.number().int(),
        samples: z.array(z.array(z.string())),
      }),
    ),
    notes: z.number().int(),
    reviews: z.number().int(),
    pictures: z.number().int(),
    audio: z.number().int().meta({ description: "Sound references, which are not imported" }),
    unsupported: z
      .number()
      .int()
      .meta({ description: "Notes of a kind Lymi cannot ask, left out" }),
    languages: z
      .record(z.string(), z.string().nullable())
      .meta({ description: "A first guess at each deck's language" }),
  })
  .meta({ id: "ImportSummary" });
export type ImportSummaryOut = z.infer<typeof ImportSummaryOut>;

export const ImportPreviewOut = ImportCounts.extend({
  decks: z.array(
    z.object({
      key: z.string(),
      name: z.string().meta({ description: "The Lymi deck's name" }),
      cards: z.number().int().meta({ description: "New cards going into it" }),
      existingDeckId: z
        .string()
        .nullable()
        .meta({ description: "The deck an earlier import made, which new cards join" }),
    }),
  ),
  samples: z
    .record(
      z.string(),
      z.array(
        z.object({
          term: z.string(),
          meaning: z.string().nullable(),
          pronunciation: z.string().nullable(),
          example: z.string().nullable(),
          notes: z.string().nullable(),
          tags: z.array(z.string()),
          modes: z.array(ReviewModeKey),
          picture: z.boolean(),
        }),
      ),
    )
    .meta({ description: "Up to three cards per note type key, as they would arrive" }),
  tags: z.number().int().meta({ description: "Distinct tags on the new cards" }),
  audio: z.number().int(),
  unsupported: z.number().int(),
}).meta({ id: "ImportPreview" });
export type ImportPreviewOut = z.infer<typeof ImportPreviewOut>;

const Timestamp = z.iso.datetime().meta({ description: "ISO 8601 timestamp" });

export const ImportOut = z
  .object({
    id: z.string(),
    source: ImportSource,
    fileName: z.string(),
    byteSize: z.number().int(),
    status: ImportStatus,
    failure: ImportFailure.nullable(),
    summary: ImportSummaryOut.nullable().meta({
      description: "What the file holds, once it has been read",
    }),
    choices: ImportChoicesInput.nullable().meta({
      description: "The choices the import was confirmed with",
    }),
    counts: ImportCounts.nullable().meta({
      description: "What was written, while importing and after",
    }),
    progress: z.object({
      written: z.number().int().meta({ description: "Chunks written" }),
      chunks: z.number().int().meta({ description: "Chunks to write" }),
    }),
    upload: z.object({
      partBytes: z.number().int().meta({ description: "Size of every part but the last" }),
      parts: z.number().int().meta({ description: "How many parts the file is sent in" }),
      received: z.number().int(),
    }),
    createdBy: z.enum(["user", "api", "mcp", "ai", "system"]),
    createdAt: Timestamp,
    updatedAt: Timestamp,
    finishedAt: Timestamp.nullable(),
    archivedAt: Timestamp.nullable(),
  })
  .meta({ id: "Import" });
export type ImportOut = z.infer<typeof ImportOut>;
