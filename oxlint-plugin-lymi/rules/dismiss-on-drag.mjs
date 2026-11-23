import { defineRule } from "@oxlint/plugins";
import { isJsxAttribute } from "../ast.mjs";

const message =
  "Pass DISMISS_ON_DRAG from src/ui/keyboard.tsx: Android has no interactive keyboard dismissal, " +
  "so the keyboard stays up there (#762).";

export default defineRule({
  meta: { type: "problem", schema: [] },
  create(context) {
    return {
      JSXAttribute(node) {
        if (isJsxAttribute(context.sourceCode, node, "keyboardDismissMode", '"interactive"')) {
          context.report({ node, message });
        }
      },
    };
  },
});
