import { defineRule } from "@oxlint/plugins";
import { jsxName, outermostFunction, someDescendant } from "../ast.mjs";

const message =
  "Android has no clearButtonMode: draw ClearText from src/ui/search-bar.tsx after the field, " +
  "which stands in for it there (#762).";

export default defineRule({
  meta: { type: "problem", schema: [] },
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.name !== "clearButtonMode") return;
        const scope = outermostFunction(node) ?? context.sourceCode.ast;
        const stands = someDescendant(
          context.sourceCode,
          [scope],
          (child) => child.type === "JSXOpeningElement" && jsxName(child.name) === "ClearText",
        );
        if (!stands) context.report({ node, message });
      },
    };
  },
});
