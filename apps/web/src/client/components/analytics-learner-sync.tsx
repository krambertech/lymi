import { backlogOf } from "@lymi/core/analytics";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { ApiError } from "../lib/api";
import { isBareShell } from "../lib/i18n";
import { decksQuery, meQuery, settingsQuery } from "../lib/queries";
import { setTelemetryLearner, setTelemetryOpening } from "../lib/telemetry";

/** Tells analytics who is signed in and whether their account turned analytics or session replay off. */
export function AnalyticsLearnerSync() {
  const me = useQuery(meQuery);
  const settings = useQuery({ ...settingsQuery, enabled: me.isSuccess });
  // Watches the deck list the shell loads, never fetching it; a restored copy is a past visit's.
  const decks = useQuery({ ...decksQuery, enabled: false });
  const bare = isBareShell(useLocation().pathname);
  useEffect(() => {
    if (me.isError && me.error instanceof ApiError && me.error.status === 401) {
      setTelemetryLearner(undefined);
      return;
    }
    if (!me.isSuccess || !settings.isSuccess) return;
    setTelemetryLearner(
      me.data.id,
      settings.data.analyticsConsent !== false,
      settings.data.sessionReplay !== false,
    );
  }, [me.data?.id, me.isSuccess, me.isError, me.error, settings.data, settings.isSuccess]);
  useEffect(() => {
    if (bare) setTelemetryOpening();
    else if (decks.isFetchedAfterMount)
      setTelemetryOpening(
        decks.data && !decks.error
          ? backlogOf(decks.data.reduce((sum, deck) => sum + deck.due, 0))
          : undefined,
      );
  }, [bare, decks.isFetchedAfterMount, decks.data, decks.error]);
  return null;
}
