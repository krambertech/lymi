/**
 * Smart add's steps. Every read starts a new attempt, and the late answers of a read (the beat
 * after the scan, a checked answer) name theirs, so one the learner has stopped or gone back from
 * changes nothing.
 */
export type SmartAddFlow =
  | { step: "input" }
  | { step: "reading"; attempt: number; finished: boolean }
  | { step: "questions"; attempt: number }
  /** `asked`: the read had questions, so Back returns to them. */
  | { step: "list"; attempt: number; asked: boolean; ownDrops: ReadonlySet<string> };

export type SmartAddEvent =
  | { type: "read"; attempt: number }
  | { type: "finish"; attempt: number }
  /** The beat on the finished scan is over. */
  | { type: "advance"; attempt: number; asked: boolean }
  | { type: "stop" }
  | { type: "fail"; attempt: number }
  /** The learner's own answers were checked; these terms go. */
  | { type: "checked"; attempt: number; ownDrops: ReadonlySet<string> }
  | { type: "back" };

const NONE: ReadonlySet<string> = new Set();

export function smartAddFlow(state: SmartAddFlow, event: SmartAddEvent): SmartAddFlow {
  const owns = state.step !== "input" && "attempt" in event && state.attempt === event.attempt;
  switch (event.type) {
    case "read":
      return state.step === "input"
        ? { step: "reading", attempt: event.attempt, finished: false }
        : state;
    case "finish":
      return owns && state.step === "reading" ? { ...state, finished: true } : state;
    case "advance":
      if (!owns || state.step !== "reading" || !state.finished) return state;
      return event.asked
        ? { step: "questions", attempt: event.attempt }
        : { step: "list", attempt: event.attempt, asked: false, ownDrops: NONE };
    case "stop":
      return state.step === "reading" ? { step: "input" } : state;
    case "fail":
      return owns && state.step === "reading" ? { step: "input" } : state;
    case "checked":
      return owns && state.step === "questions"
        ? { step: "list", attempt: event.attempt, asked: true, ownDrops: event.ownDrops }
        : state;
    case "back":
      if (state.step === "questions") return { step: "input" };
      if (state.step === "list")
        return state.asked ? { step: "questions", attempt: state.attempt } : { step: "input" };
      return state;
  }
}
