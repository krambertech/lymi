import { useLingui } from "@lingui/react/macro";
import type { ImportSource } from "@lymi/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { SOURCE_NAMES } from "../components/import-parts";
import { errorMessage } from "../lib/api";
import { useDocumentTitle } from "../lib/document-title";
import { importGuideUrl } from "../lib/import-guides";
import { startUpload } from "../lib/import-uploads";
import { ImportStartView } from "../views/import-view";

/** One app's import page: its file, its export steps, its guide. */
export function ImportStart({ source }: { source: ImportSource }) {
  const { t } = useLingui();
  const app = SOURCE_NAMES[source];
  useDocumentTitle(t`Import from ${app}`);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const start = useMutation({
    mutationFn: (file: File) => startUpload(file, qc),
    onSuccess: (item) =>
      navigate({ to: "/import/$importId", params: { importId: item.id }, replace: true }),
  });
  return (
    <ImportStartView
      source={source}
      onFile={(file) => start.mutate(file)}
      pending={start.isPending}
      error={start.isError ? errorMessage(start.error) : undefined}
      guideUrl={importGuideUrl(source)}
      back={{ label: t`Settings`, to: "/settings", hash: "import" }}
    />
  );
}
