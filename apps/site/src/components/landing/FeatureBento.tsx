import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { useInView } from "motion/react";
import {
  type ComponentType,
  type CSSProperties,
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { localizedPath } from "../../lib/routes";
import { ArrowLink } from "./ArrowLink";
import {
  ExportTile,
  HintTile,
  ImportTile,
  InsightsTile,
  KeysTile,
  ModesTile,
  OfflineTile,
  ScriptsTile,
  SlippingTile,
  StreakTile,
  TagsTile,
  type TileDemoProps,
} from "./BentoTiles";
import { ClassScene } from "./ClassScene";
import { SectionTitle } from "./FeatureSection";
import { VoiceDemo } from "./FeatureStage";
import { useStill } from "./playback";

/** How many tiles have had their turn; every tile below this number plays. */
const Turn = createContext(Number.POSITIVE_INFINITY);

/** Each tile's turn in ms, in the order they play: reading order, top tier first. */
const TURNS = [1500, 2000, 1900, 4300, 1300, 1500, 1200, 1100, 1300, 1100, 1500, 1000];
/** A beat before the first tile, so the grid is seen whole before anything moves. */
const LEAD_MS = 500;

/**
 * Plays the tiles one after another, each to its end, while the bento is on screen; scrolled away,
 * it waits. With reduced motion every tile shows its finished frame at once.
 */
function useTurns() {
  const ref = useRef<HTMLUListElement>(null);
  const inView = useInView(ref, { amount: 0.25 });
  const still = useStill();
  const [turn, setTurn] = useState(-1);
  useEffect(() => {
    if (still || !inView || turn >= TURNS.length) return;
    const timer = window.setTimeout(
      () => setTurn((n) => n + 1),
      turn < 0 ? LEAD_MS : (TURNS[turn] ?? 0),
    );
    return () => window.clearTimeout(timer);
  }, [turn, inView, still]);
  return { ref, turn: still ? TURNS.length : turn };
}

interface TileProps {
  /** Its place in the order tiles play. */
  turn: number;
  /** A tray hue from Explore's shelf colours. */
  hue: number;
  title: ReactNode;
  body: ReactNode;
  Demo: ComponentType<TileDemoProps>;
  /** "stack" sets the demo under the words; "row" beside them, for a short tile. */
  layout: "stack" | "row" | "centre";
  /** The demo has controls of its own; every other demo is a picture, hidden from screen readers. */
  interactive?: boolean;
  className?: string;
}

function Tile({ turn, hue, title, body, Demo, layout, interactive, className }: TileProps) {
  const play = useContext(Turn) >= turn;
  return (
    <li
      style={{ "--tray-h": hue } as CSSProperties}
      className={clsx(
        "use-case-tile flex min-w-0 flex-col gap-4 overflow-hidden rounded-[20px] p-5",
        layout === "stack" && "justify-between",
        layout === "row" && "@xl:flex-row @xl:items-center @xl:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h3 className="text-md leading-tight font-medium tracking-[-0.015em] text-balance text-text">
          {title}
        </h3>
        <p className="mt-1 text-sm text-pretty text-text-2">{body}</p>
      </div>
      <div
        aria-hidden={interactive ? undefined : true}
        className={clsx(
          layout === "stack" && "w-full",
          layout === "row" && "shrink-0 self-start @max-xl:[zoom:0.72] @xl:self-auto",
          layout === "centre" && "flex flex-1 items-center justify-center @max-xl:[zoom:0.85]",
        )}
      >
        <Demo play={play} />
      </div>
    </li>
  );
}

function Voice({ play }: TileDemoProps) {
  return <VoiceDemo play={play} compact sweep />;
}

/**
 * The details, Apple-recap style: sharing big, the review details beside it, then the everyday
 * tools in mixed sizes. Each tile leads with one visual and plays once, in turn.
 */
export function FeatureBento() {
  const { i18n } = useLingui();
  const { ref, turn } = useTurns();
  return (
    <section data-nav="landing" className="px-5 py-20 @2xl:px-10 @4xl:py-28">
      <div className="mx-auto max-w-[1040px]">
        <div className="max-w-[620px]">
          <SectionTitle>
            <Trans>Small things, done well.</Trans>
          </SectionTitle>
          <p className="mt-5 text-md text-pretty text-text-2">
            <Trans>Details you notice after a week of reviews.</Trans>
          </p>
        </div>
        <Turn.Provider value={turn}>
          <ul
            ref={ref}
            className="mt-10 grid grid-cols-2 gap-3 @4xl:mt-12 @4xl:grid-cols-12 @4xl:grid-rows-[224px_224px_112px_112px_112px_112px]"
          >
            <li
              style={{ "--tray-h": 150 } as CSSProperties}
              className="use-case-tile col-span-2 flex min-w-0 flex-col overflow-hidden rounded-[20px] p-5 @4xl:col-span-6 @4xl:row-span-2"
            >
              <div>
                <h3 className="text-xl leading-tight font-medium tracking-[-0.02em] text-text">
                  <Trans>Learn the same deck together</Trans>
                </h3>
                <p className="mt-1 max-w-[42ch] text-sm text-pretty text-text-2">
                  <Trans>
                    Share a deck with your class, your team or a friend. One of you adds the cards,
                    and everyone reviews on their own schedule.
                  </Trans>
                </p>
                <ArrowLink href={localizedPath("teachers", i18n.locale)} className="mt-3">
                  <Trans>Lymi for teachers</Trans>
                </ArrowLink>
              </div>
              <div className="-mx-5 -mb-5 flex-1">
                <ClassScene />
              </div>
            </li>
            <Tile
              turn={0}
              hue={25}
              layout="centre"
              title={<Trans>Hints</Trans>}
              body={<Trans>A way in, never the answer.</Trans>}
              Demo={HintTile}
              className="col-span-2 @xl:col-span-1 @4xl:col-span-3"
            />
            <Tile
              turn={1}
              hue={280}
              layout="centre"
              title={<Trans>Native AI voice</Trans>}
              body={<Trans>Every card, read aloud.</Trans>}
              Demo={Voice}
              interactive
              className="col-span-2 @xl:col-span-1 @4xl:col-span-3"
            />
            <Tile
              turn={2}
              hue={235}
              layout="centre"
              title={<Trans>Every script</Trans>}
              body={<Trans>Furigana, pinyin, stress marks.</Trans>}
              Demo={ScriptsTile}
              className="col-span-2 @xl:col-span-1 @4xl:col-span-3"
            />
            <Tile
              turn={3}
              hue={350}
              layout="centre"
              title={<Trans>Four ways to ask</Trans>}
              body={<Trans>Words, meanings or a picture.</Trans>}
              Demo={ModesTile}
              className="col-span-2 @xl:col-span-1 @4xl:col-span-3"
            />

            <Tile
              turn={4}
              hue={25}
              layout="stack"
              title={<Trans>Your goal, your streak</Trans>}
              body={<Trans>Pick a daily goal. A rest day keeps the run going.</Trans>}
              Demo={StreakTile}
              className="col-span-2 @4xl:col-span-4 @4xl:row-span-2"
            />
            <Tile
              turn={5}
              hue={110}
              layout="stack"
              title={<Trans>Tags</Trans>}
              body={<Trans>Label cards across decks, then review just those.</Trans>}
              Demo={TagsTile}
              className="col-span-2 @4xl:col-span-4 @4xl:row-span-2"
            />
            <Tile
              turn={6}
              hue={195}
              layout="row"
              title={<Trans>Keyboard first</Trans>}
              body={<Trans>Add from any app on your Mac.</Trans>}
              Demo={KeysTile}
              className="col-span-1 @4xl:col-span-4"
            />
            <Tile
              turn={7}
              hue={280}
              layout="row"
              title={<Trans>Works offline</Trans>}
              body={<Trans>It syncs when you’re back.</Trans>}
              Demo={OfflineTile}
              className="col-span-1 @4xl:col-span-4"
            />

            <Tile
              turn={8}
              hue={235}
              layout="row"
              title={<Trans>Bring your decks</Trans>}
              body={<Trans>With their pictures and history.</Trans>}
              Demo={ImportTile}
              className="col-span-1 @4xl:col-span-4"
            />
            <Tile
              turn={9}
              hue={110}
              layout="row"
              title={<Trans>Your data is yours</Trans>}
              body={<Trans>Export any deck.</Trans>}
              Demo={ExportTile}
              className="col-span-1 @4xl:col-span-4 @4xl:row-start-6"
            />
            <Tile
              turn={10}
              hue={150}
              layout="stack"
              title={<Trans>Insights</Trans>}
              body={<Trans>See what you remember, and how steady you’ve been.</Trans>}
              Demo={InsightsTile}
              className="col-span-2 @4xl:col-span-4 @4xl:col-start-5 @4xl:row-span-2 @4xl:row-start-5"
            />
            <Tile
              turn={11}
              hue={350}
              layout="stack"
              title={<Trans>Help with the ones that slip</Trans>}
              body={<Trans>Cards you keep forgetting get a round of their own.</Trans>}
              Demo={SlippingTile}
              className="col-span-2 @4xl:col-span-4 @4xl:col-start-9 @4xl:row-span-2 @4xl:row-start-5"
            />
          </ul>
        </Turn.Provider>
      </div>
    </section>
  );
}
