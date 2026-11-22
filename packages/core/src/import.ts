import { z } from "zod";
import { EXAMPLE_LENGTH, fitsExample } from "./example";
import { sourcePitch } from "./pitch";
import { kanaReading, moraCount } from "./reading";
import { OPEN } from "./responses/common";
import { tagKey } from "./terms";
import { type FieldSource, LanguageTag, type Rating, ReviewModeKey } from "./types";

export const ImportSource = z.enum(["anki", "mochi", "noji", "lymi", "quizlet", "pleco"]);
export type ImportSource = z.infer<typeof ImportSource>;

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

export const FieldRole = z.enum([
  "term",
  "meaning",
  "pronunciation",
  "example",
  "exampleTranslation",
  "notes",
  "skip",
]);
export type FieldRole = z.infer<typeof FieldRole>;

export type ImportedFields = {
  term: string;
  meaning?: string | undefined;
  pronunciation?: string | undefined;
  example?: string | undefined;
  exampleTranslation?: string | undefined;
  notes?: string | undefined;
};

export type ImportedReview = { at: Date; rating: Rating };

export type ImportedProgress = {
  mode: ReviewModeKey;
  reviews: ImportedReview[];
  unstarted?: boolean | undefined;
  due?: Date | undefined;
  memory?: { stability: number; difficulty: number; lastReview: Date } | undefined;
};

export type ImportedCard = {
  externalId: string;
  deckKey: string;
  noteTypeKey: string;
  fields: ImportedFields;
  tags: string[];
  modes: ReviewModeKey[];
  archived: boolean;
  picture?: string | undefined;
  recording?: string | undefined;
  exampleRecording?: string | undefined;
  captured?: { picture?: boolean | undefined; exampleRecording?: boolean | undefined } | undefined;
  soundsLeftOut?: number | undefined;
  pitchLeftOut?: boolean | undefined;
  progress: ImportedProgress[];
  shortened: boolean;
  language?: string | null | undefined;
  fieldSources?:
    | {
        meaning: FieldSource | null;
        example: FieldSource | null;
        exampleTranslation?: FieldSource | null | undefined;
        pronunciation?: FieldSource | null | undefined;
        notes?: FieldSource | null | undefined;
      }
    | undefined;
  origin?: string | undefined;
  pictureDescription?: string | undefined;
  translationStale?: boolean | undefined;
  hint?: { text: string; source: FieldSource } | undefined;
};

export const IMPORT_LIMITS = {
  term: 500,
  meaning: 2000,
  pronunciation: 200,
  example: 2000,
  exampleTranslation: EXAMPLE_LENGTH,
  notes: 2000,
  hint: 200,
  tags: 20,
  tag: 40,
  deckName: 80,
  deckDescription: 500,
} as const;

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
const EDGE = "\ue000";

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

const CYRILLIC_VOWEL = "аеёиоуыэюяієїАЕЁИОУЫЭЮЯІЄЇ";
const MARKED_VOWEL = new RegExp(`<(b|strong|u)\\b[^>]*>([${CYRILLIC_VOWEL}])</\\1>`, "gi");
const CYRILLIC_LETTER = /\p{Script=Cyrillic}/u;

export function boldStress(html: string): string {
  return html.replace(MARKED_VOWEL, (match, _tag: string, vowel: string, at: number) => {
    const before = html[at - 1] ?? "";
    const after = html[at + match.length] ?? "";
    return CYRILLIC_LETTER.test(before) || CYRILLIC_LETTER.test(after) ? `${vowel}\u0301` : match;
  });
}

export function imageSources(html: string): string[] {
  const sources: string[] = [];
  for (const match of html.matchAll(/<img\b[^>]*?\bsrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
    const src = match[2] ?? match[3] ?? match[4];
    if (src) sources.push(decodeEntities(src));
  }
  return sources;
}

export function soundCount(html: string): number {
  return html.match(/\[sound:[^\]]*\]/g)?.length ?? 0;
}

export function soundSources(html: string): string[] {
  return [...html.matchAll(/\[sound:([^\]]*)\]/g)].flatMap((match) => {
    const name = decodeEntities(match[1] ?? "").trim();
    return name ? [name] : [];
  });
}

export function playableRecording(name: string): boolean {
  return /\.(mp3|m4a|mp4|aac|wav)$/i.test(name);
}

const LYMI_SPEECH = /^lymi-[^/]*-speech\.[a-z0-9]+$/i;
const AUDIO_FIELD = /\b(audio|sound|voice|recording)s?\b|音声/i;
const SENTENCE_FIELD = /\b(sentence|example|context|usage)s?\b|例文/i;

export function noteRecordings(
  names: readonly string[],
  roles: readonly FieldRole[],
  clips: readonly (readonly string[])[],
): { recording: string | undefined; exampleRecording: string | undefined; leftOut: number } {
  const own = clips.map((list) => list.filter((name) => !LYMI_SPEECH.test(name)));
  const total = own.reduce((sum, list) => sum + list.length, 0);
  const sentence = names.map(
    (name, i) => SENTENCE_FIELD.test(fieldWords(name)) || roles[i] === "example",
  );
  const audio = names.map((name) => AUDIO_FIELD.test(fieldWords(name)));
  const first = (order: number[]) => {
    const field = order.find((i) => (own[i]?.length ?? 0) > 0);
    return field === undefined ? undefined : own[field]?.[0];
  };
  const recording = first([
    ...names.flatMap((_, i) => (audio[i] && !sentence[i] ? [i] : [])),
    ...(["term", "pronunciation", "meaning"] as const).flatMap((role) =>
      roles.flatMap((r, i) => (r === role && !sentence[i] ? [i] : [])),
    ),
  ]);
  const exampleRecording = first([
    ...names.flatMap((_, i) => (audio[i] && sentence[i] ? [i] : [])),
    ...roles.flatMap((role, i) => (role === "example" ? [i] : [])),
  ]);
  return {
    recording,
    exampleRecording,
    leftOut: total - (recording ? 1 : 0) - (exampleRecording ? 1 : 0),
  };
}

export function clozeRecordings(
  names: readonly string[],
  clips: readonly (readonly string[])[],
  text: number,
): ReturnType<typeof noteRecordings> {
  const roles = names.map((name, i): FieldRole =>
    i === text || SENTENCE_FIELD.test(fieldWords(name)) ? "example" : "skip",
  );
  const sounds = noteRecordings(names, roles, clips);
  return {
    recording: undefined,
    exampleRecording: sounds.exampleRecording,
    leftOut: sounds.leftOut + (sounds.recording ? 1 : 0),
  };
}

export function cardRecordings(
  sounds: ReturnType<typeof noteRecordings>,
  example: string | undefined,
): Pick<ImportedCard, "recording" | "exampleRecording" | "soundsLeftOut"> {
  const exampleRecording = example ? sounds.exampleRecording : undefined;
  return {
    recording: sounds.recording,
    exampleRecording,
    soundsLeftOut: sounds.leftOut + (sounds.exampleRecording && !exampleRecording ? 1 : 0),
  };
}

type PitchUnit = { text: string; high: boolean; drop: boolean };
type PitchFrame = {
  tag: string;
  units: PitchUnit[];
  high: boolean;
  line: { high: boolean; drop: boolean };
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

export function pitchIntoReading<
  T extends {
    term?: string | undefined;
    pronunciation?: string | undefined;
    notes?: string | undefined;
  },
>(fields: T, language: string | null | undefined): T {
  const reading = kanaReading({ language, pronunciation: fields.pronunciation || fields.term });
  if (!reading || !fields.notes) return fields;
  const lines = fields.notes.split("\n");
  for (const [at, line] of lines.entries()) {
    const positions = sourcePitch(line, reading);
    if (!positions) continue;
    return {
      ...fields,
      pronunciation: `${reading} ${positions.map((position) => `[${position}]`).join("")}`,
      notes: lines.filter((_, i) => i !== at).join("\n") || undefined,
    };
  }
  return fields;
}

export function importFieldText(
  name: string,
  raw: string,
  toText: (raw: string) => string = htmlToText,
): string {
  if (isPitchField(name)) return pitchNotation(raw);
  const text = toText(raw.replace(/<(rt|rp)\b[^>]*>[\s\S]*?<\/\1>/giu, ""));
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

export function fitText(text: string, limit: number): { text: string; shortened: boolean } {
  return length(text) <= limit
    ? { text, shortened: false }
    : { text: cut(text, limit), shortened: true };
}

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
  let example = fields.example || undefined;
  let translation = fields.exampleTranslation || undefined;
  if (
    (example && !fitsExample(example)) ||
    (translation && length(translation) > IMPORT_LIMITS.exampleTranslation) ||
    (translation && !example)
  ) {
    const moved = [example, translation].filter(Boolean).join("\n");
    notes = notes ? `${notes}\n\n${moved}` : moved;
    example = undefined;
    translation = undefined;
    shortened = true;
  }
  const fitted: ImportedFields = {
    term: bounded(fields.term, IMPORT_LIMITS.term) ?? "",
    meaning,
    pronunciation: bounded(fields.pronunciation, IMPORT_LIMITS.pronunciation),
    example: bounded(example, IMPORT_LIMITS.example),
    exampleTranslation: translation,
    notes: bounded(notes, IMPORT_LIMITS.notes),
  };
  return { fields: fitted, shortened };
}

export function importTags(tags: readonly string[]): { tags: string[]; shortened: boolean } {
  const kept: string[] = [];
  const seen = new Set<string>();
  let shortened = false;
  for (const raw of tags) {
    const tag = raw.trim();
    if (!tag || DROPPED_TAGS.has(tag.toLowerCase())) continue;
    const fitted =
      length(tag) > IMPORT_LIMITS.tag
        ? [...tag].slice(0, IMPORT_LIMITS.tag).join("").trimEnd()
        : tag;
    if (fitted !== tag) shortened = true;
    const key = tagKey(fitted);
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
const TRANSLATION_PATTERN =
  /\b(sentence|example|context)s?\b.*\b(meaning|translation|english|gloss|definition)$/i;
const FLAG_PATTERN = /^(is|has)\s/i;
const SENTENCE_PINYIN_PATTERN = /\b(sentence|example|context)s?\b.*\b(pinyin|zhuyin|bopomofo)$/i;
const SCRIPT_WORDS =
  /\b(simplified|simp|traditional|trad|hanzi|characters?)\b|简体字?|簡體字?|繁体字?|繁體字?|汉字|漢字/giu;
const TRADITIONAL = /\b(traditional|trad)\b|繁体|繁體/iu;
const SIMPLIFIED = /\b(simplified|simp)\b|简体|簡體/iu;
const CHINESE_FIELD =
  /\b(pinyin|zhuyin|bopomofo|hanzi|simplified|traditional)\b|拼音|注音|简体|簡體|繁体|繁體|汉字|漢字/iu;

function fieldWords(name: string): string {
  return name
    .replace(/(\p{Ll}|\d)(\p{Lu})/gu, "$1 $2")
    .replace(/[_\-.]+/g, " ")
    .trim();
}

export function looksChinese(names: readonly string[]): boolean {
  return names.some((name) => CHINESE_FIELD.test(fieldWords(name)));
}

function scriptRest(name: string): string | null {
  const words = fieldWords(name);
  const rest = words.replace(SCRIPT_WORDS, " ").replace(/\s+/g, " ").trim();
  return rest === words ? null : rest.toLowerCase();
}

function patternRole(text: string): FieldRole | undefined {
  if (TERM_PATTERN.test(text)) return "term";
  return ROLE_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0];
}

export function namedFieldRole(name: string): FieldRole | undefined {
  return fieldRole(name, false);
}

function fieldRole(name: string, chinese: boolean): FieldRole | undefined {
  const words = fieldWords(name);
  if (SKIP_PATTERN.test(words) || FLAG_PATTERN.test(words)) return "skip";
  if (/\bpitch\b/i.test(words)) {
    if (isPitchField(name)) return "notes";
    return /\bnotes?$/i.test(words) ? "notes" : "skip";
  }
  if (TRANSLATION_PATTERN.test(words)) return "exampleTranslation";
  if (SENTENCE_PINYIN_PATTERN.test(words)) return "notes";
  const rest = chinese ? scriptRest(name) : null;
  if (rest === "") return "term";
  const named = rest ?? words;
  return patternRole(named.split(/\s+/).at(-1) ?? "") ?? patternRole(named);
}

export function isPitchField(name: string): boolean {
  const words = fieldWords(name);
  return (
    (/\bpitch\b/i.test(words) && !/\b(notes?|categor(y|ies))$/i.test(words)) ||
    /^accent$/i.test(words)
  );
}

export function isTranslationField(name: string): boolean {
  return TRANSLATION_PATTERN.test(fieldWords(name));
}

export function isSentencePinyinField(name: string): boolean {
  return SENTENCE_PINYIN_PATTERN.test(fieldWords(name));
}

function hasTwin(name: string, names: readonly string[], script: RegExp): boolean {
  const rest = scriptRest(name);
  return (
    rest !== null &&
    script.test(fieldWords(name)) &&
    names.some((other) => !script.test(fieldWords(other)) && scriptRest(other) === rest)
  );
}

export function traditionalTerm(names: readonly string[]): boolean {
  return (
    looksChinese(names) &&
    names.some(
      (name) =>
        TRADITIONAL.test(fieldWords(name)) &&
        fieldRole(name, true) === "term" &&
        !hasTwin(name, names, TRADITIONAL),
    )
  );
}

function isOtherScriptOf(name: string, names: readonly string[]): boolean {
  return hasTwin(name, names, traditionalTerm(names) ? SIMPLIFIED : TRADITIONAL);
}

function isFuriganaOf(name: string, names: readonly string[]): boolean {
  const match = /^(.+?)\s*furigana$/i.exec(fieldWords(name));
  const base = match?.[1]?.toLowerCase();
  return !!base && names.some((other) => fieldWords(other).toLowerCase() === base);
}

export function guessFieldRoles(names: readonly string[]): FieldRole[] {
  const chinese = looksChinese(names);
  const roles = names.map((name) =>
    isFuriganaOf(name, names)
      ? "skip"
      : chinese && isOtherScriptOf(name, names)
        ? "notes"
        : fieldRole(name, chinese),
  );
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
  claim("exampleTranslation");
  return roles.map((role) => role ?? "notes");
}

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
  if (notes.length > 0) fields.notes = notes.join("\n");
  return fields;
}

export const IMPORT_FILE_NAME = /\.(apkg|colpkg|mochi|ofc|zip|txt|tsv|csv)$/i;

export function sourceOfFileName(fileName: string): ImportSource {
  if (/\.mochi$/i.test(fileName)) return "mochi";
  if (/\.ofc$/i.test(fileName)) return "noji";
  if (/\.(txt|tsv|csv)$/i.test(fileName)) return "quizlet";
  return /\.zip$/i.test(fileName) ? "lymi" : "anki";
}

export const MAX_IMPORT_BYTES = 1024 * 1024 * 1024;

export const IMPORT_PART_BYTES = 10 * 1024 * 1024;

export const ImportStartInput = z.object({
  fileName: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(
      IMPORT_FILE_NAME,
      "Choose the .apkg, .colpkg, .mochi, .ofc or .zip file Anki, Mochi, Noji or Lymi exports, or the .txt of a Quizlet set or a Pleco export.",
    ),
  byteSize: z
    .number()
    .int()
    .positive()
    .max(MAX_IMPORT_BYTES, "The file is larger than 1 GB. Export one deck at a time instead."),
  source: ImportSource.optional().meta({
    description:
      "The app the learner chose the file for, named until the file is read; reading the file decides",
  }),
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
    exampleRecordings: z.number().int().optional().meta({
      description:
        "Examples' own recordings, which their play control plays instead of generated speech; absent for imports written before they were kept",
    }),
    exampleRecordingsSkipped: z.number().int().optional().meta({
      description:
        "Examples' recordings that could not be read or stored: past 2 MB, or not MP3, M4A, AAC or WAV; absent for imports written before they were kept",
    }),
    soundsLeftOut: z.number().int().meta({
      description:
        "Clips that are neither a term's nor an example's recording, such as a second clip or a sentence clip on a card with no example, left out",
    }),
    pitchSkipped: z
      .number()
      .int()
      .meta({ description: "New cards whose pitch accent could not be read as text, left out" }),
    readingsConverted: z.number().int().optional().meta({
      description:
        "New cards whose Reading was converted to how Lymi stores it, such as pinyin tone numbers to tone marks; absent for imports written before it was counted",
    }),
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
  exampleRecordings: 0,
  exampleRecordingsSkipped: 0,
  soundsLeftOut: 0,
  pitchSkipped: 0,
  readingsConverted: 0,
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
    tags: z.array(z.string()).optional().meta({
      description: "Tags the file names apart from its cards, such as Pleco's categories",
    }),
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
          exampleTranslation: z.string().nullable().optional(),
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

export function importProgress(progress: {
  written: number;
  chunks: number;
  media?: { done: number; total: number } | undefined;
}): number | null {
  const total = progress.chunks + (progress.media?.total ?? 0);
  if (total <= 0) return null;
  return Math.min(1, (progress.written + (progress.media?.done ?? 0)) / total);
}
