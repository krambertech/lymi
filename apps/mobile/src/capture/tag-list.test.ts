import { TAG_LIMITS } from "@lymi/core";
import { describe, expect, it } from "vitest";
import { addTags, tagsSummary } from "./tag-list";

describe("adding tags", () => {
  it("splits on commas and drops blanks and repeats", () => {
    expect(addTags(["city"], " road signs, city,, verbs ")).toEqual([
      "city",
      "road signs",
      "verbs",
    ]);
  });

  it("stops at the most a card may carry", () => {
    const full = Array.from({ length: TAG_LIMITS.count }, (_, i) => `t${i}`);
    expect(addTags(full, "one more")).toEqual(full);
  });

  it("reads as the first tag and how many more", () => {
    expect(tagsSummary([])).toBeNull();
    expect(tagsSummary(["city"])).toBe("city");
    expect(tagsSummary(["city", "noun", "verb"])).toBe("city +2");
  });
});
