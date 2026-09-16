import { I18nProvider } from "@lingui/react";
import { pageI18n } from "../../lib/i18n";
import { productUrl } from "../../lib/origins";
import { SiteNav } from "../landing/SiteNav";

interface Props {
  locale: string;
}

/**
 * The marketing top bar for a page rendered per request, in the page's language. A published deck
 * admits anyone who adds it, so the bar leaves out Request access and the page has one way in.
 */
export default function PublicNav({ locale }: Props) {
  return (
    <I18nProvider i18n={pageI18n(locale)}>
      <SiteNav openAppUrl={productUrl()} joinHref={null} />
    </I18nProvider>
  );
}
