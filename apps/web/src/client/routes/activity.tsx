import { useLingui } from "@lingui/react/macro";
import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { mergeActivity } from "../lib/activity-list";
import { useDocumentTitle } from "../lib/document-title";
import { activityQuery } from "../lib/queries";
import { ActivityView } from "../views/activity-view";

export const Route = createFileRoute("/activity")({
  component: ActivityRoute,
});

function ActivityRoute() {
  const { t } = useLingui();
  useDocumentTitle(t`Activity`);
  const activity = useInfiniteQuery(activityQuery);
  const entries = activity.data?.pages.flatMap((page) => page.entries);

  return (
    <ActivityView
      entries={entries && mergeActivity(entries)}
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
