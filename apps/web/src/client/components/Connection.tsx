import { clsx } from "clsx";
import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { type AppIdentity, AppMark } from "./AppMark";
import { Lantern } from "./Lantern";

export type ConnectionState = "asking" | "connected" | "refused";

/**
 * The app that asked and the lantern, joined by a rail. While the decision is open the rail
 * is a dotted track; when the grant lands it draws across in amber and the lantern lights up.
 * The lantern waits for the rail to arrive, so the two read as one movement rather than two.
 */
export function Connection({
  app,
  state,
  className,
}: {
  app: AppIdentity;
  state: ConnectionState;
  className?: string | undefined;
}) {
  const connected = state === "connected";
  // Long enough that the rail is nearly across when the wick catches, short enough that the
  // two still read as one movement.
  const lit = useLagged(connected, 300);

  return (
    <div className={clsx("flex items-center justify-center", className)} aria-hidden="true">
      <AppMark app={app} className="size-16" />
      <span className="relative mx-2 block h-0.5 w-12 overflow-hidden rounded-full">
        {/* Dotted while nothing has been granted, so a refusal reads as a link never made. */}
        <span
          className={clsx(
            "rail-track absolute inset-0 transition-opacity duration-300",
            state === "refused" && "opacity-50",
          )}
        />
        {connected && <span className="rail-fill absolute inset-0 rounded-full bg-amber" />}
      </span>
      <span className="edge grid size-16 shrink-0 place-items-center rounded-lg bg-plate">
        {/* The key replays the wick catching when the rail arrives, rather than swapping. */}
        <Lantern
          key={lit ? "lit" : "waiting"}
          variant={state === "refused" ? "unlit" : "lit"}
          flicker={state === "asking"}
          glow={connected}
          litUp={lit}
          catchLight={lit}
          className="size-10"
        />
      </span>
    </div>
  );
}

/** Follows `value`, but waits `ms` before turning on. Off at once, and at once under reduced motion. */
function useLagged(value: boolean, ms: number): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!value) {
      setOn(false);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOn(true);
      return;
    }
    const t = setTimeout(() => setOn(true), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return on;
}

/**
 * The address the app is identified by. An MCP client's `client_id` is an HTTPS URL and its
 * metadata document has to be served from that host, so the host is the one claim in the
 * request that cannot be forged. Mono, because it is read character by character.
 */
export function AppIdentityLine({ app, className }: { app: AppIdentity; className?: string }) {
  return (
    <span
      className={clsx(
        "edge inline-flex max-w-full items-center gap-1.5 rounded-full bg-plate-2 px-2.5 py-1 text-xs",
        app.recognised ? "text-text-2" : "text-muted",
        className,
      )}
    >
      {app.recognised && <ShieldCheck className="size-3.5 shrink-0 text-good" aria-hidden="true" />}
      <span className="sr-only">{app.recognised ? "Recognised app at " : "Identified by "}</span>
      <span className="truncate font-mono">{app.host ?? "an app with no address"}</span>
    </span>
  );
}
