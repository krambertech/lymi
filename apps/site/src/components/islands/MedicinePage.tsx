import { MedicineView } from "../landing/MedicineView";
import { Island } from "./Island";

interface Props {
  locale?: string | undefined;
}

export default function MedicinePage({ locale }: Props) {
  return (
    <Island locale={locale}>
      <MedicineView />
    </Island>
  );
}
