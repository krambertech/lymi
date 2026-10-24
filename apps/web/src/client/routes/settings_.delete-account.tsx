import { useLingui } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ExportSheet } from "../components/export-sheet";
import { toast } from "../components/ui/toast";
import { api, refusalCode } from "../lib/api";
import { signOut } from "../lib/auth";
import { useDocumentTitle } from "../lib/document-title";
import { clearPersistedLearnerState } from "../lib/persisted";
import { decksQuery, deletionQuery } from "../lib/queries";
import { setTelemetryLearner } from "../lib/telemetry";
import { DeleteAccountView } from "../views/delete-account-view";

export const Route = createFileRoute("/settings_/delete-account")({
  component: DeleteAccountRoute,
});

function DeleteAccountRoute() {
  const { t } = useLingui();
  useDocumentTitle(t`Delete account`);
  const summary = useQuery(deletionQuery);
  const decks = useQuery(decksQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);

  const send = useMutation({ mutationFn: api.sendDeletionCode });

  const remove = useMutation({
    mutationFn: (code: string) => api.deleteAccount({ code }),
    onSuccess: async () => {
      // The server already ended every session; this clears the cookie and the stored language.
      await signOut().catch(() => undefined);
      qc.clear();
      setTelemetryLearner(undefined);
      clearPersistedLearnerState();
      await navigate({ to: "/login" });
      toast.add({ title: t`Your Lymi account is deleted` });
    },
  });

  const sendError = (error: unknown) => {
    switch (refusalCode(error)) {
      case "code_sent":
        return t`A code is already on its way. Wait a minute before asking for another.`;
      case "code_limit":
        return t`You’ve asked for several codes today. Try again tomorrow.`;
      default:
        return t`Couldn’t send the code. Check your connection and try again.`;
    }
  };

  const deleteError = (error: unknown) => {
    switch (refusalCode(error)) {
      case "code_wrong":
        return t`That code isn’t right. Check the email and try again.`;
      case "code_expired":
        return t`This code has expired. Send a new one.`;
      default:
        return t`Couldn’t delete your account. Check your connection and try again.`;
    }
  };

  return (
    <>
      <DeleteAccountView
        summary={summary.data}
        loadError={summary.isError}
        onRetry={() => void summary.refetch()}
        retrying={summary.isFetching}
        onExportLibrary={() => setExporting(true)}
        sentTo={send.data?.sentTo ?? null}
        onSendCode={() => {
          if (!send.isPending) send.mutate();
        }}
        sending={send.isPending}
        sendError={send.isError ? sendError(send.error) : null}
        onDelete={(code) => remove.mutate(code)}
        deleting={remove.isPending}
        deleteError={remove.isError ? deleteError(remove.error) : null}
      />
      <ExportSheet
        open={exporting}
        onOpenChange={setExporting}
        scope={{
          kind: "library",
          shared: decks.data?.filter((d) => d.role !== "owner").length,
        }}
      />
    </>
  );
}
