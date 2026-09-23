import { describe, expect, it } from "vitest";
import type { Card, CardState, Section } from "./api";
import {
  type DeckRow,
  dueBucket,
  dueToday,
  filterRows,
  groupRows,
  noFilters,
  splitForms,
} from "./deck-list";

const day = 86_400_000;
const now = new Date(2026, 8, 15, 10, 0).getTime();

function row(
  id: string,
  opts: { term?: string; section?: string | null; added?: number; state?: number; due?: number },
): DeckRow {
  const card = {
    id,
    term: opts.term ?? id,
    meaning: `meaning of ${id}`,
    sectionId: opts.section ?? null,
    createdAt: new Date(now - (opts.added ?? 0) * day),
  } as unknown as Card;
  const state =
    opts.state === undefined
      ? null
      : ({ state: opts.state, due: new Date(now + (opts.due ?? 0) * day) } as unknown as CardState);
  return { card, state };
}

const rows = [
  row("dueNow", { section: "s5", added: 1, state: 1, due: -0.1 }),
  row("dueLaterToday", { section: "s5", added: 2, state: 2, due: 0.3 }),
  row("dueInFive", { section: "s4", added: 9, state: 2, due: 5 }),
  row("dueInForty", { section: "s4", added: 10, state: 2, due: 40 }),
  row("fresh", { section: null, added: 0, state: 0 }),
  row("unstarted", { section: "s5", added: 3 }),
];

const section = (id: string) => ({ id, name: id }) as Section;
const sections = [section("s4"), section("s5"), section("s6")];

describe("dueBucket", () => {
  it("puts a relearning card that is due in Due now and a new one in Not started", () => {
    expect(dueBucket(row("x", { state: 3, due: -1 }), now)).toBe("now");
    expect(dueBucket(row("y", { state: 0, due: -1 }), now)).toBe("new");
    expect(dueBucket(row("z", {}), now)).toBe("new");
  });

  it("counts a scheduled card due before the day ends as in review today, a card with no schedule not", () => {
    expect(rows.filter((r) => dueToday(r, now)).map((r) => r.card.id)).toEqual([
      "dueNow",
      "dueLaterToday",
      "fresh",
    ]);
  });

  it("splits later cards at seven days", () => {
    expect(dueBucket(row("a", { state: 2, due: 7 }), now)).toBe("week");
    expect(dueBucket(row("b", { state: 2, due: 7.5 }), now)).toBe("later");
  });
});

describe("filterRows", () => {
  const ids = (list: DeckRow[]) => list.map((r) => r.card.id);

  it("searches the term and the meaning", () => {
    expect(ids(filterRows(rows, noFilters, "DUENOW", now))).toEqual(["dueNow"]);
    expect(ids(filterRows(rows, noFilters, "meaning of fresh", now))).toEqual(["fresh"]);
  });

  it("combines states within a filter and filters with each other", () => {
    const known = filterRows(rows, { ...noFilters, states: ["known"] }, "", now);
    expect(ids(known)).toEqual(["dueLaterToday", "dueInFive", "dueInForty"]);
    const knownInS4 = filterRows(
      rows,
      { ...noFilters, states: ["known", "new"], sections: ["s4", ""] },
      "",
      now,
      sections,
    );
    expect(ids(knownInS4)).toEqual(["dueInFive", "dueInForty", "fresh"]);
  });

  it("takes today as the rest of the local day and never counts a new card as due", () => {
    expect(ids(filterRows(rows, { ...noFilters, due: "today" }, "", now))).toEqual([
      "dueNow",
      "dueLaterToday",
    ]);
    expect(ids(filterRows(rows, { ...noFilters, due: "week" }, "", now))).toEqual([
      "dueNow",
      "dueLaterToday",
      "dueInFive",
    ]);
  });
});

describe("groupRows", () => {
  const shape = (sort: Parameters<typeof groupRows>[1]) =>
    groupRows(rows, sort, now, "en").map((g) => [g.key, g.rows.map((r) => r.card.id)]);

  it("groups by section in section order, oldest card first, with no section last", () => {
    const groups = groupRows(rows, "section", now, "en", sections);
    expect(groups.map((g) => [g.key, g.rows.map((r) => r.card.id)])).toEqual([
      ["section:s4", ["dueInForty", "dueInFive"]],
      ["section:s5", ["unstarted", "dueLaterToday", "dueNow"]],
      ["section:", ["fresh"]],
    ]);
  });

  it("keeps an empty section only when asked, so the owner can drop cards in it", () => {
    const keys = (withEmpty: boolean) =>
      groupRows(rows, "section", now, "en", sections, withEmpty).map((g) => g.key);
    expect(keys(false)).not.toContain("section:s6");
    expect(keys(true)).toEqual(["section:s4", "section:s5", "section:s6", "section:"]);
  });

  it("treats a card in a section that is not listed as having none", () => {
    const groups = groupRows(rows, "section", now, "en", [section("s4")]);
    expect(groups.at(-1)?.rows.map((r) => r.card.id)).toEqual([
      "unstarted",
      "dueLaterToday",
      "dueNow",
      "fresh",
    ]);
  });

  it("shows a deck without sections as one list, newest first", () => {
    const groups = groupRows(rows, "section", now, "en", []);
    expect(groups.map((g) => g.key)).toEqual(["all"]);
    expect(groups[0]?.rows[0]?.card.id).toBe("fresh");
  });

  it("groups by when a card is back and leaves out empty groups", () => {
    expect(shape("due")).toEqual([
      ["now", ["dueNow"]],
      ["week", ["dueLaterToday", "dueInFive"]],
      ["later", ["dueInForty"]],
      ["new", ["unstarted", "fresh"]],
    ]);
    expect(groupRows([rows[3] as DeckRow], "due", now, "en").map((g) => g.key)).toEqual(["later"]);
  });

  it("groups by the day a card was added, newest first", () => {
    const groups = groupRows(rows, "added", now, "en");
    expect(groups[0]?.rows.map((r) => r.card.id)).toEqual(["fresh"]);
    expect(groups).toHaveLength(6);
  });

  it("sorts A–Z in one group with the interface language's collation", () => {
    const words = [
      row("1", { term: "ülikool" }),
      row("2", { term: "Õpetaja" }),
      row("3", { term: "kool" }),
    ];
    expect(groupRows(words, "az", now, "et")[0]?.rows.map((r) => r.card.term)).toEqual([
      "kool",
      "Õpetaja",
      "ülikool",
    ]);
    expect(groupRows([], "az", now, "en")).toEqual([]);
  });
});

describe("splitForms", () => {
  it("separates the forms after the first", () => {
    expect(splitForms("õppima · õppida · õpin")).toEqual({
      word: "õppima",
      forms: "õppida · õpin",
    });
  });

  it("leaves a phrase and a stray dot alone", () => {
    expect(splitForms("Ma olen töölähetuses.")).toEqual({
      word: "Ma olen töölähetuses.",
      forms: null,
    });
    expect(splitForms(" · x")).toEqual({ word: " · x", forms: null });
  });
});
