import { I18nProvider } from "@lingui/react";
import { pageI18n } from "../../lib/i18n";
import { NotesToFlashcardsView } from "../landing/NotesToFlashcardsView";
import { Queries } from "./Queries";

interface Props {
  locale?: string | undefined;
}

export default function NotesToFlashcardsPage({ locale }: Props) {
  return (
    <I18nProvider i18n={pageI18n(locale)}>
      <Queries>
        <NotesToFlashcardsView />
      </Queries>
    </I18nProvider>
  );
}
