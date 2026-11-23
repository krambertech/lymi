import { defineRule } from "@oxlint/plugins";
import { isIdentifierNamed, isMethodCall, someDescendant } from "../ast.mjs";

const message =
  "Take the hit slop from edgeSwipeSlop() in src/ui/edge-swipe.ts: Android takes both screen " +
  "edges for Back, so a swipe held to one never starts there (#762).";

const edges = ["left", "right", "start", "end"];

export default defineRule({
  meta: { type: "problem", schema: [] },
  create(context) {
    return {
      CallExpression(node) {
        if (!isMethodCall(node, "hitSlop")) return;
        const held = someDescendant(context.sourceCode, node.arguments, (child) => {
          if (child.type !== "ObjectExpression") return false;
          const keys = child.properties.filter((property) => property.type === "Property");
          const has = (name) => keys.some((property) => isIdentifierNamed(property.key, name));
          return has("width") && edges.some(has);
        });
        if (held) context.report({ node, message });
      },
    };
  },
});
