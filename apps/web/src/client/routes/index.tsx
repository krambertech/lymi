import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { LandingView } from "../landing/LandingView";
import { ApiError } from "../lib/api";
import { decksQuery, historyQuery, meQuery } from "../lib/queries";
import { hasSignedInBefore } from "../lib/session-hint";
import { TodayView } from "../views/TodayView";

export const Route = createFileRoute("/")({
  component: Home,
});

/**
 * The site root is two things. A stranger gets the landing page; the learner gets Today.
 * Which one is decided by /api/me, and while that is in the air the hint from the last
 * visit picks, so neither audience watches the other's page appear first.
 */
function Home() {
  const me = useQuery(meQuery);
  const signedOut = me.isError && me.error instanceof ApiError && me.error.status === 401;

  if (signedOut) return <LandingView />;
  if (!me.isSuccess) return hasSignedInBefore() ? null : <LandingView />;
  return <Today />;
}

function Today() {
  const decks = useQuery(decksQuery);
  const history = useQuery(historyQuery);
  return <TodayView decks={decks.data} history={history.data?.days} />;
}
