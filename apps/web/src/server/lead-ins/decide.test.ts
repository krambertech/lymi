import { describe, expect, it, vi } from "vitest";
import { DECISION_MODEL, leadInScore } from "./decide";
import { japanese } from "./japanese";

const input = { term: "橋", reading: "はし", meaning: "bridge" };

describe("lead-in decision", () => {
  it("asks the policy's question about the card and returns the model's score", async () => {
    const run = vi.fn(async () => ({ answers: { ambiguous: { noul: 0.74 } } }));
    expect(await leadInScore({ run }, japanese, input)).toBe(0.74);
    expect(run).toHaveBeenCalledWith(DECISION_MODEL, {
      state: { language: "Japanese", ...input },
      questions: { ambiguous: { type: "noul", instructions: japanese.question } },
    });
  });

  it("gives no score without the model, when it fails, or when its answer is out of range", async () => {
    expect(await leadInScore(undefined, japanese, input)).toBeNull();
    const down = vi.fn(async () => {
      throw new Error("down");
    });
    expect(await leadInScore({ run: down }, japanese, input)).toBeNull();
    for (const noul of [undefined, "0.5", 1.5, -0.1])
      expect(
        await leadInScore(
          { run: async () => ({ answers: { ambiguous: { noul } } }) },
          japanese,
          input,
        ),
      ).toBeNull();
  });
});
