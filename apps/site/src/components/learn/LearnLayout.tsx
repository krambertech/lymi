import type { CSSProperties, ReactNode } from "react";
import { openLymiUrl } from "../../lib/origins";
import { SiteFooter } from "../landing/SiteFooter";
import { SiteNav } from "../landing/SiteNav";
import type { LanguageTarget } from "../LanguageLinks";

interface Props {
  /** Where the footer's language links go: the hub's page, or a lesson's own paths. */
  languages: LanguageTarget;
  /** The stage's hue; the hub has none of its own. */
  hue?: number | undefined;
  children: ReactNode;
}

/** The site's nav and footer around the lessons, with the stage's hue set for everything inside. */
export function LearnLayout({ languages, hue, children }: Props) {
  const openAppUrl = openLymiUrl();
  return (
    <div
      className="learn @container min-h-dvh overflow-x-clip bg-canvas text-ink"
      style={hue === undefined ? undefined : ({ "--h": hue } as CSSProperties)}
    >
      <SiteNav openAppUrl={openAppUrl} />
      <main>{children}</main>
      <SiteFooter openAppUrl={openAppUrl} {...languages} />
    </div>
  );
}
