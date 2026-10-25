import { decksQuery, settingsQuery } from "@lymi/client/queries";
import { backlogOf } from "@lymi/core/analytics";
import { useQuery } from "@tanstack/react-query";
import { useGlobalSearchParams, usePathname, useRootNavigationState } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { type EntryOpened, entryOf } from "../entry/links";
import { captureEvent, setTelemetryLearner, verifyReleaseException } from "./posthog";
import { screenPath } from "./screen-path";

/** Back from the background after this long is another opening, as a reload would be on the web. */
const AWAY_MS = 30 * 60_000;

/**
 * Tells PostHog who is signed in and whether their account allows analytics, then counts the
 * openings and screens the web counts as `app_opened` and `$pageview`, and which of iOS's entry
 * points opened a screen as `entry_opened`. docs/analytics.md.
 */
export function Analytics({ learnerId }: { learnerId: string | null | undefined }) {
  const settings = useQuery({ ...settingsQuery, enabled: !!learnerId });
  const consent = learnerId && settings.data ? settings.data.analyticsConsent !== false : undefined;
  useEffect(() => setTelemetryLearner(learnerId, consent), [learnerId, consent]);

  const [openedAt, setOpenedAt] = useState(() => Date.now());
  // An opening belongs to one account, as on the web: whoever signs in after another opens anew.
  const openedFor = useRef(learnerId);
  useEffect(() => {
    if (learnerId === undefined || learnerId === openedFor.current) return;
    if (openedFor.current) setOpenedAt(Date.now());
    openedFor.current = learnerId;
  }, [learnerId]);
  useEffect(() => {
    let leftAt: number | undefined;
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "background") leftAt = Date.now();
      else if (state === "active" && leftAt !== undefined) {
        if (Date.now() - leftAt >= AWAY_MS) setOpenedAt(Date.now());
        leftAt = undefined;
      }
    });
    return () => listener.remove();
  }, []);

  // The opening reports what was due from the deck list Today loads anyway, once it lands.
  const decks = useQuery({ ...decksQuery, enabled: consent === true });
  const sentAt = useRef(0);
  useEffect(() => {
    if (consent !== true || sentAt.current === openedAt) return;
    const fresh = !!decks.data && decks.dataUpdatedAt >= openedAt;
    const failed = decks.errorUpdatedAt >= openedAt || decks.fetchStatus === "paused";
    if (!fresh && !failed) return;
    const due = fresh ? decks.data?.reduce((n, d) => n + d.due, 0) : undefined;
    if (captureEvent("app_opened", due === undefined ? {} : { backlog: backlogOf(due) }))
      sentAt.current = openedAt;
  }, [consent, openedAt, decks.data, decks.dataUpdatedAt, decks.errorUpdatedAt, decks.fetchStatus]);

  const pathname = usePathname();
  const lastScreen = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (consent !== true) return;
    const screen = screenPath(pathname);
    if (screen === lastScreen.current) return;
    if (captureEvent("$pageview", { pathname: screen })) lastScreen.current = screen;
  }, [consent, pathname]);
  useEffect(() => {
    if (!learnerId) lastScreen.current = undefined;
  }, [learnerId]);

  // A link held through sign-in reaches its screen afterwards, so the entry waits for consent.
  // Each screen counts once, so coming back to it from another screen sends nothing.
  const { from, verify_phone_errors: verifyErrors } = useGlobalSearchParams();
  useEffect(() => {
    if (learnerId && verifyErrors === "source-maps") verifyReleaseException();
  }, [verifyErrors, learnerId]);
  const screen = focusedKey(useRootNavigationState());
  const [entry, setEntry] = useState<EntryOpened>();
  const counted = useRef(new Set<string>());
  useEffect(() => {
    const opened = entryOf(pathname, from);
    if (!opened || !screen || counted.current.has(screen)) return;
    counted.current.add(screen);
    setEntry(opened);
  }, [pathname, from, screen]);
  useEffect(() => {
    if (consent === true && entry && captureEvent("entry_opened", entry)) setEntry(undefined);
  }, [consent, entry]);

  return null;
}

interface NavState {
  index?: number;
  routes: { key?: string; state?: unknown }[];
}

/** The key of the screen in front, which stays the same when the learner comes back to it. */
function focusedKey(state: NavState | undefined): string | undefined {
  const route = state?.routes[state.index ?? state.routes.length - 1];
  return route && (focusedKey(route.state as NavState | undefined) ?? route.key);
}
