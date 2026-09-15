import type { PublicDeckOut } from "@lymi/core/catalog";
import { describe, expect, it } from "vitest";
import {
  deckEtag,
  deckPaths,
  deckSitemap,
  deckStructuredData,
  etagMatches,
  jsonForScript,
  languageName,
  sectionPath,
  TRY_LIMIT,
  tryCards,
} from "./deck-page";

const deck = (over: Partial<PublicDeckOut> = {}): PublicDeckOut => ({
  slug: "everyday-estonian",
  name: "Everyday Estonian",
  summary: "Words for your first weeks.",
  level: "A1",
  language: "et",
  meaningLanguage: "en",
  publisher: "Lymi",
  sources: [{ title: "Keeleklikk", url: "https://www.keeleklikk.ee/" }, { title: "A teacher" }],
  reviewedAt: null,
  revision: 2,
  publishedAt: "2026-09-10T12:00:00.000Z",
  cardCount: 14,
  sections: [
    {
      name: "Greetings",
      cards: Array.from({ length: 12 }, (_, i) => ({
        term: `term ${i}`,
        meaning: i === 1 ? null : `meaning ${i}`,
      })),
    },
    { name: "Numbers", cards: [{ term: "üks", meaning: "one" }] },
    { name: null, cards: [{ term: "jah", meaning: "yes" }] },
  ],
  ...over,
});

describe("deck page paths", () => {
  it("puts English at the path and the other locales under their prefix", () => {
    expect(deckPaths("everyday-estonian")).toEqual({
      en: "/decks/everyday-estonian",
      uk: "/uk/decks/everyday-estonian",
      ru: "/ru/decks/everyday-estonian",
    });
  });
});

describe("tryCards", () => {
  it("offers the first section's cards that have a meaning, up to the limit", () => {
    const trial = tryCards(deck());
    expect(trial.section).toBe("Greetings");
    expect(trial.cards).toHaveLength(TRY_LIMIT);
    expect(trial.cards.map((card) => card.term)).not.toContain("term 1");
    expect(trial.cards[0]).toEqual({ term: "term 0", meaning: "meaning 0" });
  });
});

describe("sectionPath", () => {
  it("numbers named sections in order and leaves cards outside a section unnumbered", () => {
    const { inOrder, steps } = sectionPath(deck());
    expect(inOrder).toBe(true);
    expect(steps.map((step) => [step.position, step.name, step.cards.length])).toEqual([
      [1, "Greetings", 12],
      [2, "Numbers", 1],
      [null, null, 1],
    ]);
  });

  it("treats a deck without sections as one open group", () => {
    const { inOrder, steps } = sectionPath(
      deck({ sections: [{ name: null, cards: [{ term: "jah", meaning: "yes" }] }] }),
    );
    expect(inOrder).toBe(false);
    expect(steps).toEqual([
      { position: null, name: null, cards: [{ term: "jah", meaning: "yes" }] },
    ]);
  });
});

describe("languageName", () => {
  it("names a language in the page language, capitalised only as a label", () => {
    expect(languageName("et", "en")).toBe("Estonian");
    expect(languageName("et", "uk")).toBe("естонська");
    expect(languageName("et", "uk", { label: true })).toBe("Естонська");
    expect(languageName("en", "ru", { label: true })).toBe("Английский");
    expect(languageName(null, "en")).toBeNull();
  });
});

describe("deck caching", () => {
  it("keys the ETag on slug, revision, locale and version only", () => {
    const etag = deckEtag({ slug: "a", revision: 3, locale: "uk", version: "v1" });
    expect(etag).toBe('W/"deck-a-r3-uk-v1"');
    expect(deckEtag({ slug: "a", revision: 4, locale: "uk", version: "v1" })).not.toBe(etag);
    expect(deckEtag({ slug: "a", revision: 3, locale: "ru", version: "v1" })).not.toBe(etag);
    expect(deckEtag({ slug: "a", revision: 3, locale: "uk", version: "v2" })).not.toBe(etag);
  });

  it("matches If-None-Match lists, weak or strong", () => {
    const etag = 'W/"deck-a-r3-uk-v1"';
    expect(etagMatches('"other", W/"deck-a-r3-uk-v1"', etag)).toBe(true);
    expect(etagMatches('"deck-a-r3-uk-v1"', etag)).toBe(true);
    expect(etagMatches('W/"deck-a-r2-uk-v1"', etag)).toBe(false);
    expect(etagMatches(null, etag)).toBe(false);
  });
});

describe("deckStructuredData", () => {
  it("describes the deck as a LearningResource with its level and language", () => {
    expect(deckStructuredData(deck(), "ru")).toEqual({
      "@context": "https://schema.org",
      "@type": "LearningResource",
      "@id": "https://lymi.app/ru/decks/everyday-estonian",
      url: "https://lymi.app/ru/decks/everyday-estonian",
      name: "Everyday Estonian",
      description: "Words for your first weeks.",
      learningResourceType: "Vocabulary list",
      inLanguage: ["et", "en"],
      teaches: "Estonian vocabulary",
      about: { "@type": "Language", name: "Estonian", alternateName: "et" },
      educationalLevel: {
        "@type": "DefinedTerm",
        name: "A1",
        termCode: "A1",
        inDefinedTermSet:
          "https://www.coe.int/en/web/common-european-framework-reference-languages",
      },
      publisher: { "@type": "Organization", name: "Lymi" },
      datePublished: "2026-09-10T12:00:00.000Z",
      citation: [
        { "@type": "CreativeWork", name: "Keeleklikk", url: "https://www.keeleklikk.ee/" },
        { "@type": "CreativeWork", name: "A teacher" },
      ],
      isPartOf: { "@type": "WebSite", name: "Lymi", url: "https://lymi.app/" },
    });
  });

  it("leaves out the level and language when the deck has none", () => {
    const data = deckStructuredData(deck({ level: null, language: null, sources: [] }), "en");
    expect(data).not.toHaveProperty("educationalLevel");
    expect(data).not.toHaveProperty("teaches");
    expect(data).not.toHaveProperty("citation");
    expect(data.inLanguage).toEqual(["en"]);
  });

  it("cannot close its script element", () => {
    expect(jsonForScript({ name: "</script><script>alert(1)</script>" })).not.toContain(
      "</script>",
    );
  });
});

describe("deckSitemap", () => {
  it("lists every locale of each deck with its alternates", () => {
    const xml = deckSitemap([{ slug: "everyday-estonian", updatedAt: new Date(0) }]);
    for (const path of Object.values(deckPaths("everyday-estonian"))) {
      expect(xml).toContain(`<loc>https://lymi.app${path}</loc>`);
    }
    expect(xml.match(/<url>/g)).toHaveLength(3);
    expect(xml).toContain('hreflang="x-default" href="https://lymi.app/decks/everyday-estonian"');
    expect(deckSitemap([])).toContain("<urlset");
  });
});
