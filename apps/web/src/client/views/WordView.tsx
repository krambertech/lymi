import { i18n as globalI18n, type I18n, type MessageDescriptor } from "@lingui/core";
import { msg, plural } from "@lingui/core/macro";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { type CardPatch, deserializeState, type FsrsCard, type ReviewMode } from "@lymi/core";
import { clsx } from "clsx";
import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  FolderInput,
  Image as ImageIcon,
  type LucideIcon,
  MoreHorizontal,
  Pencil,
  Plus,
  Sparkle,
  Volume2,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button, IconButton } from "../components/Button";
import { CardPicture } from "../components/CardPicture";
import { StateChip } from "../components/Chip";
import { languageName } from "../components/DeckFields";
import { Field, Input, Textarea } from "../components/Field";
import { GRADES, GradeMark, Mark } from "../components/Grade";
import { ReviewTimeline } from "../components/ReviewTimeline";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import type { Card, CardEvent, CardState, Review } from "../lib/api";
import { modeLabel } from "../lib/review-modes";
import { BackButton, TopBar } from "./Shell";

/** A write in the word's history, not a review: what changed, and who changed it. */
export interface WordEvent {
  /** The audit row's id, for a key that survives two writes in the same millisecond. */
  id?: string | undefined;
  at: Date;
  kind: "added" | "edited" | "enriched" | "moved" | "archived" | "restored" | "picture";
  /** "Meaning changed to “snow”". */
  text: string;
  /** "by you". */
  actor: string;
}

export type WordPatch = Pick<
  CardPatch,
  "meaning" | "example" | "notes" | "meaningSource" | "exampleSource"
>;
type EditableField = "meaning" | "example" | "notes";

const actorName: Record<CardEvent["actor"], MessageDescriptor> = {
  user: msg`you`,
  api: msg`the API`,
  mcp: msg`a connected app`,
  ai: msg`the AI`,
  system: msg`Lymi`,
};

const fieldName: Record<string, MessageDescriptor> = {
  term: msg`the term`,
  meaning: msg`the meaning`,
  pronunciation: msg`the pronunciation`,
  example: msg`the example`,
  notes: msg`the notes`,
  language: msg`the language`,
  tags: msg`the tags`,
  directions: msg`how it is asked`,
  reviewModes: msg`how it is asked`,
};

const pictureEvents: Record<string, MessageDescriptor> = {
  set_image: msg`Picture set`,
  update_image: msg`Picture described`,
  archive_image: msg`Picture archived`,
  restore_image: msg`Picture restored`,
};

/** A single short text change names its new value, so the history says what the word became. */
const changedTo: Record<string, (value: string) => MessageDescriptor> = {
  term: (value) => msg`Term changed to “${value}”`,
  meaning: (value) => msg`Meaning changed to “${value}”`,
  pronunciation: (value) => msg`Pronunciation changed to “${value}”`,
  example: (value) => msg`Example changed to “${value}”`,
  notes: (value) => msg`Notes changed to “${value}”`,
};
const QUOTED_MAX = 60;

const eventIcon: Record<WordEvent["kind"], LucideIcon> = {
  added: Plus,
  edited: Pencil,
  enriched: Sparkle,
  moved: FolderInput,
  archived: Archive,
  restored: ArchiveRestore,
  picture: ImageIcon,
};

/** "the meaning, the example and the notes", joined the way the interface language joins. */
function listOf(items: string[], locale: string): string {
  try {
    return new Intl.ListFormat(locale, { type: "conjunction" }).format(items);
  } catch {
    return items.join(", ");
  }
}

/**
 * An audit line as the history reads it: "Meaning changed to “snow”", by you. Runs outside
 * React, so it reads the global i18n; the route recomputes it when the history changes.
 */
export function describeEvent(e: CardEvent, i18n: I18n = globalI18n): WordEvent {
  const base = { id: e.id, at: new Date(e.at) };
  const actor = actorName[e.actor];
  const who = actor ? i18n._(actor) : e.actor;
  const by = i18n._(msg`by ${who}`);
  const payload =
    e.payload && typeof e.payload === "object" ? (e.payload as Record<string, unknown>) : {};
  if (e.action === "create") {
    const text =
      payload.meaningSource === "lesson"
        ? i18n._(msg`Card added, meaning from the lesson`)
        : i18n._(msg`Card added`);
    return { ...base, kind: "added", text, actor: by };
  }
  const picture =
    e.action === "update_image" && payload.description === null
      ? msg`Picture description removed`
      : pictureEvents[e.action];
  if (picture) return { ...base, kind: "picture", text: i18n._(picture), actor: by };
  if (e.action === "archive")
    return { ...base, kind: "archived", text: i18n._(msg`Archived`), actor: by };
  if (e.action === "restore")
    return { ...base, kind: "restored", text: i18n._(msg`Restored`), actor: by };
  if (e.action !== "update") return { ...base, kind: "edited", text: e.action, actor: by };
  if ("deckId" in payload)
    return { ...base, kind: "moved", text: i18n._(msg`Moved to another deck`), actor: by };

  const keys = Object.keys(payload).filter((k) => k in fieldName);
  const list =
    listOf(
      keys.flatMap((k) => {
        const name = fieldName[k];
        return name ? [i18n._(name)] : [];
      }),
      i18n.locale,
    ) || i18n._(msg`a field`);
  if (e.actor === "ai")
    return { ...base, kind: "enriched", text: i18n._(msg`Enriched ${list}`), actor: by };
  const only = keys.length === 1 ? keys[0] : undefined;
  const value = only ? payload[only] : undefined;
  if (only && typeof value === "string" && value.trim()) {
    const next = value.trim();
    if (only === "language") {
      const text = i18n._(msg`Language changed to ${languageName(next, i18n.locale)}`);
      return { ...base, kind: "edited", text, actor: by };
    }
    const message = changedTo[only];
    if (message && next.length <= QUOTED_MAX)
      return { ...base, kind: "edited", text: i18n._(message(next)), actor: by };
  }
  return { ...base, kind: "edited", text: i18n._(msg`Edited ${list}`), actor: by };
}

export interface WordProps {
  card: Card;
  /** The list's leading state. `states` carries every direction when the route has it. */
  state: CardState | null;
  states?: CardState[] | undefined;
  deckName: string;
  /** The modes the card is asked in: its own, or its deck's. */
  modes?: ReviewMode[] | undefined;
  /** Every review, newest first. Absent until the route fetches it. */
  reviews?: Review[] | undefined;
  events?: WordEvent[] | undefined;
  hasPrev?: boolean | undefined;
  hasNext?: boolean | undefined;
  onPrev?: (() => void) | undefined;
  onNext?: (() => void) | undefined;
  /** The phone's back link, to the deck. */
  onBack?: (() => void) | undefined;
  /** The desktop panel's close. */
  onClose?: (() => void) | undefined;
  /** Only the field that changed. Absent, the fields are read-only. */
  onSave?: ((patch: WordPatch) => void) | undefined;
  onArchive?: (() => void) | undefined;
  /** Every deck the word could move to. The menu lists them by name. */
  decks?: { id: string; name: string }[] | undefined;
  onMove?: ((deckId: string) => void) | undefined;
  onPlayAudio?: (() => void) | undefined;
  /** A screen of its own on the phone, or the panel beside the list on desktop. */
  variant: "page" | "panel";
}

/** The FSRS memory model, or null for a state that has none yet. */
function readFsrs(state: CardState | null): FsrsCard | null {
  if (!state) return null;
  try {
    const card = deserializeState(state.fsrs);
    return typeof card.stability === "number" ? card : null;
  } catch {
    return null;
  }
}

/** When a mode is back, as the schedule table says it, with the date once it is days away. */
function nextLabel(i18n: I18n, due: Date, now: Date): { when: string; date?: string } {
  if (due.getTime() <= now.getTime()) return { when: i18n._(msg`Due now`) };
  const days = Math.round((startOfDay(due) - startOfDay(now)) / 86_400_000);
  if (days === 0) return { when: i18n._(msg`Later today`) };
  if (days === 1) return { when: i18n._(msg`Tomorrow`) };
  const date = i18n.date(due, { day: "numeric", month: "short" });
  if (days < 30)
    return { when: i18n._(msg`${plural(days, { one: "In # day", other: "In # days" })}`), date };
  const months = Math.round(days / 30);
  return {
    when: i18n._(msg`${plural(months, { one: "In # month", other: "In # months" })}`),
    date,
  };
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** A stretch of days in words: "a day", "12 days", "3 months". */
function spanLabel(i18n: I18n, days: number): string {
  if (days === 1) return i18n._(msg`a day`);
  if (days < 30) return i18n._(msg`${plural(days, { one: "# day", other: "# days" })}`);
  const months = Math.round(days / 30);
  return i18n._(msg`${plural(months, { one: "# month", other: "# months" })}`);
}

/** How many History rows show before "Show older". */
const HISTORY_ROWS = 8;

/** A field at rest: its label, where it came from, and the text. Press it to edit. */
function ReadField({
  label,
  aside,
  value,
  placeholder,
  onEdit,
}: {
  label: string;
  aside?: ReactNode | undefined;
  value: string | null;
  placeholder: string;
  onEdit?: (() => void) | undefined;
}) {
  const { t, i18n } = useLingui();
  return (
    <div className="grid gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-text-2">{label}</span>
        {aside && <span className="text-xs text-muted">{aside}</span>}
      </div>
      <button
        type="button"
        onClick={onEdit}
        aria-disabled={!onEdit}
        aria-label={t`Edit ${label.toLocaleLowerCase(i18n.locale)}`}
        className={clsx(
          "-mx-2 flex min-h-11 items-center rounded-sm px-2 py-1 text-left text-md leading-relaxed transition-colors",
          onEdit && "hoverable:hover:bg-plate-2",
          value ? "text-text" : "text-faint",
        )}
      >
        {value ?? placeholder}
      </button>
    </div>
  );
}

/**
 * The card's picture and its description. Pictures and picture modes arrive through the API and
 * connected apps, so the page shows them and says what picture review is waiting for.
 */
function PictureSection({ card, modes }: { card: Card; modes?: ReviewMode[] | undefined }) {
  const pictureReview = modes?.some((mode) => mode.cue === "image") ?? false;
  const pictureOnly = pictureReview && (modes?.every((mode) => mode.cue === "image") ?? false);
  const image = card.image;
  if (!image && !pictureReview) return null;
  return (
    <section className="grid gap-2">
      <span className="text-sm font-medium text-text-2">
        <Trans>Picture</Trans>
      </span>
      {/* One plate, so the picture and what it says read as one thing. */}
      <div className="edge grid w-fit max-w-full gap-3 rounded-lg bg-plate p-3">
        {image ? (
          <>
            <CardPicture image={image} maxHeight="min(20dvh, 140px)" />
            {image.description ? (
              // Wraps to the picture's width instead of widening the card.
              <p className="w-0 min-w-full text-sm leading-relaxed text-text">
                {image.description}
              </p>
            ) : (
              <p className="w-0 min-w-full text-sm text-muted">
                {pictureOnly ? (
                  <Trans>
                    No description yet. Picture review waits for one, so this card is asked without
                    its picture.
                  </Trans>
                ) : pictureReview ? (
                  <Trans>
                    No description yet. Picture review waits for one, so this card is asked in its
                    other modes.
                  </Trans>
                ) : (
                  <Trans>No description yet.</Trans>
                )}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted">
            {pictureOnly ? (
              <Trans>This card has no picture yet, so it is asked without one.</Trans>
            ) : (
              <Trans>
                Picture review is on, but this card has no picture. It is asked in its other modes.
              </Trans>
            )}
          </p>
        )}
      </div>
    </section>
  );
}

/**
 * Everything Lymi knows about one word, and its whole life. The fields first, each with where
 * its text came from, and editable in place. Then the schedule as it stands, in words. Then
 * every review the word has had, with the grade and what it did. Nothing about a word is
 * hidden from the person learning it.
 */
export function WordView({
  card,
  state,
  states,
  deckName,
  modes,
  reviews,
  events,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onBack,
  onClose,
  onSave,
  onArchive,
  decks,
  onMove,
  onPlayAudio,
  variant,
}: WordProps) {
  const { t, i18n } = useLingui();
  const now = new Date();
  const schedules = (states?.length ? states : state ? [state] : []).map((st) => ({
    st,
    fsrs: readFsrs(st),
  }));
  const readOnly = !onSave;
  const [olderShown, setOlderShown] = useState(false);
  const firstOlderRef = useRef<HTMLLIElement>(null);
  const focusOlderRef = useRef(false);
  // The button leaves when pressed, so focus moves to the first row it revealed.
  useEffect(() => {
    if (!olderShown || !focusOlderRef.current) return;
    focusOlderRef.current = false;
    firstOlderRef.current?.focus();
  }, [olderShown]);
  const gradeLabel = (rating: number) => {
    const grade = GRADES.find((g) => g.rating === rating);
    return grade ? i18n._(grade.label) : String(rating);
  };
  // Reviews and writes in one order, newest first, so a fresh edit sits above older reviews.
  const history = [
    ...(reviews ?? []).map((r) => {
      const at = new Date(r.reviewedAt);
      const next =
        r.scheduledDays > 0
          ? t`next in ${spanLabel(i18n, r.scheduledDays)}`
          : startOfDay(at) === startOfDay(now)
            ? t`back later today`
            : t`back the same day`;
      return { kind: "review" as const, key: `r-${r.id}`, at, review: r, next };
    }),
    ...(events ?? []).map((e, i) => ({
      kind: "event" as const,
      key: `e-${e.id ?? i}`,
      at: e.at,
      event: e,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
  const shownHistory = olderShown ? history : history.slice(0, HISTORY_ROWS);
  const dayLabel = (d: Date) => {
    const ago = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
    if (ago === 0) return t`Today`;
    if (ago === 1) return t`Yesterday`;
    return i18n.date(d, {
      day: "numeric",
      month: "short",
      ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
    });
  };
  const timelineReviews = (reviews ?? []).map((r) => ({
    id: r.id,
    at: new Date(r.reviewedAt),
    rating: r.rating,
  }));
  const started = schedules.filter(({ st }) => st.state !== 0);
  const elsewhere = (decks ?? []).filter((d) => d.id !== card.deckId);
  // At rest the word reads as a page. Editing is asked for, one field or all of them.
  const [editing, setEditing] = useState(false);
  const [moving, setMoving] = useState(false);
  const focusRef = useRef<EditableField | null>(null);
  const meaningRef = useRef<HTMLInputElement>(null);
  const exampleRef = useRef<HTMLTextAreaElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const startEditing = (field: EditableField = "meaning") => {
    if (readOnly) return;
    focusRef.current = field;
    setEditing(true);
  };
  useEffect(() => {
    if (!editing || !focusRef.current) return;
    const refs = { meaning: meaningRef, example: exampleRef, notes: notesRef };
    const el = refs[focusRef.current].current;
    el?.focus();
    if (el) {
      const n = el.value.length;
      el.setSelectionRange(n, n);
    }
    focusRef.current = null;
  }, [editing]);
  // A field the learner changes is theirs from then on, whatever wrote it before.
  const commit = (key: EditableField, before: string | null) => (v: string) => {
    const next = v.trim();
    if (next === (before ?? "")) return;
    const patch: WordPatch = { [key]: next };
    if (key === "meaning") patch.meaningSource = "manual";
    if (key === "example") patch.exampleSource = "manual";
    onSave?.(patch);
  };

  const source = (s: Card["meaningSource"]) =>
    s === "ai"
      ? t`AI wrote this`
      : s === "manual"
        ? t`You wrote this`
        : s === "lesson"
          ? t`From the lesson`
          : undefined;

  const ai = (s: Card["meaningSource"]) => (s === "ai" ? "border-dashed border-edge-2" : "");

  // The phone's page takes the shared top bar's full-size buttons; the desktop panel stays compact.
  const size = variant === "page" ? "md" : "sm";
  const controls = (
    <>
      <IconButton label={t`Previous card`} size={size} onClick={onPrev} aria-disabled={!hasPrev}>
        <ArrowUp />
      </IconButton>
      <IconButton label={t`Next card`} size={size} onClick={onNext} aria-disabled={!hasNext}>
        <ArrowDown />
      </IconButton>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <IconButton label={t`Card options`} size={size}>
              <MoreHorizontal />
            </IconButton>
          }
        />
        <DropdownMenuContent aria-label={t`Card options`} align="end">
          <DropdownMenuItem onClick={() => startEditing()} disabled={readOnly}>
            <Pencil />
            <Trans>Edit</Trans>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setMoving(true)}
            disabled={!onMove || elsewhere.length === 0}
          >
            <FolderInput />
            <Trans>Move to…</Trans>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={onArchive} disabled={!onArchive}>
            <Archive />
            <Trans>Archive</Trans>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {variant === "panel" && (
        <IconButton label={t`Close`} size="sm" onClick={onClose}>
          <X />
        </IconButton>
      )}
    </>
  );

  return (
    <article
      className={clsx(
        "@container flex min-w-0 flex-col gap-6",
        variant === "page"
          ? "px-5 pb-safe-nav pt-5 @3xl/shell:px-8 @3xl/shell:pb-12 @3xl/shell:pt-8"
          : "",
      )}
    >
      {variant === "page" ? (
        // The article's gap would push the term further from the bar than a page title sits.
        // The page variant is only drawn where the column is narrow, so the bar always shows with it.
        <TopBar
          nested
          className="-mb-4"
          back={<BackButton label={deckName} onClick={onBack} />}
          actions={controls}
        />
      ) : (
        <div className="flex min-h-10 items-center justify-between gap-2">
          <span className="truncate text-sm text-muted">{deckName}</span>
          <div className="flex items-center gap-1">{controls}</div>
        </div>
      )}

      <header className="grid gap-1.5">
        <h1 className="flex min-w-0 items-center gap-3 text-3xl font-medium leading-[1.05] tracking-[-0.03em]">
          <span className="min-w-0 break-words" lang={card.language ?? undefined}>
            {card.term}
          </span>
          {onPlayAudio && card.language && (
            <IconButton
              label={t`Say ${card.term}`}
              variant="secondary"
              round
              size="sm"
              onClick={onPlayAudio}
            >
              <Volume2 />
            </IconButton>
          )}
        </h1>
        {card.pronunciation && <p className="text-md text-muted">{card.pronunciation}</p>}
        <p className="text-sm text-muted">
          {[
            card.language ? languageName(card.language) : null,
            card.source ?? deckName,
            schedules.length > 0
              ? t`asked by ${listOf(
                  schedules.map((x) => i18n._(modeLabel(x.st.mode)).toLocaleLowerCase(i18n.locale)),
                  i18n.locale,
                )}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>

      <PictureSection card={card} modes={modes} />

      {editing ? (
        <div className="grid gap-4">
          <Field label={t`Meaning`} aside={source(card.meaningSource)}>
            <Input
              ref={meaningRef}
              key={`m-${card.id}`}
              defaultValue={card.meaning ?? ""}
              onBlur={(e) => commit("meaning", card.meaning)(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setEditing(false);
              }}
              className={ai(card.meaningSource)}
              placeholder={t`What it means`}
            />
          </Field>
          <Field label={t`Example`} aside={source(card.exampleSource)}>
            <Textarea
              ref={exampleRef}
              key={`e-${card.id}`}
              defaultValue={card.example ?? ""}
              onBlur={(e) => commit("example", card.example)(e.target.value)}
              className={clsx("min-h-[68px]", ai(card.exampleSource))}
              placeholder={t`A sentence it lives in`}
              rows={2}
            />
          </Field>
          <Field label={t`Notes`}>
            <Textarea
              ref={notesRef}
              key={`n-${card.id}`}
              defaultValue={card.notes ?? ""}
              onBlur={(e) => commit("notes", card.notes)(e.target.value)}
              placeholder={t`Anything to remember it by`}
              rows={2}
            />
          </Field>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setEditing(false)}>
              <Check aria-hidden="true" />
              <Trans>Done</Trans>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          <ReadField
            label={t`Meaning`}
            aside={source(card.meaningSource)}
            value={card.meaning}
            placeholder={t`Add a meaning`}
            onEdit={readOnly ? undefined : () => startEditing("meaning")}
          />
          <ReadField
            label={t`Example`}
            aside={source(card.exampleSource)}
            value={card.example}
            placeholder={t`Add a sentence it lives in`}
            onEdit={readOnly ? undefined : () => startEditing("example")}
          />
          <ReadField
            label={t`Notes`}
            value={card.notes}
            placeholder={t`Anything to remember it by`}
            onEdit={readOnly ? undefined : () => startEditing("notes")}
          />
        </div>
      )}

      <Dialog open={moving} onOpenChange={setMoving}>
        <DialogContent className="w-[min(92vw,440px)]">
          <DialogTitle>{t`Move “${card.term}” to`}</DialogTitle>
          <ul className="grid gap-1">
            {elsewhere.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => {
                    setMoving(false);
                    onMove?.(d.id);
                  }}
                  className="edge flex h-12 w-full items-center justify-between gap-3 rounded-md bg-plate px-4 text-left text-base transition-[background-color,box-shadow] duration-150 hoverable:hover:edge-2 hoverable:hover:bg-hover"
                >
                  <span className="truncate font-medium">{d.name}</span>
                  <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      <section className="grid gap-4 border-t border-edge pt-5">
        <h2 className="text-xs font-medium uppercase tracking-[0.06em] text-muted">
          <Trans>Schedule</Trans>
        </h2>
        {started.length === 0 ? (
          <p className="text-sm text-text-2">
            <Trans>Not asked yet. It joins the next review.</Trans>
          </p>
        ) : (
          <>
            {timelineReviews.length > 0 && (
              <ReviewTimeline
                start={new Date(card.createdAt)}
                now={now}
                reviews={timelineReviews}
                dues={started.map(({ st }) => ({ id: st.id, at: new Date(st.due) }))}
              />
            )}
            <table className="w-full border-collapse text-sm tabular-nums">
              <thead>
                <tr className="border-b border-edge text-xs text-muted">
                  <th scope="col" className="pe-3 pb-2 text-start font-medium">
                    <Trans>Mode</Trans>
                  </th>
                  <th scope="col" className="pe-3 pb-2 text-start font-medium">
                    <Trans>Next</Trans>
                  </th>
                  <th scope="col" className="pb-2 text-end font-medium">
                    <Trans>Reviews</Trans>
                  </th>
                </tr>
              </thead>
              <tbody>
                {schedules.map(({ st, fsrs }) => {
                  const next = st.state !== 0 ? nextLabel(i18n, new Date(st.due), now) : null;
                  return (
                    <tr key={st.id} className="border-b border-edge align-top last:border-b-0">
                      <th scope="row" className="py-2.5 pe-3 text-start font-normal">
                        <span className="grid justify-items-start gap-1">
                          <span className="text-base font-medium">
                            {i18n._(modeLabel(st.mode))}
                          </span>
                          <StateChip state={st.state} size="sm" />
                        </span>
                      </th>
                      {next && fsrs ? (
                        <>
                          <td className="py-2.5 pe-3">
                            {next.when}
                            {next.date && <span className="block text-muted">{next.date}</span>}
                          </td>
                          <td className="py-2.5 text-end">
                            {i18n.number(fsrs.reps)}
                            {fsrs.lapses > 0 && (
                              <span className="block text-muted">
                                <Plural
                                  value={fsrs.lapses}
                                  one="Forgot once"
                                  other="Forgot # times"
                                />
                              </span>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2.5 pe-3 text-muted">
                            <Trans>Not started</Trans>
                          </td>
                          <td className="py-2.5 text-end text-muted">{i18n.number(0)}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </section>

      {(reviews || events) && (
        <section className="grid gap-4 border-t border-edge pt-5">
          <h2 className="text-xs font-medium uppercase tracking-[0.06em] text-muted">
            <Trans>History</Trans>
          </h2>
          <ol className="grid gap-3">
            {shownHistory.map((item, i) => (
              <li
                key={item.key}
                ref={i === HISTORY_ROWS ? firstOlderRef : undefined}
                tabIndex={i === HISTORY_ROWS ? -1 : undefined}
                className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-baseline gap-x-2.5 leading-5"
              >
                {item.kind === "review" ? (
                  <GradeMark rating={item.review.rating} className="row-span-2 self-start" />
                ) : (
                  <Mark icon={eventIcon[item.event.kind]} className="row-span-2 self-start" />
                )}
                <p className="min-w-0 break-words text-base">
                  {item.kind === "review" ? (
                    <span className="font-medium">{gradeLabel(item.review.rating)}</span>
                  ) : (
                    <span className="text-text-2">{item.event.text}</span>
                  )}
                </p>
                <span className="whitespace-nowrap text-sm text-muted">{dayLabel(item.at)}</span>
                <p className="col-span-2 col-start-2 text-sm text-muted">
                  {item.kind === "review"
                    ? t`${i18n._(modeLabel(item.review.mode))} · ${item.next}`
                    : item.event.actor}
                </p>
              </li>
            ))}
            {history.length === 0 && (
              <li className="text-sm text-muted">
                <Trans>Nothing yet.</Trans>
              </li>
            )}
          </ol>
          {history.length > HISTORY_ROWS && !olderShown && (
            <button
              type="button"
              onClick={() => {
                focusOlderRef.current = true;
                setOlderShown(true);
              }}
              className="-my-2.5 min-h-11 justify-self-start rounded-xs text-sm text-text-2 underline decoration-edge-2 underline-offset-3 transition-colors hoverable:hover:text-text hoverable:hover:decoration-current"
            >
              <Plural
                value={history.length - HISTORY_ROWS}
                one="Show # older entry"
                other="Show # older entries"
              />
            </button>
          )}
        </section>
      )}
    </article>
  );
}
