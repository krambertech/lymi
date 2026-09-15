import { z } from "zod";
import { Actor, FieldSource, Rating, ReviewModeKey } from "./types";

/**
 * What an export writes: a Lymi zip that Lymi imports back without loss, or a legacy Anki
 * package that Anki, Mochi, RemNote and Noji read. CSV is written in the browser.
 */
export const ExportFormat = z.enum(["lymi", "anki"]);
export type ExportFormat = z.infer<typeof ExportFormat>;

/** `exporting` while the server writes the file, `done` while it can be downloaded, then `expired`. */
export const ExportStatus = z.enum(["exporting", "done", "failed", "expired"]);
export type ExportStatus = z.infer<typeof ExportStatus>;

/** Why an export stopped, as a code the app turns into a sentence. */
export const ExportFailure = z.enum(["too_large", "internal"]);
export type ExportFailure = z.infer<typeof ExportFailure>;

/** How long a finished file stays downloadable before it is deleted. */
export const EXPORT_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Each format's file extension. */
export const EXPORT_EXTENSIONS: Record<ExportFormat, string> = { lymi: "zip", anki: "apkg" };

export const ExportStartInput = z.object({
  format: ExportFormat,
  deckId: z
    .string()
    .min(1)
    .optional()
    .meta({ description: "One deck the learner can see; leave out for the whole library" }),
});
export type ExportStartInput = z.infer<typeof ExportStartInput>;

export const ExportCounts = z
  .object({
    decks: z.number().int(),
    cards: z.number().int(),
    reviews: z.number().int().meta({ description: "The learner's own recalls" }),
    pictures: z.number().int(),
    sounds: z.number().int().meta({ description: "Generated speech, in the Anki package only" }),
  })
  .meta({ id: "ExportCounts" });
export type ExportCounts = z.infer<typeof ExportCounts>;

const Timestamp = z.iso.datetime().meta({ description: "ISO 8601 timestamp" });

export const ExportOut = z
  .object({
    id: z.string(),
    format: ExportFormat,
    deckId: z
      .string()
      .nullable()
      .meta({ description: "The deck exported, or null for the library" }),
    fileName: z.string().meta({ description: "The name the file downloads as" }),
    status: ExportStatus,
    failure: ExportFailure.nullable(),
    byteSize: z.number().int().nullable().meta({ description: "The file's size once written" }),
    counts: ExportCounts.nullable(),
    downloadUrl: z
      .string()
      .nullable()
      .meta({ description: "Where the file downloads with the same session or key, while done" }),
    createdBy: Actor,
    createdAt: Timestamp,
    finishedAt: Timestamp.nullable(),
    expiresAt: Timestamp.nullable().meta({ description: "When the file is deleted" }),
  })
  .meta({ id: "Export" });
export type ExportOut = z.infer<typeof ExportOut>;

/** The version a Lymi zip's `lymi.json` declares; a reader refuses a newer one. */
export const LYMI_FILE_VERSION = 1;

const Moment = z.number().int().meta({ description: "Milliseconds since the Unix epoch" });

/** One recall in a Lymi zip, as Lymi's scheduler stored it. */
export const LymiFileReview = z.object({
  at: Moment,
  rating: Rating,
  state: z.number().int(),
  elapsedDays: z.number(),
  scheduledDays: z.number(),
  stability: z.number(),
  difficulty: z.number(),
  source: z.enum(["web", "api", "mcp", "import"]),
});
export type LymiFileReview = z.infer<typeof LymiFileReview>;

/** One mode's schedule for the learner who exported, with its history oldest first. */
export const LymiFileState = z.object({
  mode: ReviewModeKey,
  state: z.number().int(),
  due: Moment,
  lastReview: Moment.nullable(),
  stability: z.number(),
  difficulty: z.number(),
  reviews: z.array(LymiFileReview),
});
export type LymiFileState = z.infer<typeof LymiFileState>;

/** One card in a Lymi zip: every field and field source, its picture and its schedule. */
export const LymiFileCard = z.object({
  id: z.string(),
  deck: z.string(),
  section: z.string().nullable(),
  term: z.string(),
  meaning: z.string().nullable(),
  pronunciation: z.string().nullable(),
  example: z.string().nullable(),
  notes: z.string().nullable(),
  // Not LanguageTag: a card written before the tag was checked still exports and imports.
  language: z.string().nullable(),
  tags: z.array(z.string()),
  source: z.string().nullable(),
  meaningSource: FieldSource.nullable(),
  exampleSource: FieldSource.nullable(),
  reviewModes: z.array(ReviewModeKey).nullable().meta({
    description: "The card's own modes, or null when it follows its deck",
  }),
  picture: z
    .object({
      file: z.string(),
      description: z.string().nullable(),
      width: z.number().int(),
      height: z.number().int(),
    })
    .nullable(),
  archivedAt: Moment.nullable(),
  createdAt: Moment,
  states: z.array(LymiFileState),
});
export type LymiFileCard = z.infer<typeof LymiFileCard>;

export const LymiFileDeck = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  defaultLanguage: z.string().nullable(),
  reviewModes: z.array(ReviewModeKey),
  sectionProgression: z.string(),
  series: z.string().nullable(),
  sections: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      position: z.number().int(),
      archivedAt: Moment.nullable(),
    }),
  ),
  archivedAt: Moment.nullable(),
  createdAt: Moment,
});
export type LymiFileDeck = z.infer<typeof LymiFileDeck>;

/** `lymi.json`: what the zip holds. Cards are in `cards.jsonl`, one per line; pictures in `media/`. */
export const LymiFileManifest = z.object({
  format: z.literal("lymi"),
  version: z.number().int(),
  exportedAt: Moment,
  series: z.array(z.object({ id: z.string(), name: z.string(), position: z.number().int() })),
  decks: z.array(LymiFileDeck),
  counts: ExportCounts,
});
export type LymiFileManifest = z.infer<typeof LymiFileManifest>;
