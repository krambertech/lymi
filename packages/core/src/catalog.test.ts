import { describe, expect, it } from "vitest";
import {
  type CardRow,
  isPublicDeckSlug,
  type PublicationRow,
  previewMode,
  projectPublicDeck,
  type SectionRow,
} from "./catalog";

const publication = (over: Partial<PublicationRow> = {}): PublicationRow => ({
  slug: "everyday-estonian",
  status: "published",
  summary: "Words and phrases for your first weeks in Estonia.",
  level: "A1",
  meaningLanguage: "en",
  originalMeaningLanguage: "en",
  editions: ["en"],
  publisher: "Lymi",
  publisherAvatar: null,
  sources: [{ title: "EKI A1 word list", url: "https://www.eki.ee/" }],
  reviewedAt: new Date("2026-09-01T00:00:00.000Z"),
  revision: 3,
  publishedAt: new Date("2026-09-10T12:00:00.000Z"),
  deckName: "Everyday Estonian",
  deckLanguage: "et",
  deckDirections: "recognition",
  deckArchivedAt: null,
  ...over,
});

const sections: SectionRow[] = [
  { id: "s1", name: "Greetings" },
  { id: "s2", name: "In the shop" },
  { id: "s3", name: "Empty" },
];

const card = (id: string, term: string, meaning: string | null, sectionId: string | null) =>
  ({ id, term, meaning, sectionId, directions: null, reviewModeKeys: null }) satisfies CardRow;

const cards: CardRow[] = [
  card("c1", "tere", "hello", "s1"),
  card("c2", "leib", "bread", "s2"),
  card("c3", "aitäh", "thank you", "s1"),
  card("c4", "kott", null, "archived-section"),
  card("c5", "jah", "yes", null),
];

const asked = { modes: ["term_to_meaning"] };

describe("projectPublicDeck", () => {
  it("groups cards by section in the order given and keeps card order", () => {
    const result = projectPublicDeck(publication(), sections, cards);
    if (result.status !== "published") throw new Error(result.status);
    expect(result.deck.sections).toEqual([
      {
        name: "Greetings",
        cards: [
          { term: "tere", meaning: "hello", ...asked },
          { term: "aitäh", meaning: "thank you", ...asked },
        ],
      },
      { name: "In the shop", cards: [{ term: "leib", meaning: "bread", ...asked }] },
      {
        name: null,
        cards: [
          { term: "kott", meaning: null, ...asked },
          { term: "jah", meaning: "yes", ...asked },
        ],
      },
    ]);
    expect(result.deck.cardCount).toBe(5);
    expect(result.deck.revision).toBe(3);
    expect(result.deck.reviewedAt).toBe("2026-09-01T00:00:00.000Z");
  });

  it("asks each card in its own modes, and in picture modes only with a public picture", () => {
    const flag = { directions: "recognition" as const };
    const own: CardRow[] = [
      { ...card("c1", "🇪🇪", "Estonia", null), ...flag, reviewModeKeys: ["image_to_meaning"] },
      { ...card("c2", "🇫🇮", "Finland", null), ...flag, reviewModeKeys: ["image_to_meaning"] },
      card("c3", "tere", "hello", null),
    ];
    const picture = { cardId: "c1", description: "A flag", width: 300, height: 200, hasAudio: 0 };
    const result = projectPublicDeck(publication({ deckDirections: "both" }), [], own, [picture]);
    if (result.status !== "published") throw new Error(result.status);
    expect(result.deck.sections[0]?.cards.map((c) => c.modes)).toEqual([
      ["image_to_meaning"],
      ["term_to_meaning"],
      ["term_to_meaning", "meaning_to_term"],
    ]);
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

describe("previewMode", () => {
  it("shows a picture first, and otherwise steps through the text modes by place", () => {
    const image = { cardId: "c", description: "A flag", width: 3, height: 2 };
    expect(previewMode({ modes: ["term_to_meaning", "image_to_meaning"], image })).toBe(
      "image_to_meaning",
    );
    expect(previewMode({ modes: ["term_to_meaning", "image_to_meaning"] })).toBe("term_to_meaning");
    const both = { modes: ["term_to_meaning", "meaning_to_term"] as const };
    expect([0, 1, 2].map((place) => previewMode(both, place))).toEqual([
      "term_to_meaning",
      "meaning_to_term",
      "term_to_meaning",
    ]);
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
