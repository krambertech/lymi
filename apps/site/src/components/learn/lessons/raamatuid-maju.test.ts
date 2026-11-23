import { describe, expect, it } from "vitest";
import { PLURAL_PART_FORMS, PLURAL_PART_GAPS } from "../../../lib/learn/clips";
import { gapRun } from "./RaamatuidMaju";

describe("plural partitive lesson", () => {
  const items = PLURAL_PART_GAPS.map((gap) => ({
    pair: [gap.id.split("-")[1] ?? "", gap.id] as const,
    answer: gap.answer as string,
    options: PLURAL_PART_FORMS[gap.noun] as readonly string[],
  }));

  it("asks a number, many and the ones you mean in the first three rounds", () => {
    for (let run = 0; run < 200; run++)
      expect(
        new Set(
          gapRun(items, items[0])
            .slice(0, 3)
            .map((item) => item.pair[0]),
        ),
      ).toEqual(new Set(["two", "many", "where"]));
  });

  it("puts the answer in every place after the first round", () => {
    const places = new Set<number>();
    for (let run = 0; run < 200; run++)
      for (const item of gapRun(items, items[0]).slice(1))
        places.add(item.options.indexOf(item.answer));
    expect(places).toEqual(new Set([0, 1, 2]));
  });
});
