import { i18n, type Messages } from "@lingui/core";

/**
 * The document carries one catalog, the learner's app language, which the server writes into
 * it when the host reads the resource. Bundling all three would triple the view's size.
 */
export function bootstrapI18n(): void {
  const element = document.getElementById("lymi-messages");
  let locale = document.documentElement.lang || "en";
  let messages: Messages = {};
  try {
    const parsed = JSON.parse(element?.textContent ?? "{}") as {
      locale?: string;
      messages?: Messages;
    };
    locale = parsed.locale ?? locale;
    messages = parsed.messages ?? {};
  } catch {}
  i18n.load(locale, messages);
  i18n.activate(locale);
  document.documentElement.lang = locale;
}
