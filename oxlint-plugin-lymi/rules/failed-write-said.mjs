import { defineRule } from "@oxlint/plugins";
import { isFunctionCall, isMethodCall, isStaticMember, someDescendant } from "../ast.mjs";

const shownTwice =
  "The code here handles this mutation's failure itself, and the app's own message would show " +
  'too. Say who shows it: meta: { failure: "inline" } when this component renders the error, or ' +
  '{ failure: "caller" } when an awaiting caller or its onError always says it (#1041).';

const shownNowhere =
  'Nothing here reads this mutation\'s error, so meta: { failure: "inline" } leaves a failed ' +
  "write unsaid. Render error or isError, or drop meta and the app's message says it (#1041).";

const rolledBack =
  "An onError turns off the app's failure message, and this one ignores the error and says " +
  'nothing. Add meta: { failure: "inline" } and render the error, or { failure: "silent", ' +
  "because } when the learner did not ask for this write (#1041).";

const gone =
  "An onError passed to mutate runs only while its component is mounted, and the mutation cannot " +
  "see it. Put it in useMutation's options, or render the mutation's error (#960).";

const FAILURE = new Set(["error", "isError", "failureReason", "mutateAsync"]);

const keyName = (property) =>
  property.type === "Property" && !property.computed
    ? (property.key.name ?? property.key.value)
    : undefined;

const propertyNamed = (object, name) =>
  object.properties.find((property) => keyName(property) === name);

const isFunction = (node) =>
  node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression";

export default defineRule({
  meta: { type: "problem", schema: [] },
  create(context) {
    const { sourceCode } = context;

    const ignoresError = (handler) => {
      if (!isFunction(handler)) return false;
      const [error] = handler.params;
      const unused = !error || (error.type === "Identifier" && error.name.startsWith("_"));
      return (
        unused &&
        !someDescendant(
          sourceCode,
          [handler.body],
          (node) =>
            node.type === "CallExpression" &&
            (isStaticMember(node.callee, "toast", "add") || isFunctionCall(node, "alert")),
        )
      );
    };

    const reads = (declarator) => {
      if (declarator.id.type === "ObjectPattern") {
        const names = declarator.id.properties.map(keyName);
        return {
          failure: names.some((name) => FAILURE.has(name)),
          escapes: names.includes(undefined),
        };
      }
      const [variable] = sourceCode.getDeclaredVariables(declarator);
      let failure = false;
      let escapes = false;
      for (const { identifier, init } of variable.references) {
        if (init) continue;
        const { parent } = identifier;
        if (parent.type !== "MemberExpression" || parent.object !== identifier || parent.computed) {
          escapes = true;
        } else if (FAILURE.has(parent.property.name)) {
          failure = true;
        }
      }
      return { failure, escapes };
    };

    return {
      CallExpression(node) {
        if (isMethodCall(node, "mutate")) {
          const options = node.arguments[1];
          const onError = options?.type === "ObjectExpression" && propertyNamed(options, "onError");
          if (onError) context.report({ node: onError.key, message: gone });
          return;
        }
        if (!isFunctionCall(node, "useMutation")) return;
        const [options] = node.arguments;
        if (options?.type !== "ObjectExpression") return;
        const meta = propertyNamed(options, "meta")?.value;
        const onError = propertyNamed(options, "onError")?.value;
        if (!meta && onError && ignoresError(onError)) {
          context.report({ node: onError, message: rolledBack });
        }
        if (node.parent.type !== "VariableDeclarator") return;
        const { failure, escapes } = reads(node.parent);
        if (failure && !meta) context.report({ node: node.parent.id, message: shownTwice });
        const shown = meta?.type === "ObjectExpression" && propertyNamed(meta, "failure")?.value;
        if (shown && shown.value === "inline" && !failure && !escapes) {
          context.report({ node: meta, message: shownNowhere });
        }
      },
    };
  },
});
