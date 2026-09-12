import { I18nProvider } from "@lingui/react";
import { pageI18n } from "../../lib/i18n";
import { LandingView } from "../landing/LandingView";
import { Queries } from "./Queries";

interface Props {
  locale?: string | undefined;
}

export default function LandingPage({ locale }: Props) {
  return (
    <I18nProvider i18n={pageI18n(locale)}>
      <Queries>
        <LandingView />
      </Queries>
    </I18nProvider>
  );
}
