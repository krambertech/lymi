import { describe, expect, it } from "vitest";
import { entryLink, entryOf, reminderLink, reminderOf } from "./links";

describe("entry links", () => {
  it("names the screen and the entry point", () => {
    expect(entryLink("add", "control")).toBe("lymi://capture?from=control");
    expect(entryLink("review", "quick_action")).toBe("lymi://review?from=quick_action");
    expect(entryLink("search", "shortcut")).toBe("lymi://search?from=shortcut");
  });

  it("reads the entry point back from the screen it opened", () => {
    expect(entryOf("/capture", "shortcut")).toEqual({ entry: "shortcut", place: "add" });
    expect(entryOf("/review", "widget")).toEqual({ entry: "widget", place: "review" });
    expect(entryOf("/review", "reminder")).toEqual({ entry: "reminder", place: "review" });
  });

  it("ignores screens and sources it does not know", () => {
    expect(entryOf("/review", undefined)).toBeUndefined();
    expect(entryOf("/review", "email")).toBeUndefined();
    expect(entryOf("/library", "control")).toBeUndefined();
    expect(entryOf("/review", ["control"])).toBeUndefined();
  });
});

describe("reminder links", () => {
  it("names the message so its opening can be counted", () => {
    expect(reminderLink("after_rest")).toBe("/review?from=reminder&reminder=after_rest");
    expect(reminderOf("reminder", "after_rest")).toBe("after_rest");
  });

  it("opens a review without a message for a reminder from an earlier release", () => {
    expect(reminderLink(undefined)).toBe("/review?from=reminder");
  });

  it("ignores any other link", () => {
    expect(reminderOf("widget", "ready")).toBeUndefined();
    expect(reminderOf("reminder", "streak")).toBeUndefined();
    expect(reminderOf(undefined, undefined)).toBeUndefined();
  });
});
