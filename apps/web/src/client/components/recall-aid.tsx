import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { FieldSource, ReviewAid } from "@lymi/core";
import { clsx } from "clsx";
import { Anchor, type LucideIcon } from "lucide-react";
import { motion, useReducedMotionConfig } from "motion/react";
import { type MouseEvent, useState } from "react";
import type { Card } from "../lib/api";
import { EASE_OUT } from "../lib/ease";
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

/**
 * How each step is offered before the reveal and after it, what a screen reader hears before its
 * text, and its icon.
 */
const STEPS: Record<
  ReviewAid,
  { take: MessageDescriptor; show: MessageDescriptor; name: MessageDescriptor; icon: LucideIcon }
> = {
  hook: {
    take: msg`Peek at your hook`,
    show: msg`Show hook`,
    name: msg`Memory hook:`,
    icon: Anchor,
  },
};

/** The key that takes the next step, matched by its place so every keyboard layout reaches it. */
export const AID_KEY = { code: "KeyH", label: "H" } as const;

export function aidSteps(card: Pick<Card, "hook" | "hookSource">): AidStep[] {
  return card.hook ? [{ aid: "hook", text: card.hook, source: card.hookSource }] : [];
}

/** The aid a grade records: the furthest step taken. */
export const aidTaken = (steps: readonly AidStep[], taken: number): ReviewAid | undefined =>
  steps[Math.min(taken, steps.length) - 1]?.aid;

interface NextProps {
  steps: readonly AidStep[];
  taken: number;
  onTake: (event: MouseEvent<HTMLButtonElement>) => void;
}

/**
 * The pill at the foot of an unrevealed card that takes the next step; the card stacks it over
 * its reveal button, so a tap on it never turns the card. Once every step is taken it stays as
 * an invisible, inert placeholder, so the cue keeps its room and glides rather than jumps.
 */
export function RecallAidNext({ steps, taken, onTake }: NextProps) {
  const { i18n } = useLingui();
  const spent = taken >= steps.length;
  const step = steps[Math.min(taken, steps.length - 1)];
  if (!step) return null;
  const { take, icon: Icon } = STEPS[step.aid];
  return (
    <div
      className={clsx("flex justify-center pt-3", spent && "invisible")}
      inert={spent}
      aria-hidden={spent || undefined}
    >
      <Button kbd={AID_KEY.label} data-aid="" onClick={onTake}>
        <Icon data-icon="inline-start" aria-hidden="true" />
        {i18n._(take)}
      </Button>
    </div>
  );
}

interface ShowProps {
  steps: readonly AidStep[];
  /** Arrive with the answer's lines. Off after a key, which never animates the interface. */
  animate: boolean;
  onShow: (event: MouseEvent<HTMLButtonElement>) => void;
}

/**
 * After a reveal without a peek, the quiet control in the aid's own place under the cue that shows
 * it. Seeing it once the answer is out is not help with recall, so it records nothing. It cannot be
 * pressed until it has arrived, so the tap that revealed the card, doubled, never lands on it.
 */
export function RecallAidShow({ steps, animate, onShow }: ShowProps) {
  const { i18n } = useLingui();
  const reduce = useReducedMotionConfig();
  const [ready, setReady] = useState(!animate);
  const step = steps[0];
  if (!step) return null;
  const { show, icon: Icon } = STEPS[step.aid];
  return (
    <motion.div
      className={clsx("flex", !ready && "pointer-events-none")}
      inert={!ready}
      initial={animate ? (reduce ? { opacity: 0 } : { opacity: 0, y: 10 }) : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0.2 : 0.26, delay: 0.12, ease: EASE_OUT }}
      onAnimationComplete={() => setReady(true)}
    >
      {/* Pulled to the start edge, so its anchor stands where the hook's will. */}
      <Button
        variant="ghost"
        size="sm"
        kbd={AID_KEY.label}
        data-aid=""
        className="-ms-2.5"
        onClick={onShow}
      >
        <Icon data-icon="inline-start" aria-hidden="true" />
        {i18n._(show)}
      </Button>
    </motion.div>
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
  const arrive = !animate
    ? false
    : reduce
      ? { opacity: 0 }
      : { opacity: 0, y: 4, filter: "blur(4px)" };
  return (
    <div className="grid gap-2">
      {steps.slice(0, taken).map((step) => (
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
