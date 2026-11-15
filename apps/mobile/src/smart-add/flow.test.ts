import { describe, expect, it } from "vitest";
import { flow, START } from "./flow";

describe("Smart add's steps", () => {
  it("stays on the lesson when Back is pressed while Show terms is still asking", () => {
    let state = flow(START, { type: "go", step: "questions" });
    state = flow(state, { type: "show", attempt: 1 });
    expect(state).toEqual({ step: "questions", showing: 1 });
    state = flow(state, { type: "go", step: "input" });
    state = flow(state, { type: "settled", attempt: 1, step: "list" });
    expect(state).toEqual({ step: "input" });
  });

  it("moves to the list when Show terms answers", () => {
    let state = flow({ step: "questions", showing: null }, { type: "show", attempt: 2 });
    state = flow(state, { type: "show", attempt: 3 });
    expect(state).toEqual({ step: "questions", showing: 2 });
    expect(flow(state, { type: "settled", attempt: 2, step: "list" })).toEqual({ step: "list" });
  });

  it("lets only the latest read move the screen", () => {
    let state = flow(START, { type: "read", attempt: 1 });
    state = flow(state, { type: "go", step: "input" });
    state = flow(state, { type: "read", attempt: 2 });
    expect(flow(state, { type: "settled", attempt: 1, step: "list" })).toBe(state);
    expect(flow(state, { type: "settled", attempt: 2, step: "questions" })).toEqual({
      step: "questions",
      showing: null,
    });
  });

  it("keeps a failed Show terms on the questions", () => {
    const state = flow({ step: "questions", showing: null }, { type: "show", attempt: 4 });
    expect(flow(state, { type: "settled", attempt: 4, step: "questions" })).toEqual({
      step: "questions",
      showing: null,
    });
  });
});
