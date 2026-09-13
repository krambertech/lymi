import type { ReviewMode } from "@lymi/core";
import { modeKey } from "@lymi/core";

/** A queue item's identity within a session: the card and the mode it is asked in. ADR 0014. */
export function itemKey(item: { card: { id: string }; mode: ReviewMode }): string {
  return `${item.card.id}-${modeKey(item.mode)}`;
}
