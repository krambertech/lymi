import { defineRule } from "@oxlint/plugins";
import { attributesSpan, isJsxAttribute, isSelfClosingNamed, someDescendant } from "../ast.mjs";

const message =
  "A form sheet's header is FormHeader from src/ui/form-header.tsx: it keeps the header above " +
  "the sheet's scroll view, which a hand-built row lets iOS cover.";

export default defineRule({
  meta: { type: "problem", schema: [] },
  create(context) {
    const { sourceCode } = context;
    return {
      JSXOpeningElement(node) {
        if (!isSelfClosingNamed(node, "GlassButton") || node.attributes.length === 0) return;
        const closes = someDescendant(sourceCode, node.attributes, (attribute) =>
          isJsxAttribute(sourceCode, attribute, "icon", '"close"'),
        );
        if (closes) context.report({ node: attributesSpan(node.attributes), message });
      },
    };
  },
});
