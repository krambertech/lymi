import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { Button } from "../components/button";
import { EmptyState, ErrorState } from "../components/empty-state";
import { Skeleton } from "../components/skeleton";
import type { CardHit, DeckSummary } from "../lib/api";
import { Page, PageHeader } from "./shell";

export interface ArchivedProps {
  /** Undefined while loading. */
  decks: DeckSummary[] | undefined;
  cards: CardHit[] | undefined;
  /** Nothing loaded and nothing cached to fall back on. */
  error?: boolean | undefined;
  onRetry: () => void;
  retrying?: boolean | undefined;
  onRestoreDeck: (deck: DeckSummary) => void;
  onRestoreCard: (card: CardHit) => void;
  /** The id of the row whose restore is in flight. */
  restoring?: string | undefined;
}

/**
 * Everything the learner archived and can put back: their decks, then the cards they archived
 * one at a time. A card inside an archived deck is not here, because its deck row brings it back.
 */
export function ArchivedView({
  decks,
  cards,
  error,
  onRetry,
  retrying,
  onRestoreDeck,
  onRestoreCard,
  restoring,
}: ArchivedProps) {
  const { t, i18n } = useLingui();
  const date = new Intl.DateTimeFormat(i18n.locale, { dateStyle: "medium" });
  // The client's Card type carries the Drizzle row's Date; the API sends the same field as a string.
  const when = (at: string | Date | null) => (at ? date.format(new Date(at)) : "");
  const loading = decks === undefined || cards === undefined;
  const nothing = !loading && decks.length === 0 && cards.length === 0;
  return (
    <Page width="md">
      <PageHeader
        title={t`Archived`}
        sub={t`Decks and cards you archived. Restore puts them back.`}
      />
      {error && loading ? (
        <ErrorState title={t`Couldn’t load Archived`} onRetry={onRetry} retrying={retrying} />
      ) : loading ? (
        <div className="grid gap-2">
          <Skeleton className="h-[72px] rounded-lg" />
          <Skeleton className="h-[72px] rounded-lg" />
        </div>
      ) : nothing ? (
        <EmptyState
          title={t`Nothing archived`}
          body={t`Archiving hides a card or deck. Nothing is deleted, and Restore puts it back.`}
          className="flex-1"
        />
      ) : (
        <div className="grid gap-8">
          {decks.length > 0 && (
            <Group heading={<Trans>Decks</Trans>} id="archived-decks">
              {decks.map((deck) => (
                <Row
                  key={deck.id}
                  name={deck.name}
                  detail={t`${plural(deck.total, { one: "# card", other: "# cards" })} · ${when(deck.archivedAt)}`}
                  busy={restoring === deck.id}
                  disabled={!!restoring}
                  onRestore={() => onRestoreDeck(deck)}
                />
              ))}
            </Group>
          )}
          {cards.length > 0 && (
            <Group heading={<Trans>Cards</Trans>} id="archived-cards">
              {cards.map((card) => (
                <Row
                  key={card.id}
                  name={card.term}
                  language={card.language}
                  detail={t`${card.deckName} · ${when(card.archivedAt)}`}
                  busy={restoring === card.id}
                  disabled={!!restoring}
                  onRestore={() => onRestoreCard(card)}
                />
              ))}
            </Group>
          )}
        </div>
      )}
    </Page>
  );
}

function Group({ heading, id, children }: { heading: ReactNode; id: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-2">
      <h2 id={id} className="text-md font-medium">
        {heading}
      </h2>
      <ul className="edge grid rounded-xl bg-plate">{children}</ul>
    </section>
  );
}

function Row({
  name,
  language,
  detail,
  busy,
  disabled,
  onRestore,
}: {
  name: string;
  language?: string | null | undefined;
  detail: string;
  busy: boolean;
  disabled: boolean;
  onRestore: () => void;
}) {
  const { t } = useLingui();
  return (
    <li className="flex min-h-[72px] items-center gap-3 border-edge px-4 py-3 [&:not(:first-child)]:border-t">
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="truncate text-md font-medium" lang={language ?? undefined}>
          {name}
        </span>
        <span className="truncate text-sm text-muted tabular-nums">{detail}</span>
      </span>
      <Button
        size="sm"
        loading={busy}
        aria-disabled={disabled}
        aria-label={t`Restore ${name}`}
        onClick={() => !disabled && onRestore()}
      >
        <Trans>Restore</Trans>
      </Button>
    </li>
  );
}
