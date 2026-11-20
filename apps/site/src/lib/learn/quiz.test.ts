import { describe, expect, it } from "vitest";
import { normalizeTyped, quizReducer, rightCount, startQuiz, typedMatches } from "./quiz";

describe("quizReducer", () => {
  it("waits for the sound before it takes an answer", () => {
    const fresh = startQuiz(2);
    expect(quizReducer(fresh, { type: "answered", picked: "a", right: true })).toBe(fresh);
    const heard = quizReducer(fresh, { type: "heard" });
    expect(quizReducer(heard, { type: "answered", picked: "a", right: true })).toMatchObject({
      status: "answered",
      picked: "a",
      results: [true],
    });
  });

  it("takes one answer per round", () => {
    let state = quizReducer(startQuiz(2), { type: "heard" });
    state = quizReducer(state, { type: "answered", picked: "a", right: false });
    expect(quizReducer(state, { type: "answered", picked: "b", right: true })).toBe(state);
  });

  it("opens the next round already heard and finishes after the last", () => {
    let state = quizReducer(startQuiz(2), { type: "heard" });
    state = quizReducer(state, { type: "answered", picked: "a", right: true });
    state = quizReducer(state, { type: "next" });
    expect(state).toMatchObject({ status: "asking", round: 1, heard: true });
    state = quizReducer(state, { type: "answered", picked: "b", right: false });
    state = quizReducer(state, { type: "next" });
    expect(state).toEqual({ status: "finished", rounds: 2, results: [true, false] });
    expect(rightCount(state)).toBe(1);
  });

  it("ignores next before an answer and starts over on restart", () => {
    const fresh = startQuiz(3);
    expect(quizReducer(fresh, { type: "next" })).toBe(fresh);
    expect(
      quizReducer({ status: "finished", rounds: 3, results: [true] }, { type: "restarted" }),
    ).toEqual(fresh);
  });
});

describe("typedMatches", () => {
  it("reads spaces, a decimal comma and trailing zeros the way a learner means them", () => {
    expect(normalizeTyped("12 000")).toBe("12000");
    expect(typedMatches("3,50", ["3.50"])).toBe(true);
    expect(typedMatches("3.5", ["3.50"])).toBe(true);
    expect(typedMatches("007", ["7"])).toBe(true);
    expect(typedMatches("10", ["100"])).toBe(false);
    expect(typedMatches("  ", ["0"])).toBe(false);
    expect(typedMatches("0", ["0"])).toBe(true);
    expect(typedMatches("12,000", ["12000"])).toBe(true);
    expect(typedMatches("1.000", ["1000"])).toBe(true);
    expect(typedMatches("4,500", ["4500"])).toBe(true);
    expect(typedMatches("2,026", ["2026"])).toBe(true);
  });
});
