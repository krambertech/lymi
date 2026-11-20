import { describe, expect, it } from "vitest";
import { eachPairFirst } from "../../../lib/learn/quiz";
import { heardPair, SENTENCES, threeEndings } from "./Olevik";

describe("present-tense quizzes", () => {
  it("asks every ending once in a six-round run of sentences", () => {
    const items = SENTENCES.map((sentence) => ({ sentence, pair: heardPair(sentence) }));
    for (let run = 0; run < 200; run++) {
      const six = eachPairFirst(items, items[0]).slice(0, 6);
      expect(new Set(six.map((item) => item.sentence.ending)).size).toBe(6);
      const said = six.map((item) => item.sentence.id);
      expect(said.filter((id) => id.endsWith("tallinnas"))).toHaveLength(
        said.some((id) => id.endsWith("tallinnas")) ? 1 : 0,
      );
    }
  });

  it("offers the answer and two other endings, in no fixed place", () => {
    const places = new Set<number>();
    for (let run = 0; run < 200; run++) {
      const three = threeEndings("vad");
      expect(three).toHaveLength(3);
      expect(new Set(three).size).toBe(3);
      expect(three).toContain("vad");
      places.add(three.indexOf("vad"));
    }
    expect(places.size).toBe(3);
  });
});
