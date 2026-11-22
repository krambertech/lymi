import { testRule } from "../test/run.mjs";

const filename = "hints.ts";

testRule("ai-consent", {
  message:
    "Only a check in apps/web/src/server/services/ai-consent.ts may produce an AiConsent for a " +
    "learner's content. Take it from requireAi, aiConsentFor, aiConsentForOwner or " +
    "aiConsentForRun; consentForCanary and consentForEvaluation are for text Lymi wrote itself. " +
    "A test takes testAiConsent.",
  valid: [
    { filename, code: 'import type { AiConsent } from "../ai/consent";' },
    { filename, code: "const consent: AiConsent | null = await aiConsentFor(ctx);" },
    { filename, code: "const choice = row as AiConsentInput;" },
    { filename, code: 'const name = "consentForCanary";' },
  ],
  invalid: [
    {
      filename,
      code: "const a = {} as AiConsent;",
      errors: ["{} as AiConsent"],
    },
    {
      filename,
      code: "const b = true as unknown as AiConsent;",
      errors: ["true as unknown as AiConsent"],
    },
    { filename, code: "const c = <AiConsent>{};", errors: ["<AiConsent>{}"] },
    {
      filename,
      code: 'import { consentForEvaluation } from "../ai/consent";',
      errors: ["consentForEvaluation"],
    },
    {
      filename,
      code: 'import { consentForCanary as allow } from "../ai/consent";',
      errors: ["consentForCanary"],
    },
    {
      filename,
      code: 'import * as consent from "../ai/consent"; consent.consentForCanary();',
      errors: ["consentForCanary"],
    },
    {
      filename,
      code: 'export { consentForEvaluation } from "../ai/consent";',
      errors: ["consentForEvaluation"],
    },
    {
      filename,
      code: 'const { consentForCanary } = await import("../ai/consent");',
      errors: ["consentForCanary"],
    },
  ],
});
