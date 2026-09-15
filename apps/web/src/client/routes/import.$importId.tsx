import { useLingui } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { buttonClass } from "../components/button";
import { ErrorState } from "../components/empty-state";
import type { Choices } from "../components/import-parts";
import { toast } from "../components/ui/toast";
import { api, errorMessage, type Import } from "../lib/api";
import { useDocumentTitle } from "../lib/document-title";
import { resumeUpload, retryUpload, stopUpload, uploading, useUpload } from "../lib/import-uploads";
import { publicSiteUrl } from "../lib/origins";
import { importQuery } from "../lib/queries";
import {
  ImportDoneView,
  ImportPreviewView,
  ImportStoppedView,
  ImportWorkingView,
} from "../views/import-view";
import { BackButton, Page, TopBar } from "../views/shell";

export const Route = createFileRoute("/import/$importId")({
  component: ImportRoute,
});

const GUIDE = publicSiteUrl("/docs/import-from-anki");

function ImportRoute() {
  const { t } = useLingui();
  const { importId } = Route.useParams();
  useDocumentTitle(t`Import from Anki`);
  const qc = useQueryClient();
  const query = useQuery(importQuery(importId));
  const upload = useUpload(importId);
  const item = query.data;

  // Leaving the page mid-upload loses the file, so the browser asks first.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (uploading()) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  // Cards landed, so every screen that counts them is stale.
  const previous = useRef(item?.status);
  useEffect(() => {
    if (previous.current === "importing" && item?.status !== "importing") {
      for (const key of ["decks", "queue", "rounds", "streak", "insights", "imports"]) {
        void qc.invalidateQueries({ queryKey: [key] });
      }
    }
    previous.current = item?.status;
  }, [item?.status, qc]);

  const update = (next: Import) => qc.setQueryData(importQuery(importId).queryKey, next);
  const cancel = useMutation({
    mutationFn: () => {
      stopUpload(importId);
      return api.cancelImport(importId);
    },
    onSuccess: update,
  });
  const invalidateContent = () => {
    for (const key of ["decks", "queue", "rounds", "insights", "imports"])
      void qc.invalidateQueries({ queryKey: [key] });
  };
  const restore = useMutation({
    mutationFn: () => api.restoreImport(importId),
    onSuccess: (next) => {
      update(next);
      invalidateContent();
      toast.close(`archive-import-${importId}`);
    },
  });
  const archive = useMutation({
    mutationFn: () => api.archiveImport(importId),
    onSuccess: (next) => {
      update(next);
      invalidateContent();
      toast.add({
        id: `archive-import-${importId}`,
        title: t`Import archived`,
        actionProps: { children: t`Undo`, onClick: () => restore.mutate() },
      });
    },
  });

  const back = (
    <TopBar
      nested
      back={
        <BackButton label={t`Activity`}>
          {(className, content) => (
            <Link to="/activity" className={className}>
              {content}
            </Link>
          )}
        </BackButton>
      }
    />
  );

  if (!item) {
    return query.isError ? (
      <Page width="md">
        {back}
        <ErrorState
          title={t`Couldn’t load this import`}
          body={errorMessage(query.error)}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      </Page>
    ) : (
      <Page width="md">{back}</Page>
    );
  }

  const restart = (
    <Link to="/import" className={buttonClass("primary")}>
      {t`Choose another file`}
    </Link>
  );

  switch (item.status) {
    case "uploading":
    case "inspecting":
    case "importing":
      return (
        <ImportWorkingView
          item={item}
          upload={upload}
          back={back}
          onRetryUpload={() => retryUpload(importId, qc)}
          onResume={(file) => resumeUpload(item, file, qc)}
          onCancel={() => cancel.mutate()}
          cancelling={cancel.isPending}
        />
      );
    case "ready":
      return item.summary ? (
        <Ready
          item={item}
          back={back}
          onCancel={() => cancel.mutate()}
          cancelling={cancel.isPending}
        />
      ) : null;
    case "done":
      return (
        <ImportDoneView
          item={item}
          back={back}
          onArchive={() => archive.mutate()}
          archiving={archive.isPending}
          onRestore={() => restore.mutate()}
          restoring={restore.isPending}
          actionError={
            archive.isError
              ? errorMessage(archive.error)
              : restore.isError
                ? errorMessage(restore.error)
                : undefined
          }
          openLibrary={
            <Link to="/library" className={buttonClass("primary")}>
              {t`Open Library`}
            </Link>
          }
        />
      );
    default:
      return (
        <ImportStoppedView
          item={item}
          back={back}
          restart={restart}
          guideUrl={GUIDE}
          onArchive={() => archive.mutate()}
          archiving={archive.isPending}
        />
      );
  }
}

/** The preview's choices live here, and each change asks the server to count again. */
function Ready({
  item,
  back,
  onCancel,
  cancelling,
}: {
  item: Import;
  back: ReactNode;
  onCancel: () => void;
  cancelling: boolean;
}) {
  const qc = useQueryClient();
  const summary = item.summary as NonNullable<Import["summary"]>;
  const [choices, setChoices] = useState<Choices>(() => ({
    languages: { ...summary.languages },
    roles: Object.fromEntries(summary.noteTypes.map((type) => [type.key, type.roles])),
  }));
  const key = useMemo(() => JSON.stringify(choices), [choices]);
  const preview = useQuery({
    queryKey: ["imports", item.id, "preview", key],
    queryFn: () => api.previewImport(item.id, choices),
    staleTime: 60_000,
    retry: 1,
    placeholderData: (previous) => previous,
    meta: { persist: false },
  });
  const confirm = useMutation({
    mutationFn: () => api.confirmImport(item.id, choices),
    onSuccess: (next) => qc.setQueryData(importQuery(item.id).queryKey, next),
  });
  return (
    <ImportPreviewView
      item={item}
      summary={summary}
      choices={choices}
      onChoices={setChoices}
      preview={preview.data}
      previewLoading={preview.isFetching}
      previewError={preview.isError ? errorMessage(preview.error) : undefined}
      onConfirm={() => confirm.mutate()}
      confirming={confirm.isPending}
      confirmError={confirm.isError ? errorMessage(confirm.error) : undefined}
      onCancel={onCancel}
      cancelling={cancelling}
      back={back}
    />
  );
}
