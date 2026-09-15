import {
  type Announcements,
  type CollisionDetection,
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useDndContext,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  GripVertical,
  Lock,
  MoreHorizontal,
  PencilLine,
  Plus,
} from "lucide-react";
import { useReducedMotion } from "motion/react";
import {
  type ButtonHTMLAttributes,
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button, IconButton } from "../components/button";
import { StateIcon, stateMarks } from "../components/state-mark";
import { Checkbox } from "../components/ui/checkbox";
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
  onMove: (section: Section, by: -1 | 1) => void;
  onArchive: (section: Section) => void;
  onAddCard: (section: Section) => void;
  /** A drop of cards on a section, or on the cards without one. */
  onDropCards: (cardIds: string[], section: Section | null) => void;
  onReorder: (sectionIds: string[]) => void;
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
 * the meaning, which drops under the term when the list is narrow. Text wraps and is never cut,
 * because it is the content. Under the Section sort each section is a heading; a section that is
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
  const reduce = useReducedMotion();
  const { groups, editing, selection } = props;
  const [active, setActive] = useState<{ kind: "card" | "section"; id: string } | null>(null);
  const dropped = useRef(false);

  const sectionIds = useMemo(
    () => groups.flatMap((g) => (g.kind === "section" && g.section ? [g.section.id] : [])),
    [groups],
  );
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
    // Only a section's handle takes keys; a card moves from the keyboard through its menu.
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] },
    }),
  );

  const groupsOnly: CollisionDetection = (args) => {
    const containers = args.droppableContainers.filter((c) => String(c.id).startsWith(GROUP));
    const scoped = { ...args, droppableContainers: containers };
    if (String(args.active.id).startsWith(CARD)) {
      const within = args.pointerCoordinates ? pointerWithin(scoped) : rectIntersection(scoped);
      return within.length > 0 ? within : closestCenter(scoped);
    }
    return closestCenter({
      ...scoped,
      droppableContainers: containers.filter((c) => String(c.id) !== GROUP),
    });
  };

  const moving = (cardId: string) => (selection?.ids.has(cardId) ? [...selection.ids] : [cardId]);

  const nameOfGroup = (id: string) => {
    const sectionId = id.slice(GROUP.length);
    return sectionId ? (sections.get(sectionId)?.name ?? "") : t`No section`;
  };
  const nameOfActive = (id: string) =>
    id.startsWith(CARD) ? (rows.get(id.slice(CARD.length))?.card.term ?? "") : nameOfGroup(id);

  const announcements: Announcements = {
    onDragStart: ({ active: a }) => {
      const name = nameOfActive(String(a.id));
      return t`Picked up ${name}.`;
    },
    onDragOver: ({ active: a, over }) => {
      if (!over) return undefined;
      const name = nameOfActive(String(a.id));
      const place = nameOfGroup(String(over.id));
      return t`${name} is over ${place}.`;
    },
    onDragEnd: ({ active: a, over }) => {
      const name = nameOfActive(String(a.id));
      if (!over) return t`${name} is back where it was.`;
      const place = nameOfGroup(String(over.id));
      return t`Dropped ${name} at ${place}.`;
    },
    onDragCancel: ({ active: a }) => {
      const name = nameOfActive(String(a.id));
      return t`${name} is back where it was.`;
    },
  };

  const onDragStart = ({ active: a }: DragStartEvent) => {
    const id = String(a.id);
    setActive(
      id.startsWith(CARD)
        ? { kind: "card", id: id.slice(CARD.length) }
        : { kind: "section", id: id.slice(GROUP.length) },
    );
  };

  const onDragEnd = ({ active: a, over }: DragEndEvent) => {
    setActive(null);
    if (!over) return;
    dropped.current = true;
    window.setTimeout(() => {
      dropped.current = false;
    }, 0);
    const id = String(a.id);
    const target = String(over.id).slice(GROUP.length);
    if (id.startsWith(CARD)) {
      const cardIds = moving(id.slice(CARD.length)).filter(
        (cardId) => (rows.get(cardId)?.card.sectionId ?? "") !== target,
      );
      if (cardIds.length === 0) return;
      editing.onDropCards(cardIds, target ? (sections.get(target) ?? null) : null);
      return;
    }
    const from = sectionIds.indexOf(id.slice(GROUP.length));
    const to = sectionIds.indexOf(target);
    if (from < 0 || to < 0 || from === to) return;
    editing.onReorder(arrayMove(sectionIds, from, to));
  };

  const activeRow = active?.kind === "card" ? rows.get(active.id) : undefined;
  const activeSection = active?.kind === "section" ? sections.get(active.id) : undefined;
  const count = activeRow ? moving(activeRow.card.id).length : 0;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={groupsOnly}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActive(null)}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable: t`To move a section, press Space, use the arrow keys, and press Space again.`,
        },
      }}
    >
      <SortableContext
        items={sectionIds.map((id) => `${GROUP}${id}`)}
        strategy={verticalListSortingStrategy}
      >
        <GroupList {...props} dropped={dropped} />
      </SortableContext>
      <DragOverlay dropAnimation={reduce ? null : undefined}>
        {activeRow ? (
          <div className="edge-2 flex max-w-80 cursor-grabbing items-center gap-2.5 rounded-lg bg-plate px-4 py-3 shadow-lg">
            <StateIcon state={rowState(activeRow)} className="size-[15px]" />
            <span className="truncate text-lg font-medium">{activeRow.card.term}</span>
            {count > 1 && (
              <span className="ms-auto rounded-full bg-plate-2 px-2 text-sm font-medium text-text-2">
                +{count - 1}
              </span>
            )}
          </div>
        ) : activeSection ? (
          <div className="edge-2 flex cursor-grabbing items-center gap-2 rounded-lg bg-plate px-4 py-3 shadow-lg">
            <GripVertical className="size-4 text-muted" aria-hidden="true" />
            <span className="text-md font-medium">{activeSection.name}</span>
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
  const sectionIds = groups.flatMap((g) =>
    g.kind === "section" && g.section ? [g.section.id] : [],
  );

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
        const index = section ? sectionIds.indexOf(section.id) : -1;
        const body = (
          <>
            {section?.status === "ready" && onStart && (
              <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-plate-2 px-4 py-3">
                <p className="min-w-0 flex-1 basis-48 text-base text-text-2">
                  <Trans>
                    <span className="font-medium text-text">{section.name} is ready.</span> Its
                    cards join your reviews once you start it.
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
                first={index === 0}
                last={index === sectionIds.length - 1}
                movable={!!movable && !!section}
              />
            )}
            {group.rows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-edge-2 px-5 py-4 text-base text-muted">
                {movable ? (
                  <Trans>No cards yet. Drag cards here, or select some and move them.</Trans>
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
          return section ? (
            <SortableGroup key={group.key} sectionId={section.id} label={label ?? ""}>
              {body}
            </SortableGroup>
          ) : (
            <LooseGroup key={group.key} label={label ?? ""}>
              {body}
            </LooseGroup>
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

/** A section's cards as one drop target that also sorts among the other sections. */
function SortableGroup({
  sectionId,
  label,
  children,
}: {
  sectionId: string;
  label: string;
  children: ReactNode;
}) {
  const sortable = useSortable({ id: `${GROUP}${sectionId}` });
  const { active } = useDndContext();
  const cardOver = !!active && String(active.id).startsWith(CARD) && sortable.isOver;
  return (
    <section
      ref={sortable.setNodeRef}
      aria-label={label}
      style={{
        transform: CSS.Translate.toString(sortable.transform),
        transition: sortable.transition,
      }}
      className={clsx(
        "-mx-2 grid rounded-xl px-2 pb-2 transition-[background-color] duration-150",
        cardOver && "bg-plate-2",
        sortable.isDragging && "opacity-40",
      )}
    >
      <HandleContext.Provider value={sortable}>{children}</HandleContext.Provider>
    </section>
  );
}

/** The cards without a section, a drop target that never moves. */
function LooseGroup({ label, children }: { label: string; children: ReactNode }) {
  const { setNodeRef, isOver, active } = useDroppable({ id: GROUP });
  const cardOver = !!active && String(active.id).startsWith(CARD) && isOver;
  return (
    <section
      ref={setNodeRef}
      aria-label={label}
      className={clsx(
        "-mx-2 grid rounded-xl px-2 pb-2 transition-[background-color] duration-150",
        cardOver && "bg-plate-2",
      )}
    >
      {children}
    </section>
  );
}

const HandleContext = createContext<ReturnType<typeof useSortable> | null>(null);

function SectionHeading({
  label,
  count,
  section,
  here,
  onStart,
  editing,
  first,
  last,
  movable,
}: {
  label: string;
  count: number;
  section: Section | null;
  here: boolean;
  onStart?: ((section: Section) => void) | undefined;
  editing?: SectionEditing | undefined;
  first: boolean;
  last: boolean;
  movable: boolean;
}) {
  const { t, i18n } = useLingui();
  const handle = useContext(HandleContext);
  const locked = !!section && section.status !== "open";
  const sectionName = section?.name ?? "";
  return (
    <div className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 px-1 pt-6 pb-2">
      {movable && handle && (
        <button
          type="button"
          ref={handle.setActivatorNodeRef}
          {...handle.attributes}
          {...handle.listeners}
          aria-label={t`Move ${sectionName}`}
          className="-ms-2 grid size-8 cursor-grab touch-none place-items-center rounded-md text-faint transition-colors duration-150 hoverable:hover:bg-hover hoverable:hover:text-text-2 active:cursor-grabbing"
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </button>
      )}
      {locked && <Lock className="size-4 shrink-0 text-muted" aria-hidden="true" />}
      <h2
        id={section ? sectionAnchor(section.id) : undefined}
        tabIndex={section ? -1 : undefined}
        className={clsx(
          "min-w-0 scroll-mt-6 text-md font-medium text-balance focus-visible:outline-offset-4",
          locked ? "text-text-2" : "text-text",
        )}
      >
        {label}
        {locked && <span className="sr-only">{t`, not open yet`}</span>}
        {/* Read as "Lesson 14, 4" rather than "Lesson 144". */}
        <span className="sr-only">, </span>
        <span className="ms-2 text-sm font-normal text-muted">{i18n.number(count)}</span>
      </h2>
      {here && (
        <span className="rounded-full bg-plate-2 px-2 py-px text-sm font-medium text-text-2">
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
            <DropdownMenuItem disabled={first} onClick={() => editing.onMove(section, -1)}>
              <ArrowUp />
              <Trans>Move up</Trans>
            </DropdownMenuItem>
            <DropdownMenuItem disabled={last} onClick={() => editing.onMove(section, 1)}>
              <ArrowDown />
              <Trans>Move down</Trans>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => editing.onArchive(section)}>
              <Archive />
              <Trans>Archive section</Trans>
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
  const columns = selection
    ? "grid-cols-[20px_minmax(0,1fr)] @xl/list:grid-cols-[20px_minmax(0,1fr)_minmax(0,1.15fr)]"
    : sort === "due"
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
          <Checkbox
            checked={selected}
            tabIndex={-1}
            aria-hidden="true"
            className="pointer-events-none -mt-0.5"
          />
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
          "col-start-2 row-start-1 text-lg font-medium leading-snug [overflow-wrap:anywhere]",
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
          "col-start-2 row-start-2 text-md leading-snug [overflow-wrap:anywhere] @xl/list:col-start-3 @xl/list:row-start-1",
          !card.meaning ? "text-faint" : waiting ? "text-muted" : "text-text-2",
        )}
      >
        {card.meaning ?? <Trans>No meaning yet</Trans>}
      </span>
      {date && !selection && (
        <span className="col-start-3 row-start-1 whitespace-nowrap text-end text-sm text-muted @xl/list:col-start-4">
          {date}
        </span>
      )}
    </button>
  );
}
