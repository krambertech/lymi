import { expect, test } from "vitest";
import { smartAddFlow } from "./smart-add-flow";

test("the beat after a stopped read moves nothing", () => {
  const reading = smartAddFlow({ step: "input" }, { type: "read", attempt: 1 });
  const finished = smartAddFlow(reading, { type: "finish", attempt: 1 });
  const stopped = smartAddFlow(finished, { type: "stop" });
  expect(smartAddFlow(stopped, { type: "advance", attempt: 1, asked: true })).toBe(stopped);
});

test("a check from an earlier read leaves a newer read's questions alone", () => {
  const questions = { step: "questions", attempt: 2 } as const;
  const checked = { type: "checked", attempt: 1, ownDrops: new Set(["t1"]) } as const;
  expect(smartAddFlow(questions, checked)).toBe(questions);
});

test("Back from the list returns to the questions only when the read asked some", () => {
  const list = { step: "list", attempt: 1, asked: true, ownDrops: new Set<string>() } as const;
  expect(smartAddFlow(list, { type: "back" })).toEqual({ step: "questions", attempt: 1 });
  expect(smartAddFlow({ ...list, asked: false }, { type: "back" })).toEqual({ step: "input" });
});
