export type Step = "hello" | "kind" | "language" | "goal" | "ai" | "start";

/**
 * Welcome's questions so far, and whether a save is under way. While one is, the trail holds still:
 * Back and Continue wait, so a save's answer always lands on the step that asked for it.
 */
export type Welcome =
  | { status: "answering"; trail: Step[] }
  /** `ai` saves the AI choice and moves on; `leave` makes a deck or saves the answers and ends Welcome. */
  | { status: "working"; trail: Step[]; job: "ai" | "leave" };

export type WelcomeEvent =
  | { type: "next"; to: Step }
  | { type: "back" }
  | { type: "begin"; job: "ai" | "leave" }
  | { type: "end"; to: Step | null };

export const HELLO: Welcome = { status: "answering", trail: ["hello"] };

export function welcome(state: Welcome, event: WelcomeEvent): Welcome {
  switch (state.status) {
    case "answering":
      return answering(state, event);
    case "working":
      if (event.type !== "end") return state;
      return {
        status: "answering",
        trail: event.to ? [...state.trail, event.to] : state.trail,
      };
  }
}

function answering(state: Welcome & { status: "answering" }, event: WelcomeEvent): Welcome {
  switch (event.type) {
    case "next":
      return { status: "answering", trail: [...state.trail, event.to] };
    case "back":
      return state.trail.length > 1
        ? { status: "answering", trail: state.trail.slice(0, -1) }
        : state;
    case "begin":
      return { status: "working", trail: state.trail, job: event.job };
    case "end":
      return state;
  }
}
