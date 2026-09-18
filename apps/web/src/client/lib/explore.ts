import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { UNCATEGORISED } from "@lymi/core/catalog";

/**
 * A heading per shelf, matching the site's. The two apps keep their own copy because these are
 * translated strings and each app extracts its own catalogue; the shelves themselves are in core.
 */
const CATEGORY_LABELS: Record<string, MessageDescriptor> = {
  languages: msg`Languages`,
  exams: msg`Exams and tests`,
  driving: msg`Driving`,
  science: msg`Science`,
  geography: msg`Geography`,
  work: msg`Work and study`,
};
const UNCATEGORISED_LABEL = msg`More decks`;

export function shelfLabel(i18n: I18n, key: string): string {
  const label = key === UNCATEGORISED ? UNCATEGORISED_LABEL : CATEGORY_LABELS[key];
  return label ? i18n._(label) : i18n._(UNCATEGORISED_LABEL);
}
