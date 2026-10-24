import { describe, expect, it, vi } from "vitest";
import { deckEnrichFields, defaultEnrichFields, newDeckEnrichFields } from "./enrichment";

// A row below the evaluation's bar, since every shipped row passes it today.
vi.mock("./languages/configured", async (actual) => {
  const real = await actual<typeof import("./languages/configured")>();
  const gated = { ...real.CONFIGURED.vi, aliases: ["xb"], enrichByDefault: false };
  return {
    ...real,
    CONFIGURED: { ...real.CONFIGURED, xa: gated },
    CONFIGURED_TAGS: new Map([...real.CONFIGURED_TAGS, ["xa", "xa"], ["xb", "xa"]]),
  };
});

describe("a language below the evaluation's bar", () => {
  it("creates a language deck with no AI fields, under any of its tags", () => {
    for (const tag of ["xa", "xa-PH", "xb"]) expect(newDeckEnrichFields(tag)).toEqual([]);
    expect(newDeckEnrichFields("xa", "subject")).toBeNull();
    expect(newDeckEnrichFields("vi")).toBeNull();
  });

  it("leaves a deck whose owner never chose on meaning and example, without the row's starting fields", () => {
    expect(defaultEnrichFields("xa")).toEqual(["meaning", "example", "exampleTranslation"]);
    expect(deckEnrichFields(null, "xa")).toEqual(["meaning", "example", "exampleTranslation"]);
    expect(deckEnrichFields([], "xa")).toEqual([]);
  });
});

describe("a deck whose owner never chose", () => {
  it("lets the AI write a Cantonese Reading under yue as under zh-yue", () => {
    for (const tag of ["yue", "yue-HK", "zh-yue"])
      expect(defaultEnrichFields(tag)).toEqual([
        "meaning",
        "example",
        "exampleTranslation",
        "pronunciation",
      ]);
  });
});
