import { useLingui } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAddCard } from "../lib/add-card";
import { api } from "../lib/api";
import { useDocumentTitle } from "../lib/document-title";
import { isGuiding } from "../lib/first-run";
import {
  decksQuery,
  exploreQuery,
  meQuery,
  roundsQuery,
  seriesQuery,
  settingsQuery,
  streakQuery,
} from "../lib/queries";
import { useRestDismissal } from "../lib/rest-day";
import { Streak } from "../lib/streak";
import { useAddPublishedDeck } from "../lib/use-add-published-deck";
import { TodayView } from "../views/today-view";

export const Route = createFileRoute("/today")({
  component: Today,
});

function Today() {
  const { t } = useLingui();
  useDocumentTitle(t`Today`);
  const decks = useQuery(decksQuery);
  const series = useQuery(seriesQuery);
  // The same query as the rail's pill, so the flame in the chrome and the card always agree.
  const streak = useQuery(streakQuery);
  const rounds = useQuery(roundsQuery);
  // Only the first-run guide offers ready-made decks, so nobody past it pays for the catalogue read.
  const guiding = isGuiding(streak.data);
  const explore = useQuery({ ...exploreQuery, enabled: guiding });
  const ready = explore.data?.decks.filter((deck) => !explore.data.added[deck.slug]);
  const add = useAddCard();
  // The same read as the add menu's, so the guide offers Smart add exactly where the menu does.
  const lessons = useQuery({
    queryKey: ["lesson-reads", "access"],
    queryFn: api.lessonAccess,
    enabled: guiding,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const rest = useRestDismissal(streak.data?.today.date);
  // Read again on arrival while not set up, so a visit inside the stale window still sets up.
  const settings = useQuery({
    ...settingsQuery,
    refetchOnMount: (query) => (query.state.data?.onboardedAt === null ? "always" : true),
  });
  const me = useQuery(meQuery);
  const addReady = useAddPublishedDeck({ announce: "review" });
  // Today is where a new account starts, so its first visit counts as getting set up: the goal
  // starts at 25 and Welcome on the phone is not shown again. docs/design/onboarding.md.
  const qc = useQueryClient();
  const setUp = useMutation({
    mutationFn: () =>
      api.finishOnboarding({
        learningKind: null,
        learningLanguage: null,
        dailyGoal: null,
        from: "today",
      }),
    onSuccess: (value) => {
      qc.setQueryData(settingsQuery.queryKey, value);
      void qc.invalidateQueries({ queryKey: streakQuery.queryKey });
    },
  });
  // Only before the first review: an older account that never got set up keeps its goal.
  const unset = settings.data?.onboardedAt === null && settings.isFetchedAfterMount && guiding;
  const { mutate: finishSetUp, isIdle } = setUp;
  useEffect(() => {
    if (unset && isIdle) finishSetUp();
  }, [unset, isIdle, finishSetUp]);
  return (
    <TodayView
      decks={decks.data}
      series={series.data}
      streak={streak.data}
      streakCard={<Streak variant="card" />}
      rounds={rounds.data}
      onAdd={() => add.openCard()}
      onCreateDeck={add.openDeck}
      onSmartAdd={lessons.data?.allowed ? () => add.openSmart() : undefined}
      failed={(decks.isError && !decks.data) || (streak.isError && !streak.data)}
      onRetry={() => {
        void decks.refetch();
        void streak.refetch();
      }}
      retrying={decks.isFetching || streak.isFetching}
      ready={ready}
      restDismissed={rest.dismissed}
      onDismissRest={rest.dismiss}
      name={me.data?.name}
      email={me.data?.email}
      learning={settings.data?.learningLanguage}
      onAddReady={(deck) =>
        addReady.mutate({ slug: deck.slug, name: deck.name, edition: deck.meaningLanguage })
      }
      addingReady={addReady.isPending ? addReady.variables?.slug : undefined}
    />
  );
}
