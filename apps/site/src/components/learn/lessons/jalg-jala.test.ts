import { describe, expect, it } from "vitest";
import { GRADATION_FORM_QUIZ, GRADATION_KINDS } from "../../../lib/learn/clips";
import { eachPairFirst } from "../../../lib/learn/quiz";
import { gradeRun } from "./JalgJala";

describe("consonant gradation lesson", () => {
  it("asks every noun of “Type the form” in its nine rounds", () => {
    const items = GRADATION_FORM_QUIZ.map((item) => ({ pair: [item.word, item.said] as const }));
    const keys = new Set(items.map((item) => item.pair[0]));
    for (let run = 0; run < 200; run++)
      expect(
        new Set(
          eachPairFirst(items)
            .slice(0, 9)
            .map((item) => item.pair[0]),
        ),
      ).toEqual(keys);
  });

  it("puts “strong” and “weak” in both places after the first round of “Strong or weak?”", () => {
    const items = (["double", "soft", "gone", "blend"] as const)
      .flatMap((kind) => GRADATION_KINDS[kind].slice(0, 2))
      .flatMap((noun) =>
        (["weak", "strong"] as const).map((answer) => ({
          answer,
          pair: [noun.word, `${noun.word}-${answer}`] as const,
          options: ["strong", "weak"],
        })),
      );
    const places = new Set<number>();
    for (let run = 0; run < 200; run++)
      for (const item of gradeRun(items, items[0], (each) => ({
        ...each,
        options: Math.random() < 0.5 ? ["strong", "weak"] : ["weak", "strong"],
      })).slice(1, 8))
        places.add(item.options.indexOf(item.answer));
    expect(places).toEqual(new Set([0, 1]));
  });
});
