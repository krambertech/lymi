import { describe, expect, it } from "vitest";
import { keyed } from "./keyed";

describe("keyed", () => {
  it("keeps a unique name as its key", () => {
    expect(keyed(["Food", "Travel"], (n) => n).map((k) => k.key)).toEqual(["Food", "Travel"]);
  });

  it("counts a repeated name, so two sections with one name never share a key", () => {
    expect(keyed(["Food", "Travel", "Food"], (n) => n).map((k) => k.key)).toEqual([
      "Food",
      "Travel",
      "Food#2",
    ]);
  });
});
