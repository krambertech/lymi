import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { useInView } from "motion/react";
import {
  type ComponentType,
  type CSSProperties,
  type ReactNode,
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

/**
 * When a tile's demo plays. "view": once, the first time most of it is on screen, for the few that
 * tell a story. "hover": while it is pointed at or focused, replaying each time and settling back
 * after; on a screen with no hover it plays once in view instead.
 */
type Trigger = "view" | "hover";

function useTrigger(trigger: Trigger) {
  const ref = useRef<HTMLLIElement>(null);
  const seen = useInView(ref, { amount: 0.6, once: true });
  const [hovered, setHovered] = useState(false);
  const [round, setRound] = useState(0);
  const [canHover, setCanHover] = useState(true);

  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    setCanHover(query.matches);
    const change = () => setCanHover(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);

  useEffect(() => {
    const tile = ref.current;
    if (!tile || trigger !== "hover") return;
    const enter = () => {
      setHovered(true);
      setRound((r) => r + 1);
    };
    const leave = () => setHovered(false);
    const pointerEnter = (e: PointerEvent) => {
      if (e.pointerType === "mouse") enter();
    };
    const focusOut = (e: FocusEvent) => {
      if (!tile.contains(e.relatedTarget as Node | null)) leave();
    };
    tile.addEventListener("pointerenter", pointerEnter);
    tile.addEventListener("pointerleave", leave);
    tile.addEventListener("focusin", enter);
    tile.addEventListener("focusout", focusOut);
    return () => {
      tile.removeEventListener("pointerenter", pointerEnter);
      tile.removeEventListener("pointerleave", leave);
      tile.removeEventListener("focusin", enter);
      tile.removeEventListener("focusout", focusOut);
    };
  }, [trigger]);

  const play = trigger === "view" || !canHover ? seen : hovered;
  return { ref, play, round };
}

interface TileProps {
  trigger: Trigger;
  /** A tray hue from Explore's shelf colours. */
  hue: number;
  title: ReactNode;
  body?: ReactNode;
  Demo: ComponentType<TileDemoProps>;
  /** "stack" sets the demo under the words; "row" beside them, for a short tile. */
  layout: "stack" | "row" | "centre";
  /** The demo has controls of its own; every other demo is a picture, hidden from screen readers. */
  interactive?: boolean;
  className?: string;
}

function Tile({ trigger, hue, title, body, Demo, layout, interactive, className }: TileProps) {
  const { ref, play, round } = useTrigger(trigger);
  return (
    <li
      ref={ref}
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
        {body && <p className="mt-1 text-sm text-pretty text-text-2">{body}</p>}
      </div>
      <div
        aria-hidden={interactive ? undefined : true}
        className={clsx(
          layout === "stack" && "w-full",
          layout === "row" && "shrink-0 self-start @max-xl:[zoom:0.72] @xl:self-auto",
          layout === "centre" && "flex flex-1 items-center justify-center @max-xl:[zoom:0.85]",
        )}
      >
        <Demo key={trigger === "hover" ? round : 0} play={play} />
      </div>
    </li>
  );
}

function Voice({ play }: TileDemoProps) {
  return <VoiceDemo play={play} compact sweep />;
}

/**
 * The details, Apple-recap style: sharing big, the review details beside it, then the everyday
 * tools in mixed sizes. Each tile leads with one visual; a few play as they come into view, and the
 * rest wait to be pointed at.
 */
export function FeatureBento() {
  const { i18n } = useLingui();
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
        <ul className="mt-10 grid grid-cols-2 gap-3 @4xl:mt-12 @4xl:grid-cols-12 @4xl:grid-rows-[224px_224px_112px_112px_112px_112px]">
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
            trigger="view"
            hue={25}
            layout="centre"
            title={<Trans>Hints</Trans>}
            body={<Trans>A way in, never the answer.</Trans>}
            Demo={HintTile}
            className="col-span-2 @xl:col-span-1 @4xl:col-span-3"
          />
          <Tile
            trigger="hover"
            hue={280}
            layout="centre"
            title={<Trans>Native AI voice</Trans>}
            body={<Trans>Every card, read aloud.</Trans>}
            Demo={Voice}
            interactive
            className="col-span-2 @xl:col-span-1 @4xl:col-span-3"
          />
          <Tile
            trigger="hover"
            hue={235}
            layout="centre"
            title={<Trans>Every script</Trans>}
            body={<Trans>Furigana, pinyin, stress marks.</Trans>}
            Demo={ScriptsTile}
            className="col-span-2 @xl:col-span-1 @4xl:col-span-3"
          />
          <Tile
            trigger="hover"
            hue={350}
            layout="centre"
            title={<Trans>Four ways to ask</Trans>}
            body={<Trans>Words, meanings or a picture.</Trans>}
            Demo={ModesTile}
            className="col-span-2 @xl:col-span-1 @4xl:col-span-3"
          />

          <Tile
            trigger="view"
            hue={25}
            layout="stack"
            title={<Trans>Your goal, your streak</Trans>}
            body={<Trans>Pick a daily goal. A rest day keeps the run going.</Trans>}
            Demo={StreakTile}
            className="col-span-2 @4xl:col-span-4 @4xl:row-span-2"
          />
          <Tile
            trigger="hover"
            hue={110}
            layout="stack"
            title={<Trans>Tags</Trans>}
            body={<Trans>Label cards across decks, then review just those.</Trans>}
            Demo={TagsTile}
            className="col-span-2 @4xl:col-span-4 @4xl:row-span-2"
          />
          <Tile
            trigger="hover"
            hue={195}
            layout="row"
            title={<Trans>Keyboard first</Trans>}
            body={<Trans>Add from any app on your Mac.</Trans>}
            Demo={KeysTile}
            className="col-span-2 @4xl:col-span-4"
          />
          <Tile
            trigger="hover"
            hue={280}
            layout="stack"
            title={<Trans>Works offline</Trans>}
            Demo={OfflineTile}
            className="col-span-2 @4xl:col-span-4"
          />

          <Tile
            trigger="hover"
            hue={235}
            layout="stack"
            title={<Trans>Bring your decks</Trans>}
            Demo={ImportTile}
            className="col-span-2 @4xl:col-span-4"
          />
          <Tile
            trigger="hover"
            hue={110}
            layout="row"
            title={<Trans>Your data is yours</Trans>}
            body={<Trans>Export any deck.</Trans>}
            Demo={ExportTile}
            className="col-span-2 @4xl:col-span-4 @4xl:row-start-6"
          />
          <Tile
            trigger="view"
            hue={150}
            layout="stack"
            title={<Trans>Insights</Trans>}
            body={<Trans>See what you remember, and how steady you’ve been.</Trans>}
            Demo={InsightsTile}
            className="col-span-2 @4xl:col-span-4 @4xl:col-start-5 @4xl:row-span-2 @4xl:row-start-5"
          />
          <Tile
            trigger="hover"
            hue={350}
            layout="stack"
            title={<Trans>Help with the ones that slip</Trans>}
            body={<Trans>Cards you keep forgetting get a round of their own.</Trans>}
            Demo={SlippingTile}
            className="col-span-2 @4xl:col-span-4 @4xl:col-start-9 @4xl:row-span-2 @4xl:row-start-5"
          />
        </ul>
      </div>
    </section>
  );
}
