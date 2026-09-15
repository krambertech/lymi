import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ImportSource, MAX_IMPORT_BYTES } from "@lymi/core";
import { clsx } from "clsx";
import {
  Archive,
  CircleCheck,
  CircleMinus,
  FileUp,
  Languages as LanguagesIcon,
  RotateCcw,
} from "lucide-react";
import { type ReactNode, useId, useMemo, useRef, useState } from "react";
import { Button } from "../components/button";
import { ErrorState } from "../components/empty-state";
import {
  CardCheck,
  type Choices,
  FieldsDialog,
  failureCopy,
  fileSize,
  LanguagesDialog,
  languagesLine,
  type NoteType,
  SOURCE_NAMES,
  type Summary,
} from "../components/import-parts";
import { Progress } from "../components/progress";
import { Skeleton } from "../components/skeleton";
import type { Import, ImportPreview } from "../lib/api";
import { splitNoteTypes } from "../lib/import-note-types";
import type { UploadState } from "../lib/import-uploads";
import { Page, PageHeader } from "./shell";

const ACCEPT: Record<ImportSource, string> = { anki: ".apkg,.colpkg", mochi: ".mochi" };
const FILE_NAME: Record<ImportSource, RegExp> = { anki: /\.(apkg|colpkg)$/i, mochi: /\.mochi$/i };

function Shell({
  title,
  sub,
  back,
  children,
}: {
  title: string;
  sub?: ReactNode;
  back?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Page width="md">
      {back}
      <PageHeader title={title} sub={sub} />
      <div className="grid gap-6">{children}</div>
    </Page>
  );
}

/** Where an import from one app starts: the file, and how to get it out of that app. */
export function ImportStartView({
  source,
  onFile,
  pending,
  error,
  guideUrl,
  back,
}: {
  source: ImportSource;
  onFile: (file: File) => void;
  pending?: boolean | undefined;
  error?: string | undefined;
  guideUrl: string;
  back?: ReactNode;
}) {
  const { t } = useLingui();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const hintId = useId();
  const app = SOURCE_NAMES[source];
  const choose = (file: File | undefined) => {
    if (!file) return;
    // Checked before anything is sent, with the same limits the server applies.
    const problem = !FILE_NAME[source].test(file.name)
      ? source === "mochi"
        ? t`Choose the .mochi file Mochi exports.`
        : t`Choose the .apkg or .colpkg file Anki exports.`
      : file.size > MAX_IMPORT_BYTES
        ? t`This file is larger than 1 GB. Export one deck at a time.`
        : file.size === 0
          ? t`This file is empty. Export it again from ${app}.`
          : null;
    setRefused(problem);
    if (!problem) onFile(file);
  };
  const message = refused ?? error;

  return (
    <Shell title={t`Import from ${app}`} back={back}>
      <p className="-mt-4 max-w-[60ch] text-md text-text-2 text-pretty">
        <Trans>
          Bring your decks across with their pictures, tags and review history. Your cards keep the
          due dates they had, and {app} stays as it is.
        </Trans>
      </p>

      <section
        aria-label={t`Choose your ${app} file`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          choose(e.dataTransfer.files[0]);
        }}
        className={clsx(
          "grid justify-items-center gap-3 rounded-xl border-[1.5px] border-dashed px-5 py-9 text-center transition-colors duration-150",
          over ? "border-text-2 bg-plate" : "border-edge-2",
        )}
      >
        <span
          className="grid size-12 place-items-center rounded-full bg-plate-2 text-text-2"
          aria-hidden="true"
        >
          <FileUp className="size-5" />
        </span>
        <div className="grid gap-0.5">
          <h2 className="text-lg font-medium text-balance">
            <Trans>Choose the file you exported from {app}</Trans>
          </h2>
          <p id={hintId} className="text-base text-muted">
            {source === "mochi" ? (
              <Trans>A .mochi file, up to 1 GB. You can also drop it here.</Trans>
            ) : (
              <Trans>An .apkg or .colpkg file, up to 1 GB. You can also drop it here.</Trans>
            )}
          </p>
        </div>
        <input
          ref={input}
          type="file"
          accept={ACCEPT[source]}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            choose(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <Button
          variant="primary"
          loading={pending}
          aria-describedby={hintId}
          onClick={() => input.current?.click()}
        >
          <Trans>Choose file</Trans>
        </Button>
        {message && (
          <p className="text-sm text-danger" role="alert">
            {message}
          </p>
        )}
      </section>

      <section aria-labelledby="export-steps" className="grid gap-3">
        <h2 id="export-steps" className="text-md font-medium">
          <Trans>Exporting from {app}</Trans>
        </h2>
        <ol className="grid gap-3 text-base text-text-2">
          {(source === "mochi" ? MOCHI_STEPS : ANKI_STEPS).map((step, i) => (
            <li key={step.id} className="grid grid-cols-[26px_1fr] gap-3">
              <span
                aria-hidden="true"
                className="edge grid size-[26px] place-items-center rounded-full bg-plate-2 text-xs font-semibold text-text tabular-nums"
              >
                {i + 1}
              </span>
              <span className="pt-0.5 text-pretty">{step.node}</span>
            </li>
          ))}
        </ol>
        <a
          href={guideUrl}
          className="justify-self-start text-base font-medium text-text underline underline-offset-4"
        >
          {source === "mochi" ? (
            <Trans>Something went wrong? Read the guide</Trans>
          ) : (
            <Trans>On a phone, or something went wrong? Read the guide</Trans>
          )}
        </a>
      </section>
    </Shell>
  );
}

const ANKI_STEPS = [
  {
    id: "menu",
    node: (
      <Trans>
        In Anki on a computer, choose <strong className="font-medium text-text">File</strong>, then{" "}
        <strong className="font-medium text-text">Export</strong>.
      </Trans>
    ),
  },
  {
    id: "options",
    node: (
      <Trans>
        Choose <strong className="font-medium text-text">Anki Deck Package</strong>, and tick{" "}
        <strong className="font-medium text-text">Include Scheduling Information</strong> and{" "}
        <strong className="font-medium text-text">Include Media</strong>.
      </Trans>
    ),
  },
  { id: "save", node: <Trans>Press Export, save the file, then choose it here.</Trans> },
];

const MOCHI_STEPS = [
  {
    id: "deck",
    node: (
      <Trans>
        In Mochi, open a deck, open its <strong className="font-medium text-text">…</strong> menu
        and choose <strong className="font-medium text-text">Export deck</strong>.
      </Trans>
    ),
  },
  {
    id: "everything",
    node: (
      <Trans>
        To bring every deck at once, open{" "}
        <strong className="font-medium text-text">Settings</strong> and choose{" "}
        <strong className="font-medium text-text">Export everything</strong> instead.
      </Trans>
    ),
  },
  { id: "save", node: <Trans>Save the .mochi file, then choose it here.</Trans> },
];

/** Uploading, reading, importing: a file on its way, with what the learner may do meanwhile. */
export function ImportWorkingView({
  item,
  upload,
  onRetryUpload,
  onResume,
  onCancel,
  cancelling,
  back,
}: {
  item: Import;
  upload: UploadState | null;
  onRetryUpload: () => void;
  onResume: (file: File) => void;
  onCancel: () => void;
  cancelling?: boolean | undefined;
  back?: ReactNode;
}) {
  const { t, i18n } = useLingui();
  const input = useRef<HTMLInputElement>(null);
  const [refused, setRefused] = useState<string | null>(null);
  const sub = t`${item.fileName} · ${fileSize(item.byteSize, i18n.locale)}`;
  const app = SOURCE_NAMES[item.source];

  if (item.status === "uploading" && !upload) {
    return (
      <Shell title={t`Import from ${app}`} sub={sub} back={back}>
        <section className="edge grid gap-3 rounded-xl bg-plate p-5">
          <h2 className="text-lg font-medium">
            <Trans>The upload stopped part way</Trans>
          </h2>
          <p className="text-base text-text-2">
            {t`${Math.round((item.upload.received / item.upload.parts) * 100)}% of the file arrived. Choose the same file to send the rest.`}
          </p>
          <input
            ref={input}
            type="file"
            accept={ACCEPT[item.source]}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              if (file.size !== item.byteSize) {
                setRefused(t`That isn’t the same file. Choose ${item.fileName}.`);
                return;
              }
              setRefused(null);
              onResume(file);
            }}
          />
          {refused && (
            <p className="text-sm text-danger" role="alert">
              {refused}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => input.current?.click()}>
              <Trans>Choose the file again</Trans>
            </Button>
            <Button variant="ghost" onClick={onCancel} loading={cancelling}>
              <Trans>Cancel import</Trans>
            </Button>
          </div>
        </section>
      </Shell>
    );
  }

  const uploadingNow = item.status === "uploading" && upload;
  const value = uploadingNow
    ? upload.total > 0
      ? upload.sent / upload.total
      : 0
    : item.status === "importing" && item.progress.chunks > 0
      ? item.progress.written / item.progress.chunks
      : null;
  const heading =
    item.status === "importing"
      ? t`Importing your cards`
      : uploadingNow && upload.status !== "joining"
        ? t`Uploading`
        : t`Reading your file`;
  const detail =
    item.status === "importing"
      ? t`You can close Lymi now. The import keeps going, and your decks appear in Library when it’s done.`
      : uploadingNow && upload.status !== "joining"
        ? t`${fileSize(upload.sent, i18n.locale)} of ${fileSize(upload.total, i18n.locale)}. Keep Lymi open until the upload finishes.`
        : t`This takes a few seconds for most files. Nothing is added to your decks yet.`;

  return (
    <Shell title={t`Import from ${app}`} sub={sub} back={back}>
      <section className="edge grid gap-3 rounded-xl bg-plate p-5" aria-live="polite">
        <h2 className="text-lg font-medium">{heading}</h2>
        {value === null ? (
          <div className="h-2 overflow-hidden rounded-full bg-edge">
            <i className="block h-full w-1/3 animate-[import-sweep_1.4s_ease-in-out_infinite] rounded-full bg-text-2 motion-reduce:w-full motion-reduce:animate-none motion-reduce:opacity-40" />
          </div>
        ) : (
          <Progress value={value} label={heading} />
        )}
        <p className="text-base text-text-2 tabular-nums">{detail}</p>
        {upload?.status === "failed" && (
          <div className="flex flex-wrap items-center gap-2">
            <p className="flex-1 text-sm text-danger" role="alert">
              {upload.error}
            </p>
            <Button variant="primary" onClick={onRetryUpload}>
              <RotateCcw aria-hidden="true" />
              <Trans>Try again</Trans>
            </Button>
          </div>
        )}
        {item.status !== "importing" && (
          <Button
            variant="ghost"
            className="justify-self-start -ms-3"
            onClick={onCancel}
            loading={cancelling}
          >
            <Trans>Cancel import</Trans>
          </Button>
        )}
      </section>
      {item.status === "inspecting" && (
        <div className="grid gap-3" aria-hidden="true">
          <Skeleton className="h-6 w-56 rounded-sm" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      )}
    </Shell>
  );
}

function Line({ tone, children }: { tone: "good" | "skip"; children: ReactNode }) {
  return (
    <li className="flex gap-2.5 text-base text-text-2">
      {tone === "good" ? (
        <CircleCheck className="mt-0.5 size-[18px] shrink-0 text-good" aria-hidden="true" />
      ) : (
        <CircleMinus className="mt-0.5 size-[18px] shrink-0 text-muted" aria-hidden="true" />
      )}
      <span className="min-w-0 text-pretty">{children}</span>
    </li>
  );
}

function Figure({
  value,
  label,
  loading,
}: {
  value: number | undefined;
  label: string;
  loading: boolean;
}) {
  const { i18n } = useLingui();
  return (
    <div className="grid gap-0.5 px-4 py-3 [&:not(:first-child)]:border-s [&:not(:first-child)]:border-edge">
      {loading || value === undefined ? (
        <Skeleton className="h-7 w-12 rounded-sm" />
      ) : (
        <span className="text-2xl font-semibold leading-tight tabular-nums">
          {new Intl.NumberFormat(i18n.locale).format(value)}
        </span>
      )}
      <span className="text-sm text-muted">{label}</span>
    </div>
  );
}

/**
 * The preview. It leads with one of the learner's own cards and asks whether it looks right,
 * then says in plain lines what the import keeps and what it skips. Languages and fields are
 * already answered and open only when the learner wants to change them. docs/design/imports.md.
 */
export function ImportPreviewView({
  item,
  summary,
  choices,
  preview,
  previewLoading,
  previewError,
  onChoices,
  onConfirm,
  confirming,
  confirmError,
  onCancel,
  cancelling,
  back,
}: {
  item: Import;
  summary: Summary;
  choices: Choices;
  preview: ImportPreview | undefined;
  previewLoading: boolean;
  previewError?: string | undefined;
  onChoices: (choices: Choices) => void;
  onConfirm: () => void;
  confirming?: boolean | undefined;
  confirmError?: string | undefined;
  onCancel: () => void;
  cancelling?: boolean | undefined;
  back?: ReactNode;
}) {
  const { t, i18n } = useLingui();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [checkError, setCheckError] = useState<string>();
  const [fieldsFor, setFieldsFor] = useState<NoteType>();
  const [languagesOpen, setLanguagesOpen] = useState(false);
  const { asked, rest } = useMemo(() => splitNoteTypes(summary.noteTypes), [summary.noteTypes]);
  const [showRest, setShowRest] = useState(false);
  const noteTypes = showRest ? [...asked, ...rest] : asked;
  const restNotes = rest.reduce((sum, type) => sum + type.notes, 0);
  const unchecked = asked.filter((type) => !checked.has(type.key)).length;
  const missingLanguage = summary.decks.filter(
    (d) => (choices.languages[d.key] ?? null) === null,
  ).length;
  const added = preview?.added ?? 0;
  const app = SOURCE_NAMES[item.source];
  // New Mochi cards with no side break; the adapter names their kind by this key.
  const oneSided = preview?.addedByNoteType["content:one"] ?? 0;

  const check = (key: string) =>
    setChecked((current) => {
      const next = new Set(current);
      next.add(key);
      if (asked.every((type) => next.has(type.key))) setCheckError(undefined);
      return next;
    });

  return (
    <Shell
      title={t`Import from ${app}`}
      sub={t`${item.fileName} · ${fileSize(item.byteSize, i18n.locale)}`}
      back={back}
    >
      <CardCheck
        source={item.source}
        noteTypes={noteTypes}
        samples={preview?.samples}
        loading={previewLoading}
        checked={checked}
        onChecked={check}
        onChangeFields={setFieldsFor}
        error={checkError ? t`Check this card, then press Import again.` : undefined}
      />

      {rest.length > 0 && !showRest && (
        <div className="-mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-text-2">
          <p className="text-pretty">
            {plural(restNotes, {
              one: "# more note, of a less common kind, comes across as it is.",
              other: "# more notes, of less common kinds, come across as they are.",
            })}
          </p>
          <Button variant="ghost" size="sm" className="-ms-3" onClick={() => setShowRest(true)}>
            <Trans>Check those too</Trans>
          </Button>
        </div>
      )}

      <section aria-labelledby="coming-across" className="grid gap-3">
        <h2 id="coming-across" className="text-md font-medium">
          <Trans>What comes across</Trans>
        </h2>
        <div className="edge grid grid-cols-3 rounded-xl bg-plate">
          <Figure value={preview?.added} label={t`new cards`} loading={previewLoading} />
          <Figure value={preview?.reviews} label={t`past reviews`} loading={previewLoading} />
          <Figure value={preview?.decks.length} label={t`decks`} loading={previewLoading} />
        </div>
        {previewError && (
          <p className="text-sm text-danger" role="alert">
            {previewError}
          </p>
        )}
        {preview && (
          <ul className="grid gap-2.5">
            {preview.reviews > 0 ? (
              <>
                <Line tone="good">
                  <Trans>Cards keep the due dates they had in {app}.</Trans>
                </Line>
                <Line tone="good">
                  <Trans>
                    Past reviews show in Insights on the days you did them. They don’t count toward
                    today’s goal or your streak.
                  </Trans>
                </Line>
              </>
            ) : summary.reviews > 0 ? null : (
              <Line tone="skip">
                {item.source === "mochi" ? (
                  <Trans>This file has no review history, so every card starts as new.</Trans>
                ) : (
                  <Trans>
                    This file has no review history, so every card starts as new. To keep your
                    progress, export again with Include Scheduling Information ticked.
                  </Trans>
                )}
              </Line>
            )}
            {preview.pictures > 0 && (
              <Line tone="good">
                {plural(preview.pictures, {
                  one: "# card brings its picture.",
                  other: "# cards bring their pictures.",
                })}
              </Line>
            )}
            {preview.existing > 0 && (
              <Line tone="good">
                {plural(preview.existing, {
                  one: "# card came across in an earlier import. It isn’t added again; only its empty fields are filled.",
                  other:
                    "# cards came across in an earlier import. They aren’t added again; only their empty fields are filled.",
                })}
              </Line>
            )}
            {preview.duplicates > 0 && (
              <Line tone="skip">
                <details className="group">
                  <summary className="cursor-pointer list-none underline-offset-4 hoverable:hover:underline [&::-webkit-details-marker]:hidden">
                    {plural(preview.duplicates, {
                      one: "# term is already in Lymi, so it’s skipped.",
                      other: "# terms are already in Lymi, so they’re skipped.",
                    })}
                  </summary>
                  <ul className="mt-2 grid gap-1 text-sm">
                    {preview.duplicateExamples.map((d) => (
                      <li key={`${d.term}-${d.deckName}`}>
                        <Trans>
                          <span className="font-medium text-text">{d.term}</span> in {d.deckName}
                        </Trans>
                      </li>
                    ))}
                    {preview.duplicates > preview.duplicateExamples.length && (
                      <li className="text-muted">
                        {plural(preview.duplicates - preview.duplicateExamples.length, {
                          one: "and # more",
                          other: "and # more",
                        })}
                      </li>
                    )}
                  </ul>
                </details>
              </Line>
            )}
            {preview.archived > 0 && (
              <Line tone="skip">
                {item.source === "mochi"
                  ? plural(preview.archived, {
                      one: "# card you archived in Mochi arrives archived.",
                      other: "# cards you archived in Mochi arrive archived.",
                    })
                  : plural(preview.archived, {
                      one: "# suspended card arrives archived.",
                      other: "# suspended cards arrive archived.",
                    })}
              </Line>
            )}
            {preview.shortened > 0 && (
              <Line tone="skip">
                {plural(preview.shortened, {
                  one: "# card has text that’s too long, so part of it moves to notes or is cut.",
                  other:
                    "# cards have text that’s too long, so part of it moves to notes or is cut.",
                })}
              </Line>
            )}
            {preview.audio > 0 && (
              <Line tone="skip">
                {plural(preview.audio, {
                  one: "# sound is left out. Lymi says words out loud itself.",
                  other: "# sounds are left out. Lymi says words out loud itself.",
                })}
              </Line>
            )}
            {oneSided > 0 && (
              <Line tone="skip">
                {plural(oneSided, {
                  one: "# card has no --- line, so it comes across with a term and no meaning.",
                  other:
                    "# cards have no --- line, so they come across with a term and no meaning.",
                })}
              </Line>
            )}
            {preview.unsupported + preview.skipped > 0 && (
              <Line tone="skip">
                {item.source === "mochi"
                  ? plural(preview.skipped, {
                      one: "# card is left out: it has no term.",
                      other: "# cards are left out: they have no term.",
                    })
                  : plural(preview.unsupported + preview.skipped, {
                      one: "# note is left out: it’s image occlusion or has no term.",
                      other: "# notes are left out: they’re image occlusion or have no term.",
                    })}
              </Line>
            )}
          </ul>
        )}
      </section>

      <button
        type="button"
        onClick={() => setLanguagesOpen(true)}
        className="edge group flex items-center gap-4 rounded-xl bg-plate px-4 py-3.5 text-start transition-[background-color,box-shadow] duration-150 hoverable:hover:edge-2 hoverable:hover:bg-hover"
      >
        <span
          className="grid size-10 shrink-0 place-items-center rounded-full bg-plate-2 text-text-2"
          aria-hidden="true"
        >
          <LanguagesIcon className="size-[18px]" />
        </span>
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="text-md font-medium">
            {plural(summary.decks.length, {
              one: "Language of # deck",
              other: "Languages of # decks",
            })}
          </span>
          <span className={clsx("text-sm", missingLanguage > 0 ? "text-text-2" : "text-muted")}>
            {missingLanguage > 0
              ? plural(missingLanguage, {
                  one: "# deck has no language yet. Choose one so Lymi can find duplicates and say words.",
                  other:
                    "# decks have no language yet. Choose one so Lymi can find duplicates and say words.",
                })
              : languagesLine(summary.decks, choices.languages, i18n.locale, t`No language`)}
          </span>
        </span>
        <span className="text-base font-medium text-text-2">
          <Trans>Change</Trans>
        </span>
      </button>

      <div className="grid gap-2 border-t border-edge pt-5">
        {(checkError || confirmError) && (
          <p className="text-center text-sm text-danger" role="alert">
            {checkError ?? confirmError}
          </p>
        )}
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          loading={confirming}
          aria-disabled={previewLoading && !preview}
          onClick={() => {
            if (unchecked > 0) {
              setCheckError(
                asked.length === 1
                  ? t`Check that the card looks right first.`
                  : t`Check each kind of card first. ${unchecked} still to check.`,
              );
              const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
              document
                .getElementById("card-check")
                ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
              return;
            }
            onConfirm();
          }}
        >
          {preview && added === 0 && preview.existing > 0
            ? plural(preview.existing, { one: "Update # card", other: "Update # cards" })
            : plural(added, { one: "Import # card", other: "Import # cards" })}
        </Button>
        <p className="text-center text-sm text-muted text-pretty">
          <Trans>You can undo the whole import later from Activity.</Trans>
        </p>
        <Button
          variant="ghost"
          className="justify-self-center"
          onClick={onCancel}
          loading={cancelling}
        >
          <Trans>Cancel import</Trans>
        </Button>
      </div>

      <FieldsDialog
        source={item.source}
        key={fieldsFor ? `fields-${fieldsFor.key}` : "fields"}
        type={fieldsFor}
        roles={fieldsFor ? (choices.roles[fieldsFor.key] ?? fieldsFor.roles) : undefined}
        open={!!fieldsFor}
        onOpenChange={(open) => !open && setFieldsFor(undefined)}
        onSave={(roles) => {
          if (!fieldsFor) return;
          onChoices({ ...choices, roles: { ...choices.roles, [fieldsFor.key]: roles } });
          check(fieldsFor.key);
        }}
      />
      <LanguagesDialog
        source={item.source}
        key={languagesOpen ? "languages-open" : "languages"}
        decks={summary.decks}
        languages={choices.languages}
        open={languagesOpen}
        onOpenChange={setLanguagesOpen}
        onSave={(languages) => onChoices({ ...choices, languages })}
      />
    </Shell>
  );
}

/** The end: what was written, the way on, and the way back out. */
export function ImportDoneView({
  item,
  onArchive,
  archiving,
  onRestore,
  restoring,
  actionError,
  openLibrary,
  back,
}: {
  item: Import;
  onArchive: () => void;
  archiving?: boolean | undefined;
  onRestore: () => void;
  restoring?: boolean | undefined;
  actionError?: string | undefined;
  openLibrary: ReactNode;
  back?: ReactNode;
}) {
  const { t, i18n } = useLingui();
  const counts = item.counts;
  const date = new Intl.DateTimeFormat(i18n.locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(item.finishedAt ?? item.updatedAt));
  const archived = !!item.archivedAt;
  const app = SOURCE_NAMES[item.source];
  return (
    <Shell title={t`Import from ${app}`} sub={t`${item.fileName} · ${date}`} back={back}>
      <section className="edge grid gap-4 rounded-xl bg-plate p-5">
        <div className="grid gap-1">
          <h2 className="text-xl font-medium text-balance">
            {archived
              ? t`This import is archived`
              : plural(counts?.added ?? 0, { one: "Imported # card", other: "Imported # cards" })}
          </h2>
          <p className="text-base text-text-2 text-pretty">
            {archived ? (
              <Trans>
                Its cards and the decks it made are hidden. Restore brings them back with their
                history.
              </Trans>
            ) : (
              plural(counts?.decks ?? 0, {
                0: "The cards went into decks you already had.",
                one: "They’re in # new deck in Library.",
                other: "They’re in # new decks in Library.",
              })
            )}
          </p>
        </div>
        {counts && !archived && (
          <ul className="grid gap-2">
            {counts.reviews > 0 && (
              <Line tone="good">
                {plural(counts.reviews, {
                  one: "# past review came across.",
                  other: "# past reviews came across.",
                })}
              </Line>
            )}
            {counts.pictures > 0 && (
              <Line tone="good">
                {plural(counts.pictures, {
                  one: "# picture came across.",
                  other: "# pictures came across.",
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
                  one: "# term was already in Lymi and was skipped.",
                  other: "# terms were already in Lymi and were skipped.",
                })}
              </Line>
            )}
            {counts.picturesSkipped > 0 && (
              <Line tone="skip">
                {plural(counts.picturesSkipped, {
                  one: "# picture couldn’t be read and was left out.",
                  other: "# pictures couldn’t be read and were left out.",
                })}
              </Line>
            )}
          </ul>
        )}
        {!archived && <div className="flex flex-wrap gap-2">{openLibrary}</div>}
      </section>

      <section aria-labelledby="undo-import" className="grid gap-2">
        <h2 id="undo-import" className="text-md font-medium">
          {archived ? <Trans>Restore</Trans> : <Trans>Undo this import</Trans>}
        </h2>
        <p className="text-base text-text-2 text-pretty">
          {archived ? (
            <Trans>Brings back every card this import added and the decks it made.</Trans>
          ) : (
            <Trans>
              Archives every card this import added, and each deck it made that has no other cards.
              Nothing is deleted, and you can restore it.
            </Trans>
          )}
        </p>
        {actionError && (
          <p className="text-sm text-danger" role="alert">
            {actionError}
          </p>
        )}
        {archived ? (
          <Button
            variant="secondary"
            className="justify-self-start"
            onClick={onRestore}
            loading={restoring}
          >
            <Trans>Restore import</Trans>
          </Button>
        ) : (
          <Button
            variant="danger"
            className="justify-self-start"
            onClick={onArchive}
            loading={archiving}
          >
            <Archive aria-hidden="true" />
            <Trans>Archive import</Trans>
          </Button>
        )}
      </section>
    </Shell>
  );
}

/** A failed or cancelled import: what happened, and a fresh start. */
export function ImportStoppedView({
  item,
  restart,
  guideUrl,
  onArchive,
  archiving,
  back,
}: {
  item: Import;
  restart: ReactNode;
  guideUrl: string;
  onArchive: () => void;
  archiving?: boolean | undefined;
  back?: ReactNode;
}) {
  const { t, i18n } = useLingui();
  const added = item.counts?.added ?? 0;
  const copy = failureCopy(item.failure, item.source);
  const app = SOURCE_NAMES[item.source];
  return (
    <Shell title={t`Import from ${app}`} sub={item.fileName} back={back}>
      {item.status === "cancelled" ? (
        <ErrorState
          title={t`Import cancelled`}
          body={t`Nothing was added, and the file was deleted.`}
          action={restart}
        />
      ) : (
        <ErrorState
          title={i18n._(copy.title)}
          body={i18n._(copy.body)}
          action={
            <>
              {restart}
              <a
                href={guideUrl}
                className="inline-flex h-10 items-center px-3 text-base font-medium text-text underline underline-offset-4"
              >
                <Trans>Read the guide</Trans>
              </a>
            </>
          }
        />
      )}
      {item.status === "failed" && added > 0 && !item.archivedAt && (
        <section className="edge grid gap-2 rounded-xl bg-plate p-5">
          <p className="text-base text-text-2">
            {plural(added, {
              one: "# card was added before the import stopped.",
              other: "# cards were added before the import stopped.",
            })}
          </p>
          <Button
            variant="danger"
            className="justify-self-start"
            onClick={onArchive}
            loading={archiving}
          >
            <Archive aria-hidden="true" />
            <Trans>Archive them</Trans>
          </Button>
        </section>
      )}
    </Shell>
  );
}
