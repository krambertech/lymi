import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { useState } from "react";
import type { ViewCard, ViewSearchResult } from "../../../shared/mcp-app";
import { CardList, type ListedCard } from "../card-list";
import { ViewFrame } from "../view-frame";

/** Cards a search found, across decks, each with its deck's name. */
export function SearchView({ result }: { result: ViewSearchResult }) {
  const { t } = useLingui();
  const [cards, setCards] = useState<ListedCard[]>(result.cards);
  const count = result.total ?? cards.length;
  const title =
    cards.length === 0
      ? t`No cards found`
      : plural(count, { one: "# card found", other: "# cards found" });
  const replace = (saved: ViewCard) =>
    setCards((list) =>
      list.map((c) => (c.id === saved.id ? { ...saved, deckName: c.deckName } : c)),
    );
  return (
    <ViewFrame title={title}>
      {cards.length > 0 && (
        <CardList cards={cards} label={t`Cards found`} showDeck onSaved={replace} />
      )}
    </ViewFrame>
  );
}
