import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { productLinks, type ViewCard, type ViewDeckResult } from "../../../shared/mcp-app";
import { Button } from "../../components/button";
import { CardList, type ListedCard } from "../card-list";
import { useHost } from "../host";
import { ViewFrame } from "../view-frame";

/** A deck's newest cards shown at first; the rest wait behind Show more. */
const FIRST_PAGE = 8;

export function DeckView({ result }: { result: ViewDeckResult }) {
  const { t } = useLingui();
  const host = useHost();
  const links = productLinks(host.origin);
  const [cards, setCards] = useState<ListedCard[]>(result.cards);
  const [shown, setShown] = useState(FIRST_PAGE);
  const replace = (saved: ViewCard) =>
    setCards((list) => list.map((c) => (c.id === saved.id ? saved : c)));
  return (
    <ViewFrame
      title={result.deck.name}
      action={
        <Button size="sm" variant="ghost" onClick={() => host.open(links.deck(result.deck.id))}>
          <Trans>Open in Lymi</Trans>
          <ExternalLink data-icon="inline-end" aria-hidden="true" />
        </Button>
      }
    >
      <p className="text-sm text-muted">
        {plural(result.total, { one: "# card, newest first", other: "# cards, newest first" })}
      </p>
      {cards.length > 0 && (
        <CardList cards={cards.slice(0, shown)} label={t`Cards`} onSaved={replace} />
      )}
      {cards.length > shown && (
        <div>
          <Button size="sm" variant="ghost" onClick={() => setShown((n) => n + FIRST_PAGE)}>
            <Trans>Show more</Trans>
          </Button>
        </div>
      )}
    </ViewFrame>
  );
}
