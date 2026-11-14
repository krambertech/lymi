import { Trans } from "@lingui/react/macro";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

const SEEN = "lymi-free-gift";
const EASE = [0.22, 1, 0.36, 1] as const;

// Little sparks that fly off the box as the lid lifts: where each one ends up, in icon units.
const SPARKS = [
  { x: -6, y: -5, delay: 0.16 },
  { x: 0, y: -8, delay: 0.1 },
  { x: 6, y: -5, delay: 0.2 },
] as const;

/** A present whose lid hops and whose bow flutters, once per visit and again on hover. */
function Gift({ round }: { round: number }) {
  const play = round > 0;
  const timing = (delay = 0) => ({ duration: 0.9, delay, ease: EASE });
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-[18px] shrink-0 overflow-visible text-amber-mark"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4.5" y="11" width="15" height="10" rx="1.5" fill="currentColor" fillOpacity={0.14} />
      <path d="M12 11v10" />
      <motion.g
        key={`lid-${round}`}
        style={{ transformBox: "fill-box", originX: 0.5, originY: 1 }}
        animate={play ? { y: [0, -4.5, 0.6, 0], rotate: [0, -9, 2, 0] } : undefined}
        transition={{ ...timing(), times: [0, 0.35, 0.75, 1] }}
      >
        <rect x="3" y="7.5" width="18" height="3.5" rx="1" fill="currentColor" fillOpacity={0.24} />
        <path d="M12 7.5V11" />
        <motion.path
          d="M12 7.5C10.4 4.4 7.2 4.4 7.6 6.2C7.9 7.4 10.4 7.5 12 7.5Z"
          fill="currentColor"
          style={{ transformBox: "fill-box", originX: 1, originY: 1 }}
          animate={play ? { rotate: [0, -22, 8, 0], scale: [1, 1.18, 1] } : undefined}
          transition={timing(0.08)}
        />
        <motion.path
          d="M12 7.5C13.6 4.4 16.8 4.4 16.4 6.2C16.1 7.4 13.6 7.5 12 7.5Z"
          fill="currentColor"
          style={{ transformBox: "fill-box", originX: 0, originY: 1 }}
          animate={play ? { rotate: [0, 22, -8, 0], scale: [1, 1.18, 1] } : undefined}
          transition={timing(0.08)}
        />
      </motion.g>
      {play &&
        SPARKS.map((spark) => (
          <motion.circle
            key={`${round}-${spark.x}`}
            cx="12"
            cy="6"
            r="1"
            fill="currentColor"
            stroke="none"
            initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
            animate={{ opacity: [0, 1, 0], x: spark.x, y: spark.y, scale: [0.4, 1, 0.6] }}
            transition={{ duration: 0.7, delay: spark.delay, ease: EASE }}
          />
        ))}
    </svg>
  );
}

/** Says up front that Lymi is free, before the origin badge when one shows. */
export function FreeBadge() {
  const reduce = useReducedMotion();
  const [round, setRound] = useState(0);

  // The present opens once per visit, a beat after the page settles.
  useEffect(() => {
    if (reduce) return;
    try {
      if (sessionStorage.getItem(SEEN)) return;
      sessionStorage.setItem(SEEN, "1");
    } catch {
      // Storage can be blocked; the present still opens, just again on the next page.
    }
    const timer = setTimeout(() => setRound(1), 700);
    return () => clearTimeout(timer);
  }, [reduce]);

  return (
    <p
      className="edge flex h-8 w-fit items-center gap-2 rounded-full bg-plate ps-2.5 pe-3.5 text-sm font-medium text-ink"
      onPointerEnter={() => {
        if (!reduce) setRound((r) => r + 1);
      }}
    >
      <Gift round={round} />
      <Trans>Free to use</Trans>
    </p>
  );
}
