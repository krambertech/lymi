import { describe, expect, it } from "vitest";
import { drawBalanced, drawPlacementStage, firstFailedStage, stagePassed } from "./placement";

const bank = (lesson: string, rules: number, per: number) =>
  Array.from({ length: rules * per }, (_, i) => ({
    lesson,
    rule: `${lesson}/r${i % rules}`,
    id: `${lesson}-${i}`,
  }));

const lessonOf = (q: { lesson: string }) => q.lesson;

describe("drawBalanced", () => {
  const pool = [
    ...bank("a", 6, 4),
    ...bank("b", 6, 4),
    ...bank("c", 6, 4),
    ...bank("d", 6, 4),
    ...bank("e", 6, 4),
    ...bank("f", 6, 4),
    ...bank("g", 6, 4),
    ...bank("h", 6, 4),
    ...bank("small", 3, 8),
  ];

  it("draws from every lesson when there are fewer lessons than questions", () => {
    for (let run = 0; run < 200; run += 1) {
      const drawn = drawBalanced(pool, 20, lessonOf);
      expect(drawn).toHaveLength(20);
      expect(new Set(drawn.map((q) => q.lesson)).size).toBe(9);
      expect(new Set(drawn.map((q) => q.id)).size).toBe(20);
    }
  });

  it("takes one question per lesson when the lessons outnumber the questions", () => {
    const drawn = drawPlacementStage(pool, lessonOf);
    expect(new Set(drawn.map((q) => q.lesson)).size).toBe(3);
  });

  it("returns every question when the pool is smaller than the count", () => {
    expect(drawBalanced(bank("a", 2, 2), 20, lessonOf)).toHaveLength(4);
  });
});

describe("placement scoring", () => {
  it("passes a stage at two of three", () => {
    expect(stagePassed({ right: 2, total: 3 })).toBe(true);
    expect(stagePassed({ right: 1, total: 3 })).toBe(false);
  });

  it("places the learner at the first stage they fail, whatever comes after", () => {
    const scores = [
      { right: 3, total: 3 },
      { right: 1, total: 3 },
      { right: 3, total: 3 },
    ];
    expect(firstFailedStage(scores)).toBe(1);
  });

  it("finds no failed stage when every stage passes", () => {
    expect(firstFailedStage([{ right: 2, total: 3 }, undefined])).toBeUndefined();
  });
});
