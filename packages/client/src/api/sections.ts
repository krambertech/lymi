import {
  CARD_BATCH_LIMIT,
  type CardSectionInput,
  type SectionArchiveInput,
  type SectionInput,
  type SectionOut,
  type SectionsOut,
} from "@lymi/core";
import { request } from "./request";

/** A deck's section with the learner's standing in it. */
export type Section = SectionOut;
/** A deck's sections in order and where the learner is. */
export type Sections = SectionsOut;

export const sectionsApi = {
  sections: (deckId: string) => request<Sections>(`/api/decks/${deckId}/sections`),
  archivedSections: (deckId: string) =>
    request<Sections>(`/api/decks/${deckId}/sections?archived=true`),
  /** Past the bulk limit, the first cards come with the section and the rest follow a call at a time. */
  createSection: async (deckId: string, { cardIds, ...body }: SectionInput) => {
    const section = await request<Section>(`/api/decks/${deckId}/sections`, {
      method: "POST",
      body: JSON.stringify({
        ...body,
        ...(cardIds ? { cardIds: cardIds.slice(0, CARD_BATCH_LIMIT) } : {}),
      }),
    });
    const rest = cardIds?.slice(CARD_BATCH_LIMIT) ?? [];
    if (rest.length) {
      await sectionsApi.moveCardsToSection(deckId, { cardIds: rest, sectionId: section.id });
    }
    return section;
  },
  renameSection: (id: string, name: string) =>
    request<Section>(`/api/sections/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
  reorderSections: (deckId: string, sectionIds: string[]) =>
    request<Sections>(`/api/decks/${deckId}/sections/order`, {
      method: "PUT",
      body: JSON.stringify({ sectionIds }),
    }),
  /** A call at a time past the bulk limit; a move is safe to send again, so a failed call throws. */
  moveCardsToSection: async (deckId: string, { cardIds, sectionId }: CardSectionInput) => {
    let at = 0;
    let sections: Sections;
    do {
      sections = await request<Sections>(`/api/decks/${deckId}/cards/section`, {
        method: "PUT",
        body: JSON.stringify({ cardIds: cardIds.slice(at, at + CARD_BATCH_LIMIT), sectionId }),
      });
      at += CARD_BATCH_LIMIT;
    } while (at < cardIds.length);
    return sections;
  },
  archiveSection: (id: string, body: SectionArchiveInput) =>
    request<{ ok: true }>(`/api/sections/${id}/archive`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  restoreSection: (id: string) =>
    request<{ ok: true }>(`/api/sections/${id}/restore`, { method: "POST" }),
  startSection: (id: string) => request<Sections>(`/api/sections/${id}/start`, { method: "POST" }),
};
