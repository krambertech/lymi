import { clsx } from "clsx";
import { AnimatePresence, motion, useInView } from "motion/react";
import {
  type CSSProperties,
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
  useRef,
  useState,
} from "react";
import { Lantern } from "../Lantern";
import { AssistantMark, type AssistantName } from "./AssistantMarks";
import { EASE, useStill } from "./playback";

export interface Ask {
  id: string;
  /** What it is for, in a few words: the item's name in the list. */
  use: ReactNode;
  ask: ReactNode;
  /** What Lymi did, as the assistant reports it. Only what the tools really do. */
  did: ReactNode;
}

interface Props {
  assistant: AssistantName;
  hue: number;
  asks: readonly Ask[];
}

/** How long each exchange stays: it plays in about 1.6 s, then there's time to read it. */
const DWELL_MS = 4600;

/**
 * Whether the visitor is holding the stage: a moving pointer over it, or keyboard focus in it. A page
 * scrolled under a resting cursor keeps playing.
 */
function useHold() {
  const [pointer, setPointer] = useState(false);
  const [keys, setKeys] = useState(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  return {
    held: pointer || keys,
    handlers: {
      onPointerMove: (e: PointerEvent<HTMLElement>) => {
        if (e.pointerType !== "mouse") return;
        const moved = !last.current || last.current.x !== e.clientX || last.current.y !== e.clientY;
        last.current = { x: e.clientX, y: e.clientY };
        if (moved) setPointer(true);
      },
      onPointerLeave: () => {
        last.current = null;
        setPointer(false);
      },
      onFocus: (e: FocusEvent<HTMLElement>) => setKeys(e.target.matches(":focus-visible")),
      onBlur: (e: FocusEvent<HTMLElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setKeys(false);
      },
    },
  };
}

/** One exchange on the tray: the request, the assistant using Lymi, and what Lymi did. */
function Exchange({
  assistant,
  item,
  still,
  play,
}: {
  assistant: AssistantName;
  item: Ask;
  still: boolean;
  /** On screen: it waits to play until then, though its words are in the page from the start. */
  play: boolean;
}) {
  const shown = still || play;
  const step = (delay: number) => ({
    initial: still ? false : { opacity: 0, y: 10, filter: "blur(6px)" },
    animate: shown
      ? { opacity: 1, y: 0, filter: "blur(0px)" }
      : { opacity: 0, y: 10, filter: "blur(6px)" },
    transition: { duration: 0.45, ease: EASE, delay: still ? 0 : delay },
  });
  return (
    <div className="flex w-full max-w-[400px] flex-col gap-3">
      <motion.p
        {...step(0.1)}
        className="ms-10 w-fit max-w-[85%] self-end rounded-2xl rounded-ee-md bg-ink px-4 py-2.5 text-md text-pretty text-canvas"
      >
        {item.ask}
      </motion.p>
      <motion.div {...step(0.7)} className="flex items-start gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-plate edge-drop [&_svg]:size-4">
          <AssistantMark name={assistant} />
        </span>
        <p className="flex min-w-0 items-start gap-2 rounded-xl bg-plate px-3.5 py-2.5 text-md text-pretty text-ink edge-drop">
          <Lantern className="mt-0.5 size-5 shrink-0" />
          <span>{item.did}</span>
        </p>
      </motion.div>
    </div>
  );
}

/**
 * Things to ask this assistant: one exchange at a time on its tray, beside the list of what each is
 * for. It moves on by itself until the visitor picks one.
 */
export function AssistantAsks({ assistant, hue, asks }: Props) {
  const still = useStill();
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root, { amount: 0.5 });
  const hold = useHold();
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(false);
  const auto = !still && !picked;
  const paused = !inView || hold.held;
  const item = asks[index] as Ask;

  return (
    <div
      ref={root}
      className="mt-12 grid gap-8 @4xl:mt-14 @4xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] @4xl:gap-14"
    >
      <div
        {...hold.handlers}
        style={{ "--tray-h": hue } as CSSProperties}
        className="use-case-tile grid min-h-[240px] place-items-center rounded-[28px] p-6 @2xl:p-10 @4xl:min-h-[320px]"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={item.id}
            exit={{ opacity: 0, y: -8, filter: "blur(6px)", transition: { duration: 0.3 } }}
            className="flex w-full justify-center"
          >
            <Exchange assistant={assistant} item={item} still={still} play={inView} />
          </motion.div>
        </AnimatePresence>
      </div>

      <ul {...hold.handlers} className="grid content-start @4xl:pt-1">
        {asks.map((each, i) => {
          const on = i === index;
          return (
            <li key={each.id}>
              <span
                aria-hidden="true"
                className="relative block h-0.5 overflow-hidden rounded-full bg-edge"
              >
                {on &&
                  (auto ? (
                    <span
                      key={`${each.id}-fill`}
                      data-paused={paused || undefined}
                      onAnimationEnd={() => setIndex((n) => (n + 1) % asks.length)}
                      style={{ animationDuration: `${DWELL_MS}ms` }}
                      className="assistant-dwell absolute inset-0 rounded-full bg-ink ltr:origin-left rtl:origin-right"
                    />
                  ) : (
                    <span className="absolute inset-0 rounded-full bg-ink" />
                  ))}
              </span>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setPicked(true);
                  setIndex(i);
                }}
                className={clsx(
                  "block w-full py-3.5 text-start text-lg font-medium tracking-[-0.015em] transition-colors duration-200",
                  on ? "text-ink" : "text-ink-secondary hoverable:hover:text-ink",
                )}
              >
                {each.use}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
