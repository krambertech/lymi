import { ExtensionStorage } from "@bacons/apple-targets";
import { plural, t } from "@lingui/core/macro";
import Constants from "expo-constants";
import type { Snapshot } from "../widgets/next-day";

/** The app group the widgets already share, which expo-widgets names after the app. */
const storage = new ExtensionStorage(`group.${Constants.expoConfig?.ios?.bundleIdentifier}`);

/** What Review's control reads and the due intent says for one day. */
interface Line {
  due: number;
  value: string;
  spoken: string;
}

/**
 * What the controls and the intents show, formatted here because they cannot run Lingui:
 * `targets/controls/_shared/State.swift` reads it, and keeps English until the app has run.
 */
interface ControlsState {
  v: 1;
  add: string;
  review: string;
  now: Line;
  /** The next day's line, from its first moment, so the control rolls over without the app. */
  next?: Line & { at: number };
}

function line(s: Snapshot): Line {
  const { due, reviewed, goal } = s;
  if (!s.signedIn) {
    return { due: 0, value: "", spoken: t`Open Lymi and sign in to see what’s due.` };
  }
  const met = goal > 0 && s.left === 0;
  if (met) {
    return {
      due,
      value: t`Goal met`,
      spoken:
        due === 0
          ? t`Nothing is due, and today’s goal is met.`
          : plural(due, {
              one: "# card is due. Today’s goal is met.",
              other: "# cards are due. Today’s goal is met.",
            }),
    };
  }
  if (goal > 0) {
    return {
      due,
      value: plural(due, {
        one: `# due · ${reviewed}/${goal}`,
        other: `# due · ${reviewed}/${goal}`,
      }),
      spoken: plural(due, {
        one: `# card is due. ${reviewed} of ${goal} reviewed today.`,
        other: `# cards are due. ${reviewed} of ${goal} reviewed today.`,
      }),
    };
  }
  return {
    due,
    value: plural(due, { one: "# due", other: "# due" }),
    spoken:
      due === 0
        ? t`Nothing is due.`
        : plural(due, { one: "# card is due.", other: "# cards are due." }),
  };
}

/** Writes what the controls show and asks iOS to redraw them. */
export function sendControls(now: Snapshot, next?: { at: Date; snapshot: Snapshot }) {
  const state: ControlsState = {
    v: 1,
    add: t`Add a word`,
    review: t`Review`,
    now: line(now),
    ...(next ? { next: { ...line(next.snapshot), at: next.at.getTime() } } : {}),
  };
  try {
    storage.set("controls", JSON.stringify(state));
    ExtensionStorage.reloadControls();
  } catch (e) {
    console.warn("controls", e);
  }
}
