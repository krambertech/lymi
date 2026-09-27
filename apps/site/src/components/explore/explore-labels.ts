import type { I18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { languageName } from "../../lib/deck-page";
import type { Shelf } from "../../lib/explore";
import { subjectLabel } from "../../lib/subjects";

const UNCATEGORISED_LABEL = msg`More decks`;

/** A language shelf is headed by the language's name in the reader's language, a subject by its own. */
export function shelfLabel(i18n: I18n, shelf: Pick<Shelf, "key" | "language">): string {
  if (shelf.language) {
    return languageName(shelf.language, i18n.locale, { label: true }) ?? shelf.language;
  }
  return subjectLabel(i18n, shelf.key) ?? i18n._(UNCATEGORISED_LABEL);
}
