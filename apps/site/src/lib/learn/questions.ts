import type { ReactNode } from "react";
import { formMatches } from "./practice";

interface Asked {
  id: string;
  ask: ReactNode;
}

export interface QuestionOption {
  id: string;
  label: ReactNode;
}

export interface PickQuestion extends Asked {
  kind?: "pick";
  options: readonly QuestionOption[];
  answer: string;
  line: number;
}

export interface TrueFalseQuestion extends Asked {
  kind: "truefalse";
  answer: boolean;
  line: number;
}

export interface ShortQuestion extends Asked {
  kind: "short";
  answers: readonly string[];
  line: number;
}

export interface MatchStatement {
  id: string;
  label: ReactNode;
  answer: string;
  line: number;
}

export interface MatchQuestion extends Asked {
  kind: "match";
  options: readonly QuestionOption[];
  statements: readonly MatchStatement[];
}

export type PassageQuestion = PickQuestion | TrueFalseQuestion | ShortQuestion | MatchQuestion;

export type Given = Readonly<Record<string, string>>;

export interface MarkedItem {
  key: string;
  line: number;
  right: (given: string | undefined) => boolean;
}

export const statementKey = (question: MatchQuestion, statement: MatchStatement) =>
  `${question.id}/${statement.id}`;

export function markedItems(question: PassageQuestion): MarkedItem[] {
  const { id } = question;
  switch (question.kind) {
    case undefined:
    case "pick":
      return [{ key: id, line: question.line, right: (given) => given === question.answer }];
    case "truefalse":
      return [
        { key: id, line: question.line, right: (given) => given === String(question.answer) },
      ];
    case "short":
      return [
        {
          key: id,
          line: question.line,
          right: (given) => given !== undefined && formMatches(given, question.answers),
        },
      ];
    case "match":
      return question.statements.map((statement) => ({
        key: statementKey(question, statement),
        line: statement.line,
        right: (given) => given === statement.answer,
      }));
  }
}

export type QuestionsState =
  | { status: "answering"; given: Given; note: string | null }
  | { status: "checked"; given: Given };

export type QuestionsEvent =
  | { type: "answered"; key: string; value: string }
  | { type: "held"; note: string }
  | { type: "checked"; keys: readonly string[]; unanswered: string }
  | { type: "restarted" };

export const startQuestions: QuestionsState = { status: "answering", given: {}, note: null };

export function questionsReducer(state: QuestionsState, event: QuestionsEvent): QuestionsState {
  switch (event.type) {
    case "answered":
      if (state.status === "checked") return state;
      return { ...state, given: { ...state.given, [event.key]: event.value }, note: null };
    case "held":
      return state.status === "checked" ? state : { ...state, note: event.note };
    case "checked":
      if (state.status === "checked") return state;
      return event.keys.every((key) => state.given[key]?.trim())
        ? { status: "checked", given: state.given }
        : { ...state, note: event.unanswered };
    case "restarted":
      return startQuestions;
  }
}
