import { z } from "zod";
import { moraCount } from "./reading";
import { OPEN } from "./responses/common";
import { type FieldSource, LanguageTag, type Rating, ReviewModeKey } from "./types";

/** Where an import's file came from. Each source is one adapter on the server. */
export const ImportSource = z.enum(["anki", "mochi", "noji", "lymi", "quizlet"]);
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
  /** Modes the source asked, in the order the source introduced them. */
  modes: ReviewModeKey[];
  /** A suspended card arrives archived. */
  archived: boolean;
  /** The adapter's name for the first picture, fetched only while writing. */
  picture?: string | undefined;
  /** The adapter's name for the term's own recording, fetched only while writing. */
  recording?: string | undefined;
  /** Clips the note held besides the term's recording, such as a sentence's, which are left out. */
  soundsLeftOut?: number | undefined;
  /** The note had a pitch accent that could not be read as text, which is left out. */
  pitchLeftOut?: boolean | undefined;
  progress: ImportedProgress[];
  /** Fields cut or moved to fit Lymi's limits, for the preview's count. */
  shortened: boolean;
  /** The card's own language, where the source records one apart from its deck's. */
  language?: string | null | undefined;
  /** Where the text came from, from a Lymi zip; other sources' text is manual. */
  fieldSources?:
    | {
        meaning: FieldSource | null;
        example: FieldSource | null;
        pronunciation?: FieldSource | null | undefined;
        notes?: FieldSource | null | undefined;
      }
    | undefined;
  /** Where the learner found the word, such as "Lesson 14". */
  origin?: string | undefined;
  /** What the picture shows, so picture modes are asked from the start. */
  pictureDescription?: string | undefined;
  /** The card's memory hook and who wrote it, from a Lymi zip. */
  hook?: { text: string; source: FieldSource } | undefined;
};

/** The longest text each imported field keeps, from `CardInput` and `DeckInput`. */
export const IMPORT_LIMITS = {
  term: 500,
  meaning: 2000,
  pronunciation: 200,
  example: 2000,
  notes: 2000,
  hook: 200,
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

/** How many `[sound:]` references a field holds. */
export function soundCount(html: string): number {
  return html.match(/\[sound:[^\]]*\]/g)?.length ?? 0;
}

/** Every `[sound:]` file name in an Anki field, in order. */
export function soundSources(html: string): string[] {
  return [...html.matchAll(/\[sound:([^\]]*)\]/g)].flatMap((match) => {
    const name = decodeEntities(match[1] ?? "").trim();
    return name ? [name] : [];
  });
}

/** A recording an import can keep by its name; the bytes decide when it is stored. */
export function playableRecording(name: string): boolean {
  return /\.(mp3|m4a|mp4|aac|wav)$/i.test(name);
}

/** Lymi's own generated speech in an Anki export, which Lymi makes again rather than keeps. */
const LYMI_SPEECH = /^lymi-[^/]*-speech\.[a-z0-9]+$/i;
const AUDIO_FIELD = /\b(audio|sound|voice|recording)s?\b|音声/i;
const SENTENCE_FIELD = /\b(sentence|example|context|usage)s?\b|例文/i;

/**
 * The term's own recording among the clips a note's fields hold, by field: the first clip of a
 * field named for audio and not for a sentence, then of the term, reading or meaning field.
 * Every other clip, such as a sentence's, is left out and counted. Lymi's own speech is neither.
 */
export function termRecording(
  names: readonly string[],
  roles: readonly FieldRole[],
  clips: readonly (readonly string[])[],
): { recording: string | undefined; leftOut: number } {
  const own = clips.map((list) => list.filter((name) => !LYMI_SPEECH.test(name)));
  const total = own.reduce((sum, list) => sum + list.length, 0);
  const sentence = names.map(
    (name, i) => SENTENCE_FIELD.test(fieldWords(name)) || roles[i] === "example",
  );
  const order = [
    ...names.flatMap((name, i) => (AUDIO_FIELD.test(fieldWords(name)) && !sentence[i] ? [i] : [])),
    ...(["term", "pronunciation", "meaning"] as const).flatMap((role) =>
      roles.flatMap((r, i) => (r === role && !sentence[i] ? [i] : [])),
    ),
  ];
  const field = order.find((i) => (own[i]?.length ?? 0) > 0);
  const recording = field === undefined ? undefined : own[field]?.[0];
  return { recording, leftOut: total - (recording ? 1 : 0) };
}

type PitchUnit = { text: string; high: boolean; drop: boolean };
type PitchFrame = {
  tag: string;
  units: PitchUnit[];
  /** The element's own text is high, as an overline or `data-pitch="high"` says. */
  high: boolean;
  /** An empty child drew an overline or a downstep beside this element's text. */
  line: { high: boolean; drop: boolean };
  /** Drawn by this element when it is empty, as Yomitan draws a mora's line. */
  draws: { high: boolean; drop: boolean };
  drop: boolean;
};

const DOWNSTEP = "ꜜ";

function attribute(attrs: string, name: string): string {
  const match = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(attrs);
  return decodeEntities(match?.[2] ?? match?.[3] ?? match?.[4] ?? "");
}

function pitchItem(units: PitchUnit[]): string {
  const text = units.map((unit) => unit.text).join("");
  if (!units.some((unit) => unit.high || unit.drop)) {
    const plain = text
      .replace(/\s+/g, " ")
      .replace(/[＼\\]/g, DOWNSTEP)
      .trim();
    const positions = plain.match(/\d+/g);
    // A bare position, such as "0" or "[1][3]", reads as Yomitan writes it.
    return positions && /^[\s\d[\](),、・/]+$/.test(plain)
      ? positions.map((n) => `[${n}]`).join(" ")
      : plain;
  }
  let out = "";
  let position: number | null = null;
  let morae = 0;
  units.forEach((unit, i) => {
    out += unit.text;
    morae += moraCount(unit.text);
    const next = units[i + 1];
    if (position === null && (unit.drop || (unit.high && next && !next.high))) {
      out += DOWNSTEP;
      position = morae;
    }
  });
  return `${out.replace(/\s+/g, "")} [${position ?? 0}]`;
}

/**
 * A pitch accent field as one plain line, such as "はꜜし [1]": overlines and downstep marks in
 * HTML, as Yomitan and the pitch add-ons write them, become a downstep after the last high mora
 * and the accent's position. Graphs are dropped, so a field of graphs alone comes back empty.
 */
export function pitchNotation(html: string): string {
  const source = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(style|script|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/\[sound:[^\]]*\]/g, "");
  const frame = (tag: string, attrs = ""): PitchFrame => {
    const style = attribute(attrs, "style").toLowerCase().replace(/\s+/g, "");
    const names = attribute(attrs, "class").toLowerCase();
    const pitch = attribute(attrs, "data-pitch").toLowerCase();
    const next = attribute(attrs, "data-pitch-next").toLowerCase();
    const overline =
      /border-top(-style)?:[^;]*solid|border-top:[^;]*\d|text-decoration[^;]*overline/.test(style);
    const downstep = /border-right(-style)?:[^;]*solid|border-right:[^;]*\d/.test(style);
    return {
      tag,
      units: [],
      high:
        pitch === "high" ||
        /\b(high|overline)\b/.test(names) ||
        /text-decoration[^;]*overline/.test(style),
      drop: next === "low" && pitch === "high",
      line: { high: false, drop: false },
      draws: { high: overline, drop: downstep || /\bdownstep\b/.test(names) },
    };
  };
  const stack: PitchFrame[] = [frame("root")];
  const items: string[] = [];
  const top = () => stack[stack.length - 1] as PitchFrame;
  for (const match of source.matchAll(/<(\/?)([a-z][a-z0-9]*)\b([^>]*)>|([^<]+)/gi)) {
    const [, closing, tag, attrs, text] = match;
    if (text !== undefined) {
      const value = decodeEntities(text).replace(/\s+/g, " ");
      if (!value.trim()) continue;
      const high = stack.some((f) => f.high);
      top().units.push({ text: value.trim(), high, drop: false });
      continue;
    }
    const name = (tag ?? "").toLowerCase();
    if (/^(br|img|wbr|hr|input|meta|link)$/.test(name) || /\/\s*$/.test(attrs ?? "")) continue;
    if (!closing) {
      stack.push(frame(name, attrs));
      continue;
    }
    const at = stack.map((f) => f.tag).lastIndexOf(name);
    if (at <= 0) continue;
    while (stack.length > at) {
      const done = stack.pop() as PitchFrame;
      const parent = top();
      if (done.units.length === 0) {
        parent.line.high ||= done.draws.high;
        parent.line.drop ||= done.draws.drop;
        continue;
      }
      const lined = done.line.high || done.line.drop || done.drop;
      const units = lined
        ? [
            {
              text: done.units.map((unit) => unit.text).join(""),
              high: done.line.high || done.units.some((unit) => unit.high),
              drop: done.line.drop || done.drop,
            },
          ]
        : done.units;
      if (done.tag === "li") {
        const item = pitchItem(units);
        if (item) items.push(item);
      } else parent.units.push(...units);
    }
  }
  while (stack.length > 1) {
    const done = stack.pop() as PitchFrame;
    top().units.push(...done.units);
  }
  const rest = pitchItem(top().units);
  if (rest) items.push(rest);
  return items.filter((item) => /[\p{L}\p{N}]/u.test(item)).join(" · ");
}

/** A field's text as an import keeps it: pitch accent as its notation, a translation as one line. */
export function importFieldText(
  name: string,
  raw: string,
  toText: (raw: string) => string = htmlToText,
): string {
  if (isPitchField(name)) return pitchNotation(raw);
  const text = toText(raw);
  return isTranslationField(name) ? text.replace(/\s*\n\s*/g, " ") : text;
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

/** One text cut to its limit by code point, as `fitFields` cuts a field, and whether it was. */
export function fitText(text: string, limit: number): { text: string; shortened: boolean } {
  return length(text) <= limit
    ? { text, shortened: false }
    : { text: cut(text, limit), shortened: true };
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
  ["meaning", /\b(back|meaning|definition|translation|english|gloss(ary)?|answer)\b|意味/i],
];
const TERM_PATTERN =
  /\b(front|word|term|expression|vocab(ulary)?|kanji|question|target|phrase)\b|単語/i;
const SKIP_PATTERN =
  /\b(audio|sound|image|picture|photo|add reverse|sort|freq(uency)?|rank(ing)?)\b/i;
/** A translation of the example sentence, such as Kaishi's "Sentence Meaning": one line of notes. */
const TRANSLATION_PATTERN =
  /\b(sentence|example|context)s?\b.*\b(meaning|translation|english|gloss|definition)$/i;
/** Switches such as Lapis's `IsSentenceCard`, which choose a template rather than hold text. */
const FLAG_PATTERN = /^(is|has)\s/i;

/** "ExpressionFurigana" and "word_audio" as spaced words, so the patterns' word edges find them. */
function fieldWords(name: string): string {
  return name
    .replace(/(\p{Ll}|\d)(\p{Lu})/gu, "$1 $2")
    .replace(/[_\-.]+/g, " ")
    .trim();
}

function patternRole(text: string): FieldRole | undefined {
  if (TERM_PATTERN.test(text)) return "term";
  return ROLE_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0];
}

/**
 * The role a field's name alone names, if any. In a name of several words the last one decides,
 * so "Expression Reading" is a reading and "Main Definition" a meaning.
 */
export function namedFieldRole(name: string): FieldRole | undefined {
  const words = fieldWords(name);
  if (SKIP_PATTERN.test(words) || FLAG_PATTERN.test(words)) return "skip";
  if (/\bpitch\b/i.test(words)) {
    if (isPitchField(name)) return "notes";
    return /\bnotes?$/i.test(words) ? "notes" : "skip";
  }
  if (TRANSLATION_PATTERN.test(words)) return "notes";
  return patternRole(words.split(/\s+/).at(-1) ?? "") ?? patternRole(words);
}

/**
 * A field holding the term's pitch accent, such as Kaishi's "Pitch Accent" or Lapis's
 * "PitchPosition", which becomes one line of notes. "Pitch Accent Notes" is ordinary notes.
 */
export function isPitchField(name: string): boolean {
  const words = fieldWords(name);
  return (
    (/\bpitch\b/i.test(words) && !/\b(notes?|categor(y|ies))$/i.test(words)) ||
    /^accent$/i.test(words)
  );
}

/** A field translating the example sentence, which becomes one line of notes. */
export function isTranslationField(name: string): boolean {
  return TRANSLATION_PATTERN.test(fieldWords(name));
}

/** "Expression Furigana" beside "Expression" repeats that field with readings over its kanji. */
function isFuriganaOf(name: string, names: readonly string[]): boolean {
  const match = /^(.+?)\s*furigana$/i.exec(fieldWords(name));
  const base = match?.[1]?.toLowerCase();
  return !!base && names.some((other) => fieldWords(other).toLowerCase() === base);
}

/**
 * A first guess at what each field is, by its name. A named term field wins; otherwise the
 * first field is the term. A named meaning field wins; otherwise the first unclaimed field
 * with no other role is the meaning. Everything else that is not media becomes notes. The
 * learner corrects this in the preview.
 */
export function guessFieldRoles(names: readonly string[]): FieldRole[] {
  const roles = names.map((name) => (isFuriganaOf(name, names) ? "skip" : namedFieldRole(name)));
  // One pitch line is enough; a second pitch field, such as a graph beside positions, is left out.
  const pitch = names.findIndex((name, i) => roles[i] === "notes" && isPitchField(name));
  names.forEach((name, i) => {
    if (i !== pitch && roles[i] === "notes" && isPitchField(name)) roles[i] = "skip";
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
 * line by line; any other role takes its first non-empty field.
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
  // Each field starts its own line, so a translation and a pitch accent stay one line each.
  if (notes.length > 0) fields.notes = notes.join("\n");
  return fields;
}

/** The file names an import accepts: Anki's packages, Mochi's export and Lymi's own zip. */
export const IMPORT_FILE_NAME = /\.(apkg|colpkg|mochi|ofc|zip|txt|tsv|csv)$/i;

/** The source a file name suggests before the file is read; inspection decides. */
export function sourceOfFileName(fileName: string): ImportSource {
  if (/\.mochi$/i.test(fileName)) return "mochi";
  if (/\.ofc$/i.test(fileName)) return "noji";
  if (/\.(txt|tsv|csv)$/i.test(fileName)) return "quizlet";
  return /\.zip$/i.test(fileName) ? "lymi" : "anki";
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
    .regex(
      IMPORT_FILE_NAME,
      "Choose the .apkg, .colpkg, .mochi, .ofc or .zip file Anki, Mochi, Noji or Lymi exports, or the .txt of a Quizlet set.",
    ),
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
  skipDecks: z
    .array(z.string())
    .max(5000)
    .optional()
    .meta({ description: "Deck keys from the summary whose cards stay out of the import" }),
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
    recordings: z.number().int().meta({
      description:
        "Terms' own recordings that become their cards' audio, which Lymi never replaces with generated speech",
    }),
    recordingsSkipped: z.number().int().meta({
      description:
        "Recordings that could not be read or stored: past 2 MB, or not MP3, M4A, AAC or WAV",
    }),
    soundsLeftOut: z.number().int().meta({
      description: "Clips that are not a term's recording, such as sentence audio, left out",
    }),
    pitchSkipped: z
      .number()
      .int()
      .meta({ description: "New cards whose pitch accent could not be read as text, left out" }),
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
  recordings: 0,
  recordingsSkipped: 0,
  soundsLeftOut: 0,
  pitchSkipped: 0,
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
        known: z.number().int().optional().meta({
          description: "Cards that arrive Known; absent for imports read before it was counted",
        }),
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
        decks: z.array(z.string()).optional().meta({
          description: "Keys of the decks holding this kind's cards; absent for older imports",
        }),
        samples: z.array(z.array(z.string())),
      }),
    ),
    notes: z.number().int(),
    reviews: z.number().int(),
    pictures: z.number().int(),
    audio: z.number().int().meta({ description: "Sound references in the file" }),
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
  known: z.number().int().meta({ description: "New cards that arrive Known" }),
  tags: z.number().int().meta({ description: "Distinct tags on the new cards" }),
  addedByNoteType: z
    .record(z.string(), z.number().int())
    .meta({ description: "New cards per note type key" }),
  audio: z.number().int().meta({ description: "The same as `soundsLeftOut`, for older apps" }),
  unsupported: z.number().int(),
}).meta({ id: "ImportPreview" });
export type ImportPreviewOut = z.infer<typeof ImportPreviewOut>;

const Timestamp = z.iso.datetime().meta({ description: "ISO 8601 timestamp" });

export const ImportOut = z
  .object({
    id: z.string(),
    source: ImportSource.meta(OPEN),
    fileName: z.string(),
    byteSize: z.number().int(),
    status: ImportStatus.meta(OPEN),
    failure: ImportFailure.nullable().meta(OPEN),
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
      media: z
        .object({
          done: z.number().int().meta({ description: "Stored or left out so far" }),
          total: z.number().int().meta({ description: "Expected; 0 until the decks are made" }),
        })
        .meta({ description: "Pictures and recordings, which land after their chunk's cards" }),
    }),
    upload: z.object({
      partBytes: z.number().int().meta({ description: "Size of every part but the last" }),
      parts: z.number().int().meta({ description: "How many parts the file is sent in" }),
      received: z.number().int(),
    }),
    createdBy: z.enum(["user", "api", "mcp", "ai", "system"]).meta(OPEN),
    createdAt: Timestamp,
    updatedAt: Timestamp,
    finishedAt: Timestamp.nullable(),
    archivedAt: Timestamp.nullable(),
  })
  .meta({ id: "Import" });
export type ImportOut = z.infer<typeof ImportOut>;

/**
 * How far a write has come, from 0 to 1, or null before it can tell. A chunk of cards and a
 * picture or recording each count as one, so a deck of pictures moves while they land.
 */
export function importProgress(progress: {
  written: number;
  chunks: number;
  /** Absent from a response cached before media were counted. */
  media?: { done: number; total: number } | undefined;
}): number | null {
  const total = progress.chunks + (progress.media?.total ?? 0);
  if (total <= 0) return null;
  return Math.min(1, (progress.written + (progress.media?.done ?? 0)) / total);
}
