import { useLingui } from "@lingui/react/macro";
import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { ActivityEntry } from "../lib/api";
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
      entries={entries && merge(entries)}
      today={activity.data?.pages[0]?.today}
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

/**
 * A group cut in half by the end of a page comes back as two entries, so the halves are joined
 * again here rather than read as two writes.
 */
function merge(entries: ActivityEntry[]): ActivityEntry[] {
  const joined: ActivityEntry[] = [];
  for (const entry of entries) {
    const last = joined.at(-1);
    if (last && last.group === entry.group) {
      joined[joined.length - 1] = {
        ...last,
        count: last.count + entry.count,
        cards: [...last.cards, ...entry.cards],
      };
      continue;
    }
    joined.push(entry);
  }
  return joined;
}
