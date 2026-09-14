import { I18nProvider } from "@lingui/react";
import { pageI18n } from "../../lib/i18n";
import { TeachersView } from "../landing/TeachersView";
import { Queries } from "./Queries";

interface Props {
  locale?: string | undefined;
}

export default function TeachersPage({ locale }: Props) {
  return (
    <I18nProvider i18n={pageI18n(locale)}>
      <Queries>
        <TeachersView />
      </Queries>
    </I18nProvider>
  );
}
