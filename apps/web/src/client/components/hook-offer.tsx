import { Trans } from "@lingui/react/macro";
import { cn } from "cn";
import { Anchor, ChevronRight } from "lucide-react";
import { motion, useReducedMotionConfig } from "motion/react";
import { type ReactNode, useState } from "react";
import { EASE_OUT } from "../lib/ease";

/** The panel's box, shared by the live offer and the hidden copy that measures its room. */
export const HOOK_OFFER_BOX =
  "flex w-full min-w-0 items-center gap-3 rounded-md bg-plate-2 px-3 py-3 text-start @3xl:px-4";

/** What the panel says, without its motion: the live offer and the measuring copy both hold it. */
export function HookOfferFace({ icon }: { icon?: ReactNode }) {
  return (
    <>
      {icon ?? (
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-plate text-text-2"
        >
          <Anchor className="size-[18px]" strokeWidth={1.75} />
        </span>
      )}
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="line-clamp-2 text-md font-medium text-text">
          <Trans>Try a memory hook</Trans>
        </span>
        <span className="line-clamp-2 text-sm text-muted">
          <Trans>A short phrase that helps you remember it</Trans>
        </span>
      </span>
      <ChevronRight
        className="size-4 shrink-0 text-faint transition-colors duration-150 hoverable:group-hover:text-muted rtl:-scale-x-100"
        aria-hidden="true"
      />
    </>
  );
}

export interface HookOfferProps {
  /** Seconds after the reveal, so it arrives once the answer has settled. */
  delay: number;
  /** Rise into place. Off after a reveal from the keyboard, which never animates the interface. */
  animate: boolean;
  /** Left for later: it fades and its room stays until the grade, so the answer never moves. */
  parked: boolean;
  onOpen: () => void;
  /** It has become visible, which is when review announces it. */
  onShown?: (() => void) | undefined;
}

/**
 * The offer to write a hook for an often-forgotten card, at the foot of a revealed card. It asks
 * for nothing, so it is never amber and never in the way of a grade, and it cannot be pressed or
 * focused until it can be seen.
 */
export function HookOffer({ delay, animate, parked, onOpen, onShown }: HookOfferProps) {
  const reduce = useReducedMotionConfig();
  const [ready, setReady] = useState(false);
  const travel = animate && !reduce;
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
        onShown?.();
      }}
      className={cn(
        HOOK_OFFER_BOX,
        "group transition-[background-color,scale] duration-150 ease-out hoverable:hover:bg-hover active:scale-[0.99] motion-reduce:active:scale-100 focus-visible:-outline-offset-2",
        idle && "pointer-events-none",
      )}
    >
      <HookOfferFace
        icon={
          <motion.span
            aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-plate text-text-2"
            initial={{ scale: travel ? 0.85 : 1 }}
            animate={{ scale: 1 }}
            transition={{ delay: delay + 0.04, duration: travel ? 0.24 : 0, ease: EASE_OUT }}
          >
            <Anchor className="size-[18px]" strokeWidth={1.75} />
          </motion.span>
        }
      />
    </motion.button>
  );
}
