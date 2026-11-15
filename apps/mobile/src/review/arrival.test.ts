import { describe, expect, it } from "vitest";
import { afterRefusal, arrival, FRESH } from "./arrival";

describe("how a review card arrives", () => {
  it("slides the next card in after Undo then Archive", () => {
    const back = arrival(FRESH, { type: "undo" });
    expect(back).toEqual({ kind: "returned" });
    expect(arrival(back, { type: "moved", by: "archive" })).toEqual(FRESH);
  });

  it("slides a card in after Undo then a restore or an offer", () => {
    const back = arrival(FRESH, { type: "undo" });
    expect(arrival(back, { type: "moved", by: "restore" })).toEqual(FRESH);
    expect(arrival(back, { type: "moved", by: "offer" })).toEqual(FRESH);
  });
});

describe("Undo after a refused grade", () => {
  const grade = { rating: 3 };
  it("stops offering Undo for the grade the server refused", () => {
    expect(afterRefusal({ grade }, grade)).toBeNull();
  });

  it("keeps Undo for a later grade", () => {
    const later = { grade: { rating: 4 } };
    expect(afterRefusal(later, grade)).toBe(later);
    expect(afterRefusal(null, grade)).toBeNull();
  });
});
