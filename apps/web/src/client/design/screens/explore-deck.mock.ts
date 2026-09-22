import type { PublicDeckOut } from "@lymi/core/catalog";

/** One published deck in the app's chrome, with a section that has no name at the end. */
export const publicDeck: PublicDeckOut = {
  slug: "everyday-estonian",
  name: "Everyday Estonian",
  summary: "Words and phrases for your first weeks in Estonia.",
  level: "A1",
  language: "et",
  meaningLanguage: "en",
  originalMeaningLanguage: "en",
  editions: ["en", "uk"],
  publisher: "Lymi",
  publisherAvatar: null,
  sources: [{ title: "EKI A1 word list", url: "https://www.eki.ee/" }],
  reviewedAt: null,
  revision: 3,
  publishedAt: "2026-09-01T09:00:00.000Z",
  cardCount: 99,
  sections: [
    {
      name: "Greetings",
      cards: [
        { term: "tere", meaning: "hello" },
        { term: "aitäh", meaning: "thank you" },
        { term: "head aega", meaning: "goodbye" },
      ],
    },
    {
      name: "In the shop",
      cards: [
        { term: "leib", meaning: "bread" },
        { term: "piim", meaning: "milk" },
      ],
    },
    { name: null, cards: [{ term: "buss", meaning: "bus" }] },
  ],
};
