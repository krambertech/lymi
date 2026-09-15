import { useLingui } from "@lingui/react/macro";
import { EmptyState } from "../components/empty-state";
import { Page, PageHeader } from "./shell";

/**
 * A screen that has a place in the navigation before it has anything in it. Insights ships
 * this way so the sidebar does not reorder when it lands.
 */
export function ComingSoonView({ title, body }: { title: string; body: string }) {
  const { t } = useLingui();
  return (
    <Page>
      <PageHeader title={title} />
      <EmptyState title={t`Coming soon`} body={body} className="flex-1" />
    </Page>
  );
}
