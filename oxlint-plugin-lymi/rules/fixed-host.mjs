import { defineRule } from "@oxlint/plugins";
import { jsxAttribute, jsxName } from "../ast.mjs";

const message =
  "Give a SwiftUI Host a fixed width and height: one that measures itself keeps a stale place " +
  "when the list around it moves, and its button drifts off its row (#714).";

export default defineRule({
  meta: { type: "problem", schema: [] },
  create(context) {
    let hosts = new Set();
    return {
      Program() {
        hosts = new Set();
      },
      ImportSpecifier(node) {
        if (node.parent.source.value === "@expo/ui/swift-ui" && node.imported.name === "Host") {
          hosts.add(node.local.name);
        }
      },
      JSXOpeningElement(node) {
        if (!hosts.has(jsxName(node.name))) return;
        const measures = jsxAttribute(node, "matchContents");
        if (measures) context.report({ node: measures, message });
      },
    };
  },
});
