import type { LoginMode } from "../views/login-view";

/** What the form says under its fields, or above them for a failure of the whole form. */
export interface FormErrors {
  form?: string | undefined;
  email?: string | undefined;
  password?: string | undefined;
}

/** The notice that replaces the form once a link is on its way, as data the page renders. */
export type SentNotice =
  /** `known`: the address already has an account, so the notice never talks about creating one. */
  | { kind: "confirm"; address: string; again: boolean; known: boolean }
  | { kind: "reset"; address: string };

/**
 * The email form's one state. A submit is an attempt, and its answer lands only while that attempt
 * is current, so switching forms mid-submit never puts one form's answer on another.
 */
export type LoginFlow =
  | { status: "form"; mode: LoginMode; errors: FormErrors }
  | { status: "submitting"; mode: LoginMode; attempt: number }
  | { status: "sent"; mode: LoginMode; notice: SentNotice; resending: boolean };

export type LoginEvent =
  | { type: "switch"; mode: LoginMode }
  /** Errors found before anything is sent, or cleared as the learner types or tries Google. */
  | { type: "show"; errors: FormErrors }
  | { type: "submit"; attempt: number }
  | { type: "fail"; attempt: number; errors: FormErrors }
  | { type: "send"; attempt: number; notice: SentNotice }
  | { type: "resend" }
  | { type: "resent" }
  | { type: "resend-fail"; error: string };

export function loginFlow(state: LoginFlow, event: LoginEvent): LoginFlow {
  const current =
    state.status === "submitting" && "attempt" in event && state.attempt === event.attempt;
  switch (event.type) {
    case "switch":
      return { status: "form", mode: event.mode, errors: {} };
    case "show":
      return state.status === "form" ? { ...state, errors: event.errors } : state;
    case "submit":
      return state.status === "form"
        ? { status: "submitting", mode: state.mode, attempt: event.attempt }
        : state;
    case "fail":
      return current ? { status: "form", mode: state.mode, errors: event.errors } : state;
    case "send":
      return current
        ? { status: "sent", mode: state.mode, notice: event.notice, resending: false }
        : state;
    case "resend":
      return state.status === "sent" && state.notice.kind === "confirm"
        ? { ...state, resending: true }
        : state;
    case "resent":
      return state.status === "sent" && state.resending && state.notice.kind === "confirm"
        ? { ...state, resending: false, notice: { ...state.notice, again: true } }
        : state;
    case "resend-fail":
      return state.status === "sent" && state.resending
        ? { status: "form", mode: state.mode, errors: { form: event.error } }
        : state;
  }
}
