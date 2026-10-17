import { AndroidHaptics, performAndroidHapticsAsync } from "expo-haptics";
import type { HapticEvent } from "./index";

export type { HapticEvent } from "./index";

// Android has no Core Haptics, so a pattern plays as the system's own effects on a timer: a faint
// tick for a tap, and the confirm effect for a held pulse.
let timers: ReturnType<typeof setTimeout>[] = [];

export function playHaptics(events: HapticEvent[]) {
  stopHaptics();
  timers = events.map((e) =>
    setTimeout(
      () =>
        void performAndroidHapticsAsync(
          e.duration ? AndroidHaptics.Confirm : AndroidHaptics.Segment_Frequent_Tick,
        ).catch(() => undefined),
      e.time * 1000,
    ),
  );
  return Promise.resolve();
}

export function stopHaptics() {
  for (const t of timers) clearTimeout(t);
  timers = [];
  return Promise.resolve();
}
