import { analyticsConsent, CONSENT_CHANGED, setAnalyticsConsent } from "@lymi/client/analytics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ApiError, api } from "../lib/api";
import { meQuery, settingsQuery } from "../lib/queries";
import { setTelemetryLearner } from "../lib/telemetry";

export function AnalyticsConsentSync() {
  const me = useQuery(meQuery);
  const settings = useQuery({ ...settingsQuery, enabled: me.isSuccess });
  const qc = useQueryClient();
  const syncing = useRef<number | null>(null);
  const [choice, setChoice] = useState(analyticsConsent);
  useEffect(() => {
    const changed = () => {
      setChoice(analyticsConsent());
      void qc.invalidateQueries({ queryKey: settingsQuery.queryKey });
      void qc.invalidateQueries({ queryKey: meQuery.queryKey });
    };
    window.addEventListener(CONSENT_CHANGED, changed);
    window.addEventListener("online", changed);
    window.addEventListener("focus", changed);
    return () => {
      window.removeEventListener(CONSENT_CHANGED, changed);
      window.removeEventListener("online", changed);
      window.removeEventListener("focus", changed);
    };
  }, [qc]);
  useEffect(() => {
    if (me.isError && me.error instanceof ApiError && me.error.status === 401) {
      setTelemetryLearner(undefined);
      return;
    }
    if (!me.isSuccess || !settings.isSuccess) return;
    const saved = settings.data;
    const savedAt = saved.analyticsConsentUpdatedAt
      ? new Date(saved.analyticsConsentUpdatedAt).getTime()
      : 0;
    if (choice && saved.analyticsConsent === false && savedAt > choice.updated_at) {
      setAnalyticsConsent(false, savedAt);
      return;
    }
    setTelemetryLearner(
      me.data.id,
      saved.analyticsConsent === true && choice?.allowed === true && savedAt >= choice.updated_at,
    );
    if (choice && choice.updated_at > savedAt && syncing.current !== choice.updated_at) {
      syncing.current = choice.updated_at;
      void api
        .updateAnalyticsConsent(choice)
        .then((value) => qc.setQueryData(settingsQuery.queryKey, value))
        .catch(() => {
          // Focus and reconnect retry; tracking stays disabled until the account save succeeds.
        })
        .finally(() => {
          syncing.current = null;
        });
    }
  }, [
    me.data?.id,
    me.isSuccess,
    me.isError,
    me.error,
    settings.data,
    settings.isSuccess,
    qc,
    choice,
  ]);
  return null;
}
