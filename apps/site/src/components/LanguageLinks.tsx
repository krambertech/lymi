import { useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { type Locale, type LocalizedPage, localizedPath, pageLocales } from "../lib/routes";
import { Localized } from "./Localized";

const languages = [
  { locale: "en", label: "English" },
  { locale: "uk", label: "Українська" },
  { locale: "ru", label: "Русский" },
] as const;

/** A fixed page, or a page rendered per request, such as a published deck, by the locales that have it. */
export type LanguageTarget = { page: LocalizedPage } | { paths: Partial<Record<Locale, string>> };

/** Language names stay in their own language so every visitor can find theirs. */
export function LanguageLinks({
  className = "mx-auto mt-6 max-w-[1040px]",
  ...target
}: LanguageTarget & { className?: string | undefined }) {
  const { t, i18n } = useLingui();

  return (
    <nav
      aria-label={t`Language`}
      className={clsx("flex flex-wrap gap-4 text-xs text-ink-muted", className)}
    >
      {languages.map(({ locale, label }) => {
        const href =
          "paths" in target
            ? target.paths[locale]
            : pageLocales(target.page).includes(locale)
              ? localizedPath(target.page, locale)
              : undefined;
        if (!href) return null;
        return (
          <a
            key={locale}
            href={href}
            hrefLang={locale}
            lang={locale}
            aria-current={i18n.locale === locale ? "page" : undefined}
            className="rounded-xs hoverable:hover:text-ink aria-[current=page]:font-medium aria-[current=page]:text-ink"
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
    <Localized locale={locale}>
      <LanguageLinks page={page} />
    </Localized>
  );
}
