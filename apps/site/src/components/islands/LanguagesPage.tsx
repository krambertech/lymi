import { I18nProvider } from "@lingui/react";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import { pageI18n } from "../../lib/i18n";
import { JapaneseView } from "../landing/JapaneseView";
import { EstonianView, LanguagesView } from "../landing/LanguagesView";
import { Queries } from "./Queries";

interface Props {
  page: "languages" | "estonian" | "japanese";
  locale?: string | undefined;
  /** The Japanese page's published decks, read per request. */
  decks?: PublicDeckSummary[] | undefined;
}

export default function LanguagesPage({ page, locale, decks }: Props) {
  return (
    <I18nProvider i18n={pageI18n(locale)}>
      <Queries>
        {page === "estonian" ? (
          <EstonianView />
        ) : page === "japanese" ? (
          <JapaneseView decks={decks ?? []} />
        ) : (
          <LanguagesView />
        )}
      </Queries>
    </I18nProvider>
  );
}
