import { defineRule } from "@oxlint/plugins";
import { attributesSpan, isJsxAttribute, isSelfClosingNamed, someDescendant } from "../ast.mjs";

const message =
  "An error line is FieldError from src/ui/field.tsx: it centres the icon on the first line, " +
  "keeps the text on the form's line and reads it out. Pass flush under a field drawn as a line " +
  "with no box.";

export default defineRule({
  meta: { type: "problem", schema: [] },
  create(context) {
    const { sourceCode } = context;
    const contains = (attributes, name, value) =>
      someDescendant(sourceCode, attributes, (node) =>
        isJsxAttribute(sourceCode, node, name, value),
      );
    return {
      JSXOpeningElement(node) {
        if (!isSelfClosingNamed(node, "Icon") || node.attributes.length === 0) return;
        if (!contains(node.attributes, "name", '"alert"')) return;
        if (!contains(node.attributes, "size", "{14}")) return;
        context.report({ node: attributesSpan(node.attributes), message });
      },
    };
  },
});
