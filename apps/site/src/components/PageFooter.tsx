import { I18nProvider } from "@lingui/react";
import { pageI18n } from "../lib/i18n";
import { openLymiUrl } from "../lib/origins";
import type { LanguageTarget } from "./LanguageLinks";
import { SiteFooter } from "./landing/SiteFooter";

/** The site footer for a page drawn in Astro, rendered once on the server: it has nothing to hydrate. */
export function PageFooter({ locale, ...target }: { locale: string } & LanguageTarget) {
  return (
    <I18nProvider i18n={pageI18n(locale)}>
      <div className="@container">
        <SiteFooter openAppUrl={openLymiUrl()} {...target} />
      </div>
    </I18nProvider>
  );
}
