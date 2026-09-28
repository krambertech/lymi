import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { FieldSource, ReviewAid } from "@lymi/core";
import { clsx } from "clsx";
import { Anchor, type LucideIcon } from "lucide-react";
import { motion, useReducedMotionConfig } from "motion/react";
import type { MouseEvent } from "react";
import type { Card } from "../lib/api";
import { Button } from "./button";
import { SourceChip } from "./chip";

/**
 * One step of help before the reveal. Steps come in the order review offers them, so a later
 * aid such as a hint is one more entry after the hook, taken with the same control and key.
 */
export interface AidStep {
  aid: ReviewAid;
  text: string;
  source: FieldSource | null;
}

/** How each step is offered, what a screen reader hears before its text, and its icon. */
const STEPS: Record<
  ReviewAid,
  { take: MessageDescriptor; name: MessageDescriptor; icon: LucideIcon }
> = {
  hook: { take: msg`Peek at your hook`, name: msg`Memory hook:`, icon: Anchor },
};

/** The key that takes the next step, whichever step that is. */
export const AID_KEY = "H";

/** The help a card has to offer before its reveal, in order. */
export function aidSteps(card: Pick<Card, "hook" | "hookSource">): AidStep[] {
  return card.hook ? [{ aid: "hook", text: card.hook, source: card.hookSource }] : [];
}

/** The aid a grade records: the furthest step taken, or none. */
export function aidTaken(steps: readonly AidStep[], taken: number): ReviewAid | undefined {
  return taken > 0 ? steps[Math.min(taken, steps.length) - 1]?.aid : undefined;
}

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

interface NextProps {
  steps: readonly AidStep[];
  taken: number;
  onTake: (event: MouseEvent<HTMLButtonElement>) => void;
}

/**
 * The quiet pill at the foot of an unrevealed card that takes the next step; the card stacks it
 * over its reveal button, so a tap on it never turns the card. It goes the moment its step is
 * taken, because what the step shows is the change to watch, and stays gone once nothing is left.
 */
export function RecallAidNext({ steps, taken, onTake }: NextProps) {
  const { i18n } = useLingui();
  const next = steps[taken];
  if (!next) return null;
  const { take, icon: Icon } = STEPS[next.aid];
  return (
    <div className="flex justify-center pt-3">
      <Button
        size="sm"
        kbd={AID_KEY}
        onClick={onTake}
        className="rounded-full text-text-2 hoverable:hover:text-text"
      >
        <Icon data-icon="inline-start" aria-hidden="true" className="text-muted" />
        {i18n._(take)}
      </Button>
    </div>
  );
}

interface ShownProps {
  steps: readonly AidStep[];
  taken: number;
  /** Focus in as it arrives. Off after a key, which never animates the interface. */
  animate: boolean;
}

/**
 * What the steps taken so far show under the cue, each arriving in focus from a slight blur with
 * a 4 px rise. Under reduced motion it only fades in.
 */
export function RecallAidShown({ steps, taken, animate }: ShownProps) {
  const reduce = useReducedMotionConfig();
  const shown = steps.slice(0, taken);
  if (shown.length === 0) return null;
  const arrive = !animate
    ? false
    : reduce
      ? { opacity: 0 }
      : { opacity: 0, y: 4, filter: "blur(4px)" };
  return (
    <div className="grid gap-2">
      {shown.map((step) => (
        // Blur settles to `none` rather than `blur(0)`, which Safari rasterises soft.
        <motion.div
          key={step.aid}
          initial={arrive}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
          transition={{ duration: reduce ? 0.2 : 0.36, ease: EASE_OUT }}
        >
          <AidLine step={step} />
        </motion.div>
      ))}
    </div>
  );
}

/** One aid as text: its icon, what it says, and the AI badge while the AI's words are unchanged. */
export function AidLine({ step, size = "md" }: { step: AidStep; size?: "sm" | "md" | undefined }) {
  const { i18n } = useLingui();
  const { name, icon: Icon } = STEPS[step.aid];
  return (
    <p
      className={clsx(
        "flex items-start gap-2 text-text-2",
        size === "md" ? "text-md leading-snug" : "text-sm leading-normal",
      )}
    >
      <Icon
        className={clsx(
          "shrink-0 text-muted",
          size === "md" ? "mt-[3px] size-4" : "mt-[2px] size-3.5",
        )}
        aria-hidden="true"
      />
      <span className="min-w-0 [overflow-wrap:anywhere]">
        <span className="sr-only">{i18n._(name)} </span>
        {step.text}
        {step.source === "ai" && (
          <span className="ms-2 inline-flex -translate-y-px align-middle">
            <SourceChip source="ai" field="hook" size="xs" />
          </span>
        )}
      </span>
    </p>
  );
}
