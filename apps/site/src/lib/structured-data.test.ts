import type { PublicDeckOut, PublicDeckSummary } from "@lymi/core/catalog";
import { describe, expect, it } from "vitest";
import { LANGUAGES_QUESTIONS, TEACHERS_QUESTIONS } from "../components/landing/faq";
import { pageI18n } from "./i18n";
import {
  deckBreadcrumbs,
  deckStructuredData,
  exploreStructuredData,
  faqPage,
  marketingPage,
} from "./structured-data";

const deck = (over: Partial<PublicDeckSummary> = {}): PublicDeckSummary => ({
  slug: "everyday-estonian",
  name: "Everyday Estonian",
  summary: "Words for your first weeks.",
  category: "languages",
  language: "et",
  meaningLanguage: "en",
  cardCount: 14,
  sectionCount: 2,
  card: null,
  ...over,
});

const published = (over: Partial<PublicDeckOut> = {}): PublicDeckOut => ({
  slug: "everyday-estonian",
  name: "Everyday Estonian",
  summary: "Words for your first weeks.",
  category: "languages",
  language: "et",
  meaningLanguage: "en",
  originalMeaningLanguage: "en",
  editions: ["en"],
  publisher: "Lymi",
  publisherAvatar: null,
  sources: [{ title: "Keeleklikk", url: "https://www.keeleklikk.ee/" }, { title: "A teacher" }],
  reviewedAt: null,
  revision: 2,
  publishedAt: "2026-09-10T12:00:00.000Z",
  cardCount: 14,
  sections: [],
  ...over,
});

describe("deckStructuredData", () => {
  it("describes a language deck as a vocabulary list in the language it teaches", () => {
    expect(deckStructuredData(published(), "ru")).toEqual({
      "@context": "https://schema.org",
      "@type": "LearningResource",
      "@id": "https://lymi.app/ru/explore/everyday-estonian",
      url: "https://lymi.app/ru/explore/everyday-estonian",
      name: "Everyday Estonian",
      description: "Words for your first weeks.",
      learningResourceType: "Vocabulary list",
      inLanguage: ["et", "en"],
      teaches: "Estonian vocabulary",
      about: { "@type": "Language", name: "Estonian", alternateName: "et" },
      publisher: { "@type": "Organization", name: "Lymi" },
      datePublished: "2026-09-10T12:00:00.000Z",
      citation: [
        { "@type": "CreativeWork", name: "Keeleklikk", url: "https://www.keeleklikk.ee/" },
        { "@type": "CreativeWork", name: "A teacher" },
      ],
      isPartOf: { "@type": "WebSite", name: "Lymi", url: "https://lymi.app/" },
    });
  });

  it("names the subject of a deck that teaches no language, never its vocabulary", () => {
    for (const language of [null, "en"]) {
      const data = deckStructuredData(published({ category: "science", language }), "uk");
      expect(data).toMatchObject({
        learningResourceType: "Flashcards",
        teaches: "Science",
        about: { "@type": "Thing", name: "Science" },
      });
    }
  });

  it("leaves out what it teaches when the deck has no language and no subject", () => {
    const data = deckStructuredData(
      published({ category: null, language: null, sources: [] }),
      "en",
    );
    expect(data).not.toHaveProperty("educationalLevel");
    expect(data).not.toHaveProperty("teaches");
    expect(data).not.toHaveProperty("citation");
    expect(data.inLanguage).toEqual(["en"]);
  });
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
      [deck(), deck({ slug: "signs", name: "Signs", category: null, language: null })],
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
        about: { "@type": "Language", name: "Estonian", alternateName: "et" },
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

describe("marketingPage", () => {
  const i18n = pageI18n("en");

  it("answers each question with the sentence the page shows", () => {
    const faq = faqPage(TEACHERS_QUESTIONS, i18n, {
      name: "Lymi for teachers",
      path: "/teachers",
    });
    expect(faq).toMatchObject({
      "@type": "FAQPage",
      "@id": "https://lymi.app/teachers#faq",
      inLanguage: "en",
    });
    expect(faq.mainEntity).toHaveLength(TEACHERS_QUESTIONS.length);
    expect(faq.mainEntity[0]).toEqual({
      "@type": "Question",
      name: i18n._(TEACHERS_QUESTIONS[0].question),
      acceptedAnswer: { "@type": "Answer", text: i18n._(TEACHERS_QUESTIONS[0].answer) },
    });
  });

  it("translates the questions with the rest of the page", () => {
    const uk = pageI18n("uk");
    const faq = faqPage(TEACHERS_QUESTIONS, uk, {
      name: "Lymi для вчителів",
      path: "/uk/teachers",
    });
    expect(faq.inLanguage).toBe("uk");
    expect(faq.mainEntity[0].name).toBe(uk._(TEACHERS_QUESTIONS[0].question));
    expect(faq.mainEntity[0].name).not.toBe(i18n._(TEACHERS_QUESTIONS[0].question));
  });

  it("names the product as free, open source and the same entity on every page", () => {
    const [app, faq] = marketingPage({
      name: "Lymi for language learning",
      description: "Keep the words.",
      path: "/languages",
      i18n,
      questions: LANGUAGES_QUESTIONS,
    });
    expect(app).toMatchObject({
      "@type": "SoftwareApplication",
      "@id": "https://lymi.app/#app",
      url: "https://lymi.app/languages",
      isAccessibleForFree: true,
      sameAs: ["https://github.com/krambertech/lymi"],
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    });
    expect(faq).toMatchObject({ "@type": "FAQPage" });
  });

  it("declares the organization and the site on the homepage only", () => {
    const home = marketingPage({
      name: "Lymi",
      description: "A flashcard app.",
      path: "/",
      i18n,
      entity: true,
    });
    expect(home.map((data) => data["@type"])).toEqual([
      "Organization",
      "WebSite",
      "SoftwareApplication",
    ]);
    expect(home[0]).toMatchObject({ sameAs: ["https://github.com/krambertech/lymi"] });
    expect(home[1]).toMatchObject({ publisher: { "@id": "https://lymi.app/#organization" } });
  });

  it("leaves the FAQ out of a page that asks nothing", () => {
    const data = marketingPage({
      name: "Estonian",
      description: "Estonian vocabulary.",
      path: "/languages/estonian",
      i18n,
    });
    expect(data.map((entry) => entry["@type"])).toEqual(["SoftwareApplication"]);
  });
});
