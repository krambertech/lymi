import { type CardInput, type CardPatch, modeKey, modeOf } from "@lymi/core";
import type { QueryClient } from "@tanstack/react-query";
import type { CardFormValues } from "../components/card-form";
import { api, type Card } from "./api";

/** A new card as the add route takes it: typed text is the learner's, and empty fields stay out. */
export function addInput(values: CardFormValues): CardInput {
  return {
    deckId: values.deckId,
    term: values.term,
    language: values.language,
    ...(values.meaning ? { meaning: values.meaning, meaningSource: "manual" } : {}),
    ...(values.example ? { example: values.example, exampleSource: "manual" } : {}),
    ...(values.pronunciation
      ? { pronunciation: values.pronunciation, pronunciationSource: "manual" as const }
      : {}),
    ...(values.notes ? { notes: values.notes } : {}),
    ...(values.source ? { source: values.source } : {}),
    ...(values.tags.length ? { tags: values.tags } : {}),
    ...(values.reviewModes ? { reviewModes: values.reviewModes.map(modeOf) } : {}),
    ...(values.sectionId ? { sectionId: values.sectionId } : {}),
  };
}

const same = (a: readonly string[] | null, b: readonly string[] | null) =>
  a === b || (!!a && !!b && a.length === b.length && a.every((v, i) => v === b[i]));

/** Only what changed, so History names the fields the learner touched. A changed text becomes theirs. */
export function cardPatch(card: Card, values: CardFormValues): CardPatch {
  const patch: CardPatch = {};
  if (values.deckId !== card.deckId) patch.deckId = values.deckId;
  if (values.term !== card.term) patch.term = values.term;
  if (values.meaning !== (card.meaning ?? "")) {
    patch.meaning = values.meaning;
    patch.meaningSource = "manual";
  }
  if (values.example !== (card.example ?? "")) {
    patch.example = values.example;
    patch.exampleSource = "manual";
  }
  if (values.pronunciation !== (card.pronunciation ?? "")) {
    patch.pronunciation = values.pronunciation;
    patch.pronunciationSource = "manual";
  }
  if (values.notes !== (card.notes ?? "")) patch.notes = values.notes;
  if (values.source !== (card.source ?? "")) patch.source = values.source;
  if (values.language !== card.language) patch.language = values.language;
  if (values.sectionId !== card.sectionId) patch.sectionId = values.sectionId;
  if (!same(values.tags, card.tags)) patch.tags = values.tags;
  const current = card.reviewModes?.map(modeKey) ?? null;
  if (!same(values.reviewModes, current)) {
    patch.reviewModes = values.reviewModes?.map(modeOf) ?? null;
  }
  return patch;
}

/** Whether the form holds anything a save would write, so closing it would lose work. */
export function hasChanges(card: Card, values: CardFormValues): boolean {
  if (Object.keys(cardPatch(card, values)).length) return true;
  if (values.picture.kind === "file" || values.picture.kind === "link") return true;
  if (values.picture.kind === "none") return !!card.image;
  return values.description !== (card.image?.description ?? "");
}

/**
 * Sends the picture change after the card itself is written, because a new card has no id until
 * then. Resolves with the card as it stands afterwards, or null when the picture did not change.
 */
export async function savePicture(card: Card, values: CardFormValues): Promise<Card | null> {
  const { picture } = values;
  const description = values.description || undefined;
  if (picture.kind === "file") {
    return api.uploadCardImage(card.id, picture.file, card.imageVersion, description);
  }
  if (picture.kind === "link") {
    return api.importCardImage(card.id, {
      url: picture.url,
      description,
      version: card.imageVersion,
    });
  }
  if (picture.kind === "none") {
    return card.image ? api.archiveCardImage(card.id, card.imageVersion) : null;
  }
  if (values.description !== (card.image?.description ?? "")) {
    return api.describeCardImage(card.id, {
      description: values.description || null,
      version: card.imageVersion,
    });
  }
  return null;
}

/** Everything a card write can change on screen: the deck lists, reviews and the card's history. */
export function refreshAfterCardWrite(qc: QueryClient, cardId?: string) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: ["decks"] }),
    qc.invalidateQueries({ queryKey: ["queue"] }),
    qc.invalidateQueries({ queryKey: ["rounds"] }),
    ...(cardId ? [qc.invalidateQueries({ queryKey: ["cards", cardId, "history"] })] : []),
  ]);
}
