import { describe, expect, it } from "vitest";
import { twoCycles } from "../../../lib/learn/quiz";
import { DIRECTIONS, HEARD, shuffledDirections } from "./LaualLaualeLaualt";

const items = HEARD.map((each) => ({ ...each, pair: [each.direction, each.form] as const }));
const count = (run: readonly (typeof items)[number][], direction: string) =>
  run.filter((item) => item.direction === direction).length;

describe("on, onto and off quiz", () => {
  it("asks kus, kuhu and kust twice each in six rounds, the pinned round first", () => {
    for (let run = 0; run < 300; run++) {
      const order = twoCycles(items, items[0]).slice(0, 6);
      expect(order[0]).toBe(items[0]);
      for (const direction of DIRECTIONS) {
        expect(count(order.slice(0, 3), direction)).toBe(1);
        expect(count(order, direction)).toBe(2);
      }
      expect(new Set(order).size).toBe(6);
    }
  });

  it("opens on a form whose answer isn't in the first place", () => {
    expect(DIRECTIONS.indexOf(HEARD[0]?.direction ?? "kus")).toBeGreaterThan(0);
  });

  it("plays a bare place form, so the question can only come from its ending", () => {
    for (const { form, direction } of HEARD) {
      expect(form).not.toContain(" ");
      expect(form.endsWith({ kus: "l", kuhu: "le", kust: "lt" }[direction])).toBe(true);
    }
  });

  it("puts each question in every place across runs", () => {
    const places = new Map(DIRECTIONS.map((each) => [each, new Set<number>()]));
    for (let run = 0; run < 300; run++)
      for (const [i, each] of shuffledDirections().entries()) places.get(each)?.add(i);
    for (const seen of places.values()) expect(seen.size).toBe(3);
  });
});
