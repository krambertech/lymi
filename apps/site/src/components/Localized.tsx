import { I18nProvider } from "@lingui/react";
import type { ReactNode } from "react";
import { pageI18n } from "../lib/i18n";

interface Props {
  locale?: string | undefined;
  children: ReactNode;
}

/** Each React part of an Astro page renders on its own, so each one takes the page's language here. */
export function Localized({ locale, children }: Props) {
  return <I18nProvider i18n={pageI18n(locale)}>{children}</I18nProvider>;
}
