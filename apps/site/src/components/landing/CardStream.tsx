import { clsx } from "clsx";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { SAMPLE_CARDS, type SampleCard } from "./cards";

/**
 * The column is built so the lit card never moves: one compact card always sits above it,
 * which puts the light at a fixed height whatever else is happening. Cards below fade out
 * rather than being cropped, so nothing looks cut in half at the end of the column.
 */
const COMPACT_H = 56;
const OPEN_H = 104;
const GAP = 10;
/** How many compact cards trail below the lit one before the column ends. */
const TRAIL = 2;
const SPRING = { type: "spring", duration: 0.78, bounce: 0.06 } as const;
const INTRO_EASE = [0.19, 1, 0.22, 1] as const;

const STREAM = [
  SAMPLE_CARDS[3],
  SAMPLE_CARDS[1],
  SAMPLE_CARDS[0],
  SAMPLE_CARDS[6],
  SAMPLE_CARDS[2],
].filter((card): card is SampleCard => Boolean(card));

interface CardProps {
  card: SampleCard;
  /** The one in the beam: taller, brighter, and the only one showing its meaning. */
  open: boolean;
  /** 0 in the dark, 1 in the middle of the light. Drives the colour through the CSS. */
  lit: number;
}

function StreamCard({ card, open, lit }: CardProps) {
  const still = useReducedMotion();
  const spring = still ? { duration: 0 } : SPRING;
  return (
    <motion.div
      className="lit-card flex flex-col justify-center overflow-hidden px-3.5"
      style={{ borderRadius: 10, ["--lit" as string]: lit }}
      initial={false}
      animate={{ height: open ? OPEN_H : COMPACT_H }}
      transition={spring}
    >
      <span className="lit-label flex items-baseline gap-2 text-2xs tracking-[0.06em] uppercase">
        {card.label}
        <AnimatePresence initial={false}>
          {open && (
            <motion.span
              key="new"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="ml-auto rounded-xs bg-amber-soft px-1.5 py-px text-[9px] text-amber-text"
            >
              New
            </motion.span>
          )}
        </AnimatePresence>
      </span>

      {/* The term stretches as the card opens: the same word, given more room. */}
      <motion.p
        className="lit-term mt-1 origin-left truncate text-lg font-medium tracking-[-0.026em]"
        initial={false}
        animate={{ scale: open ? 1.1 : 1 }}
        transition={spring}
      >
        {card.term}
      </motion.p>

      <AnimatePresence initial={false}>
        {open && (
          <motion.p
            key="meaning"
            className="lit-meaning line-clamp-2 text-xs text-text-2"
            initial={{ opacity: 0, y: -4, marginTop: 0 }}
            animate={{ opacity: 1, y: 0, marginTop: 10 }}
            exit={{ opacity: 0, y: -4, marginTop: 0 }}
            transition={still ? { duration: 0 } : { duration: 0.32, delay: 0.12 }}
          >
            {card.meaning}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface Props {
  /** Where the light belongs, in viewport coordinates. The hero converts to its own. */
  onLampMove?: ((point: { x: number; y: number }) => void) | undefined;
  className?: string | undefined;
}

/** Where a card sits, by slot. Slot 1 is the open one, so everything below it clears its height. */
function offsetOf(slot: number): number {
  const compactStep = COMPACT_H + GAP;
  if (slot <= 1) return slot * compactStep;
  return compactStep + (OPEN_H + GAP) + (slot - 2) * compactStep;
}

const COLUMN_H = offsetOf(TRAIL + 1) + COMPACT_H;
const LAMP_Y = offsetOf(1) + OPEN_H / 2;

/**
 * Cards arriving down one side of the hero. Each enters at the top as a term on its own,
 * grows open when it reaches the light and gives up its meaning, then shrinks and drops away
 * underneath. Hovering holds whatever is lit so it can be read.
 *
 * Every card is placed at an offset worked out from its slot rather than stacked by flex.
 * One card is open at any moment and it is always slot 1, so the open position never moves,
 * which is what lets the lamp sit on a fixed point instead of chasing a reflowing column.
 */
export function CardColumn({ onLampMove, className }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  const inView = useInView(box, { amount: 0.25 });
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const shown = [0, 1, 2].map((slot) => {
    const index = (step + slot + STREAM.length) % STREAM.length;
    return STREAM[index] as SampleCard;
  });

  useEffect(() => {
    if (!inView || still || paused || STREAM.length < 4) return;
    const timer = window.setInterval(
      () => setStep((current) => (current - 1 + STREAM.length) % STREAM.length),
      2900,
    );
    return () => window.clearInterval(timer);
  }, [inView, paused, still]);

  useEffect(() => {
    if (!onLampMove) return;
    const send = () => {
      const el = box.current;
      // A column that is not laid out measures as a zero box at the origin, which would put
      // the light in the top-left corner of the page rather than on a card.
      if (!el || el.offsetParent === null) return;
      const r = el.getBoundingClientRect();
      onLampMove({ x: r.left + r.width / 2, y: r.top + LAMP_Y });
    };
    send();
    window.addEventListener("resize", send);
    window.addEventListener("scroll", send, { passive: true });
    return () => {
      window.removeEventListener("resize", send);
      window.removeEventListener("scroll", send);
    };
  }, [onLampMove]);

  return (
    <div
      ref={box}
      className={clsx("relative", className)}
      style={{ height: COLUMN_H }}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      aria-hidden="true"
    >
      <AnimatePresence initial={!still}>
        {shown.map((card, slot) => {
          const lit = slot === 1 ? 1 : slot === 0 ? 0.28 : Math.max(0, 0.22 - (slot - 2) * 0.12);
          return (
            <motion.div
              key={card.term}
              className="absolute inset-x-0 top-0"
              initial={{
                opacity: 0,
                transform: `translate3d(0, ${slot === 0 ? -18 : offsetOf(slot - 1)}px, 0)`,
              }}
              animate={{
                opacity: 1,
                transform: `translate3d(0, ${offsetOf(slot)}px, 0)`,
              }}
              exit={{
                opacity: 0,
                transform: `translate3d(0, ${offsetOf(TRAIL + 2)}px, 0)`,
              }}
              transition={{
                transform: still ? { duration: 0 } : SPRING,
                opacity: { duration: still ? 0.18 : 0.3 },
              }}
            >
              <StreamCard card={card} open={slot === 1} lit={lit} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/**
 * The same idea sideways, for a screen too narrow to put a column beside the headline.
 * Cards drift right to left through a beam fixed at the centre.
 */
export function CardBelt({ onLampMove, className }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  const inView = useInView(wrap, { amount: 0.25 });
  const [step, setStep] = useState(0);
  const shown = [0, 1, 2].map((slot) => {
    const index = (step + slot + STREAM.length) % STREAM.length;
    return STREAM[index] as SampleCard;
  });

  useEffect(() => {
    if (!inView || still || STREAM.length < 4) return;
    const timer = window.setInterval(
      () => setStep((current) => (current - 1 + STREAM.length) % STREAM.length),
      2900,
    );
    return () => window.clearInterval(timer);
  }, [inView, still]);

  useEffect(() => {
    if (!onLampMove) return;
    const send = () => {
      const el = wrap.current;
      if (!el || el.offsetParent === null) return;
      const r = el.getBoundingClientRect();
      onLampMove({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    };
    send();
    window.addEventListener("resize", send);
    window.addEventListener("scroll", send, { passive: true });
    return () => {
      window.removeEventListener("resize", send);
      window.removeEventListener("scroll", send);
    };
  }, [onLampMove]);

  return (
    <div
      ref={wrap}
      className={clsx("overflow-hidden pt-8 pb-4", className)}
      style={{
        maskImage: "linear-gradient(90deg, transparent, #000 14%, #000 86%, transparent)",
        WebkitMaskImage: "linear-gradient(90deg, transparent, #000 14%, #000 86%, transparent)",
      }}
      aria-hidden="true"
    >
      <div className="flex justify-center gap-2.5 px-5">
        <AnimatePresence initial={!still} mode="popLayout">
          {shown.map((card, i) => (
            <motion.div
              layout={!still}
              key={card.term}
              className="lit-card w-[158px] shrink-0 rounded-sm px-3.5 py-3"
              style={{ ["--lit" as string]: i === 1 ? 1 : 0.2 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                layout: still ? { duration: 0 } : SPRING,
                opacity: { duration: still ? 0.18 : 0.32, ease: INTRO_EASE },
              }}
            >
              <span className="lit-label block text-2xs tracking-[0.06em] uppercase">
                {card.label}
              </span>
              <p className="lit-term mt-1.5 truncate text-lg font-medium tracking-[-0.026em]">
                {card.term}
              </p>
              <p className="mt-1.5 line-clamp-2 text-xs text-text-2">{card.meaning}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
