import { useLingui } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { useDocumentTitle } from "../lib/document-title";
import { ComingSoonView } from "../views/coming-soon-view";

export const Route = createFileRoute("/archived")({
  component: Archived,
});

function Archived() {
  const { t } = useLingui();
  useDocumentTitle(t`Archived`);
  return (
    <ComingSoonView
      title={t`Archived`}
      body={t`Cards and decks you archived. Restore puts them back. Nothing here is deleted.`}
    />
  );
}
