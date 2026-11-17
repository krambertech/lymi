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
  /** A wash behind the nav and the hero, such as a comparison page's light. */
  backdrop?: ReactNode;
}

/** The frame every landing page shares: the nav over its hero, the sections, and the footer. */
export function LandingLayout({ page, hero, children, backdrop }: Props) {
  const openAppUrl = openLymiUrl();
  return (
    <div className="@container min-h-dvh overflow-x-clip bg-canvas text-ink">
      <header className={backdrop ? "relative isolate" : undefined}>
        {backdrop}
        <SiteNav openAppUrl={openAppUrl} current={page} />
        {hero}
      </header>

      <main>{children}</main>

      <SiteFooter openAppUrl={openAppUrl} page={page} />
    </div>
  );
}
