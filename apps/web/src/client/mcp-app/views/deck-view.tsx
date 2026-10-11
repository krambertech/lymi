import { plural } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ExternalLink } from "lucide-react";
import { productLinks, type ViewDeckResult } from "../../../shared/mcp-app";
import { Button } from "../../components/button";
import { useHost } from "../host";
import { StageCounts } from "../stage-counts";
import { ViewFrame } from "../view-frame";

/** How a deck is doing: its size, what is due, and how far its cards have come. */
export function DeckView({ result }: { result: ViewDeckResult }) {
  const host = useHost();
  const links = productLinks(host.origin);
  const { deck, total, due, stages } = result;
  return (
    <ViewFrame
      title={deck.name}
      action={
        <Button size="sm" variant="ghost" onClick={() => host.open(links.deck(deck.id))}>
          <Trans>Open in Lymi</Trans>
          <ExternalLink data-icon="inline-end" aria-hidden="true" />
        </Button>
      }
    >
      {total === 0 ? (
        <p className="text-sm text-muted">
          <Trans>No cards yet.</Trans>
        </p>
      ) : (
        <>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-2">
            <span className="tabular-nums">
              {plural(total, { one: "# card", other: "# cards" })}
            </span>
            {due > 0 && (
              <span className="font-medium tabular-nums text-text">
                {plural(due, { one: "# due now", other: "# due now" })}
              </span>
            )}
          </p>
          <StageCounts stages={stages} bar />
          {due > 0 && (
            <div>
              <Button size="sm" variant="primary" onClick={() => host.open(links.review(deck.id))}>
                <Trans>Review in Lymi</Trans>
                <ExternalLink data-icon="inline-end" aria-hidden="true" />
              </Button>
            </div>
          )}
        </>
      )}
    </ViewFrame>
  );
}
