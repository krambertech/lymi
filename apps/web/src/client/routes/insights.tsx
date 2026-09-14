import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { insightsQuery } from "../lib/queries";
import { InsightsView, type Period } from "../views/insights-view";

export const Route = createFileRoute("/insights")({
  component: Insights,
});

function Insights() {
  const [period, setPeriod] = useState<Period>("30");
  const { data, isError, isFetching, refetch } = useQuery(
    insightsQuery(Number(period) as 30 | 90 | 0),
  );
  return (
    <InsightsView
      data={data}
      period={period}
      onPeriod={setPeriod}
      failed={isError && data === undefined}
      busy={isFetching}
      onRetry={() => void refetch()}
    />
  );
}
