import { Trans } from "@lingui/react/macro";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import { ArrowRight } from "lucide-react";
import { shelfPath } from "../../lib/explore";
import type { Locale } from "../../lib/routes";
import { trayHues } from "../../lib/tray";
import { DeckTile } from "../explore/DeckTile";
import { SectionTitle } from "./FeatureSection";

interface Props {
  decks: PublicDeckSummary[];
  locale: Locale;
}

/** Every published Japanese deck in one row, and the way to the rest of the shelf. */
export function JapaneseDecks({ decks, locale }: Props) {
  const hues = trayHues(decks);
  const shelf = shelfPath({ kind: "languages", name: "japanese" }, locale);

  return (
    <section aria-labelledby="decks-title" className="border-b border-edge py-20 @4xl:py-28">
      <div className="mx-auto flex max-w-[1040px] flex-wrap items-end justify-between gap-6 px-5 @2xl:px-10">
        <div className="max-w-[560px]">
          <div id="decks-title">
            <SectionTitle>
              <Trans>Explore ready-made decks.</Trans>
            </SectionTitle>
          </div>
          <p className="mt-5 text-md text-pretty text-text-2">
            <Trans>
              Free Japanese decks with readings and a voice on every card. Add one in a tap. More
              are on the way.
            </Trans>
          </p>
        </div>
        <a
          href={shelf}
          className="inline-flex items-center gap-1.5 rounded-xs text-md font-medium text-text-2 hoverable:hover:text-text"
        >
          <Trans>All Japanese decks</Trans>
          <ArrowRight aria-hidden="true" className="size-4 rtl:-scale-x-100" />
        </a>
      </div>

      <ul className="mx-auto mt-12 flex max-w-[1040px] snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-5 px-5 pb-4 @2xl:scroll-px-10 @2xl:px-10">
        {decks.map((deck, i) => (
          <li key={deck.slug} className="w-[220px] shrink-0 snap-start">
            <DeckTile deck={deck} hue={hues[i] ?? 0} locale={locale} />
          </li>
        ))}
      </ul>
    </section>
  );
}
