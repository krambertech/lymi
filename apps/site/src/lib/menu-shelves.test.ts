import type { PublicDeckSummary } from "@lymi/core/catalog";
import { describe, expect, it } from "vitest";
import { MENU_LANGUAGE_SHELVES, menuShelves } from "./menu-shelves";
import { trayHue } from "./tray";

const deck = (slug: string, category: string, language = "de"): PublicDeckSummary => ({
  slug,
  name: slug,
  summary: "",
  category,
  tags: [],
  language,
  meaningLanguage: "en",
  cardCount: 1,
  sectionCount: 0,
  card: null,
});

const shelf = (count: number, category: string, language: string) =>
  Array.from({ length: count }, (_, at) =>
    deck(`${language}-${category}-${at}`, category, language),
  );

describe("menuShelves", () => {
  it("lists only shelves big enough for a page, at their address in the locale", () => {
    const shelves = menuShelves(
      [
        ...shelf(3, "languages", "de"),
        ...shelf(2, "languages", "fr"),
        ...shelf(4, "geography", "en"),
      ],
      "uk",
    );
    expect(shelves.languages).toEqual([
      {
        key: "language-de",
        language: "de",
        path: "/uk/explore/languages/german",
        decks: 3,
        hue: trayHue("german"),
      },
    ]);
    expect(shelves.subjects.map((each) => each.path)).toEqual(["/uk/explore/subjects/geography"]);
  });

  it("keeps the biggest language shelves first and stops at the menu's limit", () => {
    const tags = ["de", "fr", "es", "it", "pl", "cs", "ja", "ko", "zh", "uk"];
    const decks = tags.flatMap((tag, at) => shelf(3 + at, "languages", tag));
    const { languages } = menuShelves(decks, "en");
    expect(languages).toHaveLength(MENU_LANGUAGE_SHELVES);
    expect(languages[0]?.language).toBe("uk");
    expect(languages.map((each) => each.decks)).toEqual([12, 11, 10, 9, 8, 7, 6, 5]);
  });
});
