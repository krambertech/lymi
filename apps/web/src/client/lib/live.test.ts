import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LiveConnection, type LiveDeps, refreshShown } from "./live";

describe("refreshShown", () => {
  it("refreshes everything but a review round's fixed order", async () => {
    const qc = new QueryClient();
    const keys = [
      ["decks"],
      ["decks", "d1", "cards"],
      ["queue", "all", "draw"],
      ["queue", "all", "order"],
      ["queue", "all", "forgotten"],
      ["dev", "personas"],
    ];
    for (const key of keys) qc.setQueryData(key, 1);
    await refreshShown(qc);
    const stale = keys
      .filter((key) => qc.getQueryState(key)?.isInvalidated)
      .map((k) => k.join("/"));
    expect(stale).toEqual(["decks", "decks/d1/cards", "queue/all/draw"]);
  });
});

class FakeSocket {
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  closed = false;
  send = vi.fn();
  close = () => {
    this.closed = true;
    this.onclose?.({} as CloseEvent);
  };
  accept() {
    this.onopen?.({} as Event);
  }
  refuse() {
    this.onclose?.({} as CloseEvent);
  }
  say(type: "hello" | "changed" | "version", version: number) {
    this.onmessage?.({ data: JSON.stringify({ type, version }) } as MessageEvent);
  }
}

describe("LiveConnection", () => {
  let sockets: FakeSocket[];
  let wanted: boolean;
  let busy: boolean;
  let refreshes: number;
  let live: LiveConnection;
  const last = () => sockets[sockets.length - 1] as FakeSocket;

  beforeEach(() => {
    vi.useFakeTimers();
    sockets = [];
    wanted = true;
    busy = false;
    refreshes = 0;
    const deps: LiveDeps = {
      open: () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket;
      },
      wanted: () => wanted,
      busy: () => busy,
      refresh: () => {
        refreshes++;
      },
    };
    live = new LiveConnection(deps);
    live.resume();
    last().accept();
  });

  afterEach(() => {
    live.stop();
    vi.useRealTimers();
  });

  it("refreshes once for a burst of changes from elsewhere, and not on the first greeting", () => {
    last().say("hello", 4);
    vi.advanceTimersByTime(1_000);
    expect(refreshes).toBe(0);
    last().say("changed", 5);
    last().say("changed", 6);
    vi.advanceTimersByTime(300);
    expect(refreshes).toBe(1);
  });

  it("waits for this tab's own writes to land before refreshing", () => {
    last().say("hello", 0);
    busy = true;
    last().say("changed", 1);
    vi.advanceTimersByTime(2_000);
    expect(refreshes).toBe(0);
    busy = false;
    vi.advanceTimersByTime(300);
    expect(refreshes).toBe(1);
  });

  it("comes back from hiding without a refresh when nothing changed", () => {
    last().say("hello", 3);
    // The tab's own write while it was shown.
    last().say("version", 4);
    wanted = false;
    live.pause();
    wanted = true;
    live.resume();
    last().accept();
    last().say("hello", 4);
    vi.advanceTimersByTime(1_000);
    expect(refreshes).toBe(0);
  });

  it("refreshes on return when something changed while it was away", () => {
    last().say("hello", 3);
    live.pause();
    live.resume();
    last().say("hello", 5);
    vi.advanceTimersByTime(300);
    expect(refreshes).toBe(1);
  });

  it("stops retrying a refused handshake until the tab is shown again", () => {
    last().refuse();
    for (const delay of [1_000, 2_000, 5_000, 10_000, 30_000]) {
      vi.advanceTimersByTime(delay);
      last().refuse();
    }
    const tried = sockets.length;
    vi.advanceTimersByTime(600_000);
    expect(sockets.length).toBe(tried);
    live.resume();
    expect(sockets.length).toBe(tried + 1);
  });

  it("does not reconnect while the tab is hidden", () => {
    wanted = false;
    last().refuse();
    vi.advanceTimersByTime(60_000);
    expect(sockets).toHaveLength(1);
  });
});
