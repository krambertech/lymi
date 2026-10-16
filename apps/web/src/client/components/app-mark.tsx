import { type AppIdentity, identifyApp as identify } from "@lymi/client/app-marks";
import { clsx } from "clsx";
import { Plug } from "lucide-react";
import { publicSiteUrl } from "../lib/origins";

export type { AppIdentity };

/** Read the client's identity from its `client_id` URL and whatever name it sent. */
export function identifyApp(clientId: string | undefined, claimedName?: string | null) {
  return identify(clientId, claimedName, publicSiteUrl);
}

/**
 * The app's tile. The same square the lantern sits in, so the two read as a pair. The mark
 * wears its own colour, which is what makes it recognisable; the tile around it stays a plain
 * plate so the colour is the only thing borrowed.
 */
export function AppMark({ app, className }: { app: AppIdentity; className?: string | undefined }) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "edge grid shrink-0 place-items-center rounded-lg bg-plate text-text",
        className,
      )}
    >
      {app.path ? (
        <svg viewBox="0 0 24 24" className="size-1/2" fill={app.brand ?? "currentColor"}>
          <path d={app.path} />
        </svg>
      ) : app.name ? (
        <span className="text-lg font-semibold uppercase text-text-2">{app.name.slice(0, 1)}</span>
      ) : (
        // Nothing to take an initial from, so the tile says "an app" rather than inventing a letter.
        <Plug className="size-1/2 text-muted" />
      )}
    </span>
  );
}
