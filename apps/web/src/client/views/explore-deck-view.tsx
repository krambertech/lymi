import { Plural, Trans, useLingui } from "@lingui/react/macro";
import type { ExploreDeckOut, PublicDeckOut } from "@lymi/core/catalog";
import { publisherAvatarPath, trayHue } from "@lymi/core/catalog";
import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import { ArrowRight, Check, ChevronDown, Plus } from "lucide-react";
import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";
import { Button, buttonClass } from "../components/button";
import { DeckMeta, TrayCardFace } from "../components/deck-tray";
import { ErrorState } from "../components/empty-state";
import { Screen } from "../components/layout/screen";
import type { StaticNav } from "../components/nav-link";
import { PublisherMark } from "../components/publisher-mark";
import { Skeleton } from "../components/skeleton";

interface Props {
  data: ExploreDeckOut | undefined;
  failed?: boolean | undefined;
  missing?: boolean | undefined;
  busy?: boolean | undefined;
  onRetry?: (() => void) | undefined;
  onAdd: () => void;
  adding?: boolean | undefined;
  /** This page's own press added the deck, so its arrival plays rather than a refetch's. */
  added?: boolean | undefined;
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

type HandCard = { term: string; meaning: string; section: string | null };

// One card per section before a second from any, so three cards show the deck's range.
function handOf(deck: PublicDeckOut): HandCard[] {
  const hand: HandCard[] = [];
  const sections = deck.sections.map((section) => ({
    name: section.name,
    cards: section.cards.filter((card) => card.meaning),
  }));
  for (let round = 0; hand.length < 3; round++) {
    const taken = hand.length;
    for (const section of sections) {
      const card = section.cards[round];
      if (card && hand.length < 3) {
        hand.push({ term: card.term, meaning: card.meaning ?? "", section: section.name });
      }
    }
    if (hand.length === taken) break;
  }
  return hand;
}

// Step from the middle, drop and tilt for a hand of one, two or three; the first lies on top.
const FANS: [number, number, number][][] = [
  [[0, 0, -2]],
  [
    [0.4, 0, 3],
    [-0.4, 14, -4],
  ],
  [
    [0, 0, 1],
    [-1, 18, -7],
    [1, 22, 6],
  ],
];
// The same cards squared into a stack once the deck is in Library.
const STACK: [number, number, number][] = [
  [0, 0, -1],
  [-7, 8, -3],
  [8, 6, 2.5],
];

// Hidden from a screen reader, which reads the same cards in the list below.
function DeckHand({
  deck,
  cards,
  gathered,
  className,
}: {
  deck: PublicDeckOut;
  cards: HandCard[];
  gathered: boolean;
  className?: string | undefined;
}) {
  const fan = FANS[cards.length - 1] ?? [];
  return (
    <div
      className={clsx("deck-hand", className)}
      data-gathered={gathered || undefined}
      aria-hidden="true"
    >
      {cards.map((card, at) => {
        const [step, drop, tilt] = fan[at] ?? [0, 0, 0];
        const [x, y, r] = STACK[at] ?? [0, 0, 0];
        const style = {
          "--step": step,
          "--drop": `${drop}px`,
          "--tilt": `${tilt}deg`,
          "--sx": `${x}px`,
          "--sy": `${y}px`,
          "--sr": `${r}deg`,
          zIndex: cards.length - at,
          transitionDelay: `${at * 40}ms`,
        } as CSSProperties;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed hand; a term can repeat.
          <div key={at} className="deck-hand-card" style={style}>
            <TrayCardFace
              card={card}
              language={deck.language}
              meaningLanguage={deck.meaningLanguage}
            />
            {at === 0 && (
              <span className="deck-hand-seal">
                <Check strokeWidth={2.5} />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ExploreDeckView({
  data,
  failed,
  missing,
  busy,
  onRetry,
  onAdd,
  adding,
  added,
  st,
}: Props) {
  const { t } = useLingui();
  const deckId = data?.deckId;
  // The refetch that brings the deck in lands before the press settles, so either state counts.
  const arrived = (adding || added) === true && !!deckId;
  const open = useRef<HTMLAnchorElement>(null);
  // The pressed button is gone, so focus moves to the press that replaces it.
  useEffect(() => {
    if (arrived) open.current?.focus({ preventScroll: true });
  }, [arrived]);

  const back = { label: t`Explore`, to: "/explore" };

  if (missing || failed) {
    return (
      <Screen back={back} ownTitle>
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
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen title={undefined} back={back}>
        <Skeleton className="h-12 w-52 rounded-md" />
      </Screen>
    );
  }

  const { deck } = data;
  const { name } = deck;
  const sections = deck.sections.filter((section) => section.name !== null);
  const hand = handOf(deck);

  // The deck's colour runs under its whole header, back included. docs/design/explore.md.
  const cover = (bar: ReactNode) => (
    <div className="deck-cover" data-hue={trayHue(deck.slug)}>
      <div className="mx-auto w-full max-w-(--column) px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-9 @3xl/shell:px-8 @3xl/shell:pt-[calc(env(safe-area-inset-top)+2rem)] @3xl/shell:pb-11">
        {bar}
        <div className="grid items-center gap-6 @4xl:grid-cols-[minmax(0,1fr)_auto] @4xl:gap-10">
          <div className="grid justify-items-start">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-2">
              <p className="flex items-center gap-2">
                {/* Served by the deck's slug rather than the account. ADR 0016. */}
                <PublisherMark
                  name={deck.publisher}
                  src={
                    deck.publisherAvatar
                      ? publisherAvatarPath(deck.slug, deck.publisherAvatar)
                      : null
                  }
                  size={20}
                />
                <Trans>By {deck.publisher}</Trans>
              </p>
              <span aria-hidden="true" className="text-faint">
                ·
              </span>
              <DeckMeta
                deck={{ cardCount: deck.cardCount, sectionCount: sections.length }}
                size="sm"
              />
            </div>
            <h1
              lang={deck.meaningLanguage}
              className="mt-3 text-2xl font-medium leading-[1.2] tracking-[-0.02em] text-balance text-text @4xl:text-[1.875rem] @4xl:leading-[1.15]"
            >
              {deck.name}
            </h1>
            <p
              lang={deck.meaningLanguage}
              className="mt-2.5 max-w-[52ch] text-md text-pretty text-text-2"
            >
              {deck.summary}
            </p>
            {/* The check that says so is drawn in the hand, which a screen reader skips. */}
            {deckId && (
              <p className="sr-only">
                <Trans>In Library</Trans>
              </p>
            )}
            <div className="mt-6 flex w-full">
              {deckId ? (
                <Link
                  ref={open}
                  to="/library/$deckId"
                  params={{ deckId }}
                  disabled={!!st}
                  className={buttonClass("secondary", "lg", "deck-cover-action w-full @md:w-auto")}
                >
                  <span
                    className={clsx(
                      "inline-flex items-center gap-2",
                      arrived && "deck-cover-enter",
                    )}
                  >
                    <Trans>Open in Library</Trans>
                    <ArrowRight aria-hidden="true" className="rtl:-scale-x-100" />
                  </span>
                </Link>
              ) : (
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={onAdd}
                  loading={adding}
                  className="deck-cover-action w-full @md:w-auto"
                >
                  <Plus aria-hidden="true" />
                  <Trans>Add to Library</Trans>
                </Button>
              )}
            </div>
            <p role="status" className="sr-only">
              {arrived && <Trans>Added “{name}” to Library</Trans>}
            </p>
          </div>
          {hand.length > 0 && (
            <DeckHand
              deck={deck}
              cards={hand}
              gathered={!!deckId}
              className="-order-1 @4xl:order-none"
            />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Screen back={back} ownTitle cover={cover}>
      <div className="@3xl/shell:-mt-1">
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
    </Screen>
  );
}
