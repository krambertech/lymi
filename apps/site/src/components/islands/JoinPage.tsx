import { I18nProvider } from "@lingui/react";
import { pageI18n } from "../../lib/i18n";
import { JoinView } from "../JoinView";
import { Queries } from "./Queries";

interface Props {
  locale?: string | undefined;
}

export default function JoinPage({ locale }: Props) {
  return (
    <I18nProvider i18n={pageI18n(locale)}>
      <Queries>
        <JoinView />
      </Queries>
    </I18nProvider>
  );
}
