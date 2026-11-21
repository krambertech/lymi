import { defineRule } from "@oxlint/plugins";

const message =
  "Language behaviour comes from the card's tag through packages/core/src/languages, the one " +
  "place that compares language codes. Ask it, as in drawsReadings(tag) or languageScript(tag), " +
  "or add what you need to the record.";

const tag = `["'](?:ja|zh)(?:-[\\w-]+)?["']`;
const subject = "(?:languageKey\\(.*\\)|.*\\.language|lang|language)";

const patterns = [
  new RegExp(`^${subject}\\s*[!=]==?\\s*${tag}$`, "s"),
  new RegExp(`^${tag}\\s*[!=]==?\\s*${subject}$`, "s"),
  new RegExp(`^case\\s+${tag}\\s*:.*$`, "s"),
  new RegExp(`^new\\s+(?:Set|Map)\\b.*${tag}.*$`, "s"),
  new RegExp(`^\\[[^\\]]*${tag}[^\\]]*\\]\\s*\\.\\s*includes\\s*\\(.*$`, "s"),
];

export default defineRule({
  meta: { type: "problem", schema: [] },
  create(context) {
    const check = (node) => {
      const text = context.sourceCode.getText(node);
      if (patterns.some((pattern) => pattern.test(text))) context.report({ node, message });
    };
    return {
      BinaryExpression: check,
      SwitchCase: check,
      NewExpression: check,
      CallExpression: check,
    };
  },
});
