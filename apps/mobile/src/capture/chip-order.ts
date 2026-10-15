import { useState } from "react";
import { captureStore } from "../data/kept";
import type { FormField } from "./form";

/** A chip over the keyboard that adds a field or opens a choice. */
export type ChipKey = FormField | "section" | "picture" | "modes" | "tags";

const USED_KEY = "chips-used";

function readUsed(): Partial<Record<ChipKey, number>> {
  try {
    return JSON.parse(captureStore.getString(USED_KEY) ?? "{}");
  } catch {
    return {};
  }
}

/** Remembers when a chip was last used, on this phone. */
export function markChipUsed(key: ChipKey) {
  captureStore.set(USED_KEY, JSON.stringify({ ...readUsed(), [key]: Date.now() }));
}

/** Puts the chips used last first, read once as the form opens so none moves under the finger. */
export function useRecentFirst() {
  const [used] = useState(readUsed);
  return <T extends { key: ChipKey }>(chips: T[]) =>
    [...chips].sort((a, b) => (used[b.key] ?? 0) - (used[a.key] ?? 0));
}
