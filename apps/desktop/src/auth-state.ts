import { SESSION_COOKIE, sessionChange } from "./callback.js";

export type Auth =
  | { status: "unknown" }
  | { status: "out" }
  | { status: "in" }
  | { status: "refused" };

export type AuthEvent =
  | { type: "read"; present: boolean }
  | { type: "cookie"; name: string; cause: string; removed: boolean }
  | { type: "answered"; status: number };

export const UNKNOWN: Auth = { status: "unknown" };

export const HANDED_BACK: AuthEvent = {
  type: "cookie",
  name: SESSION_COOKIE,
  cause: "inserted",
  removed: false,
};

export const hasCookie = (state: Auth) => state.status === "in" || state.status === "refused";

export const offersSignIn = (state: Auth) => state.status === "out" || state.status === "refused";

export function auth(state: Auth, event: AuthEvent): Auth {
  switch (event.type) {
    case "read":
      if (!event.present) return { status: "out" };
      return state.status === "refused" ? state : { status: "in" };
    case "cookie": {
      if (state.status === "refused" && !event.removed && event.name.endsWith(SESSION_COOKIE))
        return { status: "in" };
      const now = sessionChange(hasCookie(state), event);
      if (now === null) return state;
      return now ? { status: "in" } : { status: "out" };
    }
    case "answered":
      if (!hasCookie(state)) return state;
      if (event.status === 401) return { status: "refused" };
      return event.status < 300 ? { status: "in" } : state;
  }
}
