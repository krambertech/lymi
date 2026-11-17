import { ComparePageView } from "../landing/ComparePageView";
import type { CompareKey } from "../landing/compare-pages";
import { Island } from "./Island";

interface Props {
  locale?: string | undefined;
  compare: CompareKey;
}

export default function ComparePage({ locale, compare }: Props) {
  return (
    <Island locale={locale}>
      <ComparePageView compare={compare} />
    </Island>
  );
}
