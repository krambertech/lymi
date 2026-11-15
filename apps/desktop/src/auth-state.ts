import { SESSION_COOKIE, sessionChange } from "./callback.js";

/**
 * Whether the learner is signed in, as the window's cookie and the server's answers tell it. A
 * cookie the server refuses still sizes the window as signed in, but the tray offers Sign in.
 */
export type Auth =
  /** Before the window's cookies are first read. */
  | { status: "unknown" }
  | { status: "out" }
  | { status: "in" }
  /** The cookie is there, but the server answered 401 to it. */
  | { status: "refused" };

export type AuthEvent =
  | { type: "read"; present: boolean }
  | { type: "cookie"; name: string; cause: string; removed: boolean }
  | { type: "answered"; status: number };

export const UNKNOWN: Auth = { status: "unknown" };

/** Whether the window holds a session cookie, which decides its size. */
export const hasCookie = (state: Auth) => state.status === "in" || state.status === "refused";

/** Whether the tray offers Sign in. */
export const offersSignIn = (state: Auth) => state.status === "out" || state.status === "refused";

export function auth(state: Auth, event: AuthEvent): Auth {
  switch (event.type) {
    case "read":
      if (!event.present) return { status: "out" };
      return state.status === "refused" ? state : { status: "in" };
    case "cookie": {
      // A new session cookie over a refused one is signing in again.
      if (state.status === "refused" && !event.removed && event.name.endsWith(SESSION_COOKIE))
        return { status: "in" };
      const now = sessionChange(hasCookie(state), event);
      if (now === null) return state;
      return now ? { status: "in" } : { status: "out" };
    }
    case "answered":
      if (!hasCookie(state)) return state;
      if (event.status === 401) return { status: "refused" };
      // Only a success proves the session; a 5xx during a deploy keeps what was known.
      return event.status < 300 ? { status: "in" } : state;
  }
}
