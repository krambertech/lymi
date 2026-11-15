import { openLymiUrl } from "../../lib/origins";
import { Localized } from "../Localized";
import { SiteNav } from "../landing/SiteNav";

/** The marketing top bar on pages that are not built from landing sections, such as the policies. */
export default function SiteHeader({ locale = "en" }: { locale?: string }) {
  return (
    <Localized locale={locale}>
      <div className="@container border-b border-edge pb-5 @2xl:pb-6">
        <SiteNav openAppUrl={openLymiUrl()} />
      </div>
    </Localized>
  );
}
