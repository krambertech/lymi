import { I18nProvider } from "@lingui/react";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import { pageI18n } from "../../lib/i18n";
import type { Locale } from "../../lib/routes";
import { EstonianView } from "../landing/EstonianView";
import { Queries } from "./Queries";

interface Props {
  locale: Locale;
  /** The published Estonian decks, read per request. */
  decks: PublicDeckSummary[];
}

export default function EstonianPage({ locale, decks }: Props) {
  return (
    <I18nProvider i18n={pageI18n(locale)}>
      <Queries>
        <EstonianView decks={decks} locale={locale} />
      </Queries>
    </I18nProvider>
  );
}
