import { clsx } from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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
const EVERY = 3000;

const SPRING = { type: "spring", duration: 0.62, bounce: 0.18 } as const;

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
      animate={{ height: open ? OPEN_H : COMPACT_H }}
      transition={spring}
    >
      <span className="lit-label flex items-baseline gap-2 text-2xs tracking-[0.06em] uppercase">
        {card.label}
        <AnimatePresence>
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
        animate={{ scale: open ? 1.1 : 1 }}
        transition={spring}
      >
        {card.term}
      </motion.p>

      <AnimatePresence initial={false}>
        {open && (
          <motion.p
            key="meaning"
            className="line-clamp-2 text-xs text-text-2"
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
  const [feed, setFeed] = useState(1);
  const [held, setHeld] = useState(false);
  const still = useReducedMotion();

  // A fixed window: one card waiting above the light, one in it, the rest walking away.
  const shown = Array.from({ length: TRAIL + 3 }, (_, i) => {
    const slot = i - 1;
    const n = feed - slot;
    const at = ((n % SAMPLE_CARDS.length) + SAMPLE_CARDS.length) % SAMPLE_CARDS.length;
    return { key: n, slot, card: SAMPLE_CARDS[at] as SampleCard };
  }).filter((c) => c.key >= 0);

  useEffect(() => {
    if (held || still) return;
    const t = window.setInterval(() => setFeed((n) => n + 1), EVERY);
    return () => window.clearInterval(t);
  }, [held, still]);

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
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
    >
      {shown.map(({ key, slot, card }) => {
        // Above the light and past the last visible slot, a card is simply not there.
        const gone = slot < 0 || slot > TRAIL;
        const lit = slot === 1 ? 1 : slot === 0 ? 0.28 : Math.max(0, 0.22 - (slot - 2) * 0.12);
        return (
          <motion.div
            key={key}
            className="absolute inset-x-0 top-0"
            initial={false}
            animate={{ y: offsetOf(slot), opacity: gone ? 0 : 1 }}
            transition={still ? { duration: 0 } : SPRING}
          >
            <StreamCard card={card} open={slot === 1} lit={lit} />
          </motion.div>
        );
      })}
    </div>
  );
}

/**
 * The same idea sideways, for a screen too narrow to put a column beside the headline.
 * Cards drift right to left through a beam fixed at the centre.
 */
export function CardBelt({ className }: { className?: string | undefined }) {
  const belt = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();

  useEffect(() => {
    const track = belt.current;
    const box = wrap.current;
    if (!track || !box) return;

    const cards = Array.from(track.children) as HTMLElement[];
    let width = 0;
    let offset = 0;
    let raf = 0;
    let last = 0;

    const measure = () => {
      width = 0;
      for (let i = 0; i < cards.length / 2; i++) width += (cards[i]?.offsetWidth ?? 0) + 10;
    };

    // Nothing snaps the belt, so a card can sit up to half a pitch off centre. The beam has
    // to reach further than that gap or the card nearest the middle never gets bright enough
    // to give up its meaning, which is the whole point of the thing moving.
    const REACH = 250;

    const paint = () => {
      const r = box.getBoundingClientRect();
      const beam = r.left + r.width / 2;
      for (const card of cards) {
        const c = card.getBoundingClientRect();
        const raw = Math.max(0, 1 - Math.abs(c.left + c.width / 2 - beam) / REACH);
        card.style.setProperty("--lit", (raw * raw * (3 - 2 * raw)).toFixed(3));
      }
    };

    const frame = (now: number) => {
      const dt = Math.min((now - (last || now)) / 1000, 0.05);
      last = now;
      if (!document.hidden) {
        offset -= 24 * dt;
        if (width && offset <= -width) offset += width;
        track.style.transform = `translate3d(${offset.toFixed(2)}px,0,0)`;
        paint();
      }
      raf = window.requestAnimationFrame(frame);
    };

    measure();
    window.addEventListener("resize", measure);
    if (still) paint();
    else raf = window.requestAnimationFrame(frame);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [still]);

  return (
    <div
      ref={wrap}
      className={clsx("overflow-hidden", className)}
      style={{
        maskImage: "linear-gradient(90deg, transparent, #000 14%, #000 86%, transparent)",
        WebkitMaskImage: "linear-gradient(90deg, transparent, #000 14%, #000 86%, transparent)",
      }}
      aria-hidden="true"
    >
      <div ref={belt} className="flex gap-2.5 will-change-transform">
        {[...SAMPLE_CARDS, ...SAMPLE_CARDS].map((card, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: the list is doubled, so index is the identity
            key={i}
            className="lit-card w-[158px] shrink-0 rounded-sm px-3.5 py-3"
          >
            <span className="lit-label block text-2xs tracking-[0.06em] uppercase">
              {card.label}
            </span>
            <p className="lit-term mt-1.5 truncate text-lg font-medium tracking-[-0.026em]">
              {card.term}
            </p>
            <p className="lit-meaning mt-1.5 line-clamp-2 text-xs">{card.meaning}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
