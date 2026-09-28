import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { subjectOf } from "@lymi/core/catalog";
import { pageI18n } from "./i18n";

/** A name per subject shelf. A subject with no entry here reads as having none. */
const SUBJECT_LABELS: Record<string, MessageDescriptor> = {
  geography: msg`Geography`,
  science: msg`Science`,
  nature: msg`Nature`,
  arts: msg`Arts`,
  driving: msg`Driving`,
  citizenship: msg`Citizenship`,
  technology: msg`Technology`,
  work: msg`Work and study`,
};

export function subjectLabel(i18n: I18n, subject: string | null): string | null {
  const label = subject ? SUBJECT_LABELS[subject] : undefined;
  return label ? i18n._(label) : null;
}

/** The subject a deck sits under, named in the reader's language, or null for a language deck. */
export function deckSubject(i18n: I18n, deck: { category: string | null }): string | null {
  return subjectLabel(i18n, subjectOf(deck));
}

/** The subject in English, for structured data, which names languages in English too. */
export function deckSubjectInEnglish(deck: { category: string | null }): string | null {
  return deckSubject(pageI18n("en"), deck);
}
