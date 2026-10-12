import { describe, expect, it } from "vitest";
import {
  activityCaller,
  activityMark,
  exportFormat,
  exportOutcome,
  exportStage,
  importOutcome,
  importStage,
  mergeActivity,
} from "./activity";
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

describe("mergeActivity across pages", () => {
  it("makes a group split by Show more one row with the whole count and every card", () => {
    const first = [entry("new", 1), entry("g", 2, ["uno", "due"])];
    const second = [entry("g", 3, ["tre", "quattro", "cinque"]), entry("old", 1)];
    const rows = mergeActivity([...first, ...second]);
    expect(rows.map((r) => r.group)).toEqual(["new", "g", "old"]);
    expect(rows[1]).toMatchObject({ count: 5 });
    expect(rows[1]?.cards).toHaveLength(5);
    expect(new Set(rows.map((r) => r.group)).size).toBe(rows.length);
  });
});

type Export = NonNullable<ActivityEntry["export"]>;
type Import = NonNullable<ActivityEntry["import"]>;
const file = (status: string, format = "lymi") => ({ status, format }) as unknown as Export;
const upload = (status: string, added = 0) =>
  ({ status, archivedAt: null, counts: { added } }) as unknown as Import;

describe("exports a release does not know", () => {
  it("never claims a file was written while it is writing or stopped", () => {
    expect(exportOutcome(file("exporting"))).toBe("exporting");
    expect(exportOutcome(file("failed"))).toBe("exporting");
    expect(exportStage(file("failed"))).toBe("stopped");
  });

  it("claims a written file once it is done or deleted", () => {
    expect(exportOutcome(file("done"))).toBe("exported");
    expect(exportOutcome(file("expired"))).toBe("exported");
  });

  it("claims nothing for a stage a newer server adds", () => {
    expect(exportStage(file("queued"))).toBe("unknown");
    expect(exportOutcome(file("queued"))).toBe("unknown");
  });

  it("names no format it does not know, rather than calling it a Lymi file", () => {
    expect(exportFormat(file("done", "anki"))).toBe("anki");
    expect(exportFormat(file("done", "csv"))).toBeNull();
  });
});

describe("imports and callers a release does not know", () => {
  it("says an import brought cards in only when it did", () => {
    expect(importOutcome(upload("done", 4))).toBe("imported");
    expect(importOutcome(upload("failed", 2))).toBe("imported");
    expect(importOutcome(upload("failed"))).toBe("importing");
    expect(importOutcome(upload("paused"))).toBe("unknown");
    expect(importStage(upload("paused"))).toBe("unknown");
  });

  it("falls back to the edit mark and to Lymi as the caller", () => {
    expect(activityMark("cards_added")).toBe("added");
    expect(activityMark("link_on")).toBe("link_on");
    expect(activityMark("cards_moved")).toBe("edited");
    expect(activityCaller({ ...entry("g", 1), app: null, actor: "robot" as never })).toEqual({
      kind: "lymi",
    });
    expect(activityCaller(entry("g", 1))).toEqual({ kind: "app", name: "Claude" });
  });
});
