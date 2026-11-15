import { useLingui } from "@lingui/react/macro";
import { useState } from "react";
import { useInsights } from "../../../data/queries";
import { InsightsView, type Period } from "../../../insights/insights-view";
import { LoadFailed, useLoadFailed } from "../../../ui/load-failed";
import { Screen } from "../../../ui/screen";

/** How the learner's memory is doing: the web's Insights at phone width. insights.md. */
export default function Insights() {
  const { t } = useLingui();
  const [period, setPeriod] = useState<Period>("30");
  const insights = useInsights(Number(period) as 30 | 90 | 0);
  const failed = useLoadFailed(insights);
  return (
    <Screen title={t`Insights`} back={{ label: t`You`, to: "/you" }}>
      {failed ? (
        <LoadFailed
          query={insights}
          failed={t`Couldn’t load Insights`}
          offline={t`Insights needs a connection`}
        />
      ) : (
        <InsightsView
          data={insights.data}
          period={period}
          onPeriod={setPeriod}
          busy={insights.isFetching}
        />
      )}
    </Screen>
  );
}
