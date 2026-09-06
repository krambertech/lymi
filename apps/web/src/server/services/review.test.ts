import { describe, expect, it } from "vitest";
import { oneDirectionPerCard } from "./review";

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
