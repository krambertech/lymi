import { Trans } from "@lingui/react/macro";
import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { productLinks, type ViewCard } from "../../../shared/mcp-app";
import { Button } from "../../components/button";
import { SourceChip } from "../../components/chip";
import { CardEditor } from "../card-editor";
import { CardDetails } from "../card-list";
import { useHost } from "../host";
import { ViewFrame } from "../view-frame";

/** One card, as `get_card` or `update_card` returned it, editable in place. */
export function CardView({ card: initial }: { card: ViewCard }) {
  const host = useHost();
  const links = productLinks(host.origin);
  const [card, setCard] = useState(initial);
  const [editing, setEditing] = useState(false);

  return (
    <ViewFrame
      title={card.term}
      action={
        <Button
          size="sm"
          variant="ghost"
          onClick={() => host.open(links.card(card.deckId, card.id))}
        >
          <Trans>Open in Lymi</Trans>
          <ExternalLink data-icon="inline-end" aria-hidden="true" />
        </Button>
      }
    >
      {editing ? (
        <CardEditor
          card={card}
          onCancel={() => setEditing(false)}
          onSaved={(saved) => {
            setCard(saved);
            setEditing(false);
            host.select(saved);
          }}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="flex flex-wrap items-center gap-2 text-text-2">
            <span>{card.meaning}</span>
            {card.meaningSource === "ai" && <SourceChip source="ai" field="meaning" size="xs" />}
          </p>
          <CardDetails card={card}>
            <div>
              <Button size="sm" onClick={() => setEditing(true)}>
                <Trans>Edit</Trans>
              </Button>
            </div>
          </CardDetails>
        </div>
      )}
    </ViewFrame>
  );
}
