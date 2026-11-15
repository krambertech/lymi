import { describe, expect, it } from "vitest";
import { HELLO, welcome } from "./trail";

const at = (...trail: Parameters<typeof welcome>[0]["trail"]) =>
  ({ status: "answering", trail }) as const;

describe("Welcome's trail", () => {
  it("holds Back while the AI choice saves, then moves on from the step that asked", () => {
    let state = welcome(at("hello", "kind", "goal", "ai"), { type: "begin", job: "ai" });
    state = welcome(state, { type: "back" });
    state = welcome(state, { type: "end", to: "start" });
    expect(state).toEqual(at("hello", "kind", "goal", "ai", "start"));
  });

  it("takes one start at a time, so a second tap cannot make a second deck", () => {
    const working = welcome(at("hello", "start"), { type: "begin", job: "leave" });
    expect(welcome(working, { type: "begin", job: "leave" })).toBe(working);
    expect(welcome(working, { type: "next", to: "goal" })).toBe(working);
    expect(welcome(working, { type: "end", to: null })).toEqual(at("hello", "start"));
  });

  it("steps back, never past hello", () => {
    expect(welcome(HELLO, { type: "back" })).toBe(HELLO);
    expect(welcome(at("hello", "kind"), { type: "back" })).toEqual(HELLO);
  });
});
