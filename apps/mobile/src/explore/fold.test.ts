import { describe, expect, it } from "vitest";
import { fold } from "./fold";

describe("fold", () => {
  it("drops Latin accents and case", () => {
    expect(fold("Café Zürich")).toBe("cafe zurich");
  });
  it("keeps kana voicing marks, typed composed or not", () => {
    expect(fold("がくせい")).toBe("がくせい");
    expect(fold("が")).toBe("が");
    expect(fold("パン")).not.toBe(fold("ハン"));
    expect(fold("が")).not.toBe(fold("か"));
  });
});
