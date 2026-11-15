/**
 * Smart add's steps. A read or a Show terms belongs to the attempt that started it: once the
 * learner moves on by hand, its answer no longer moves the screen.
 */
export type Flow =
  | { step: "input" | "writing" | "list" }
  | { step: "reading"; attempt: number }
  | { step: "questions"; showing: number | null };

export type FlowEvent =
  /** The learner moved to a step by hand. */
  | { type: "go"; step: "input" | "writing" | "questions" | "list" }
  | { type: "read"; attempt: number }
  | { type: "show"; attempt: number }
  /** An attempt's answer, which moves the screen only while that attempt still holds it. */
  | { type: "settled"; attempt: number; step: "input" | "questions" | "list" };

export const START: Flow = { step: "input" };

const at = (step: "input" | "writing" | "questions" | "list"): Flow =>
  step === "questions" ? { step, showing: null } : { step };

export function flow(state: Flow, event: FlowEvent): Flow {
  switch (event.type) {
    case "go":
      return at(event.step);
    case "read":
      return { step: "reading", attempt: event.attempt };
    case "show":
      return state.step === "questions" && state.showing === null
        ? { step: "questions", showing: event.attempt }
        : state;
    case "settled": {
      const owns =
        (state.step === "reading" && state.attempt === event.attempt) ||
        (state.step === "questions" && state.showing === event.attempt);
      return owns ? at(event.step) : state;
    }
  }
}
