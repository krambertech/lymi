import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { LocalizedPage } from "../../lib/routes";

export interface UseCaseLink {
  page: LocalizedPage;
  label: MessageDescriptor;
  blurb?: MessageDescriptor;
  /** A narrow page written for search, linked from the footer and left out of the menus. */
  footerOnly?: true;
}

/** Every use case page in order. The header menu, the phone menu and the footer all read this list. */
export const USE_CASE_LINKS: UseCaseLink[] = [
  {
    page: "languages",
    label: msg`Language learning`,
    blurb: msg`Words and phrases from lessons, tutors and reading.`,
  },
  { page: "estonian", label: msg`Estonian`, footerOnly: true },
  {
    page: "assistants",
    label: msg`AI assistants`,
    blurb: msg`Send your notes to Claude, ChatGPT or Gemini and get cards.`,
  },
  {
    page: "teachers",
    label: msg`Teachers`,
    blurb: msg`Build a course in sections and share it with your class.`,
  },
];

export const MENU_USE_CASE_LINKS = USE_CASE_LINKS.filter((link) => !link.footerOnly);

export function isUseCasePage(page: LocalizedPage | undefined): boolean {
  return MENU_USE_CASE_LINKS.some((link) => link.page === page);
}
