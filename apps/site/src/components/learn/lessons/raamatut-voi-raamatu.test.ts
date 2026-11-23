import { describe, expect, it } from "vitest";
import { OBJECT_FORM_QUIZ, OBJECT_HEARD, OBJECT_REWRITE } from "../../../lib/learn/clips";
import { eachPairFirst } from "../../../lib/learn/quiz";
import { heardRun, litObject, objectOf } from "./RaamatutVoiRaamatu";

const covers = <T extends { pair: readonly [string, string] }>(
  items: readonly T[],
  rounds: number,
) => {
  const keys = new Set(items.map((item) => item.pair[0]));
  for (let run = 0; run < 300; run++) {
    const asked = eachPairFirst(items, run % 2 ? items[run % items.length] : undefined).slice(
      0,
      rounds,
    );
    expect(new Set(asked.map((item) => item.pair[0]))).toEqual(keys);
  }
};

describe("object lesson", () => {
  it("asks each kind of action in “Done, going on, or still to come?”", () => {
    const items = OBJECT_HEARD.flatMap((group) =>
      (["part", "whole", "will"] as const).map((kind) => ({
        pair: [kind, group[kind]] as const,
        options: [0, 1, 2],
      })),
    );
    covers(items, 6);
  });

  it("puts the answer of “Done, going on, or still to come?” in every place after the first round", () => {
    const items = OBJECT_HEARD.flatMap((group) =>
      (["part", "whole", "will"] as const).map((kind) => ({
        pair: [kind, group[kind]] as const,
        answer: kind,
        options: ["part", "whole", "will"],
      })),
    );
    const places = new Set<number>();
    for (let run = 0; run < 200; run++)
      for (const item of heardRun(items, items[0], (each) => ({
        ...each,
        options: [...each.options].sort(() => Math.random() - 0.5),
      })).slice(1, 6))
        places.add(item.options.indexOf(item.answer));
    expect(places).toEqual(new Set([0, 1, 2]));
  });

  it("asks every noun of “Type the object” within its eight rounds", () => {
    covers(
      OBJECT_FORM_QUIZ.map((item) => ({ pair: [item.noun, item.said] as const })),
      8,
    );
  });

  it("asks both a do and a don’t in “Tell a friend”", () => {
    covers(
      OBJECT_REWRITE.map((item) => ({ pair: [item.not ? "not" : "do", item.to] as const })),
      6,
    );
  });

  it("lights the object and what follows it", () => {
    expect(litObject("Ma ostsin leiba.", objectOf("Ma ostsin leiba."))).toBe("Ma ostsin |leiba");
    expect(objectOf("Ma lugesin raamatu läbi.")).toBe("raamatu");
    expect(litObject("Ma lugesin raamatu läbi.", "raamatu")).toBe("Ma lugesin |raamatu läbi");
    expect(objectOf("Ära osta piletit!")).toBe("piletit");
    expect(objectOf("Söö supp ära!")).toBe("supp");
  });
});
