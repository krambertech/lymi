import { defineRule } from "@oxlint/plugins";
import { isMethodCall, outermostFunction, someDescendant } from "../ast.mjs";

const message =
  "iOS ignores accessibilityLiveRegion: call AccessibilityInfo.announceForAccessibility in the " +
  "same component, or use Notice, SheetError or FieldError, which do (#708).";

export default defineRule({
  meta: { type: "problem", schema: [] },
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.name !== "accessibilityLiveRegion") return;
        const component = outermostFunction(node);
        const announces =
          component &&
          someDescendant(context.sourceCode, [component], (child) =>
            isMethodCall(child, "announceForAccessibility"),
          );
        if (!announces) context.report({ node, message });
      },
    };
  },
});
