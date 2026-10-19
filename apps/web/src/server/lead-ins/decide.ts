import type { DecisionModel } from "../lessons/keep";
import type { LeadInInput, LeadInPolicy } from "./policy";

export const DECISION_MODEL = "@cf/cloudflare/clef";

/** How likely the reading alone names another word too, or null when the model could not judge. */
export async function leadInScore(
  ai: DecisionModel,
  policy: LeadInPolicy,
  input: LeadInInput,
): Promise<number | null> {
  if (!ai) return null;
  try {
    const reply = (await ai.run(DECISION_MODEL, {
      state: { language: policy.name, ...input },
      questions: { ambiguous: { type: "noul", instructions: policy.question } },
    })) as { answers?: { ambiguous?: { noul?: unknown } } };
    const score = reply.answers?.ambiguous?.noul;
    return typeof score === "number" && score >= 0 && score <= 1 ? score : null;
  } catch {
    // The writer still decides on its own, so a failed decision costs only the saving.
    return null;
  }
}
