import { defineRule } from "@oxlint/plugins";
import { isFunctionCall } from "../ast.mjs";

const message =
  "A screen draws a term with TermText and an example with ExampleText from term-text.tsx, " +
  "which choose how the card's language draws its reading. Ask drawsTermReading(card) or " +
  "hasReadings(text, language) for layout.";

export default defineRule({
  meta: { type: "problem", schema: [] },
  create(context) {
    return {
      CallExpression(node) {
        if (
          isFunctionCall(node, "termReading") ||
          isFunctionCall(node, "parseReadings") ||
          (isFunctionCall(node, "exampleSegments") && node.arguments.length === 2)
        ) {
          context.report({ node, message });
        }
      },
    };
  },
});
