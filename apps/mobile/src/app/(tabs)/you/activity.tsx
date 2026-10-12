import { useLingui } from "@lingui/react/macro";
import { mergeActivity } from "@lymi/client/activity";
import { useEffect } from "react";
import { ActivityView } from "../../../activity/activity-view";
import { useActivity } from "../../../data/queries";
import { useOnline } from "../../../streak/goal-picker";
import { Screen } from "../../../ui/screen";

/** Rows enough to fill a phone screen, below which the log reads its next page at once. */
const SCREENFUL = 12;

/** What landed in the learner's decks from outside the app. activity.md. */
export default function Activity() {
  const { t } = useLingui();
  const query = useActivity();
  const online = useOnline();
  const pages = query.data?.pages;
  const first = pages?.[0];
  const merged = pages && mergeActivity(pages.flatMap((page) => page.entries));
  const more = !!query.hasNextPage;
  // The last row may continue on the next page, so it waits for it rather than its count growing.
  const entries = merged && more ? (merged.length > 1 ? merged.slice(0, -1) : undefined) : merged;
  const loadMore = () => {
    if (more && !query.isFetchingNextPage && !query.isFetchNextPageError)
      // The end fires every frame near it; a page already on its way is not asked for again.
      void query.fetchNextPage({ cancelRefetch: false });
  };
  // A short first read, such as one large archive, reads on until the screen has something to show.
  useEffect(() => {
    if (merged && (entries?.length ?? 0) < SCREENFUL) loadMore();
  });
  return (
    <Screen title={t`Activity`} back={{ label: t`You`, to: "/you" }} onEndReached={loadMore}>
      <ActivityView
        // A write cut in two by the end of a page is one row with its whole count.
        entries={entries}
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
