import { describe, expect, it } from "vitest";
import {
  CLIPS,
  clipId,
  dictionaryPair,
  MITMUS_ADJECTIVES,
  MITMUS_CHANGED,
  MITMUS_SAME,
  MITMUS_SENTENCES,
  pluralSentence,
} from "../../../lib/learn/clips";
import { eachPairFirst } from "../../../lib/learn/quiz";
import { firstSentences, HEARD, litPlural, litSentence, TYPED, twoSentences } from "./Mitmus";

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
      expect(new Set(kinds)).toEqual(new Set(["vowel", "changed"]));
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

  it("offers the heard noun for one and many, the answer in either place", () => {
    const row = MITMUS_SENTENCES[0];
    const answer = pluralSentence(row, true);
    const places = new Set<number>();
    for (let run = 0; run < 200; run++) {
      const two = twoSentences(row);
      expect(new Set(two)).toEqual(new Set([pluralSentence(row, false), answer]));
      places.add(two.indexOf(answer));
    }
    expect(places).toEqual(new Set([0, 1]));
    const firstPlaces = HEARD.map((item, i) => firstSentences(i).indexOf(item.said));
    expect(new Set(firstPlaces)).toEqual(new Set([0, 1]));
    expect(firstPlaces[0]).toBe(1);
    expect(HEARD[0]?.said).not.toBe("Laps loeb.");
  });

  it("opens “Type the plural” on a noun other than the lesson’s example", () => {
    expect(TYPED[0]?.one).not.toBe("kass");
  });

  it("has a recording for everything the quizzes play", () => {
    for (const { said } of HEARD) expect(recorded[clipId(said)]).toBe(said);
    for (const noun of TYPED) {
      expect(recorded[clipId(dictionaryPair(noun))]).toBe(dictionaryPair(noun));
      expect(recorded[clipId(noun.many)]).toBe(noun.many);
    }
  });
});
