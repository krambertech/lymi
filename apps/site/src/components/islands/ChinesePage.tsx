import { I18nProvider } from "@lingui/react";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import { pageI18n } from "../../lib/i18n";
import type { Locale } from "../../lib/routes";
import { ChineseView } from "../landing/ChineseView";
import { Queries } from "./Queries";

interface Props {
  locale: Locale;
  /** The published Chinese decks, read per request. */
  decks: PublicDeckSummary[];
}

export default function ChinesePage({ locale, decks }: Props) {
  return (
    <I18nProvider i18n={pageI18n(locale)}>
      <Queries>
        <ChineseView decks={decks} locale={locale} />
      </Queries>
    </I18nProvider>
  );
}
