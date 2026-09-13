import { describe, expect, it } from "vitest";
import { isLoopbackUrl, safeProductReturnPath } from "./origins";

describe("safeProductReturnPath", () => {
  it("preserves a protected product path and query", () => {
    expect(safeProductReturnPath("/library/deck_1?card=card_2&mode=edit")).toBe(
      "/library/deck_1?card=card_2&mode=edit",
    );
  });

  it("lets sign-in return to a join page", () => {
    expect(safeProductReturnPath("/join/AbCdEfGhIjKlMnOpQrStUvWxYz012345?continue=1")).toBe(
      "/join/AbCdEfGhIjKlMnOpQrStUvWxYz012345?continue=1",
    );
  });

  it.each([
    "https://elsewhere.example/today",
    "/join",
    "/join/a/b",
    "//elsewhere.example/today",
    "/\\elsewhere.example/today",
    "/%zz",
    "/login?returnTo=/library",
    "/consent?client_id=example",
    "/docs/api",
    "/api/me",
    "/today#grade",
  ])("rejects unsafe, malformed, or non-product destination %s", (value) => {
    expect(safeProductReturnPath(value)).toBe("/today");
  });
});

describe("isLoopbackUrl", () => {
  it("treats every loopback spelling the same", () => {
    expect(isLoopbackUrl("http://[::1]:5241")).toBe(true);
    expect(isLoopbackUrl("http://localhost")).toBe(true);
    expect(isLoopbackUrl("http://lymi.local")).toBe(false);
  });
});
