import type { PublicDeckSummary } from "@lymi/core/catalog";

/**
 * Explore's catalogue: one deck per shelf plus two on the first, so the gallery shows a shelf
 * with more than one deck, a deck already added, and a slug from each end of the eight hues.
 */
export const catalogue: PublicDeckSummary[] = [
  {
    slug: "everyday-estonian",
    name: "Everyday Estonian",
    summary: "Words and phrases for your first weeks in Estonia.",
    level: "A1",
    category: "languages",
    language: "et",
    meaningLanguage: "en",
    cardCount: 99,
    sectionCount: 8,
    card: { term: "paremale", meaning: "to the right", section: "Getting around" },
  },
  {
    slug: "everyday-finnish",
    name: "Everyday Finnish",
    summary: "Home, work and the shop, in the words people use.",
    level: "A1",
    category: "languages",
    language: "fi",
    meaningLanguage: "en",
    cardCount: 64,
    sectionCount: 5,
    card: { term: "maito", meaning: "milk", section: "Kaupassa" },
  },
  {
    slug: "driving-theory-estonia",
    name: "Driving theory, Estonia",
    summary: "Signs, right of way and the questions the test repeats.",
    level: null,
    category: "driving",
    language: "et",
    meaningLanguage: "en",
    cardCount: 42,
    sectionCount: 3,
    card: { term: "ülekäigurada", meaning: "pedestrian crossing", section: "Märgid" },
  },
];

export const catalogueAdded: Record<string, string> = { "everyday-finnish": "d2" };
