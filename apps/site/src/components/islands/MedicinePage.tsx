import { I18nProvider } from "@lingui/react";
import { pageI18n } from "../../lib/i18n";
import { MedicineView } from "../landing/MedicineView";
import { Queries } from "./Queries";

interface Props {
  locale?: string | undefined;
}

export default function MedicinePage({ locale }: Props) {
  return (
    <I18nProvider i18n={pageI18n(locale)}>
      <Queries>
        <MedicineView />
      </Queries>
    </I18nProvider>
  );
}
