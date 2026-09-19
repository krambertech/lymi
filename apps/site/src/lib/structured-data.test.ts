import type { PublicDeckSummary } from "@lymi/core/catalog";
import { describe, expect, it } from "vitest";
import { deckBreadcrumbs, exploreStructuredData } from "./structured-data";

const deck = (over: Partial<PublicDeckSummary> = {}): PublicDeckSummary => ({
  slug: "everyday-estonian",
  name: "Everyday Estonian",
  summary: "Words for your first weeks.",
  level: "A1",
  category: "languages",
  language: "et",
  meaningLanguage: "en",
  cardCount: 14,
  sectionCount: 2,
  card: null,
  ...over,
});

describe("deckBreadcrumbs", () => {
  it("leads from Explore to the deck, in the page's locale", () => {
    expect(deckBreadcrumbs(deck(), "uk", "Каталог")).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Каталог", item: "https://lymi.app/uk/explore" },
        {
          "@type": "ListItem",
          position: 2,
          name: "Everyday Estonian",
          item: "https://lymi.app/uk/explore/everyday-estonian",
        },
      ],
    });
  });
});

describe("exploreStructuredData", () => {
  it("describes Explore as a collection listing each deck as the resource its page is", () => {
    const data = exploreStructuredData(
      [deck(), deck({ slug: "signs", name: "Signs", level: null, language: null })],
      "en",
      {
        name: "Free flashcard decks · Lymi",
        description: "Ready-made decks.",
      },
    );
    expect(data).toMatchObject({
      "@type": "CollectionPage",
      "@id": "https://lymi.app/explore",
      name: "Free flashcard decks · Lymi",
      inLanguage: "en",
      mainEntity: { "@type": "ItemList", numberOfItems: 2 },
    });
    const [first, second] = data.mainEntity.itemListElement;
    expect(first).toEqual({
      "@type": "ListItem",
      position: 1,
      item: {
        "@type": "LearningResource",
        "@id": "https://lymi.app/explore/everyday-estonian",
        url: "https://lymi.app/explore/everyday-estonian",
        name: "Everyday Estonian",
        description: "Words for your first weeks.",
        learningResourceType: "Vocabulary list",
        inLanguage: ["et", "en"],
        teaches: "Estonian vocabulary",
        educationalLevel: {
          "@type": "DefinedTerm",
          name: "A1",
          termCode: "A1",
          inDefinedTermSet:
            "https://www.coe.int/en/web/common-european-framework-reference-languages",
        },
      },
    });
    expect(second?.item).not.toHaveProperty("teaches");
    expect(second?.item).not.toHaveProperty("educationalLevel");
    expect(second?.item.inLanguage).toEqual(["en"]);
  });

  it("puts a translated Explore at its own address", () => {
    const data = exploreStructuredData([deck()], "ru", { name: "n", description: "d" });
    expect(data.url).toBe("https://lymi.app/ru/explore");
    expect(data.mainEntity.itemListElement[0]?.item.url).toBe(
      "https://lymi.app/ru/explore/everyday-estonian",
    );
  });
});
