import {
  type Announcements,
  type CollisionDetection,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Check, Lock, MapPin, MoreHorizontal, PencilLine, Plus, Settings2 } from "lucide-react";
import { type ButtonHTMLAttributes, type ReactNode, useMemo, useRef, useState } from "react";
import { Button, IconButton } from "../components/button";
import { StateIcon, stateMarks } from "../components/state-mark";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import type { Section, Sections } from "../lib/api";
import {
  type DeckGroup,
  type DeckRow,
  type DeckSort,
  dueBucket,
  rowState,
  splitForms,
} from "../lib/deck-list";

const DAY = 86_400_000;

const startOfDay = (at: number) => {
  const d = new Date(at);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

/** When one card is back, by calendar day: "later today", "tomorrow", "in 12 days". */
function backLabel(locale: string, due: number, now: number): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const days = Math.round((startOfDay(due) - startOfDay(now)) / DAY);
  if (days < 30) return rtf.format(Math.max(days, 0), "day");
  return rtf.format(Math.round(days / 30), "month");
}

/** The id a section's heading carries, so Go to can scroll to it. */
export const sectionAnchor = (sectionId: string) => `section-${sectionId}`;

/** What the deck's owner can do to its sections from the list. */
export interface SectionEditing {
  onRename: (section: Section) => void;
  onAddCard: (section: Section) => void;
  /** Deck settings, where sections are ordered and archived. */
  onManage: () => void;
  /** A drop of cards on a section, or on the cards without one. */
  onDropCards: (cardIds: string[], section: Section | null) => void;
}

export interface GlossaryProps {
  groups: DeckGroup[];
  sort: DeckSort;
  openId: string | null;
  onOpen: (id: string | null) => void;
  now: number;
  /** Where the learner is, when the deck opens its sections in order. */
  progress?: Sections["progress"] | undefined;
  /** Start a ready or locked section. */
  onStart?: ((section: Section) => void) | undefined;
  /** Present for the owner. */
  editing?: SectionEditing | undefined;
  /** Drag cards and sections. Only while the list shows every section, unfiltered. */
  movable?: boolean | undefined;
  /** Rows show a checkbox and a press selects instead of opening. */
  selection?:
    | { ids: ReadonlySet<string>; onToggle: (id: string, range: boolean) => void }
    | undefined;
}

const GROUP = "group:";
const CARD = "card:";

/**
 * The words as a glossary: each row the state's mark, the term with its other forms lighter, and
 * the meaning, which drops under the term when the list is narrow. Text wraps because it is the
 * content, up to three lines of term and two of meaning; the open card holds the rest. Under the Section sort each section is a heading; a section that is
 * not open yet still lists its cards, quieter and marked with a lock, so the learner can read
 * what is coming.
 */
export function Glossary(props: GlossaryProps) {
  const { movable, editing } = props;
  if (!movable || !editing) return <GroupList {...props} />;
  return <MovableGlossary {...props} editing={editing} />;
}

function MovableGlossary(props: GlossaryProps & { editing: SectionEditing }) {
  const { t } = useLingui();
  const { groups, editing, selection } = props;
  const [activeId, setActiveId] = useState<string | null>(null);
  const dropped = useRef(false);

  const rows = useMemo(
    () => new Map(groups.flatMap((g) => g.rows).map((r) => [r.card.id, r])),
    [groups],
  );
  const sections = useMemo(
    () =>
      new Map(
        groups.flatMap((g) =>
          g.kind === "section" && g.section ? [[g.section.id, g.section]] : [],
        ),
      ),
    [groups],
  );

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // A long press, so a swipe still scrolls the deck on a phone.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  // A card lands in whichever section the pointer is over, the whole block of it counting.
  const overSection: CollisionDetection = (args) => {
    const within = pointerWithin(args);
    return within.length > 0 ? within : rectIntersection(args);
  };

  const moving = (cardId: string) => (selection?.ids.has(cardId) ? [...selection.ids] : [cardId]);
  const place = (id: string) => {
    const sectionId = id.slice(GROUP.length);
    return sectionId ? (sections.get(sectionId)?.name ?? "") : t`No section`;
  };
  const term = (id: string) => rows.get(id.slice(CARD.length))?.card.term ?? "";

  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      const name = term(String(active.id));
      return t`Picked up ${name}.`;
    },
    onDragOver: ({ active, over }) => {
      if (!over) return undefined;
      const name = term(String(active.id));
      const where = place(String(over.id));
      return t`${name} is over ${where}.`;
    },
    onDragEnd: ({ active, over }) => {
      const name = term(String(active.id));
      if (!over) return t`${name} is back where it was.`;
      const where = place(String(over.id));
      return t`Dropped ${name} at ${where}.`;
    },
    onDragCancel: ({ active }) => {
      const name = term(String(active.id));
      return t`${name} is back where it was.`;
    },
  };

  const onDragStart = ({ active }: DragStartEvent) =>
    setActiveId(String(active.id).slice(CARD.length));

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;
    dropped.current = true;
    window.setTimeout(() => {
      dropped.current = false;
    }, 0);
    const target = String(over.id).slice(GROUP.length);
    const cardIds = moving(String(active.id).slice(CARD.length)).filter(
      (cardId) => (rows.get(cardId)?.card.sectionId ?? "") !== target,
    );
    if (cardIds.length === 0) return;
    editing.onDropCards(cardIds, target ? (sections.get(target) ?? null) : null);
  };

  const activeRow = activeId ? rows.get(activeId) : undefined;
  const count = activeRow ? moving(activeRow.card.id).length : 0;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={overSection}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
      accessibility={{ announcements }}
    >
      <GroupList {...props} dropped={dropped} />
      {/* No drop animation: the card is already in its new place, so the copy just goes. */}
      <DragOverlay dropAnimation={null}>
        {activeRow ? (
          <div className="flex h-full w-full origin-left scale-[1.02] cursor-grabbing items-center gap-3 rounded-lg bg-plate px-4 edge-2 @xl/list:px-5">
            <StateIcon state={rowState(activeRow)} className="size-[15px] shrink-0" />
            <span
              className="min-w-0 truncate text-lg font-medium text-text"
              lang={activeRow.card.language ?? undefined}
            >
              {splitForms(activeRow.card.term).word}
            </span>
            {activeRow.card.meaning && (
              <span className="min-w-0 flex-1 truncate text-md text-text-2">
                {activeRow.card.meaning}
              </span>
            )}
            {count > 1 && (
              <span className="ms-auto shrink-0 rounded-full bg-amber-tint px-2 text-sm font-medium tabular-nums text-amber-tint-ink">
                {count}
              </span>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function GroupList({
  groups,
  sort,
  openId,
  onOpen,
  now,
  progress,
  onStart,
  editing,
  movable,
  selection,
  dropped,
}: GlossaryProps & { dropped?: { current: boolean } | undefined }) {
  const { t, i18n } = useLingui();

  const heading = (group: DeckGroup): string | null => {
    switch (group.kind) {
      case "all":
        return null;
      case "section":
        return group.section?.name ?? t`No section`;
      case "due":
        return {
          now: t`Due now`,
          week: t`This week`,
          later: t`Later`,
          new: t`Not started`,
        }[group.bucket];
      case "day": {
        const days = Math.round((startOfDay(now) - group.day.getTime()) / DAY);
        if (days === 0) return t`Today`;
        if (days === 1) return t`Yesterday`;
        const sameYear = group.day.getFullYear() === new Date(now).getFullYear();
        return i18n.date(group.day, {
          day: "numeric",
          month: "long",
          ...(sameYear ? {} : { year: "numeric" }),
        });
      }
    }
  };

  return (
    <div className="@container/list grid">
      {groups.map((group) => {
        const label = heading(group);
        const section = group.kind === "section" ? group.section : null;
        const body = (
          <>
            {section?.status === "ready" && onStart && (
              <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-plate-2 px-4 py-3">
                <p className="min-w-0 flex-1 basis-48 text-base text-text-2">
                  <Trans>
                    <span className="font-medium text-text">{section.name} is ready.</span> Start it
                    to review its cards.
                  </Trans>
                </p>
                <Button size="sm" onClick={() => onStart(section)}>
                  <Trans>Start {section.name}</Trans>
                </Button>
              </div>
            )}
            {label && (
              <SectionHeading
                label={label}
                count={group.rows.length}
                section={section}
                here={!!progress && !!section && section.id === progress.currentId}
                onStart={onStart}
                editing={editing}
              />
            )}
            {group.rows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-edge-2 px-5 py-4 text-base text-muted">
                {movable ? (
                  <Trans>No cards yet. Drag cards here, or select cards and move them.</Trans>
                ) : (
                  <Trans>No cards yet.</Trans>
                )}
              </p>
            ) : (
              <ul
                className={clsx(
                  "edge divide-y divide-edge overflow-hidden rounded-lg bg-plate",
                  section && section.status !== "open" && "bg-plate/60",
                )}
              >
                {group.rows.map((row) => {
                  const rowProps: RowProps = {
                    row,
                    sort,
                    now,
                    open: row.card.id === openId,
                    onOpen,
                    waiting: !!section && section.status !== "open" && rowState(row) === "new",
                    selection,
                  };
                  return movable ? (
                    <DraggableRow key={row.card.id} {...rowProps} dropped={dropped} />
                  ) : (
                    <li key={row.card.id}>
                      <GlossaryRow {...rowProps} />
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        );
        if (group.kind === "section" && movable) {
          return (
            <DropGroup key={group.key} sectionId={section?.id ?? ""} label={label ?? ""}>
              {body}
            </DropGroup>
          );
        }
        return (
          <section key={group.key} className="grid" aria-label={label ?? undefined}>
            {body}
          </section>
        );
      })}
    </div>
  );
}

/** A section's cards, or the cards without one, as one place to drop a card. */
function DropGroup({
  sectionId,
  label,
  children,
}: {
  sectionId: string;
  label: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver, active } = useDroppable({ id: `${GROUP}${sectionId}` });
  return (
    <section
      ref={setNodeRef}
      aria-label={label}
      className={clsx(
        "-mx-2 grid rounded-xl px-2 pb-2 transition-[background-color] duration-150 ease-out motion-reduce:transition-none",
        !!active && isOver && "bg-plate-2",
      )}
    >
      {children}
    </section>
  );
}

function SectionHeading({
  label,
  count,
  section,
  here,
  onStart,
  editing,
}: {
  label: string;
  count: number;
  section: Section | null;
  here: boolean;
  onStart?: ((section: Section) => void) | undefined;
  editing?: SectionEditing | undefined;
}) {
  const { t, i18n } = useLingui();
  const locked = !!section && section.status !== "open";
  const sectionName = section?.name ?? "";
  return (
    <div className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 px-1 pt-6 pb-2">
      {locked && <Lock className="size-4 shrink-0 text-muted" aria-hidden="true" />}
      <h2
        id={section ? sectionAnchor(section.id) : undefined}
        tabIndex={section ? -1 : undefined}
        className={clsx(
          "flex min-w-0 scroll-mt-6 items-baseline gap-2 text-md font-medium focus-visible:outline-offset-4",
          locked ? "text-text-2" : "text-text",
        )}
      >
        {/* A lesson named by a long source keeps two lines, so its count stays beside it. */}
        <span className="line-clamp-2 min-w-0 text-balance [overflow-wrap:anywhere]">{label}</span>
        {locked && <span className="sr-only">{t`, not open yet`}</span>}
        {/* Read as "Lesson 14, 4" rather than "Lesson 144". */}
        <span className="sr-only">, </span>
        <span className="shrink-0 text-sm font-normal text-muted">{i18n.number(count)}</span>
      </h2>
      {here && (
        // Green, not amber: it says where the learner is and asks for nothing.
        <span className="inline-flex h-6 items-center gap-1 rounded-full bg-good ps-1.5 pe-2.5 text-sm font-medium text-canvas">
          <MapPin className="size-3.5" aria-hidden="true" />
          <Trans>You are here</Trans>
        </span>
      )}
      <span className="flex-1" />
      {section?.status === "locked" && onStart && (
        <Button size="sm" variant="ghost" className="text-text-2" onClick={() => onStart(section)}>
          <Trans>Start anyway</Trans>
        </Button>
      )}
      {section && editing && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <IconButton size="sm" label={t`Options for ${sectionName}`}>
                <MoreHorizontal />
              </IconButton>
            }
          />
          <DropdownMenuContent aria-label={t`Options for ${sectionName}`} align="end">
            <DropdownMenuItem onClick={() => editing.onAddCard(section)}>
              <Plus />
              <Trans>Add card here</Trans>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editing.onRename(section)}>
              <PencilLine />
              <Trans>Rename</Trans>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={editing.onManage}>
              <Settings2 />
              <Trans>Arrange sections</Trans>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

interface RowProps {
  row: DeckRow;
  sort: DeckSort;
  now: number;
  open: boolean;
  onOpen: (id: string | null) => void;
  /** In a section that is not open, and not started: it is not in review yet. */
  waiting: boolean;
  selection?: GlossaryProps["selection"];
}

function DraggableRow({
  dropped,
  ...props
}: RowProps & { dropped?: { current: boolean } | undefined }) {
  const drag = useDraggable({ id: `${CARD}${props.row.card.id}` });
  // A card moves from the keyboard through selection and its menu, so Enter and Space still open it.
  const { onKeyDown: _keys, ...pointer } = drag.listeners ?? {};
  return (
    <li
      ref={drag.setNodeRef}
      className={clsx("[-webkit-touch-callout:none]", drag.isDragging && "opacity-40")}
    >
      <GlossaryRow
        {...props}
        buttonProps={{
          ...pointer,
          onClickCapture: (e) => {
            if (dropped?.current) {
              e.preventDefault();
              e.stopPropagation();
            }
          },
        }}
      />
    </li>
  );
}

function GlossaryRow({
  row,
  sort,
  now,
  open,
  onOpen,
  waiting,
  selection,
  buttonProps,
}: RowProps & { buttonProps?: ButtonHTMLAttributes<HTMLButtonElement> | undefined }) {
  const { t, i18n } = useLingui();
  const { card, state } = row;
  const { word, forms } = splitForms(card.term);
  const bucket = sort === "due" ? dueBucket(row, now) : null;
  const date =
    state && (bucket === "week" || bucket === "later")
      ? backLabel(i18n.locale, new Date(state.due).getTime(), now)
      : null;
  const key = rowState(row);
  const selected = !!selection?.ids.has(card.id);
  const columns =
    sort === "due"
      ? "grid-cols-[15px_minmax(0,1fr)_auto] @xl/list:grid-cols-[15px_minmax(0,1fr)_minmax(0,1.15fr)_8rem]"
      : "grid-cols-[15px_minmax(0,1fr)] @xl/list:grid-cols-[15px_minmax(0,1fr)_minmax(0,1.15fr)]";

  return (
    <button
      type="button"
      data-card-row={card.id}
      {...buttonProps}
      onClick={(e) => {
        if (selection) selection.onToggle(card.id, e.shiftKey);
        else onOpen(open ? null : card.id);
      }}
      aria-current={(!selection && open) || undefined}
      aria-pressed={selection ? selected : undefined}
      className={clsx(
        "grid w-full items-start gap-x-3 gap-y-0.5 px-4 py-3 text-start transition-colors duration-150 focus-visible:outline-offset-[-2px] @xl/list:items-baseline @xl/list:gap-x-5 @xl/list:px-5",
        columns,
        selected || (open && !selection) ? "bg-hover" : "hoverable:hover:bg-plate-2",
      )}
    >
      <span className="row-span-2 mt-[3px] self-start @xl/list:row-span-1">
        {selection ? (
          // The same 15 px as the state's mark it stands in for, so choosing cards moves nothing.
          <span
            aria-hidden="true"
            className={clsx(
              "grid size-[15px] place-items-center rounded-[4px] border-[1.5px] transition-colors duration-150 ease-out motion-reduce:transition-none",
              selected ? "border-text bg-text text-canvas" : "border-edge-2 bg-plate",
            )}
          >
            {selected && <Check className="size-[11px]" strokeWidth={3} />}
          </span>
        ) : waiting ? (
          <Lock className="size-[15px] text-faint" aria-hidden="true" />
        ) : (
          <StateIcon state={key} className="size-[15px]" />
        )}
        <span className="sr-only">
          {waiting ? t`Not in review yet` : i18n._(stateMarks[key].label)}
        </span>
      </span>
      <span
        className={clsx(
          "hyphenate col-start-2 row-start-1 line-clamp-3 text-lg font-medium leading-snug [overflow-wrap:anywhere]",
          waiting ? "text-text-2" : "text-text",
        )}
        lang={card.language ?? undefined}
      >
        {word}
        {forms && (
          <span className="font-normal text-text-2">
            {" · "}
            {forms}
          </span>
        )}
      </span>
      <span
        className={clsx(
          "hyphenate col-start-2 row-start-2 line-clamp-2 text-md leading-snug [overflow-wrap:anywhere] @xl/list:col-start-3 @xl/list:row-start-1",
          !card.meaning ? "text-faint" : waiting ? "text-muted" : "text-text-2",
        )}
      >
        {card.meaning ?? <Trans>No meaning yet</Trans>}
      </span>
      {date && (
        <span className="col-start-3 row-start-1 whitespace-nowrap text-end text-sm text-muted @xl/list:col-start-4">
          {date}
        </span>
      )}
    </button>
  );
}
