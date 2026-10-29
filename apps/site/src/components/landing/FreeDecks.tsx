import { Trans, useLingui } from "@lingui/react/macro";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import { useEffect, useState } from "react";
import { explorePath } from "../../lib/explore";
import type { Locale } from "../../lib/routes";
import { trayHues } from "../../lib/tray";
import { DeckTile } from "../explore/DeckTile";
import { ArrowLink } from "./ArrowLink";
import { SectionTitle } from "./FeatureSection";

/** As many placeholders as the row shows before scrolling, so nothing moves when the decks arrive. */
const PLACEHOLDERS = 5;

/** The published decks the homepage features, read after load because the page itself is prerendered. */
function useFeaturedDecks(locale: string): PublicDeckSummary[] | null {
  const [decks, setDecks] = useState<PublicDeckSummary[] | null>(null);
  useEffect(() => {
    let live = true;
    fetch(`/explore/featured.json?locale=${locale}`)
      .then((response) => (response.ok ? (response.json() as Promise<PublicDeckSummary[]>) : []))
      .then((featured) => live && setDecks(featured))
      .catch(() => live && setDecks([]));
    return () => {
      live = false;
    };
  }, [locale]);
  return decks;
}

/** Free published decks to start from, read live so the row only shows what is published now. */
export function FreeDecks() {
  const { i18n } = useLingui();
  const locale = i18n.locale as Locale;
  const decks = useFeaturedDecks(locale);
  const hues = trayHues(decks ?? []);

  return (
    <section data-nav="landing" className="border-b border-edge px-5 py-20 @2xl:px-10 @4xl:py-28">
      <div className="mx-auto flex max-w-[1040px] flex-wrap items-end justify-between gap-6">
        <div className="max-w-[620px]">
          <SectionTitle>
            <Trans>Start with a free deck.</Trans>
          </SectionTitle>
          <p className="mt-5 text-md text-pretty text-text-2">
            <Trans>
              Ready-made decks, from first words in a new language to citizenship tests and the
              periodic table. Add one in a tap.
            </Trans>
          </p>
        </div>
        <ArrowLink href={explorePath(locale)} size="md">
          <Trans>All free decks</Trans>
        </ArrowLink>
      </div>

      {decks?.length !== 0 && (
        <ul
          aria-busy={decks === null}
          className="mx-auto mt-12 flex max-w-[1040px] snap-x snap-mandatory gap-5 overflow-x-auto pb-4"
        >
          {decks
            ? decks.map((deck, i) => (
                <li key={deck.slug} className="w-[220px] shrink-0 snap-start">
                  <DeckTile deck={deck} hue={hues[i] ?? 0} locale={locale} />
                </li>
              ))
            : Array.from({ length: PLACEHOLDERS }, (_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: placeholders have no identity
                <li key={i} aria-hidden="true" className="w-[220px] shrink-0">
                  <div className="deck-tray skeleton" />
                  <div className="skeleton mt-3.5 h-5 w-3/4 rounded-xs" />
                  <div className="skeleton mt-2 h-4 w-full rounded-xs" />
                  <div className="skeleton mt-1 h-4 w-2/3 rounded-xs" />
                </li>
              ))}
        </ul>
      )}
    </section>
  );
}
