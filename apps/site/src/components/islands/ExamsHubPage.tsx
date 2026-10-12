import { I18nProvider } from "@lingui/react";
import { pageI18n } from "../../lib/i18n";
import { ExamsHub } from "../exams/ExamsHub";
import { Queries } from "./Queries";

interface Props {
  locale?: string | undefined;
  counts: Record<string, number>;
}

export default function ExamsHubPage({ locale, counts }: Props) {
  return (
    <I18nProvider i18n={pageI18n(locale)}>
      <Queries>
        <ExamsHub counts={counts} />
      </Queries>
    </I18nProvider>
  );
}
