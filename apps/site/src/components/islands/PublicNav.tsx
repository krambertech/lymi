import { openLymiUrl } from "../../lib/origins";
import type { LocalizedPage } from "../../lib/routes";
import { Localized } from "../Localized";
import { SiteNav } from "../landing/SiteNav";

interface Props {
  locale: string;
  current?: LocalizedPage | undefined;
}

/**
 * The marketing top bar for a page rendered per request, in the page's language. A published deck
 * admits anyone who adds it, so the bar leaves out Get started and the page has one way in.
 */
export default function PublicNav({ locale, current }: Props) {
  return (
    <Localized locale={locale}>
      <SiteNav openAppUrl={openLymiUrl()} current={current} signUpHref={null} />
    </Localized>
  );
}
