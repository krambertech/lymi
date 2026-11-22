import { defineRule } from "@oxlint/plugins";
import { isStaticMember } from "../ast.mjs";

const message =
  "Use useClip() from this app's lib/use-clip.ts (apps/site/src/lib or apps/web/src/client/lib). " +
  "An audio element made anywhere else plays on and keeps its frame loop after its component " +
  "unmounts, and talks over the next clip (#1069, #1141).";

function isAudioConstructor(callee) {
  return (
    (callee.type === "Identifier" && callee.name === "Audio") ||
    ["window", "globalThis", "self"].some((global) => isStaticMember(callee, global, "Audio"))
  );
}

function createsAudio({ callee, arguments: [tag] }) {
  return (
    isStaticMember(callee, "document", "createElement") &&
    tag?.type === "Literal" &&
    tag.value === "audio"
  );
}

export default defineRule({
  meta: { type: "problem", schema: [] },
  create(context) {
    return {
      NewExpression(node) {
        if (isAudioConstructor(node.callee)) context.report({ node, message });
      },
      CallExpression(node) {
        if (createsAudio(node)) context.report({ node, message });
      },
    };
  },
});
