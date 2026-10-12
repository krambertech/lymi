import { useLingui } from "@lingui/react/macro";
import { ActivityView } from "../../../activity/activity-view";
import { useActivity } from "../../../data/queries";
import { Screen } from "../../../ui/screen";

/** What landed in the learner's decks from outside the app. activity.md. */
export default function Activity() {
  const { t } = useLingui();
  const query = useActivity();
  const pages = query.data?.pages;
  const first = pages?.[0];
  return (
    <Screen title={t`Activity`} back={{ label: t`You`, to: "/you" }}>
      <ActivityView
        entries={pages?.flatMap((page) => page.entries)}
        today={first?.today}
        zone={first?.zone}
        failed={query.isError}
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
