import { defineRule } from "@oxlint/plugins";
import { descendants } from "../ast.mjs";

const message =
  "Notice reads its body out on iOS only when it is a string, so this <Trans> is never " +
  "announced. Text with no link or markup goes in as t`…`; keep <Trans> for a body with a link.";

const notice = /^<Notice\b.*$/s;
const trans = /^<Trans>.*$/s;
const rich = /^<Trans>.*<[A-Za-z].*<\/Trans>$/s;

export default defineRule({
  meta: { type: "problem", schema: [] },
  create(context) {
    const { sourceCode } = context;
    const reported = new Set();
    const isPlainTrans = (node) => {
      if (node.type !== "JSXElement" || !node.closingElement) return false;
      const text = sourceCode.getText(node);
      return trans.test(text) && !rich.test(text);
    };
    return {
      JSXElement(node) {
        if (!node.closingElement || !notice.test(sourceCode.getText(node))) return;
        for (const child of descendants(sourceCode, node)) {
          if (!isPlainTrans(child)) continue;
          const key = child.range.join(":");
          if (!reported.has(key)) {
            reported.add(key);
            context.report({ node: child, message });
          }
          return;
        }
      },
    };
  },
});
