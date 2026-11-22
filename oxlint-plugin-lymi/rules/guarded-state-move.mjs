import { defineRule } from "@oxlint/plugins";
import { isFunctionCall, isMethodCall } from "../ast.mjs";

const dropped =
  "moveState writes nothing when another writer moved the row first, so dropping its rows reports " +
  "a move that may not have happened (#1164, #1231). Read the rows it returns, through the batch's " +
  "result when it runs in one, and handle an empty list.";

const raw =
  "Raw SQL that sets a status skips the legal moves in apps/web/src/server/state-machines.ts (#1164). " +
  "Use moveState, which names the status it leaves.";

const setsStatus =
  /\bupdate\s+(?:or\s+\w+\s+)?(?:(?:["\w]+|\$\{[^}]*\})\s+)?set\b(?:(?:(?!\bwhere\b).)*?,)?\s*(?:\$\{[\w.]*|")?\w*(?:status|outcome)[}"]?\s*=/is;

const passesItOn = new Set([
  "ArrayExpression",
  "AwaitExpression",
  "ConditionalExpression",
  "LogicalExpression",
  "SpreadElement",
  "TSAsExpression",
  "TSNonNullExpression",
  "UnaryExpression",
]);

function runsStatements(node) {
  return (
    isMethodCall(node, "batch") ||
    isFunctionCall(node, "runBatch") ||
    isFunctionCall(node, "runInBatches")
  );
}

function losesItsRows(node) {
  return isFunctionCall(node, "runBatch") || isFunctionCall(node, "runInBatches");
}

export default defineRule({
  meta: { type: "problem", schema: [] },
  create(context) {
    return {
      CallExpression(node) {
        if (!isFunctionCall(node, "moveState")) return;
        let outer = node.parent;
        while (passesItOn.has(outer.type) || runsStatements(outer)) {
          if (losesItsRows(outer)) break;
          outer = outer.parent;
        }
        if (outer.type === "ExpressionStatement" || losesItsRows(outer)) {
          context.report({ node: node.callee, message: dropped });
        }
      },
      TemplateLiteral(node) {
        if (setsStatus.test(context.sourceCode.getText(node))) {
          context.report({ node, message: raw });
        }
      },
      Literal(node) {
        if (typeof node.value === "string" && setsStatus.test(node.value)) {
          context.report({ node, message: raw });
        }
      },
    };
  },
});
