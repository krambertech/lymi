import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { ExportFormat } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Download, RotateCcw } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { api, type Export, errorMessage } from "../lib/api";
import { exportQuery } from "../lib/queries";
import { Button, buttonClass } from "./button";
import { fileSize } from "./import-parts";
import { InlineError } from "./inline-error";
import { RadioCard } from "./radio-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { RadioGroup } from "./ui/radio-group";

/** What the sheet exports: one deck, which can also go to a spreadsheet, or the whole library. */
export type ExportScope =
  | {
      kind: "deck";
      deckId: string;
      deckName: string;
      onCsv: () => void;
      csvLeavesPictures: boolean;
    }
  | {
      kind: "library";
      /** Decks someone else owns, which a file never carries out. Absent while the list loads. */
      shared?: number | undefined;
    };

type Choice = ExportFormat | "csv";

/** The format rows: another app first, since that is where most exports go, then Lymi's own file. */
export function ExportFormats({
  value,
  onChange,
  scope,
}: {
  value: Choice;
  onChange: (value: Choice) => void;
  scope: ExportScope;
}) {
  const { t } = useLingui();
  const name = useId();
  return (
    <RadioGroup<Choice> aria-label={t`Format`} name={name} value={value} onValueChange={onChange}>
      <RadioCard
        value="anki"
        title={t`Anki package`}
        description={t`For Anki, AnkiDroid and Mochi, with due dates, review history and pictures. An .apkg file.`}
      />
      <RadioCard
        value="lymi"
        title={t`Lymi file`}
        description={t`Everything, to import into Lymi again: cards, pictures, schedules and review history. A .zip file.`}
      />
      {scope.kind === "deck" && (
        <RadioCard
          value="csv"
          title={t`Spreadsheet`}
          description={
            scope.csvLeavesPictures
              ? t`Terms, meanings and due dates in a .csv file, without pictures or review history.`
              : t`Terms, meanings and due dates in a .csv file, without review history.`
          }
        />
      )}
    </RadioGroup>
  );
}

/** The file on its way, ready, or stopped, with the one action each state has. */
export function ExportProgress({ item, onRetry }: { item: Export; onRetry: () => void }) {
  const { t, i18n } = useLingui();
  const time = new Intl.DateTimeFormat(i18n.locale, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
  const fileName = item.fileName;
  if (item.status === "exporting") {
    return (
      <div className="grid gap-3" role="status">
        <div className="h-2 overflow-hidden rounded-full bg-edge">
          <i className="block h-full w-1/3 animate-[import-sweep_1.4s_ease-in-out_infinite] rounded-full bg-text-2 motion-reduce:w-full motion-reduce:animate-none motion-reduce:opacity-40" />
        </div>
        <p className="text-base text-text-2 text-pretty">
          <Trans>
            Writing {fileName}. You can close this. The file stays in Activity for a day.
          </Trans>
        </p>
      </div>
    );
  }
  if (item.status === "done" && item.downloadUrl) {
    const cards = item.counts?.cards ?? 0;
    const until = item.expiresAt ? time.format(new Date(item.expiresAt)) : null;
    return (
      <div className="grid gap-4">
        <div className="edge flex items-center gap-3 rounded-lg bg-plate px-4 py-3">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-full bg-good-soft text-good"
            aria-hidden="true"
          >
            <Check className="size-4" />
          </span>
          <span className="grid min-w-0 gap-0.5">
            <span className="truncate text-md font-medium">{fileName}</span>
            <span className="text-sm text-muted tabular-nums">
              {t`${plural(cards, { one: "# card", other: "# cards" })} · ${fileSize(item.byteSize ?? 0, i18n.locale)}`}
            </span>
          </span>
        </div>
        {until && (
          <p className="text-sm text-text-2">
            <Trans>You can download it until {until}. Then it’s deleted.</Trans>
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="grid gap-3" role="alert">
      <p className="text-base text-text">
        {item.status === "expired" ? (
          <Trans>This file expired after a day. Export again to get a new one.</Trans>
        ) : item.failure === "too_large" ? (
          <Trans>Couldn’t fit this in one file. Export one deck at a time instead.</Trans>
        ) : (
          <Trans>Couldn’t write the file. Try again.</Trans>
        )}
      </p>
      {item.failure !== "too_large" && (
        <Button variant="secondary" className="justify-self-start" onClick={onRetry}>
          <RotateCcw data-icon="inline-start" aria-hidden="true" />
          <Trans>Try again</Trans>
        </Button>
      )}
    </div>
  );
}

/** How long a file may take before the sheet trades the formats for the working bar. */
const WORKING_DELAY_MS = 1500;

/**
 * Taking a deck or the library out. The learner picks a format, the server writes the file while
 * the sheet polls, and the sheet ends in a download; closing it early leaves the file in Activity.
 */
export function ExportSheet({
  open,
  onOpenChange,
  scope,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: ExportScope;
}) {
  const { t } = useLingui();
  const qc = useQueryClient();
  const [choice, setChoice] = useState<Choice>("anki");
  const [exportId, setExportId] = useState<string | null>(null);
  // A small deck is written in about a second, so the working bar waits rather than flashing past.
  const [slow, setSlow] = useState(false);
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
  const close = (next: boolean) => {
    onOpenChange(next);
    // A finished or stopped export is not shown again; one still writing is found again on reopen.
    if (next) return;
    if (writing) setSlow(true);
    else {
      setExportId(null);
      setSlow(false);
      start.reset();
    }
  };
  const submit = () => {
    if (choice === "csv") {
      if (scope.kind === "deck") scope.onCsv();
      close(false);
      return;
    }
    start.mutate(choice);
  };
  const current = exportId && (!writing || slow) ? item.data : undefined;
  const deckName = scope.kind === "deck" ? scope.deckName : "";
  const title = scope.kind === "deck" ? t`Export ${deckName}` : t`Export library`;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {!current && (
            <DialogDescription>
              {scope.kind === "deck" ? (
                <Trans>
                  Includes your schedule and review history. Exporting doesn’t change the deck.
                </Trans>
              ) : scope.shared ? (
                <Trans>
                  Every deck you own, archived ones included, with your schedule and review history.
                  Decks shared with you aren’t included.
                </Trans>
              ) : (
                <Trans>
                  Every deck, archived ones included, with your schedule and review history.
                </Trans>
              )}
            </DialogDescription>
          )}
        </DialogHeader>
        {current ? (
          <ExportProgress
            item={current}
            onRetry={() => {
              setExportId(null);
              setSlow(false);
              start.reset();
            }}
          />
        ) : (
          <ExportFormats
            value={choice}
            onChange={(next) => !writing && !start.isPending && setChoice(next)}
            scope={scope}
          />
        )}
        {start.isError && (
          <p className="text-sm" role="alert">
            <InlineError>{errorMessage(start.error)}</InlineError>
          </p>
        )}
        <DialogFooter>
          {current?.status === "done" && current.downloadUrl ? (
            <>
              <Button variant="ghost" onClick={() => close(false)}>
                <Trans>Close</Trans>
              </Button>
              <a
                href={current.downloadUrl}
                download={current.fileName}
                className={buttonClass("primary")}
              >
                <Download data-icon="inline-start" aria-hidden="true" />
                <Trans>Download</Trans>
              </a>
            </>
          ) : current ? (
            <Button variant="ghost" onClick={() => close(false)}>
              <Trans>Close</Trans>
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => close(false)}>
                <Trans>Cancel</Trans>
              </Button>
              <Button variant="primary" loading={start.isPending || writing} onClick={submit}>
                <Trans>Export</Trans>
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
