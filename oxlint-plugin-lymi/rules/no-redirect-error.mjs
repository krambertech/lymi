import { defineRule } from "@oxlint/plugins";

const message =
  "Workers throws on redirect: 'error', so this fetch fails in production while tests in Node " +
  "pass. Use redirect: 'manual' and check the response for a 3xx status and its Location header " +
  "yourself.";

const pattern = /^["']?redirect["']?\s*:\s*["']error["']$/s;

export default defineRule({
  meta: { type: "problem", schema: [] },
  create(context) {
    return {
      Property(node) {
        if (node.parent.type !== "ObjectExpression") return;
        if (node.kind !== "init" || node.method || node.shorthand) return;
        if (pattern.test(context.sourceCode.getText(node))) context.report({ node, message });
      },
    };
  },
});
