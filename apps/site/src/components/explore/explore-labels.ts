import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { PublicationTag } from "@lymi/core";
import { UNCATEGORISED } from "../../lib/explore";

/** A heading per shelf. A category with no entry here falls back to the catch-all heading. */
const CATEGORY_LABELS: Record<string, MessageDescriptor> = {
  languages: msg`Languages`,
  exams: msg`Exams and tests`,
  driving: msg`Driving`,
  technology: msg`Technology`,
  science: msg`Science`,
  geography: msg`Geography`,
  work: msg`Work and study`,
};
const UNCATEGORISED_LABEL = msg`More decks`;

export function shelfLabel(i18n: I18n, key: string): string {
  const label = key === UNCATEGORISED ? UNCATEGORISED_LABEL : CATEGORY_LABELS[key];
  return label ? i18n._(label) : i18n._(UNCATEGORISED_LABEL);
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
