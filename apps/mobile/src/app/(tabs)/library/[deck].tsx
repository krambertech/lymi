import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { Section } from "@lymi/client/api";
import {
  chosenReview,
  type DeckFilters,
  type DeckGroup,
  type DeckRow,
  type DeckSort,
  deckTags,
  filterRows,
  groupRows,
  liveFilters,
  noFilters,
  rowState,
  splitForms,
  stateKey,
} from "@lymi/client/deck-list";
import { CHOSEN_LIMIT, drawsReadings, termReading } from "@lymi/core";
import { ARRIVE } from "@lymi/design";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { memo, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type FlatList, View } from "react-native";
import Animated, { SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCardMenu } from "../../../card/card-menu";
import { CardPeek, peekHeight, usePeekSize } from "../../../card/card-peek";
import { useDeckExits } from "../../../data/decks";
import { moveBack } from "../../../data/move-undo";
import { useNextDue } from "../../../data/next-due";
import { useDeckCards, useDecks, useSections, useSeriesList } from "../../../data/queries";
import { useMoveNotice, useSeriesActions } from "../../../data/series";
import { useCardBatch, useMoveToDeck } from "../../../deck/card-batch";
import { FilterTools } from "../../../deck/filters";
import { useMoveToSection } from "../../../deck/move-to-section";
import { SelectBox, SelectionToolbar } from "../../../deck/selection";
import { useTagCards } from "../../../deck/tag-cards";
import { ExportSheet } from "../../../export/export-sheet";
import {
  ReadyNote,
  SectionHeading,
  SectionProgress,
  useStartSection,
} from "../../../sections/sections";
import { useOnline } from "../../../streak/goal-picker";
import { captureEvent } from "../../../telemetry/posthog";
import { haptics } from "../../../theme/haptics";
import { springIn, useReduceMotion } from "../../../theme/motion";
import { usePalette, useRoom } from "../../../theme/palette";
import { ActionMenu } from "../../../ui/action-menu";
import { EmptyState } from "../../../ui/empty-state";
import { useFloatingBar } from "../../../ui/floating-bar";
import { Furigana } from "../../../ui/furigana";
import { Icon } from "../../../ui/icons";
import { LoadFailed, useLoadFailed } from "../../../ui/load-failed";
import type { MenuItem } from "../../../ui/menu";
import { OfflineNote } from "../../../ui/offline-note";
import { Button, LIFT, Plate, Press, SectionTitle, Text } from "../../../ui/primitives";
import { RowMenu, type RowMenuItem } from "../../../ui/row-menu";
import { BarButton, Screen } from "../../../ui/screen";
import { Sheet, SheetGroup, SheetRow } from "../../../ui/sheet";
import { Skeleton } from "../../../ui/skeleton";
import { StateIcon, stateMarks } from "../../../ui/state-mark";
import { setDeckReviewHidden, setDeckSelecting } from "../../../ui/tab-bar";
import { toast } from "../../../ui/toast-host";

/** Stable empties, so a deck without sections or cards does not regroup its list on every render. */
const NO_ROWS: DeckRow[] = [];
const NO_SECTIONS: Section[] = [];

/** The list a deck draws: each group's heading, then its words one row at a time. */
type Item =
  | { kind: "heading"; key: string; group: DeckGroup }
  | {
      kind: "row";
      key: string;
      row: DeckRow;
      first: boolean;
      last: boolean;
      dim: boolean;
      /** A new card in a section that isn't open, which review won't show yet. */
      waiting: boolean;
    };

/**
 * A deck: what it wants today and how far along it is, then its words as a glossary, which Filter
 * and Sort narrow and order. Search opens at the foot, as Library's does, for this deck only.
 */
export default function Deck() {
  const { t, i18n } = useLingui();
  const router = useRouter();
  const { deck: id } = useLocalSearchParams<{ deck: string }>();
  const decks = useDecks();
  const deck = decks.data?.find((d) => d.id === id);
  const gone = !!decks.data && !deck;
  const cards = useDeckCards(id);
  const rows = cards.data ?? NO_ROWS;
  const sectionsQuery = useSections(id);
  const sections = sectionsQuery.data?.sections ?? NO_SECTIONS;
  const [filters, setFilters] = useState<DeckFilters>(noFilters);
  const [chosenSort, setSort] = useState<DeckSort | null>(null);
  // A tag renamed or a section deleted while the page is open would leave a filter nothing lists to untick.
  useEffect(() => {
    if (!cards.data || !sectionsQuery.data) return;
    const tagKeys = new Set(deckTags(cards.data).map((tag) => tag.key));
    const sectionIds = new Set(sectionsQuery.data.sections.map((s) => s.id));
    setFilters((f) => liveFilters(f, tagKeys, sectionIds));
  }, [cards.data, sectionsQuery.data]);
  const sort = chosenSort ?? (sections.length ? "section" : "added");
  const groups = useMemo(() => {
    const now = Date.now();
    return groupRows(
      filterRows(rows, filters, "", now, sections),
      sort,
      now,
      i18n.locale,
      sections,
    );
  }, [rows, filters, sort, i18n.locale, sections]);
  const owner = deck?.role === "owner";
  // A deck that opens every section at once has no "where you are" to show.
  const progress =
    deck?.sectionProgression === "open" ? null : (sectionsQuery.data?.progress ?? null);
  const sectionStart = useStartSection(id, sections);
  const exits = useDeckExits(deck);
  const [moving, setMoving] = useState(false);
  const [exporting, setExporting] = useState(false);
  // The cards chosen with Select cards, or null when the list is not choosing.
  const [selected, setSelected] = useState<ReadonlySet<string> | null>(null);
  const moveToSection = useMoveToSection(id);
  const moveToDeck = useMoveToDeck(id);
  const batch = useCardBatch(id);
  const tagCards = useTagCards(id);
  const cardMenu = useCardMenu({
    owner: () => owner,
    moveToSection: moveToSection.canMove ? (c) => () => moveToSection.open([c.id]) : undefined,
    moveToDeck: moveToDeck.canMove ? (c) => () => moveToDeck.open([c.id]) : undefined,
  });
  // Rows keep one menu function, so a render of the page redraws only rows whose card changed.
  const latestMenu = useRef(cardMenu);
  latestMenu.current = cardMenu;
  const menu = useCallback((card: DeckRow["card"]) => latestMenu.current(card), []);
  const menuShape = `${owner} ${moveToSection.canMove} ${moveToDeck.canMove}`;
  const lift = useRoom() === "dark";
  const reduce = useReduceMotion();
  const selection = selected;
  const ordered = useMemo(() => groups.flatMap((g) => g.rows), [groups]);
  const items = useMemo(
    () =>
      groups.flatMap((group): Item[] => {
        const dim = group.kind === "section" && !!group.section && group.section.status !== "open";
        return [
          { kind: "heading", key: `h:${group.key}`, group },
          ...group.rows.map(
            (row, i): Item => ({
              kind: "row",
              key: row.card.id,
              row,
              first: i === 0,
              last: i === group.rows.length - 1,
              dim,
              waiting: dim && rowState(row) === "new",
            }),
          ),
        ];
      }),
    [groups],
  );
  const done = () => setSelected(null);
  const choosing = !!selection;
  // What Review takes from the chosen cards, due ones first, as the web's selection does.
  const reviewable = useMemo(
    () => (selection ? chosenReview(rows, selection, Date.now()) : []),
    [rows, selection],
  );
  const dueChosen = reviewable.filter((r) => r.due).length;
  const reviewChosen = (kind: "due" | "all") => {
    // One review takes at most CHOSEN_LIMIT, and the list is due first, so the cap keeps those.
    const ids = reviewable
      .filter((r) => kind === "all" || r.due)
      .slice(0, CHOSEN_LIMIT)
      .map((r) => r.id);
    done();
    router.push(`/review?deck=${id}&cards=${ids.join(",")}` as Href);
  };
  const unmarked = !!selection && rows.some((r) => selection.has(r.card.id) && !r.card.important);
  const limit = CHOSEN_LIMIT;
  const reviewAll = reviewable.length;
  const selectionActions: MenuItem[][] = selection
    ? [
        [
          ...(dueChosen > 0
            ? [
                {
                  label:
                    dueChosen > limit
                      ? t`Review ${limit} of ${dueChosen} due`
                      : plural(dueChosen, { one: "Review # due", other: "Review # due" }),
                  icon: "play" as const,
                  onSelect: () => reviewChosen("due"),
                },
              ]
            : []),
          // Review all is the same list as Review due when every chosen card is due.
          ...(reviewAll > dueChosen
            ? [
                {
                  label:
                    reviewAll > limit
                      ? t`Review ${limit} of ${reviewAll}`
                      : plural(reviewAll, { one: "Review all #", other: "Review all #" }),
                  icon: "play" as const,
                  onSelect: () => reviewChosen("all"),
                },
              ]
            : []),
        ],
        [
          {
            // Its own message, since Ukrainian and Russian say it of several cards.
            label: unmarked
              ? t({ message: "Mark important", context: "chosen cards" })
              : t({ message: "Unmark important", context: "chosen cards" }),
            icon: "important" as const,
            onSelect: () => {
              const ids = [...selection];
              done();
              void batch.important(ids, unmarked);
            },
          },
        ],
        // Changing the cards themselves stays the owner's.
        ...(owner
          ? [
              [
                {
                  label: t`Tags`,
                  icon: "tags" as const,
                  onSelect: () => tagCards.open([...selection], done),
                },
                ...(moveToSection.canMove
                  ? [
                      {
                        label: t`Move to section`,
                        icon: "section" as const,
                        onSelect: () => moveToSection.open([...selection], done),
                      },
                    ]
                  : []),
                ...(moveToDeck.canMove
                  ? [
                      {
                        label: t`Move to deck`,
                        icon: "deck" as const,
                        onSelect: () => moveToDeck.open([...selection], done),
                      },
                    ]
                  : []),
              ],
              [
                {
                  label: t`Archive`,
                  icon: "archive" as const,
                  destructive: true,
                  onSelect: () => {
                    done();
                    void batch.archive([...selection]);
                  },
                },
              ],
            ]
          : []),
      ].filter((group) => group.length > 0)
    : [];
  useEffect(() => {
    setDeckSelecting(id, choosing);
    return () => setDeckSelecting(id, false);
  }, [id, choosing]);
  useFloatingBar(
    selection && (
      <Animated.View
        // It slides rather than fades: glass that starts transparent never draws its effect.
        entering={reduce ? undefined : springIn(new SlideInDown(), ARRIVE)}
        exiting={reduce ? undefined : SlideOutDown.duration(200)}
      >
        <SelectionToolbar
          count={selection.size}
          total={ordered.length}
          onAll={() => setSelected(new Set(ordered.map((r) => r.card.id)))}
          onClear={() => setSelected(new Set())}
          onDone={done}
          actions={selectionActions}
        />
      </Animated.View>
    ),
  );
  const toggleSelected = useCallback(
    (cardId: string) =>
      setSelected((prev) => {
        if (!prev) return prev;
        const next = new Set(prev);
        if (!next.delete(cardId)) next.add(cardId);
        return next;
      }),
    [],
  );
  // Where Review ends on the page; past it, under the bar, the tab bar's accessory takes over.
  const [reviewEnd, setReviewEnd] = useState<number | null>(null);
  const insets = useSafeAreaInsets();
  const onReviewPast = useCallback((hidden: boolean) => setDeckReviewHidden(id, hidden), [id]);
  useEffect(() => () => setDeckReviewHidden(id, false), [id]);
  // The deck's name and counts come from the deck list, its words from its cards: either can fail.
  const cardsFailed = useLoadFailed(cards);
  const decksFailed = useLoadFailed(decks);
  const addCard = () => router.push(`/capture?deck=${id}` as Href);
  const listRef = useRef<FlatList<Item>>(null);
  // Go to clears the filters and sorts by section, so the heading is in the list it scrolls.
  const [goingTo, setGoingTo] = useState<string | null>(null);
  const goTo = (sectionId: string) => {
    captureEvent("section_go_to", {});
    setFilters(noFilters);
    setSort(null);
    setGoingTo(sectionId);
  };
  const bar = insets.top + 56;
  const scrollTo = useCallback(
    (index: number) =>
      listRef.current?.scrollToIndex({ index, viewOffset: bar, animated: !reduce }),
    [bar, reduce],
  );
  useEffect(() => {
    if (!goingTo) return;
    setGoingTo(null);
    const index = items.findIndex((item) => item.key === `h:section:${goingTo}`);
    if (index >= 0) scrollTo(index);
  }, [goingTo, items, scrollTo]);
  // The words draw as a list only once the page has a deck with cards to show.
  const listed = !gone && !cardsFailed && !decksFailed && !!deck && rows.length > 0;

  return (
    <Screen
      title={deck?.name ?? ""}
      onRefresh={() => Promise.all([decks.refetch(), cards.refetch(), sectionsQuery.refetch()])}
      back={{ label: t`Library`, to: "/library" }}
      list={
        listed && deck
          ? {
              data: items,
              keyExtractor: (item) => item.key,
              extraData: `${selection?.size ?? -1} ${menuShape} ${lift} ${progress?.currentId} ${sectionStart.starting}`,
              renderItem: ({ item }) =>
                item.kind === "heading" ? (
                  <Heading
                    group={item.group}
                    deckId={id}
                    hereId={progress?.currentId ?? null}
                    starting={sectionStart.starting}
                    onStart={sectionStart.start}
                    owner={owner}
                    several={sections.length > 1}
                  />
                ) : (
                  <Slice first={item.first} last={item.last} dim={item.dim} lift={lift}>
                    <WordRow
                      row={item.row}
                      first={item.first}
                      waiting={item.waiting}
                      selected={selection ? selection.has(item.row.card.id) : undefined}
                      onToggle={selection ? toggleSelected : undefined}
                      menu={menu}
                      menuShape={menuShape}
                      deckName={deck.name}
                    />
                  </Slice>
                ),
              // The last cards scroll clear of the pinned toolbar.
              footer: selection && <View className="h-16" />,
              ref: listRef,
              // A heading past what is drawn: scroll near it so it draws, then go to it.
              onScrollToIndexFailed: ({ index, averageItemLength }) => {
                listRef.current?.scrollToOffset({
                  offset: averageItemLength * index,
                  animated: false,
                });
                setTimeout(() => scrollTo(index), 100);
              },
            }
          : undefined
      }
      past={
        reviewEnd === null ? undefined : { y: reviewEnd - insets.top - 56, onChange: onReviewPast }
      }
      actions={
        // A deck that has gone has nothing to search or change.
        !gone && (
          <View className="flex-row items-center gap-2.5">
            <BarButton
              icon="search"
              label={t`Search this deck`}
              onPress={() => router.push(`/search?deck=${id}` as Href)}
            />
            <ActionMenu
              label={t`Deck options`}
              symbol="ellipsis"
              look="bar"
              items={[
                [
                  ...(owner
                    ? [
                        {
                          label: t`Add a card`,
                          icon: "plus" as const,
                          onSelect: addCard,
                        },
                        {
                          label: t`Smart add`,
                          icon: "ai" as const,
                          onSelect: () => router.push(`/smart-add?deck=${id}` as Href),
                        },
                      ]
                    : []),
                  ...(owner
                    ? [
                        {
                          label: t`Share deck`,
                          icon: "share" as const,
                          onSelect: () => router.push(`/share?id=${id}` as Href),
                        },
                        {
                          label: t`Move to series`,
                          icon: "series" as const,
                          onSelect: () => setMoving(true),
                        },
                        {
                          label: t`Export deck`,
                          icon: "export" as const,
                          onSelect: () => setExporting(true),
                        },
                      ]
                    : []),
                  ...(rows.length > 0 && !selection
                    ? [
                        {
                          label: t`Select cards`,
                          icon: "check" as const,
                          onSelect: () => setSelected(new Set()),
                        },
                      ]
                    : []),
                  {
                    label: owner ? t`Deck settings` : t`About this deck`,
                    icon: "settings",
                    onSelect: () => router.push(`/library/deck-settings?id=${id}` as Href),
                  },
                ],
                ...(owner
                  ? [
                      [
                        {
                          label: t`Archive deck`,
                          icon: "archive" as const,
                          destructive: true,
                          onSelect: exits.archive,
                        },
                      ],
                    ]
                  : [
                      // A deck added from Explore or shared with the learner is left, not archived.
                      [
                        {
                          label: t`Leave deck`,
                          icon: "signOut" as const,
                          destructive: true,
                          onSelect: exits.leave,
                        },
                      ],
                    ]),
              ]}
            />
          </View>
        )
      }
    >
      <OfflineNote query={cards} />
      {gone ? (
        // Archived or left elsewhere since Library was opened.
        <EmptyState
          kind="noMatch"
          icon="deck"
          title={t`This deck isn’t in your Library`}
          body={t`It was archived, or you left it.`}
          action={{ label: t`Back to Library`, onPress: () => router.dismissTo("/library") }}
        />
      ) : cardsFailed || decksFailed ? (
        <LoadFailed
          query={decksFailed ? decks : cards}
          failed={t`Couldn’t load this deck`}
          offline={t`This deck needs a connection`}
        />
      ) : !deck || !cards.data ? (
        <View className="gap-3">
          <Skeleton height={120} />
          <Skeleton height={64} />
        </View>
      ) : rows.length === 0 ? (
        <EmptyState
          kind="start"
          icon="deck"
          title={t`No cards yet`}
          body={
            owner
              ? t`Add the words you want to learn, and they show here.`
              : t`Cards the owner adds show here.`
          }
          action={owner ? { label: t`Add a card`, onPress: addCard } : undefined}
        />
      ) : (
        <>
          <View
            className="gap-3"
            onLayout={(e) => setReviewEnd(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}
          >
            <Top
              deck={deck}
              rows={rows}
              section={
                progress && (
                  <SectionProgress
                    sections={sections}
                    progress={progress}
                    due={deck.due}
                    starting={sectionStart.starting}
                    onStart={sectionStart.start}
                    onGoTo={goTo}
                  />
                )
              }
            />
            {deck.due > 0 && <ReviewButton deck={deck} />}
          </View>
          <View className="gap-6">
            {/* Dimmed while choosing, so what is chosen never changes under the filter. */}
            <View
              pointerEvents={selection ? "none" : "auto"}
              style={selection ? { opacity: 0.4 } : undefined}
              importantForAccessibility={selection ? "no-hide-descendants" : "auto"}
              accessibilityElementsHidden={!!selection}
            >
              <FilterTools
                rows={rows}
                sections={sections}
                filters={filters}
                setFilters={setFilters}
                count={(f) => filterRows(rows, f, "", Date.now(), sections).length}
                sort={sort}
                setSort={setSort}
              />
            </View>
            {groups.length === 0 && (
              <Plate>
                <EmptyState
                  kind="noMatch"
                  size="inline"
                  title={t`No cards match these filters`}
                  action={{ label: t`Show all`, onPress: () => setFilters(noFilters) }}
                />
              </Plate>
            )}
          </View>
        </>
      )}
      {deck && owner && <MoveToSeries deck={deck} open={moving} onOpenChange={setMoving} />}
      {deck && owner && (
        <ExportSheet
          open={exporting}
          onOpenChange={setExporting}
          scope={{
            kind: "deck",
            deckId: deck.id,
            deckName: deck.name,
            rows: cards.data,
          }}
        />
      )}
      {owner && moveToSection.sheet}
      {owner && moveToDeck.sheet}
      {owner && tagCards.sheet}
    </Screen>
  );
}

type DeckData = NonNullable<ReturnType<typeof useDecks>["data"]>[number];

function useCounts(rows: DeckRow[]) {
  return useMemo(() => {
    const n = { new: 0, learning: 0, known: 0 };
    for (const r of rows) n[stateKey(r.state?.state)]++;
    return n;
  }, [rows]);
}

/**
 * What the deck asks for today and how far along it is: the count to review and the deck's size on
 * one line, its cards' states as one bar with their counts under it, then Review. Once Review has
 * scrolled away, the tab bar's accessory carries it. phone.md "Library".
 */
function Top({
  deck,
  rows,
  section,
}: {
  deck: DeckData;
  rows: DeckRow[];
  /** Where the learner is in a deck whose sections open in order. */
  section?: ReactNode;
}) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const counts = useCounts(rows);
  const next = useNextDue(rows);
  const due = deck.due;
  const line =
    due > 0 ? null : next ? t`Next card due ${next}.` : rows.length ? t`Nothing scheduled.` : null;
  const groupLabel = (k: keyof typeof counts) => i18n._(stateMarks[k].groupLabel);
  return (
    <Plate className="gap-4 p-5">
      <View className="flex-row items-baseline justify-between gap-3">
        <View className="shrink flex-row items-baseline gap-2">
          <Text className="text-4xl font-semibold text-text" style={{ letterSpacing: -1 }}>
            {due}
          </Text>
          <Text className="shrink text-base text-text-2">{t`to review`}</Text>
        </View>
        <Text className="text-base text-muted">
          {plural(rows.length, { one: "# card", other: "# cards" })}
        </Text>
      </View>
      <View className="gap-2.5">
        <View
          className="h-2.5 w-full flex-row overflow-hidden rounded-full bg-plate-2"
          style={{ gap: 2 }}
        >
          {(["known", "learning", "new"] as const)
            .filter((k) => counts[k] > 0)
            .map((k) => (
              <View
                key={k}
                style={{
                  flexGrow: counts[k],
                  flexBasis: 0,
                  backgroundColor: p[stateMarks[k].tint],
                }}
              />
            ))}
        </View>
        <View className="flex-row flex-wrap gap-x-4 gap-y-1">
          {(["new", "learning", "known"] as const).map((k) => (
            <View key={k} className="flex-row items-center gap-1.5">
              <StateIcon state={k} size={14} />
              <Text className="text-sm font-medium text-text">{i18n.number(counts[k])}</Text>
              <Text className="text-sm text-muted">{groupLabel(k)}</Text>
            </View>
          ))}
        </View>
      </View>
      {line && <Text className="text-sm text-muted">{line}</Text>}
      {section}
    </Plate>
  );
}

/** The deck's Review, under the summary; the page tells the tab bar once it has scrolled away. */
function ReviewButton({ deck }: { deck: DeckData }) {
  const { t } = useLingui();
  const router = useRouter();
  return (
    <Button
      label={t`Review`}
      variant="primary"
      size="lg"
      onPress={() => {
        haptics.start();
        router.push(`/review?deck=${deck.id}` as Href);
      }}
    />
  );
}

/** A group's heading over its words: a section, when it's back, or the day the words arrived. */
function Heading({
  group: g,
  deckId,
  hereId,
  starting,
  onStart,
  owner,
  several,
}: {
  group: DeckGroup;
  deckId: string;
  /** The section the learner is on, for You are here. */
  hereId: string | null;
  starting: string | undefined;
  onStart: (section: Section) => void;
  owner: boolean;
  several: boolean;
}) {
  const { t, i18n } = useLingui();
  const title =
    g.kind === "section"
      ? (g.section?.name ?? t`No section`)
      : g.kind === "due"
        ? { now: t`Due now`, week: t`This week`, later: t`Later`, new: t`Not started` }[g.bucket]
        : g.kind === "day"
          ? i18n.date(g.day, { weekday: "long", day: "numeric", month: "long" })
          : null;
  const section = g.kind === "section" ? g.section : null;
  return (
    <View className="pt-6">
      {section?.status === "ready" && (
        <ReadyNote section={section} starting={starting === section.id} onStart={onStart} />
      )}
      {section ? (
        <SectionHeading
          deckId={deckId}
          section={section}
          count={g.rows.length}
          here={section.id === hereId}
          starting={starting === section.id}
          onStart={onStart}
          owner={owner}
          several={several}
        />
      ) : (
        title && (
          <SectionTitle
            end={
              <Text className="text-base text-muted">
                {plural(g.rows.length, { one: "# card", other: "# cards" })}
              </Text>
            }
          >
            {title}
          </SectionTitle>
        )
      )}
    </View>
  );
}

/** One row's share of its group's plate, so a group of thousands draws only the rows in view. */
function Slice({
  first,
  last,
  dim,
  lift,
  children,
}: {
  first: boolean;
  last: boolean;
  dim: boolean;
  lift: boolean;
  children: ReactNode;
}) {
  return (
    <View
      className={`overflow-hidden border-x border-edge bg-plate ${first ? "rounded-t-xl border-t" : ""} ${last ? "rounded-b-xl border-b" : ""}`}
      style={[lift ? LIFT : null, dim ? { opacity: 0.7 } : null]}
    >
      {children}
    </View>
  );
}

/**
 * A word as a glossary reads it: the state's mark, the term with its forms quieter, and the meaning
 * under it, at most three lines of term and two of meaning. The open card shows the rest. While the
 * list is choosing cards, the mark is a checkbox and a tap chooses rather than opens.
 */
const WordRow = memo(function WordRow({
  row,
  first,
  waiting,
  selected,
  onToggle,
  menu,
  deckName,
}: {
  row: DeckRow;
  first: boolean;
  waiting: boolean;
  /** Undefined unless the list is choosing cards. */
  selected?: boolean | undefined;
  onToggle?: ((cardId: string) => void) | undefined;
  menu: (card: DeckRow["card"]) => RowMenuItem[][];
  /** Changes when what the menu offers does, since `menu` itself stays the same function. */
  menuShape: string;
  deckName: string;
}) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const peek = usePeekSize();
  const state = stateKey(row.state?.state);
  const { word, forms } = splitForms(row.card.term);
  // A Japanese row without furigana keeps a reading's room, so every row in the deck is one height.
  const reading = useMemo(() => termReading({ ...row.card, term: word }), [row.card, word]);
  const selecting = selected !== undefined;
  const label = `${row.card.term}, ${row.card.meaning ?? ""}, ${waiting ? t`Not in review yet` : i18n._(stateMarks[state].label)}`;
  const face = (
    <View
      className={`flex-row gap-3 py-3.5 ps-4 pe-5 ${first ? "" : "border-t border-edge"}`}
      style={selected ? { backgroundColor: p.hover } : { backgroundColor: p.plate }}
    >
      <View className="pt-[5px]">
        {selecting ? (
          <SelectBox checked={selected} />
        ) : waiting ? (
          <Icon name="lock" size={15} colour={p.faint} />
        ) : (
          <StateIcon state={state} size={15} />
        )}
      </View>
      <View className="flex-1 gap-0.5">
        <Furigana
          segments={reading ?? [{ text: word }]}
          room={drawsReadings(row.card.language)}
          className="text-md font-medium text-text"
          lines={3}
          lang={row.card.language}
          tail={forms ? { text: ` · ${forms}`, className: "text-md text-text-2" } : undefined}
          after={
            row.card.important && (
              <Text className="text-md" style={{ color: p["amber-mark"] }}>
                {" ★"}
              </Text>
            )
          }
        />
        <Text className="text-base text-text-2" numberOfLines={2}>
          {row.card.meaning || t`No meaning yet`}
        </Text>
      </View>
    </View>
  );
  if (selecting) {
    return (
      <Press
        scale={0.99}
        onPress={() => onToggle?.(row.card.id)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={label}
      >
        {face}
      </Press>
    );
  }
  return (
    <RowMenu
      surface="card_row"
      href={`/library/card/${row.card.id}?deck=${row.card.deckId}` as Href}
      label={label}
      items={menu(row.card)}
      preview={{
        node: <CardPeek card={row.card} state={row.state} deckName={deckName} />,
        width: peek.width,
        height: peekHeight(row.card, peek.width, peek.scale),
      }}
    >
      {face}
    </RowMenu>
  );
});

/**
 * Move to series, as the web's: no series, one of the learner's, or a new one that starts with
 * this deck. A deck reviews with the other decks in its series.
 */
function MoveToSeries({
  deck,
  open,
  onOpenChange,
}: {
  deck: DeckData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLingui();
  const router = useRouter();
  const online = useOnline();
  const query = useSeriesList(open);
  const series = query.data ?? [];
  // Undo puts the deck back in its place, so a move waits for the series that holds it now.
  const back = moveBack(deck.seriesId, query.data);
  const { moveDeck, undoMove } = useSeriesActions();
  const notice = useMoveNotice();
  const deckName = deck.name;
  // New series opens once this sheet has gone, as every sheet's choice does, so its name gets the keyboard.
  const opening = useRef<Href | null>(null);
  const move = (seriesId: string | null, then?: () => void) =>
    moveDeck.mutate(
      { deckId: deck.id, seriesId },
      {
        onSuccess: then,
        onError: () =>
          toast.add({
            id: `move-deck-${deck.id}`,
            error: true,
            title: t`Couldn’t move “${deckName}”.`,
            action: { label: t`Try again`, onPress: () => move(seriesId, then) },
          }),
      },
    );
  const pick = (seriesId: string | null) => {
    if (!online || !back) return;
    onOpenChange(false);
    if (seriesId === deck.seriesId) return;
    haptics.tick();
    const name = seriesId ? series.find((s) => s.id === seriesId)?.name : undefined;
    move(seriesId, () => notice(deck.id, deckName, name, () => undoMove(deck.id, back)));
  };
  return (
    <Sheet
      title={t`Move to series`}
      description={
        online
          ? t`“${deckName}” is reviewed with the other decks in its series.`
          : t`Changing series needs a connection.`
      }
      open={open}
      onOpenChange={onOpenChange}
      onDismiss={() => {
        const href = opening.current;
        opening.current = null;
        if (href) router.push(href);
      }}
    >
      {!back &&
        (query.isPending || query.isFetching ? (
          <Skeleton height={104} />
        ) : (
          <SheetGroup>
            <EmptyState
              kind="failed"
              size="inline"
              title={t`Couldn’t load your series`}
              action={{ label: t`Try again`, onPress: () => void query.refetch() }}
            />
          </SheetGroup>
        ))}
      {/* As the web's: the series first, then No series only for a deck that is in one. */}
      {back && (series.length > 0 || deck.seriesId) && (
        <SheetGroup>
          {series.map((s) => (
            <SheetRow
              key={s.id}
              label={s.name}
              chosen={s.id === deck.seriesId}
              onPress={() => pick(s.id)}
            />
          ))}
          {deck.seriesId && <SheetRow label={t`No series`} onPress={() => pick(null)} />}
        </SheetGroup>
      )}
      {back && (
        <SheetGroup>
          <SheetRow
            label={t`New series`}
            icon="plus"
            opens
            onPress={() => {
              if (!online) return;
              onOpenChange(false);
              opening.current = `/series?deck=${deck.id}` as Href;
            }}
          />
        </SheetGroup>
      )}
    </Sheet>
  );
}
