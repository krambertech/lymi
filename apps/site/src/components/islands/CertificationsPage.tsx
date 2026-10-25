import { CertificationsView } from "../landing/CertificationsView";
import { Island } from "./Island";

interface Props {
  locale?: string | undefined;
}

export default function CertificationsPage({ locale }: Props) {
  return (
    <Island locale={locale}>
      <CertificationsView />
    </Island>
  );
}
