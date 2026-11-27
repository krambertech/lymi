import { describe, expect, it } from "vitest";
import {
  drawDrill,
  dueIds,
  EMPTY_REVIEW,
  forgetRemoved,
  GAPS,
  interleave,
  isDue,
  localDay,
  MOST_ENTRIES,
  nextDueDay,
  RESTED,
  type Review,
  REVIEW_KEY,
  reviewStore,
  recordAnswer,
  saveAnswer,
  saveRemoved,
  hasLessonItems,
  scheduleNew,
  warmUpIds,
} from "./review";

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

const ID = "osastav/kaks-raamat";
const TODAY = 20_000;
const LESSONS = new Set(["osastav", "pood-poe"]);
const entry = (step: number, due: number | null, last: number) => ({ step, due, last });

describe("the review schedule", () => {
  it("spaces right answers out by the gaps, then rests", () => {
    let review = EMPTY_REVIEW;
    let day = TODAY;
    for (const gap of GAPS) {
      review = recordAnswer(review, ID, true, day);
      expect(review.items[ID]?.due).toBe(day + gap);
      day += gap;
    }
    review = recordAnswer(review, ID, true, day);
    expect(review.items[ID]).toEqual(entry(RESTED, null, day));
    expect(isDue(review.items[ID], day + 1000)).toBe(false);
  });

  it("brings a miss back the next day from any step", () => {
    for (const step of [0, 1, 2, 3, 4]) {
      const before: Review = { items: { [ID]: entry(step, TODAY, TODAY - 1) } };
      expect(recordAnswer(before, ID, false, TODAY).items[ID]).toEqual(entry(0, TODAY + 1, TODAY));
    }
    const rested: Review = { items: { [ID]: entry(RESTED, null, TODAY - 30) } };
    expect(recordAnswer(rested, ID, false, TODAY).items[ID]?.due).toBe(TODAY + 1);
  });

  it("doesn't move an item up for a right answer before its day", () => {
    const early: Review = { items: { [ID]: entry(2, TODAY + 2, TODAY - 1) } };
    expect(recordAnswer(early, ID, true, TODAY).items[ID]).toEqual(entry(2, TODAY + 2, TODAY));
    const missed = recordAnswer(EMPTY_REVIEW, ID, false, TODAY);
    expect(recordAnswer(missed, ID, true, TODAY).items[ID]?.due).toBe(TODAY + 1);
  });

  it("counts days by the visitor's own midnight", () => {
    const late = new Date(2026, 10, 23, 23, 59);
    const early = new Date(2026, 10, 24, 0, 1);
    expect(localDay(early) - localDay(late)).toBe(1);
    expect(localDay(new Date(2026, 10, 23, 0, 1))).toBe(localDay(late));
  });

  it("treats an answer dated in the future, after a wrong clock, as due", () => {
    expect(isDue(entry(1, TODAY + 400, TODAY + 399), TODAY)).toBe(true);
  });
});

describe("the review store", () => {
  it("keeps answers across reads and forgets removed items of one lesson only", () => {
    const storage = memoryStorage();
    saveAnswer(ID, false, TODAY, storage);
    saveAnswer("osastav/gone", true, TODAY, storage);
    saveAnswer("pood-poe/where-pood", true, TODAY, storage);
    saveRemoved("osastav", new Set([ID]), storage);
    expect(Object.keys(reviewStore.read(storage).items).sort()).toEqual([
      ID,
      "pood-poe/where-pood",
    ]);
  });

  it("keeps only well-formed entries and drops the rest", () => {
    const storage = memoryStorage();
    storage.setItem(
      REVIEW_KEY,
      JSON.stringify({
        v: 1,
        items: {
          [ID]: entry(1, TODAY, TODAY - 1),
          "osastav/rested": { step: RESTED, due: 5, last: TODAY },
          "osastav/step": entry(99, TODAY, TODAY),
          "osastav/due": { step: 1, due: "soon", last: TODAY },
          "osastav/none": null,
          "no-lesson": entry(1, TODAY, TODAY),
          "__proto__/x": entry(1, TODAY, TODAY),
        },
      }),
    );
    expect(reviewStore.read(storage).items).toEqual({
      [ID]: entry(1, TODAY, TODAY - 1),
      "osastav/rested": entry(RESTED, null, TODAY),
    });
  });

  it.each([
    "{not json",
    "null",
    "[]",
    JSON.stringify({ v: 2, items: { [ID]: entry(1, 1, 1) } }),
    JSON.stringify({ v: 1, items: [] }),
  ])("reads %s as no review", (stored) => {
    const storage = memoryStorage();
    storage.setItem(REVIEW_KEY, stored);
    expect(reviewStore.read(storage)).toEqual(EMPTY_REVIEW);
  });

  it("works in memory when writing fails", async () => {
    const { saveAnswer: save, currentReview } = await import("./review");
    const full = {
      ...memoryStorage(),
      setItem: () => {
        throw new Error("full");
      },
    };
    expect(() => save(ID, false, TODAY, full)).not.toThrow();
    expect(currentReview().items[ID]).toEqual(entry(0, TODAY + 1, TODAY));
  });

  it("stays bounded, giving up rested items first and then the longest unseen", () => {
    const items = Object.fromEntries(
      Array.from({ length: MOST_ENTRIES }, (_, i) => [
        `osastav/i-${i}`,
        i === 5 ? entry(RESTED, null, TODAY) : entry(1, TODAY + 1, 100 + i),
      ]),
    );
    const once = recordAnswer({ items }, ID, true, TODAY);
    expect(Object.keys(once.items)).toHaveLength(MOST_ENTRIES);
    expect(once.items["osastav/i-5"]).toBeUndefined();
    const twice = recordAnswer(once, "osastav/another", true, TODAY);
    expect(twice.items["osastav/i-0"]).toBeUndefined();
    expect(twice.items[ID]).toBeDefined();
  });
});

describe("what comes back", () => {
  const review: Review = {
    items: {
      "osastav/later": entry(3, TODAY + 4, TODAY - 3),
      "osastav/overdue": entry(2, TODAY - 5, TODAY - 8),
      "osastav/missed": entry(0, TODAY, TODAY - 1),
      "osastav/today": entry(1, TODAY + 1, TODAY),
      "osastav/rested": entry(RESTED, null, TODAY - 40),
      "pood-poe/due": entry(1, TODAY, TODAY - 1),
      "kell/due": entry(0, TODAY, TODAY - 1),
    },
  };

  it("lists what is due in the lessons asked for, misses first", () => {
    expect(dueIds(review, TODAY, LESSONS)).toEqual([
      "osastav/missed",
      "pood-poe/due",
      "osastav/overdue",
    ]);
    expect(dueIds(review, TODAY, new Set(["pood-poe"]))).toEqual(["pood-poe/due"]);
  });

  it("warms up on what is due, then the oldest, never on what was answered today", () => {
    expect(warmUpIds(review, TODAY, LESSONS)).toEqual([
      "osastav/missed",
      "pood-poe/due",
      "osastav/overdue",
      "osastav/rested",
      "osastav/later",
    ]);
    expect(warmUpIds(EMPTY_REVIEW, TODAY, LESSONS)).toEqual([]);
    expect(warmUpIds(recordAnswer(EMPTY_REVIEW, ID, false, TODAY), TODAY, LESSONS)).toEqual([]);
  });

  it("names the next day something is due", () => {
    expect(nextDueDay(review, TODAY, LESSONS)).toBe(TODAY + 1);
    expect(nextDueDay(EMPTY_REVIEW, TODAY, LESSONS)).toBeNull();
  });

  it("returns the same review when no item was removed", () => {
    const ids = new Set(Object.keys(review.items));
    expect(forgetRemoved(review, "osastav", ids)).toBe(review);
  });
});

describe("a drill's set", () => {
  const items = Array.from({ length: 24 }, (_, i) => ({
    id: `osastav/i-${i}`,
    rule: `osastav/r-${i % 3}`,
  }));

  it("takes due items first, then new ones, then the longest unseen", () => {
    const seen = Object.fromEntries(
      items
        .slice(0, 20)
        .map(({ id }, i) => [
          id,
          i < 3 ? entry(0, TODAY, TODAY - 1) : entry(2, TODAY + 3, TODAY - i),
        ]),
    );
    const ids = new Set(drawDrill(items, { items: seen }, TODAY).map(({ id }) => id));
    expect(ids.size).toBe(10);
    for (const i of [0, 1, 2, 20, 21, 22, 23, 19, 18, 17]) expect(ids).toContain(`osastav/i-${i}`);
  });

  it.each([true, false])("meets the whole bank in three sets, answers right: %s", (right) => {
    let review = EMPTY_REVIEW;
    const met = new Set<string>();
    for (let set = 0; set < 3; set++)
      for (const { id } of drawDrill(items, review, TODAY)) {
        met.add(id);
        review = recordAnswer(review, id, right, TODAY);
      }
    expect(met.size).toBe(24);
  });

  it("never puts one rule twice in a row when another order avoids it", () => {
    for (let run = 0; run < 300; run++) {
      const sizes = [1, 2, 3].map(() => Math.floor(Math.random() * 7));
      const mixed = sizes.flatMap((size, rule) =>
        Array.from({ length: size }, (_, i) => ({ id: `${rule}-${i}`, rule: String(rule) })),
      );
      const order = interleave(mixed.sort(() => Math.random() - 0.5));
      expect(order).toHaveLength(mixed.length);
      const most = Math.max(...sizes);
      const repeats = order.filter((each, i) => each.rule === order[i - 1]?.rule).length;
      expect(repeats).toBe(Math.max(0, most - (mixed.length - most) - 1));
    }
  });
});

describe("scheduleNew", () => {
  it("puts unanswered questions in review for tomorrow and leaves answered ones as they are", () => {
    const answered = recordAnswer(EMPTY_REVIEW, "osastav/a", true, 100);
    const review = scheduleNew(answered, ["osastav/a", "osastav/b"], 100);
    expect(review.items["osastav/a"]).toEqual(answered.items["osastav/a"]);
    expect(review.items["osastav/b"]).toEqual({ step: 0, due: 101, last: 100 });
    expect(dueIds(review, 100, new Set(["osastav"]))).toEqual([]);
    expect(dueIds(review, 101, new Set(["osastav"]))).toContain("osastav/b");
  });
});

describe("hasLessonItems", () => {
  it("says whether any of a lesson's questions are in review", () => {
    const review = scheduleNew(EMPTY_REVIEW, ["osastav/a"], 100);
    expect(hasLessonItems(review, "osastav")).toBe(true);
    expect(hasLessonItems(review, "mitmus")).toBe(false);
  });
});
