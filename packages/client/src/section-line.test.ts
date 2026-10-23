import { describe, expect, it } from "vitest";
import type { Card, CardState, Section } from "./api";
import type { DeckRow } from "./deck-list";
import { lineColumns, opening } from "./section-line";

function section(id: string, opts: Partial<Section> = {}): Section {
  return {
    id,
    name: `Lesson ${id}`,
    total: 10,
    known: 0,
    notStarted: 10,
    due: 0,
    knownNeeded: 8,
    status: "open",
    ...opts,
  } as Section;
}

function row(id: string, sectionId: string | null, state?: number): DeckRow {
  return {
    card: { id, sectionId } as unknown as Card,
    state: state === undefined ? null : ({ state } as unknown as CardState),
  };
}

describe("lineColumns", () => {
  it("draws a column per section from the server's counts, learning being what is neither known nor new", () => {
    const columns = lineColumns(
      [
        section("1", { known: 6, notStarted: 1 }),
        section("2", { status: "locked", known: 0, notStarted: 10 }),
      ],
      [],
    );
    expect(columns.map((c) => [c.id, c.known, c.learning, c.waiting])).toEqual([
      ["1", 6, 3, false],
      ["2", 0, 0, true],
    ]);
  });

  it("ends with the cards in no listed section, counted from their rows", () => {
    const rows = [row("a", null, 2), row("b", "gone", 1), row("c", null), row("d", "1", 2)];
    const last = lineColumns([section("1")], rows).at(-1);
    expect(last).toMatchObject({ id: "", section: null, total: 3, known: 1, learning: 1 });
  });

  it("has no column for unsectioned cards in a deck without sections", () => {
    expect(lineColumns([], [row("a", null, 2)])).toEqual([]);
  });
});

describe("opening", () => {
  const progress = (ready = false, nextId: string | null = "2") => ({
    currentId: "1",
    nextId,
    ready,
  });

  it("counts what is left to know while the next section waits", () => {
    const sections = [section("1", { known: 5, notStarted: 2 }), section("2")];
    expect(opening(sections, progress())).toMatchObject({ kind: "waits", left: 3 });
  });

  it("waits on the last unseen cards once enough is known", () => {
    const sections = [section("1", { known: 8, notStarted: 2 }), section("2")];
    expect(opening(sections, progress())).toMatchObject({ kind: "coming_up", notStarted: 2 });
  });

  it("says the next section is ready, and that every section is open past the last", () => {
    const sections = [section("1", { known: 9, notStarted: 0 }), section("2")];
    expect(opening(sections, progress(true))?.kind).toBe("ready");
    expect(opening(sections, progress(false, null))?.kind).toBe("open");
  });

  it("says nothing for a deck that opens every section at once", () => {
    expect(opening([section("1")], null)).toBeNull();
  });
});
