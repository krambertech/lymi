import { i18n } from "@lingui/core";
import { describe, expect, it } from "vitest";
import type { Card, CardState, Section } from "./api";
import {
  availableFields,
  type FilterContext,
  type FilterSet,
  filterRows,
  matchesFilters,
  NONE,
  toCardFilter,
  toggleValue,
  withValues,
} from "./card-filters";
import type { DeckRow } from "./deck-list";

const day = 86_400_000;
const now = new Date(2026, 8, 15, 10, 0).getTime();

i18n.load("en", {});
i18n.activate("en");

function row(
  id: string,
  opts: Partial<Card> & {
    section?: string | null;
    added?: number;
    state?: number;
    due?: number;
    reps?: number;
    lapses?: number;
    reviewed?: number | null;
  } = {},
): DeckRow {
  const { section, added, state, due, reps, lapses, reviewed, ...card } = opts;
  const fsrs = JSON.stringify({ stability: 3, reps: reps ?? 0, lapses: lapses ?? 0 });
  return {
    card: {
      id,
      term: id,
      meaning: `meaning of ${id}`,
      example: null,
      pronunciation: null,
      tags: [],
      source: null,
      language: null,
      image: null,
      sectionId: section ?? null,
      createdBy: "user",
      meaningSource: null,
      exampleSource: null,
      pronunciationSource: null,
      createdAt: new Date(now - (added ?? 0) * day),
      ...card,
    } as unknown as Card,
    state:
      state === undefined
        ? null
        : ({
            state,
            due: new Date(now + (due ?? 0) * day),
            fsrs,
            lastReview:
              reviewed === null || reviewed === undefined ? null : new Date(now - reviewed * day),
          } as unknown as CardState),
  };
}

const rows = [
  row("dueNow", { section: "s5", added: 1, state: 1, due: -0.1, reps: 3, lapses: 1, reviewed: 1 }),
  row("dueLaterToday", {
    section: "s5",
    added: 2,
    state: 2,
    due: 0.3,
    reps: 8,
    lapses: 5,
    reviewed: 0.1,
  }),
  row("dueInFive", { section: "s4", added: 9, state: 2, due: 5, reps: 4, reviewed: 4 }),
  row("dueInForty", { section: "s4", added: 45, state: 2, due: 40, reps: 9, reviewed: 20 }),
  row("fresh", { section: null, added: 0, state: 0, tags: ["verbs"], source: "Lesson 14" }),
  row("unstarted", { section: "s5", added: 3, language: "et", createdBy: "mcp" }),
];

const section = (id: string) => ({ id, name: id }) as Section;
const sections = [section("s4"), section("s5"), section("s6")];
const ctx: FilterContext = { now, sections, rows, i18n };
const ids = (list: DeckRow[]) => list.map((r) => r.card.id);
const only = (set: FilterSet) => ids(filterRows(rows, set, "", ctx));
const one = (key: FilterSet[number]["key"], ...values: string[]): FilterSet => [{ key, values }];

describe("availableFields", () => {
  it("offers a field only when the deck has something to choose by", () => {
    const keys = availableFields(ctx).map((f) => f.field.key);
    expect(keys).toEqual([
      "state",
      "due",
      "section",
      "tags",
      "source",
      "missing",
      "added",
      "addedBy",
      "reviewed",
      "forgotten",
    ]);
    // One language is the deck's own, and a deck the learner alone wrote names no actor.
    const plain = availableFields({ ...ctx, rows: rows.slice(0, 2), sections: [] }).map(
      (f) => f.field.key,
    );
    expect(plain).not.toContain("section");
    expect(plain).not.toContain("language");
    expect(plain).not.toContain("addedBy");
  });

  it("lists the values that occur, with none last", () => {
    const tags = availableFields(ctx).find((f) => f.field.key === "tags")?.options;
    expect(tags?.map((o) => o.value)).toEqual(["verbs", NONE]);
    const actors = availableFields(ctx).find((f) => f.field.key === "addedBy")?.options;
    expect(actors?.map((o) => o.value)).toEqual(["user", "mcp"]);
  });
});

describe("filterRows", () => {
  it("searches the term and the meaning", () => {
    expect(ids(filterRows(rows, [], "DUENOW", ctx))).toEqual(["dueNow"]);
    expect(ids(filterRows(rows, [], "meaning of fresh", ctx))).toEqual(["fresh"]);
  });

  it("combines a field's values with OR and fields with AND", () => {
    expect(only(one("state", "known"))).toEqual(["dueLaterToday", "dueInFive", "dueInForty"]);
    expect(
      only([
        { key: "state", values: ["known", "new"] },
        { key: "section", values: ["s4", NONE] },
      ]),
    ).toEqual(["dueInFive", "dueInForty", "fresh"]);
  });

  it("takes today as the rest of the local day and never counts a new card as due", () => {
    expect(only(one("due", "now"))).toEqual(["dueNow"]);
    expect(only(one("due", "today"))).toEqual(["dueNow", "dueLaterToday"]);
    expect(only(one("due", "week"))).toEqual(["dueNow", "dueLaterToday", "dueInFive"]);
  });

  it("filters by what a card carries: tags, source, language, who added it, what it lacks", () => {
    expect(only(one("tags", "verbs"))).toEqual(["fresh"]);
    expect(only(one("tags", NONE))).toHaveLength(5);
    expect(only(one("source", "Lesson 14"))).toEqual(["fresh"]);
    expect(only(one("source", NONE))).toHaveLength(5);
    expect(only(one("language", "et"))).toEqual(["unstarted"]);
    expect(only(one("addedBy", "mcp"))).toEqual(["unstarted"]);
    expect(only(one("missing", "example"))).toHaveLength(6);
    expect(only(one("missing", "meaning"))).toEqual([]);
  });

  it("filters by the learner's own record: when added, last reviewed, and forgotten", () => {
    expect(only(one("added", "today"))).toEqual(["fresh"]);
    expect(only(one("added", "week"))).toEqual(["dueNow", "dueLaterToday", "fresh", "unstarted"]);
    expect(only(one("added", "older"))).toEqual(["dueInForty"]);
    expect(only(one("reviewed", "today"))).toEqual(["dueLaterToday"]);
    expect(only(one("reviewed", "month"))).toEqual([
      "dueNow",
      "dueLaterToday",
      "dueInFive",
      "dueInForty",
    ]);
    expect(only(one("reviewed", "never"))).toEqual(["fresh", "unstarted"]);
    expect(only(one("forgotten", "ever"))).toEqual(["dueNow", "dueLaterToday"]);
    expect(only(one("forgotten", "often"))).toEqual(["dueLaterToday"]);
    expect(only(one("forgotten", "never"))).toHaveLength(4);
  });

  it("matches the written-by field on any of the three sources", () => {
    const ai = row("ai", { exampleSource: "ai" });
    const lesson = row("lesson", { meaningSource: "lesson" });
    expect(matchesFilters(ai, one("written", "ai"), ctx)).toBe(true);
    expect(matchesFilters(lesson, one("written", "ai"), ctx)).toBe(false);
    expect(matchesFilters(lesson, one("written", "ai", "lesson"), ctx)).toBe(true);
  });
});

describe("toggleValue and withValues", () => {
  it("adds to a checkbox field, replaces in a radio field, and drops an emptied field", () => {
    let set = toggleValue([], "state", "new", true);
    set = toggleValue(set, "state", "known", true);
    expect(set).toEqual([{ key: "state", values: ["new", "known"] }]);
    set = toggleValue(set, "due", "today", true);
    set = toggleValue(set, "due", "week", true);
    expect(set).toEqual([
      { key: "state", values: ["new", "known"] },
      { key: "due", values: ["week"] },
    ]);
    set = toggleValue(set, "state", "new", false);
    set = toggleValue(set, "state", "known", false);
    expect(set).toEqual([{ key: "due", values: ["week"] }]);
    expect(withValues(set, "due", [])).toEqual([]);
  });

  it("keeps a field's place when its values change", () => {
    const set: FilterSet = [
      { key: "state", values: ["new"] },
      { key: "due", values: ["week"] },
    ];
    expect(withValues(set, "state", ["known"]).map((c) => c.key)).toEqual(["state", "due"]);
  });
});

describe("toCardFilter", () => {
  it("says the same thing to the API's card search where it can", () => {
    const { filter, unsupported } = toCardFilter(
      [
        { key: "due", values: ["today"] },
        { key: "section", values: ["s4", "s5"] },
        { key: "tags", values: ["verbs"] },
        { key: "source", values: [NONE] },
        { key: "language", values: ["et"] },
        { key: "missing", values: ["example"] },
        { key: "added", values: ["week"] },
        { key: "reviewed", values: ["never"] },
        { key: "forgotten", values: ["often"] },
      ],
      ctx,
    );
    expect(unsupported).toEqual([]);
    expect(filter).toEqual({
      dueAt: { lt: new Date(2026, 8, 16).toISOString() },
      sectionId: { in: ["s4", "s5"] },
      tags: { some: { in: ["verbs"] } },
      source: { null: true },
      language: { in: ["et"] },
      example: { null: true },
      createdAt: { gte: new Date(now - 7 * day).toISOString() },
      reviews: { lastReviewedAt: { null: true }, slipping: { eq: true } },
    });
  });

  it("names the fields the server has no way to say", () => {
    const { filter, unsupported } = toCardFilter(
      [
        { key: "state", values: ["new"] },
        { key: "addedBy", values: ["mcp"] },
        { key: "written", values: ["ai"] },
        // Two missing fields, or a section and no section, are an OR across comparators.
        { key: "missing", values: ["meaning", "picture"] },
        { key: "section", values: ["s4", NONE] },
        { key: "forgotten", values: ["ever"] },
      ],
      ctx,
    );
    expect(unsupported).toEqual(["state", "addedBy", "written", "missing", "section"]);
    expect(filter).toEqual({ reviews: { lapses: { gte: 1 } } });
  });
});
