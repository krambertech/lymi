import { useEffect, useState } from "react";
import type { ViewCard, ViewDeckResult } from "../../shared/mcp-app";
import { Skeleton } from "../components/skeleton";
import { type ToolOutcome, useHost } from "./host";
import { ToolError } from "./tool-error";
import { CardView } from "./views/card-view";
import { DeckView } from "./views/deck-view";

export type DeepLinkTarget = { kind: "card" | "deck"; id: string };

/** `/card/<id>` and `/deck/<id>` are the paths a link into Lymi's home may carry. */
export function deepLinkTarget(path: string | undefined): DeepLinkTarget | null {
  const match = path?.match(/^\/(card|deck)\/([\w-]+)\/?(?:[?#].*)?$/);
  if (!match?.[1] || !match[2]) return null;
  return { kind: match[1] === "card" ? "card" : "deck", id: match[2] };
}

/** Loads what a deep link names and shows it in the view its tool result would have. */
export function DeepLink({ target }: { target: DeepLinkTarget }) {
  const card = useToolResult<ViewCard>(target.kind === "card" ? "get_card" : null, {
    cardId: target.id,
  });
  const deck = useToolResult<ViewDeckResult>(target.kind === "deck" ? "get_deck" : null, {
    deckId: target.id,
  });
  const outcome = card ?? deck;
  if (!outcome) {
    return (
      <div aria-busy="true" className="flex flex-col gap-3 p-4">
        <Skeleton className="h-5 w-48 rounded" />
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
    );
  }
  if (!outcome.ok) return <ToolError message={outcome.message || null} />;
  if (card?.ok) return <CardView card={card.data} />;
  if (deck?.ok) return <DeckView result={deck.data} />;
  return null;
}

/** One tool call's outcome, or null while it runs or when `tool` is null. */
function useToolResult<T>(
  tool: string | null,
  args: Record<string, string>,
): ToolOutcome<T> | null {
  const host = useHost();
  const [outcome, setOutcome] = useState<ToolOutcome<T> | null>(null);
  const key = JSON.stringify(args);
  useEffect(() => {
    setOutcome(null);
    if (!tool) return;
    let current = true;
    void host.call<T>(tool, JSON.parse(key)).then((answer) => {
      if (current) setOutcome(answer);
    });
    return () => {
      current = false;
    };
  }, [tool, key, host]);
  return outcome;
}
