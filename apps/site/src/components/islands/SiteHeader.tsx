import { I18nProvider } from "@lingui/react";
import { pageI18n } from "../../lib/i18n";
import { productUrl } from "../../lib/origins";
import { localizedPath } from "../../lib/routes";
import { SiteNav } from "../landing/SiteNav";

/** The marketing top bar on pages that are not built from landing sections, such as the policies. */
export default function SiteHeader({ locale = "en" }: { locale?: string }) {
  return (
    <I18nProvider i18n={pageI18n(locale)}>
      <div className="@container border-b border-edge pb-5 @2xl:pb-6">
        <SiteNav openAppUrl={productUrl()} joinHref={localizedPath("join", locale)} />
      </div>
    </I18nProvider>
  );
}
