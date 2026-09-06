import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonView } from "../views/ComingSoonView";

export const Route = createFileRoute("/insights")({
  component: Insights,
});

function Insights() {
  return (
    <ComingSoonView
      title="Insights"
      body="Reviews per day, cards by state, and the words that keep coming back. Once there is enough history to say anything true."
    />
  );
}
