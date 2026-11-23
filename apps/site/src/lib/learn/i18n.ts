import { type I18n, type Messages, setupI18n } from "@lingui/core";
import { pageI18n } from "../i18n";

const CATALOGS = import.meta.glob<{ messages: Messages }>("../../locales/learn/*/*.po");

async function messages(part: string, locale: string): Promise<Messages> {
  const load = CATALOGS[`../../locales/learn/${part}/${locale}.po`];
  if (!load) throw new Error(`No ${locale} catalog for the lessons' ${part}`);
  return (await load()).messages;
}

export async function learnI18n(locale: string, lesson?: string): Promise<I18n> {
  const site = pageI18n(locale);
  const parts = lesson ? ["Kit", lesson] : ["Kit"];
  const own = await Promise.all(parts.map((part) => messages(part, site.locale)));
  return setupI18n({
    locale: site.locale,
    messages: { [site.locale]: Object.assign({}, site.messages, ...own) },
  });
}
