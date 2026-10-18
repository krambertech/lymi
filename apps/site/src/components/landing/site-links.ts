import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import {
  BadgeCheck,
  ClipboardCheck,
  Languages,
  type LucideIcon,
  MessagesSquare,
  Presentation,
  Stethoscope,
} from "lucide-react";
import type { LocalizedPage } from "../../lib/routes";

export const SOURCE_CODE_URL = "https://github.com/krambertech/lymi";

export interface UseCaseLink {
  page: LocalizedPage;
  label: MessageDescriptor;
  blurb?: MessageDescriptor;
  /** The menu's mark: an icon on a tray in one of Explore's hues, never violet. */
  icon?: LucideIcon;
  hue?: number;
  /** A narrow page written for search, linked from the footer and left out of the menus. */
  footerOnly?: true;
}

/** Every use case page in order. The header menu, the phone menu and the footer all read this list. */
export const USE_CASE_LINKS: UseCaseLink[] = [
  {
    page: "languages",
    label: msg`Language learning`,
    blurb: msg`Words and phrases from lessons, tutors and reading.`,
    icon: Languages,
    hue: 4,
  },
  { page: "estonian", label: msg`Estonian`, footerOnly: true },
  { page: "japanese", label: msg`Japanese`, footerOnly: true },
  {
    page: "assistants",
    label: msg`AI assistants`,
    blurb: msg`Send your notes to Claude, ChatGPT, Gemini or Grok and get cards.`,
    icon: MessagesSquare,
    hue: 2,
  },
  {
    page: "teachers",
    label: msg`Teachers`,
    blurb: msg`Build a course in sections and share it with your class.`,
    icon: Presentation,
    hue: 0,
  },
  {
    page: "exams",
    label: msg`Exam prep`,
    blurb: msg`Citizenship, language and driving tests, each with ready decks.`,
    icon: ClipboardCheck,
    hue: 3,
  },
  { page: "einbuergerungstest", label: msg`Einbürgerungstest`, footerOnly: true },
  {
    page: "medicine",
    label: msg`Medical students`,
    blurb: msg`Anatomy, drugs and lab values, with your Anki decks brought along.`,
    icon: Stethoscope,
    hue: 7,
  },
  {
    page: "certifications",
    label: msg`Certifications`,
    blurb: msg`Turn a study guide into cards for cloud, security or finance exams.`,
    icon: BadgeCheck,
    hue: 1,
  },
  { page: "tutorLessons", label: msg`Tutor lessons`, footerOnly: true },
  { page: "notesToFlashcards", label: msg`Notes and PDFs`, footerOnly: true },
];

export const MENU_USE_CASE_LINKS = USE_CASE_LINKS.filter((link) => !link.footerOnly);

export function isUseCasePage(page: LocalizedPage | undefined): boolean {
  return MENU_USE_CASE_LINKS.some((link) => link.page === page);
}
