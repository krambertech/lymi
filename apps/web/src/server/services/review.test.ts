import { describe, expect, it } from "vitest";
import { oneDirectionPerCard, shuffleEqualPriorityItems } from "./review";

describe("oneDirectionPerCard", () => {
  it("keeps the oldest direction and removes its sibling from the session", () => {
    const rows = [
      { card: { id: "card-a" }, direction: "recognition" },
      { card: { id: "card-a" }, direction: "production" },
      { card: { id: "card-b" }, direction: "production" },
    ];

    expect(oneDirectionPerCard(rows)).toEqual([rows[0], rows[2]]);
  });
});

describe("shuffleEqualPriorityItems", () => {
  it("shuffles ties without moving cards across priorities", () => {
    const items = [
      { id: "a", priority: 1 },
      { id: "b", priority: 1 },
      { id: "c", priority: 2 },
      { id: "d", priority: 2 },
      { id: "e", priority: 3 },
    ];

    expect(
      shuffleEqualPriorityItems(
        items,
        (item) => item.priority,
        () => 0,
      ),
    ).toEqual([items[1], items[0], items[3], items[2], items[4]]);
    expect(items.map((item) => item.id)).toEqual(["a", "b", "c", "d", "e"]);
  });
});
