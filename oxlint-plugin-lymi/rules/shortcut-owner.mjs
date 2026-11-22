import { defineRule } from "@oxlint/plugins";

const message =
  "Use useShortcut() from lib/use-shortcut.ts, which ignores a key under an open overlay, in a " +
  "field, on repeat, with a modifier or while an input method composes. Handlers written by hand " +
  "forgot one and stacked ⌘K over an open dialog (#813, #1083). A listener that is not a shortcut " +
  "says why in an oxlint-disable.";

const KEY_EVENTS = new Set(["keydown", "keyup", "keypress"]);
const KEY_PROPERTIES = new Set(["onkeydown", "onkeyup", "onkeypress"]);
const GLOBALS = new Set(["window", "document", "globalThis", "self"]);
const DOCUMENT_PROPERTIES = new Set(["ownerDocument", "defaultView", "contentDocument"]);

function isGlobalTarget(node) {
  if (node.type === "Identifier") return GLOBALS.has(node.name);
  if (node.type === "ChainExpression" || node.type === "TSNonNullExpression") {
    return isGlobalTarget(node.expression);
  }
  if (node.type !== "MemberExpression" || node.computed) return false;
  return DOCUMENT_PROPERTIES.has(node.property.name) || isGlobalTarget(node.object);
}

function listensOnGlobal(callee) {
  if (callee.type === "Identifier") return callee.name === "addEventListener";
  return (
    callee.type === "MemberExpression" &&
    !callee.computed &&
    callee.property.name === "addEventListener" &&
    isGlobalTarget(callee.object)
  );
}

export default defineRule({
  meta: { type: "problem", schema: [] },
  create(context) {
    return {
      CallExpression(node) {
        const [event] = node.arguments;
        if (event?.type !== "Literal" || !KEY_EVENTS.has(event.value)) return;
        if (listensOnGlobal(node.callee)) context.report({ node: node.callee, message });
      },
      AssignmentExpression({ left }) {
        if (left.type !== "MemberExpression" || left.computed) return;
        if (!KEY_PROPERTIES.has(left.property.name)) return;
        if (isGlobalTarget(left.object)) context.report({ node: left, message });
      },
    };
  },
});
