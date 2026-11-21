import { defineRule } from "@oxlint/plugins";

const message =
  "SQLite's lower() folds ASCII only, so Дієслова and дієслова stay different on D1. Fold in " +
  "JavaScript with toLocaleLowerCase() and bind the result, or store a normalised column.";

const pattern = /^sql`.*\blower\s*\(\s*(?:[^h\s]|h[^e]|he[^x]).*$/is;

export default defineRule({
  meta: { type: "problem", schema: [] },
  create(context) {
    return {
      TaggedTemplateExpression(node) {
        if (pattern.test(context.sourceCode.getText(node))) context.report({ node, message });
      },
    };
  },
});
