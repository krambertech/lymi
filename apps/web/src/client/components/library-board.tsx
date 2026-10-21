import {
  type Announcements,
  type CollisionDetection,
  closestCorners,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  type UniqueIdentifier,
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
import { useLingui } from "@lingui/react/macro";
import { isolate, unisolate } from "@lymi/core";
import { clsx } from "clsx";
import { type ReactNode, useMemo, useRef, useState } from "react";
import type { DeckSummary, Series } from "../lib/api";
import { useReduceMotion } from "../lib/use-reduce-motion";

/** The id of the decks without a series, which is never a series id. */
export const LOOSE = "loose";

type Containers = Record<string, string[]>;

export interface LibraryBoardProps {
  loose: DeckSummary[];
  series: { series: Series; decks: DeckSummary[] }[];
  /** One deck. `describedBy` names the drag instructions for a screen reader. */
  renderDeck: (deck: DeckSummary, describedBy: string | undefined) => ReactNode;
  /** The heading over a series' decks. */
  renderSeriesHeader: (series: Series, decks: DeckSummary[]) => ReactNode;
  /** What an empty series shows where its decks would be. */
  renderEmptySeries: (series: Series) => ReactNode;
  /** Drawn under a series' plate, tucked beneath its bottom edge, such as its Review. */
  renderSeriesFoot?: ((series: Series, decks: DeckSummary[]) => ReactNode) | undefined;
  /** Where a dragged deck leaves its series when no deck is loose; drawn only during a drag. */
  looseTarget?: ReactNode | undefined;
  /** A series' whole deck list after a drop into it. Absent, nothing can be dragged. */
  onSetSeriesDecks?: ((seriesId: string, deckIds: string[]) => void) | undefined;
  /** A deck dropped outside every series. */
  onRemoveFromSeries?: ((deckId: string) => void) | undefined;
}

const sameOrder = (a: readonly string[] = [], b: readonly string[] = []) =>
  a.length === b.length && a.every((id, i) => id === b[i]);

const containerOf = (id: UniqueIdentifier, containers: Containers) =>
  String(id) in containers
    ? String(id)
    : Object.keys(containers).find((key) => containers[key]?.includes(String(id)));

/**
 * Library's decks, which the learner's own can be dragged into, out of and along a series. A deck
 * without a series has no order to change, so the loose list takes drops without making room.
 * Menus do the same moves without a pointer: Move to series on a deck, Edit series on a series.
 */
export function LibraryBoard({
  loose,
  series,
  renderDeck,
  renderSeriesHeader,
  renderEmptySeries,
  renderSeriesFoot,
  looseTarget,
  onSetSeriesDecks,
  onRemoveFromSeries,
}: LibraryBoardProps) {
  const { t } = useLingui();
  const reduce = useReduceMotion();
  const movable = !!onSetSeriesDecks && !!onRemoveFromSeries;
  const instructions = "library-drag-instructions";

  const decks = useMemo(
    () => new Map([...loose, ...series.flatMap((g) => g.decks)].map((d) => [d.id, d])),
    [loose, series],
  );
  const given = useMemo<Containers>(
    () => ({
      [LOOSE]: loose.map((d) => d.id),
      ...Object.fromEntries(series.map((g) => [g.series.id, g.decks.map((d) => d.id)])),
    }),
    [loose, series],
  );
  const names = useMemo(
    () => new Map<string, string>(series.map((g) => [g.series.id, g.series.name])),
    [series],
  );

  const [drag, setDrag] = useState<{
    id: string;
    from: string;
    items: Containers;
    looseLast: boolean;
  } | null>(null);
  // A drop holds its result until the cache catches up, so the deck never flicks back for a frame.
  const [held, setHeld] = useState<{ over: Containers; items: Containers } | null>(null);
  const items = drag?.items ?? (held?.over === given ? held.items : given);
  // Fixed for a drag, so the drop target out of a series never jumps under the pointer.
  const looseLast = drag ? drag.looseLast : series.length > 0 && !items[LOOSE]?.length;
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const dropped = useRef(false);
  // Kept past the drop, so the drop animation also knows the keyboard moved the deck.
  const [byKeyboard, setByKeyboard] = useState(false);
  const still = !!reduce || byKeyboard;

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // A long press, so a swipe still scrolls Library on a phone.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    // Space only: Enter keeps opening the deck.
    useSensor(KeyboardSensor, {
      coordinateGetter: (event, args) => {
        // The group around a deck always sits nearest its own deck, so an arrow could never leave it.
        const own = containerOf(args.active, itemsRef.current);
        const all = args.context.droppableContainers;
        const others = {
          ...all,
          get: (id: UniqueIdentifier) => all.get(id),
          getEnabled: () => all.getEnabled().filter((entry) => String(entry.id) !== own),
        } as typeof all;
        return sortableKeyboardCoordinates(event, {
          ...args,
          context: { ...args.context, droppableContainers: others },
        });
      },
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] },
    }),
  );

  // A deck under the pointer beats the group around it, so a drop lands between the right decks.
  const collision: CollisionDetection = (args) => {
    // A keyboard drag has no pointer, so it lands on whatever the moved deck overlaps.
    const within = args.pointerCoordinates ? pointerWithin(args) : rectIntersection(args);
    if (within.length === 0) return closestCorners(args);
    return [...within].sort(
      (a, b) => Number(String(a.id) in items) - Number(String(b.id) in items),
    );
  };

  const placeName = (container: string | undefined) =>
    container && container !== LOOSE ? (names.get(container) ?? "") : t`Library`;
  const nameOf = (id: UniqueIdentifier) => decks.get(String(id))?.name ?? "";

  // Spoken only, so the isolates come off again: they would reach the screen reader and nothing else.
  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      const deck = nameOf(active.id);
      return unisolate(t`Picked up ${{ deck: isolate(deck) }}.`);
    },
    onDragOver: ({ active, over }) => {
      if (!over) return undefined;
      const deck = nameOf(active.id);
      const place = placeName(containerOf(over.id, items));
      return unisolate(t`${{ deck: isolate(deck) }} is over ${place}.`);
    },
    onDragEnd: ({ active, over }) => {
      const deck = nameOf(active.id);
      if (!over) return unisolate(t`${{ deck: isolate(deck) }} is back where it was.`);
      const place = placeName(containerOf(active.id, items));
      return unisolate(t`Dropped ${{ deck: isolate(deck) }} in ${place}.`);
    },
    onDragCancel: ({ active }) => {
      const deck = nameOf(active.id);
      return unisolate(t`${{ deck: isolate(deck) }} is back where it was.`);
    },
  };

  const onDragStart = ({ active, activatorEvent }: DragStartEvent) => {
    setByKeyboard(activatorEvent instanceof KeyboardEvent);
    const from = containerOf(active.id, given);
    if (from) setDrag({ id: String(active.id), from, items: given, looseLast });
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!drag || !over) return;
    const from = containerOf(active.id, drag.items);
    const to = containerOf(over.id, drag.items);
    if (!from || !to || from === to) return;
    const id = String(active.id);
    const target = drag.items[to] ?? [];
    const at = target.indexOf(String(over.id));
    setDrag({
      ...drag,
      items: {
        ...drag.items,
        [from]: (drag.items[from] ?? []).filter((x) => x !== id),
        // Loose decks keep Library's order, so a deck leaving a series joins the end.
        [to]:
          to === LOOSE || at < 0
            ? [...target, id]
            : [...target.slice(0, at), id, ...target.slice(at)],
      },
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const current = drag;
    setDrag(null);
    if (!current || !over) return;
    dropped.current = true;
    window.setTimeout(() => {
      dropped.current = false;
    }, 0);
    const id = String(active.id);
    const to = containerOf(id, current.items);
    if (!to) return;
    let list = current.items[to] ?? [];
    const overIndex = list.indexOf(String(over.id));
    if (to !== LOOSE && overIndex >= 0) list = arrayMove(list, list.indexOf(id), overIndex);
    const final = { ...current.items, [to]: list };

    if (to === current.from && (to === LOOSE || sameOrder(given[to], list))) return;
    setHeld({ over: given, items: final });
    if (to === LOOSE) onRemoveFromSeries?.(id);
    else onSetSeriesDecks?.(to, list);
  };

  const active = drag ? decks.get(drag.id) : undefined;
  const target = drag ? containerOf(drag.id, drag.items) : undefined;

  const list = (container: string, children: ReactNode, empty?: ReactNode) => (
    <Group
      id={container}
      over={!!drag && target === container && drag.from !== container}
      bare={!!empty}
    >
      {empty && <li className="flex min-w-0">{empty}</li>}
      <SortableContext
        id={container}
        items={items[container] ?? []}
        strategy={container === LOOSE ? () => null : verticalListSortingStrategy}
      >
        {children}
      </SortableContext>
    </Group>
  );

  const deckItems = (container: string) =>
    (items[container] ?? []).flatMap((id) => {
      const deck = decks.get(id);
      if (!deck) return [];
      const draggable = movable && deck.role === "owner";
      return [
        <SortableDeck
          key={id}
          id={id}
          disabled={!draggable}
          instant={still}
          onClickCapture={(e) => {
            if (dropped.current) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          {renderDeck(deck, draggable ? instructions : undefined)}
        </SortableDeck>,
      ];
    });

  const looseItems = deckItems(LOOSE);
  // With every deck in a series, the loose list is only a drop target, so it shows only in a drag.
  const looseList =
    looseItems.length > 0 || drag
      ? list(LOOSE, looseItems, looseItems.length === 0 ? looseTarget : undefined)
      : null;
  const body = (
    <div className="grid gap-8">
      {!looseLast && looseList}
      {series.map(({ series: s }) => {
        const groupDecks = (items[s.id] ?? []).flatMap((id) => decks.get(id) ?? []);
        return (
          <section key={s.id} aria-label={s.name} className="grid gap-2">
            {renderSeriesHeader(s, groupDecks)}
            {/* One gapless wrapper either way: a deck dragged into an empty series keeps its drop target, and the foot tucks under the plate. */}
            <div className="grid">
              {groupDecks.length === 0
                ? list(s.id, null, renderEmptySeries(s))
                : list(s.id, deckItems(s.id))}
              {groupDecks.length > 0 && renderSeriesFoot?.(s, groupDecks)}
            </div>
          </section>
        );
      })}
      {looseLast && looseList}
    </div>
  );

  if (!movable) return body;
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDrag(null)}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable: t`To move a deck into or out of a series, press Space, use the arrow keys, and press Space again.`,
        },
      }}
    >
      <p id={instructions} className="sr-only">
        {t`To move a deck into or out of a series, press Space, use the arrow keys, and press Space again.`}
      </p>
      {body}
      <DragOverlay dropAnimation={still ? null : undefined}>
        {active ? (
          <div className="edge-2 flex min-w-0 scale-[1.02] cursor-grabbing overflow-hidden rounded-xl bg-plate">
            {renderDeck(active, undefined)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function Group({
  id,
  over,
  bare,
  children,
}: {
  id: string;
  over: boolean;
  /** No plate of its own, for a drop target that draws its own outline. */
  bare?: boolean | undefined;
  children: ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <ul
      ref={setNodeRef}
      className={clsx(
        "grid rounded-xl transition-[background-color] duration-150",
        !bare && "edge relative z-1 overflow-hidden",
        over ? "bg-plate-2" : !bare && "bg-plate",
      )}
    >
      {children}
    </ul>
  );
}

function SortableDeck({
  id,
  disabled,
  instant,
  onClickCapture,
  children,
}: {
  id: string;
  disabled: boolean;
  instant: boolean;
  onClickCapture: (e: React.MouseEvent) => void;
  children: ReactNode;
}) {
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({
    id,
    disabled,
    ...(instant ? { transition: null } : {}),
  });
  return (
    <li
      ref={setNodeRef}
      // Listeners only: the deck's own link is the focus stop, and its key presses bubble here.
      {...listeners}
      onClickCapture={onClickCapture}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={clsx(
        // A hairline between rows, as on Today.
        "flex min-w-0 border-edge not-first:border-t [-webkit-touch-callout:none]",
        isDragging && "opacity-40",
      )}
    >
      {children}
    </li>
  );
}
