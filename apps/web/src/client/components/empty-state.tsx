import { Trans } from "@lingui/react/macro";
import { clsx } from "clsx";
import { CircleAlert } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { bidi } from "../lib/bidi";
import { Button } from "./button";

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
      <h2 className="text-lg font-medium text-balance">{bidi(title)}</h2>
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

interface EmptySectionProps extends Omit<ComponentProps<"div">, "title"> {
  icon: ReactNode;
  title: ReactNode;
  body?: ReactNode | undefined;
  action?: ReactNode | undefined;
}

/**
 * An empty group inside a screen, e.g. no API keys yet. One icon, one line of why, and the action
 * that fills it; the lantern and the start panel are for whole screens.
 */
export function EmptySection({ icon, title, body, action, className, ...rest }: EmptySectionProps) {
  return (
    <div
      className={clsx(
        "edge flex flex-col items-center gap-1.5 rounded-md bg-plate px-5 py-7 text-center",
        className,
      )}
      {...rest}
    >
      <span
        className="mb-2 grid size-11 place-items-center rounded-full bg-plate-2 text-text-2 [&_svg]:size-5"
        aria-hidden="true"
      >
        {icon}
      </span>
      <h3 className="text-base font-medium text-text">{bidi(title)}</h3>
      {body && <p className="max-w-[38ch] text-sm text-muted">{body}</p>}
      {action && <div className="mt-3 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

interface NoResultsProps {
  /** What the empty list was narrowed by, as an outline icon: search or the filter. */
  icon: ReactNode;
  /** Names the query or the filter. */
  title: ReactNode;
  detail?: ReactNode | undefined;
  /** The way back: Clear search, Show all. */
  action?: ReactNode | undefined;
}

/**
 * A search or filter that matched nothing, in the list's place under the controls that caused it.
 * Dashed like a start panel, because it is temporary and must never read as a plate of cards.
 */
export function NoResults({ icon, title, detail, action }: NoResultsProps) {
  return (
    <section className="mt-2 flex flex-col items-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-edge-2 px-5 py-10 text-center">
      <span
        className="mb-2 grid size-11 place-items-center rounded-full bg-plate-2 text-text-2 [&_svg]:size-5"
        aria-hidden="true"
      >
        {icon}
      </span>
      <h2 className="text-base font-medium text-balance text-text">{bidi(title)}</h2>
      {detail && <p className="max-w-[40ch] text-sm text-pretty text-muted">{detail}</p>}
      {action && <div className="mt-3 flex flex-wrap justify-center gap-2">{action}</div>}
    </section>
  );
}
