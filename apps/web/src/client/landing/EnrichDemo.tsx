import { clsx } from "clsx";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { SAMPLE_CARDS } from "./cards";

const CARD = SAMPLE_CARDS[0];

/** Which fields the AI can fill in, in the order they arrive. */
const FIELDS = [
  { key: "Meaning", value: CARD?.meaning ?? "" },
  { key: "Example", value: CARD?.example ?? "" },
  { key: "Say it", value: CARD?.say ?? "" },
];

const STEP = 620;

interface RowProps {
  label: string;
  source: "Lesson" | "AI";
  filled: boolean;
  children: ReactNode;
}

function Row({ label, source, filled, children }: RowProps) {
  const still = useReducedMotion();
  return (
    <div className="flex min-h-[46px] items-start justify-between gap-3 border-b border-edge py-2.5 last:border-b-0">
      <span className="w-[68px] shrink-0 pt-1 text-2xs tracking-[0.06em] text-faint uppercase">
        {label}
      </span>
      <div className="flex-1 text-sm text-text-2">
        <AnimatePresence initial={false} mode="wait">
          {filled ? (
            <motion.div
              key="value"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={still ? { duration: 0 } : { duration: 0.34 }}
            >
              {children}
            </motion.div>
          ) : (
            <motion.span
              key="empty"
              exit={{ opacity: 0 }}
              transition={still ? { duration: 0 } : { duration: 0.18 }}
              className="text-faint italic"
            >
              empty
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <motion.span
        animate={{ opacity: filled ? 1 : 0 }}
        transition={still ? { duration: 0 } : { duration: 0.34, delay: 0.1 }}
        className={clsx(
          "mt-0.5 shrink-0 rounded-xs px-1.5 py-px text-[9px] tracking-[0.06em] uppercase",
          source === "AI" ? "bg-amber-soft text-amber-text" : "bg-plate-2 text-muted",
        )}
      >
        {source}
      </motion.span>
    </div>
  );
}

/**
 * The honest half of the AI story, and it runs itself. A card arrives with a term and nothing
 * else; enriching fills in the rest and labels every field with where it came from, so AI text
 * is never mistaken for something the lesson said. Nothing with text in it is overwritten.
 */
export function EnrichDemo() {
  const box = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  const seen = useInView(box, { amount: 0.6, once: true });
  const [done, setDone] = useState(0);

  // Fills in as it comes into view. There is nothing to press, and nothing to miss.
  useEffect(() => {
    if (!seen) return;
    if (still) {
      setDone(FIELDS.length);
      return;
    }
    const timers = FIELDS.map((_, i) => window.setTimeout(() => setDone(i + 1), 420 + STEP * i));
    return () => timers.forEach(window.clearTimeout);
  }, [seen, still]);

  if (!CARD) return null;

  return (
    <div ref={box} className="mx-auto max-w-[420px]">
      <div className="bg-plate px-5 py-3 edge" style={{ borderRadius: 14 }}>
        <Row label="Term" source="Lesson" filled>
          <span className="text-xl font-medium tracking-[-0.026em] text-text">{CARD.term}</span>
        </Row>
        {FIELDS.map((f, i) => (
          <Row key={f.key} label={f.key} source="AI" filled={done > i}>
            {f.value}
          </Row>
        ))}
      </div>

      <div className="mt-4 flex h-5 items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={done >= FIELDS.length ? "done" : "working"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={still ? { duration: 0 } : { duration: 0.24 }}
            className="text-xs text-muted"
          >
            {done >= FIELDS.length
              ? "Three fields, each labelled with where it came from."
              : "Filling in the rest…"}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
