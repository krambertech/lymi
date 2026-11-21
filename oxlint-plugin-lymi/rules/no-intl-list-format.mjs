import { defineRule } from "@oxlint/plugins";
import { isStaticMember } from "../ast.mjs";

const message =
  "Hermes has no Intl.ListFormat, so this throws on the phone. Use formatList() from " +
  "src/i18n/list.ts, which falls back to a comma list.";

export default defineRule({
  meta: { type: "problem", schema: [] },
  create(context) {
    return {
      MemberExpression(node) {
        if (isStaticMember(node, "Intl", "ListFormat")) context.report({ node, message });
      },
    };
  },
});
