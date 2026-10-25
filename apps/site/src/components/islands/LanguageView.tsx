import { I18nProvider } from "@lingui/react";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import type { ComponentType } from "react";
import { pageI18n } from "../../lib/i18n";
import type { LanguagePageTag } from "../../lib/language-pages";
import type { Locale } from "../../lib/routes";
import { ChineseView } from "../landing/ChineseView";
import { JapaneseView } from "../landing/JapaneseView";
import { PolishView } from "../landing/PolishView";
import { RussianView } from "../landing/RussianView";
import { UkrainianView } from "../landing/UkrainianView";
import { Queries } from "./Queries";

interface ViewProps {
  locale: Locale;
  /** The language's published decks, read per request. */
  decks: PublicDeckSummary[];
}

/** Each language page's own view; one island holds them all, so a page's file needs no import of its own. */
const VIEWS = {
  ja: JapaneseView,
  zh: ChineseView,
  uk: UkrainianView,
  ru: RussianView,
  pl: PolishView,
} satisfies Record<LanguagePageTag, ComponentType<ViewProps>>;

interface Props extends ViewProps {
  language: LanguagePageTag;
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
