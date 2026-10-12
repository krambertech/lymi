import { describe, expect, it } from "vitest";
import { openDraft } from "./draft";

describe("openDraft", () => {
  it("takes the deck's newer value when the draft is clean", () => {
    // Saved here as "Old", changed on the web to "New", then refreshed.
    expect(openDraft("Old", "Old", "New")).toEqual({ draft: "New", saved: "New" });
  });

  it("keeps an edit that has not been saved", () => {
    expect(openDraft("Mine", "Old", "New")).toEqual({ draft: "Mine", saved: "Old" });
  });

  it("treats an empty draft as no value", () => {
    expect(openDraft("  ", null, "Added on the web")).toEqual({
      draft: "Added on the web",
      saved: "Added on the web",
    });
    expect(openDraft("Old", "Old", null)).toEqual({ draft: "", saved: null });
  });
});
