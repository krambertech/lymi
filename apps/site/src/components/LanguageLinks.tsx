import { I18nProvider } from "@lingui/react";
import { useLingui } from "@lingui/react/macro";
import { pageI18n } from "../lib/i18n";
import { type Locale, type LocalizedPage, localizedPath } from "../lib/routes";

const languages = [
  { locale: "en", label: "English" },
  { locale: "uk", label: "Українська" },
  { locale: "ru", label: "Русский" },
] as const;

/** A fixed page, or the paths of a page rendered per request, such as a published deck. */
export type LanguageTarget = { page: LocalizedPage } | { paths: Record<Locale, string> };

/** Language names stay in their own language so every visitor can find theirs. */
export function LanguageLinks(target: LanguageTarget) {
  const { t, i18n } = useLingui();

  return (
    <nav
      aria-label={t`Language`}
      className="mx-auto mt-6 flex max-w-[1040px] flex-wrap gap-4 text-xs text-muted"
    >
      {languages.map(({ locale, label }) => {
        return (
          <a
            key={locale}
            href={"paths" in target ? target.paths[locale] : localizedPath(target.page, locale)}
            hrefLang={locale}
            lang={locale}
            aria-current={i18n.locale === locale ? "page" : undefined}
            className="rounded-xs hoverable:hover:text-text aria-[current=page]:font-medium aria-[current=page]:text-text"
          >
            {label}
          </a>
        );
      })}
    </nav>
  );
}

export function LocalizedLanguageLinks({ page, locale }: { page: LocalizedPage; locale: string }) {
  return (
    <I18nProvider i18n={pageI18n(locale)}>
      <LanguageLinks page={page} />
    </I18nProvider>
  );
}
