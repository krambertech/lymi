import { LanguagesView } from "../landing/LanguagesView";
import { Island } from "./Island";

interface Props {
  locale?: string | undefined;
}

export default function LanguagesPage({ locale }: Props) {
  return (
    <Island locale={locale}>
      <LanguagesView />
    </Island>
  );
}
