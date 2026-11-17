import { Trans } from "@lingui/react/macro";
import { trayStyle } from "../../lib/tray";
import { Localized } from "../Localized";
import {
  ExportTile,
  HintTile,
  InsightsTile,
  KeysTile,
  ModesTile,
  OfflineTile,
  QuickAddTile,
  StreakTile,
} from "../landing/BentoTiles";
import { CompactTile, Tile } from "../landing/FeatureBento";
import { ReturnLane } from "../landing/ReturnLane";

interface Props {
  locale: string;
  /** One of the deck's own short terms, which the return lane follows through its reviews. */
  term: string | null;
  lang: string | null;
}

/** A quarter of the row; on a phone two share a row. */
const SMALL = "col-span-1 @max-xl:gap-3 @max-xl:p-3.5 @4xl:col-span-3";

/**
 * What a deck becomes once it is in Lymi, so a visitor who just turned a few cards over does not
 * take that for the whole app: the schedule that brings each card back, then the homepage's own
 * tiles for what surrounds a review. The same tiles every deck page shows.
 */
export default function DeckFeatures({ locale, term, lang }: Props) {
  return (
    <Localized locale={locale}>
      <section
        aria-labelledby="features-title"
        className="border-t border-edge px-5 py-16 @2xl:px-10 @4xl:py-24"
      >
        <div className="mx-auto max-w-[1040px]">
          <h2
            id="features-title"
            className="text-4xl font-medium tracking-[-0.03em] text-balance text-ink @2xl:text-5xl"
          >
            <Trans>More than flipping cards</Trans>
          </h2>
          <p className="mt-4 max-w-[52ch] text-lg text-pretty text-ink-secondary">
            <Trans>
              Lymi decides when each card comes back, keeps your daily goal, and works on your phone
              and offline.
            </Trans>
          </p>
          <ul className="mt-10 grid grid-cols-2 gap-3 @4xl:mt-12 @4xl:grid-cols-12 @4xl:grid-rows-[232px_232px_auto]">
            {term && lang && (
              <li
                style={trayStyle(45)}
                className="use-case-tile col-span-2 flex min-w-0 flex-col gap-5 overflow-hidden rounded-[20px] p-5 @4xl:col-span-6 @4xl:row-span-2"
              >
                <div>
                  <h3 className="text-xl leading-tight font-medium tracking-[-0.02em] text-ink">
                    <Trans>Each card comes back before you forget it</Trans>
                  </h3>
                  <p className="mt-1 max-w-[46ch] text-sm text-pretty text-ink-secondary">
                    <Trans>
                      Remember a card and Lymi waits longer before showing it again. Forget it, and
                      it comes back soon. That’s spaced repetition: less reviewing, longer
                      remembering.
                    </Trans>
                  </p>
                </div>
                {/* Its own container, so the lane lays out for the tile rather than the page. */}
                <div className="@container mt-auto min-w-0">
                  <ReturnLane lang={lang} term={() => term} />
                </div>
              </li>
            )}
            <Tile
              trigger="view"
              hue={25}
              layout="fill"
              title={<Trans>Your goal, your streak</Trans>}
              body={
                <Trans>Pick how much to review a day. A rest day keeps the streak going.</Trans>
              }
              Demo={StreakTile}
              className={SMALL}
            />
            <Tile
              trigger="view"
              hue={110}
              layout="fill"
              title={<Trans>Insights</Trans>}
              body={<Trans>See what you remember, and how steady you’ve been.</Trans>}
              Demo={InsightsTile}
              className={SMALL}
            />
            <Tile
              trigger="view"
              hue={350}
              layout="centre"
              title={<Trans>Hints</Trans>}
              body={<Trans>A way in, never the answer.</Trans>}
              Demo={HintTile}
              className={SMALL}
            />
            <Tile
              trigger="hover"
              hue={280}
              layout="centre"
              title={<Trans>Four ways to ask</Trans>}
              body={<Trans>Words, meanings or a picture.</Trans>}
              Demo={ModesTile}
              className={SMALL}
            />
            <CompactTile
              hue={235}
              title={<Trans>Works offline</Trans>}
              body={<Trans>Review with no signal. It syncs when you’re back.</Trans>}
              Demo={OfflineTile}
            />
            <CompactTile
              hue={280}
              title={<Trans>Keyboard first</Trans>}
              body={<Trans>Show the answer and grade it without the mouse.</Trans>}
              Demo={KeysTile}
            />
            <CompactTile
              hue={25}
              title={<Trans>Add from any app</Trans>}
              body={<Trans>Press ⌃⌥L on your Mac and the card is saved.</Trans>}
              Demo={QuickAddTile}
            />
            <CompactTile
              hue={350}
              title={<Trans>Export your decks</Trans>}
              body={<Trans>Download the decks you own, any time.</Trans>}
              Demo={ExportTile}
            />
          </ul>
        </div>
      </section>
    </Localized>
  );
}
