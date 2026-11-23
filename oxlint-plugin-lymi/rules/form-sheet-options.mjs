import { defineRule } from "@oxlint/plugins";
import { isIdentifierNamed, jsxAttribute, jsxName, someDescendant } from "../ast.mjs";

const full =
  "Spread FULL_SHEET from src/ui/stack.tsx: a full-height form sheet on Android is otherwise " +
  "sized from a top inset it can miss after a theme switch, leaving its foot under the keyboard (#762).";

const stack =
  "Pass SHEET_STACK.screenLayout and screenOptions from src/ui/stack.tsx, or use TabStack: " +
  "Android lays a form sheet out square and under the status bar without them (#762).";

const isKey = (node, name) => node.type === "Property" && isIdentifierNamed(node.key, name);

export default defineRule({
  meta: { type: "problem", schema: [] },
  create(context) {
    const { sourceCode } = context;
    return {
      Property(node) {
        if (!isKey(node, "sheetAllowedDetents") || node.value.type !== "ArrayExpression") return;
        const [only, ...rest] = node.value.elements;
        if (rest.length === 0 && only?.type === "Literal" && only.value === 1) {
          context.report({ node, message: full });
        }
      },
      JSXElement(node) {
        const { openingElement } = node;
        if (jsxName(openingElement.name) !== "Stack") return;
        const sheets = someDescendant(
          sourceCode,
          node.children,
          (child) => isKey(child, "presentation") && child.value.value === "formSheet",
        );
        if (!sheets) return;
        const layout = jsxAttribute(openingElement, "screenLayout");
        const options = jsxAttribute(openingElement, "screenOptions");
        const shared = [layout, options].every(
          (attribute) =>
            attribute &&
            someDescendant(sourceCode, [attribute], (child) =>
              isIdentifierNamed(child, "SHEET_STACK"),
            ),
        );
        if (!shared) context.report({ node: openingElement.name, message: stack });
      },
    };
  },
});
