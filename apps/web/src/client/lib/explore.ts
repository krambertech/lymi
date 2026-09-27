import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { PublicationTag } from "@lymi/core";
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

/**
 * A label per tag on a published deck. Exam names are proper names and read the same in every
 * language; the catalogue carries them anyway so a translator can add a word around one.
 */
const TAG_LABELS: Record<PublicationTag, MessageDescriptor> = {
  "core-words": msg({ message: "Core vocabulary", context: "deck tag" }),
  conversation: msg({ message: "Conversation", context: "deck tag" }),
  travel: msg({ message: "Travel", context: "deck tag" }),
  alphabet: msg({ message: "Alphabet", context: "deck tag" }),
  grammar: msg({ message: "Grammar", context: "deck tag" }),
  beginner: msg({ message: "For beginners", context: "deck tag" }),
  "exam-goethe-a1": msg({ message: "Goethe-Zertifikat A1", context: "deck tag" }),
  "exam-hsk-1": msg({ message: "HSK 1", context: "deck tag" }),
  "exam-topik-1": msg({ message: "TOPIK I", context: "deck tag" }),
  "exam-jlpt-n5": msg({ message: "JLPT N5", context: "deck tag" }),
  "exam-leben-in-deutschland": msg({ message: "Leben in Deutschland test", context: "deck tag" }),
  "exam-us-civics": msg({ message: "US civics test", context: "deck tag" }),
};

export function tagLabel(i18n: I18n, key: PublicationTag): string {
  return i18n._(TAG_LABELS[key]);
}
