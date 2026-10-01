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
  return { kind: match[1] as DeepLinkTarget["kind"], id: match[2] };
}

/** Loads what a deep link names and shows it in the view the tool result would have. */
export function DeepLink({ target }: { target: DeepLinkTarget }) {
  const host = useHost();
  const [outcome, setOutcome] = useState<ToolOutcome<ViewCard | ViewDeckResult> | null>(null);
  useEffect(() => {
    let current = true;
    setOutcome(null);
    const call =
      target.kind === "card"
        ? host.call<ViewCard>("get_card", { cardId: target.id })
        : host.call<ViewDeckResult>("get_deck", { deckId: target.id });
    void call.then((answer) => {
      if (current) setOutcome(answer);
    });
    return () => {
      current = false;
    };
  }, [target.kind, target.id, host]);

  if (!outcome) {
    return (
      <div aria-busy="true" className="flex flex-col gap-3 p-4">
        <Skeleton className="h-5 w-48 rounded" />
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
    );
  }
  if (!outcome.ok) return <ToolError message={outcome.message || null} />;
  return target.kind === "card" ? (
    <CardView card={outcome.data as ViewCard} />
  ) : (
    <DeckView result={outcome.data as ViewDeckResult} />
  );
}
