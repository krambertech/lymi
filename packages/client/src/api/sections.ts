import type {
  CardSectionInput,
  SectionArchiveInput,
  SectionInput,
  SectionOut,
  SectionsOut,
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
  createSection: (deckId: string, body: SectionInput) =>
    request<Section>(`/api/decks/${deckId}/sections`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  renameSection: (id: string, name: string) =>
    request<Section>(`/api/sections/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
  reorderSections: (deckId: string, sectionIds: string[]) =>
    request<Sections>(`/api/decks/${deckId}/sections/order`, {
      method: "PUT",
      body: JSON.stringify({ sectionIds }),
    }),
  moveCardsToSection: (deckId: string, body: CardSectionInput) =>
    request<Sections>(`/api/decks/${deckId}/cards/section`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  archiveSection: (id: string, body: SectionArchiveInput) =>
    request<{ ok: true }>(`/api/sections/${id}/archive`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  restoreSection: (id: string) =>
    request<{ ok: true }>(`/api/sections/${id}/restore`, { method: "POST" }),
  startSection: (id: string) => request<Sections>(`/api/sections/${id}/start`, { method: "POST" }),
};
