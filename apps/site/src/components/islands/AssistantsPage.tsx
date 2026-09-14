import { I18nProvider } from "@lingui/react";
import { pageI18n } from "../../lib/i18n";
import { AssistantsView } from "../landing/AssistantsView";
import { Queries } from "./Queries";

interface Props {
  locale?: string | undefined;
}

export default function AssistantsPage({ locale }: Props) {
  return (
    <I18nProvider i18n={pageI18n(locale)}>
      <Queries>
        <AssistantsView />
      </Queries>
    </I18nProvider>
  );
}
