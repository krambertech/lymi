import { useLingui } from "@lingui/react/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { errorMessage } from "../lib/api";
import { useDocumentTitle } from "../lib/document-title";
import { startUpload } from "../lib/import-uploads";
import { publicSiteUrl } from "../lib/origins";
import { ImportStartView } from "../views/import-view";
import { BackButton, TopBar } from "../views/shell";

export const Route = createFileRoute("/import/")({
  component: ImportStart,
});

function ImportStart() {
  const { t } = useLingui();
  useDocumentTitle(t`Import from Anki`);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const start = useMutation({
    mutationFn: (file: File) => startUpload(file, qc),
    onSuccess: (item) =>
      navigate({ to: "/import/$importId", params: { importId: item.id }, replace: true }),
  });
  return (
    <ImportStartView
      onFile={(file) => start.mutate(file)}
      pending={start.isPending}
      error={start.isError ? errorMessage(start.error) : undefined}
      guideUrl={publicSiteUrl("/docs/import-from-anki")}
      back={
        <TopBar
          back={
            <BackButton label={t`Library`}>
              {(className, content) => (
                <Link to="/library" className={className}>
                  {content}
                </Link>
              )}
            </BackButton>
          }
        />
      }
    />
  );
}
