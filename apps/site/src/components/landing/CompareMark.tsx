import { Trans } from "@lingui/react/macro";
import { clsx } from "clsx";
import { motion, useReducedMotion } from "motion/react";
import { type PointerEvent, useEffect, useState } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Where each icon sits, as a share of its own width, side by side and leaning together. */
const POSE = {
  apart: {
    other: { x: "-66%", y: "0%", rotate: 0 },
    lymi: { x: "66%", y: "0%", rotate: 0 },
  },
  stacked: {
    other: { x: "-24%", y: "-9%", rotate: -8 },
    lymi: { x: "24%", y: "9%", rotate: 6 },
  },
} as const;

const ICON =
  "col-start-1 row-start-1 block aspect-square w-28 rounded-[22.5%] shadow-[0_1px_2px_rgb(0_0_0/0.08),0_12px_32px_-8px_rgb(0_0_0/0.22)] @2xl:w-40";

interface Props {
  /** The other app's icon. */
  icon: string;
  /** Names the picture, such as "The Lymi and Anki app icons". */
  label: string;
}

/**
 * The comparison page's picture. The two icons arrive side by side with "vs" between them, then
 * lean together into a stack; pointing at them spreads them apart again.
 */
export function CompareMark({ icon, label }: Props) {
  const still = useReducedMotion();
  const [stacked, setStacked] = useState(false);

  useEffect(() => {
    if (still) {
      setStacked(true);
      return;
    }
    const timer = window.setTimeout(() => setStacked(true), 1500);
    return () => window.clearTimeout(timer);
  }, [still]);

  const hover = (next: boolean) => (event: PointerEvent) => {
    if (event.pointerType === "mouse") setStacked(next);
  };
  const pose = stacked ? POSE.stacked : POSE.apart;
  const move = { duration: still ? 0 : 0.7, ease: EASE };
  const arrive = (delay: number) => ({ duration: still ? 0 : 0.45, ease: EASE, delay });

  return (
    <figure
      role="img"
      aria-label={label}
      onPointerEnter={hover(false)}
      onPointerLeave={hover(true)}
      className="grid h-52 place-items-center @2xl:h-64"
    >
      <motion.img
        src={icon}
        alt=""
        width={160}
        height={160}
        draggable={false}
        className={ICON}
        initial={still ? false : { opacity: 0, scale: 0.92, ...POSE.apart.other }}
        animate={{ opacity: 1, scale: 1, ...pose.other }}
        transition={{ default: move, opacity: arrive(0), scale: arrive(0) }}
      />
      <motion.span
        aria-hidden="true"
        className="col-start-1 row-start-1 text-2xl font-medium tracking-[-0.02em] text-ink-muted"
        initial={still ? false : { opacity: 0 }}
        animate={{ opacity: stacked ? 0 : 1 }}
        transition={stacked ? { duration: still ? 0 : 0.2 } : arrive(0.18)}
      >
        <Trans comment="Between the two app icons, as in the page's heading Lymi vs Anki">vs</Trans>
      </motion.span>
      <motion.img
        src="/brand/app-icon.svg"
        alt=""
        width={160}
        height={160}
        draggable={false}
        className={clsx(ICON, "relative")}
        initial={still ? false : { opacity: 0, scale: 0.92, ...POSE.apart.lymi }}
        animate={{ opacity: 1, scale: 1, ...pose.lymi }}
        transition={{ default: move, opacity: arrive(0.32), scale: arrive(0.32) }}
      />
    </figure>
  );
}
