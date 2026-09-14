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

export type StateKey = "new" | "learning" | "known";

/** Each card state's one colour and one icon, everywhere a state shows; DESIGN.md, "Colour". */
export const stateMarks = {
  new: { Icon: CircleDashed, bg: "bg-state-new", text: "text-state-new" },
  learning: { Icon: CircleHalf, bg: "bg-state-learning", text: "text-state-learning" },
  known: { Icon: CircleCheck, bg: "bg-state-known", text: "text-state-known" },
} as const satisfies Record<StateKey, { Icon: LucideIcon; bg: string; text: string }>;

/** FSRS 0 New, 1 Learning, 2 Review, 3 Relearning, as the three states a learner sees. */
export function stateKey(state: number | null | undefined): StateKey {
  if (state === 2) return "known";
  if (state === 1 || state === 3) return "learning";
  return "new";
}

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
