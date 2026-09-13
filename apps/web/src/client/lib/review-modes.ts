import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { ReviewMode, ReviewModeKey } from "@lymi/core";
import { modeKey } from "@lymi/core";

/** What each review mode is called wherever the learner sees one (ADR 0014). */
export const MODE_LABELS: Record<ReviewModeKey, MessageDescriptor> = {
  term_to_meaning: msg`Recognition`,
  meaning_to_term: msg`Production`,
  image_to_term: msg`Picture → term`,
  image_to_meaning: msg`Picture → meaning`,
};

export function modeLabel(mode: ReviewMode): MessageDescriptor {
  return MODE_LABELS[modeKey(mode)];
}

/** A queue item's identity within a session: the card and the mode it is asked in. */
export function itemKey(item: { card: { id: string }; mode: ReviewMode }): string {
  return `${item.card.id}-${modeKey(item.mode)}`;
}
