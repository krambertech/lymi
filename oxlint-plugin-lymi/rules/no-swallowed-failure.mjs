import { defineRule } from "@oxlint/plugins";
import { descendants } from "../ast.mjs";

const message =
  "This drops the error, so nobody learns why the work failed (#896, #941, #1091). Rethrow it, " +
  "narrow to the error you expect and rethrow the rest, pass it on as a cause, or report it: " +
  "log.warn, log.error or logFailure from server/log.ts, or reportServerException from " +
  "server/posthog.ts. For text that may not parse, use parseJson, bodyJson, bodyFields, " +
  "jwtClaims, decodeBase64 or languageName from server/parse.ts, or URL.parse.";

function namesIn(sourceCode, pattern) {
  const names = new Set();
  if (!pattern) return names;
  for (const node of descendants(sourceCode, pattern)) {
    if (node.type === "Identifier") names.add(node.name);
  }
  return names;
}

function isUse(node) {
  const { parent } = node;
  if (parent.type === "UnaryExpression") return parent.operator !== "void";
  if (parent.type === "MemberExpression") return parent.object === node || parent.computed;
  if (parent.type === "Property") return parent.value === node || parent.computed;
  return true;
}

function usesName(sourceCode, body, names) {
  if (names.size === 0) return false;
  for (const node of descendants(sourceCode, body)) {
    if (node.type === "Identifier" && names.has(node.name) && isUse(node)) return true;
  }
  return false;
}

function declaredFunction(sourceCode, identifier) {
  for (let scope = sourceCode.getScope(identifier); scope; scope = scope.upper) {
    const node = scope.set.get(identifier.name)?.defs[0]?.node;
    if (node) return node.type === "VariableDeclarator" ? node.init : node;
  }
  return null;
}

function handlerOf(sourceCode, argument) {
  const found = argument?.type === "Identifier" ? declaredFunction(sourceCode, argument) : argument;
  return found && /Function(?:Expression|Declaration)$/.test(found.type) ? found : null;
}

function drops(sourceCode, pattern, body) {
  return !usesName(sourceCode, body, namesIn(sourceCode, pattern));
}

function methodName(node) {
  return node.callee.type === "MemberExpression" && !node.callee.computed
    ? node.callee.property.name
    : undefined;
}

function unused(node) {
  const held = node.parent.type === "AwaitExpression" ? node.parent : node;
  if (held.parent.type === "ExpressionStatement") return true;
  return held.parent.type === "CallExpression" && methodName(held.parent) === "waitUntil";
}

export default defineRule({
  meta: { type: "problem", schema: [] },
  create(context) {
    const { sourceCode } = context;
    return {
      CatchClause(node) {
        if (drops(sourceCode, node.param, node.body)) context.report({ node, message });
      },
      CallExpression(node) {
        const method = methodName(node);
        if (method === "allSettled" && unused(node)) context.report({ node, message });
        if (method !== "catch" && method !== "then") return;
        const argument = node.arguments[method === "catch" ? 0 : 1];
        const handler = handlerOf(sourceCode, argument);
        if (handler && drops(sourceCode, handler.params[0], handler.body)) {
          context.report({ node: argument, message });
        }
      },
    };
  },
});
