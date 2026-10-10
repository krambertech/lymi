import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ImportSource, MAX_IMPORT_BYTES } from "@lymi/core";
import { clsx } from "clsx";
import {
  Archive,
  Check,
  ChevronLeft,
  CircleCheck,
  CircleMinus,
  FileUp,
  RotateCcw,
} from "lucide-react";
import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "../components/button";
import { Chip } from "../components/chip";
import { LanguageField } from "../components/deck-fields";
import { ErrorState } from "../components/empty-state";
import {
  type Choices,
  FieldsDialog,
  failureCopy,
  fileSize,
  LanguagesDialog,
  languagesLine,
  type NoteType,
  noteTypeName,
  SampleCard,
  SOURCE_NAMES,
  type Summary,
} from "../components/import-parts";
import { InlineError } from "../components/inline-error";
import { type Back, Screen } from "../components/layout/screen";
import { Progress } from "../components/progress";
import { Skeleton } from "../components/skeleton";
import { Checkbox } from "../components/ui/checkbox";
import { Field, FieldLabel } from "../components/ui/field";
import type { Import, ImportPreview } from "../lib/api";
import { splitNoteTypes } from "../lib/import-note-types";
import type { UploadState } from "../lib/import-uploads";

const ACCEPT: Record<ImportSource, string> = {
  anki: ".apkg,.colpkg",
  mochi: ".mochi",
  lymi: ".zip",
};
const FILE_NAME: Record<ImportSource, RegExp> = {
  anki: /\.(apkg|colpkg)$/i,
  mochi: /\.mochi$/i,
  lymi: /\.zip$/i,
};

function Shell({
  title,
  sub,
  back,
  children,
}: {
  title: string;
  sub?: ReactNode;
  back?: Back | undefined;
  children: ReactNode;
}) {
  return (
    <Screen title={title} sub={sub} width="md" back={back} backOnDesktop={!!back}>
      <div className="grid gap-6">{children}</div>
    </Screen>
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
  back?: Back | undefined;
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
        ? t`This isn’t a .mochi file. Choose the file you exported from Mochi.`
        : source === "lymi"
          ? t`This isn’t a .zip file. Choose the file you exported from Lymi.`
          : t`This isn’t an .apkg or .colpkg file. Choose the file you exported from Anki.`
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
        {source === "lymi" ? (
          <Trans>
            Import decks from another Lymi account, with their pictures, tags and review history.
            Cards keep their due dates.
          </Trans>
        ) : (
          <Trans>
            Import your decks with their pictures, tags and review history. Cards keep their due
            dates, and {app} is unchanged.
          </Trans>
        )}
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
            ) : source === "lymi" ? (
              <Trans>A .zip file, up to 1 GB. You can also drop it here.</Trans>
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
          <p className="text-sm" role="alert">
            <InlineError>{message}</InlineError>
          </p>
        )}
      </section>

      <section aria-labelledby="export-steps" className="grid gap-3">
        <h2 id="export-steps" className="text-md font-medium">
          <Trans>Exporting from {app}</Trans>
        </h2>
        <ol className="grid gap-3 text-base text-text-2">
          {(source === "mochi" ? MOCHI_STEPS : source === "lymi" ? LYMI_STEPS : ANKI_STEPS).map(
            (step, i) => (
              <li key={step.id} className="grid grid-cols-[26px_1fr] gap-3">
                <span
                  aria-hidden="true"
                  className="edge grid size-[26px] place-items-center rounded-full bg-plate-2 text-xs font-semibold text-text tabular-nums"
                >
                  {i + 1}
                </span>
                <span className="pt-0.5 text-pretty">{step.node}</span>
              </li>
            ),
          )}
        </ol>
        <a
          href={guideUrl}
          className="justify-self-start text-base font-medium text-text underline underline-offset-4"
        >
          {source !== "anki" ? (
            <Trans>Stuck? Read the guide</Trans>
          ) : (
            <Trans>On a phone, or stuck? Read the guide</Trans>
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
        To export every deck at once, open{" "}
        <strong className="font-medium text-text">Settings</strong> and choose{" "}
        <strong className="font-medium text-text">Export everything</strong> instead.
      </Trans>
    ),
  },
  { id: "save", node: <Trans>Save the .mochi file, then choose it here.</Trans> },
];

const LYMI_STEPS = [
  {
    id: "open",
    node: (
      <Trans>
        In the other account, open a deck’s menu and choose{" "}
        <strong className="font-medium text-text">Export</strong>, or choose{" "}
        <strong className="font-medium text-text">Export library</strong> in Settings.
      </Trans>
    ),
  },
  {
    id: "format",
    node: (
      <Trans>
        Choose <strong className="font-medium text-text">Lymi file</strong>, then download the .zip
        when it’s ready.
      </Trans>
    ),
  },
  { id: "save", node: <Trans>Sign in here and choose that file, without unzipping it.</Trans> },
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
  back?: Back | undefined;
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
            <Trans>The upload stopped partway</Trans>
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
            <p className="text-sm" role="alert">
              <InlineError>{refused}</InlineError>
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
      ? t`You can close Lymi now. Your decks appear in Library when the import finishes.`
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
            <p className="flex-1 text-sm" role="alert">
              <InlineError>{upload.error}</InlineError>
            </p>
            <Button variant="primary" onClick={onRetryUpload}>
              <RotateCcw data-icon="inline-start" aria-hidden="true" />
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

type Step =
  | { id: "decks" }
  | { id: "languages" }
  | { id: "card"; type: NoteType }
  | { id: "summary" };

/** Each step's question, focused when the step opens so a screen reader starts there. */
function Question({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="grid gap-2">
      <h2
        data-step-question
        tabIndex={-1}
        className="text-xl font-medium tracking-[-0.01em] text-balance outline-none"
      >
        {title}
      </h2>
      {children && <p className="max-w-[60ch] text-base text-text-2 text-pretty">{children}</p>}
    </div>
  );
}

/** A step's actions, with Back beside them rather than above the question. */
function StepActions({
  onBack,
  note,
  children,
}: {
  onBack?: (() => void) | undefined;
  note?: ReactNode;
  children: ReactNode;
}) {
  const back = (className: string, variant: "secondary" | "ghost") =>
    onBack && (
      <Button
        variant={variant}
        size={variant === "secondary" ? "lg" : "md"}
        className={className}
        onClick={onBack}
      >
        <ChevronLeft data-icon="inline-start" className="rtl:-scale-x-100" aria-hidden="true" />
        <Trans>Back</Trans>
      </Button>
    );
  return (
    <div className="grid gap-2 border-t border-edge pt-5">
      <div className="flex gap-2">
        {back("max-sm:hidden", "secondary")}
        {/* Two answers share the row evenly and stack once a translation can't fit side by side. */}
        <div className="flex min-w-0 flex-1 flex-wrap gap-2 *:min-w-fit *:flex-[1_1_calc(50%-0.25rem)]">
          {children}
        </div>
      </div>
      {note && <div className="text-center text-sm text-muted text-pretty">{note}</div>}
      {back("justify-self-center sm:hidden", "ghost")}
    </div>
  );
}

/** What the import keeps and what it leaves, one plain line each. */
function ImportLines({
  item,
  summary,
  preview,
  known,
}: {
  item: Import;
  summary: Summary;
  preview: ImportPreview;
  known: number;
}) {
  const app = SOURCE_NAMES[item.source];
  // New Mochi cards with no side break; the adapter names their kind by this key.
  const oneSided = preview.addedByNoteType["content:one"] ?? 0;
  return (
    <ul className="grid gap-2.5">
      {known > 0 && (
        <Line tone="good">
          {plural(known, {
            one: `# card you know in ${app} comes in as Known, so it doesn’t start over.`,
            other: `# cards you know in ${app} come in as Known, so they don’t start over.`,
          })}
        </Line>
      )}
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
          {item.source !== "anki" ? (
            <Trans>This file has no review history, so every card starts as new.</Trans>
          ) : (
            <Trans>
              This file has no review history, so every card starts as new. To keep your progress,
              export again with Include Scheduling Information ticked.
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
            one: "# card was in an earlier import. Only its empty fields are filled.",
            other: "# cards were in an earlier import. Only their empty fields are filled.",
          })}
        </Line>
      )}
      {preview.duplicates > 0 && (
        <Line tone="skip">
          <details className="group">
            <summary className="cursor-pointer list-none underline-offset-4 hoverable:hover:underline [&::-webkit-details-marker]:hidden">
              {plural(preview.duplicates, {
                one: "# card is already in your decks, so it’s skipped.",
                other: "# cards are already in your decks, so they’re skipped.",
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
          {item.source === "lymi"
            ? plural(preview.archived, {
                one: "# archived card arrives archived.",
                other: "# archived cards arrive archived.",
              })
            : item.source === "mochi"
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
            other: "# cards have text that’s too long, so part of it moves to notes or is cut.",
          })}
        </Line>
      )}
      {preview.audio > 0 && (
        <Line tone="skip">
          {plural(preview.audio, {
            one: "# sound is skipped. Lymi reads terms aloud itself.",
            other: "# sounds are skipped. Lymi reads terms aloud itself.",
          })}
        </Line>
      )}
      {oneSided > 0 && (
        <Line tone="skip">
          {plural(oneSided, {
            one: "# card has no --- line, so it’s imported with a term and no meaning.",
            other: "# cards have no --- line, so they’re imported with a term and no meaning.",
          })}
        </Line>
      )}
      {preview.unsupported + preview.skipped > 0 && (
        <Line tone="skip">
          {item.source !== "anki"
            ? plural(preview.skipped, {
                one: "# card has no term, so it’s skipped.",
                other: "# cards have no term, so they’re skipped.",
              })
            : plural(preview.unsupported + preview.skipped, {
                one: "# note is image occlusion or has no term, so it’s skipped.",
                other: "# notes are image occlusion or have no term, so they’re skipped.",
              })}
        </Line>
      )}
    </ul>
  );
}

/**
 * The preview, one question per screen: which decks, what language when the cards didn't say,
 * whether each kind of card looks right, then what the import brings with the button that
 * starts it. A step with nothing to ask is skipped. docs/design/imports.md.
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
  back?: Back | undefined;
}) {
  const { t, i18n } = useLingui();
  const [at, setAt] = useState(0);
  const [showRest, setShowRest] = useState(false);
  const [fieldsFor, setFieldsFor] = useState<NoteType>();
  const [languagesOpen, setLanguagesOpen] = useState(false);
  const app = SOURCE_NAMES[item.source];
  const leftOut = new Set(choices.skipDecks);
  const chosenDecks = summary.decks.filter((d) => !leftOut.has(d.key));
  // Asked about only when neither the file, the deck's name nor its cards gave a language,
  // judged by what Lymi found so the step doesn't vanish while the learner answers it.
  const unplaced = chosenDecks.filter((d) => (summary.languages[d.key] ?? null) === null);
  const { asked, rest } = useMemo(() => splitNoteTypes(summary.noteTypes), [summary.noteTypes]);
  const restNotes = rest.reduce((sum, type) => sum + type.notes, 0);
  const steps: Step[] = [
    ...(summary.decks.length > 1 ? [{ id: "decks" } as const] : []),
    ...(unplaced.length > 0 ? [{ id: "languages" } as const] : []),
    ...(showRest ? [...asked, ...rest] : asked).map((type) => ({ id: "card", type }) as const),
    { id: "summary" },
  ];
  const step = steps[Math.min(at, steps.length - 1)] as Step;
  const next = () => setAt((i) => Math.min(i + 1, steps.length - 1));
  const goBack = at > 0 ? () => setAt(at - 1) : undefined;
  const known = chosenDecks.reduce((sum, d) => sum + (d.known ?? 0), 0);

  const opened = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs on each new step.
  useEffect(() => {
    if (!opened.current) {
      opened.current = true;
      return;
    }
    window.scrollTo({ top: 0 });
    document.querySelector<HTMLElement>("[data-step-question]")?.focus({ preventScroll: true });
  }, [at]);

  return (
    <Shell
      title={t`Import from ${app}`}
      sub={t`${item.fileName} · ${fileSize(item.byteSize, i18n.locale)}`}
      back={back}
    >
      {step.id === "decks" && (
        <DecksStep
          decks={summary.decks}
          skipDecks={choices.skipDecks}
          onSkipDecks={(skipDecks) => onChoices({ ...choices, skipDecks })}
          onNext={next}
        />
      )}

      {step.id === "languages" && (
        <>
          <Question
            title={plural(unplaced.length, {
              one: "What language is this deck in?",
              other: "What language are these decks in?",
            })}
          >
            <Trans>
              Lymi couldn’t tell from the cards. It uses the language to find cards you already have
              and to read terms aloud.
            </Trans>
          </Question>
          <div className="edge grid gap-5 rounded-xl bg-plate p-5">
            {unplaced.map((deck) => (
              <LanguageField
                key={deck.key}
                label={deck.name.split("::").join(" / ")}
                description={plural(deck.cards, { one: "# card", other: "# cards" })}
                value={choices.languages[deck.key] ?? null}
                onChange={(value) =>
                  onChoices({ ...choices, languages: { ...choices.languages, [deck.key]: value } })
                }
              />
            ))}
          </div>
          <StepActions onBack={goBack}>
            <Button variant="primary" size="lg" onClick={next}>
              <Trans>Continue</Trans>
            </Button>
          </StepActions>
        </>
      )}

      {step.id === "card" && (
        <CardStep
          key={step.type.key}
          source={item.source}
          type={step.type}
          samples={preview?.samples[step.type.key]}
          loading={previewLoading}
          error={previewError}
          tail={
            step.type === asked.at(-1) && !showRest && rest.length > 0 ? (
              <div className="-mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-text-2">
                <p className="text-pretty">
                  {plural(restNotes, {
                    one: "# more note of a less common kind is imported as it is.",
                    other: "# more notes of less common kinds are imported as they are.",
                  })}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ms-3"
                  onClick={() => {
                    setShowRest(true);
                    next();
                  }}
                >
                  <Trans>Check those too</Trans>
                </Button>
              </div>
            ) : null
          }
          onChangeFields={() => setFieldsFor(step.type)}
          onBack={goBack}
          onNext={next}
        />
      )}

      {step.id === "summary" && (
        <>
          <Question
            title={
              preview && preview.added === 0 && preview.existing > 0
                ? plural(preview.existing, {
                    one: "Ready to update # card",
                    other: "Ready to update # cards",
                  })
                : plural(preview?.added ?? 0, {
                    one: "Ready to import # card",
                    other: "Ready to import # cards",
                  })
            }
          />
          <div className="edge grid grid-cols-3 rounded-xl bg-plate">
            <Figure value={preview?.added} label={t`cards`} loading={previewLoading} />
            <Figure value={known} label={t`known`} loading={false} />
            <Figure value={preview?.reviews} label={t`past reviews`} loading={previewLoading} />
          </div>
          {previewError && (
            <p className="text-sm" role="alert">
              <InlineError>{previewError}</InlineError>
            </p>
          )}
          {preview && <ImportLines item={item} summary={summary} preview={preview} known={known} />}
          <div className="edge grid rounded-xl bg-plate">
            {summary.decks.length > 1 && (
              <AnswerRow
                title={t`Decks`}
                changeLabel={t`Change decks`}
                detail={
                  leftOut.size === 0
                    ? plural(summary.decks.length, { other: "All # decks" })
                    : plural(summary.decks.length, { other: `${chosenDecks.length} of # decks` })
                }
                onChange={() => setAt(steps.findIndex((s) => s.id === "decks"))}
              />
            )}
            <AnswerRow
              title={t`Languages`}
              changeLabel={t`Change languages`}
              detail={languagesLine(chosenDecks, choices.languages, i18n.locale, t`No language`)}
              onChange={() => setLanguagesOpen(true)}
            />
            <AnswerRow
              title={t`Cards`}
              changeLabel={t`Check the cards again`}
              detail={
                asked.length > 1 ? plural(asked.length, { other: "# kinds checked" }) : t`Checked`
              }
              onChange={() => setAt(steps.findIndex((s) => s.id === "card"))}
            />
          </div>
          <StepActions
            onBack={goBack}
            note={
              confirmError ? (
                <p role="alert">
                  <InlineError>{confirmError}</InlineError>
                </p>
              ) : (
                <Trans>You can undo the whole import later from Activity.</Trans>
              )
            }
          >
            <Button
              variant="primary"
              size="lg"
              loading={confirming}
              aria-disabled={previewLoading && !preview}
              onClick={() => {
                if (preview) onConfirm();
              }}
            >
              {preview && preview.added === 0 && preview.existing > 0
                ? plural(preview.existing, { one: "Update # card", other: "Update # cards" })
                : plural(preview?.added ?? 0, { one: "Import # card", other: "Import # cards" })}
            </Button>
          </StepActions>
          <Button
            variant="ghost"
            className="-mt-4 justify-self-center"
            onClick={onCancel}
            loading={cancelling}
          >
            <Trans>Cancel import</Trans>
          </Button>
        </>
      )}

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
        }}
      />
      <LanguagesDialog
        source={item.source}
        key={languagesOpen ? "languages-open" : "languages"}
        decks={chosenDecks}
        languages={choices.languages}
        open={languagesOpen}
        onOpenChange={setLanguagesOpen}
        onSave={(languages) => onChoices({ ...choices, languages })}
      />
    </Shell>
  );
}

/** Which of the file's decks come into Lymi, for a collection that holds decks the learner no longer uses. */
function DecksStep({
  decks,
  skipDecks,
  onSkipDecks,
  onNext,
}: {
  decks: Summary["decks"];
  skipDecks: string[];
  onSkipDecks: (skipDecks: string[]) => void;
  onNext: () => void;
}) {
  const { t, i18n } = useLingui();
  const [error, setError] = useState(false);
  const left = new Set(skipDecks);
  const chosen = decks.filter((d) => !left.has(d.key));
  const cards = chosen.reduce((sum, d) => sum + d.cards, 0);
  const set = (next: Set<string>) => {
    onSkipDecks(decks.filter((d) => next.has(d.key)).map((d) => d.key));
    setError(false);
  };
  const count = (n: number) => new Intl.NumberFormat(i18n.locale).format(n);
  return (
    <>
      <Question title={t`Which decks do you want in Lymi?`}>
        <Trans>
          Leave out the ones you don’t use anymore. You can import them from the same file later.
        </Trans>
      </Question>
      <div className="grid gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="-ms-3 justify-self-start"
          onClick={() => set(left.size === 0 ? new Set(decks.map((d) => d.key)) : new Set())}
        >
          {left.size === 0 ? <Trans>Clear all</Trans> : <Trans>Select all</Trans>}
        </Button>
        <ul className="edge grid rounded-xl bg-plate p-1.5">
          {decks.map((deck) => {
            const known = deck.known ?? 0;
            return (
              <li key={deck.key}>
                <Field
                  orientation="horizontal"
                  className="relative min-h-12 cursor-pointer rounded-md px-2.5 py-1.5 transition-[background-color] duration-150 hoverable:hover:veil"
                >
                  <Checkbox
                    className="z-1"
                    checked={!left.has(deck.key)}
                    onCheckedChange={(on) => {
                      const next = new Set(left);
                      if (on) next.delete(deck.key);
                      else next.add(deck.key);
                      set(next);
                    }}
                  />
                  <span className="grid min-w-0 flex-1">
                    {/* Stretched over the row, so the whole row ticks the box. */}
                    <FieldLabel className="truncate text-base font-normal after:absolute after:inset-0 after:content-['']">
                      {deck.name.split("::").join(" / ")}
                    </FieldLabel>
                    <span className="text-sm text-muted">
                      {known === 0
                        ? plural(deck.cards, { one: "# card", other: "# cards" })
                        : known >= deck.cards
                          ? plural(deck.cards, {
                              one: "# card, known",
                              other: "# cards, all known",
                            })
                          : plural(deck.cards, {
                              one: `# card · ${count(known)} known`,
                              other: `# cards · ${count(known)} known`,
                            })}
                    </span>
                  </span>
                </Field>
              </li>
            );
          })}
        </ul>
      </div>
      <StepActions
        note={
          error ? (
            <p role="alert">
              <InlineError>{t`Choose at least one deck.`}</InlineError>
            </p>
          ) : (
            plural(cards, {
              one: `# card in ${chosen.length} of ${decks.length} decks`,
              other: `# cards in ${chosen.length} of ${decks.length} decks`,
            })
          )
        }
      >
        <Button
          variant="primary"
          size="lg"
          onClick={() => (chosen.length === 0 ? setError(true) : onNext())}
        >
          <Trans>Continue</Trans>
        </Button>
      </StepActions>
    </>
  );
}

/** One kind of card, drawn the way it will arrive, asking whether it looks right. */
function CardStep({
  source,
  type,
  samples,
  loading,
  error,
  tail,
  onChangeFields,
  onBack,
  onNext,
}: {
  source: ImportSource;
  type: NoteType;
  samples: ImportPreview["samples"][string] | undefined;
  loading: boolean;
  error?: string | undefined;
  tail: ReactNode;
  onChangeFields: () => void;
  onBack?: (() => void) | undefined;
  onNext: () => void;
}) {
  const { i18n } = useLingui();
  const [index, setIndex] = useState(0);
  const list = samples ?? [];
  const sample = list[index % Math.max(list.length, 1)];
  return (
    <>
      <Question title={<Trans>Does this card look right?</Trans>}>
        <Trans>
          This is how it will look in Lymi. Change fields if a part is in the wrong place.
        </Trans>
      </Question>
      <div className="edge grid gap-4 rounded-xl bg-plate p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Chip>
            {noteTypeName(type, i18n)} ·{" "}
            {source !== "anki"
              ? plural(type.notes, { one: "# card", other: "# cards" })
              : plural(type.notes, { one: "# note", other: "# notes" })}
          </Chip>
          {list.length > 1 && (
            <button
              type="button"
              className="text-sm text-muted underline-offset-4 hoverable:hover:text-text hoverable:hover:underline"
              onClick={() => setIndex(index + 1)}
            >
              <Trans>Show another</Trans>
            </button>
          )}
        </div>
        <SampleCard sample={sample} loading={loading} />
      </div>
      {error && (
        <p className="text-sm" role="alert">
          <InlineError>{error}</InlineError>
        </p>
      )}
      {tail}
      <StepActions onBack={onBack}>
        <Button variant="secondary" size="lg" onClick={onChangeFields}>
          <Trans>Change fields</Trans>
        </Button>
        <Button variant="primary" size="lg" onClick={onNext}>
          <Check data-icon="inline-start" aria-hidden="true" />
          <Trans>Looks right</Trans>
        </Button>
      </StepActions>
    </>
  );
}

/** One answer on the last screen, with the way back to change it. */
function AnswerRow({
  title,
  detail,
  changeLabel,
  onChange,
}: {
  title: string;
  detail: string;
  changeLabel: string;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-edge">
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="text-sm text-muted">{title}</span>
        <span className="truncate text-base text-text">{detail}</span>
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="-me-2"
        aria-label={changeLabel}
        onClick={onChange}
      >
        <Trans>Change</Trans>
      </Button>
    </div>
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
  back?: Back | undefined;
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
          <p className="text-sm" role="alert">
            <InlineError>{actionError}</InlineError>
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
            <Archive data-icon="inline-start" aria-hidden="true" />
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
  back?: Back | undefined;
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
            <Archive data-icon="inline-start" aria-hidden="true" />
            <Trans>Archive them</Trans>
          </Button>
        </section>
      )}
    </Shell>
  );
}
