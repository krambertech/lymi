import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonView } from "../views/ComingSoonView";

export const Route = createFileRoute("/archived")({
  component: Archived,
});

function Archived() {
  return (
    <ComingSoonView
      title="Archived"
      body="Cards and decks you put away. Restore undoes it. Nothing here is deleted."
    />
  );
}
