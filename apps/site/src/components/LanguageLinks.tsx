import { useLingui } from "@lingui/react/macro";
import { type LocalizedPage, localizedPath } from "../lib/routes";

const languages = [
  { locale: "en", label: "English" },
  { locale: "uk", label: "Українська" },
  { locale: "ru", label: "Русский" },
] as const;

interface Props {
  page: LocalizedPage;
}

/** Language names stay in their own language so every visitor can find theirs. */
export function LanguageLinks({ page }: Props) {
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
            href={localizedPath(page, locale)}
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
