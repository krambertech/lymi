import { describe, expect, it } from "vitest";
import { type UpdateEvent, updateAfter } from "./update-state.js";

const run = (...events: UpdateEvent[]) => events.reduce(updateAfter, undefined);

describe("the app's own update", () => {
  it("stops downloading when the download fails", () => {
    expect(run("checking-for-update", "update-available", "error")).toBeUndefined();
  });

  it("downloads, then stays ready", () => {
    expect(run("checking-for-update", "update-available", "update-downloaded")).toBe("ready");
    expect(run("update-available", "update-downloaded", "error", "checking-for-update")).toBe(
      "ready",
    );
  });

  it("is current when nothing is new, and checks again after a failure", () => {
    expect(run("checking-for-update", "update-not-available")).toBe("current");
    expect(run("error", "checking-for-update")).toBe("checking");
  });
});
