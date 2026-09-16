import { describe, expect, it } from "vitest";
import {
  type CardRow,
  isPublicDeckSlug,
  type PublicationRow,
  projectPublicDeck,
  type SectionRow,
} from "./catalog";

const publication = (over: Partial<PublicationRow> = {}): PublicationRow => ({
  slug: "everyday-estonian",
  status: "published",
  summary: "Words and phrases for your first weeks in Estonia.",
  level: "A1",
  meaningLanguage: "en",
  publisher: "Lymi",
  sources: [{ title: "EKI A1 word list", url: "https://www.eki.ee/" }],
  reviewedAt: new Date("2026-09-01T00:00:00.000Z"),
  revision: 3,
  publishedAt: new Date("2026-09-10T12:00:00.000Z"),
  deckName: "Everyday Estonian",
  deckLanguage: "et",
  deckArchivedAt: null,
  ...over,
});

const sections: SectionRow[] = [
  { id: "s1", name: "Greetings" },
  { id: "s2", name: "In the shop" },
  { id: "s3", name: "Empty" },
];

const cards: CardRow[] = [
  { term: "tere", meaning: "hello", sectionId: "s1" },
  { term: "leib", meaning: "bread", sectionId: "s2" },
  { term: "aitäh", meaning: "thank you", sectionId: "s1" },
  { term: "kott", meaning: null, sectionId: "archived-section" },
  { term: "jah", meaning: "yes", sectionId: null },
];

describe("projectPublicDeck", () => {
  it("groups cards by section in the order given and keeps card order", () => {
    const result = projectPublicDeck(publication(), sections, cards);
    if (result.status !== "published") throw new Error(result.status);
    expect(result.deck.sections).toEqual([
      {
        name: "Greetings",
        cards: [
          { term: "tere", meaning: "hello" },
          { term: "aitäh", meaning: "thank you" },
        ],
      },
      { name: "In the shop", cards: [{ term: "leib", meaning: "bread" }] },
      {
        name: null,
        cards: [
          { term: "kott", meaning: null },
          { term: "jah", meaning: "yes" },
        ],
      },
    ]);
    expect(result.deck.cardCount).toBe(5);
    expect(result.deck.revision).toBe(3);
    expect(result.deck.reviewedAt).toBe("2026-09-01T00:00:00.000Z");
  });

  it("drops fields outside the allowlist even when a row carries them", () => {
    const leaky = {
      ...publication(),
      deckId: "deck_secret",
      ownerEmail: "owner@example.com",
      userId: "user_secret",
      withdrawnAt: null,
    };
    const leakyCards = cards.map((card) => ({
      ...card,
      id: "card_secret",
      userId: "user_secret",
      notes: "private note",
      example: "draft example",
      fsrs: { due: 1 },
    }));
    const leakySections = sections.map((section) => ({ ...section, deckId: "deck_secret" }));
    const result = projectPublicDeck(leaky, leakySections, leakyCards);
    const json = JSON.stringify(result);
    for (const secret of ["deck_secret", "user_secret", "card_secret", "owner@example.com"]) {
      expect(json).not.toContain(secret);
    }
    for (const field of ["notes", "example", "fsrs", "sectionId", "id", "withdrawnAt"]) {
      expect(json).not.toContain(`"${field}"`);
    }
  });

  it("shows a source link only for a web address", () => {
    const result = projectPublicDeck(
      publication({
        sources: [
          { title: "Safe", url: "https://example.com/list" },
          { title: "Script", url: "javascript:alert(1)" },
          { title: "Plain" },
        ],
      }),
      sections,
      cards,
    );
    if (result.status !== "published") throw new Error(result.status);
    expect(result.deck.sources).toEqual([
      { title: "Safe", url: "https://example.com/list" },
      { title: "Script" },
      { title: "Plain" },
    ]);
  });

  it("is unavailable when withdrawn, archived or empty", () => {
    expect(projectPublicDeck(publication({ status: "withdrawn" }), sections, cards)).toEqual({
      status: "unavailable",
    });
    expect(projectPublicDeck(publication({ deckArchivedAt: new Date() }), sections, cards)).toEqual(
      { status: "unavailable" },
    );
    expect(projectPublicDeck(publication(), sections, [])).toEqual({ status: "unavailable" });
  });
});

describe("isPublicDeckSlug", () => {
  it("accepts lower-case words joined by hyphens only", () => {
    expect(isPublicDeckSlug("everyday-estonian")).toBe(true);
    expect(isPublicDeckSlug("Everyday-Estonian")).toBe(false);
    expect(isPublicDeckSlug("../secret")).toBe(false);
    expect(isPublicDeckSlug("a".repeat(81))).toBe(false);
    expect(isPublicDeckSlug(undefined)).toBe(false);
  });
});
