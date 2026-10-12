import { useLingui } from "@lingui/react/macro";
import { useState } from "react";
import { useInsights } from "../../../data/queries";
import { InsightsView, type Period } from "../../../insights/insights-view";
import { Screen } from "../../../ui/screen";

/** How the learner's memory is doing: the web's Insights at phone width. insights.md. */
export default function Insights() {
  const { t } = useLingui();
  const [period, setPeriod] = useState<Period>("30");
  const { data, isError, isFetching, refetch } = useInsights(Number(period) as 30 | 90 | 0);
  return (
    <Screen title={t`Insights`} back={{ label: t`You`, to: "/you" }}>
      <InsightsView
        data={data}
        period={period}
        onPeriod={setPeriod}
        failed={isError && data === undefined}
        busy={isFetching}
        onRetry={() => void refetch()}
      />
    </Screen>
  );
}
