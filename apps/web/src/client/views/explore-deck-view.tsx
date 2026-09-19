import { Plural, Trans, useLingui } from "@lingui/react/macro";
import type { ExploreDeckOut, PublicDeckOut } from "@lymi/core/catalog";
import { publisherAvatarPath } from "@lymi/core/catalog";
import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, Plus } from "lucide-react";
import { Button, buttonClass } from "../components/button";
import { DeckMeta, DeckTray } from "../components/deck-tray";
import { ErrorState } from "../components/empty-state";
import type { StaticNav } from "../components/nav-link";
import { PublisherMark } from "../components/publisher-mark";
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

/**
 * Stable keys for a list the projection gives no ids for. A repeated term is ordinary in a
 * vocabulary deck and two sections may share a name, so a name that has been seen carries how
 * many times: the same list always yields the same keys, and no key is just a position.
 */
function keyed<T>(items: readonly T[], nameOf: (item: T) => string): { item: T; key: string }[] {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const name = nameOf(item);
    const count = (seen.get(name) ?? 0) + 1;
    seen.set(name, count);
    return { item, key: count === 1 ? name : `${name}#${count}` };
  });
}

/**
 * The card this deck's tray shows: the first with a meaning, named with its section. It is the
 * tray the learner pressed on the shelf, so the same card meets them here in the same colour.
 */
function trayCardOf(deck: PublicDeckOut) {
  for (const section of deck.sections) {
    const card = section.cards.find((each) => each.meaning);
    if (card) return { term: card.term, meaning: card.meaning ?? "", section: section.name };
  }
  return null;
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
              <Trans>It may have been withdrawn. Find other decks in Explore.</Trans>
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
  const trayCard = trayCardOf(deck);

  return (
    <Page>
      <TopBar back={back} nested />
      {/* The name is inside the column, so the tray beside it starts level with the title rather
          than below the header. The deck's colour lives on that tray and nowhere else, so amber
          keeps the plain canvas it needs to read as the one thing to press. DESIGN.md, "Colour". */}
      <div className="grid items-start gap-7 @3xl:grid-cols-[minmax(0,1fr)_auto] @3xl:gap-12">
        <div className="grid justify-items-start gap-4">
          {/* The title is set here rather than through `PageHeader`, whose padding separates a
              header from the page below it and has nothing to separate inside this column. The
              type matches it exactly, so the name still lands where every other screen's does. */}
          <header>
            <h1
              lang={deck.meaningLanguage}
              className="flex min-h-10 items-center text-2xl font-medium leading-[1.2] text-text"
            >
              {deck.name}
            </h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted">
              {/* The photo is served by this Worker beside the deck's own media, so the path is
                  the deck's slug rather than anything naming the account. ADR 0016. */}
              <PublisherMark
                name={deck.publisher}
                src={
                  deck.publisherAvatar ? publisherAvatarPath(deck.slug, deck.publisherAvatar) : null
                }
                size={20}
              />
              <Trans>By {deck.publisher}</Trans>
            </p>
          </header>
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
                <Trans>Already in Library</Trans>
              </p>
            </div>
          ) : (
            <Button variant="primary" size="lg" onClick={onAdd} loading={adding}>
              <Plus aria-hidden="true" />
              <Trans>Add to Library</Trans>
            </Button>
          )}
        </div>
        {trayCard && (
          <DeckTray
            slug={deck.slug}
            cardCount={deck.cardCount}
            card={trayCard}
            language={deck.language}
            meaningLanguage={deck.meaningLanguage}
            size="lg"
            className="w-full rounded-xl @3xl:w-[312px]"
          />
        )}
      </div>

      <div className="pt-9 @3xl/shell:pt-11">
        {sections.length > 0 && (
          <section aria-labelledby="deck-path" className="pb-9">
            <h2 id="deck-path" className="text-lg font-medium text-text">
              <Trans>What you learn, in order</Trans>
            </h2>
            <ol className="edge mt-4 grid gap-px overflow-hidden rounded-md bg-edge">
              {keyed(sections, (section) => section.name ?? "").map(
                ({ item: section, key }, at) => (
                  <li key={key} className="flex items-center gap-3 bg-plate px-4 py-3 text-base">
                    <span className="w-5 shrink-0 text-sm text-muted tabular-nums">{at + 1}</span>
                    <span lang={deck.meaningLanguage} className="min-w-0 flex-1 truncate text-text">
                      {section.name}
                    </span>
                    <span className="shrink-0 text-sm text-muted tabular-nums">
                      <Plural value={section.cards.length} one="# card" other="# cards" />
                    </span>
                  </li>
                ),
              )}
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
            {keyed(deck.sections, (section) => section.name ?? "loose").map(
              ({ item: section, key }) => (
                <details key={key} className="group edge overflow-hidden rounded-md bg-plate">
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
                    {keyed(section.cards, (card) => card.term).map(({ item: card, key }) => (
                      <li
                        key={key}
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
              ),
            )}
          </div>
        </section>
      </div>
    </Page>
  );
}
