import { LIVE_PING, LIVE_PONG, LiveMessage } from "@lymi/core";
import { type Query, type QueryClient, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { tabId } from "./tab";
import { flushWrites } from "./writes";

const PING_MS = 30_000;
/** One refetch for a burst, such as an assistant adding a lesson card by card. ADR 0024. */
const SETTLE_MS = 250;
/** Handshakes that fail in a row before the tab stops trying until it is shown or back online. */
const RETRY_MS = [1_000, 2_000, 5_000, 10_000, 30_000];

/** A review keeps its round in the order it was fetched in, so only the review refreshes it. */
function refreshable(query: Query): boolean {
  const [root, , round] = query.queryKey;
  if (root === "dev") return false;
  return !(root === "queue" && round !== "draw");
}

/**
 * Refetches what the screen shows and marks the rest stale for when it next mounts. A fetch
 * already on its way is left to land, since it started after whatever asked for this.
 */
export function refreshShown(qc: QueryClient) {
  return qc.invalidateQueries({ predicate: refreshable }, { cancelRefetch: false });
}

let pending: ReturnType<typeof setTimeout> | undefined;

/**
 * The one refresh every reason shares: a change from elsewhere, and queued writes landing on
 * return. A burst within the pause is one refetch, held while a write of this tab's is in flight.
 */
export function scheduleRefresh(qc: QueryClient) {
  clearTimeout(pending);
  const run = () => {
    if (qc.isMutating() > 0) {
      pending = setTimeout(run, SETTLE_MS);
      return;
    }
    void refreshShown(qc);
  };
  pending = setTimeout(run, SETTLE_MS);
}

/** Sends what this device queued and, if any of it landed, refreshes with everything else. */
export async function syncWrites(qc: QueryClient) {
  const flushed = await flushWrites();
  if (flushed.sent + flushed.graded === 0) return;
  // Replayed grades change which cards a round holds, so here its order is fetched again too.
  void qc.invalidateQueries({ queryKey: ["queue"] });
  scheduleRefresh(qc);
}

type Socket = Pick<WebSocket, "send" | "close"> & {
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
};

export interface LiveDeps {
  open: () => Socket;
  /** Whether the tab is shown and online, so a connection is worth holding. */
  wanted: () => boolean;
  /** The server answered, so whatever this device queued can go now. */
  reached: () => void;
  /** Something changed elsewhere, now or while the tab was away. */
  changed: () => void;
}

/**
 * One tab's connection to the learner's channel. It holds a socket only while the tab is wanted,
 * and refreshes when another tab or device changed something, including while this one was away.
 */
export class LiveConnection {
  private socket: Socket | null = null;
  private retry: ReturnType<typeof setTimeout> | undefined;
  private ping: ReturnType<typeof setInterval> | undefined;
  private failures = 0;
  private seen: number | null = null;
  private stopped = false;

  constructor(private readonly deps: LiveDeps) {}

  /** Connects if the tab is wanted and not connected; after giving up, starts trying again. */
  resume = () => {
    if (this.stopped || this.socket || !this.deps.wanted()) return;
    clearTimeout(this.retry);
    this.failures = 0;
    this.connect();
  };

  /** Lets go of the socket while the tab is hidden; `seen` carries over to the next greeting. */
  pause = () => {
    clearTimeout(this.retry);
    clearInterval(this.ping);
    const socket = this.socket;
    this.socket = null;
    socket?.close(1000);
  };

  stop = () => {
    this.stopped = true;
    this.pause();
  };

  private connect() {
    const socket = this.deps.open();
    this.socket = socket;
    socket.onopen = () => {
      this.failures = 0;
      this.ping = setInterval(() => socket.send(LIVE_PING), PING_MS);
      this.deps.reached();
    };
    socket.onmessage = (event) => {
      if (event.data === LIVE_PONG || typeof event.data !== "string") return;
      let data: unknown;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      const message = LiveMessage.safeParse(data);
      if (message.success) this.receive(message.data);
    };
    socket.onclose = () => {
      clearInterval(this.ping);
      if (this.socket !== socket) return;
      this.socket = null;
      if (this.stopped || !this.deps.wanted()) return;
      // A refused handshake (signed out, or no channel here) looks the same as a dropped line.
      const delay = RETRY_MS[this.failures++];
      if (delay !== undefined) this.retry = setTimeout(() => this.connect(), delay);
    };
  }

  private receive(message: LiveMessage) {
    const missed = message.type === "hello" && this.seen !== null && message.version !== this.seen;
    this.seen = message.version;
    if (message.type === "changed" || missed) this.deps.changed();
  }
}

function liveUrl(): string {
  const url = new URL("/api/live", window.location.href);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("tab", tabId);
  return url.toString();
}

/** Keeps this tab on the learner's channel while it is visible and online. */
export function useLiveUpdates(enabled: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled || typeof WebSocket === "undefined") return;
    const live = new LiveConnection({
      open: () => new WebSocket(liveUrl()),
      wanted: () => document.visibilityState === "visible" && navigator.onLine,
      reached: () => void syncWrites(qc),
      changed: () => scheduleRefresh(qc),
    });
    const onVisibility = () =>
      document.visibilityState === "visible" ? live.resume() : live.pause();
    live.resume();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", live.resume);
    return () => {
      live.stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", live.resume);
    };
  }, [enabled, qc]);
}
