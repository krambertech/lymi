import { I18nProvider } from "@lingui/react";
import { pageI18n } from "../../lib/i18n";
import { TutorLessonsView } from "../landing/TutorLessonsView";
import { Queries } from "./Queries";

interface Props {
  locale?: string | undefined;
}

export default function TutorLessonsPage({ locale }: Props) {
  return (
    <I18nProvider i18n={pageI18n(locale)}>
      <Queries>
        <TutorLessonsView />
      </Queries>
    </I18nProvider>
  );
}
