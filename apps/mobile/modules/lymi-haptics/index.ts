import { requireOptionalNativeModule } from "expo";

/** A tap at `time` seconds into the pattern, or a held pulse when it has a `duration`. */
export interface HapticEvent {
  time: number;
  intensity: number;
  sharpness: number;
  duration?: number;
}

const native = requireOptionalNativeModule<{
  play(events: HapticEvent[]): Promise<void>;
  stop(): Promise<void>;
}>("LymiHaptics");

/** Plays a pattern through Core Haptics; a build without the module, or a phone without haptics, stays still. */
export function playHaptics(events: HapticEvent[]) {
  return native?.play(events).catch(() => undefined);
}

export function stopHaptics() {
  return native?.stop().catch(() => undefined);
}
