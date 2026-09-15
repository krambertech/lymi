import { I18nProvider } from "@lingui/react";
import { pageI18n } from "../../lib/i18n";
import { productUrl } from "../../lib/origins";
import { localizedPath } from "../../lib/routes";
import { SiteNav } from "../landing/SiteNav";

interface Props {
  locale: string;
}

/** The marketing top bar for a page rendered per request, in the page's language. */
export default function PublicNav({ locale }: Props) {
  return (
    <I18nProvider i18n={pageI18n(locale)}>
      <SiteNav openAppUrl={productUrl()} joinHref={localizedPath("join", locale)} />
    </I18nProvider>
  );
}
