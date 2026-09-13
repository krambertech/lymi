import { useLingui } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonView } from "../views/ComingSoonView";

export const Route = createFileRoute("/archived")({
  component: Archived,
});

function Archived() {
  const { t } = useLingui();
  return (
    <ComingSoonView
      title={t`Archived`}
      body={t`Cards and decks you archived. Restore puts them back. Nothing here is deleted.`}
    />
  );
}
