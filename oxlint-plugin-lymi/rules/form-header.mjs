import { defineRule } from "@oxlint/plugins";
import {
  attributesSpan,
  isJsxAttribute,
  isSelfClosingNamed,
  jsxAttribute,
  someDescendant,
} from "../ast.mjs";

const message =
  "A form sheet's header is FormHeader from src/ui/form-header.tsx: it keeps the header above " +
  "the sheet's scroll view, which a hand-built row lets iOS cover.";

const root =
  "FormHeader's outer view takes collapsable={false}: iOS lays a form sheet's scroll view over a " +
  "header that React Native has flattened away.";

export default defineRule({
  meta: { type: "problem", schema: [] },
  create(context) {
    const { sourceCode } = context;
    return {
      FunctionDeclaration(node) {
        if (node.id?.name !== "FormHeader") return;
        for (const statement of node.body.body) {
          if (statement.type !== "ReturnStatement") continue;
          const element = statement.argument;
          if (element?.type !== "JSXElement") continue;
          const { openingElement } = element;
          const collapsable = jsxAttribute(openingElement, "collapsable");
          if (!collapsable || !isJsxAttribute(sourceCode, collapsable, "collapsable", "{false}")) {
            context.report({ node: openingElement.name, message: root });
          }
        }
      },
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
