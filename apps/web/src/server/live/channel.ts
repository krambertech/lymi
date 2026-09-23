import { DurableObject } from "cloudflare:workers";
import { LIVE_PING, LIVE_PONG, type LiveMessage } from "@lymi/core";
import type { Bindings } from "../env";

/**
 * One learner's open tabs. It holds their WebSockets and nothing else: a write tells it that
 * something changed, and every other tab refetches what it shows. ADR 0023.
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
    // The tag is the tab's own id, so its own writes are not echoed back to it.
    this.ctx.acceptWebSocket(server, tab ? [tab] : []);
    return new Response(null, { status: 101, webSocket: client });
  }

  /** Tells every tab except the one that made the change. */
  changed(fromTab: string | null): void {
    const message = JSON.stringify({ type: "changed" } satisfies LiveMessage);
    for (const socket of this.ctx.getWebSockets()) {
      if (fromTab && this.ctx.getTags(socket).includes(fromTab)) continue;
      try {
        socket.send(message);
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
}
