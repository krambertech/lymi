import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { UNCATEGORISED } from "../../lib/explore";

/** A heading per shelf. A category with no entry here falls back to the catch-all heading. */
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
