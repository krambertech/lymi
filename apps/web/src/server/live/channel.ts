import { DurableObject } from "cloudflare:workers";
import { LIVE_PING, LIVE_PONG, type LiveMessage } from "@lymi/core";
import type { Bindings } from "../env";

const VERSION = "version";

/**
 * One learner's open tabs. It holds their WebSockets and a count of the learner's changes: a
 * write raises the count and tells every tab, and a tab that was away compares the count it last
 * saw with the one it is greeted with, so it refetches only when something changed. ADR 0023.
 */
export class LiveChannel extends DurableObject<Bindings> {
  constructor(ctx: DurableObjectState, env: Bindings) {
    super(ctx, env);
    // Keepalives are answered without waking the object.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(LIVE_PING, LIVE_PONG));
  }

  override async fetch(request: Request): Promise<Response> {
    const tab = new URL(request.url).searchParams.get("tab") ?? "";
    const { 0: client, 1: server } = new WebSocketPair();
    // The tag is the tab's own id, so its own writes reach it as a count and not a refresh.
    this.ctx.acceptWebSocket(server, tab ? [tab] : []);
    server.send(JSON.stringify({ type: "hello", version: this.version() } satisfies LiveMessage));
    return new Response(null, { status: 101, webSocket: client });
  }

  /** Raises the count and tells every tab; the tab that made the change only records it. */
  changed(fromTab: string | null): void {
    const version = this.version() + 1;
    this.ctx.storage.kv.put(VERSION, version);
    const changed = JSON.stringify({ type: "changed", version } satisfies LiveMessage);
    const own = JSON.stringify({ type: "version", version } satisfies LiveMessage);
    for (const socket of this.ctx.getWebSockets()) {
      const mine = !!fromTab && this.ctx.getTags(socket).includes(fromTab);
      try {
        socket.send(mine ? own : changed);
      } catch {
        // A socket closing as this runs has nobody left to tell.
      }
    }
  }

  override webSocketMessage(): void {}

  override webSocketClose(socket: WebSocket, code: number): void {
    try {
      // 1005 and 1006 carry no status and may not be echoed back.
      socket.close(code === 1005 || code === 1006 ? 1000 : code);
    } catch {
      // Already closed.
    }
  }

  private version(): number {
    return this.ctx.storage.kv.get<number>(VERSION) ?? 0;
  }
}
