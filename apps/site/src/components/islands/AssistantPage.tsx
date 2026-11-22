import type { AssistantKey } from "../landing/assistant-pages";
import { AssistantPageView } from "../landing/AssistantPageView";
import { Island } from "./Island";

interface Props {
  locale: string | undefined;
  assistant: AssistantKey;
}

export default function AssistantPage({ locale, assistant }: Props) {
  return (
    <Island locale={locale}>
      <AssistantPageView assistant={assistant} />
    </Island>
  );
}
