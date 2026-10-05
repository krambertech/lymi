import type { CallToolResult } from "@modelcontextprotocol/client";
import type { App } from "@modelcontextprotocol/ext-apps";
import { createContext, useContext } from "react";
import type { ViewCard } from "../../shared/mcp-app";

export type ToolOutcome<T> = { ok: true; data: T } | { ok: false; message: string };

/**
 * What a view may ask of the assistant it runs in. Views take this rather than the MCP Apps
 * `App`, so the design page and the component tests can render them against a stand-in.
 */
export interface Host {
  /** A Lymi tool, called with the connection's own grant. */
  call<T>(tool: string, args: Record<string, unknown>): Promise<ToolOutcome<T>>;
  open(url: string): void;
  /** Tells the assistant which card the learner means, or that they deselected it. */
  select(card: (ViewCard & { deckName?: string | undefined }) | null): void;
  /** Lymi's own origin, for links into the app. */
  origin: string;
}

export const HostContext = createContext<Host | null>(null);

export function useHost(): Host {
  const host = useContext(HostContext);
  if (!host) throw new Error("useHost needs a HostContext");
  return host;
}

/** The structured result, or the message a refused or failed call carries. */
export function outcomeOf<T>(result: CallToolResult): ToolOutcome<T> {
  if (result.isError) {
    const text = result.content?.find((block) => block.type === "text");
    return { ok: false, message: text && "text" in text ? text.text : "" };
  }
  return { ok: true, data: result.structuredContent as T };
}

export function bridgeHost(app: App, origin: string): Host {
  return {
    origin,
    async call<T>(tool: string, args: Record<string, unknown>) {
      try {
        return outcomeOf<T>(await app.callServerTool({ name: tool, arguments: args }));
      } catch {
        return { ok: false, message: "" };
      }
    },
    open(url) {
      void app.openLink({ url }).catch(() => window.open(url, "_blank", "noopener"));
    },
    select(card) {
      // Only the card in hand: its id, so a follow-up tool call can name it, and the text the
      // learner sees. Nothing else the view shows enters model context. ADR 0026.
      void app
        .updateModelContext(
          card
            ? {
                content: [
                  {
                    type: "text",
                    text: `The learner selected the Lymi card "${card.term}" (cardId ${card.id}${card.deckName ? `, deck ${card.deckName}` : ""}). Meaning: ${card.meaning ?? "none yet"}.`,
                  },
                ],
                structuredContent: {
                  selectedCard: {
                    id: card.id,
                    deckId: card.deckId,
                    term: card.term,
                    meaning: card.meaning,
                  },
                },
              }
            : { content: [] },
        )
        .catch(() => {});
    },
  };
}
