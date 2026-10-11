import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { ApiError } from "../lib/api";
import { meQuery, settingsQuery } from "../lib/queries";
import { setTelemetryLearner } from "../lib/telemetry";

/** Tells analytics who is signed in and whether their account turned analytics off. */
export function AnalyticsLearnerSync() {
  const me = useQuery(meQuery);
  const settings = useQuery({ ...settingsQuery, enabled: me.isSuccess });
  useEffect(() => {
    if (me.isError && me.error instanceof ApiError && me.error.status === 401) {
      setTelemetryLearner(undefined);
      return;
    }
    if (!me.isSuccess || !settings.isSuccess) return;
    setTelemetryLearner(me.data.id, settings.data.analyticsConsent !== false);
  }, [me.data?.id, me.isSuccess, me.isError, me.error, settings.data, settings.isSuccess]);
  return null;
}
