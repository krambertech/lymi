import { Trans, useLingui } from "@lingui/react/macro";
import { mergeActivity } from "@lymi/client/activity";
import { isolate } from "@lymi/core";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import { ArrowUpRight, BookOpen, History } from "lucide-react";
import { type ReactNode, useEffect } from "react";
import { appActivityQuery } from "../lib/queries";
import { captureAnalytics } from "../lib/telemetry";
import { useConfirmStep } from "../lib/use-confirm-step";
import { ActivityList } from "../views/activity-view";
import { Button } from "./button";
import { EmptySection } from "./empty-state";
import { InlineError } from "./inline-error";
import { Screen } from "./layout/screen";
import { Go } from "./next-steps";
import { Skeleton } from "./skeleton";

/** The apps whose pages Lymi knows, as the analytics events name them. */
export type AppKey = "readwise" | "yomitan" | "claude" | "chatgpt" | "other";

/**
 * One page for an app that writes to the learner's decks: its header, then Settings, Activity, How
 * it connects and Stop, in that order. docs/design/app-pages.md.
 */
export function AppPage({
  appKey,
  name,
  mark,
  status,
  does,
  action,
  children,
}: {
  appKey: AppKey;
  name: string;
  mark: ReactNode;
  status: { label: string; tone: "good" | "muted" | "danger"; detail?: ReactNode } | undefined;
  /** What the app does for the learner, in one line. */
  does: ReactNode;
  /** The app's one everyday action, such as Check now. */
  action?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useLingui();
  useEffect(() => {
    captureAnalytics("app_page_viewed", { app: appKey });
  }, [appKey]);
  return (
    <Screen width="md" back={{ label: t`Settings`, to: "/settings", hash: "apps" }} backOnDesktop ownTitle>
      <header className="grid gap-4 pb-8">
        <div className="flex items-center gap-4">
          <span className="grid size-14 shrink-0">{mark}</span>
          <div className="grid min-w-0 gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-medium text-text">{name}</h1>
              {status ? (
                <span
                  className={clsx(
                    "inline-flex h-[22px] items-center rounded-full px-2 text-2xs font-medium",
                    status.tone === "good" && "bg-good-soft text-good",
                    status.tone === "muted" && "bg-plate-2 text-text-2",
                    status.tone === "danger" && "bg-danger-soft text-danger",
                  )}
                >
                  {status.label}
                </span>
              ) : (
                <Skeleton className="h-[22px] w-20 rounded-full" />
              )}
            </div>
            {status?.detail && <p className="text-sm text-muted tabular-nums">{status.detail}</p>}
          </div>
        </div>
        <p className="max-w-[60ch] text-base text-text-2 text-pretty">{does}</p>
        {action && <div>{action}</div>}
      </header>
      <div className="grid">{children}</div>
    </Screen>
  );
}

/** One part of an app's page, with a rule above every part but the first. */
export function AppSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <section
      className={clsx(
        "grid gap-3 border-edge py-6 [&:not(:first-child)]:border-t first:pt-0",
        className,
      )}
    >
      <h2 className="text-md font-medium text-text">{title}</h2>
      {children}
    </section>
  );
}

/** The app's writes from Activity, the latest few, with the way to all of them. */
export function AppActivity({
  appKey,
  app,
  name,
  limit = 5,
}: {
  appKey: AppKey;
  /** The audit rows' `actor_client` for this app. */
  app: string;
  name: string;
  limit?: number;
}) {
  const { t } = useLingui();
  const activity = useInfiniteQuery(appActivityQuery(app));
  const page = activity.data?.pages[0];
  const entries = page ? mergeActivity(page.entries).slice(0, limit) : undefined;
  return (
    <AppSection title={t`Activity`}>
      {activity.isError && !entries ? (
        <p className="text-sm" role="alert">
          <InlineError>
            <Trans>
              Couldn’t load what {{ app: isolate(name) }} did. Check your connection and try again.
            </Trans>
          </InlineError>
        </p>
      ) : !entries ? (
        <Skeleton className="h-[145px] rounded-xl" />
      ) : entries.length === 0 ? (
        <EmptySection
          icon={<History />}
          title={t`Nothing from ${{ app: isolate(name) }} yet`}
          body={t`What it adds, edits or archives shows here.`}
          className="rounded-xl"
        />
      ) : (
        <ActivityList
          entries={entries}
          today={page?.today}
          zone={page?.zone}
          deckLink={(deckId, className, children) => (
            <Link to="/library/$deckId" params={{ deckId }} className={className}>
              {children}
            </Link>
          )}
          cardLink={(deckId, cardId, className, children) => (
            <Link
              to="/library/$deckId"
              params={{ deckId }}
              search={{ card: cardId }}
              className={className}
              onClick={() => captureAnalytics("app_activity_opened", { app: appKey, how: "card" })}
            >
              {children}
            </Link>
          )}
          foot={
            <Link
              to="/activity"
              search={{ app }}
              onClick={() => captureAnalytics("app_activity_opened", { app: appKey, how: "all" })}
              className="group flex items-center gap-1 rounded-b-xl px-4 py-3 text-sm font-medium text-text hoverable:hover:veil"
            >
              <span className="flex-1">
                <Trans>Everything {{ app: isolate(name) }} did, in Activity</Trans>
              </span>
              <Go />
            </Link>
          }
        />
      )}
    </AppSection>
  );
}

/** How the app reaches Lymi: a line, numbered steps, and the guide on lymi.app when there is one. */
export function AppConnect({
  name,
  intro,
  steps,
  guide,
  children,
}: {
  name: string;
  intro: ReactNode;
  steps: ReactNode[];
  /** The guide's address; left out until the guide is written. */
  guide?: string | undefined;
  /** What the learner fills in here, such as a token. */
  children?: ReactNode;
}) {
  const { t } = useLingui();
  return (
    <AppSection title={t`How it connects`}>
      <div className="edge grid gap-4 rounded-xl bg-plate p-5">
        <p className="max-w-[60ch] text-base text-text-2 text-pretty">{intro}</p>
        <ol className="grid gap-3 text-base text-text-2">
          {steps.map((step, i) => (
            <li key={String(i)} className="grid grid-cols-[26px_1fr] gap-3">
              <span
                aria-hidden="true"
                className="edge grid size-[26px] place-items-center rounded-full bg-plate-2 text-xs font-semibold text-text tabular-nums"
              >
                {i + 1}
              </span>
              <span className="min-w-0 pt-0.5 text-pretty">{step}</span>
            </li>
          ))}
        </ol>
        {children}
        {guide && (
          <div className="border-t border-edge pt-4">
            <Button render={<a href={guide} target="_blank" rel="noreferrer" />}>
              <BookOpen data-icon="inline-start" aria-hidden="true" />
              <Trans>Read the {{ app: isolate(name) }} guide</Trans>
              <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>
    </AppSection>
  );
}

/** The way to cut the app off: what goes and what stays, then one confirmed danger button. */
export function AppStop({
  consequence,
  label,
  keep,
  onStop,
  stopping,
}: {
  consequence: ReactNode;
  label: string;
  /** The safe choice beside the confirm, such as Stay connected. */
  keep: string;
  onStop: () => void;
  stopping: boolean;
}) {
  const { t } = useLingui();
  const confirm = useConfirmStep();
  return (
    <AppSection title={t`Stop`}>
      <p className="max-w-[60ch] text-sm text-muted">{consequence}</p>
      {confirm.confirming ? (
        <div {...confirm.groupProps} className="enter-fade flex flex-wrap gap-3">
          <Button ref={confirm.safe} variant="ghost" onClick={confirm.cancel}>
            {keep}
          </Button>
          <Button variant="danger" loading={stopping} aria-disabled={stopping} onClick={onStop}>
            {label}
          </Button>
        </div>
      ) : (
        <Button
          ref={confirm.trigger}
          variant="danger"
          className="justify-self-start"
          onClick={confirm.ask}
        >
          {label}
        </Button>
      )}
    </AppSection>
  );
}
