import { describe, expect, it } from "vitest";
import type { Card, CardState, Section } from "./api";
import {
  chosenReview,
  type DeckRow,
  deckTags,
  dueBucket,
  filterRows,
  groupRows,
  noFilters,
  retag,
  splitForms,
} from "./deck-list";

const day = 86_400_000;
const now = new Date(2026, 8, 15, 10, 0).getTime();

function row(
  id: string,
  opts: {
    term?: string;
    section?: string | null;
    added?: number;
    state?: number;
    due?: number;
    tags?: string[];
  },
): DeckRow {
  const card = {
    id,
    term: opts.term ?? id,
    meaning: `meaning of ${id}`,
    sectionId: opts.section ?? null,
    tags: opts.tags ?? [],
    createdAt: new Date(now - (opts.added ?? 0) * day),
  } as unknown as Card;
  const state =
    opts.state === undefined
      ? null
      : ({ state: opts.state, due: new Date(now + (opts.due ?? 0) * day) } as unknown as CardState);
  return { card, state };
}

const rows = [
  row("dueNow", { section: "s5", added: 1, state: 1, due: -0.1, tags: ["food", "Verbs"] }),
  row("dueLaterToday", { section: "s5", added: 2, state: 2, due: 0.3, tags: ["Дієслова"] }),
  row("dueInFive", { section: "s4", added: 9, state: 2, due: 5 }),
  row("dueInForty", { section: "s4", added: 10, state: 2, due: 40 }),
  row("fresh", { section: null, added: 0, state: 0, tags: ["verbs"] }),
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

describe("tags", () => {
  const ids = (list: DeckRow[]) => list.map((r) => r.card.id);

  it("matches a card carrying any chosen tag, whatever its case", () => {
    expect(ids(filterRows(rows, { ...noFilters, tags: ["verbs"] }, "", now))).toEqual([
      "dueNow",
      "fresh",
    ]);
    expect(ids(filterRows(rows, { ...noFilters, tags: ["дієслова", "food"] }, "", now))).toEqual([
      "dueNow",
      "dueLaterToday",
    ]);
    expect(
      ids(filterRows(rows, { ...noFilters, tags: ["verbs"], states: ["new"] }, "", now)),
    ).toEqual(["fresh"]);
  });

  it("lists a deck's tags most used first, one per key", () => {
    expect(deckTags(rows)).toEqual([
      { key: "verbs", name: "Verbs", cards: 2 },
      { key: "food", name: "food", cards: 1 },
      { key: "дієслова", name: "Дієслова", cards: 1 },
    ]);
  });
});

describe("retag", () => {
  it("takes tags off and puts them on by key, keeping the order", () => {
    expect(retag(["food", "Verbs", "travel"], ["verbs", "new"], ["FOOD"])).toEqual({
      tags: ["Verbs", "travel", "new"],
      full: false,
    });
  });

  it("leaves a tag off a card that already holds twenty", () => {
    const twenty = Array.from({ length: 20 }, (_, i) => `t${i}`);
    expect(retag(twenty, ["one more"], [])).toEqual({ tags: twenty, full: true });
    expect(retag(twenty, ["one more"], ["t0"]).tags.at(-1)).toBe("one more");
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

describe("chosenReview", () => {
  it("takes started cards not reviewed today, soonest due first", () => {
    const reviewed = row("reviewed", { state: 2, due: 3 });
    (reviewed.state as { lastReview: Date }).lastReview = new Date(now - 60_000);
    const rows = [
      row("later", { state: 2, due: 5 }),
      row("new", {}),
      row("overdue", { state: 1, due: -2 }),
      reviewed,
      row("tonight", { state: 2, due: 0.4 }),
      row("unchosen", { state: 2, due: -1 }),
    ];
    const chosen = new Set(["later", "new", "overdue", "reviewed", "tonight"]);
    expect(chosenReview(rows, chosen, now)).toEqual([
      { id: "overdue", due: true },
      { id: "tonight", due: true },
      { id: "later", due: false },
    ]);
  });
});
