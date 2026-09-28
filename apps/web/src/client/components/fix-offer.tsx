import { Trans } from "@lingui/react/macro";
import { cn } from "cn";
import {
  ArrowLeftRight,
  ChevronRight,
  CircleHelp,
  type LucideIcon,
  Pencil,
  Split,
} from "lucide-react";
import { motion, useReducedMotionConfig } from "motion/react";
import { type ReactNode, useState } from "react";
import type { ReviewOffer } from "../lib/api";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const ICONS: Record<ReviewOffer["cause"], LucideIcon> = {
  confused_pair: ArrowLeftRight,
  two_things: Split,
  several_answers: CircleHelp,
  // Review offers no hook yet (#405); the entry only completes the record.
  no_anchor: Pencil,
  unclear: Pencil,
};

/** The line that names the cause, and the one that names the fix. */
function offerLines(offer: ReviewOffer): [ReactNode, ReactNode] {
  switch (offer.cause) {
    case "confused_pair": {
      const other = offer.other.term;
      return [
        <Trans key="t">
          Often mixed up with <span lang={offer.other.language ?? undefined}>{other}</span>
        </Trans>,
        <Trans key="l">See the difference</Trans>,
      ];
    }
    case "two_things":
      return [
        <Trans key="t">Two things on one card</Trans>,
        <Trans key="l">Split into 2 cards</Trans>,
      ];
    case "several_answers":
      return [
        <Trans key="t">More than one right answer</Trans>,
        <Trans key="l">Make the question clearer</Trans>,
      ];
    default:
      return [
        <Trans key="t">This one keeps slipping</Trans>,
        <Trans key="l">Try asking it another way</Trans>,
      ];
  }
}

/** The panel's box, shared by the live offer and the hidden copy that measures its room. */
export const FIX_OFFER_BOX =
  "flex w-full min-w-0 items-center gap-3 rounded-md bg-plate-2 px-3 py-3 text-start @3xl:px-4";

/** What the panel says, without its motion: the live offer and the measuring copy both hold it. */
export function FixOfferFace({ offer, icon }: { offer: ReviewOffer; icon?: ReactNode }) {
  const Icon = ICONS[offer.cause];
  const [title, line] = offerLines(offer);
  return (
    <>
      {icon ?? (
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-plate text-text-2"
        >
          <Icon className="size-[18px]" strokeWidth={1.75} />
        </span>
      )}
      {/* Two lines for the title, so the other term of a pair is never cut away. */}
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="line-clamp-2 text-md font-medium text-text">{title}</span>
        <span className="truncate text-sm text-muted">{line}</span>
      </span>
      <ChevronRight
        className="size-4 shrink-0 text-faint transition-colors duration-150 hoverable:group-hover:text-muted rtl:-scale-x-100"
        aria-hidden="true"
      />
    </>
  );
}

export interface FixOfferProps {
  offer: ReviewOffer;
  /** Seconds after the reveal, so it arrives once the answer has settled. */
  delay: number;
  /** Rise into place. Off after a reveal from the keyboard, which never animates the interface. */
  animate: boolean;
  /** Left for later: it fades and its room stays until the grade, so the answer never moves. */
  parked: boolean;
  onOpen: () => void;
  /** It has become visible, which is when review counts it as offered. */
  onShown: () => void;
}

/**
 * The fix a diagnosis drafted, at the foot of a revealed card. One quiet button: the cause, the
 * fix, and a way into it. It asks for nothing, so it is never amber and never in the way of a grade,
 * and it cannot be pressed or focused until it can be seen.
 */
export function FixOffer({ offer, delay, animate, parked, onOpen, onShown }: FixOfferProps) {
  const reduce = useReducedMotionConfig();
  const [ready, setReady] = useState(false);
  const travel = animate && !reduce;
  const Icon = ICONS[offer.cause];
  const idle = !ready || parked;
  return (
    <motion.button
      type="button"
      aria-haspopup="dialog"
      inert={idle}
      onClick={onOpen}
      initial={{ opacity: 0, y: travel ? 6 : 0 }}
      animate={parked ? { opacity: 0, y: 0 } : { opacity: 1, y: 0 }}
      transition={
        parked
          ? { duration: reduce ? 0 : 0.14, ease: EASE_OUT }
          : { delay, duration: animate ? 0.2 : 0, ease: EASE_OUT }
      }
      onAnimationComplete={() => {
        if (parked || ready) return;
        setReady(true);
        onShown();
      }}
      className={cn(
        FIX_OFFER_BOX,
        "group transition-[background-color,scale] duration-150 ease-out hoverable:hover:bg-hover active:scale-[0.99] motion-reduce:active:scale-100 focus-visible:-outline-offset-2",
        idle && "pointer-events-none",
      )}
    >
      <FixOfferFace
        offer={offer}
        icon={
          <motion.span
            aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-plate text-text-2"
            initial={{ scale: travel ? 0.85 : 1 }}
            animate={{ scale: 1 }}
            transition={{ delay: delay + 0.04, duration: travel ? 0.24 : 0, ease: EASE_OUT }}
          >
            <Icon className="size-[18px]" strokeWidth={1.75} />
          </motion.span>
        }
      />
    </motion.button>
  );
}
