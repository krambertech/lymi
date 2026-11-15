import { Trans } from "@lingui/react/macro";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { GIFT_SEEN } from "../../lib/free-gift";

const EASE = [0.22, 1, 0.36, 1] as const;

/** "drop" lowers the lid onto the box on the first visit; "open" lifts it on hover. */
type Play = { kind: "still" | "drop" | "open"; round: number };

// Where the lid lands, in seconds after the drop starts.
const LANDS = 0.38 + 0.5 * 0.7;

// Sparks thrown up as the lid lifts, and puffs pushed out sideways as it lands, in icon units.
const SPARKS = [
  { x: -6, y: -5, delay: 0.16 },
  { x: 0, y: -8, delay: 0.1 },
  { x: 6, y: -5, delay: 0.2 },
] as const;
const PUFFS = [
  { cx: 4, x: -3 },
  { cx: 20, x: 3 },
] as const;

function Bow({ play }: { play: Play }) {
  const flutter =
    play.kind === "open"
      ? { delay: 0.08, keys: [0, 22, -8, 0] }
      : play.kind === "drop"
        ? { delay: LANDS - 0.05, keys: [0, 16, -5, 0] }
        : null;
  const loop = (side: -1 | 1) => ({
    style: { transformBox: "fill-box" as const, originX: side < 0 ? 1 : 0, originY: 1 },
    animate: flutter
      ? { rotate: flutter.keys.map((k) => k * side), scale: [1, 1.15, 1, 1] }
      : undefined,
    transition: { duration: 0.8, delay: flutter?.delay ?? 0, ease: EASE },
  });
  return (
    <>
      <path d="M11.3 8.3 9.9 10.4" />
      <path d="M12.7 8.3 14.1 10.4" />
      <motion.path
        key={`left-${play.kind}-${play.round}`}
        d="M12 7.3C10.4 4.6 7.9 3.1 6.8 4.2C5.7 5.3 7.3 7.4 12 7.3Z"
        fill="currentColor"
        fillOpacity={0.35}
        {...loop(-1)}
      />
      <motion.path
        key={`right-${play.kind}-${play.round}`}
        d="M12 7.3C13.6 4.6 16.1 3.1 17.2 4.2C18.3 5.3 16.7 7.4 12 7.3Z"
        fill="currentColor"
        fillOpacity={0.35}
        {...loop(1)}
      />
      <rect x="10.8" y="6.2" width="2.4" height="2.3" rx="0.9" fill="currentColor" />
    </>
  );
}

/** A present that takes its lid on the first visit, and lifts it when you point at it. */
function Gift({ play }: { play: Play }) {
  const lid =
    play.kind === "drop"
      ? {
          initial: { y: -9, opacity: 0, rotate: -10 },
          animate: { y: [-9, 0.7, 0], opacity: [0, 1, 1], rotate: [-10, 2, 0] },
          transition: { duration: 0.5, delay: 0.38, times: [0, 0.7, 1], ease: EASE },
        }
      : play.kind === "open"
        ? {
            animate: { y: [0, -4.5, 0.6, 0], rotate: [0, -9, 2, 0] },
            transition: { duration: 0.9, times: [0, 0.35, 0.75, 1], ease: EASE },
          }
        : {};
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-[18px] shrink-0 overflow-visible text-amber-mark"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* The box gives a little as the lid lands on it. */}
      <motion.g
        key={`box-${play.kind}-${play.round}`}
        style={{ transformBox: "fill-box", originX: 0.5, originY: 1 }}
        animate={play.kind === "drop" ? { scaleY: [1, 0.9, 1], scaleX: [1, 1.04, 1] } : undefined}
        transition={{ duration: 0.28, delay: LANDS - 0.04, ease: EASE }}
      >
        <rect
          x="4.5"
          y="11"
          width="15"
          height="9.5"
          rx="1.5"
          fill="currentColor"
          fillOpacity={0.14}
        />
        <path d="M12 11v9.5" />
      </motion.g>
      <motion.g
        key={`lid-${play.kind}-${play.round}`}
        className="in-data-[gift=new]:opacity-0"
        style={{ transformBox: "fill-box", originX: 0.5, originY: 1 }}
        {...lid}
      >
        <rect x="3" y="7.5" width="18" height="3.5" rx="1" fill="currentColor" fillOpacity={0.24} />
        <path d="M12 7.5V11" />
        <Bow play={play} />
      </motion.g>
      {play.kind === "open" &&
        SPARKS.map((spark) => (
          <motion.circle
            key={`${play.round}-${spark.x}`}
            cx="12"
            cy="5"
            r="1"
            fill="currentColor"
            stroke="none"
            initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
            animate={{ opacity: [0, 1, 0], x: spark.x, y: spark.y, scale: [0.4, 1, 0.6] }}
            transition={{ duration: 0.7, delay: spark.delay, ease: EASE }}
          />
        ))}
      {play.kind === "drop" &&
        PUFFS.map((puff) => (
          <motion.circle
            key={puff.cx}
            cx={puff.cx}
            cy="10.5"
            r="0.9"
            fill="currentColor"
            stroke="none"
            initial={{ opacity: 0, x: 0, scale: 0.5 }}
            animate={{ opacity: [0, 0.9, 0], x: puff.x, scale: [0.5, 1, 0.7] }}
            transition={{ duration: 0.45, delay: LANDS - 0.03, ease: EASE }}
          />
        ))}
    </svg>
  );
}

/** Says up front that Lymi is free, before the origin badge when one shows. */
export function FreeBadge() {
  const reduce = useReducedMotion();
  const [play, setPlay] = useState<Play>({ kind: "still", round: 0 });

  // BaseLayout marks a first visit before paint, hiding the lid; here it drops into place.
  useEffect(() => {
    if (document.documentElement.dataset.gift !== "new") return;
    try {
      sessionStorage.setItem(GIFT_SEEN, "1");
    } catch {
      // Storage can be blocked; the lid then drops again on the next page.
    }
    setPlay({ kind: "drop", round: 1 });
  }, []);

  // The dropping lid now holds itself hidden, so the page's mark can go.
  useEffect(() => {
    if (play.kind === "drop") delete document.documentElement.dataset.gift;
  }, [play.kind]);

  return (
    <p
      className="edge flex h-8 w-fit items-center gap-2 rounded-full bg-plate ps-2.5 pe-3.5 text-sm font-medium text-ink"
      onPointerEnter={() => {
        if (!reduce) setPlay((p) => ({ kind: "open", round: p.round + 1 }));
      }}
    >
      <Gift play={play} />
      <Trans>Free to use</Trans>
    </p>
  );
}
