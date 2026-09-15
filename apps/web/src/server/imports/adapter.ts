import type { FieldRole, ImportedCard, ImportSource } from "@lymi/core";
import type { RandomAccess } from "./files";

/** A deck the file holds cards in, as the preview lists it. */
export type SourceDeck = {
  key: string;
  name: string;
  description: string | null;
  cards: number;
  /** The source had the deck archived, so it arrives archived with its cards. */
  archived?: boolean | undefined;
};

/** A kind of note the file holds, with the fields the learner maps in the preview. */
export type SourceNoteType = {
  key: string;
  name: string;
  kind: "basic" | "cloze";
  fields: string[];
  /** The adapter's guess at what each field is. */
  roles: FieldRole[];
  /** For each card template, the field its question shows, which decides the review mode. */
  questions: (number | null)[];
  notes: number;
  /** Up to three notes' fields as plain text, so the learner can see what each field holds. */
  samples: string[][];
};

/** Everything the preview says about a file before the learner chooses anything. */
export type SourceSummary = {
  decks: SourceDeck[];
  noteTypes: SourceNoteType[];
  notes: number;
  reviews: number;
  pictures: number;
  audio: number;
  /** Notes of a kind Lymi cannot ask, such as image occlusion, which are left out. */
  unsupported: number;
  /** Each deck's language, when the file records it; otherwise the server guesses from names. */
  languages?: Record<string, string | null> | undefined;
};

/** What the learner decided in the preview. */
export type ImportChoices = {
  /** Language per deck key; null is a deck of no language. */
  languages: Record<string, string | null>;
  /** Field roles per note type key. */
  roles: Record<string, FieldRole[]>;
};

/**
 * One source. `detect` recognises the file, `inspect` reads it into a summary and a stream
 * of notes the server stores between steps, and `cards` turns one stored note into the
 * common imported-card shape under the learner's choices. `media` opens the file once and
 * returns a reader for pictures by the name a card carries. A new source is one of these and a guide, nothing underneath.
 */
export interface SourceAdapter<Note> {
  source: ImportSource;
  detect(file: RandomAccess, fileName: string): Promise<boolean>;
  inspect(file: RandomAccess): Promise<{ summary: SourceSummary; notes: Iterable<Note> }>;
  cards(note: Note, summary: SourceSummary, choices: ImportChoices): ImportedCard[];
  media(file: RandomAccess): Promise<(name: string, limit: number) => Promise<Uint8Array | null>>;
}
