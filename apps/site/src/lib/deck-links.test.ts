import type { PublicDeckSummary } from "@lymi/core/catalog";
import { describe, expect, it } from "vitest";
import { deckLinks, sameLanguageDecks, sameTopicDecks, topicKey } from "./deck-links";

const summary = (
  slug: string,
  language: string | null,
  category: string | null = "languages",
): PublicDeckSummary => ({
  slug,
  name: slug,
  summary: "",
  category,
  tags: [],
  language,
  meaningLanguage: "en",
  cardCount: 10,
  sectionCount: 1,
  card: null,
});

const catalog = [
  summary("travel-greek", "el"),
  summary("greek-a1-vocabulary", "el"),
  summary("read-greek-alphabet", "el"),
  summary("travel-finnish", "fi"),
  summary("polish-a1-vocabulary", "pl"),
  summary("brazilian-portuguese-a1-vocabulary", "pt-BR"),
  summary("german-road-signs", "de", "driving"),
  summary("polish-road-signs", "pl", "driving"),
  summary("germany-states-on-a-map", "en", "geography"),
  summary("travel-denmark", "da"),
];

describe("topicKey", () => {
  it("takes the language's word out of the slug", () => {
    expect(topicKey({ slug: "travel-greek", language: "el" })).toBe("travel-*");
    expect(topicKey({ slug: "polish-a1-vocabulary", language: "pl" })).toBe("*-a1-vocabulary");
    expect(topicKey({ slug: "brazilian-portuguese-a1-vocabulary", language: "pt-BR" })).toBe(
      "*-a1-vocabulary",
    );
  });

  it("falls back to the base language's word for a regional tag", () => {
    expect(topicKey({ slug: "portuguese-a1-vocabulary", language: "pt-PT" })).toBe(
      "*-a1-vocabulary",
    );
    expect(topicKey({ slug: "chinese-a1-vocabulary", language: "zh-Hans" })).toBe(
      "*-a1-vocabulary",
    );
  });

  it("has no topic when the slug does not name the language", () => {
    expect(topicKey({ slug: "travel-denmark", language: "da" })).toBeNull();
    expect(topicKey({ slug: "germany-states-on-a-map", language: "de" })).toBeNull();
    expect(topicKey({ slug: "periodic-table", language: null })).toBeNull();
  });
});

describe("deck links", () => {
  it("links the other decks in the same language", () => {
    const greek = catalog[0] as PublicDeckSummary;
    expect(sameLanguageDecks(catalog, greek).map((deck) => deck.slug)).toEqual([
      "greek-a1-vocabulary",
      "read-greek-alphabet",
    ]);
  });

  it("links the same topic in other languages, subject decks included", () => {
    const a1 = catalog[4] as PublicDeckSummary;
    expect(sameTopicDecks(catalog, a1).map((deck) => deck.slug)).toEqual([
      "brazilian-portuguese-a1-vocabulary",
      "greek-a1-vocabulary",
    ]);
    const signs = catalog[6] as PublicDeckSummary;
    expect(sameTopicDecks(catalog, signs).map((deck) => deck.slug)).toEqual(["polish-road-signs"]);
  });

  it("starts after the deck and wraps, so a long language list links every deck", () => {
    const many = Array.from({ length: 30 }, (_, at) => summary(`greek-${at}`, "el"));
    const slugs = (deck: PublicDeckSummary) =>
      sameLanguageDecks(many, deck).map((each) => each.slug);
    expect(slugs(many[0] as PublicDeckSummary)[0]).toBe("greek-1");
    expect(slugs(many[25] as PublicDeckSummary)).toEqual([
      "greek-26",
      "greek-27",
      "greek-28",
      "greek-29",
      ...Array.from({ length: 8 }, (_, at) => `greek-${at}`),
    ]);
    const reached = new Set(many.flatMap(slugs));
    expect(reached.size).toBe(30);
  });

  it("keeps a regional variant of the same language out of the other-languages row", () => {
    const pt = [
      summary("portuguese-a1-vocabulary", "pt-PT"),
      summary("brazilian-portuguese-a1-vocabulary", "pt-BR"),
      summary("greek-a1-vocabulary", "el"),
    ];
    expect(sameTopicDecks(pt, pt[0] as PublicDeckSummary).map((deck) => deck.slug)).toEqual([
      "greek-a1-vocabulary",
    ]);
  });

  it("gives a subject deck no language neighbours", () => {
    expect(sameLanguageDecks(catalog, catalog[6] as PublicDeckSummary)).toEqual([]);
  });

  it("leaves out what More like this already shows", () => {
    const greek = catalog[0] as PublicDeckSummary;
    const links = deckLinks(catalog, greek, [{ slug: "greek-a1-vocabulary" }]);
    expect(links.language.map((deck) => deck.slug)).toEqual(["read-greek-alphabet"]);
    expect(links.topic.map((deck) => deck.slug)).toEqual(["travel-finnish"]);
  });

  it("reaches every deck that has a topic or a language neighbour", () => {
    const reached = new Set(
      catalog.flatMap((deck) => {
        const links = deckLinks(catalog, deck);
        return [...links.language, ...links.topic].map((each) => each.slug);
      }),
    );
    const alone = catalog.filter((deck) => !reached.has(deck.slug)).map((deck) => deck.slug);
    expect(alone).toEqual(["germany-states-on-a-map", "travel-denmark"]);
  });
});
