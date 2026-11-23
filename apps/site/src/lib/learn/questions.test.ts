import { describe, expect, it } from "vitest";
import {
  markedItems,
  type PassageQuestion,
  questionsReducer,
  type QuestionsState,
  startQuestions,
} from "./questions";

const options = [
  { id: "a", label: "A" },
  { id: "b", label: "B" },
];
const pick: PassageQuestion = { id: "p", ask: "?", options, answer: "b", line: 4 };
const match: PassageQuestion = {
  id: "m",
  kind: "match",
  ask: "?",
  options,
  statements: [
    { id: "s1", label: "1", answer: "a", line: 2 },
    { id: "s2", label: "2", answer: "b", line: 7 },
  ],
};

describe("markedItems", () => {
  it("marks a question without a kind as a pick", () => {
    const [item] = markedItems(pick);
    expect(item).toMatchObject({ key: "p", line: 4 });
    expect([item?.right("b"), item?.right("a"), item?.right(undefined)]).toEqual([
      true,
      false,
      false,
    ]);
  });

  it("marks true or false against its statement", () => {
    const [item] = markedItems({ id: "t", kind: "truefalse", ask: "?", answer: false, line: 0 });
    expect([item?.right("false"), item?.right("true")]).toEqual([true, false]);
  });

  it("takes any accepted short answer, whatever its case, spaces and full stop", () => {
    const [item] = markedItems({
      id: "s",
      kind: "short",
      ask: "?",
      answers: ["kell viis", "viis"],
      line: 0,
    });
    for (const typed of ["Kell  viis.", "VIIS", " viis "]) expect(item?.right(typed)).toBe(true);
    for (const typed of ["", "viie", undefined]) expect(item?.right(typed)).toBe(false);
  });

  it("marks each statement of a match, with the sentence behind it", () => {
    const items = markedItems(match);
    expect(items.map(({ key, line }) => [key, line])).toEqual([
      ["m/s1", 2],
      ["m/s2", 7],
    ]);
    expect(items.map((item) => item.right("a"))).toEqual([true, false]);
  });
});

describe("questionsReducer", () => {
  const keys = ["p", "m/s1"];
  const check = { type: "checked", keys, unanswered: "Answer first." } as const;
  const answer = (state: QuestionsState, key: string, value: string) =>
    questionsReducer(state, { type: "answered", key, value });

  it("checks only once everything has an answer, and a blank is none", () => {
    let state = answer(startQuestions, "p", "a");
    state = answer(state, "m/s1", "  ");
    state = questionsReducer(state, check);
    expect(state).toMatchObject({ status: "answering", note: "Answer first." });
    state = questionsReducer(answer(state, "m/s1", "b"), check);
    expect(state).toEqual({ status: "checked", given: { p: "a", "m/s1": "b" } });
  });

  it("keeps the last answer given and clears the note with it", () => {
    let state = questionsReducer(startQuestions, { type: "held", note: "Listen first." });
    expect(state).toMatchObject({ note: "Listen first." });
    state = answer(answer(state, "p", "a"), "p", "b");
    expect(state).toEqual({ status: "answering", given: { p: "b" }, note: null });
  });

  it("changes nothing once checked until it starts again", () => {
    const checked: QuestionsState = { status: "checked", given: { p: "a" } };
    expect(answer(checked, "p", "b")).toBe(checked);
    expect(questionsReducer(checked, check)).toBe(checked);
    expect(questionsReducer(checked, { type: "held", note: "!" })).toBe(checked);
    expect(questionsReducer(checked, { type: "restarted" })).toBe(startQuestions);
  });
});
