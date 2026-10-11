import { Trans } from "@lingui/react/macro";
import {
  analyticsConsent,
  CONSENT_CHANGED,
  OPEN_PRIVACY_PREFERENCES,
  setAnalyticsConsent,
} from "@lymi/client/analytics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ApiError, api } from "../lib/api";
import { publicSiteUrl } from "../lib/origins";
import { meQuery, settingsQuery } from "../lib/queries";
import { setTelemetryLearner } from "../lib/telemetry";
import { Button } from "./button";

export function AnalyticsConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [details, setDetails] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const region = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLElement | null>(null);

  function close() {
    setVisible(false);
    trigger.current?.focus();
  }
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
          setFailed(true);
          setVisible(true);
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
  useEffect(() => {
    const refresh = () => {
      if (!analyticsConsent()) setVisible(true);
    };
    const open = (event: Event) => {
      trigger.current =
        event instanceof CustomEvent && event.detail instanceof HTMLElement
          ? event.detail
          : document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
      setVisible(true);
      setDetails(true);
      requestAnimationFrame(() => region.current?.focus());
    };
    refresh();
    window.addEventListener(CONSENT_CHANGED, refresh);
    window.addEventListener(OPEN_PRIVACY_PREFERENCES, open);
    return () => {
      window.removeEventListener(CONSENT_CHANGED, refresh);
      window.removeEventListener(OPEN_PRIVACY_PREFERENCES, open);
    };
  }, []);

  async function choose(allowed: boolean) {
    const timestamp = Date.now();
    syncing.current = timestamp;
    setAnalyticsConsent(allowed, timestamp);
    const choice = analyticsConsent();
    setFailed(false);
    setBusy(true);
    try {
      if (!choice) {
        setFailed(true);
        return;
      }
      try {
        const value = await api.updateAnalyticsConsent(choice);
        qc.setQueryData(settingsQuery.queryKey, value);
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 401)) throw error;
      }
      close();
    } catch {
      setFailed(true);
    } finally {
      syncing.current = null;
      setBusy(false);
    }
  }

  return (
    <>
      {visible && (
        <aside
          ref={region}
          tabIndex={-1}
          onKeyDown={(event) => {
            if (event.key === "Escape" && analyticsConsent() && !busy) {
              event.stopPropagation();
              close();
            }
          }}
          aria-labelledby="analytics-consent-title"
          className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-[calc(var(--z-sticky)+1)] mx-auto grid max-h-[75dvh] max-w-xl gap-3 overflow-y-auto rounded-xl bg-plate p-5 text-text edge sm:inset-x-auto sm:end-5 sm:bottom-5 sm:w-[min(36rem,calc(100vw-2.5rem))]"
        >
          <h2 id="analytics-consent-title" className="text-lg font-medium">
            <Trans>Accept cookies</Trans>
          </h2>
          <p className="text-base text-text-2">
            <Trans>
              We use optional analytics cookies to understand how you use Lymi and improve it. You
              can change your choice anytime.
            </Trans>
          </p>
          <details
            open={details}
            onToggle={(event) => setDetails(event.currentTarget.open)}
            className="text-sm text-text-2"
          >
            <summary className="cursor-pointer rounded-xs py-2 font-medium underline underline-offset-4">
              <Trans>Analytics details</Trans>
            </summary>
            <div className="grid gap-2 pt-1 pb-2">
              <p>
                <Trans>
                  PostHog processes analytics in its EU cloud. With your permission, we link visits
                  across lymi.app and my.lymi.app and to your account when you sign in.
                </Trans>
              </p>
              <p>
                <Trans>
                  We collect page categories, actions, counts, review grades, app language and
                  campaign details. We don’t send your card content, name or email, and we don’t
                  record sessions.
                </Trans>
              </p>
              <p>
                <Trans>
                  Your analytics choice and visitor identifier are stored for up to six months.
                  Declining clears analytics identifiers on this browser. Necessary login cookies
                  and filtered error monitoring work independently.
                </Trans>
              </p>
              <p>
                <Trans>
                  Change your choice in Privacy preferences. Your account choice also applies to
                  analytics from connected apps and background work.
                </Trans>
              </p>
              <a
                href={publicSiteUrl("/privacy")}
                className="justify-self-start rounded-xs underline underline-offset-4"
              >
                <Trans>Read privacy policy</Trans>
              </a>
            </div>
          </details>
          {failed && (
            <p role="alert" className="text-sm text-danger">
              <Trans>
                Couldn’t save your account’s choice. Check your connection and try again.
              </Trans>
            </p>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
            <Button variant="primary" loading={busy} onClick={() => void choose(true)}>
              <Trans>Accept cookies</Trans>
            </Button>
            <Button loading={busy} onClick={() => void choose(false)}>
              <Trans>Decline</Trans>
            </Button>
          </div>
          {analyticsConsent() && (
            <Button variant="ghost" disabled={busy} onClick={close}>
              <Trans>Close</Trans>
            </Button>
          )}
        </aside>
      )}
    </>
  );
}
