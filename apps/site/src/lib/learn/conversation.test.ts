import { describe, expect, it } from "vitest";
import {
  type ExamEvent,
  type ExamPlays,
  examReducer,
  numberTurns,
  speakerLanes,
  speakersOf,
  startExam,
} from "./conversation";

const turns = [
  { voice: "main", text: ["Tere!", "Kuidas läheb?"] },
  { voice: "third", text: "Hästi." },
  { voice: "main", text: "Tore!" },
] as const;

describe("speakers", () => {
  it("are named per sentence, in order", () => {
    expect(speakersOf(turns)).toEqual(["main", "main", "third", "main"]);
    expect(numberTurns(turns).map(({ first }) => first)).toEqual([0, 2, 3]);
  });

  it("get a lane each, in the order they first speak", () => {
    const lanes = speakerLanes(speakersOf(turns), { marks: [0, 1, 3, 4], duration: 5 });
    expect(lanes.map(({ voice }) => voice)).toEqual(["main", "third"]);
    expect(lanes[0]?.pieces).toEqual([
      { sentence: 0, start: 0, end: 1 },
      { sentence: 1, start: 1, end: 3 },
      { sentence: 3, start: 4, end: 5 },
    ]);
  });
});

describe("examReducer", () => {
  const run = (state: ExamPlays, ...events: ExamEvent[]) => events.reduce(examReducer, state);

  it("gives two whole plays and no third", () => {
    let state = run(startExam(2), { type: "started" });
    expect(state).toEqual({ status: "playing", left: 1 });
    state = run(state, { type: "ended" }, { type: "started" }, { type: "ended" });
    expect(state).toEqual({ status: "ready", left: 0 });
    expect(run(state, { type: "started" })).toBe(state);
  });

  it("does not start a second play while one plays", () => {
    const playing = run(startExam(2), { type: "started" });
    expect(run(playing, { type: "started" })).toBe(playing);
  });

  it("carries on a play that was cut without spending another", () => {
    const cut = run(startExam(2), { type: "started" }, { type: "cut", at: 12.4 });
    expect(cut).toEqual({ status: "cut", left: 1, at: 12.4 });
    expect(run(cut, { type: "started" })).toEqual({ status: "playing", left: 1 });
  });

  it("gives back a play nothing was heard of", () => {
    expect(run(startExam(1), { type: "started" }, { type: "cut", at: 0 })).toEqual(startExam(1));
  });

  it("ignores a play that ends after a restart", () => {
    const fresh = run(startExam(2), { type: "started" }, { type: "restarted", plays: 2 });
    expect(fresh).toEqual(startExam(2));
    expect(run(fresh, { type: "cut", at: 3 })).toBe(fresh);
    expect(run(fresh, { type: "ended" })).toBe(fresh);
  });
});
