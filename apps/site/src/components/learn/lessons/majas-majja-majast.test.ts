import { describe, expect, it } from "vitest";
import { twoCycles } from "../../../lib/learn/quiz";
import { DIRECTIONS, HEARD, shuffledDirections } from "./MajasMajjaMajast";

const items = HEARD.map((each) => ({ ...each, pair: [each.direction, each.form] as const }));
const asked = (run: readonly (typeof items)[number][]) =>
  new Set(run.map((item) => item.direction));

describe("in, into and out of quiz", () => {
  it("asks kus, kuhu and kust in the first three rounds and again in the next three", () => {
    for (let run = 0; run < 300; run++) {
      const order = twoCycles(items, items[0]);
      expect(order[0]).toBe(items[0]);
      expect(asked(order.slice(0, 3))).toEqual(new Set(DIRECTIONS));
      expect(asked(order.slice(3, 6))).toEqual(new Set(DIRECTIONS));
      expect(new Set(order.slice(0, 6)).size).toBe(6);
    }
  });

  it("plays a bare place form, so the question can only come from its ending", () => {
    for (const { form, direction } of HEARD) {
      expect(form).not.toContain(" ");
      expect(form.endsWith({ kus: "s", kuhu: "sse", kust: "st" }[direction])).toBe(true);
    }
  });

  it("puts each question in every place across runs", () => {
    const places = new Map(DIRECTIONS.map((each) => [each, new Set<number>()]));
    for (let run = 0; run < 300; run++)
      for (const [i, each] of shuffledDirections().entries()) places.get(each)?.add(i);
    for (const seen of places.values()) expect(seen.size).toBe(3);
  });
});
