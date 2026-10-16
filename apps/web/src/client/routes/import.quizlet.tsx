import { useLingui } from "@lingui/react/macro";
import { encodeTextImport } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { errorMessage } from "../lib/api";
import { useDocumentTitle } from "../lib/document-title";
import { importGuideUrl } from "../lib/import-guides";
import { startUpload } from "../lib/import-uploads";
import { decksQuery } from "../lib/queries";
import { type QuizletImportRequest, QuizletImportView } from "../views/quizlet-import-view";

export const Route = createFileRoute("/import/quizlet")({
  component: QuizletImport,
});

/**
 * Quizlet's start: the pasted set goes up as one small text file through the same upload as
 * every import, carrying the separators and deck the learner chose, then the shared preview.
 */
function QuizletImport() {
  const { t } = useLingui();
  useDocumentTitle(t`Import from Quizlet`);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const decks = useQuery(decksQuery);
  const start = useMutation({
    mutationFn: ({ text, separators, deckName, deckId }: QuizletImportRequest) =>
      startUpload(
        new File([encodeTextImport({ separators, deckName, deckId }, text)], "quizlet.txt", {
          type: "text/plain",
        }),
        qc,
      ),
    onSuccess: (item) =>
      navigate({ to: "/import/$importId", params: { importId: item.id }, replace: true }),
  });
  return (
    <QuizletImportView
      decks={(decks.data ?? [])
        .filter((d) => d.role === "owner" && !d.archivedAt)
        .map((d) => ({ id: d.id, name: d.name }))}
      onContinue={(request) => start.mutate(request)}
      pending={start.isPending}
      error={start.isError ? errorMessage(start.error) : undefined}
      guideUrl={importGuideUrl("quizlet")}
      back={{ label: t`Settings`, to: "/settings", hash: "import" }}
    />
  );
}
