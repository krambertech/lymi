import { defineRule } from "@oxlint/plugins";
import { isIdentifierNamed, isMethodCall, someDescendant } from "../ast.mjs";

const message =
  "A sleep, a retry, a slow or a fixme makes a flaky test pass without fixing it. Wait for the " +
  "state the next step needs, such as a response, focus or a visible row; fix the cause; or " +
  "delete the test and record the coverage lost (docs/testing.md#flaky-tests). A wait that " +
  "proves nothing happens takes an oxlint-disable-next-line saying so.";

const masks = ["waitForTimeout", "slow", "fixme"];

export default defineRule({
  meta: { type: "problem", schema: [] },
  create(context) {
    const { sourceCode } = context;
    const isRetryConfig = (node) => {
      if (!isMethodCall(node, "configure")) return false;
      const owner = node.callee.object;
      if (owner.type !== "MemberExpression" || owner.computed || owner.optional) return false;
      if (owner.property.type !== "Identifier" || owner.property.name !== "describe") return false;
      return someDescendant(sourceCode, node.arguments, (child) =>
        isIdentifierNamed(child, "retries"),
      );
    };
    return {
      CallExpression(node) {
        if (masks.some((name) => isMethodCall(node, name)) || isRetryConfig(node)) {
          context.report({ node, message });
        }
      },
    };
  },
});
