import { describe, expect, it } from "vitest";
import { cookieOf, parseCallback, sessionChange } from "./callback.js";

const token = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

describe("the sign-in link the browser hands back", () => {
  it("reads the code and state in either spelling of the scheme", () => {
    const code = { identifier: "abc123", state: "s1" };
    expect(parseCallback(`app.lymi.desktop://auth/callback#token=${token(code)}`)).toEqual(code);
    expect(parseCallback(`app.lymi.desktop:/auth/callback#token=${token(code)}`)).toEqual(code);
  });

  it("refuses another scheme, path, a missing token or a token that is not one", () => {
    const code = token({ identifier: "abc123", state: "s1" });
    expect(parseCallback(`lymi://auth/callback#token=${code}`)).toBeNull();
    expect(parseCallback(`app.lymi.desktop://auth/other#token=${code}`)).toBeNull();
    expect(parseCallback("app.lymi.desktop://auth/callback")).toBeNull();
    expect(parseCallback("app.lymi.desktop://auth/callback#token=%%%")).toBeNull();
    expect(
      parseCallback(`app.lymi.desktop://auth/callback#token=${token({ state: "s1" })}`),
    ).toBeNull();
  });
});

describe("copying the session cookie into the window", () => {
  const url = "https://my.lymi.app";
  const now = Date.parse("2026-10-24T09:00:00Z");

  it("keeps a production cookie's name, value with its signature, and attributes", () => {
    const header =
      "__Secure-lymi.session_token=tok.sig=; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=Lax";
    expect(cookieOf(header, url, now)).toEqual({
      url,
      name: "__Secure-lymi.session_token",
      value: "tok.sig=",
      path: "/",
      expirationDate: now / 1000 + 604800,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });
  });

  it("reads Expires when there is no Max-Age, so the session outlives a restart", () => {
    const cookie = cookieOf("a=b; Expires=Sat, 31 Oct 2026 09:00:00 GMT; SameSite=None", url, now);
    expect(cookie.expirationDate).toBe(Date.parse("2026-10-31T09:00:00Z") / 1000);
    expect(cookie.sameSite).toBe("no_restriction");
  });

  it("lets Max-Age win over Expires, as a browser does", () => {
    const cookie = cookieOf("a=b; Max-Age=60; Expires=Sat, 31 Oct 2026 09:00:00 GMT", url, now);
    expect(cookie.expirationDate).toBe(now / 1000 + 60);
  });
});

describe("telling a sign-in from the daily refresh", () => {
  const cookie = "lymi.session_token";

  it("counts a first session cookie as a sign-in and its removal as a sign-out", () => {
    expect(sessionChange(false, { name: cookie, cause: "inserted", removed: false })).toBe(true);
    expect(sessionChange(true, { name: cookie, cause: "explicit", removed: true })).toBe(false);
    expect(sessionChange(true, { name: cookie, cause: "expired", removed: true })).toBe(false);
  });

  it("ignores a refresh, its insert while a session is held, and other cookies", () => {
    expect(sessionChange(true, { name: cookie, cause: "overwrite", removed: true })).toBeNull();
    expect(sessionChange(true, { name: cookie, cause: "inserted", removed: false })).toBeNull();
    expect(
      sessionChange(false, { name: "lymi.theme", cause: "inserted", removed: false }),
    ).toBeNull();
  });
});
