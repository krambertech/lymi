import { TeachersView } from "../landing/TeachersView";
import { Island } from "./Island";

interface Props {
  locale?: string | undefined;
}

export default function TeachersPage({ locale }: Props) {
  return (
    <Island locale={locale}>
      <TeachersView />
    </Island>
  );
}
