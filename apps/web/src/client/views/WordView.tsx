import { type CardPatch, deserializeState, type FsrsCard, retrievability } from "@lymi/core";
import type { Card, CardState, Review } from "@lymi/core/schema";
import { clsx } from "clsx";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  FolderInput,
  MoreHorizontal,
  Pencil,
  Volume2,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button, IconButton } from "../components/Button";
import { languageName } from "../components/DeckFields";
import { Field, Input, Textarea } from "../components/Field";
import { Menu, MenuItem, MenuList, MenuSeparator, MenuTrigger } from "../components/Menu";
import { Sheet } from "../components/Sheet";
import type { CardEvent } from "../lib/api";

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

const actorName: Record<CardEvent["actor"], string> = {
  user: "you",
  api: "the API",
  mcp: "a connected app",
  ai: "the AI",
  system: "Lymi",
};

const fieldName: Record<string, string> = {
  term: "the word",
  meaning: "the meaning",
  pronunciation: "the pronunciation",
  example: "the example",
  notes: "the notes",
  language: "the language",
  tags: "the tags",
  directions: "how it is asked",
};

/** An audit line as the history reads it: "Added · by a connected app". */
export function describeEvent(e: CardEvent): WordEvent {
  const at = new Date(e.at);
  const who = actorName[e.actor] ?? e.actor;
  const payload =
    e.payload && typeof e.payload === "object" ? (e.payload as Record<string, unknown>) : {};
  const fields = Object.keys(payload)
    .filter((k) => k in fieldName)
    .map((k) => fieldName[k]);
  const list =
    fields.length > 1
      ? `${fields.slice(0, -1).join(", ")} and ${fields.at(-1)}`
      : (fields[0] ?? "");
  if (e.action === "create") {
    const from = payload.meaningSource === "lesson" ? " · meaning from the lesson" : "";
    return { at, label: "Added", detail: `by ${who}${from}` };
  }
  if (e.action === "update") {
    if ("deckId" in payload) return { at, label: "Moved", detail: `to another deck, by ${who}` };
    if (e.actor === "ai")
      return { at, label: "Enriched", detail: `the AI wrote ${list || "a field"}` };
    return { at, label: "Edited", detail: list ? `${list}, by ${who}` : `by ${who}` };
  }
  if (e.action === "archive") return { at, label: "Archived", detail: `by ${who}` };
  if (e.action === "restore") return { at, label: "Restored", detail: `by ${who}` };
  return { at, label: e.action, detail: `by ${who}` };
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

const gradeName: Record<number, string> = { 1: "Forgot", 2: "Hard", 3: "Good", 4: "Easy" };
const stateName: Record<number, string> = {
  0: "New",
  1: "Learning",
  2: "Known",
  3: "Relearning",
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

const day = (d: Date) =>
  d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

function dueLabel(due: Date, now = Date.now()): string {
  const days = Math.round((due.getTime() - now) / 86_400_000);
  if (due.getTime() <= now || days < 1) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days < 30) return `Due in ${days} days`;
  const months = Math.round(days / 30);
  return `Due in ${months} ${months === 1 ? "month" : "months"}`;
}

function spanLabel(days: number): string {
  if (days < 1) return "within the day";
  if (days === 1) return "a day";
  if (days < 30) return `${days} days`;
  const months = Math.round(days / 30);
  return `${months} ${months === 1 ? "month" : "months"}`;
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
        aria-label={`Edit ${label.toLowerCase()}`}
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
  const schedules = (states?.length ? states : state ? [state] : []).map((st) => ({
    st,
    fsrs: readFsrs(st),
  }));
  const asked = schedules.length > 1;
  const readOnly = !onSave;
  // Reviews and writes in one order, newest first, so a fresh edit sits above older reviews.
  const timeline = [
    ...(reviews ?? []).map((r) => ({
      kind: "review" as const,
      key: `r-${r.id}`,
      at: new Date(r.reviewedAt),
      rating: r.rating,
      label: "",
      detail: `${asked ? `${r.direction} · ` : ""}${
        r.elapsedDays === 0 && r.state === 0 ? "first time" : `after ${spanLabel(r.elapsedDays)}`
      }${r.scheduledDays > 0 ? `, next in ${spanLabel(r.scheduledDays)}` : ", back within the day"}`,
    })),
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
      ? "The AI wrote this"
      : s === "manual"
        ? "You wrote this"
        : s === "lesson"
          ? "From the lesson"
          : undefined;

  const ai = (s: Card["meaningSource"]) => (s === "ai" ? "border-dashed border-edge-2" : "");

  const walk = (
    <>
      <IconButton label="Previous word" size="sm" onClick={onPrev} aria-disabled={!hasPrev}>
        <ArrowUp />
      </IconButton>
      <IconButton label="Next word" size="sm" onClick={onNext} aria-disabled={!hasNext}>
        <ArrowDown />
      </IconButton>
    </>
  );

  return (
    <article
      className={clsx(
        "@container flex min-w-0 flex-col gap-6",
        variant === "page" ? "px-5 pb-safe-nav pt-3 @3xl:px-8 @3xl:pt-6" : "",
      )}
    >
      <div className="flex min-h-10 items-center justify-between gap-2">
        {variant === "page" ? (
          <button
            type="button"
            onClick={onBack}
            className="-ml-1 inline-flex min-h-10 items-center gap-0.5 pr-2 text-sm text-muted hoverable:hover:text-text"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            {deckName}
          </button>
        ) : (
          <span className="truncate text-sm text-muted">{deckName}</span>
        )}
        <div className="flex items-center gap-1">
          {walk}
          <Menu>
            <MenuTrigger>
              {(p) => (
                <IconButton label="Word options" size="sm" {...p}>
                  <MoreHorizontal />
                </IconButton>
              )}
            </MenuTrigger>
            <MenuList>
              <MenuItem icon={<Pencil />} onSelect={() => startEditing()} disabled={readOnly}>
                Edit
              </MenuItem>
              <MenuItem
                icon={<FolderInput />}
                onSelect={() => setMoving(true)}
                disabled={!onMove || elsewhere.length === 0}
              >
                Move to…
              </MenuItem>
              <MenuSeparator />
              <MenuItem icon={<Archive />} tone="danger" onSelect={onArchive} disabled={!onArchive}>
                Archive
              </MenuItem>
            </MenuList>
          </Menu>
          {variant === "panel" && (
            <IconButton label="Close" size="sm" onClick={onClose}>
              <X />
            </IconButton>
          )}
        </div>
      </div>

      <header className="grid gap-1.5">
        <h1 className="flex min-w-0 items-center gap-3 text-3xl font-medium leading-[1.05] tracking-[-0.03em]">
          <span className="min-w-0 break-words" lang={card.language ?? undefined}>
            {card.term}
          </span>
          {onPlayAudio && card.language && (
            <IconButton
              label={`Say ${card.term}`}
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
          {[card.language ? languageName(card.language) : null, card.source ?? deckName]
            .filter(Boolean)
            .join(" · ")}
          {schedules.length > 0 &&
            ` · asked by ${schedules.map((x) => x.st.direction).join(" and ")}`}
        </p>
      </header>

      {editing ? (
        <div className="grid gap-4">
          <Field label="Meaning" aside={source(card.meaningSource)}>
            <Input
              ref={meaningRef}
              key={`m-${card.id}`}
              defaultValue={card.meaning ?? ""}
              onBlur={(e) => commit("meaning", card.meaning)(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setEditing(false);
              }}
              className={ai(card.meaningSource)}
              placeholder="What it means"
            />
          </Field>
          <Field label="Example" aside={source(card.exampleSource)}>
            <Textarea
              ref={exampleRef}
              key={`e-${card.id}`}
              defaultValue={card.example ?? ""}
              onBlur={(e) => commit("example", card.example)(e.target.value)}
              className={clsx("min-h-[68px]", ai(card.exampleSource))}
              placeholder="A sentence it lives in"
              rows={2}
            />
          </Field>
          <Field label="Notes">
            <Textarea
              ref={notesRef}
              key={`n-${card.id}`}
              defaultValue={card.notes ?? ""}
              onBlur={(e) => commit("notes", card.notes)(e.target.value)}
              placeholder="Anything to remember it by"
              rows={2}
            />
          </Field>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setEditing(false)}>
              <Check aria-hidden="true" />
              Done
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          <ReadField
            label="Meaning"
            aside={source(card.meaningSource)}
            value={card.meaning}
            placeholder="Add a meaning"
            onEdit={readOnly ? undefined : () => startEditing("meaning")}
          />
          <ReadField
            label="Example"
            aside={source(card.exampleSource)}
            value={card.example}
            placeholder="Add a sentence it lives in"
            onEdit={readOnly ? undefined : () => startEditing("example")}
          />
          <ReadField
            label="Notes"
            value={card.notes}
            placeholder="Anything to remember it by"
            onEdit={readOnly ? undefined : () => startEditing("notes")}
          />
        </div>
      )}

      <Sheet open={moving} onOpenChange={setMoving} title={`Move “${card.term}” to`}>
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
      </Sheet>

      <section className="grid gap-4 border-t border-edge pt-5">
        <h2 className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Right now</h2>
        {schedules.length === 0 && (
          <p className="text-sm text-text-2">Not asked yet. It joins the next review.</p>
        )}
        {schedules.map(({ st, fsrs }) => {
          const recall = fsrs ? retrievability(fsrs) : 0;
          const label = stateName[st.state] ?? "New";
          return (
            <div key={st.id} className="grid gap-3">
              {asked && (
                <h3 className="text-sm font-medium capitalize text-text-2">{st.direction}</h3>
              )}
              {fsrs ? (
                <>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 @sm:grid-cols-4">
                    <div className="grid gap-0.5">
                      <dd className="text-lg font-medium tracking-[-0.01em]">{label}</dd>
                      <dt className="text-xs text-muted">
                        {fsrs.reps} {fsrs.reps === 1 ? "review" : "reviews"}
                        {fsrs.lapses > 0 &&
                          `, ${fsrs.lapses} ${fsrs.lapses === 1 ? "lapse" : "lapses"}`}
                      </dt>
                    </div>
                    <div className="grid gap-0.5">
                      <dd className="text-lg font-medium tracking-[-0.01em]">
                        {dueLabel(new Date(st.due))}
                      </dd>
                      <dt className="text-xs text-muted">
                        {fsrs.scheduled_days > 0
                          ? `scheduled after ${spanLabel(fsrs.scheduled_days)}`
                          : "still in its first steps"}
                      </dt>
                    </div>
                    <div className="grid gap-0.5">
                      <dd className="text-lg font-medium tracking-[-0.01em] tabular-nums">
                        {Math.round(recall * 100)}%
                      </dd>
                      <dt className="text-xs text-muted">would come back right now</dt>
                    </div>
                    <div className="grid gap-0.5">
                      <dd className="text-lg font-medium tracking-[-0.01em] tabular-nums">
                        {spanLabel(Math.round(fsrs.stability))}
                      </dd>
                      <dt className="text-xs text-muted">
                        stability · difficulty {fsrs.difficulty.toFixed(1)}
                      </dt>
                    </div>
                  </dl>
                  <p className="text-sm text-text-2">
                    {st.state === 2
                      ? "Known means the gaps between reviews are weeks or months now. A Forgot brings it back to the short steps."
                      : st.state === 0
                        ? "New means it has not been asked yet. It joins the next review."
                        : "Learning means the interval is still short. Grade it Good a couple more times and it becomes known, with reviews weeks apart."}
                  </p>
                </>
              ) : (
                <p className="text-sm text-text-2">Not asked yet. It joins the next review.</p>
              )}
            </div>
          );
        })}
      </section>

      {(reviews || events) && (
        <section className="grid gap-2 border-t border-edge pt-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xs font-medium uppercase tracking-[0.06em] text-muted">History</h2>
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
                <span className="text-text-2 tabular-nums">{day(item.at)}</span>
                <span className="min-w-0">
                  {item.kind === "review" ? (
                    <span className="mr-2 inline-flex items-center gap-2 font-medium">
                      <GradeMark rating={item.rating} />
                      {gradeName[item.rating] ?? item.rating}
                    </span>
                  ) : (
                    <span className="mr-2 inline-flex items-center gap-2 text-text-2">
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
            {timeline.length === 0 && <li className="py-2 text-sm text-muted">Nothing yet.</li>}
          </ol>
        </section>
      )}
    </article>
  );
}
