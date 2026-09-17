import type { PublicDeckSummary } from "@lymi/core/catalog";
import { describe, expect, it } from "vitest";
import { CATEGORY_ORDER, explorePath, shelvesOf, UNCATEGORISED } from "./explore";
import { trayHue, trayHues } from "./tray";

const deck = (slug: string, category: string | null): PublicDeckSummary => ({
  slug,
  name: slug,
  summary: "",
  level: null,
  category,
  language: "et",
  meaningLanguage: "en",
  cardCount: 1,
  sectionCount: 0,
  card: null,
});

describe("explorePath", () => {
  it("puts English at the root and every other locale under its own prefix", () => {
    expect(explorePath("en")).toBe("/explore");
    expect(explorePath("uk")).toBe("/uk/explore");
    expect(explorePath("ru")).toBe("/ru/explore");
  });
});

describe("shelvesOf", () => {
  it("orders shelves as the list declares, whatever order the decks arrive in", () => {
    const shelves = shelvesOf([
      deck("driving", "driving"),
      deck("estonian", "languages"),
      deck("ielts", "exams"),
    ]);
    expect(shelves.map((shelf) => shelf.key)).toEqual(["languages", "exams", "driving"]);
    expect(CATEGORY_ORDER.slice(0, 3)).toEqual(["languages", "exams", "driving"]);
  });

  it("gathers a deck with no shelf, and one naming a shelf that no longer exists, at the end", () => {
    const shelves = shelvesOf([
      deck("loose", null),
      deck("estonian", "languages"),
      deck("retired", "cooking"),
    ]);
    expect(shelves.map((shelf) => shelf.key)).toEqual(["languages", UNCATEGORISED]);
    expect(shelves.at(-1)?.decks.map((d) => d.slug)).toEqual(["loose", "retired"]);
  });

  it("leaves out a shelf with no deck on it", () => {
    expect(shelvesOf([deck("estonian", "languages")]).map((s) => s.key)).toEqual(["languages"]);
  });
});

describe("trayHues", () => {
  it("gives a deck the same colour however the catalogue grows around it", () => {
    const estonian = deck("everyday-estonian", "languages");
    const alone = trayHues([estonian])[0];
    const crowded = trayHues([deck("a", "languages"), deck("b", "languages"), estonian]).at(-1);
    expect(crowded).toBe(alone);
  });

  it("does not repaint a deck when the ones beside it are filtered away", () => {
    const decks = Array.from({ length: 40 }, (_, i) => deck(`deck-${i}`, "languages"));
    const all = trayHues(decks);
    const narrowed = trayHues(decks.filter((_, at) => at % 3 === 0));
    expect(narrowed).toEqual(all.filter((_, at) => at % 3 === 0));
  });

  it("agrees with the hue a deck's own page works out from its slug", () => {
    const decks = [deck("everyday-estonian", "languages"), deck("everyday-finnish", "languages")];
    expect(trayHues(decks)).toEqual(decks.map((d) => trayHue(d.slug)));
  });
});
