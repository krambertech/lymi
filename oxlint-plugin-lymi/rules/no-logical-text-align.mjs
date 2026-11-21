import { defineRule } from "@oxlint/plugins";

const message =
  "React Native ignores text-end and text-start, so the text stays at the start. Use " +
  "style={TEXT_END} from src/theme/type.ts, or align the parent with items-end.";

const pattern = /^.*\b(?:text-end|text-start)\b.*$/;

const notExpressions = new Set([
  "ImportDeclaration",
  "ExportNamedDeclaration",
  "ExportAllDeclaration",
  "ImportSpecifier",
  "ExportSpecifier",
  "ImportAttribute",
  "TSLiteralType",
  "TSEnumMember",
  "TSModuleDeclaration",
  "TSExternalModuleReference",
]);

const keyed = new Set([
  "Property",
  "MethodDefinition",
  "PropertyDefinition",
  "AccessorProperty",
  "TSPropertySignature",
  "TSMethodSignature",
  "TSAbstractMethodDefinition",
  "TSAbstractPropertyDefinition",
  "TSAbstractAccessorProperty",
]);

function isStringExpression(node) {
  if (typeof node.value !== "string") return false;
  const { parent } = node;
  if (notExpressions.has(parent.type)) return false;
  if (keyed.has(parent.type) && parent.key === node && !parent.computed) return false;
  if (parent.type === "ExpressionStatement" && parent.directive != null) return false;
  return true;
}

export default defineRule({
  meta: { type: "problem", schema: [] },
  create(context) {
    const check = (node) => {
      if (pattern.test(context.sourceCode.getText(node))) context.report({ node, message });
    };
    return {
      Literal(node) {
        if (isStringExpression(node)) check(node);
      },
      TemplateElement: check,
    };
  },
});
