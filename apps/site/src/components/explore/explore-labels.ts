import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { PublicationTag } from "@lymi/core";
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
  "exam-ccse": msg({ message: "CCSE Spanish nationality test", context: "deck tag" }),
  "exam-czech-citizenship": msg({ message: "Czech citizenship test", context: "deck tag" }),
  "exam-canadian-citizenship": msg({ message: "Canadian citizenship test", context: "deck tag" }),
  "exam-us-dmv": msg({ message: "DMV written test", context: "deck tag" }),
};

export function tagLabel(i18n: I18n, key: PublicationTag): string {
  return i18n._(TAG_LABELS[key]);
}
