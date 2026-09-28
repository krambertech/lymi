import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { DIAGNOSIS_PROMPT_VERSION, diagnosisRequest } from "./prompt";

describe("the diagnosis prompt", () => {
  it("changes only with a new prompt version", () => {
    const { instructions, schema } = diagnosisRequest({
      meaningLanguage: "en",
      card: {
        id: "card",
        term: "pikk",
        meaning: "tall",
        language: "et",
        asked: ["meaning_to_term"],
      },
      deck: { name: "Tund 7", cards: [] },
      oftenForgotten: [],
    });
    const hash = createHash("sha256")
      .update(JSON.stringify({ instructions, schema }))
      .digest("hex")
      .slice(0, 16);
    // Raise DIAGNOSIS_PROMPT_VERSION with any change to what the model reads, then update both.
    expect({ DIAGNOSIS_PROMPT_VERSION, hash }).toEqual({
      DIAGNOSIS_PROMPT_VERSION: 2,
      hash: "75b580086e9f0f9f",
    });
  });
});
