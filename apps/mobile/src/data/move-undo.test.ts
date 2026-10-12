import type { Series } from "@lymi/client/api";
import { describe, expect, it } from "vitest";
import { moveBack } from "./move-undo";

const series = (id: string, deckIds: string[]) => ({ id, name: id, deckIds }) as unknown as Series;
const before = [series("a", ["d1", "d2", "d3"]), series("b", ["d4"])];

describe("moveBack", () => {
  it("puts the deck back in its old series in the place it left", () => {
    expect(moveBack("a", before)).toEqual({
      kind: "order",
      series: before[0],
      deckIds: ["d1", "d2", "d3"],
    });
  });

  it("takes a deck that had no series out again", () => {
    expect(moveBack(null, before)).toEqual({ kind: "move", seriesId: null });
  });

  it("knows no way back while the list has not loaded", () => {
    expect(moveBack("a", undefined)).toBeUndefined();
  });

  it("moves back by id when the loaded list no longer holds the old series", () => {
    expect(moveBack("gone", before)).toEqual({ kind: "move", seriesId: "gone" });
  });

  it("needs no list for a deck that had no series", () => {
    expect(moveBack(null, undefined)).toEqual({ kind: "move", seriesId: null });
  });

  it("keeps the order as it stood, not as the list changes after", () => {
    const list = [series("a", ["d1", "d2"])];
    const back = moveBack("a", list);
    list[0]?.deckIds.splice(0, 1);
    expect(back).toMatchObject({ deckIds: ["d1", "d2"] });
  });
});
