import { I18nProvider } from "@lingui/react";
import { pageI18n } from "../../lib/i18n";
import { EstonianView, LanguagesView } from "../landing/LanguagesView";
import { Queries } from "./Queries";

interface Props {
  page: "languages" | "estonian";
}

export default function LanguagesPage({ page }: Props) {
  return (
    <I18nProvider i18n={pageI18n("en")}>
      <Queries>{page === "estonian" ? <EstonianView /> : <LanguagesView />}</Queries>
    </I18nProvider>
  );
}
