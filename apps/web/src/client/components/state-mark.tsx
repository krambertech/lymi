import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { StateKey } from "@lymi/client/deck-list";
import { clsx } from "clsx";
import {
  CircleCheck,
  CircleDashed,
  createLucideIcon,
  type LucideIcon,
  RotateCcw,
} from "lucide-react";

/** Lucide's `contrast` with its half filled, so it still reads as half at 12 px. */
const CircleHalf = createLucideIcon("circle-half", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "circle" }],
  ["path", { d: "M12 18a6 6 0 0 0 0-12v12z", fill: "currentColor", key: "half" }],
]);

// One mapping from FSRS states for the web and the phone.
export { type StateKey, stateKey } from "@lymi/client/deck-list";

/**
 * Each card state's one colour and one icon, everywhere a state shows; docs/design/system/colour.md. `label`
 * names one card's state and `groupLabel` a set of cards in it, which Ukrainian and Russian inflect.
 */
export const stateMarks = {
  new: {
    label: msg`New`,
    groupLabel: msg({ message: "New", context: "cards in this state" }),
    Icon: CircleDashed,
    bg: "bg-state-new",
    text: "text-state-new",
  },
  learning: {
    label: msg`Learning`,
    groupLabel: msg({ message: "Learning", context: "cards in this state" }),
    Icon: CircleHalf,
    bg: "bg-state-learning",
    text: "text-state-learning",
  },
  known: {
    label: msg`Known`,
    groupLabel: msg({ message: "Known", context: "cards in this state" }),
    Icon: CircleCheck,
    bg: "bg-state-known",
    text: "text-state-known",
  },
} as const satisfies Record<
  StateKey,
  {
    label: MessageDescriptor;
    groupLabel: MessageDescriptor;
    Icon: LucideIcon;
    bg: string;
    text: string;
  }
>;

/** A state's icon in its colour. `forgot` is the Forgot grade's mark, which is red wherever it shows. */
export function StateIcon({
  state,
  className,
}: {
  state: StateKey | "forgot";
  className?: string | undefined;
}) {
  const { Icon, text } =
    state === "forgot" ? { Icon: RotateCcw, text: "text-grade-forgot" } : stateMarks[state];
  return (
    <Icon className={clsx("shrink-0", text, className)} strokeWidth={2.25} aria-hidden="true" />
  );
}
