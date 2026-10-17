import { I18nProvider } from "@lingui/react";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import { pageI18n } from "../../lib/i18n";
import { JapaneseView } from "../landing/JapaneseView";
import { Queries } from "./Queries";

interface Props {
  locale?: string | undefined;
  /** The published Japanese decks, read per request. */
  decks: PublicDeckSummary[];
}

export default function JapanesePage({ locale, decks }: Props) {
  return (
    <I18nProvider i18n={pageI18n(locale)}>
      <Queries>
        <JapaneseView decks={decks} />
      </Queries>
    </I18nProvider>
  );
}
