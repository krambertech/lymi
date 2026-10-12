import { useLingui } from "@lingui/react/macro";
import { mergeActivity } from "@lymi/client/activity";
import { ActivityView } from "../../../activity/activity-view";
import { useActivity } from "../../../data/queries";
import { useOnline } from "../../../streak/goal-picker";
import { Screen } from "../../../ui/screen";

/** What landed in the learner's decks from outside the app. activity.md. */
export default function Activity() {
  const { t } = useLingui();
  const query = useActivity();
  const online = useOnline();
  const pages = query.data?.pages;
  const first = pages?.[0];
  return (
    <Screen title={t`Activity`} back={{ label: t`You`, to: "/you" }}>
      <ActivityView
        // A write cut in two by the end of a page is one row with its whole count.
        entries={pages && mergeActivity(pages.flatMap((page) => page.entries))}
        today={first?.today}
        zone={first?.zone}
        failed={query.isError}
        // Activity is never kept on the phone, so with no connection there is nothing to show yet.
        offline={!online && !pages}
        retrying={query.isFetching && !query.isFetchingNextPage}
        onRetry={() => void query.refetch()}
        hasMore={query.hasNextPage}
        loadingMore={query.isFetchingNextPage}
        moreFailed={query.isFetchNextPageError}
        onMore={() => void query.fetchNextPage()}
      />
    </Screen>
  );
}
