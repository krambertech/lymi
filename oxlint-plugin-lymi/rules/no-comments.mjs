import { existsSync, readFileSync, realpathSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineRule } from "@oxlint/plugins";
import { BASELINE, GENERATED, isDirective, SOURCE } from "../comments.mjs";

const root = realpathSync(fileURLToPath(new URL("../..", import.meta.url)));
const baselines = new Map();

function allowance(path) {
  if (!baselines.has(path)) {
    baselines.set(path, existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {});
  }
  return baselines.get(path);
}

export default defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Reject source comments beyond what scripts/comment-baseline.json still allows a file.",
    },
    schema: [
      {
        type: "object",
        properties: { root: { type: "string" }, baseline: { type: "string" } },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = context.options[0] ?? {};
    const base = options.root ? realpathSync(resolve(options.root)) : root;
    const file = relative(base, context.filename).split("\\").join("/");
    if (!SOURCE.test(file) || GENERATED.test(file)) return {};
    const allowed = allowance(resolve(base, options.baseline ?? BASELINE))[file] ?? 0;
    const comments = context.sourceCode
      .getAllComments()
      .filter((comment) => comment.type === "Line" || comment.type === "Block")
      .filter((comment) => {
        const text = comment.type === "Line" ? `//${comment.value}` : `/*${comment.value}*/`;
        return !isDirective(text);
      });
    const lines = comments.reduce(
      (sum, comment) => sum + comment.loc.end.line - comment.loc.start.line + 1,
      0,
    );
    if (lines <= allowed) return {};
    const message =
      allowed === 0
        ? "Write no comments: say the reason in a name, a type, a test, or the doc or ADR that owns it (CODING_STANDARDS.md#write-no-comments)."
        : `This file has ${lines} comment lines and may keep ${allowed}. Delete one rather than adding one (CODING_STANDARDS.md#write-no-comments).`;
    for (const comment of allowed === 0 ? comments : comments.slice(-1)) {
      context.report({ loc: comment.loc, message });
    }
    return {};
  },
});
