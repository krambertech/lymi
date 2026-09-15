import { describe, expect, it } from "vitest";
import { deckProgress, knownNeeded, type SectionStanding, sectionsToStart } from "./sections";

const section = (id: string, over: Partial<SectionStanding> = {}): SectionStanding => ({
  id,
  total: 10,
  known: 0,
  started: 0,
  opened: false,
  ...over,
});

const statuses = (sections: SectionStanding[], inOrder = true) =>
  deckProgress(sections, inOrder).sections.map((s) => s.status);

describe("knownNeeded", () => {
  it("rounds 80% up to whole cards", () => {
    expect(knownNeeded(18)).toBe(15);
    expect(knownNeeded(10)).toBe(8);
    expect(knownNeeded(5)).toBe(4);
    expect(knownNeeded(1)).toBe(1);
    expect(knownNeeded(0)).toBe(0);
  });
});

describe("deckProgress", () => {
  it("opens the first section and locks the rest", () => {
    const progress = deckProgress([section("a"), section("b"), section("c")], true);
    expect(progress.sections.map((s) => s.status)).toEqual(["open", "locked", "locked"]);
    expect(progress).toMatchObject({ currentId: "a", nextId: "b", ready: false });
  });

  it("is ready at 80% Known with every card started", () => {
    const at = (known: number) =>
      deckProgress([section("a", { total: 10, started: 10, known }), section("b")], true);
    expect(at(7).ready).toBe(false);
    expect(at(8).ready).toBe(true);
    expect(at(9).ready).toBe(true);
    expect(at(8).sections.map((s) => s.status)).toEqual(["open", "ready"]);
  });

  it("waits for every card to be started, however many are Known", () => {
    const progress = deckProgress(
      [section("a", { total: 10, started: 9, known: 9 }), section("b")],
      true,
    );
    expect(progress.ready).toBe(false);
    expect(progress.sections[0]?.notStarted).toBe(1);
  });

  it("a one-card section needs its card Known", () => {
    const one = (known: number) =>
      deckProgress([section("a", { total: 1, started: 1, known }), section("b")], true).ready;
    expect(one(0)).toBe(false);
    expect(one(1)).toBe(true);
  });

  it("opens every section up to the last one started, with no gaps", () => {
    expect(
      statuses([section("a"), section("b"), section("c", { opened: true }), section("d")]),
    ).toEqual(["open", "open", "open", "locked"]);
  });

  it("opens up to the last section with a studied card, so converted lessons keep their place", () => {
    const progress = deckProgress([section("a"), section("b", { started: 1 }), section("c")], true);
    expect(progress.sections.map((s) => s.status)).toEqual(["open", "open", "locked"]);
    expect(progress.currentId).toBe("b");
  });

  it("measures readiness on the current section only", () => {
    const progress = deckProgress(
      [
        section("a", { total: 10, started: 10, known: 10 }),
        section("b", { opened: true, total: 10, started: 10, known: 2 }),
        section("c"),
      ],
      true,
    );
    expect(progress).toMatchObject({ currentId: "b", nextId: "c", ready: false });
  });

  it("skips sections without cards", () => {
    const progress = deckProgress(
      [
        section("empty-first", { total: 0 }),
        section("a", { total: 5, started: 5, known: 4 }),
        section("empty-middle", { total: 0 }),
        section("b"),
      ],
      true,
    );
    expect(progress).toMatchObject({ currentId: "a", nextId: "b", ready: true });
    expect(progress.sections.map((s) => s.status)).toEqual(["open", "open", "open", "ready"]);
  });

  it("has no current or next once every section is open", () => {
    const progress = deckProgress([section("a"), section("b", { opened: true })], true);
    expect(progress).toMatchObject({ currentId: "b", nextId: null, ready: false });
  });

  it("opens everything when the deck does not gate", () => {
    const progress = deckProgress([section("a"), section("b")], false);
    expect(progress).toMatchObject({ currentId: null, nextId: null, ready: false });
    expect(progress.sections.map((s) => s.status)).toEqual(["open", "open"]);
  });

  it("opens everything when no section has cards", () => {
    expect(statuses([section("a", { total: 0 }), section("b", { total: 0 })])).toEqual([
      "open",
      "open",
    ]);
  });
});

describe("sectionsToStart", () => {
  const progress = deckProgress([section("a"), section("b"), section("c"), section("d")], true);

  it("opens the target and every locked section before it", () => {
    expect(sectionsToStart(progress, "c")).toEqual(["b", "c"]);
  });

  it("opens only the next section when that is the target", () => {
    expect(sectionsToStart(progress, "b")).toEqual(["b"]);
  });

  it("does nothing for an open or unknown section", () => {
    expect(sectionsToStart(progress, "a")).toEqual([]);
    expect(sectionsToStart(progress, "missing")).toEqual([]);
  });
});
