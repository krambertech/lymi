import type { Card, DeckSummary } from "@lymi/client/api";
import { describe, expect, it } from "vitest";
import { canEnrich } from "./can-enrich";

const card = (patch: Partial<Card> = {}) =>
  ({
    id: "c1",
    deckId: "d1",
    term: "sbrigare",
    meaning: "to deal with",
    example: null,
    exampleTranslation: null,
    exampleTranslationStatus: null,
    notes: null,
    pronunciation: "zbri-GA-re",
    language: "it",
    enrichmentStatus: null,
    ...patch,
  }) as Card;

const owner: Pick<DeckSummary, "role" | "enrichFields"> = {
  role: "owner",
  enrichFields: ["meaning", "example"],
};

describe("canEnrich", () => {
  it("offers Enrich to the owner while a field the deck lets the AI fill is empty", () => {
    expect(canEnrich(card(), owner)).toBe(true);
  });

  it("offers Enrich for a missing example translation, as the web does", () => {
    const filled = { example: "Devo sbrigare una cosa.", exampleTranslation: null };
    const translating = { ...owner, enrichFields: [...owner.enrichFields, "exampleTranslation"] };
    expect(canEnrich(card(filled), translating as typeof owner)).toBe(true);
    expect(
      canEnrich(card({ ...filled, exampleTranslation: " " }), translating as typeof owner),
    ).toBe(true);
    expect(canEnrich(card(filled), owner)).toBe(false);
    expect(
      canEnrich(
        card({ ...filled, exampleTranslation: "I have to deal with something." }),
        translating as typeof owner,
      ),
    ).toBe(false);
  });

  it("leaves it out while a run writes the translation", () => {
    const translating = { ...owner, enrichFields: [...owner.enrichFields, "exampleTranslation"] };
    expect(
      canEnrich(
        card({ example: "Devo sbrigare una cosa.", exampleTranslationStatus: "working" }),
        translating as typeof owner,
      ),
    ).toBe(false);
  });

  it("leaves it out for a member, a filled card, a field the deck keeps, and a working card", () => {
    expect(canEnrich(card(), { ...owner, role: "learner" })).toBe(false);
    expect(canEnrich(card({ example: "Devo sbrigare una cosa." }), owner)).toBe(false);
    expect(canEnrich(card(), { ...owner, enrichFields: ["meaning"] })).toBe(false);
    expect(canEnrich(card({ enrichmentStatus: "working" }), owner)).toBe(false);
    expect(canEnrich(card(), undefined)).toBe(false);
  });
});
