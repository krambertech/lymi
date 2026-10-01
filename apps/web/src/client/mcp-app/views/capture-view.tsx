import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { ExternalLink } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  productLinks,
  type ViewAddResult,
  type ViewCard,
  type ViewSearchResult,
} from "../../../shared/mcp-app";
import { Button } from "../../components/button";
import { CardList, type ListedCard } from "../card-list";
import { useHost } from "../host";
import { ViewFrame } from "../view-frame";

/** How often, and how many times, a result with cards still being filled checks again. */
const ENRICH_POLL_MS = 4000;
const ENRICH_POLL_LIMIT = 15;

interface Props {
  result: ViewAddResult;
  /** Deck names by id, so a card added to a deck says which. */
  decks: Record<string, string>;
}

/**
 * What an add did: the cards that landed, then the terms that were already in the learner's
 * decks. Cards Lymi is still filling update in place while the view is open.
 */
export function CaptureView({ result, decks }: Props) {
  const { t } = useLingui();
  const host = useHost();
  const links = productLinks(host.origin);
  const [added, setAdded] = useState<ListedCard[]>(() =>
    result.results.flatMap((r) =>
      r.status === "added" && r.card ? [{ ...r.card, deckName: decks[r.card.deckId] }] : [],
    ),
  );
  // Two terms in one batch can name the same existing card; it is listed once.
  const skipped = useMemo<ListedCard[]>(() => {
    const byId = new Map<string, ListedCard>();
    for (const r of result.results) {
      if (r.status === "skipped" && r.existing) byId.set(r.existing.id, r.existing);
    }
    return [...byId.values()];
  }, [result]);
  const deckIds = [...new Set(added.map((c) => c.deckId))];
  const multipleDecks = deckIds.length > 1;
  const onlyDeck = deckIds.length === 1 ? deckIds[0] : undefined;

  useEnrichmentRefresh(added, setAdded);

  const replace = (saved: ViewCard) =>
    setAdded((cards) =>
      cards.map((c) => (c.id === saved.id ? { ...saved, deckName: c.deckName } : c)),
    );

  const deckName = onlyDeck ? decks[onlyDeck] : undefined;
  const title =
    added.length === 0
      ? t`Nothing new to add`
      : deckName
        ? plural(added.length, {
            one: `Added # card to ${deckName}`,
            other: `Added # cards to ${deckName}`,
          })
        : plural(added.length, { one: "Added # card", other: "Added # cards" });

  return (
    <ViewFrame
      title={title}
      action={
        onlyDeck ? (
          <Button size="sm" variant="ghost" onClick={() => host.open(links.deck(onlyDeck))}>
            <Trans>Open deck</Trans>
            <ExternalLink data-icon="inline-end" aria-hidden="true" />
          </Button>
        ) : undefined
      }
    >
      {added.length > 0 && (
        <CardList cards={added} label={t`Added`} showDeck={multipleDecks} onSaved={replace} />
      )}
      {skipped.length > 0 && (
        <section className="flex flex-col gap-1">
          <h2 className="px-2 pt-3 text-sm font-medium text-text-2">
            {plural(skipped.length, {
              one: "# already in your decks",
              other: "# already in your decks",
            })}
          </h2>
          <CardList cards={skipped} label={t`Already in your decks`} showDeck />
        </section>
      )}
    </ViewFrame>
  );
}

/** Re-reads the batch while Lymi fills it, through one search per round rather than one call per card. */
function useEnrichmentRefresh(
  cards: ListedCard[],
  setCards: (update: (cards: ListedCard[]) => ListedCard[]) => void,
) {
  const host = useHost();
  const working = cards.filter((c) => c.enrichmentStatus === "working").length > 0;
  const decks = [...new Set(cards.map((c) => c.deckId))].join(",");
  const since = cards.reduce((min, c) => (c.createdAt < min ? c.createdAt : min), "9999");
  // Counted across restarts, so a batch that never settles stops asking.
  const rounds = useRef(0);
  useEffect(() => {
    if (!working || !decks) return;
    let stopped = false;
    const tick = async () => {
      if (stopped || document.hidden || rounds.current >= ENRICH_POLL_LIMIT) return;
      rounds.current += 1;
      const page = await host.call<ViewSearchResult>("search_cards", {
        filter: { deckId: { in: decks.split(",") }, createdAt: { gte: since } },
        limit: 200,
      });
      if (stopped || !page.ok) return;
      const fresh = new Map(page.data.cards.map((c) => [c.id, c]));
      setCards((list) =>
        list.map((c) => {
          const next = fresh.get(c.id);
          return next ? { ...next, deckName: c.deckName } : c;
        }),
      );
    };
    const timer = window.setInterval(() => void tick(), ENRICH_POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [working, decks, since, host, setCards]);
}
