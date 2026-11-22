import { defineRule } from "@oxlint/plugins";
import { descendants, isFunction } from "../ast.mjs";

const message =
  "A worklet copies what it closes over, elements included. Read a flag, such as " +
  "const hasHeader = !!header, and close over that.";

const hooks = new Set([
  "useAnimatedStyle",
  "useAnimatedProps",
  "useAnimatedReaction",
  "useDerivedValue",
  "useAnimatedScrollHandler",
]);

function holdsElement(node) {
  if (!node) return false;
  if (node.type === "JSXElement" || node.type === "JSXFragment") return true;
  if (node.type === "ConditionalExpression") {
    return holdsElement(node.consequent) || holdsElement(node.alternate);
  }
  if (node.type === "LogicalExpression") {
    return holdsElement(node.left) || holdsElement(node.right);
  }
  return false;
}

export default defineRule({
  meta: { type: "problem", schema: [] },
  create(context) {
    const { sourceCode } = context;
    const elements = (node) => {
      const names = new Set();
      for (let at = node.parent; at; at = at.parent) {
        if (!isFunction(at) || at.body.type !== "BlockStatement") continue;
        for (const statement of at.body.body) {
          if (statement.type !== "VariableDeclaration") continue;
          for (const { id, init } of statement.declarations) {
            if (id.type === "Identifier" && holdsElement(init)) names.add(id.name);
          }
        }
      }
      return names;
    };
    return {
      CallExpression(node) {
        if (node.callee.type !== "Identifier" || !hooks.has(node.callee.name)) return;
        const names = elements(node);
        if (names.size === 0) return;
        for (const argument of node.arguments.filter(isFunction)) {
          for (const inner of descendants(sourceCode, argument.body)) {
            if (inner.type !== "Identifier" || !names.has(inner.name)) continue;
            if (inner.parent.type === "MemberExpression" && inner.parent.property === inner) {
              continue;
            }
            if (inner.parent.type === "Property" && inner.parent.key === inner) continue;
            context.report({ node: inner, message });
          }
        }
      },
    };
  },
});
