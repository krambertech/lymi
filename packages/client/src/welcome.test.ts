import type { PublicDeckSummary } from "@lymi/core/catalog";
import { describe, expect, it } from "vitest";
import { startDecks } from "./welcome";

function deck(slug: string, language: string | null = "ja"): PublicDeckSummary {
  return {
    slug,
    name: slug,
    summary: "",
    category: "languages",
    tags: [],
    language,
    meaningLanguage: "en",
    cardCount: 10,
    sectionCount: 0,
    card: null,
  };
}

const slugs = (catalog: PublicDeckSummary[], language: string) =>
  startDecks(catalog, "language", language).decks.map((d) => d.slug);

describe("startDecks", () => {
  it("offers a Japanese beginner kana, then N5, then N4, then Japanese Essentials", () => {
    const catalog = [
      deck("travel-japanese"),
      deck("read-japanese-kana"),
      deck("everyday-japanese-conversation"),
      deck("core-japanese-words"),
      deck("japanese-n5-vocabulary-practice"),
      deck("japanese-n4-vocabulary"),
      deck("everyday-estonian", "et"),
    ];
    expect(slugs(catalog, "ja")).toEqual([
      "read-japanese-kana",
      "japanese-n5-vocabulary-practice",
      "japanese-n4-vocabulary",
      "travel-japanese",
    ]);
  });

  it("offers a Chinese beginner HSK 1, then HSK 2, then the rest in Explore's order", () => {
    const catalog = [
      deck("core-chinese-words", "zh"),
      deck("everyday-chinese-conversation", "zh"),
      deck("chinese-hsk-2-vocabulary", "zh"),
      deck("chinese-hsk-1-vocabulary", "zh"),
    ];
    expect(slugs(catalog, "zh")).toEqual([
      "chinese-hsk-1-vocabulary",
      "chinese-hsk-2-vocabulary",
      "core-chinese-words",
      "everyday-chinese-conversation",
    ]);
  });

  it("fills a missing beginner deck's place with the language's next deck in Explore's order", () => {
    const catalog = [
      deck("travel-japanese"),
      deck("everyday-japanese-conversation"),
      deck("japanese-n5-vocabulary-practice"),
      deck("core-japanese-words"),
    ];
    expect(slugs(catalog, "ja")).toEqual([
      "japanese-n5-vocabulary-practice",
      "travel-japanese",
      "everyday-japanese-conversation",
      "core-japanese-words",
    ]);
  });

  it("keeps Explore's order for a language with no beginner decks", () => {
    const catalog = [deck("everyday-finnish", "fi"), deck("finnish-verbs", "fi")];
    expect(slugs(catalog, "fi")).toEqual(["everyday-finnish", "finnish-verbs"]);
  });
});
