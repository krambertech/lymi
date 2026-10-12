import { Trans } from "@lingui/react/macro";
import { captureAnalytics } from "@lymi/client/analytics";
import { clsx } from "clsx";
import { type ReactNode, useEffect } from "react";
import { type OriginBadge as Origin, shownOriginBadge } from "../../lib/origin-badge";

// A national flag's colours are fixed by law, so they stay the same in both themes.
const STRIPES: Record<Origin, readonly string[]> = {
  ukraine: ["#0057b7", "#ffd700"],
  estonia: ["#0072ce", "#000000", "#ffffff"],
};

// BaseLayout's pre-paint script sets data-origin, so the badge takes its space before the title is drawn.
const SHOWN: Record<Origin, string> = {
  ukraine: "in-data-[origin=ukraine]:flex",
  estonia: "in-data-[origin=estonia]:flex",
};

function Badge({ origin, children }: { origin: Origin; children: ReactNode }) {
  const stripes = STRIPES[origin];
  const height = 12 / stripes.length;
  return (
    <p
      className={clsx(
        "edge mb-6 hidden h-8 w-fit items-center gap-2 rounded-full bg-plate ps-2.5 pe-3.5 text-sm font-medium text-text",
        SHOWN[origin],
      )}
    >
      <svg
        viewBox="0 0 18 12"
        className="h-3.5 w-[21px] shrink-0 overflow-hidden rounded-[2px] ring-1 ring-edge"
        aria-hidden="true"
      >
        {stripes.map((fill, index) => (
          <rect key={fill} y={index * height} width="18" height={height} fill={fill} />
        ))}
      </svg>
      {children}
    </p>
  );
}

/** Where Lymi comes from, shown only to visitors whose browser points to Ukraine or Estonia. */
export function OriginBadge() {
  useEffect(() => {
    const badge = shownOriginBadge();
    if (badge) captureAnalytics("origin_badge_shown", { badge });
  }, []);

  return (
    <>
      <Badge origin="ukraine">
        <Trans>Made by Ukrainians</Trans>
      </Badge>
      <Badge origin="estonia">
        <Trans>Estonian startup</Trans>
      </Badge>
    </>
  );
}
