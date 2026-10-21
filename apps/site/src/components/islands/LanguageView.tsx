import { I18nProvider } from "@lingui/react";
import type { SupportedTag } from "@lymi/core";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import type { ComponentType } from "react";
import { pageI18n } from "../../lib/i18n";
import type { Locale } from "../../lib/routes";
import { ChineseView } from "../landing/ChineseView";
import { JapaneseView } from "../landing/JapaneseView";
import { Queries } from "./Queries";

interface ViewProps {
  locale: Locale;
  /** The language's published decks, read per request. */
  decks: PublicDeckSummary[];
}

/** Each supported language's own view; one island holds them all, so a page's file needs no import of its own. */
const VIEWS = {
  ja: JapaneseView,
  zh: ChineseView,
} satisfies Record<SupportedTag, ComponentType<ViewProps>>;

interface Props extends ViewProps {
  language: SupportedTag;
}

export default function LanguageView({ language, locale, decks }: Props) {
  const View = VIEWS[language];
  return (
    <I18nProvider i18n={pageI18n(locale)}>
      <Queries>
        <View decks={decks} locale={locale} />
      </Queries>
    </I18nProvider>
  );
}
