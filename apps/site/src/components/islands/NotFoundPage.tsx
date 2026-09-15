import { I18nProvider } from "@lingui/react";
import { useLayoutEffect, useMemo, useState } from "react";
import { pageI18n } from "../../lib/i18n";
import { type Locale, locales } from "../../lib/routes";
import { NotFoundView } from "../landing/NotFoundView";

/** One 404 serves every path, so the locale comes from the missing URL's prefix. */
export default function NotFoundPage() {
  const [locale, setLocale] = useState<Locale>("en");

  useLayoutEffect(() => {
    const prefix = window.location.pathname.split("/")[1] ?? "";
    const found = locales.find((l) => l !== "en" && l === prefix);
    if (!found) return;
    document.documentElement.lang = found;
    setLocale(found);
  }, []);

  const i18n = useMemo(() => pageI18n(locale), [locale]);

  return (
    <I18nProvider i18n={i18n}>
      <NotFoundView locale={locale} />
    </I18nProvider>
  );
}
