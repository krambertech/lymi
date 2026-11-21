import { defineRule } from "@oxlint/plugins";

const message =
  "Learner text in interface text can run right to left and reorder the sentence around it. " +
  "Isolate it with a labelled placeholder, which keeps the message: ${{ term: isolate(term) }} " +
  "in t or msg, {{ term: isolate(term) }} in <Trans>, or isolate(card.term) for a property. " +
  "docs/proposals/right-to-left.md.";

const learnerText =
  "(?:[\\w?]+\\.)*(?:\\w*[tT]erm|\\w*[mM]eaning|[eE]xample|\\w*[nN]otes?|\\w*[qQ]uery|typed|cue|" +
  "tag|deck|quoted|owner|\\w*[nN]ame)";

const patterns = [
  /^(?:t|msg)\s*`.*\$\{\s*shortQuote\(.*$/s,
  new RegExp(`^(?:t|msg)\\s*\`.*\\$\\{\\s*${learnerText}(?:\\s*\\?\\?\\s*"[^"]*")?\\s*\\}.*$`, "s"),
  new RegExp(
    `^<Trans\\b(?:[^>]*>\\s*|.*(?:[^>]|<(?:strong|em|b|i|span)\\b[^>]*>))` +
      `\\{\\s*${learnerText}\\s*\\}.*$`,
    "s",
  ),
];

const accessibleName = /^(?:aria-label|accessibilityLabel|accessibilityHint)$/;

export default defineRule({
  meta: { type: "problem", schema: [] },
  create(context) {
    const { sourceCode } = context;
    const insideAccessibleName = (node) => {
      for (let parent = node.parent; parent; parent = parent.parent) {
        if (
          parent.type === "JSXAttribute" &&
          accessibleName.test(sourceCode.getText(parent.name))
        ) {
          return true;
        }
      }
      return false;
    };
    const check = (node) => {
      const text = sourceCode.getText(node);
      if (!patterns.some((pattern) => pattern.test(text))) return;
      if (insideAccessibleName(node)) return;
      context.report({ node, message });
    };
    return {
      TaggedTemplateExpression: check,
      JSXElement(node) {
        if (node.closingElement) check(node);
      },
    };
  },
});
