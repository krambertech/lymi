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
  QuickAddTile,
  ScriptsTile,
  StreakTile,
  TagsTile,
  type TileDemoProps,
} from "./BentoTiles";
import { ClassScene } from "./ClassScene";
import { SectionTitle } from "./FeatureSection";

/**
 * When a tile's demo plays. "view": once, the first time most of it is on screen. "hover": while it
 * is pointed at or focused, settling back after; with no hover it plays once in view instead.
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
  /** "fill": the demo takes the tile's width at its foot. "centre": it sits in the middle of what is left. */
  layout: "fill" | "centre";
  className?: string;
}

function Tile({ trigger, hue, title, body, Demo, layout, className }: TileProps) {
  const { ref, play, round } = useTrigger(trigger);
  return (
    <li
      ref={ref}
      style={{ "--tray-h": hue } as CSSProperties}
      className={clsx(
        "use-case-tile flex min-w-0 flex-col gap-4 overflow-hidden rounded-[20px] p-5",
        className,
      )}
    >
      <div className="min-w-0">
        <h3 className="text-md leading-tight font-medium tracking-[-0.015em] text-balance text-ink">
          {title}
        </h3>
        {body && <p className="mt-1 text-sm text-pretty text-ink-secondary">{body}</p>}
      </div>
      <div
        aria-hidden="true"
        className={clsx(
          "flex min-w-0 flex-1",
          layout === "fill" ? "flex-col justify-end" : "items-center justify-center",
        )}
      >
        <Demo key={trigger === "hover" ? round : 0} play={play} />
      </div>
    </li>
  );
}

interface CompactProps {
  hue: number;
  title: ReactNode;
  body: ReactNode;
  Demo: ComponentType<TileDemoProps>;
}

/** A short tile: title, one line, one picture at its foot. Still until pointed at. */
function CompactTile({ hue, title, body, Demo }: CompactProps) {
  const { ref, play, round } = useTrigger("hover");
  return (
    <li
      ref={ref}
      style={{ "--tray-h": hue } as CSSProperties}
      className="use-case-tile col-span-1 flex min-w-0 flex-col justify-between gap-4 overflow-hidden rounded-[20px] p-4 @xl:p-5 @4xl:col-span-3"
    >
      <div className="min-w-0">
        <h3 className="text-md leading-tight font-medium tracking-[-0.015em] text-balance text-ink">
          {title}
        </h3>
        <p className="mt-1 text-sm text-pretty text-ink-secondary">{body}</p>
      </div>
      <div aria-hidden="true" className="flex min-h-9 min-w-0 items-end">
        <Demo key={round} play={play} />
      </div>
    </li>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <section data-nav="landing" className="px-5 py-20 @2xl:px-10 @4xl:py-28">
      <div className="mx-auto max-w-[1040px]">
        <div className="max-w-[620px]">
          <SectionTitle>
            <Trans>Small things, done well.</Trans>
          </SectionTitle>
          <p className="mt-5 text-md text-pretty text-ink-secondary">
            <Trans>Details you notice after a week of reviews.</Trans>
          </p>
        </div>
        {children}
      </div>
    </section>
  );
}

function SharingCopy({ className }: { className?: string }) {
  const { i18n } = useLingui();
  return (
    <div className={className}>
      <h3 className="text-xl leading-tight font-medium tracking-[-0.02em] text-ink">
        <Trans>Learn the same deck together</Trans>
      </h3>
      <p className="mt-1 max-w-[42ch] text-sm text-pretty text-ink-secondary">
        <Trans>
          Share a deck with your class, your team or a friend. One of you adds the cards, and
          everyone reviews on their own schedule.
        </Trans>
      </p>
      <ArrowLink href={localizedPath("teachers", i18n.locale)} className="mt-3">
        <Trans>Lymi for teachers</Trans>
      </ArrowLink>
    </div>
  );
}

/** A quarter of the row wide; on a phone two share a row and their pictures take its width. */
const SMALL = "col-span-1 @max-xl:gap-3 @max-xl:p-3.5 @4xl:col-span-3";
/** On a phone, a tile whose picture needs more width takes the row: words beside the picture. */
const ACROSS =
  "col-span-2 @max-xl:flex-row @max-xl:items-center @max-xl:[&>div:first-child]:flex-1 @max-xl:[&>div:last-child]:w-[172px] @max-xl:[&>div:last-child]:flex-none @xl:col-span-1 @4xl:col-span-3";

/** Shared by both options: hints, scripts, modes and the goal, each a quarter of the row. */
function ReviewTiles({ hues }: { hues: [number, number, number, number] }) {
  return (
    <>
      <Tile
        trigger="view"
        hue={hues[0]}
        layout="centre"
        title={<Trans>Hints</Trans>}
        body={<Trans>A way in, never the answer.</Trans>}
        Demo={HintTile}
        className={SMALL}
      />
      <Tile
        trigger="hover"
        hue={hues[1]}
        layout="centre"
        title={<Trans>Every script</Trans>}
        body={<Trans>Furigana, pinyin, stress marks.</Trans>}
        Demo={ScriptsTile}
        className={SMALL}
      />
      <Tile
        trigger="hover"
        hue={hues[2]}
        layout="centre"
        title={<Trans>Four ways to ask</Trans>}
        body={<Trans>Words, meanings or a picture.</Trans>}
        Demo={ModesTile}
        className={ACROSS}
      />
      <Tile
        trigger="view"
        hue={hues[3]}
        layout="fill"
        title={<Trans>Your goal, your streak</Trans>}
        Demo={StreakTile}
        className={ACROSS}
      />
    </>
  );
}

/**
 * Eight tiles and a compact row: sharing beside the four review details, then tags, Insights and
 * import, then keyboard, quick add, offline and export as four short tiles.
 */
export function FeatureBento() {
  const wide = "col-span-2 @xl:col-span-1 @4xl:col-span-4";
  return (
    <Frame>
      <ul className="mt-10 grid grid-cols-2 gap-3 @4xl:mt-12 @4xl:grid-cols-12 @4xl:grid-rows-[232px_232px_auto_auto]">
        <li
          style={{ "--tray-h": 150 } as CSSProperties}
          className="use-case-tile col-span-2 flex min-w-0 flex-col overflow-hidden rounded-[20px] p-5 @4xl:col-span-6 @4xl:row-span-2"
        >
          <SharingCopy />
          <div className="-mx-5 -mb-5 flex-1">
            <ClassScene />
          </div>
        </li>
        <ReviewTiles hues={[350, 235, 280, 25]} />
        <Tile
          trigger="hover"
          hue={235}
          layout="fill"
          title={<Trans>Tags</Trans>}
          body={<Trans>Label cards across decks, then review just those.</Trans>}
          Demo={TagsTile}
          className={wide}
        />
        <Tile
          trigger="view"
          hue={110}
          layout="fill"
          title={<Trans>Insights</Trans>}
          body={<Trans>See what you remember, and how steady you’ve been.</Trans>}
          Demo={InsightsTile}
          className={wide}
        />
        <Tile
          trigger="hover"
          hue={150}
          layout="fill"
          title={<Trans>Bring your decks</Trans>}
          body={<Trans>Cards and review history come with you.</Trans>}
          Demo={ImportTile}
          className="col-span-2 @4xl:col-span-4"
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
          hue={235}
          title={<Trans>Works offline</Trans>}
          body={<Trans>Review with no signal. It syncs when you’re back.</Trans>}
          Demo={OfflineTile}
        />
        <CompactTile
          hue={350}
          title={<Trans>Your data is yours</Trans>}
          body={<Trans>Export any deck, any time.</Trans>}
          Demo={ExportTile}
        />
      </ul>
    </Frame>
  );
}
