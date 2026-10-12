import { decksQuery, settingsQuery } from "@lymi/client/queries";
import { analyticsPath, backlogOf } from "@lymi/core/analytics";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { captureEvent, setTelemetryLearner } from "./posthog";

/** Back from the background after this long is another opening, as a reload would be on the web. */
const AWAY_MS = 30 * 60_000;

/** The web page a phone screen stands for, so both count under one path. */
export function screenPath(pathname: string): string {
  const path = pathname.startsWith("/you/")
    ? pathname.slice("/you".length)
    : pathname === "/library/archived"
      ? "/archived"
      : pathname;
  return analyticsPath(path, "product");
}

/**
 * Tells PostHog who is signed in and whether their account allows analytics, then counts the
 * openings and screens the web counts as `app_opened` and `$pageview`. docs/analytics.md.
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

  return null;
}
