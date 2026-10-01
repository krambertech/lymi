import { i18n, type Messages } from "@lingui/core";

/**
 * The document carries one catalog, the learner's app language, which the server writes into
 * it when the host reads the resource. Bundling all three would triple the view's size.
 */
export function bootstrapI18n(): void {
  const element = document.getElementById("lymi-messages");
  if (!element?.textContent) throw new Error("The view document has no catalog");
  const { locale, messages } = JSON.parse(element.textContent) as {
    locale: string;
    messages: Messages;
  };
  i18n.load(locale, messages);
  i18n.activate(locale);
}
