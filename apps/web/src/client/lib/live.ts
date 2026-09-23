import { LIVE_PING, LIVE_PONG, LiveMessage } from "@lymi/core";
import { type Query, type QueryClient, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

/** This page's id. Requests carry it so the channel does not echo the tab's own writes. ADR 0023. */
export const tabId =
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const PING_MS = 30_000;
/** One refetch for a burst, such as an assistant adding a lesson card by card. */
const SETTLE_MS = 250;
const RETRY_MS = [1_000, 2_000, 5_000, 10_000, 30_000];

/** A review keeps its round in the order it was fetched in, so only the review refreshes it. */
function refreshable(query: Query): boolean {
  const [root, , round] = query.queryKey;
  if (root === "dev") return false;
  return !(root === "queue" && round !== "draw");
}

/** Refetches what the screen shows and marks the rest stale for when it next mounts. */
export function refreshShown(qc: QueryClient) {
  return qc.invalidateQueries({ predicate: refreshable });
}

function liveUrl(): string {
  const url = new URL("/api/live", window.location.href);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("tab", tabId);
  return url.toString();
}

/**
 * Keeps this tab on the learner's channel while it is visible, and refreshes what it shows when a
 * change lands from elsewhere. A tab that was away catches up when it reconnects.
 */
export function useLiveUpdates(enabled: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled || typeof WebSocket === "undefined") return;
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let settle: ReturnType<typeof setTimeout> | undefined;
    let ping: ReturnType<typeof setInterval> | undefined;
    let failures = 0;
    let missed = false;
    let stopped = false;

    const refresh = () => {
      clearTimeout(settle);
      settle = setTimeout(() => void refreshShown(qc), SETTLE_MS);
    };

    const open = () => {
      if (stopped || socket || document.visibilityState !== "visible" || !navigator.onLine) return;
      clearTimeout(retry);
      const ws = new WebSocket(liveUrl());
      socket = ws;
      ws.onopen = () => {
        failures = 0;
        if (missed) {
          missed = false;
          refresh();
        }
        ping = setInterval(() => ws.send(LIVE_PING), PING_MS);
      };
      ws.onmessage = (event) => {
        if (event.data === LIVE_PONG || typeof event.data !== "string") return;
        let data: unknown;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        if (LiveMessage.safeParse(data).success) refresh();
      };
      ws.onclose = () => {
        clearInterval(ping);
        missed = true;
        if (socket !== ws) return;
        socket = null;
        if (stopped || document.visibilityState !== "visible") return;
        retry = setTimeout(open, RETRY_MS[Math.min(failures++, RETRY_MS.length - 1)]);
      };
    };

    const close = () => {
      clearTimeout(retry);
      clearInterval(ping);
      const ws = socket;
      socket = null;
      if (ws) {
        missed = true;
        ws.close(1000);
      }
    };

    const onVisibility = () => (document.visibilityState === "visible" ? open() : close());
    open();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", open);
    return () => {
      stopped = true;
      clearTimeout(settle);
      close();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", open);
    };
  }, [enabled, qc]);
}
