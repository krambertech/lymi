import { I18nProvider } from "@lingui/react";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  analyticsConsent,
  CONSENT_CHANGED,
  captureAnalytics,
  initAnalytics,
  OPEN_PRIVACY_PREFERENCES,
  openPrivacyPreferences,
  setAnalyticsConsent,
  setAnalyticsLearner,
} from "@lymi/client/analytics";
import { SettingsOut } from "@lymi/core";
import { POSTHOG_PROJECT_TOKEN } from "@lymi/core/telemetry";
import { useCallback, useEffect, useRef, useState } from "react";
import { pageI18n } from "../lib/i18n";
import { productUrl } from "../lib/origins";
import { localizedPath } from "../lib/routes";
import { Button } from "./Button";

export function AnalyticsConsentBanner() {
  const { i18n } = useLingui();
  const [visible, setVisible] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const [details, setDetails] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const region = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLElement | null>(null);

  function close() {
    setVisible(false);
    trigger.current?.focus();
  }

  const refreshAccount = useCallback(async () => {
    try {
      const response = await fetch(productUrl("/api/settings/analytics-consent"), {
        credentials: "include",
      });
      if (response.status === 401) {
        setAnalyticsLearner(undefined);
        return;
      }
      if (!response.ok) return;
      const saved = SettingsOut.parse(await response.json());
      const choice = analyticsConsent();
      const savedAt = saved.analyticsConsentUpdatedAt
        ? new Date(saved.analyticsConsentUpdatedAt).getTime()
        : 0;
      if (choice && saved.analyticsConsent === false && savedAt > choice.updated_at)
        setAnalyticsConsent(false, savedAt);
      setAnalyticsLearner(
        saved.userId,
        saved.analyticsConsent === true && choice?.allowed === true && savedAt >= choice.updated_at,
      );
    } catch {
      /* A failed account check keeps identified analytics disabled. */
    }
  }, []);
  useEffect(() => {
    let active = true;
    setInteractive(true);
    void refreshAccount().then(() => {
      if (!active) return;
      initAnalytics({
        token: POSTHOG_PROJECT_TOKEN,
        surface: "public",
        enabled: import.meta.env.PROD && location.origin === "https://lymi.app",
      });
    });
    const focus = () => {
      void refreshAccount();
    };
    window.addEventListener("focus", focus);
    const addClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement)) return;
      const url = new URL(target.href);
      const slug =
        url.origin === new URL(productUrl()).origin
          ? url.pathname.match(/^\/add\/([a-z0-9-]+)$/)?.[1]
          : undefined;
      if (slug) captureAnalytics("add_to_lymi_clicked", { deck_slug: slug });
    };
    document.addEventListener("click", addClick);

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
      active = false;
      window.removeEventListener("focus", focus);
      document.removeEventListener("click", addClick);
      window.removeEventListener(CONSENT_CHANGED, refresh);
      window.removeEventListener(OPEN_PRIVACY_PREFERENCES, open);
    };
  }, [refreshAccount]);

  async function choose(allowed: boolean) {
    setAnalyticsConsent(allowed);
    const choice = analyticsConsent();
    setFailed(false);
    setBusy(true);
    try {
      if (!choice) {
        setFailed(true);
        return;
      }
      const response = await fetch(productUrl("/api/settings/analytics-consent"), {
        method: "PUT",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(choice),
      });
      if (!response.ok && response.status !== 401)
        throw new Error("Privacy preference was not saved");
      await refreshAccount();
      close();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-[1040px] px-5 pb-6 text-sm text-muted">
        <button
          type="button"
          disabled={!interactive}
          onClick={openPrivacyPreferences}
          className="rounded-xs py-2 underline underline-offset-4 hoverable:hover:text-text"
        >
          <Trans>Privacy preferences</Trans>
        </button>
      </div>
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
                href={localizedPath("privacy", i18n.locale)}
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

export default function AnalyticsConsentIsland({ locale }: { locale: string }) {
  return (
    <I18nProvider i18n={pageI18n(locale)}>
      <AnalyticsConsentBanner />
    </I18nProvider>
  );
}
