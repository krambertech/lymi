import { describe, expect, it } from "vitest";
import { mergeActivity } from "./activity-list";
import type { ActivityEntry } from "./api";

const entry = (group: string, count: number, terms: string[] = []): ActivityEntry => ({
  id: `${group}-${count}`,
  group,
  kind: "cards_added",
  actor: "mcp",
  app: "Claude",
  at: "2026-09-16T09:00:00.000Z",
  day: "2026-09-16",
  count,
  deck: { id: "d1", name: "Verbi", archived: false },
  person: null,
  cards: terms.map((term) => ({
    id: term,
    term,
    meaning: null,
    archived: false,
    deckId: "d1",
    deckArchived: false,
  })),
  import: null,
  export: null,
});

describe("mergeActivity", () => {
  it("joins the halves of a group cut by the end of a page", () => {
    const rows = mergeActivity([entry("g1", 2, ["uno", "due"]), entry("g1", 1, ["tre"])]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ group: "g1", count: 3 });
    expect(rows[0]?.cards.map((c) => c.term)).toEqual(["uno", "due", "tre"]);
  });

  it("joins halves that are not neighbours, as two decks in one call are not", () => {
    // One call wrote to two decks, so the page is [A, B, A, B].
    const rows = mergeActivity([
      entry("a", 1, ["a1"]),
      entry("b", 1, ["b1"]),
      entry("a", 1, ["a2"]),
      entry("b", 1, ["b2"]),
    ]);
    expect(rows.map((r) => r.group)).toEqual(["a", "b"]);
    expect(rows.map((r) => r.count)).toEqual([2, 2]);
  });

  it("keeps the order the server sent, newest first", () => {
    const rows = mergeActivity([entry("x", 1), entry("y", 1), entry("x", 1)]);
    expect(rows.map((r) => r.group)).toEqual(["x", "y"]);
  });

  it("leaves a list with nothing to join alone", () => {
    const rows = mergeActivity([entry("one", 1), entry("two", 2)]);
    expect(rows.map((r) => r.count)).toEqual([1, 2]);
  });
});
