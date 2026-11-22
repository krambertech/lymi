import { defineRule } from "@oxlint/plugins";
import { isFunctionCall, someDescendant } from "../ast.mjs";

const message =
  "Check composing(e) from lib/composing.ts before acting on Enter: an input method confirms its " +
  "word with Enter, and Safari reports that key as 229 with isComposing false (#809, #813).";

const FUNCTIONS = new Set(["ArrowFunctionExpression", "FunctionExpression", "FunctionDeclaration"]);

const isEnter = (node) => node.type === "Literal" && node.value === "Enter";
const isSpace = (node) => node.type === "Literal" && node.value === " ";
const isKey = (node) =>
  node.type === "MemberExpression" && !node.computed && node.property.name === "key";

const comparesKey = (node, isValue) =>
  node.type === "BinaryExpression" &&
  (node.operator === "===" || node.operator === "!==") &&
  ((isKey(node.left) && isValue(node.right)) || (isKey(node.right) && isValue(node.left)));

function enclosingFunction(node) {
  let current = node.parent;
  while (current && !FUNCTIONS.has(current.type)) current = current.parent;
  return current;
}

function pairedWithSpace({ parent }) {
  return (
    parent.type === "LogicalExpression" &&
    (comparesKey(parent.left, isSpace) || comparesKey(parent.right, isSpace))
  );
}

export default defineRule({
  meta: { type: "problem", schema: [] },
  create(context) {
    function check(node) {
      const handler = enclosingFunction(node);
      if (!handler) return;
      const guarded = someDescendant(context.sourceCode, [handler.body], (descendant) =>
        isFunctionCall(descendant, "composing"),
      );
      if (!guarded) context.report({ node, message });
    }
    return {
      BinaryExpression(node) {
        if (comparesKey(node, isEnter) && !pairedWithSpace(node)) check(node);
      },
      SwitchCase(node) {
        if (node.test && isEnter(node.test) && isKey(node.parent.discriminant)) check(node.test);
      },
    };
  },
});
