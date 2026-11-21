import { describe, expect, it } from "vitest";
import {
  CLIPS,
  clipId,
  dictionaryPair,
  MITMUS_ADJECTIVES,
  MITMUS_CHANGED,
  MITMUS_PASSAGE,
  MITMUS_SAME,
  MITMUS_SENTENCES,
  pluralSentence,
} from "../../../lib/learn/clips";
import { eachPairFirst } from "../../../lib/learn/quiz";
import { firstSentences, HEARD, litPlural, litSentence, TYPED, threeSentences } from "./Mitmus";

const recorded = CLIPS.mitmus ?? {};

describe("plural forms", () => {
  it("builds every plural on the second form", () => {
    for (const { second, many } of [...MITMUS_SAME, ...MITMUS_CHANGED])
      expect(many).toBe(`${second}d`);
  });

  it("says each sentence for one and for many", () => {
    const laps = MITMUS_SENTENCES[0];
    const kass = MITMUS_SENTENCES[5];
    expect([pluralSentence(laps, false), pluralSentence(laps, true)]).toEqual([
      "Laps loeb.",
      "Lapsed loevad.",
    ]);
    expect([pluralSentence(kass, false), pluralSentence(kass, true)]).toEqual([
      "Kass on kodus.",
      "Kassid on kodus.",
    ]);
  });

  it("lights the noun’s -d and the verb’s ending, never part of on", () => {
    const laps = MITMUS_SENTENCES[0];
    const kass = MITMUS_SENTENCES[5];
    expect(litSentence(laps, true).filter(([, lit]) => lit)).toEqual([
      ["d", true],
      ["vad", true],
    ]);
    expect(litSentence(laps, false).filter(([, lit]) => lit)).toEqual([["b", true]]);
    expect(litSentence(kass, false).filter(([, lit]) => lit)).toEqual([]);
    for (const row of MITMUS_SENTENCES)
      for (const more of [false, true])
        expect(
          litSentence(row, more)
            .map(([text]) => text)
            .join(""),
        ).toBe(pluralSentence(row, more));
  });

  it("lights the -d of each word in an adjective phrase", () => {
    expect(litPlural("suured majad")).toEqual([
      ["suure", false],
      ["d", true],
      [" maja", false],
      ["d", true],
    ]);
    for (const { many } of MITMUS_ADJECTIVES)
      expect(
        litPlural(many)
          .map(([text]) => text)
          .join(""),
      ).toBe(many);
  });
});

describe("plural quizzes", () => {
  it("asks both kinds of second form early in every run of “Type the plural”", () => {
    for (let run = 0; run < 200; run++) {
      const kinds = eachPairFirst(TYPED, TYPED[0])
        .slice(0, 2)
        .map((item) => item.pair[0]);
      expect(new Set(kinds)).toEqual(new Set(["vowel", "inside"]));
    }
  });

  it("hears every noun once in a run of “One or many?”", () => {
    for (let run = 0; run < 200; run++) {
      const nouns = eachPairFirst(HEARD, HEARD[0])
        .slice(0, 6)
        .map((item) => item.pair[0]);
      expect(new Set(nouns).size).toBe(6);
    }
  });

  it("puts the answer in every place, among options that change", () => {
    const row = MITMUS_SENTENCES[0];
    const answer = pluralSentence(row, true);
    const places = new Set<number>();
    const sets = new Set<string>();
    for (let run = 0; run < 300; run++) {
      const three = threeSentences(row);
      expect(new Set(three).size).toBe(3);
      expect(three).toContain(answer);
      places.add(three.indexOf(answer));
      sets.add([...three].sort().join("|"));
    }
    expect(places.size).toBe(3);
    expect(sets.size).toBeGreaterThan(1);
    const firstPlaces = new Set(HEARD.map((item, i) => firstSentences(i).indexOf(item.said)));
    expect(firstPlaces).toEqual(new Set([0, 1, 2]));
  });

  it("has a recording for everything the quizzes play", () => {
    for (const { said } of HEARD) expect(recorded[clipId(said)]).toBe(said);
    for (const noun of TYPED) {
      expect(recorded[clipId(dictionaryPair(noun))]).toBe(dictionaryPair(noun));
      expect(recorded[clipId(noun.many)]).toBe(noun.many);
    }
  });

  it("records the passage as one take", () => {
    expect(recorded["p-home"]).toEqual({ sentences: MITMUS_PASSAGE });
  });
});
