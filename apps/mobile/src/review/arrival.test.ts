import { describe, expect, it } from "vitest";
import { arrival, FRESH } from "./arrival";

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
