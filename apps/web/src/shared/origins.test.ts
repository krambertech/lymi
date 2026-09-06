import { describe, expect, it } from "vitest";
import { safeProductReturnPath } from "./origins";

describe("safeProductReturnPath", () => {
  it("preserves a protected product path and query", () => {
    expect(safeProductReturnPath("/library/deck_1?card=card_2&mode=edit")).toBe(
      "/library/deck_1?card=card_2&mode=edit",
    );
  });

  it.each([
    "https://elsewhere.example/today",
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
