import { defineRule } from "@oxlint/plugins";

const message =
  "Only a check in apps/web/src/server/services/ai-consent.ts may produce an AiConsent for a " +
  "learner's content. Take it from requireAi, aiConsentFor, aiConsentForOwner or " +
  "aiConsentForRun; consentForCanary and consentForEvaluation are for text Lymi wrote itself. " +
  "A test takes testAiConsent.";

const exemptions = new Set(["consentForCanary", "consentForEvaluation"]);

export default defineRule({
  meta: { type: "problem", schema: [] },
  create(context) {
    const reported = new Set();
    function cast(node) {
      if (/\bAiConsent\b/.test(context.sourceCode.getText(node.typeAnnotation))) {
        context.report({ node, message });
      }
    }
    return {
      TSAsExpression: cast,
      TSTypeAssertion: cast,
      Identifier(node) {
        if (!exemptions.has(node.name) || reported.has(node.range[0])) return;
        reported.add(node.range[0]);
        context.report({ node, message });
      },
    };
  },
});
