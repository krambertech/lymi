import { AssistantsView } from "../landing/AssistantsView";
import { Island } from "./Island";

interface Props {
  locale?: string | undefined;
}

export default function AssistantsPage({ locale }: Props) {
  return (
    <Island locale={locale}>
      <AssistantsView />
    </Island>
  );
}
