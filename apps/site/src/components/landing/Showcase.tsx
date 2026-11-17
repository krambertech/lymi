import { useLingui } from "@lingui/react/macro";
import { captureAnalytics } from "@lymi/client/analytics";
import type { AnalyticsProperties } from "@lymi/core/analytics";
import { clsx } from "clsx";
import { RotateCcw } from "lucide-react";
import { AnimatePresence, motion, useInView } from "motion/react";
import {
  Children,
  createContext,
  isValidElement,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { trayStyle } from "../../lib/tray";
import { EASE, useStill } from "./playback";

/*
 * Timed slides of use cases: a list of uses on the page beside a tinted tray that plays the current
 * one's demo. Any demo goes on the tray; the block owns the timing, the timer on the divider under
 * the playing item, keyboard use, Replay and reduced motion.
 *
 *   <Showcase label={t`Things to ask Claude`}>
 *     <Showcase.Item id="pdf" icon={<FileText />} title="From a long PDF" description="…" hue={25}>
 *       <PdfDemo />
 *     </Showcase.Item>
 *   </Showcase>
 *
 * Wide, the list sits before the tray; `tray="start"` puts the tray first. Narrow, the tray is always
 * on top.
 */

interface ItemProps {
  /** Lowercase letters, digits and hyphens: it is sent with `site_showcase_steered`. */
  id: string;
  /** A small icon or key before the title. */
  icon?: ReactNode;
  title: ReactNode;
  /** The use case in a sentence or two, open while the item plays. */
  description: ReactNode;
  /** The tray's hue while this item plays. */
  hue: number;
  /** How long the item plays before the next, in ms: its demo, then time to read the result. */
  dwell?: number;
  /** The demo. It mounts when the item comes up, and again when it is picked or played again. */
  children: ReactNode;
}

/** One use in a Showcase. It renders nothing itself; the Showcase reads it. */
function ShowcaseItem(_: ItemProps): null {
  return null;
}

interface Stage {
  /** The tray is on screen and the visitor hasn't asked for reduced motion: demos may move. */
  playing: boolean;
  /** Reduced motion: a demo shows its finished state at once. */
  still: boolean;
}

const StageContext = createContext<Stage>({ playing: true, still: false });

/** For a demo on the tray: whether to play now, or to show itself finished. */
export function useShowcaseStage(): Stage {
  return useContext(StageContext);
}

const DWELL_MS = 6000;

/** Whether the page is in a background tab, where nothing should move on unseen. */
function usePageHidden() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return hidden;
}

type Steer = AnalyticsProperties<"site_showcase_steered">["action"];

interface Props {
  /** The list's name for screen readers, such as "Things to ask Claude". */
  label: string;
  /** Which side the tray takes when the block is wide: after the list (the default) or before it. */
  tray?: "start" | "end";
  /** The tray's height, when its demos need more room than the default. */
  trayClassName?: string | undefined;
  children: ReactNode;
  className?: string | undefined;
}

function ShowcaseRoot({ label, tray = "end", trayClassName, children, className }: Props) {
  const { t } = useLingui();
  const items = Children.toArray(children)
    .filter((child): child is ReactElement<ItemProps> => isValidElement(child))
    .filter((child) => child.type === ShowcaseItem)
    .map((child) => child.props);

  const base = useId();
  const still = useStill();
  const hidden = usePageHidden();
  const root = useRef<HTMLDivElement>(null);
  // It waits until most of the block is on screen, so the first demo starts where you can see it.
  const inView = useInView(root, { amount: 0.5 });
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const [index, setIndex] = useState(0);
  // It moves on by itself, round the list again and again, until the visitor picks an item.
  const [auto, setAuto] = useState(true);
  // Counts picks and replays, so the demo and its timer start over even on the same item.
  const [run, setRun] = useState(0);
  // Keyboard focus in the list holds the timer, so the selection never moves away from it.
  const [keys, setKeys] = useState(false);

  const item = items[index] as ItemProps;
  const timed = !still && auto;
  const held = keys || !inView || hidden;
  const stage: Stage = { playing: inView && !hidden, still };

  const steer = (action: Steer, id: string) =>
    captureAnalytics("site_showcase_steered", { action, item: id });

  const advance = () => setIndex((index + 1) % items.length);

  const select = (i: number, byKey: boolean) => {
    const next = (i + items.length) % items.length;
    setIndex(next);
    setAuto(false);
    setRun((n) => n + 1);
    if (byKey) tabs.current[next]?.focus();
    // Arrow keys step through items on the way to one, so only a click or Enter counts as a pick.
    else steer("picked", (items[next] as ItemProps).id);
  };

  const replay = () => {
    setRun((n) => n + 1);
    steer("replayed", item.id);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = {
      ArrowDown: index + 1,
      ArrowRight: index + 1,
      ArrowUp: index - 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: items.length - 1,
    };
    const to = moves[e.key];
    if (to === undefined) return;
    e.preventDefault();
    select(to, true);
  };

  return (
    <div
      ref={root}
      className={clsx(
        "grid gap-6 @4xl:gap-14",
        // The tray takes the wider column on either side.
        tray === "start"
          ? "@4xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"
          : "@4xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]",
        className,
      )}
    >
      <div
        role="tablist"
        aria-label={label}
        aria-orientation="vertical"
        onKeyDown={onKeyDown}
        onFocus={(e) => setKeys(e.target.matches(":focus-visible"))}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setKeys(false);
        }}
        className={clsx(
          "order-2 flex flex-col @4xl:justify-center",
          tray === "start" ? "@4xl:order-2" : "@4xl:order-1",
        )}
      >
        {items.map((each, i) => {
          const on = i === index;
          return (
            <button
              key={each.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${each.id}`}
              aria-selected={on}
              aria-controls={`${base}-panel`}
              tabIndex={on ? 0 : -1}
              onClick={() => select(i, false)}
              className="group relative block w-full py-4 text-start focus-visible:outline-2 focus-visible:outline-ring @4xl:py-5"
            >
              <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-edge" />
              {on && (
                // The divider under the playing item is its timer; with no timer it stays full.
                <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-0.5">
                  {timed ? (
                    <span
                      key={`${each.id}-${run}`}
                      data-paused={held || undefined}
                      onAnimationEnd={advance}
                      style={{ animationDuration: `${each.dwell ?? DWELL_MS}ms` }}
                      className="landing-dwell absolute inset-0 bg-ink ltr:origin-left rtl:origin-right"
                    />
                  ) : (
                    <span className="absolute inset-0 bg-ink" />
                  )}
                </span>
              )}
              <span className="flex items-center gap-3.5">
                {each.icon && (
                  // While its item plays, the icon takes the tray's tint, so the two read as one.
                  <span
                    aria-hidden="true"
                    style={trayStyle(each.hue)}
                    className={clsx(
                      "grid size-8 shrink-0 place-items-center rounded-lg transition-[background-color,color] duration-200 [&_svg]:size-4",
                      on
                        ? "use-case-tile text-ink"
                        : "bg-plate-nested/60 text-ink-muted hoverable:group-hover:bg-plate-nested hoverable:group-hover:text-ink",
                    )}
                  >
                    {each.icon}
                  </span>
                )}
                <span
                  className={clsx(
                    "min-w-0 text-lg font-medium tracking-[-0.02em] text-balance transition-colors duration-200",
                    on ? "text-ink" : "text-ink-muted hoverable:group-hover:text-ink",
                  )}
                >
                  {each.title}
                </span>
              </span>
              <span
                className={clsx(
                  "grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                  on ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                )}
              >
                <span className="overflow-hidden">
                  <span
                    className={clsx(
                      "block max-w-[44ch] pt-2 text-md text-pretty text-ink-secondary",
                      each.icon && "ps-[46px]",
                    )}
                  >
                    {each.description}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${base}-panel`}
        aria-labelledby={`${base}-tab-${item.id}`}
        style={trayStyle(item.hue)}
        className={clsx(
          "use-case-tile relative order-1 grid place-items-center overflow-hidden rounded-[28px] px-5 py-14 transition-[background-color] duration-500 @2xl:px-10",
          tray === "start" ? "@4xl:order-1" : "@4xl:order-2",
          trayClassName ?? "min-h-[400px] @4xl:min-h-[480px]",
        )}
      >
        {/* Quiet on purpose: the demo is the subject, and the list moves on by itself. With reduced
           motion a demo shows finished, so there is nothing to replay. */}
        {!still && (
          <button
            type="button"
            onClick={replay}
            aria-label={t`Replay`}
            title={t`Replay`}
            className="absolute end-3.5 top-3.5 z-10 grid size-9 place-items-center rounded-full bg-plate/80 text-ink edge-drop transition-[background-color,scale] duration-150 ease-out active:scale-[0.94] hoverable:hover:bg-plate focus-visible:outline-2 focus-visible:outline-ring"
          >
            <RotateCcw aria-hidden="true" className="size-3.5" />
          </button>
        )}
        <StageContext.Provider value={stage}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${item.id}-${run}`}
              initial={still ? false : { opacity: 0, y: 8, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(6px)", transition: { duration: 0.25 } }}
              transition={{ duration: 0.35, ease: EASE }}
              className="flex w-full justify-center"
            >
              {item.children}
            </motion.div>
          </AnimatePresence>
        </StageContext.Provider>
      </div>
    </div>
  );
}

/** Timed slides of use cases, each with its demo. See the comment at the top of the file. */
export const Showcase = Object.assign(ShowcaseRoot, { Item: ShowcaseItem });
