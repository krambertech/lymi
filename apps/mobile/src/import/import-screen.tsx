import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { api, errorMessage, type Import } from "@lymi/client/api";
import {
  IMPORT_TOUCHES,
  resumeUpload,
  retryUpload,
  stopUpload,
  type UploadState,
  useUpload,
} from "@lymi/client/imports";
import { importQuery } from "@lymi/client/queries";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type Href, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { EmptyState } from "../ui/empty-state";
import { LoadFailed, useLoadFailed } from "../ui/load-failed";
import { Button, Plate, Text } from "../ui/primitives";
import { Progress } from "../ui/progress";
import { Skeleton } from "../ui/skeleton";
import { toast } from "../ui/toast-host";
import { Line, Sweep } from "./parts";
import { ImportPreviewScreen } from "./preview";
import { ImportShell } from "./shell";
import {
  failureCopy,
  fileSize,
  hasGuide,
  openGuide,
  pickFile,
  refusal,
  SOURCE_NAMES,
  uploadSource,
} from "./sources";

/** One import from its upload to its end, at the import's own address so Activity reopens it. imports.md. */
export function ImportScreen({ id }: { id: string }) {
  const { t } = useLingui();
  const qc = useQueryClient();
  const router = useRouter();
  const query = useQuery(importQuery(id));
  const upload = useUpload(id);
  const unread = useLoadFailed(query);
  const item = query.data;

  // Cards landed or went, so every screen that counts them is stale.
  const previous = useRef(item?.status);
  useEffect(() => {
    if (previous.current === "importing" && item?.status !== "importing") {
      for (const key of IMPORT_TOUCHES) void qc.invalidateQueries({ queryKey: [key] });
    }
    previous.current = item?.status;
  }, [item?.status, qc]);

  const update = (next: Import) => qc.setQueryData(importQuery(id).queryKey, next);
  const cancel = useMutation({
    mutationFn: () => {
      stopUpload(id);
      return api.cancelImport(id);
    },
    onSuccess: update,
    onError: (e) => toast.add({ title: errorMessage(e), error: true }),
  });
  const touched = () => {
    for (const key of IMPORT_TOUCHES) void qc.invalidateQueries({ queryKey: [key] });
  };
  const restore = useMutation({
    mutationFn: () => api.restoreImport(id),
    onSuccess: (next) => {
      update(next);
      touched();
      toast.close(`archive-import-${id}`);
    },
    onError: (e) => toast.add({ title: errorMessage(e), error: true }),
  });
  const archive = useMutation({
    mutationFn: () => api.archiveImport(id),
    onSuccess: (next) => {
      update(next);
      touched();
      toast.add({
        id: `archive-import-${id}`,
        title: t`Import archived`,
        action: { label: t`Undo`, onPress: () => restore.mutate() },
      });
    },
    onError: (e) => toast.add({ title: errorMessage(e), error: true }),
  });

  if (!item) {
    return (
      <ImportShell title={t`Import`}>
        {unread && query.isError ? (
          <LoadFailed
            query={query}
            failed={t`Couldn’t load this import`}
            offline={t`This import needs a connection`}
          />
        ) : unread ? (
          // An import is never kept on the phone, so there is no copy to show offline.
          <EmptyState
            kind="offline"
            title={t`This import needs a connection`}
            body={t`Connect to the internet to see where it stands.`}
            action={{ label: t`Try again`, onPress: () => void query.refetch() }}
          />
        ) : (
          <View className="gap-3">
            <Skeleton height={20} width="60%" />
            <Skeleton height={140} />
          </View>
        )}
      </ImportShell>
    );
  }

  const app = SOURCE_NAMES[item.source] ?? item.source;
  // A source a newer server added has no page here yet, so it starts over from the list.
  const restart = () =>
    router.replace((item.source in SOURCE_NAMES ? `/import/${item.source}` : "/import") as Href);

  switch (item.status) {
    case "uploading":
    case "inspecting":
    case "importing":
      return (
        <Working
          item={item}
          upload={upload}
          onRetry={() => retryUpload(id, qc)}
          onResume={(source) => resumeUpload(item, source, qc)}
          onCancel={() => cancel.mutate()}
          onStartOver={() => cancel.mutate(undefined, { onSuccess: restart })}
          cancelling={cancel.isPending}
        />
      );
    case "ready":
      return item.summary ? (
        <ImportPreviewScreen
          item={item}
          onCancel={() => cancel.mutate()}
          cancelling={cancel.isPending}
        />
      ) : null;
    case "done":
      return (
        <Done
          item={item}
          onArchive={() => archive.mutate()}
          archiving={archive.isPending}
          onRestore={() => restore.mutate()}
          restoring={restore.isPending}
          onLibrary={() => router.dismissTo("/library")}
        />
      );
    case "cancelled":
      return (
        <ImportShell title={t`Import from ${app}`} description={item.fileName}>
          <EmptyState
            kind="start"
            icon="fileIn"
            title={t`Import cancelled`}
            body={t`Nothing was added, and the file was deleted.`}
            action={{ label: t`Choose another file`, onPress: restart }}
          />
        </ImportShell>
      );
    default:
      return (
        <Stopped
          item={item}
          onRestart={restart}
          onArchive={() => archive.mutate()}
          archiving={archive.isPending}
        />
      );
  }
}

/** Uploading, reading, importing: a file on its way, with what the learner may do meanwhile. */
function Working({
  item,
  upload,
  onRetry,
  onResume,
  onCancel,
  onStartOver,
  cancelling,
}: {
  item: Import;
  upload: UploadState | null;
  onRetry: () => void;
  onResume: (source: ReturnType<typeof uploadSource>) => void;
  onCancel: () => void;
  /** Cancels this import and opens its app's page, for a file that cannot be chosen again. */
  onStartOver: () => void;
  cancelling: boolean;
}) {
  const { t } = useLingui();
  const [refused, setRefused] = useState<string | null>(null);
  const app = SOURCE_NAMES[item.source] ?? item.source;
  const description = t`${item.fileName} · ${fileSize(item.byteSize)}`;

  // Quizlet's file was the pasted text, which went with the app, so it starts over with a new paste.
  if (item.status === "uploading" && !upload && item.source === "quizlet") {
    return (
      <ImportShell title={t`Import from ${app}`} description={description}>
        <Plate className="gap-3 p-5">
          <Text className="text-lg font-medium text-text" accessibilityRole="header">
            {t`The upload stopped partway`}
          </Text>
          <Text className="text-base text-text-2">
            {t`Lymi was closed before the text arrived. Paste the set again to start over.`}
          </Text>
          <Button
            label={t`Paste it again`}
            variant="primary"
            size="lg"
            loading={cancelling}
            onPress={onStartOver}
          />
        </Plate>
      </ImportShell>
    );
  }

  // The app was closed mid-upload, so the file it was reading is gone: the same file sends the rest.
  if (item.status === "uploading" && !upload) {
    const again = async () => {
      const picked = await pickFile();
      if (!picked) return;
      if (picked.size !== item.byteSize) {
        setRefused(t`That isn’t the same file. Choose ${item.fileName}.`);
        return;
      }
      const problem = refusal(item.source, picked);
      setRefused(problem);
      if (!problem) onResume(uploadSource(picked));
    };
    return (
      <ImportShell title={t`Import from ${app}`} description={description}>
        <Plate className="gap-3 p-5">
          <Text className="text-lg font-medium text-text" accessibilityRole="header">
            {t`The upload stopped partway`}
          </Text>
          <Text className="text-base text-text-2">
            {t`${Math.round((item.upload.received / Math.max(item.upload.parts, 1)) * 100)}% of the file arrived. Choose the same file to send the rest.`}
          </Text>
          {refused && <Text className="text-base text-danger">{refused}</Text>}
          <Button
            label={t`Choose the file again`}
            variant="primary"
            size="lg"
            onPress={() => void again()}
          />
          <Button
            label={t`Cancel import`}
            variant="ghost"
            loading={cancelling}
            onPress={onCancel}
          />
        </Plate>
      </ImportShell>
    );
  }

  const sending = item.status === "uploading" && upload && upload.status !== "joining";
  const value = sending
    ? upload.total > 0
      ? upload.sent / upload.total
      : 0
    : item.status === "importing" && item.progress.chunks > 0
      ? item.progress.written / item.progress.chunks
      : null;
  const heading =
    item.status === "importing"
      ? t`Importing your cards`
      : sending
        ? t`Uploading`
        : t`Reading your file`;
  const detail =
    item.status === "importing"
      ? t`You can close Lymi now. Your decks appear in Library when the import finishes.`
      : sending
        ? t`${fileSize(upload.sent)} of ${fileSize(upload.total)}. Keep Lymi open until the upload finishes.`
        : t`This takes a few seconds for most files. Nothing is added to your decks yet.`;

  return (
    <ImportShell title={t`Import from ${app}`} description={description}>
      <Plate className="gap-3 p-5">
        <Text
          className="text-lg font-medium text-text"
          accessibilityRole="header"
          accessibilityLiveRegion="polite"
        >
          {heading}
        </Text>
        {value === null ? <Sweep label={heading} /> : <Progress value={value} label={heading} />}
        <Text className="text-base text-text-2">{detail}</Text>
        {upload?.status === "failed" && (
          <View className="gap-3">
            <Text className="text-base text-danger">{upload.error}</Text>
            <Button label={t`Try again`} icon="reset" variant="primary" onPress={onRetry} />
          </View>
        )}
        {item.status !== "importing" && (
          <Button
            label={t`Cancel import`}
            variant="ghost"
            loading={cancelling}
            onPress={onCancel}
          />
        )}
      </Plate>
      {item.status === "inspecting" && (
        <View className="gap-3" accessibilityElementsHidden>
          <Skeleton height={24} width="70%" />
          <Skeleton height={220} />
          <Skeleton height={80} />
        </View>
      )}
    </ImportShell>
  );
}

/** The end: what was written, the way on, and the way back out. */
function Done({
  item,
  onArchive,
  archiving,
  onRestore,
  restoring,
  onLibrary,
}: {
  item: Import;
  onArchive: () => void;
  archiving: boolean;
  onRestore: () => void;
  restoring: boolean;
  onLibrary: () => void;
}) {
  const { t, i18n } = useLingui();
  const counts = item.counts;
  const archived = !!item.archivedAt;
  const app = SOURCE_NAMES[item.source] ?? item.source;
  const date = i18n.date(new Date(item.finishedAt ?? item.updatedAt), {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return (
    <ImportShell title={t`Import from ${app}`} description={t`${item.fileName} · ${date}`}>
      <Plate className="gap-4 p-5">
        <View className="gap-1">
          <Text className="text-xl font-medium text-text" accessibilityRole="header">
            {archived
              ? t`This import is archived`
              : plural(counts?.added ?? 0, { one: "Imported # card", other: "Imported # cards" })}
          </Text>
          <Text className="text-base text-text-2">
            {archived
              ? t`Its cards and the decks it made are hidden. Restore brings them back with their history.`
              : plural(counts?.decks ?? 0, {
                  0: "The cards went into decks you already had.",
                  one: "They’re in # new deck in Library.",
                  other: "They’re in # new decks in Library.",
                })}
          </Text>
        </View>
        {counts && !archived && (
          <View className="gap-2">
            {counts.reviews > 0 && (
              <Line tone="good">
                {plural(counts.reviews, {
                  one: "# past review was imported.",
                  other: "# past reviews were imported.",
                })}
              </Line>
            )}
            {counts.pictures > 0 && (
              <Line tone="good">
                {plural(counts.pictures, {
                  one: "# picture was imported.",
                  other: "# pictures were imported.",
                })}
              </Line>
            )}
            {counts.existing > 0 && (
              <Line tone="good">
                {plural(counts.existing, {
                  one: "# card from an earlier import was updated.",
                  other: "# cards from an earlier import were updated.",
                })}
              </Line>
            )}
            {counts.duplicates > 0 && (
              <Line tone="skip">
                {plural(counts.duplicates, {
                  one: "# card was already in your decks and was skipped.",
                  other: "# cards were already in your decks and were skipped.",
                })}
              </Line>
            )}
            {counts.picturesSkipped > 0 && (
              <Line tone="skip">
                {plural(counts.picturesSkipped, {
                  one: "# picture couldn’t be read and was skipped.",
                  other: "# pictures couldn’t be read and were skipped.",
                })}
              </Line>
            )}
          </View>
        )}
        {!archived && (
          <Button label={t`Open Library`} variant="primary" size="lg" onPress={onLibrary} />
        )}
      </Plate>

      <View className="gap-3">
        <Text className="px-1 text-md font-medium text-text" accessibilityRole="header">
          {archived ? t`Restore` : t`Undo this import`}
        </Text>
        <Text className="px-1 text-base text-text-2">
          {archived
            ? t`Brings back every card this import added and the decks it made.`
            : t`Archives every card this import added, and each deck it made that has no other cards. Nothing is deleted, and you can restore it.`}
        </Text>
        {archived ? (
          <Button
            label={t`Restore import`}
            icon="restore"
            loading={restoring}
            onPress={onRestore}
          />
        ) : (
          <Button
            label={t`Archive import`}
            icon="archive"
            variant="danger"
            loading={archiving}
            onPress={onArchive}
          />
        )}
      </View>
    </ImportShell>
  );
}

/** A failed import: what happened, a fresh start, and the cards it wrote before it stopped. */
function Stopped({
  item,
  onRestart,
  onArchive,
  archiving,
}: {
  item: Import;
  onRestart: () => void;
  onArchive: () => void;
  archiving: boolean;
}) {
  const { t, i18n } = useLingui();
  const added = item.counts?.added ?? 0;
  const copy = failureCopy(item.failure, item.source);
  const app = SOURCE_NAMES[item.source] ?? item.source;
  return (
    <ImportShell title={t`Import from ${app}`} description={item.fileName}>
      <EmptyState
        kind="failed"
        title={i18n._(copy.title)}
        body={i18n._(copy.body)}
        action={{ label: t`Choose another file`, onPress: onRestart }}
      />
      {hasGuide(item.source) && (
        <Button
          label={t`Read the guide`}
          variant="ghost"
          icon="web"
          onPress={() => openGuide(item.source)}
        />
      )}
      {item.status === "failed" && added > 0 && !item.archivedAt && (
        <Plate className="gap-3 p-5">
          <Text className="text-base text-text-2">
            {plural(added, {
              one: "# card was added before the import stopped.",
              other: "# cards were added before the import stopped.",
            })}
          </Text>
          <Button
            label={t`Archive them`}
            icon="archive"
            variant="danger"
            loading={archiving}
            onPress={onArchive}
          />
        </Plate>
      )}
    </ImportShell>
  );
}
