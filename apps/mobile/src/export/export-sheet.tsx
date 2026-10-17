import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { api, apiUrl, type Export, errorMessage } from "@lymi/client/api";
import { type DeckRow, deckCsv, deckCsvName } from "@lymi/client/deck-list";
import { exportQuery } from "@lymi/client/queries";
import type { ExportFormat } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Directory, File, Paths } from "expo-file-system";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Share, View } from "react-native";
import { sessionHeaders } from "../auth/client";
import { useDecks } from "../data/queries";
import { Sweep } from "../import/parts";
import { fileSize } from "../import/sources";
import { usePalette } from "../theme/palette";
import { Button, Icon, Text } from "../ui/primitives";
import { Sheet, SheetError, SheetGroup, SheetNote, SheetRow } from "../ui/sheet";

/** What the sheet exports: one deck, which can also go to a spreadsheet, or the whole library. */
export type ExportScope =
  | { kind: "deck"; deckId: string; deckName: string; rows?: DeckRow[] | undefined }
  | { kind: "library" };

type Choice = ExportFormat | "csv";

/** How long a file may take before the sheet trades the formats for the working bar. */
const WORKING_DELAY_MS = 1500;

/** Where files wait to be shared; emptied before each, so only the last one is ever kept. */
function exportsFolder(): Directory {
  const folder = new Directory(Paths.cache, "exports");
  if (folder.exists) folder.delete();
  folder.create({ intermediates: true });
  return folder;
}

/** The finished file, fetched with the learner's session into the phone's cache. */
async function download(item: Export): Promise<string> {
  const file = new File(exportsFolder(), item.fileName);
  const saved = await File.downloadFileAsync(apiUrl(item.downloadUrl ?? ""), file, {
    headers: await sessionHeaders(),
    idempotent: true,
  });
  return saved.uri;
}

/** Taking a deck or the library out, ending in iOS's share sheet once this sheet has gone. imports.md. */
export function ExportSheet({
  open,
  onOpenChange,
  scope,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: ExportScope;
  /** An export that already exists, such as one opened from Activity. */
  initial?: Export | undefined;
}) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const qc = useQueryClient();
  // A deck someone else owns never leaves in a file, so the library says so when there is one.
  const shared = useDecks().data?.some((d) => d.role !== "owner") ?? false;
  const [choice, setChoice] = useState<Choice | null>(null);
  const [exportId, setExportId] = useState<string | null>(initial?.id ?? null);
  // A small deck is written in about a second, so the working bar waits rather than flashing past.
  const [slow, setSlow] = useState(!!initial);
  const [shareError, setShareError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  // The share sheet opens once this sheet has gone, as every sheet acts. phone.md "Sheets".
  const toShare = useRef<string | null>(null);
  useEffect(() => {
    if (!initial) return;
    qc.setQueryData(exportQuery(initial.id).queryKey, initial);
    setExportId(initial.id);
    setSlow(true);
  }, [initial, qc]);
  const item = useQuery({ ...exportQuery(exportId ?? ""), enabled: open && !!exportId });
  const writing = !!exportId && item.data?.status === "exporting";
  useEffect(() => {
    if (!writing || slow) return;
    const timer = setTimeout(() => setSlow(true), WORKING_DELAY_MS);
    return () => clearTimeout(timer);
  }, [writing, slow]);
  const start = useMutation({
    mutationFn: (format: ExportFormat) =>
      api.startExport(scope.kind === "deck" ? { format, deckId: scope.deckId } : { format }),
    onSuccess: (started) => {
      qc.setQueryData(exportQuery(started.id).queryKey, started);
      // The export becomes a row on Activity the moment it starts.
      void qc.invalidateQueries({ queryKey: ["activity"] });
      setExportId(started.id);
    },
  });
  // Back to where the sheet opened: an existing export, such as Activity's, or the formats.
  const reset = () => {
    setExportId(initial?.id ?? null);
    setSlow(!!initial);
    setChoice(null);
    setShareError(null);
    start.reset();
  };
  const close = () => onOpenChange(false);
  const pick = (next: Choice) => {
    if (start.isPending || writing) return;
    setChoice(next);
    setShareError(null);
    if (next !== "csv") return start.mutate(next);
    if (scope.kind !== "deck" || !scope.rows) return;
    try {
      const file = new File(exportsFolder(), deckCsvName(scope.deckName));
      file.write(deckCsv(scope.rows));
      toShare.current = file.uri;
      close();
    } catch {
      setShareError(t`Couldn’t write the file. Try again.`);
    }
  };
  const save = async (ready: Export) => {
    setFetching(true);
    setShareError(null);
    try {
      toShare.current = await download(ready);
      close();
    } catch {
      // A file past its day is gone for good, so retrying is no help: the export is read again.
      const fresh = await item.refetch().catch(() => null);
      setShareError(
        fresh?.data?.status === "expired"
          ? null
          : t`Couldn’t download the file. Check your connection and try again.`,
      );
    } finally {
      setFetching(false);
    }
  };

  const current = exportId && (!writing || slow) ? item.data : undefined;
  const busy = start.isPending || writing;
  const deckName = scope.kind === "deck" ? scope.deckName : "";
  const title = scope.kind === "deck" ? t`Export ${deckName}` : t`Export library`;
  const pictures = scope.kind === "deck" && scope.rows?.some((row) => row.card.image);
  const formats: { value: Choice; label: string; detail: string }[] = [
    {
      value: "anki",
      label: t`Anki package`,
      detail: t`For Anki, AnkiDroid and Mochi, with due dates, review history and pictures. An .apkg file.`,
    },
    {
      value: "lymi",
      label: t`Lymi file`,
      detail: t`Everything, to import into Lymi again: cards, pictures, schedules and review history. A .zip file.`,
    },
    ...(scope.kind === "deck" && scope.rows
      ? [
          {
            value: "csv" as const,
            label: t`Spreadsheet`,
            detail: pictures
              ? t`Terms, meanings and due dates in a .csv file, without pictures or review history.`
              : t`Terms, meanings and due dates in a .csv file, without review history.`,
          },
        ]
      : []),
  ];

  let body: ReactNode;
  if (!current) {
    body = (
      <>
        <SheetGroup>
          {formats.map((format) => (
            <SheetRow
              key={format.value}
              label={format.label}
              detail={busy && choice === format.value ? t`Writing the file…` : format.detail}
              disabled={busy && choice !== format.value}
              opens
              onPress={() => pick(format.value)}
            />
          ))}
        </SheetGroup>
        {start.isError && <SheetError>{errorMessage(start.error)}</SheetError>}
        {shareError && <SheetError>{shareError}</SheetError>}
      </>
    );
  } else if (current.status === "exporting") {
    body = (
      <View className="gap-3 px-4 pb-2" accessibilityLiveRegion="polite">
        <Sweep label={t`Writing the file`} />
        <Text className="text-base text-text-2">
          {t`Writing ${current.fileName}. You can close this. The file stays in Activity for a day.`}
        </Text>
      </View>
    );
  } else if (current.status === "done" && current.downloadUrl) {
    const cards = current.counts?.cards ?? 0;
    const until = current.expiresAt
      ? i18n.date(new Date(current.expiresAt), {
          weekday: "short",
          hour: "numeric",
          minute: "2-digit",
        })
      : null;
    body = (
      <>
        <SheetGroup>
          <View
            className="min-h-[60px] flex-row items-center gap-3 px-4 py-3"
            accessible
            accessibilityLabel={`${current.fileName}, ${plural(cards, { one: "# card", other: "# cards" })}`}
          >
            <View className="size-9 items-center justify-center rounded-full bg-good-soft">
              <Icon name="check" size={16} colour={p.good} strokeWidth={2.5} />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-md font-medium text-text" numberOfLines={1}>
                {current.fileName}
              </Text>
              <Text className="text-sm text-muted">
                {t`${plural(cards, { one: "# card", other: "# cards" })} · ${fileSize(current.byteSize ?? 0)}`}
              </Text>
            </View>
          </View>
        </SheetGroup>
        {until && (
          <SheetNote>{t`You can download it until ${until}. Then it’s deleted.`}</SheetNote>
        )}
        {shareError && <SheetError>{shareError}</SheetError>}
        <Button
          label={t`Save or share`}
          icon="share"
          variant="primary"
          size="lg"
          loading={fetching}
          onPress={() => void save(current)}
        />
      </>
    );
  } else {
    body = (
      <View className="gap-3">
        <SheetError>
          {current.status === "expired"
            ? t`This file expired after a day. Export again to get a new one.`
            : current.failure === "too_large"
              ? t`Couldn’t fit this in one file. Export one deck at a time instead.`
              : t`Couldn’t write the file. Try again.`}
        </SheetError>
        {current.failure !== "too_large" && (
          <Button
            label={t`Try again`}
            icon="reset"
            onPress={() => {
              reset();
              setExportId(null);
              setSlow(false);
            }}
          />
        )}
      </View>
    );
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      onDismiss={() => {
        const uri = toShare.current;
        toShare.current = null;
        if (uri) void Share.share({ url: uri });
        // A finished or stopped export is not shown again; one still writing is found again on reopen.
        if (!writing) reset();
        else setSlow(true);
      }}
      title={title}
      description={
        current
          ? undefined
          : scope.kind === "deck"
            ? t`Includes your schedule and review history. Exporting doesn’t change the deck.`
            : shared
              ? t`Every deck you own, archived ones included, with your schedule and review history. Decks shared with you aren’t included.`
              : t`Every deck, archived ones included, with your schedule and review history.`
      }
    >
      {body}
    </Sheet>
  );
}
