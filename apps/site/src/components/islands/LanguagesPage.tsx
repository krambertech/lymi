import { I18nProvider } from "@lingui/react";
import { pageI18n } from "../../lib/i18n";
import { LanguagesView } from "../landing/LanguagesView";
import { Queries } from "./Queries";

interface Props {
  locale?: string | undefined;
}

export default function LanguagesPage({ locale }: Props) {
  return (
    <I18nProvider i18n={pageI18n(locale)}>
      <Queries>
        <LanguagesView />
      </Queries>
    </I18nProvider>
  );
}
