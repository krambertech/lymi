import type { Card } from "@lymi/client/api";
import { type CardPatch, exampleShown, modeKey, modeOf, type ReviewModeKey } from "@lymi/core";
import type { Picture } from "./model";

/** A card's text fields in the order Add a word and Edit card show them. */
export const FORM_FIELDS = [
  "term",
  "meaning",
  "pronunciation",
  "example",
  "exampleTranslation",
  "notes",
  "hint",
  "source",
] as const;
export type FormField = (typeof FORM_FIELDS)[number];
export type FormValues = Record<FormField, string>;

export const EMPTY_FORM: FormValues = {
  term: "",
  meaning: "",
  pronunciation: "",
  example: "",
  exampleTranslation: "",
  notes: "",
  hint: "",
  source: "",
};

export function formValues(card: Card): FormValues {
  return {
    term: card.term,
    meaning: card.meaning ?? "",
    pronunciation: card.pronunciation ?? "",
    example: card.example ?? "",
    exampleTranslation: card.exampleTranslation ?? "",
    notes: card.notes ?? "",
    hint: card.hint ?? "",
    source: card.source ?? "",
  };
}

/** One field's new text as a patch; a field the AI wrote becomes the learner's once changed. */
function fieldPatch(field: FormField, value: string): CardPatch {
  if (field === "term" || field === "source") return { [field]: value };
  if (field === "hint") return { hint: value, ...(value ? { hintSource: "manual" as const } : {}) };
  if (field === "exampleTranslation") {
    return {
      exampleTranslation: value,
      ...(value ? { exampleTranslationSource: "manual" as const } : {}),
    };
  }
  return { [field]: value, [`${field}Source`]: "manual" };
}

/**
 * What a save sends: only the fields the learner typed in, and only where they now differ from
 * the card as it stands. A field left alone is never sent, so enrichment or another device
 * filling it while the form is open is kept. `aiTranslated` says the card's translation is the AI's.
 */
export function editPatch(
  card: FormValues,
  typed: Partial<FormValues>,
  aiTranslated = false,
): CardPatch {
  let out: CardPatch = {};
  for (const f of FORM_FIELDS) {
    const text = typed[f];
    if (text === undefined) continue;
    // A translation goes with its example, so none is kept without one.
    const value =
      f === "exampleTranslation" && !(typed.example ?? card.example).trim() ? "" : text.trim();
    // A card always has a term, so emptying it keeps the one it had.
    if (value === card[f].trim() || (f === "term" && !value)) continue;
    // Emptied beside a new example, the AI's translation is the AI's to write again, not a clear.
    if (f === "exampleTranslation" && !value && aiTranslated && out.example !== undefined) continue;
    out = { ...out, ...fieldPatch(f, value) };
  }
  return out;
}

/**
 * The translation the form holds once the example changes: the AI's fits only the example it was
 * written for, so it clears for the AI to write again, and comes back if that example is typed back.
 * `undefined` leaves the field as it is.
 */
export function translationAfterExample(
  card: Pick<Card, "example" | "exampleTranslation" | "exampleTranslationSource">,
  example: string,
  translation: string,
): string | undefined {
  if (card.exampleTranslationSource !== "ai") return undefined;
  const theirs = card.exampleTranslation ?? "";
  const original = exampleShown(example) === exampleShown(card.example ?? "");
  if (original && !translation) return theirs;
  if (!original && translation === theirs) return "";
  return undefined;
}

/**
 * True when a save would keep the translation as written for an earlier example: the learner's own
 * under a changed example, or one already stale under its example. The AI's is written again instead.
 */
export function keptTranslationStale(
  card: Pick<
    Card,
    "example" | "exampleTranslation" | "exampleTranslationSource" | "exampleTranslationStale"
  >,
  example: string,
  translation: string,
): boolean {
  if (!example.trim() || !translation.trim() || translation !== (card.exampleTranslation ?? ""))
    return false;
  const changed = exampleShown(example) !== exampleShown(card.example ?? "");
  return changed ? card.exampleTranslationSource !== "ai" : card.exampleTranslationStale;
}

const same = (a: readonly string[] | null, b: readonly string[] | null) =>
  a === b || (!!a && !!b && a.length === b.length && a.every((v, i) => v === b[i]));

/** The card's modes and tags as a patch, each only when chosen in the form and changed. */
export function choicesPatch(
  card: Pick<Card, "reviewModes" | "tags">,
  modes: ReviewModeKey[] | null | undefined,
  tags: string[] | undefined,
): CardPatch {
  const out: CardPatch = {};
  if (tags !== undefined && !same(tags, card.tags)) out.tags = tags;
  if (modes !== undefined && !same(modes, card.reviewModes?.map(modeKey) ?? null))
    out.reviewModes = modes?.map(modeOf) ?? null;
  return out;
}

/** What saving the form does to the card's picture; `undefined` is a picture left alone. */
export type PictureWrite =
  | { kind: "upload"; picture: Picture }
  | { kind: "describe"; description: string | null }
  | { kind: "archive" }
  | null;

export function pictureWrite(
  card: Pick<Card, "image">,
  picture: Picture | null | undefined,
): PictureWrite {
  if (picture === undefined) return null;
  if (picture === null) return card.image ? { kind: "archive" } : null;
  if (!picture.kept) return { kind: "upload", picture };
  const description = picture.description.trim();
  if (description === (card.image?.description ?? "")) return null;
  return { kind: "describe", description: description || null };
}
