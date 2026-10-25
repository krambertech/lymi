import { LandingView } from "../landing/LandingView";
import { Island } from "./Island";

interface Props {
  locale?: string | undefined;
}

export default function LandingPage({ locale }: Props) {
  return (
    <Island locale={locale}>
      <LandingView />
    </Island>
  );
}
