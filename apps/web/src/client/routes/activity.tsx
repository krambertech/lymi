import { useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useDocumentTitle } from "../lib/document-title";
import { importsQuery } from "../lib/queries";
import { ActivityView } from "../views/activity-view";

export const Route = createFileRoute("/activity")({
  component: ActivityRoute,
});

function ActivityRoute() {
  const { t } = useLingui();
  useDocumentTitle(t`Activity`);
  const imports = useQuery(importsQuery);
  return (
    <ActivityView
      imports={imports.data}
      error={imports.isError}
      onRetry={() => void imports.refetch()}
      retrying={imports.isFetching}
      importLink={(item, className, children) => (
        <Link to="/import/$importId" params={{ importId: item.id }} className={className}>
          {children}
        </Link>
      )}
      startLink={(className, children) => (
        <Link to="/settings" hash="import" className={className}>
          {children}
        </Link>
      )}
    />
  );
}
