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

/** A mode a newer Worker added still gets a name, rather than nothing, in a release that predates it. ADR 0032. */
export const modeLabel = (mode: ReviewMode): MessageDescriptor =>
  MODE_LABELS[modeKey(mode)] ?? msg`Another way`;
