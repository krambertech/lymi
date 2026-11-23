import { defineRule } from "@oxlint/plugins";
import { descendants, jsxName } from "../ast.mjs";

const message =
  "Spread useSheetFocus() from src/ui/sheet-focus.ts on a sheet's field: Android's sheet is its " +
  "own window, and autoFocus raises no keyboard there (#762).";

export default defineRule({
  meta: { type: "problem", schema: [] },
  create(context) {
    return {
      JSXElement(node) {
        if (jsxName(node.openingElement.name) !== "Sheet") return;
        for (const child of node.children) {
          for (const inner of descendants(context.sourceCode, child)) {
            if (inner.type === "JSXAttribute" && inner.name.name === "autoFocus") {
              context.report({ node: inner, message });
            }
          }
        }
      },
    };
  },
});
