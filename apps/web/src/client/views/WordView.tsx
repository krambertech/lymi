import { i18n as globalI18n, type I18n, type MessageDescriptor } from "@lingui/core";
import { msg, plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type CardPatch, deserializeState, type FsrsCard, retrievability } from "@lymi/core";
import { clsx } from "clsx";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  FolderInput,
  MoreHorizontal,
  Pencil,
  Volume2,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button, IconButton } from "../components/Button";
import { directionLabel, languageName } from "../components/DeckFields";
import { Field, Input, Textarea } from "../components/Field";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import type { Card, CardEvent, CardState, Review } from "../lib/api";
import { BackButton, TopBar } from "./Shell";

/** A line in the word's history that is not a review: when it arrived, what the AI added. */
export interface WordEvent {
  /** The audit row's id, for a key that survives two writes in the same millisecond. */
  id?: string | undefined;
  at: Date;
  label: string;
  detail: string;
}

/** The fields the page edits. An emptied field is sent as "", which is what the API accepts. */
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
 * An audit line as the history reads it: "Added · by a connected app". Runs outside React, so it
 * reads the global i18n; the route recomputes it when the history changes.
 */
export function describeEvent(e: CardEvent, i18n: I18n = globalI18n): WordEvent {
  const at = new Date(e.at);
  const actor = actorName[e.actor];
  const who = actor ? i18n._(actor) : e.actor;
  const payload =
    e.payload && typeof e.payload === "object" ? (e.payload as Record<string, unknown>) : {};
  const fields = Object.keys(payload).flatMap((k) => {
    const name = fieldName[k];
    return name ? [i18n._(name)] : [];
  });
  const list = listOf(fields, i18n.locale);
  if (e.action === "create") {
    const detail =
      payload.meaningSource === "lesson"
        ? i18n._(msg`by ${who} · meaning from the lesson`)
        : i18n._(msg`by ${who}`);
    return { at, label: i18n._(msg`Added`), detail };
  }
  if (e.action === "update") {
    if ("deckId" in payload)
      return { at, label: i18n._(msg`Moved`), detail: i18n._(msg`to another deck, by ${who}`) };
    if (e.actor === "ai") {
      const what = list || i18n._(msg`a field`);
      return { at, label: i18n._(msg`Enriched`), detail: i18n._(msg`the AI wrote ${what}`) };
    }
    return {
      at,
      label: i18n._(msg`Edited`),
      detail: list ? i18n._(msg`${list}, by ${who}`) : i18n._(msg`by ${who}`),
    };
  }
  if (e.action === "archive")
    return { at, label: i18n._(msg`Archived`), detail: i18n._(msg`by ${who}`) };
  if (e.action === "restore")
    return { at, label: i18n._(msg`Restored`), detail: i18n._(msg`by ${who}`) };
  return { at, label: e.action, detail: i18n._(msg`by ${who}`) };
}

export interface WordProps {
  card: Card;
  /** The list's leading state. `states` carries every direction when the route has it. */
  state: CardState | null;
  states?: CardState[] | undefined;
  deckName: string;
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

const gradeName: Record<number, MessageDescriptor> = {
  1: msg`Forgot`,
  2: msg`Hard`,
  3: msg`Good`,
  4: msg`Easy`,
};
const stateName: Record<number, MessageDescriptor> = {
  0: msg`New`,
  1: msg`Learning`,
  2: msg`Known`,
  3: msg`Relearning`,
};

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

/** "Due in 3 days", as the interface language says it. Read the message at render time. */
function dueLabel(i18n: I18n, due: Date, now = Date.now()): string {
  const days = Math.round((due.getTime() - now) / 86_400_000);
  if (due.getTime() <= now || days < 1) return i18n._(msg`Due today`);
  if (days === 1) return i18n._(msg`Due tomorrow`);
  if (days < 30)
    return i18n._(msg`${plural(days, { one: "Due in # day", other: "Due in # days" })}`);
  const months = Math.round(days / 30);
  return i18n._(msg`${plural(months, { one: "Due in # month", other: "Due in # months" })}`);
}

/** A stretch of days in words: "a day", "12 days", "3 months". */
function spanLabel(i18n: I18n, days: number): string {
  if (days < 1) return i18n._(msg`within the day`);
  if (days === 1) return i18n._(msg`a day`);
  if (days < 30) return i18n._(msg`${plural(days, { one: "# day", other: "# days" })}`);
  const months = Math.round(days / 30);
  return i18n._(msg`${plural(months, { one: "# month", other: "# months" })}`);
}

/** The mark beside a grade: four tones of ink, full to dashed, so Forgot is never red. */
function GradeMark({ rating }: { rating: number }) {
  return (
    <i
      aria-hidden="true"
      className={clsx(
        "inline-block size-2.5 shrink-0 rounded-full border-[1.5px]",
        rating === 4 && "border-text bg-text",
        rating === 3 && "border-text bg-text/45",
        rating === 2 && "border-text bg-text/15",
        rating === 1 && "border-dashed border-text bg-transparent",
      )}
    />
  );
}

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
  const schedules = (states?.length ? states : state ? [state] : []).map((st) => ({
    st,
    fsrs: readFsrs(st),
  }));
  const asked = schedules.length > 1;
  const readOnly = !onSave;
  // Reviews and writes in one order, newest first, so a fresh edit sits above older reviews.
  const timeline = [
    ...(reviews ?? []).map((r) => {
      const when =
        r.elapsedDays === 0 && r.state === 0
          ? t`first time`
          : t`after ${spanLabel(i18n, r.elapsedDays)}`;
      const then =
        r.scheduledDays > 0
          ? t`next in ${spanLabel(i18n, r.scheduledDays)}`
          : t`back within the day`;
      const direction = directionLabel(r.direction).toLocaleLowerCase(i18n.locale);
      return {
        kind: "review" as const,
        key: `r-${r.id}`,
        at: new Date(r.reviewedAt),
        rating: r.rating,
        label: "",
        detail: asked ? t`${direction} · ${when}, ${then}` : t`${when}, ${then}`,
      };
    }),
    ...(events ?? []).map((e, i) => ({
      kind: "event" as const,
      key: `e-${e.id ?? i}`,
      at: e.at,
      rating: 0,
      label: e.label,
      detail: e.detail,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
  const elsewhere = (decks ?? []).filter((d) => d.id !== card.deckId);
  const gradeLabel = (rating: number) => {
    const name = gradeName[rating];
    return name ? i18n._(name) : String(rating);
  };
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
                  schedules.map((x) =>
                    directionLabel(x.st.direction).toLocaleLowerCase(i18n.locale),
                  ),
                  i18n.locale,
                )}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>

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
          <Trans>Right now</Trans>
        </h2>
        {schedules.length === 0 && (
          <p className="text-sm text-text-2">
            <Trans>Not asked yet. It joins the next review.</Trans>
          </p>
        )}
        {schedules.map(({ st, fsrs }) => {
          const recall = fsrs ? retrievability(fsrs) : 0;
          const label = i18n._(stateName[st.state] ?? msg`New`);
          return (
            <div key={st.id} className="grid gap-3">
              {asked && (
                <h3 className="text-sm font-medium capitalize text-text-2">
                  {directionLabel(st.direction)}
                </h3>
              )}
              {fsrs ? (
                <>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 @sm:grid-cols-4">
                    <div className="grid gap-0.5">
                      <dd className="text-lg font-medium tracking-[-0.01em]">{label}</dd>
                      <dt className="text-xs text-muted">
                        {fsrs.lapses > 0
                          ? t`${plural(fsrs.reps, { one: "# review", other: "# reviews" })}, ${plural(
                              fsrs.lapses,
                              { one: "# lapse", other: "# lapses" },
                            )}`
                          : t`${plural(fsrs.reps, { one: "# review", other: "# reviews" })}`}
                      </dt>
                    </div>
                    <div className="grid gap-0.5">
                      <dd className="text-lg font-medium tracking-[-0.01em]">
                        {dueLabel(i18n, new Date(st.due))}
                      </dd>
                      <dt className="text-xs text-muted">
                        {fsrs.scheduled_days > 0
                          ? t`scheduled after ${spanLabel(i18n, fsrs.scheduled_days)}`
                          : t`still in its first steps`}
                      </dt>
                    </div>
                    <div className="grid gap-0.5">
                      <dd className="text-lg font-medium tracking-[-0.01em] tabular-nums">
                        {i18n.number(recall, { style: "percent", maximumFractionDigits: 0 })}
                      </dd>
                      <dt className="text-xs text-muted">
                        <Trans>would come back right now</Trans>
                      </dt>
                    </div>
                    <div className="grid gap-0.5">
                      <dd className="text-lg font-medium tracking-[-0.01em] tabular-nums">
                        {spanLabel(i18n, Math.round(fsrs.stability))}
                      </dd>
                      <dt className="text-xs text-muted">
                        <Trans>
                          stability · difficulty{" "}
                          {i18n.number(fsrs.difficulty, {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}
                        </Trans>
                      </dt>
                    </div>
                  </dl>
                  <p className="text-sm text-text-2">
                    {st.state === 2
                      ? t`Known means the gaps between reviews are weeks or months now. A Forgot brings it back to the short steps.`
                      : st.state === 0
                        ? t`New means it has not been asked yet. It joins the next review.`
                        : t`Learning means the interval is still short. Grade it Good a couple more times and it becomes known, with reviews weeks apart.`}
                  </p>
                </>
              ) : (
                <p className="text-sm text-text-2">
                  <Trans>Not asked yet. It joins the next review.</Trans>
                </p>
              )}
            </div>
          );
        })}
      </section>

      {(reviews || events) && (
        <section className="grid gap-2 border-t border-edge pt-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xs font-medium uppercase tracking-[0.06em] text-muted">
              <Trans>History</Trans>
            </h2>
            {reviews && reviews.length > 0 && (
              <span className="flex items-center gap-1" aria-hidden="true">
                {[...reviews]
                  .sort(
                    (a, b) => new Date(a.reviewedAt).getTime() - new Date(b.reviewedAt).getTime(),
                  )
                  .slice(-12)
                  .map((r) => (
                    <GradeMark key={r.id} rating={r.rating} />
                  ))}
              </span>
            )}
          </div>
          <ol className="grid">
            {timeline.map((item) => (
              <li
                key={item.key}
                className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-3 py-2 text-sm"
              >
                <span className="text-text-2 tabular-nums">
                  {i18n.date(item.at, { weekday: "short", day: "numeric", month: "short" })}
                </span>
                <span className="min-w-0">
                  {item.kind === "review" ? (
                    <span className="me-2 inline-flex items-center gap-2 font-medium">
                      <GradeMark rating={item.rating} />
                      {gradeLabel(item.rating)}
                    </span>
                  ) : (
                    <span className="me-2 inline-flex items-center gap-2 text-text-2">
                      <i
                        aria-hidden="true"
                        className="inline-block size-2.5 shrink-0 rounded-full border-[1.5px] border-edge-2 bg-plate-2"
                      />
                      {item.label}
                    </span>
                  )}
                  <span className="text-muted">{item.detail}</span>
                </span>
              </li>
            ))}
            {timeline.length === 0 && (
              <li className="py-2 text-sm text-muted">
                <Trans>Nothing yet.</Trans>
              </li>
            )}
          </ol>
        </section>
      )}
    </article>
  );
}
