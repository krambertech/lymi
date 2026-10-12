import { Trans, useLingui } from "@lingui/react/macro";
import { captureAnalytics } from "@lymi/client/analytics";
import { useEffect, useState } from "react";
import { type OriginBadge as Origin, visitorOriginBadge } from "../../lib/origin-badge";

// A national flag's colours are fixed by law, so they stay the same in both themes.
const STRIPES: Record<Origin, readonly string[]> = {
  ukraine: ["#0057b7", "#ffd700"],
  estonia: ["#0072ce", "#000000", "#ffffff"],
};

function Flag({ origin }: { origin: Origin }) {
  const stripes = STRIPES[origin];
  const height = 12 / stripes.length;
  return (
    <svg
      viewBox="0 0 18 12"
      className="h-3 w-[18px] shrink-0 overflow-hidden rounded-[2px] ring-1 ring-edge"
      aria-hidden="true"
    >
      {stripes.map((fill, index) => (
        <rect key={fill} y={index * height} width="18" height={height} fill={fill} />
      ))}
    </svg>
  );
}

/** Where Lymi comes from, shown only to visitors whose browser points to Ukraine or Estonia. */
export function OriginBadge() {
  const { i18n } = useLingui();
  const [origin, setOrigin] = useState<Origin | null>(null);

  useEffect(() => {
    const badge = visitorOriginBadge(i18n.locale);
    setOrigin(badge);
    if (badge) captureAnalytics("origin_badge_shown", { badge });
  }, [i18n.locale]);

  if (!origin) return null;
  return (
    <p className="enter-fade inline-flex h-8 items-center gap-2 rounded-full bg-plate-2 px-3 text-sm text-text-2">
      <Flag origin={origin} />
      {origin === "ukraine" ? <Trans>Ukrainian-made</Trans> : <Trans>Estonian startup</Trans>}
    </p>
  );
}
