import type { ReactNode } from "react";
import { openLymiUrl } from "../../lib/origins";
import type { LocalizedPage } from "../../lib/routes";
import { SiteFooter } from "./SiteFooter";
import { SiteNav } from "./SiteNav";

interface Props {
  /** The nav marks this page, and the footer links it in each language. */
  page: LocalizedPage;
  /** The top of the page, under the nav. */
  hero: ReactNode;
  /** The page's sections. */
  children: ReactNode;
}

/** The frame every landing page shares: the nav over its hero, the sections, and the footer. */
export function LandingLayout({ page, hero, children }: Props) {
  const openAppUrl = openLymiUrl();
  return (
    <div className="@container min-h-dvh overflow-x-clip bg-canvas text-ink">
      <header>
        <SiteNav openAppUrl={openAppUrl} current={page} />
        {hero}
      </header>

      <main>{children}</main>

      <SiteFooter openAppUrl={openAppUrl} page={page} />
    </div>
  );
}
