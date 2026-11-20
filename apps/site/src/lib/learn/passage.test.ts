import { describe, expect, it } from "vitest";
import {
  glossPieces,
  nextReply,
  pickReply,
  placeWord,
  replyResults,
  sayReply,
  sentenceAt,
  sentenceBars,
  startDialogue,
  type Turn,
  wordsLeft,
} from "./passage";

describe("sentenceBars", () => {
  const timing = { marks: [0, 1, 3], duration: 4 };
  // One 12 ms step per bar of loudness, starting 0.1 s in.
  const sound = { lead: 0.1, bars: Array.from({ length: 300 }, (_, i) => (i === 100 ? 1 : 0.2)) };

  it("gives each sentence room for its share of the time", () => {
    const groups = sentenceBars(sound, timing, 212);
    expect(groups.map((g) => [g.start, g.end])).toEqual([
      [0, 1],
      [1, 3],
      [3, 4],
    ]);
    // 212 px less two 6 px gaps leaves 200 px: 40 bars of 5 px, shared 1 : 2 : 1.
    expect(groups.map((g) => g.bars.length)).toEqual([10, 20, 10]);
  });

  it("keeps the loudest step under each bar, so a short peak isn't averaged away", () => {
    const [, second] = sentenceBars(sound, timing, 212);
    // Step 100 is at 0.1 + 1.2 = 1.3 s, in the second sentence's second bar (1.1 to 1.2 s is the first).
    expect(Math.max(...(second?.bars ?? []))).toBe(1);
  });

  it("draws at least three bars for a sentence however narrow", () => {
    expect(sentenceBars(sound, timing, 0).every((g) => g.bars.length === 3)).toBe(true);
  });
});

describe("sentenceAt", () => {
  it("finds the sentence playing, counting a moment early as its start", () => {
    expect(sentenceAt([0, 2, 4], 0)).toBe(0);
    expect(sentenceAt([0, 2, 4], 1.97)).toBe(1);
    expect(sentenceAt([0, 2, 4], 9)).toBe(2);
  });
});

describe("glossPieces", () => {
  const known = new Set(["õpetaja", "vend"]);
  it("splits out the words the glossary knows, in any case, keeping punctuation in the text", () => {
    expect(glossPieces("Ma olen õpetaja. Minu Vend!", (w) => known.has(w))).toEqual([
      { text: "Ma olen " },
      { word: "õpetaja" },
      { text: ". Minu " },
      { word: "Vend" },
      { text: "!" },
    ]);
  });
  it("leaves text without known words whole", () => {
    expect(glossPieces("Tere!", () => false)).toEqual([{ text: "Tere!" }]);
  });
});

describe("placeWord", () => {
  it("puts a bank word in a gap, sending the gap's word back", () => {
    expect(placeWord({ g1: "on" }, "olen", "bank", "g1")).toEqual({ g1: "olen" });
  });
  it("moves a word between gaps and swaps with a filled one", () => {
    expect(placeWord({ g1: "olen" }, "olen", "g1", "g2")).toEqual({ g2: "olen" });
    expect(placeWord({ g1: "olen", g2: "on" }, "olen", "g1", "g2")).toEqual({
      g1: "on",
      g2: "olen",
    });
  });
  it("sends a word back to the bank, and leaves it where it was when dropped on its own gap", () => {
    expect(placeWord({ g1: "olen" }, "olen", "g1", null)).toEqual({});
    expect(placeWord({ g1: "olen" }, "olen", "g1", "g1")).toEqual({ g1: "olen" });
  });
});

describe("wordsLeft", () => {
  it("takes placed words out of the bank once each", () => {
    expect(wordsLeft(["on", "olen", "on"], { g1: "on" })).toEqual(["olen", "on"]);
  });
});

describe("dialogue", () => {
  const turns: Turn<string>[] = [
    { who: "them", clip: "a", line: "Tere!" },
    {
      who: "you",
      clip: "b",
      replies: [{ line: "Sina oled Jaan." }, { line: "Mina olen Jaan.", right: true }],
    },
    { who: "them", clip: "c", line: "Väga meeldiv!" },
    {
      who: "you",
      clip: "d",
      replies: [{ line: "Head aega!", right: true }, { line: "Tere hommikust!" }],
    },
  ];

  it("opens at the learner's first turn", () => {
    expect(startDialogue(turns)).toEqual({ shown: 1, picks: {} });
    expect(nextReply(turns, 2)).toBe(3);
    expect(nextReply(turns, 4)).toBe(4);
  });

  it("counts only the first pick, then runs on once the reply is said", () => {
    let state = pickReply(startDialogue(turns), 0);
    state = pickReply(state, 1);
    expect(state.picks).toEqual({ 1: 0 });
    expect(replyResults(turns, state)).toEqual([false, undefined]);
    state = sayReply(turns, state);
    expect(state.shown).toBe(3);
    state = sayReply(turns, pickReply(state, 0));
    expect(state.shown).toBe(4);
    expect(replyResults(turns, state)).toEqual([false, true]);
  });

  it("doesn't run on before a reply is picked", () => {
    const state = startDialogue(turns);
    expect(sayReply(turns, state)).toBe(state);
  });
});
