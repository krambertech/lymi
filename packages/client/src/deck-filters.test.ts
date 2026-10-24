import { describe, expect, it } from "vitest";
import type { Card, CardState, Section } from "./api";
import {
  activeFields,
  availableFields,
  type FilterContext,
  keeps,
  ON,
  toggleValue,
} from "./deck-filters";
import { type DeckFilters, type DeckRow, noFilters } from "./deck-list";

const day = 86_400_000;
const now = new Date(2026, 8, 15, 10, 0).getTime();

function row(
  id: string,
  opts: {
    section?: string | null;
    state?: number;
    due?: number;
    tags?: string[];
    important?: boolean;
  },
): DeckRow {
  const card = {
    id,
    term: id,
    meaning: `meaning of ${id}`,
    sectionId: opts.section ?? null,
    tags: opts.tags ?? [],
    important: opts.important ?? false,
    createdAt: new Date(now),
  } as unknown as Card;
  const state =
    opts.state === undefined
      ? null
      : ({ state: opts.state, due: new Date(now + (opts.due ?? 0) * day) } as unknown as CardState);
  return { card, state };
}

const rows = [
  row("dueNow", { section: "s5", state: 1, due: -0.1, tags: ["food", "Verbs"], important: true }),
  row("dueLaterToday", { section: "s5", state: 2, due: 0.3, tags: ["verbs"] }),
  row("dueInFive", { section: "s4", state: 2, due: 5 }),
  row("fresh", { section: null, state: 0 }),
];
const section = (id: string) => ({ id, name: id }) as Section;
const sections = [section("s4"), section("s5")];
const ctx: FilterContext = { rows, sections, now };
const keys = (list: { field: { key: string } }[]) => list.map((f) => f.field.key);

describe("availableFields", () => {
  it("offers a field only when the deck has something to choose by", () => {
    expect(keys(availableFields(ctx))).toEqual(["state", "due", "section", "tags", "important"]);
    const plain = availableFields({ rows: rows.slice(2), sections: [], now });
    expect(keys(plain)).toEqual(["state", "due"]);
  });

  it("lists sections in order with No section last, and tags most used first by key", () => {
    const fields = availableFields(ctx);
    expect(fields.find((f) => f.field.key === "section")?.values).toEqual(["s4", "s5", ""]);
    expect(fields.find((f) => f.field.key === "tags")?.values).toEqual(["verbs", "food"]);
  });
});

describe("toggleValue", () => {
  it("adds to a many-valued field, replaces in a one-valued field, and clears a flag", () => {
    let f = toggleValue(noFilters, "state", "new", true);
    f = toggleValue(f, "state", "known", true);
    expect(f.states).toEqual(["new", "known"]);
    f = toggleValue(f, "due", "today", true);
    f = toggleValue(f, "due", "week", true);
    expect(f.due).toBe("week");
    f = toggleValue(f, "important", ON, true);
    expect(f.important).toBe(true);
    f = toggleValue(f, "important", ON, false);
    f = toggleValue(f, "due", "week", false);
    f = toggleValue(f, "state", "new", false);
    expect(f).toEqual({ ...noFilters, states: ["known"] });
  });

  it("reports the fields that are on in menu order, whatever order they were chosen in", () => {
    let f: DeckFilters = toggleValue(noFilters, "tags", "food", true);
    f = toggleValue(f, "state", "new", true);
    expect(activeFields(f).map((a) => [a.field.key, a.values])).toEqual([
      ["state", ["new"]],
      ["tags", ["food"]],
    ]);
    expect(activeFields(noFilters)).toEqual([]);
  });
});

describe("keeps", () => {
  it("counts the cards one value would show with the other fields as they are", () => {
    expect(keeps(ctx, noFilters, "state", "known")).toBe(2);
    expect(keeps(ctx, noFilters, "tags", "verbs")).toBe(2);
    expect(keeps(ctx, noFilters, "important", ON)).toBe(1);
    const inS5: DeckFilters = { ...noFilters, sections: ["s5"] };
    expect(keeps(ctx, inS5, "state", "known")).toBe(1);
    // The field's own current values are replaced, not combined, so the count is for that value alone.
    const known: DeckFilters = { ...noFilters, states: ["known"] };
    expect(keeps(ctx, known, "state", "new")).toBe(1);
  });

  it("honours the list's search, so a count never promises a card the list hides", () => {
    expect(keeps({ ...ctx, query: "dueIn" }, noFilters, "state", "known")).toBe(1);
  });
});
