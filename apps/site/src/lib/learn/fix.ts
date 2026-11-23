import { answerTokens, markAnswer, singleChange, type MarkedAnswer } from "./answers";
import { type MarkedItem, realForms } from "./sentences";

export type FixState =
  | { status: "finding"; at: number; tried: readonly number[] }
  | { status: "fixing"; at: number; tried: readonly number[] };

export type FixEvent = { type: "tapped"; word: number };

export function startFix(at: number): FixState {
  return { status: "finding", at, tried: [] };
}

export function fixReducer(state: FixState, event: FixEvent): FixState {
  switch (event.type) {
    case "tapped":
      if (state.status === "fixing" || state.tried.includes(event.word)) return state;
      return event.word === state.at
        ? { ...state, status: "fixing" }
        : { ...state, tried: [...state.tried, event.word] };
  }
}

export const foundFirst = (state: FixState): boolean => state.tried.length === 0;

export interface Fixing {
  at: number;
  words: readonly string[];
  forms: readonly string[];
}

export function fixing(item: MarkedItem & { wrong: string }): Fixing {
  const changes = item.answers.map((answer) => singleChange(item.wrong, answer));
  return {
    at: changes.find((change) => change !== null)?.at ?? 0,
    words: answerTokens(item.wrong),
    forms: changes.flatMap((change) => (change ? [change.right] : [])),
  };
}

export const markFix = (item: MarkedItem & { wrong: string }, typed: string): MarkedAnswer =>
  markAnswer(typed, fixing(item).forms, realForms(item));
