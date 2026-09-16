import { describe, expect, it, vi } from "vitest";
import type { CardFormValues } from "../components/card-form";
import type { Card } from "./api";
import { addInput, cardPatch, hasChanges } from "./card-writes";

vi.mock("./api", () => ({ api: {} }));

const values = (p: Partial<CardFormValues> = {}): CardFormValues => ({
  deckId: "d1",
  term: "sbrigarsi",
  meaning: "",
  pronunciation: "",
  example: "",
  notes: "",
  source: "",
  tags: [],
  language: "it",
  reviewModes: null,
  picture: { kind: "none" },
  description: "",
  sectionId: null,
  ...p,
});

const card: Card = {
  id: "c1",
  userId: "u1",
  deckId: "d1",
  term: "sbrigarsi",
  normalizedTerm: "sbrigarsi",
  meaning: "to hurry up",
  pronunciation: null,
  example: null,
  notes: null,
  language: "it",
  tags: ["verbs"],
  source: "Lesson 14",
  sectionId: null,
  directions: null,
  reviewModes: null,
  image: null,
  imageVersion: null,
  importId: null,
  externalId: null,
  meaningSource: "ai",
  exampleSource: null,
  pronunciationSource: null,
  enrichmentStatus: null,
  audioKey: null,
  createdBy: "user",
  archivedAt: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

describe("addInput", () => {
  it("leaves empty fields out and marks typed text as the learner's", () => {
    expect(addInput(values({ meaning: "to hurry up", tags: ["verbs"] }))).toEqual({
      deckId: "d1",
      term: "sbrigarsi",
      language: "it",
      meaning: "to hurry up",
      meaningSource: "manual",
      tags: ["verbs"],
    });
  });

  it("sends a card's own review modes and a cleared language", () => {
    const input = addInput(values({ language: null, reviewModes: ["image_to_term"] }));
    expect(input.language).toBeNull();
    expect(input.reviewModes).toEqual([{ cue: "image", target: "term" }]);
  });
});

describe("cardPatch", () => {
  const unchanged = values({ meaning: "to hurry up", tags: ["verbs"], source: "Lesson 14" });

  it("is empty when nothing changed", () => {
    expect(cardPatch(card, unchanged)).toEqual({});
  });

  it("sends only what changed, and a changed meaning becomes the learner's", () => {
    expect(
      cardPatch(card, { ...unchanged, meaning: "to get a move on", tags: ["verbs", "lesson"] }),
    ).toEqual({ meaning: "to get a move on", meaningSource: "manual", tags: ["verbs", "lesson"] });
  });

  it("clears text with an empty string and follows the deck again with null", () => {
    const own: Card = { ...card, reviewModes: [{ cue: "term", target: "meaning" }] };
    expect(cardPatch(own, { ...unchanged, source: "" })).toEqual({
      source: "",
      reviewModes: null,
    });
  });
});

describe("hasChanges", () => {
  const unchanged = values({ meaning: "to hurry up", tags: ["verbs"], source: "Lesson 14" });
  const file = new File(["x"], "sign.png", { type: "image/png" });

  it("is false for a form left as the card was", () => {
    expect(hasChanges(card, unchanged)).toBe(false);
  });

  it("counts a typed field and a chosen picture", () => {
    expect(hasChanges(card, { ...unchanged, notes: "reflexive" })).toBe(true);
    expect(hasChanges(card, { ...unchanged, picture: { kind: "file", file } })).toBe(true);
  });
});
