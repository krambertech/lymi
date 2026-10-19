import { describe, expect, it } from "vitest";
import { pageI18n } from "../../lib/i18n";
import { shelfCopy } from "./shelf-copy";

const german = { kind: "languages" as const, name: "german" };
const georgian = { kind: "languages" as const, name: "georgian" };

describe("shelfCopy", () => {
  it("titles a shelf by its name and how many free decks it has", () => {
    const copy = shelfCopy(pageI18n("en"), georgian, "Georgian", { decks: 4, cards: 320 });
    expect(copy.pageTitle).toBe("Georgian flashcards · 4 free decks · Lymi");
    expect(copy.metaDescription).toBe(
      "Ready-made decks for learning Georgian, written by a person and checked card by card. 4 free decks with 320 cards in all.",
    );
  });

  it("writes the counts in Russian and Ukrainian with their plurals", () => {
    expect(
      shelfCopy(pageI18n("ru"), georgian, "Грузинский", { decks: 5, cards: 21 }).pageTitle,
    ).toBe("Грузинский: флеш-карточки · 5 бесплатных колод · Lymi");
    expect(
      shelfCopy(pageI18n("uk"), german, "Німецька", { decks: 3, cards: 1 }).metaDescription,
    ).toContain("3 безкоштовні колоди, усього 1 картка.");
  });

  it("keeps the old title when the counts are unknown", () => {
    expect(shelfCopy(pageI18n("en"), german, "German").pageTitle).toBe("German flashcards · Lymi");
  });

  it("keeps the description within 155 characters", () => {
    for (const locale of ["en", "uk", "ru"]) {
      const copy = shelfCopy(pageI18n(locale), german, "German", { decks: 12, cards: 2400 });
      expect([...copy.metaDescription].length).toBeLessThanOrEqual(155);
    }
  });
});
