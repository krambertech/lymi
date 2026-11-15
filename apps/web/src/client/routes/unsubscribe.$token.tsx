import { createFileRoute } from "@tanstack/react-router";
import { UnsubscribeView } from "../views/unsubscribe-view";

/** The footer link of a learning email. It asks first, because mail scanners follow links. */
export const Route = createFileRoute("/unsubscribe/$token")({
  component: Unsubscribe,
});

function Unsubscribe() {
  const { token } = Route.useParams();
  return <UnsubscribeView token={token} />;
}
