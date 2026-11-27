import { defineRule } from "@oxlint/plugins";
import { isIdentifierNamed, someDescendant } from "../ast.mjs";

const message =
  'A menu row that archives, deletes, removes or signs out is variant="danger" ' +
  "(docs/design/system/overlays.md, Menus).";

const icons = ["Archive", "Trash2", "LogOut", "UserMinus"];

export default defineRule({
  meta: { type: "problem", schema: [] },
  create(context) {
    const { sourceCode } = context;
    return {
      JSXElement({ openingElement, children }) {
        if (!isIdentifierNamed(openingElement.name, "DropdownMenuItem")) return;
        const hasVariant = openingElement.attributes.some(
          (attribute) =>
            attribute.type === "JSXAttribute" &&
            attribute.name.name === "variant" &&
            attribute.value?.value !== "default",
        );
        if (hasVariant) return;
        const removes = someDescendant(
          sourceCode,
          children,
          (child) =>
            child.type === "JSXOpeningElement" &&
            icons.some((icon) => isIdentifierNamed(child.name, icon)),
        );
        const opensArchive = someDescendant(
          sourceCode,
          children,
          (child) =>
            (child.type === "JSXText" && child.value.trim().startsWith("Archived")) ||
            (child.type === "TemplateElement" && child.value.raw.startsWith("Archived")),
        );
        if (removes && !opensArchive) context.report({ node: openingElement, message });
      },
    };
  },
});
