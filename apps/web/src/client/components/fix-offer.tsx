import type { I18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { headword } from "@lymi/core";
import { cn } from "cn";
import {
  Anchor,
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
import { EASE_OUT } from "../lib/ease";

const ICONS: Record<ReviewOffer["cause"], LucideIcon> = {
  confused_pair: ArrowLeftRight,
  two_things: Split,
  several_answers: CircleHelp,
  no_anchor: Anchor,
  unclear: Pencil,
};

/** The line that names the cause, as plain text for the announcement that the fix is ready. */
export function offerTitle(i18n: I18n, offer: ReviewOffer): string {
  switch (offer.cause) {
    case "confused_pair": {
      const other = headword(offer.other.term);
      return i18n._(msg`Often mixed up with ${other}`);
    }
    case "two_things":
      return i18n._(msg`Two things on one card`);
    case "several_answers":
      return i18n._(msg`More than one right answer`);
    case "no_anchor":
      return i18n._(msg`Try a memory hook`);
    default:
      return i18n._(msg`Often forgotten`);
  }
}

/** The line that names the fix. */
function offerLine(offer: ReviewOffer): ReactNode {
  switch (offer.cause) {
    case "confused_pair":
      return <Trans>See the difference</Trans>;
    case "two_things":
      return <Trans>Split into 2 cards</Trans>;
    case "several_answers":
      return <Trans>Make the question clearer</Trans>;
    case "no_anchor":
      return <Trans>A short phrase that helps you remember it</Trans>;
    default:
      return <Trans>Try asking it another way</Trans>;
  }
}

/** The panel's box, shared by the live offer and the hidden copy that measures its room. */
export const FIX_OFFER_BOX =
  "flex w-full min-w-0 items-center gap-3 rounded-md bg-plate-2 px-3 py-3 text-start @3xl:px-4";

/** What the panel says, without its motion: the live offer and the measuring copy both hold it. */
export function FixOfferFace({ offer, icon }: { offer: ReviewOffer; icon?: ReactNode }) {
  const { i18n } = useLingui();
  const Icon = ICONS[offer.cause];
  // The other term of a pair is in its own language, which the plain title cannot mark.
  const pair = offer.cause === "confused_pair" ? offer.other : null;
  const other = pair ? headword(pair.term) : "";
  const title = pair ? (
    <Trans>
      Often mixed up with <span lang={pair.language ?? undefined}>{other}</span>
    </Trans>
  ) : (
    offerTitle(i18n, offer)
  );
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
      {/* Two lines each, so neither the other term of a pair nor the fix is cut away on a phone. */}
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="line-clamp-2 text-md font-medium text-text">{title}</span>
        <span className="line-clamp-2 text-sm text-muted">{offerLine(offer)}</span>
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
