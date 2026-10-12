import { describe, expect, it } from "vitest";
import { groupDecks, seriesForm } from "./library-groups";

const deck = (id: string, seriesId: string | null = null) => ({ id, seriesId });

describe("groupDecks", () => {
  it("leaves a Library without series exactly as it was", () => {
    const decks = [deck("a"), deck("b")];

    expect(groupDecks(decks, [])).toEqual({ loose: decks, series: [] });
    expect(groupDecks(decks, undefined)).toEqual({ loose: decks, series: [] });
  });

  it("puts each series' decks in the series' order, after the loose decks", () => {
    const decks = [deck("a", "s"), deck("b"), deck("c", "s")];

    const groups = groupDecks(decks, [{ id: "s", deckIds: ["c", "a"] }]);

    expect(groups.loose.map((d) => d.id)).toEqual(["b"]);
    expect(groups.series[0]?.decks.map((d) => d.id)).toEqual(["c", "a"]);
  });

  it("never hides a deck when the two lists disagree", () => {
    // "a" moved into s on another device before the series list refetched; "x" is in a series this
    // list does not know; "gone" is listed but no longer in the decks.
    const decks = [deck("a", "s"), deck("b", "s"), deck("x", "unknown")];

    const groups = groupDecks(decks, [{ id: "s", deckIds: ["b", "gone"] }]);

    expect(groups.series[0]?.decks.map((d) => d.id)).toEqual(["b", "a"]);
    expect(groups.loose.map((d) => d.id)).toEqual(["x"]);
  });
});

describe("seriesForm", () => {
  const list = [{ id: "s1", deckIds: [] }];

  it("makes a new series when the route names none", () => {
    expect(seriesForm(undefined, undefined)).toEqual({ mode: "create" });
  });

  it("waits for the list on a cold rename instead of starting a blank create", () => {
    expect(seriesForm("s1", undefined)).toEqual({ mode: "loading" });
  });

  it("renames the series once the list holds it", () => {
    expect(seriesForm("s1", list)).toEqual({ mode: "rename", series: list[0] });
  });

  it("says a series that has gone is missing rather than creating one", () => {
    expect(seriesForm("s2", list)).toEqual({ mode: "missing" });
  });
});
