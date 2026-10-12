import type { PublicDeckSummary } from "@lymi/core/catalog";
import { describe, expect, it } from "vitest";
import { catalogContentHash, explorePath } from "./explore";
import { trayHue, trayHues } from "./tray";

const deck = (slug: string, category: string | null): PublicDeckSummary => ({
  slug,
  name: slug,
  summary: "",
  category,
  tags: [],
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

describe("catalogContentHash", () => {
  it("changes when something else the page shows changes, with the same decks", () => {
    const decks: PublicDeckSummary[] = [];
    const before = catalogContentHash(decks, { "einbuergerungstest-berlin": "2026-09-01" });
    const after = catalogContentHash(decks, { "einbuergerungstest-berlin": "2026-10-01" });
    expect(before).not.toBe(after);
    expect(catalogContentHash(decks)).toBe(catalogContentHash(decks));
  });
});
