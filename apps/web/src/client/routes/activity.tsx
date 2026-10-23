import { useLingui } from "@lingui/react/macro";
import { mergeActivity } from "@lymi/client/activity";
import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useDocumentTitle } from "../lib/document-title";
import { activityQuery, appActivityQuery } from "../lib/queries";
import { ActivityView } from "../views/activity-view";

export const Route = createFileRoute("/activity")({
  // An app's page opens Activity filtered to that app's writes.
  validateSearch: (s: Record<string, unknown>): { app?: string } => ({
    ...(typeof s.app === "string" && s.app ? { app: s.app } : {}),
  }),
  component: ActivityRoute,
});

// Names for the apps Lymi runs itself, so a filter with no rows yet still says whose it is.
const BUILT_IN_APPS: Record<string, string> = { readwise: "Readwise" };

function ActivityRoute() {
  const { t } = useLingui();
  useDocumentTitle(t`Activity`);
  const { app } = Route.useSearch();
  const activity = useInfiniteQuery(app ? appActivityQuery(app) : activityQuery);
  const entries = activity.data?.pages.flatMap((page) => page.entries);

  return (
    <ActivityView
      entries={entries && mergeActivity(entries)}
      filter={
        app
          ? {
              name: entries?.[0]?.app ?? BUILT_IN_APPS[app] ?? null,
              clear: (className, children) => (
                <Link to="/activity" className={className}>
                  {children}
                </Link>
              ),
            }
          : undefined
      }
      today={activity.data?.pages[0]?.today}
      zone={activity.data?.pages[0]?.zone}
      error={activity.isError}
      onRetry={() => void activity.refetch()}
      retrying={activity.isFetching}
      hasMore={activity.hasNextPage}
      loadingMore={activity.isFetchingNextPage}
      onMore={() => void activity.fetchNextPage()}
      // The first page failing is the error state; a later one leaves the list and says so.
      moreFailed={activity.isError && !!entries?.length}
      importLink={(item, className, children) => (
        <Link to="/import/$importId" params={{ importId: item.id }} className={className}>
          {children}
        </Link>
      )}
      deckLink={(deckId, className, children) => (
        <Link to="/library/$deckId" params={{ deckId }} className={className}>
          {children}
        </Link>
      )}
      // A card opens where every card opens: the word in its deck, with its history under it.
      cardLink={(deckId, cardId, className, children) => (
        <Link
          to="/library/$deckId"
          params={{ deckId }}
          search={{ card: cardId }}
          className={className}
        >
          {children}
        </Link>
      )}
    />
  );
}
