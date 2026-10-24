import { describe, expect, it } from "vitest";
import { updateFeed } from "./downloads.js";

describe("updateFeed", () => {
  it("reads each chip's own feed, where forge.config.js writes it", () => {
    expect(updateFeed("darwin", "arm64")).toBe(
      "https://downloads.lymi.app/darwin/arm64/RELEASES.json",
    );
    expect(updateFeed("darwin", "x64")).toBe("https://downloads.lymi.app/darwin/x64/RELEASES.json");
  });

  it("has none where no build ships", () => {
    expect(updateFeed("win32", "x64")).toBeNull();
    expect(updateFeed("darwin", "ia32")).toBeNull();
  });
});
