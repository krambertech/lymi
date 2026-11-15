import { describe, expect, it } from "vitest";
import { openDraft, refusedDraft } from "./draft";

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

describe("a refused save", () => {
  it("lets the same text be saved again", () => {
    expect(refusedDraft("New name", "New name", "Old name")).toBe("Old name");
  });

  it("keeps a newer save's baseline", () => {
    expect(refusedDraft("Newest", "New name", "Old name")).toBe("Newest");
  });
});
