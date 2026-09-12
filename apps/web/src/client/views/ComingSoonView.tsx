import { useLingui } from "@lingui/react/macro";
import { EmptyState } from "../components/EmptyState";
import { Page, PageHeader } from "./Shell";

/**
 * A screen that has a place in the navigation before it has anything in it. Insights ships
 * this way so the sidebar does not reorder when it lands.
 */
export function ComingSoonView({ title, body }: { title: string; body: string }) {
  const { t } = useLingui();
  return (
    <Page>
      <PageHeader title={title} />
      <EmptyState lantern="unlit" title={t`Not yet`} body={body} className="flex-1" />
    </Page>
  );
}
