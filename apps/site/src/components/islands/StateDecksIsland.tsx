import { I18nProvider } from "@lingui/react";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import { pageI18n } from "../../lib/i18n";
import type { Locale } from "../../lib/routes";
import { type StateDeck, StateDecks } from "../exams/StateDecks";

interface Props {
  locale: Locale;
  general: PublicDeckSummary | undefined;
  states: StateDeck[];
}

export default function StateDecksIsland({ locale, general, states }: Props) {
  return (
    <I18nProvider i18n={pageI18n(locale)}>
      <StateDecks locale={locale} general={general} states={states} />
    </I18nProvider>
  );
}
