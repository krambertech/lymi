/**
 * The AI consent sheet, from an ask to its answer. Every ask waiting when it closes gets the same
 * answer, and a yes being saved decides it even if the sheet is swiped away meanwhile.
 */
export type ConsentAsk =
  /** `answer` is what the waiting asks settle with, once, as the sheet goes. */
  | { status: "closed"; answer: boolean }
  | { status: "open"; failed: boolean }
  /** Turn on AI is being saved; `shown` is false once the sheet was swiped away during it. */
  | { status: "saving"; shown: boolean }
  /** On its way out, settling with `allowed` once it has gone. */
  | { status: "closing"; allowed: boolean };

export type ConsentEvent =
  | { type: "ask" }
  | { type: "allow" }
  | { type: "later" }
  /** A swipe or the sheet's own close. */
  | { type: "close" }
  /** The sheet has finished leaving the screen. */
  | { type: "dismissed" }
  | { type: "saved"; allowed: boolean }
  | { type: "failed" };

export const CLOSED: ConsentAsk = { status: "closed", answer: false };

export function consentAsk(state: ConsentAsk, event: ConsentEvent): ConsentAsk {
  switch (state.status) {
    case "closed":
      return event.type === "ask" ? { status: "open", failed: false } : state;
    case "open":
      if (event.type === "allow") return { status: "saving", shown: true };
      if (event.type === "later" || event.type === "close")
        return { status: "closing", allowed: false };
      return state;
    case "saving":
      if (event.type === "close" || event.type === "dismissed")
        return { status: "saving", shown: false };
      if (event.type === "saved")
        return state.shown
          ? { status: "closing", allowed: event.allowed }
          : { status: "closed", answer: event.allowed };
      if (event.type === "failed")
        return state.shown ? { status: "open", failed: true } : { status: "closed", answer: false };
      return state;
    case "closing":
      return event.type === "dismissed" ? { status: "closed", answer: state.allowed } : state;
  }
}
