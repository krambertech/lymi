import { I18nProvider } from "@lingui/react";
import { pageI18n } from "../../lib/i18n";
import { openLymiUrl } from "../../lib/origins";
import type { Locale } from "../../lib/routes";
import { SiteFooter } from "../landing/SiteFooter";

interface Props {
  locale: string;
  /** One update's page in each language; the changelog itself when absent. */
  paths?: Record<Locale, string> | undefined;
}

/** The site footer, rendered once on the server: it has nothing to hydrate. */
export function ChangelogFooter({ locale, paths }: Props) {
  return (
    <I18nProvider i18n={pageI18n(locale)}>
      <div className="@container">
        {paths ? (
          <SiteFooter openAppUrl={openLymiUrl()} paths={paths} />
        ) : (
          <SiteFooter openAppUrl={openLymiUrl()} page="changelog" />
        )}
      </div>
    </I18nProvider>
  );
}
