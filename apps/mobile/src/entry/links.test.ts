import { describe, expect, it } from "vitest";
import { entryLink, entryOf } from "./links";

describe("entry links", () => {
  it("names the screen and the entry point", () => {
    expect(entryLink("add", "control")).toBe("lymi://capture?from=control");
    expect(entryLink("review", "quick_action")).toBe("lymi://review?from=quick_action");
    expect(entryLink("search", "shortcut")).toBe("lymi://search?from=shortcut");
  });

  it("reads the entry point back from the screen it opened", () => {
    expect(entryOf("/capture", "shortcut")).toEqual({ entry: "shortcut", place: "add" });
    expect(entryOf("/review", "widget")).toEqual({ entry: "widget", place: "review" });
  });

  it("ignores screens and sources it does not know", () => {
    expect(entryOf("/review", undefined)).toBeUndefined();
    expect(entryOf("/review", "email")).toBeUndefined();
    expect(entryOf("/library", "control")).toBeUndefined();
    expect(entryOf("/review", ["control"])).toBeUndefined();
  });
});
