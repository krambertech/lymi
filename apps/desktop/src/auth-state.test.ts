import { describe, expect, it } from "vitest";
import {
  type Auth,
  type AuthEvent,
  auth,
  HANDED_BACK,
  hasCookie,
  offersSignIn,
  UNKNOWN,
} from "./auth-state.js";

const cookie = "lymi.session_token";
const run = (...events: AuthEvent[]): Auth => events.reduce(auth, UNKNOWN);

describe("whether the Mac app is signed in", () => {
  it("stops offering Sign in once the learner signs in again after a 401", () => {
    const refused = run({ type: "read", present: true }, { type: "answered", status: 401 });
    expect(refused).toEqual({ status: "refused" });
    expect(offersSignIn(refused)).toBe(true);
    const again = [
      { type: "cookie", name: cookie, cause: "overwrite", removed: true },
      { type: "cookie", name: cookie, cause: "inserted", removed: false },
    ] as const;
    const signedIn = again.reduce(auth, refused);
    expect(signedIn).toEqual({ status: "in" });
    expect(offersSignIn(signedIn)).toBe(false);
  });

  it("signs in from a browser hand-back before the cookie's own event arrives", () => {
    for (const before of [
      run({ type: "read", present: false }),
      run({ type: "read", present: true }, { type: "answered", status: 401 }),
    ]) {
      const after = auth(before, HANDED_BACK);
      expect(after).toEqual({ status: "in" });
      expect(hasCookie(after)).toBe(true);
    }
    const signedIn = run({ type: "read", present: true });
    expect(auth(signedIn, HANDED_BACK)).toBe(signedIn);
  });

  it("ignores the daily refresh of a working session", () => {
    const signedIn = run({ type: "read", present: true });
    expect(
      auth(signedIn, { type: "cookie", name: cookie, cause: "overwrite", removed: true }),
    ).toBe(signedIn);
    expect(
      auth(signedIn, { type: "cookie", name: cookie, cause: "inserted", removed: false }),
    ).toBe(signedIn);
  });

  it("signs out when the cookie goes, and ignores answers with no cookie", () => {
    const out = run(
      { type: "read", present: true },
      { type: "cookie", name: cookie, cause: "explicit", removed: true },
    );
    expect(out).toEqual({ status: "out" });
    expect(auth(out, { type: "answered", status: 200 })).toBe(out);
    expect(offersSignIn(UNKNOWN)).toBe(false);
  });

  it("keeps a refused session refused while the server fails", () => {
    const refused = run({ type: "read", present: true }, { type: "answered", status: 401 });
    expect(auth(refused, { type: "answered", status: 503 })).toBe(refused);
    expect(auth(refused, { type: "answered", status: 200 })).toEqual({ status: "in" });
  });
});
