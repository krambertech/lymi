import type { PublicDeckSummary } from "@lymi/core/catalog";
import type { ComponentType } from "react";
import type { LanguagePageTag } from "../../lib/language-pages";
import type { Locale } from "../../lib/routes";
import { ChineseView } from "../landing/ChineseView";
import { GermanView } from "../landing/GermanView";
import { JapaneseView } from "../landing/JapaneseView";
import { PolishView } from "../landing/PolishView";
import { RussianView } from "../landing/RussianView";
import { SpanishView } from "../landing/SpanishView";
import { UkrainianView } from "../landing/UkrainianView";
import { Island } from "./Island";

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
  es: SpanishView,
  de: GermanView,
} satisfies Record<LanguagePageTag, ComponentType<ViewProps>>;

interface Props extends ViewProps {
  language: LanguagePageTag;
}

export default function LanguageView({ language, locale, decks }: Props) {
  const View = VIEWS[language];
  return (
    <Island locale={locale}>
      <View decks={decks} locale={locale} />
    </Island>
  );
}
