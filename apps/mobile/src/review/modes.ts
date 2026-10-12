import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { modeKey, type ReviewMode, type ReviewModeKey } from "@lymi/core";

/** What each review mode is called wherever the learner sees one, as on the web (ADR 0014). */
const MODE_LABELS: Record<ReviewModeKey, MessageDescriptor> = {
  term_to_meaning: msg`Recognition`,
  meaning_to_term: msg`Production`,
  image_to_term: msg`Picture → term`,
  image_to_meaning: msg`Picture → meaning`,
};

export const modeLabel = (mode: ReviewMode) => MODE_LABELS[modeKey(mode)];
