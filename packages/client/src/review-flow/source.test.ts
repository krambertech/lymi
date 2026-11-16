import { expect, it } from "vitest";
import { reviewSource } from "./source";

const ready = { id: "ready", published: true, role: "learner" as const };
const owned = { id: "owned", published: true, role: "owner" as const };
const privateDeck = { id: "private", published: false, role: "owner" as const };

it("is ready when every card is in a published deck the learner added", () => {
  expect(reviewSource([{ deckId: "ready" }, { deckId: "ready" }], [ready])).toBe("ready");
});

it("is import when every card was imported, even before the decks load", () => {
  expect(
    reviewSource(
      [
        { deckId: "a", importId: "imp" },
        { deckId: "b", importId: "imp" },
      ],
      undefined,
    ),
  ).toBe("import");
});

it("is own for cards the learner created, and for a published deck they own", () => {
  expect(reviewSource([{ deckId: "private" }], [privateDeck])).toBe("own");
  expect(reviewSource([{ deckId: "owned" }], [owned])).toBe("own");
});

it("waits while the decks have not loaded and a card might still be from a ready deck", () => {
  expect(reviewSource([{ deckId: "ready" }], undefined)).toBeNull();
});

it("is own when the sources mix, or when a ready card sits beside the learner's own", () => {
  expect(reviewSource([{ deckId: "ready" }, { deckId: "private" }], [ready, privateDeck])).toBe(
    "own",
  );
  expect(
    reviewSource([{ deckId: "private", importId: "imp" }, { deckId: "private" }], [privateDeck]),
  ).toBe("own");
});
