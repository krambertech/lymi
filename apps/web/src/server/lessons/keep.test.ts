import { expect, it, vi } from "vitest";
import { testAiConsent } from "../../test/ai-consent";
import type { AiConsent } from "../ai/consent";
import { termsAgainstAnswer } from "./keep";

it("checks no further term against the answer once the learner turns AI off", async () => {
  const run = vi.fn(async () => ({ answers: { fits: { noul: 0.1 } } }));
  const terms = Array.from({ length: 20 }, (_, i) => ({ id: `t${i}`, term: "kass", gloss: "cat" }));
  const consentNow = vi.fn(async (): Promise<AiConsent | null> => null);
  consentNow.mockResolvedValueOnce(testAiConsent);
  expect(await termsAgainstAnswer({ run }, "Which?", "Verbs", terms, consentNow)).toEqual(["t0"]);
  expect(run).toHaveBeenCalledOnce();
});
