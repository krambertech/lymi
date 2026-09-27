import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { Shelf } from "@lymi/core/catalog";
import { languageName } from "../components/deck-fields";

/**
 * A heading per subject, matching the site's. The two apps keep their own copy because these are
 * translated strings and each app extracts its own catalogue; the shelves themselves are in core.
 */
const SUBJECT_LABELS: Record<string, MessageDescriptor> = {
  geography: msg`Geography`,
  science: msg`Science`,
  driving: msg`Driving`,
  citizenship: msg`Citizenship`,
  technology: msg`Technology`,
  work: msg`Work and study`,
};
const UNCATEGORISED_LABEL = msg`More decks`;

/** A language shelf is headed by the language's name in the reader's language, a subject by its own. */
export function shelfLabel(i18n: I18n, shelf: Pick<Shelf, "key" | "language">): string {
  if (shelf.language) {
    const name = languageName(shelf.language, i18n.locale);
    // Ukrainian and Russian write a language's name lower-case, which reads wrong as a heading.
    return name.charAt(0).toLocaleUpperCase(i18n.locale) + name.slice(1);
  }
  const label = SUBJECT_LABELS[shelf.key] ?? UNCATEGORISED_LABEL;
  return i18n._(label);
}
