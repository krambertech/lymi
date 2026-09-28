import { Trans } from "@lingui/react/macro";
import {
  ArrowLeftRight,
  ChevronRight,
  CircleHelp,
  type LucideIcon,
  Pencil,
  Split,
} from "lucide-react";
import { motion, useReducedMotionConfig } from "motion/react";
import type { ReactNode } from "react";
import type { ReviewOffer } from "../lib/api";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Each cause's mark, shared by the offer and its sheet. */
export const FIX_ICONS: Record<ReviewOffer["cause"], LucideIcon> = {
  confused_pair: ArrowLeftRight,
  two_things: Split,
  several_answers: CircleHelp,
  // A hook's offer arrives with #405; until then review never shows one.
  no_anchor: Pencil,
  unclear: Pencil,
};

/** The line that names the cause, and the one that names the fix. */
function offerLines(offer: ReviewOffer): [ReactNode, ReactNode] {
  switch (offer.cause) {
    case "confused_pair": {
      const other = offer.other?.term ?? "";
      return [
        <Trans key="t">
          Often mixed up with <span lang={offer.other?.language ?? undefined}>{other}</span>
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

/** Where the panel sits under the plate's own padding, so its contents line up with the card's. */
export const FIX_OFFER_HEIGHT = 72;

interface Props {
  offer: ReviewOffer;
  /** Seconds after the reveal, so it arrives once the answer has settled. */
  delay: number;
  onOpen: () => void;
  /** It has become visible, which is when review counts it as offered. */
  onShown: () => void;
}

/**
 * The fix a diagnosis drafted, at the foot of a revealed card. One quiet button: the cause, the
 * fix, and a way into it. It asks for nothing, so it is never amber and never in the way of a grade.
 */
export function FixOffer({ offer, delay, onOpen, onShown }: Props) {
  const reduce = useReducedMotionConfig();
  const Icon = FIX_ICONS[offer.cause];
  const [title, line] = offerLines(offer);
  const rise = reduce ? {} : { y: 6 };
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, ...rise }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.2, ease: EASE_OUT }}
      onAnimationComplete={onShown}
      className="group flex w-full min-w-0 items-center gap-3 rounded-md bg-plate-2 px-3 py-3 text-start transition-[background-color,scale] duration-150 ease-out hoverable:hover:bg-hover active:scale-[0.99] motion-reduce:active:scale-100 @3xl:px-4"
    >
      <motion.span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-full bg-plate text-text-2"
        initial={reduce ? false : { scale: 0.85 }}
        animate={{ scale: 1 }}
        transition={{ delay: delay + 0.04, duration: 0.24, ease: EASE_OUT }}
      >
        <Icon className="size-[18px]" strokeWidth={1.75} />
      </motion.span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="truncate text-md font-medium text-text">{title}</span>
        <span className="truncate text-sm text-muted">{line}</span>
      </span>
      <ChevronRight
        className="size-4 shrink-0 text-faint transition-colors duration-150 hoverable:group-hover:text-muted rtl:-scale-x-100"
        aria-hidden="true"
      />
    </motion.button>
  );
}
