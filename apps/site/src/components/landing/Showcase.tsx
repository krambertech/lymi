import { useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { RotateCcw } from "lucide-react";
import { AnimatePresence, motion, useInView } from "motion/react";
import {
  Children,
  type CSSProperties,
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
import { EASE, useHold, useStill } from "./playback";

/*
 * Timed slides of use cases in one block: a list of uses on one side, the playing one's demo on a
 * tinted stage on the other. Any demo goes on the stage; the block owns the timing, the progress
 * line on the divider, keyboard use, Replay, pausing and reduced motion.
 *
 *   <Showcase label={t`Things to ask Claude`}>
 *     <Showcase.Item id="pdf" icon={<FileText />} title="From a long PDF" description="…" hue={25}>
 *       <PdfDemo />
 *     </Showcase.Item>
 *   </Showcase>
 */

interface ItemProps {
  id: string;
  /** A small icon or key before the title. */
  icon?: ReactNode;
  title: ReactNode;
  /** The use case in a sentence or two, open while the item plays. */
  description: ReactNode;
  /** The stage's tray hue while this item plays. */
  hue: number;
  /** How long the item plays before the next, in ms: its demo, then time to read the result. */
  dwell?: number;
  /** The demo. It mounts when the item comes up and again on Replay. */
  children: ReactNode;
}

/** One use in a Showcase. It renders nothing itself; the Showcase reads it. */
function ShowcaseItem(_: ItemProps): null {
  return null;
}

interface Stage {
  /** The stage is on screen and the visitor hasn't asked for reduced motion: demos may move. */
  playing: boolean;
  /** Reduced motion: a demo shows its finished state at once. */
  still: boolean;
}

const StageContext = createContext<Stage>({ playing: true, still: false });

/** For a demo on the stage: whether to play now, or to show itself finished. */
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

interface Props {
  /** The list's name for screen readers, such as "Things to ask Claude". */
  label: string;
  children: ReactNode;
  className?: string | undefined;
}

function ShowcaseRoot({ label, children, className }: Props) {
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
  const hold = useHold();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(false);
  const [replays, setReplays] = useState(0);

  const item = items[index] as ItemProps;
  const auto = !still && !picked;
  const paused = !inView || hidden || hold.held;
  const stage: Stage = { playing: inView && !hidden, still };

  /**
   * The playing item's timer: it fills over the item's dwell and moves the block on when it ends.
   * Picked by hand, it stays full; with reduced motion there is no timer at all.
   */
  const timer = (each: ItemProps, className: string, fill: string) =>
    auto ? (
      <span
        key={`${each.id}-${replays}`}
        data-paused={paused || undefined}
        onAnimationEnd={() => setIndex((n) => (n + 1) % items.length)}
        style={{ animationDuration: `${each.dwell ?? DWELL_MS}ms` }}
        className={clsx(className, fill)}
      />
    ) : (
      <span className={className} />
    );

  const select = (i: number, focus: boolean) => {
    const next = (i + items.length) % items.length;
    setPicked(true);
    setIndex(next);
    if (focus) tabs.current[next]?.focus();
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
      {...hold.handlers}
      className={clsx(
        "grid overflow-hidden rounded-[28px] bg-plate edge @4xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]",
        className,
      )}
    >
      <div
        role="tablist"
        aria-label={label}
        aria-orientation="vertical"
        onKeyDown={onKeyDown}
        className="order-2 flex flex-col @4xl:order-1"
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
              className="group relative block w-full border-b border-edge px-6 py-5 text-start last:border-b-0 @4xl:py-7 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ring @2xl:px-8"
            >
              <span className="flex items-center gap-3.5">
                {each.icon && (
                  // While its item plays, the icon takes the stage's tint, so the two read as one.
                  <span
                    aria-hidden="true"
                    style={{ "--tray-h": each.hue } as CSSProperties}
                    className={clsx(
                      "grid size-8 shrink-0 place-items-center rounded-lg transition-[background-color,color] duration-500 [&_svg]:size-4",
                      on ? "use-case-tile text-ink" : "bg-plate-nested text-ink-secondary",
                    )}
                  >
                    {each.icon}
                  </span>
                )}
                <span
                  className={clsx(
                    "min-w-0 text-lg font-medium tracking-[-0.02em] text-balance transition-colors duration-200 @2xl:text-xl",
                    on ? "text-ink" : "text-ink-secondary hoverable:group-hover:text-ink",
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
              {on && (
                // The progress line runs along the divider under the playing item.
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 -bottom-px h-0.5 overflow-hidden"
                >
                  {timer(
                    each,
                    "absolute inset-0 bg-ink ltr:origin-left rtl:origin-right",
                    "landing-dwell",
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${base}-panel`}
        aria-labelledby={`${base}-tab-${item.id}`}
        style={{ "--tray-h": item.hue } as CSSProperties}
        className="use-case-tile relative order-1 grid min-h-[400px] place-items-center overflow-hidden px-5 py-14 transition-[background-color] duration-500 @2xl:px-10 @4xl:order-2 @4xl:min-h-[460px]"
      >
        {/* Quiet on purpose: the demo is the subject, and it replays by itself. */}
        <button
          type="button"
          onClick={() => setReplays((n) => n + 1)}
          aria-label={t`Replay`}
          title={t`Replay`}
          className="absolute end-3 top-3 z-10 grid size-8 place-items-center rounded-full text-ink-muted transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.94] hoverable:hover:bg-plate/70 hoverable:hover:text-ink-secondary focus-visible:outline-2 focus-visible:outline-ring"
        >
          <RotateCcw aria-hidden="true" className="size-3.5" />
        </button>
        <StageContext.Provider value={stage}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${item.id}-${replays}`}
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
