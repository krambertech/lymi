import { useLingui } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonView } from "../views/coming-soon-view";

export const Route = createFileRoute("/activity")({
  component: ActivityRoute,
});

function ActivityRoute() {
  const { t } = useLingui();
  return (
    <ComingSoonView
      title={t`Activity`}
      body={t`Every change a connected app, an API key or the AI made, by day. Inspect, edit or archive any card from here.`}
    />
  );
}
