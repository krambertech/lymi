import { Trans } from "@lingui/react/macro";
import { clsx } from "clsx";
import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./button";
import { Lantern } from "./lantern";

interface EmptyStateProps {
  title: ReactNode;
  /** Why it is empty and what to do. One sentence. */
  body?: ReactNode | undefined;
  action?: ReactNode | undefined;
  className?: string | undefined;
}

/**
 * A whole screen with nothing to outline yet, such as one that is coming soon. The brand lantern,
 * still: an empty screen says nothing about the streak. DESIGN.md, "Empty states".
 */
export function EmptyState({ title, body, action, className }: EmptyStateProps) {
  return (
    <section
      className={clsx(
        "flex flex-col items-center justify-center gap-1 py-10 text-center",
        className,
      )}
    >
      <Lantern className="mb-3 size-16" />
      <h2 className="text-lg font-medium text-balance">{title}</h2>
      {body && <p className="max-w-[40ch] text-base text-text-2 text-pretty">{body}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </section>
  );
}

interface ErrorStateProps {
  /** "Couldn't load [thing]". */
  title: ReactNode;
  /** The fix. Defaults to checking the connection. */
  body?: ReactNode | undefined;
  onRetry?: (() => void) | undefined;
  retrying?: boolean | undefined;
  /** A second way out beside Try again. */
  action?: ReactNode | undefined;
  className?: string | undefined;
}

/** A screen that failed to load. An alert, never the lantern, so it cannot read as calm. */
export function ErrorState({ title, body, onRetry, retrying, action, className }: ErrorStateProps) {
  return (
    <section
      className={clsx(
        "flex flex-col items-center justify-center gap-1 py-10 text-center",
        className,
      )}
    >
      <span
        className="mb-3 grid size-11 place-items-center rounded-full bg-danger-soft text-danger"
        aria-hidden="true"
      >
        <CircleAlert className="size-5" />
      </span>
      <h2 className="text-lg font-medium text-balance">{title}</h2>
      <p className="max-w-[40ch] text-base text-text-2 text-pretty">
        {body ?? <Trans>Check your connection and try again.</Trans>}
      </p>
      {(onRetry || action) && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {onRetry && (
            <Button variant="primary" onClick={onRetry} loading={retrying}>
              <Trans>Try again</Trans>
            </Button>
          )}
          {action}
        </div>
      )}
    </section>
  );
}

interface EmptySectionProps {
  icon: ReactNode;
  title: ReactNode;
  body?: ReactNode | undefined;
  action?: ReactNode | undefined;
}

/**
 * An empty group inside a screen, e.g. no API keys yet. One icon, one line of why, and the action
 * that fills it; the lantern and the start panel are for whole screens.
 */
export function EmptySection({ icon, title, body, action }: EmptySectionProps) {
  return (
    <div className="edge flex flex-col items-center gap-1.5 rounded-md bg-plate px-5 py-7 text-center">
      <span
        className="mb-2 grid size-11 place-items-center rounded-full bg-plate-2 text-text-2 [&_svg]:size-5"
        aria-hidden="true"
      >
        {icon}
      </span>
      <h3 className="text-base font-medium text-text">{title}</h3>
      {body && <p className="max-w-[38ch] text-sm text-muted">{body}</p>}
      {action && <div className="mt-3 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

interface NoResultsProps {
  /** Names the query or the filter. */
  title: ReactNode;
  detail?: ReactNode | undefined;
  /** The way back: Clear search, Show all. */
  action: ReactNode;
}

/** A search or filter that matched nothing: one line under the controls that caused it. */
export function NoResults({ title, detail, action }: NoResultsProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-edge px-1 py-4">
      <p className="grid min-w-0 gap-0.5">
        <span className="text-md font-medium">{title}</span>
        {detail && <span className="text-sm text-muted">{detail}</span>}
      </p>
      <span className="ms-auto">{action}</span>
    </div>
  );
}
