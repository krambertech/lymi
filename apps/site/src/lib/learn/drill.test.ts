import { describe, expect, it } from "vitest";
import { seeded } from "./checks/giveaways";
import {
  type DrillRun,
  type DrillSession,
  drawOptions,
  drillReducer,
  endsWithThis,
  ruleScores,
  runQuizState,
  sessionReducer,
  settledCount,
  startRun,
} from "./drill";
import { interleave, type Ruled } from "./review";

const RETURNS = 3;

const bank = (size: number, rules: number): Ruled[] =>
  interleave(Array.from({ length: size }, (_, i) => ({ id: `i-${i}`, rule: `r-${i % rules}` })));

interface Asked {
  id: string;
  rule: string;
  right: boolean;
  onlyOneLeft: boolean;
  anotherRuleLeft: boolean;
}

function play(items: readonly Ruled[], isRight: (id: string) => boolean, repeats = true) {
  let run: DrillRun = startRun({ items, repeats });
  const asked: Asked[] = [];
  while (run.status !== "finished") {
    if (asked.length > 5000) throw new Error("the run never ended");
    run = drillReducer(run, { type: "heard" });
    const { id, rule } = (run as Extract<DrillRun, { status: "asking" }>).now;
    const right = isRight(id);
    const onlyOneLeft = run.queue.length === 0;
    const { queue, ready, turn } = run;
    const anotherRuleLeft = queue.some(
      (each) => each.rule !== rule && (ready[each.id] ?? 0) <= turn,
    );
    asked.push({ id, rule, right, onlyOneLeft, anotherRuleLeft });
    run = drillReducer(run, { type: "answered", picked: id, right });
    run = drillReducer(run, { type: "next" });
  }
  return { asked, run };
}

describe("a drill run", () => {
  it("asks each question once when every answer is right", () => {
    const items = bank(10, 3);
    const { asked, run } = play(items, () => true);
    expect(asked.map(({ id }) => id)).toEqual(items.map(({ id }) => id));
    expect(Object.values(run.first).every(Boolean)).toBe(true);
  });

  it("brings every miss back until it is right twice, never twice in a row unless alone, and ends", () => {
    for (let seed = 1; seed <= 400; seed++) {
      const random = seeded(seed);
      const items = bank(2 + (seed % 12), 1 + (seed % 4));
      const { asked } = play(items, () => random() > 0.35);
      for (const { id } of items) {
        const answers = asked.filter((each) => each.id === id).map(({ right }) => right);
        if (answers[0]) expect(answers).toEqual([true]);
        else {
          expect(answers.slice(-2)).toEqual([true, true]);
          expect(answers.length).toBeGreaterThanOrEqual(3);
        }
      }
      asked.forEach((each, i) => {
        const before = asked[i - 1];
        if (before?.id === each.id) expect(before.onlyOneLeft).toBe(true);
      });
    }
  });

  it("ends for a learner who misses everything the first three times", () => {
    const tries = new Map<string, number>();
    const { asked } = play(bank(10, 3), (id) => {
      tries.set(id, (tries.get(id) ?? 0) + 1);
      return (tries.get(id) ?? 0) > 3;
    });
    expect(asked).toHaveLength(50);
  });

  it("lets other questions come between a miss and its return", () => {
    let missed = false;
    const run = play(bank(10, 5), (id) => {
      if (id !== "i-0" || missed) return true;
      missed = true;
      return false;
    });
    const places = run.asked.flatMap(({ id }, i) => (id === "i-0" ? [i] : []));
    expect(places).toHaveLength(3);
    expect((places[1] ?? 0) - (places[0] ?? 0)).toBeGreaterThan(2);
  });

  it("keeps a miss three questions away when the other questions share a rule", () => {
    const items: Ruled[] = [
      { id: "a", rule: "one" },
      ...Array.from({ length: 6 }, (_, i) => ({ id: `b-${i}`, rule: "two" })),
    ];
    let missed = false;
    const { asked } = play(items, (id) => {
      if (id !== "a" || missed) return true;
      missed = true;
      return false;
    });
    const places = asked.flatMap(({ id }, i) => (id === "a" ? [i] : []));
    expect(places).toHaveLength(3);
    places.slice(1).forEach((place, i) => {
      expect(place - (places[i] ?? 0)).toBeGreaterThan(RETURNS);
    });
  });

  it("asks the same rule twice in a row only when no other rule is ready", () => {
    for (let seed = 1; seed <= 400; seed++) {
      const random = seeded(seed);
      const { asked } = play(bank(4 + (seed % 9), 2 + (seed % 4)), () => random() > 0.3);
      asked.forEach((each, i) => {
        const before = asked[i - 1];
        if (before?.rule === each.rule) expect(before.anotherRuleLeft).toBe(false);
      });
    }
  });

  it("asks each question once in a warm-up, missed or not", () => {
    expect(play(bank(5, 2), () => false, false).asked).toHaveLength(5);
  });

  it("finishes at once with nothing to ask", () => {
    expect(startRun({ items: [], repeats: true }).status).toBe("finished");
  });

  it("ignores events its state doesn't allow", () => {
    const start = startRun({ items: bank(3, 1), repeats: true });
    expect(drillReducer(start, { type: "next" })).toBe(start);
    expect(drillReducer(start, { type: "answered", picked: "x", right: true })).toBe(start);
    const heard = drillReducer(start, { type: "heard" });
    const answered = drillReducer(heard, { type: "answered", picked: "x", right: true });
    expect(drillReducer(answered, { type: "answered", picked: "y", right: false })).toBe(answered);
    expect(drillReducer(answered, { type: "heard" })).toBe(answered);
  });

  it("counts a question as settled once nothing is owed on it", () => {
    let run = drillReducer(startRun({ items: bank(2, 1), repeats: true }), { type: "heard" });
    run = drillReducer(run, { type: "answered", picked: "x", right: false });
    expect(settledCount(run)).toBe(0);
    expect(endsWithThis(run)).toBe(false);
    run = drillReducer(run, { type: "next" });
    run = drillReducer(run, { type: "answered", picked: "x", right: true });
    expect(settledCount(run)).toBe(1);
    if (run.status !== "finished") expect(runQuizState(run).status).toBe("answered");
  });

  it("scores each rule on first answers", () => {
    const first: Record<string, boolean> = { "i-0": true, "i-1": false, "i-2": true, "i-3": true };
    const items = [0, 1, 2, 3].map((i) => ({ id: `i-${i}`, rule: `r-${i % 2}` }));
    expect(ruleScores({ items, first })).toEqual([
      { rule: "r-0", right: 2, total: 2 },
      { rule: "r-1", right: 1, total: 2 },
    ]);
  });
});

describe("a drill session", () => {
  type Session = DrillSession<string, string>;
  const loaded = { type: "loaded", sources: ["a"], questions: ["q"] } as const;

  it("opens once its questions load, and closes with none", () => {
    const loading = sessionReducer<string, string>(
      { status: "idle", failed: false },
      { type: "asked" },
    );
    expect(sessionReducer<string, string>(loading, loaded).status).toBe("open");
    expect(sessionReducer<string, string>(loading, { ...loaded, questions: [] }).status).toBe(
      "closed",
    );
  });

  it("stays closed when its questions load after the learner left", () => {
    const closed: Session = { status: "closed" };
    expect(sessionReducer(closed, loaded)).toBe(closed);
  });

  it("offers another try after a failed load", () => {
    const failed = sessionReducer<string, string>({ status: "loading" }, { type: "failed" });
    expect(failed).toEqual({ status: "idle", failed: true });
    expect(sessionReducer(failed, { type: "asked" }).status).toBe("loading");
  });
});

describe("options", () => {
  it("offers the answer and at most two wrong ones, the answer in every place", () => {
    const places = new Set<number>();
    for (let seed = 1; seed < 100; seed++) {
      const random = seeded(seed);
      const mix = <T>(list: readonly T[]) => [...list].sort(() => random() - 0.5);
      const options = drawOptions({ answer: "poes", wrong: ["poodis", "poods", "pooes"] }, mix);
      expect(options).toHaveLength(3);
      places.add(options.indexOf("poes"));
    }
    expect(places).toEqual(new Set([0, 1, 2]));
  });

  it("always offers the likeliest slip when an item names one", () => {
    const mix = <T>(list: readonly T[]) => [...list].reverse();
    const item = { answer: "tuba", slip: "toa", wrong: ["turg", "laud", "pood"] };
    expect(drawOptions(item, mix)).toContain("toa");
    expect(drawOptions(item, mix)).toHaveLength(3);
  });
});
