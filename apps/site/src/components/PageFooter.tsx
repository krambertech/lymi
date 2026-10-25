import { openLymiUrl } from "../lib/origins";
import type { LanguageTarget } from "./LanguageLinks";
import { Localized } from "./Localized";
import { SiteFooter } from "./landing/SiteFooter";

/** The site footer for a page drawn in Astro, rendered once on the server: it has nothing to hydrate. */
export function PageFooter({ locale, ...target }: { locale: string } & LanguageTarget) {
  return (
    <Localized locale={locale}>
      <div className="@container">
        <SiteFooter openAppUrl={openLymiUrl()} {...target} />
      </div>
    </Localized>
  );
}
