import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { type Palette, usePalette } from "../theme/palette";
import { Icon, type IconName } from "./icons";

export type StateKey = "new" | "learning" | "known";

/** Each card state's one colour and one icon, everywhere a state shows. colour.md "Card states". */
export const stateMarks: Record<
  StateKey,
  { label: MessageDescriptor; groupLabel: MessageDescriptor; icon: IconName; tint: keyof Palette }
> = {
  new: {
    label: msg`New`,
    groupLabel: msg({ message: "New", context: "cards in this state" }),
    icon: "new",
    tint: "state-new",
  },
  learning: {
    label: msg`Learning`,
    groupLabel: msg({ message: "Learning", context: "cards in this state" }),
    icon: "learning",
    tint: "state-learning",
  },
  known: {
    label: msg`Known`,
    groupLabel: msg({ message: "Known", context: "cards in this state" }),
    icon: "known",
    tint: "state-known",
  },
};

/** FSRS 0 New, 1 Learning, 2 Review, 3 Relearning, as the three states a learner sees. */
export function stateKey(state: number | null | undefined): StateKey {
  if (state === 2) return "known";
  if (state === 1 || state === 3) return "learning";
  return "new";
}

/** A state's icon in its colour. `forgot` is the Forgot grade's mark, red wherever it shows. */
export function StateIcon({ state, size = 14 }: { state: StateKey | "forgot"; size?: number }) {
  const p = usePalette();
  const { icon, tint } =
    state === "forgot"
      ? { icon: "forgot" as const, tint: "grade-forgot" as const }
      : stateMarks[state];
  return <Icon name={icon} size={size} colour={p[tint]} strokeWidth={2.25} />;
}
