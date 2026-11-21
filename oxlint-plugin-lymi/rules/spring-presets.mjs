import { defineRule } from "@oxlint/plugins";
import { isFunctionCall, isMethodCall } from "../ast.mjs";

const message =
  "Take the spring from @lymi/design: withSpring(value, spring(PRESET)) or springIn(new " +
  "Builder(), PRESET) from src/theme/motion.ts. A single physics value keeps Reanimated 4's " +
  "heavy defaults beside it and overshoots.";

const physics = ["damping", "stiffness", "mass", "springify"];

export default defineRule({
  meta: { type: "problem", schema: [] },
  create(context) {
    return {
      CallExpression(node) {
        const inlineConfig =
          isFunctionCall(node, "withSpring") &&
          node.arguments.length === 2 &&
          node.arguments[1].type === "ObjectExpression";
        if (inlineConfig || physics.some((name) => isMethodCall(node, name))) {
          context.report({ node, message });
        }
      },
    };
  },
});
