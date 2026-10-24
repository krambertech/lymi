import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import {
  BadgeCheck,
  ClipboardCheck,
  FileText,
  Languages,
  type LucideIcon,
  MessagesSquare,
  Presentation,
  Stethoscope,
  Video,
} from "lucide-react";
import { EXAMS, type Exam, examPath } from "../../lib/exams";
import { LANGUAGE_PAGES } from "../../lib/language-pages";
import { type LocalizedPage, localizedPath } from "../../lib/routes";

export interface UseCaseLink {
  page: LocalizedPage;
  label: MessageDescriptor;
  blurb: MessageDescriptor;
  /** The menu's mark: an icon on a tray in one of Explore's hues, never violet. */
  icon: LucideIcon;
  hue: number;
}

/** A page linked by name, from the menu's Popular row or the footer. */
export interface SiteLink {
  label: MessageDescriptor;
  href: (locale: string) => string;
}

interface UseCaseGroup {
  title: MessageDescriptor;
  links: readonly UseCaseLink[];
}

/** The use case pages in two groups. The header menu, the phone menu and the footer all read this list. */
export const USE_CASE_GROUPS: readonly UseCaseGroup[] = [
  {
    title: msg`What you learn`,
    links: [
      {
        page: "languages",
        label: msg`Language learning`,
        blurb: msg`Words and phrases from lessons, tutors and reading.`,
        icon: Languages,
        hue: 4,
      },
      {
        page: "exams",
        label: msg`Exam prep`,
        blurb: msg`Citizenship, language and driving tests, each with ready decks.`,
        icon: ClipboardCheck,
        hue: 3,
      },
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
    ],
  },
  {
    title: msg`How you work`,
    links: [
      {
        page: "assistants",
        label: msg`AI assistants`,
        blurb: msg`Send your notes to Claude, ChatGPT, Gemini or Grok and get cards.`,
        icon: MessagesSquare,
        hue: 2,
      },
      {
        page: "tutorLessons",
        label: msg`Tutor lessons`,
        blurb: msg`Keep the new words from italki, Preply or a private tutor.`,
        icon: Video,
        hue: 4,
      },
      {
        page: "notesToFlashcards",
        label: msg`Notes and PDFs`,
        blurb: msg`Class notes, a PDF or a photo of your notebook, as cards.`,
        icon: FileText,
        hue: 3,
      },
      {
        page: "teachers",
        label: msg`Teachers`,
        blurb: msg`Build a course in sections and share it with your class.`,
        icon: Presentation,
        hue: 0,
      },
    ],
  },
];

export const USE_CASE_LINKS: readonly UseCaseLink[] = USE_CASE_GROUPS.flatMap((g) => g.links);

export function isUseCasePage(page: LocalizedPage | undefined): boolean {
  return USE_CASE_LINKS.some((link) => link.page === page);
}

const page =
  (name: LocalizedPage) =>
  (locale: string): string =>
    localizedPath(name, locale);

function exam(id: string): Exam {
  const found = EXAMS.find((each) => each.id === id);
  if (!found) throw new Error(`No exam ${id}`);
  return found;
}

const examLink = (id: string, label: MessageDescriptor = exam(id).name): SiteLink => ({
  label,
  href: (locale) => examPath(exam(id), locale),
});

const EINBUERGERUNGSTEST: SiteLink = {
  label: msg`Einbürgerungstest`,
  href: page("einbuergerungstest"),
};

/** The pages written for one language. */
export const LANGUAGE_LINKS: readonly SiteLink[] = [
  ...Object.values(LANGUAGE_PAGES).map(({ page: name, label }) => ({ label, href: page(name) })),
  { label: msg`Estonian`, href: page("estonian") },
];

/** The exams the footer names; the rest are one click away on the exam hub. */
export const EXAM_LINKS: readonly SiteLink[] = [
  EINBUERGERUNGSTEST,
  examLink("united-states"),
  examLink("canada"),
  examLink("jlpt"),
  examLink("hsk"),
];

/** The menu's Popular row: the language and exam pages people search for by name. */
export const POPULAR_LINKS: readonly SiteLink[] = [
  ...LANGUAGE_LINKS,
  EINBUERGERUNGSTEST,
  examLink("jlpt", msg({ message: "JLPT", context: "exam" })),
  examLink("hsk", msg({ message: "HSK", context: "exam" })),
];

/** The deck the Use cases menu shows on its tray, with a real card from it. */
export const MENU_FEATURE = {
  href: page("einbuergerungstest"),
  title: msg`Einbürgerungstest`,
  blurb: msg`The 300 general questions and the 10 for your state, as they appear on the test.`,
  sample: exam("germany").sample,
  hue: 3,
};
