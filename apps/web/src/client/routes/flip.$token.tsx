import { createFileRoute } from "@tanstack/react-router";
import { FlipView } from "../views/flip-view";

/** One card from a learning email: a signed link, so it opens with no session. */
export const Route = createFileRoute("/flip/$token")({
  component: Flip,
});

function Flip() {
  const { token } = Route.useParams();
  return <FlipView token={token} />;
}
