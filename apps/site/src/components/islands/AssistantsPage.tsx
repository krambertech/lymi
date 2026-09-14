import { I18nProvider } from "@lingui/react";
import { pageI18n } from "../../lib/i18n";
import { AssistantsView } from "../landing/AssistantsView";
import { Queries } from "./Queries";

export default function AssistantsPage() {
  return (
    <I18nProvider i18n={pageI18n("en")}>
      <Queries>
        <AssistantsView />
      </Queries>
    </I18nProvider>
  );
}
