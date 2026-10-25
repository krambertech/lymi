import { ExamsHub } from "../exams/ExamsHub";
import { Island } from "./Island";

interface Props {
  locale?: string | undefined;
  counts: Record<string, number>;
}

export default function ExamsHubPage({ locale, counts }: Props) {
  return (
    <Island locale={locale}>
      <ExamsHub counts={counts} />
    </Island>
  );
}
