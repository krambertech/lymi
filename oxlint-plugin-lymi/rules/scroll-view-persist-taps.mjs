import { defineRule } from "@oxlint/plugins";
import { isIdentifierNamed, someDescendant } from "../ast.mjs";

const message =
  "Set keyboardShouldPersistTaps to handled on this scroll view: without it, the first tap " +
  "while the keyboard is up only dismisses the keyboard and the button never fires.";

const plain = new Set(["ScrollView", "FlatList", "SectionList"]);
const animated = new Set(["ScrollView", "FlatList"]);

function isScrollView(name) {
  if (name.type === "JSXIdentifier") return plain.has(name.name);
  return (
    name.type === "JSXMemberExpression" &&
    name.object.type === "JSXIdentifier" &&
    name.object.name === "Animated" &&
    animated.has(name.property.name)
  );
}

export default defineRule({
  meta: { type: "problem", schema: [] },
  create(context) {
    const { sourceCode } = context;
    return {
      JSXOpeningElement(node) {
        if (!isScrollView(node.name)) return;
        const persists = someDescendant(sourceCode, node.attributes, (child) =>
          isIdentifierNamed(child, "keyboardShouldPersistTaps"),
        );
        if (!persists) context.report({ node: node.name, message });
      },
    };
  },
});
