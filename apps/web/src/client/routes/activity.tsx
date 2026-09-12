import { useLingui } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonView } from "../views/ComingSoonView";

export const Route = createFileRoute("/activity")({
  component: ActivityRoute,
});

function ActivityRoute() {
  const { t } = useLingui();
  return (
    <ComingSoonView
      title={t`Activity`}
      body={t`Every write an integration or the AI made, by day. Cards can be inspected, edited or archived from here.`}
    />
  );
}
