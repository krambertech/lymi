import { useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { useState } from "react";
import { AppTile } from "./logo";

/**
 * A published deck's publisher: their photo, the lantern for Lymi's own decks, or one letter on
 * a plate. Publishing is what makes the photo public, so it never comes from the learner Avatar,
 * whose image is the account's own. The public deck page draws the same mark.
 */
export function PublisherMark({
  name,
  src,
  size = 24,
  className,
}: {
  name: string;
  src?: string | null | undefined;
  size?: number | undefined;
  className?: string | undefined;
}) {
  const { i18n } = useLingui();
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        draggable={false}
        onError={() => setFailed(true)}
        className={clsx("edge shrink-0 rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  if (name.trim().toLowerCase() === "lymi") return <AppTile size={size} className={className} />;
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "grid shrink-0 place-items-center rounded-full bg-text font-semibold text-canvas",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {name.trim().charAt(0).toLocaleUpperCase(i18n.locale)}
    </span>
  );
}
