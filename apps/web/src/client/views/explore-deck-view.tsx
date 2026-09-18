import { Plural, Trans, useLingui } from "@lingui/react/macro";
import type { ExploreDeckOut } from "@lymi/core/catalog";
import { trayHue } from "@lymi/core/catalog";
import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, Plus } from "lucide-react";
import { Button, buttonClass } from "../components/button";
import { DeckMeta } from "../components/deck-tray";
import { ErrorState } from "../components/empty-state";
import type { StaticNav } from "../components/nav-link";
import { Skeleton } from "../components/skeleton";
import { BackButton, Page } from "./shell";

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
 * One published deck without leaving the app. It shows what the public page shows — the same
 * projection, so the two cannot disagree — and stops there: a learner already inside Lymi does
 * not need the page that explains what Lymi is. The one thing to press is Add.
 */
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
      <Page width="md">
        <div className="mb-2 flex h-14 items-center">{back}</div>
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
      <Page width="md">
        <div className="mb-2 flex h-14 items-center">{back}</div>
        <div className="grid gap-3" aria-hidden="true">
          <Skeleton className="h-9 w-2/3 rounded-sm" />
          <Skeleton className="h-5 w-full rounded-sm" />
          <Skeleton className="mt-3 h-10 w-40 rounded-md" />
        </div>
      </Page>
    );
  }

  const { deck, deckId } = data;
  const sections = deck.sections.filter((section) => section.name !== null);

  return (
    <Page width="md">
      {/* The deck's own tray colour, poured behind its name and gone before the reading starts.
          It runs out to the column's edges, so the negative margins undo the page's own padding.
          Its surfaces are `over-tint`, so a hover darkens the colour rather than painting grey. */}
      <div
        className="deck-hero-tint over-tint -mx-5 -mt-5 px-5 pt-5 pb-9 @3xl/shell:-mx-8 @3xl/shell:-mt-8 @3xl/shell:px-8 @3xl/shell:pt-8 @3xl/shell:pb-10"
        data-hue={trayHue(deck.slug)}
      >
        <div className="mb-2 flex h-14 items-center">{back}</div>
        <header>
          <h1
            lang={deck.meaningLanguage}
            className="text-3xl font-medium leading-[1.1] tracking-[-0.03em] text-balance text-text"
          >
            {deck.name}
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            <Trans>By {deck.publisher}</Trans>
          </p>
          <p
            lang={deck.meaningLanguage}
            className="mt-4 max-w-[56ch] text-md text-pretty text-text-2"
          >
            {deck.summary}
          </p>
          <DeckMeta
            deck={{ level: deck.level, cardCount: deck.cardCount, sectionCount: sections.length }}
            className="mt-3 text-sm"
          />
          <div className="mt-6">
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
        </header>
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
