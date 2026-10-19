import { describe, expect, it } from "vitest";
import { tagsSummary } from "./tag-list";

describe("the tags chip", () => {
  it("reads as the first tag and how many more", () => {
    expect(tagsSummary([])).toBeNull();
    expect(tagsSummary(["city"])).toBe("city");
    expect(tagsSummary(["city", "noun", "verb"])).toBe("city +2");
  });
});
