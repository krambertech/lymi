import { defineRule } from "@oxlint/plugins";
import { isStaticMember } from "../ast.mjs";

const message =
  "React Native has no navigator.onLine, so on the phone this reads undefined and an offline " +
  "branch never runs. Use online() from @lymi/client/cache, which reads Query's connection " +
  "state there.";

export default defineRule({
  meta: { type: "problem", schema: [] },
  create(context) {
    return {
      MemberExpression(node) {
        if (isStaticMember(node, "navigator", "onLine")) context.report({ node, message });
      },
    };
  },
});
