import { Plural, Trans, useLingui } from "@lingui/react/macro";
import type { ExploreDeckOut, PublicDeckOut } from "@lymi/core/catalog";
import { trayHue } from "@lymi/core/catalog";
import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, Plus } from "lucide-react";
import { Button, buttonClass } from "../components/button";
import { DeckMeta } from "../components/deck-tray";
import { ErrorState } from "../components/empty-state";
import { AppTile } from "../components/logo";
import type { StaticNav } from "../components/nav-link";
import { Skeleton } from "../components/skeleton";
import { BackButton, Page, PageHeader, TopBar } from "./shell";

interface Props {
  data: ExploreDeckOut | undefined;
  failed?: boolean | undefined;
  missing?: boolean | undefined;
  busy?: boolean | undefined;
  onRetry?: (() => void) | undefined;
  onAdd: () => void;
  adding?: boolean | undefined;
  st?: StaticNav;
}

type DeckCard = PublicDeckOut["sections"][number]["cards"][number];

/** How many of the deck's own cards rest beside its name. */
const HAND = 3;

/**
 * A few cards from across the deck, one per section before a second from any: the hand shows the
 * spread of what is inside rather than the first lesson. It follows the deck's own order, so one
 * revision always shows the same three.
 */
function handOf(deck: PublicDeckOut): DeckCard[] {
  const groups = deck.sections
    .map((section) => section.cards.filter((card) => card.meaning))
    .filter((cards) => cards.length > 0);
  const picked: DeckCard[] = [];
  const deepest = Math.max(0, ...groups.map((cards) => cards.length));
  for (let round = 0; round < deepest && picked.length < HAND; round++) {
    for (const cards of groups) {
      const card = cards[round];
      if (card && picked.length < HAND) picked.push(card);
    }
  }
  return picked;
}

export function ExploreDeckView({
  data,
  failed,
  missing,
  busy,
  onRetry,
  onAdd,
  adding,
  st,
}: Props) {
  const { t } = useLingui();
  const back = (
    <BackButton label={t`Explore`}>
      {(className, content) => (
        <Link to="/explore" disabled={!!st} className={className}>
          {content}
        </Link>
      )}
    </BackButton>
  );

  if (missing || failed) {
    return (
      <Page>
        <TopBar back={back} nested />
        <ErrorState
          title={
            missing ? (
              <Trans>This deck is not published</Trans>
            ) : (
              <Trans>Couldn’t load the deck</Trans>
            )
          }
          body={
            missing ? (
              <Trans>It may have been withdrawn. Explore has everything Lymi publishes now.</Trans>
            ) : undefined
          }
          onRetry={missing ? undefined : onRetry}
          retrying={busy}
          action={
            missing ? (
              <Link to="/explore" disabled={!!st} className={buttonClass("primary")}>
                <Trans>Back to Explore</Trans>
              </Link>
            ) : undefined
          }
        />
      </Page>
    );
  }

  if (!data) {
    return (
      <Page>
        <TopBar back={back} nested />
        <PageHeader title={<Skeleton className="h-8 w-56" />} />
        <Skeleton className="h-12 w-52 rounded-md" />
      </Page>
    );
  }

  const { deck, deckId } = data;
  const sections = deck.sections.filter((section) => section.name !== null);
  const hand = handOf(deck);

  return (
    <Page>
      {/* The deck's own tray colour, run out to the column's edges: the negative margins undo the
          page's padding. `over-tint` turns the surfaces inside into translucent ink, so nothing
          paints grey on the colour. */}
      <div
        className="deck-hero over-tint -mx-5 -mt-5 px-5 pt-5 pb-7 @3xl/shell:-mx-8 @3xl/shell:-mt-8 @3xl/shell:px-8 @3xl/shell:pt-8 @3xl/shell:pb-9"
        data-hue={trayHue(deck.slug)}
      >
        <TopBar back={back} nested />
        <PageHeader
          title={<span lang={deck.meaningLanguage}>{deck.name}</span>}
          sub={
            <span className="flex items-center gap-1.5">
              <AppTile size={18} />
              <Trans>By {deck.publisher}</Trans>
            </span>
          }
          className="pb-5 @3xl:pb-6"
        />
        <div className="grid items-center gap-7 @3xl:grid-cols-[minmax(0,1fr)_auto] @3xl:gap-10">
          <div className="grid justify-items-start gap-4">
            <p lang={deck.meaningLanguage} className="max-w-[52ch] text-md text-pretty text-text-2">
              {deck.summary}
            </p>
            <DeckMeta
              deck={{ level: deck.level, cardCount: deck.cardCount, sectionCount: sections.length }}
              className="text-sm"
            />
            {deckId ? (
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/library/$deckId"
                  params={{ deckId }}
                  disabled={!!st}
                  className={buttonClass("secondary")}
                >
                  <Trans>Open in Library</Trans>
                </Link>
                <p className="flex items-center gap-1.5 text-sm text-text-2 [&_svg]:size-4">
                  <Check aria-hidden="true" className="text-state-known" />
                  <Trans>Already in your library</Trans>
                </p>
              </div>
            ) : (
              <Button variant="primary" size="lg" onClick={onAdd} loading={adding}>
                <Plus aria-hidden="true" />
                <Trans>Add to your library</Trans>
              </Button>
            )}
          </div>
          {/* Decoration: every one of these cards is in the list further down, named there. */}
          {hand.length > 0 && (
            <div className="deck-hand" aria-hidden="true">
              {hand.map((card, at) => (
                <article key={card.term} className="deck-hand-card" data-at={at}>
                  <p lang={deck.language ?? undefined} className="deck-tray-term">
                    {card.term}
                  </p>
                  <p lang={deck.meaningLanguage} className="deck-tray-meaning">
                    {card.meaning}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="pt-8 @3xl/shell:pt-10">
        {sections.length > 0 && (
          <section aria-labelledby="deck-path" className="pb-9">
            <h2 id="deck-path" className="text-lg font-medium text-text">
              <Trans>What you learn, in order</Trans>
            </h2>
            <ol className="edge mt-4 grid gap-px overflow-hidden rounded-md bg-edge">
              {sections.map((section, at) => (
                <li
                  key={section.name}
                  className="flex items-center gap-3 bg-plate px-4 py-3 text-base"
                >
                  <span className="w-5 shrink-0 text-sm text-muted tabular-nums">{at + 1}</span>
                  <span lang={deck.meaningLanguage} className="min-w-0 flex-1 truncate text-text">
                    {section.name}
                  </span>
                  <span className="shrink-0 text-sm text-muted tabular-nums">
                    <Plural value={section.cards.length} one="# card" other="# cards" />
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-sm text-muted">
              <Trans>You start with the first section. The next opens as you learn this one.</Trans>
            </p>
          </section>
        )}

        {/* The full list is what a learner checks before committing, so it is here and closed. */}
        <section aria-labelledby="deck-cards">
          <h2 id="deck-cards" className="text-lg font-medium text-text">
            <Trans>Every card</Trans>
          </h2>
          <div className="mt-4 grid gap-2">
            {deck.sections.map((section) => (
              <details
                key={section.name ?? "loose"}
                className="group edge overflow-hidden rounded-md bg-plate"
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-base text-text transition-colors duration-150 hoverable:hover:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
                  <span lang={deck.meaningLanguage} className="min-w-0 flex-1 truncate">
                    {section.name ?? <Trans>Cards outside a section</Trans>}
                  </span>
                  <span className="shrink-0 text-sm text-muted tabular-nums">
                    <Plural value={section.cards.length} one="# card" other="# cards" />
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className="size-[18px] shrink-0 text-muted transition-transform duration-150 group-open:rotate-180"
                  />
                </summary>
                <ul className="grid gap-px border-t border-edge bg-edge">
                  {section.cards.map((card) => (
                    <li
                      key={card.term}
                      className="grid gap-0.5 bg-plate px-4 py-2.5 @md:grid-cols-2 @md:gap-4"
                    >
                      <span lang={deck.language ?? undefined} className="text-base text-text">
                        {card.term}
                      </span>
                      <span lang={deck.meaningLanguage} className="text-base text-text-2">
                        {card.meaning}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </section>
      </div>
    </Page>
  );
}
