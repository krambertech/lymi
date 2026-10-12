import { I18nProvider } from "@lingui/react";
import { pageI18n } from "../../lib/i18n";
import { CertificationsView } from "../landing/CertificationsView";
import { Queries } from "./Queries";

interface Props {
  locale?: string | undefined;
}

export default function CertificationsPage({ locale }: Props) {
  return (
    <I18nProvider i18n={pageI18n(locale)}>
      <Queries>
        <CertificationsView />
      </Queries>
    </I18nProvider>
  );
}
