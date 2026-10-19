import { type SUPPORTED_LANGUAGES, type SupportedTag, supportedLanguage } from "@lymi/core";
import { createLeadInWriter, type LeadInWriter } from "../ai/lead-in-writer";
import { meteredFetch } from "../dependency-health";
import type { Bindings } from "../env";
import { type DecisionModel, decisionModel } from "../lessons/keep";
import { japanese } from "./japanese";
import type { LeadInPolicy } from "./policy";

export { DECISION_MODEL, leadInScore } from "./decide";
export type { LeadInInput, LeadInPolicy, LeadInSkip } from "./policy";

/** A policy where the language's record turns lead-ins on and null where it does not, so the two cannot drift. */
type Policies = {
  readonly [T in SupportedTag]: (typeof SUPPORTED_LANGUAGES)[T]["speech"]["leadIn"] extends true
    ? LeadInPolicy & { language: T }
    : null;
};

const POLICIES: Policies = { ja: japanese };

export function leadInPolicy(language: string | null | undefined): LeadInPolicy | undefined {
  const support = supportedLanguage(language);
  return (support && POLICIES[support.tag]) ?? undefined;
}

export interface LeadInDependencies {
  /** Without a writer no card gets a lead-in. */
  writer: LeadInWriter | null;
  decide: DecisionModel;
}

export function leadInDependencies(env: Bindings): LeadInDependencies {
  let decide: DecisionModel;
  try {
    decide = decisionModel(env, "traffic", 2_500);
  } catch {
    // Without the decision model the writer decides, as it did before there was one.
    decide = undefined;
  }
  return { writer: createLeadInWriter(env, meteredFetch(env, "gemini_text")), decide };
}
