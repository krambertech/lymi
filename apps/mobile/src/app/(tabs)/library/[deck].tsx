import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { Section } from "@lymi/client/api";
import {
  type DeckFilters,
  type DeckGroup,
  type DeckRow,
  type DeckSort,
  filterRows,
  groupRows,
  noFilters,
  splitForms,
  stateKey,
} from "@lymi/client/deck-list";
import { ARRIVE } from "@lymi/design";
import * as Haptics from "expo-haptics";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowUpDown, ListFilter } from "lucide-react-native";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import Animated, { SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDeckExits } from "../../../data/decks";
import { moveBack } from "../../../data/move-undo";
import { useNextDue } from "../../../data/next-due";
import { useDeckCards, useDecks, useSections, useSeriesList } from "../../../data/queries";
import { useMoveNotice, useSeriesActions } from "../../../data/series";
import { useCardBatch, useMoveToDeck } from "../../../deck/card-batch";
import { useMoveToSection } from "../../../deck/move-to-section";
import { SelectBox, SelectionToolbar } from "../../../deck/selection";
import {
  ReadyNote,
  SectionHeading,
  SectionProgress,
  useStartSection,
} from "../../../sections/sections";
import { useOnline } from "../../../streak/goal-picker";
import { springIn, useReduceMotion } from "../../../theme/motion";
import { usePalette } from "../../../theme/palette";
import { ActionMenu } from "../../../ui/action-menu";
import { EmptyState } from "../../../ui/empty-state";
import { useFloatingBar } from "../../../ui/floating-bar";
import { Icon } from "../../../ui/icons";
import { LoadFailed, useLoadFailed } from "../../../ui/load-failed";
import { Select } from "../../../ui/menu";
import { OfflineNote } from "../../../ui/offline-note";
import { Button, Plate, Press, SectionTitle, Text } from "../../../ui/primitives";
import { BarButton, Screen } from "../../../ui/screen";
import { Segmented } from "../../../ui/segmented";
import { Sheet, SheetGroup, SheetHeading, SheetRow } from "../../../ui/sheet";
import { Skeleton } from "../../../ui/skeleton";
import { StateIcon, stateMarks } from "../../../ui/state-mark";
import { setDeckReviewHidden } from "../../../ui/tab-bar";
import { toast } from "../../../ui/toast-host";

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
  const rows: DeckRow[] = cards.data ?? [];
  const sectionsQuery = useSections(id);
  const sections = sectionsQuery.data?.sections ?? [];
  const [filters, setFilters] = useState<DeckFilters>(noFilters);
  const [chosenSort, setSort] = useState<DeckSort | null>(null);
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
  // The cards chosen with Select cards, or null when the list is not choosing.
  const [selected, setSelected] = useState<ReadonlySet<string> | null>(null);
  const moveToSection = useMoveToSection(id);
  const moveToDeck = useMoveToDeck(id);
  const batch = useCardBatch(id);
  const reduce = useReduceMotion();
  const selection = owner && selected ? selected : null;
  const ordered = useMemo(() => groups.flatMap((g) => g.rows), [groups]);
  const done = () => setSelected(null);
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
          actions={[
            [
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
                icon: "archive",
                destructive: true,
                onSelect: () => {
                  done();
                  void batch.archive([...selection]);
                },
              },
            ],
          ]}
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

  return (
    <Screen
      title={deck?.name ?? ""}
      onRefresh={() => Promise.all([decks.refetch(), cards.refetch(), sectionsQuery.refetch()])}
      back={{ label: t`Library`, to: "/library" }}
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
                      ]
                    : []),
                  ...(owner && rows.length > 0 && !selection
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
              <Tools
                sections={sections}
                filters={filters}
                setFilters={setFilters}
                count={(f) => filterRows(rows, f, "", Date.now(), sections).length}
                total={rows.length}
                sort={sort}
                setSort={setSort}
              />
            </View>
            {groups.length === 0 ? (
              <Plate>
                <EmptyState
                  kind="noMatch"
                  size="inline"
                  title={t`No cards match these filters`}
                  action={{ label: t`Show all`, onPress: () => setFilters(noFilters) }}
                />
              </Plate>
            ) : (
              groups.map((g) => (
                <Group
                  key={g.key}
                  group={g}
                  deckId={id}
                  hereId={progress?.currentId ?? null}
                  starting={sectionStart.starting}
                  onStart={sectionStart.start}
                  selection={selection ? { ids: selection, onToggle: toggleSelected } : undefined}
                />
              ))
            )}
          </View>
        </>
      )}
      {deck && owner && <MoveToSeries deck={deck} open={moving} onOpenChange={setMoving} />}
      {owner && moveToSection.sheet}
      {owner && moveToDeck.sheet}
      {/* The last cards scroll clear of the pinned toolbar. */}
      {selection && <View className="h-16" />}
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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push(`/review?deck=${deck.id}` as Href);
      }}
    />
  );
}

/**
 * Filter and Sort over the list. Filter is one sheet with every filter on it: each tap saves to a
 * draft and the count under the title answers it, and the list changes once, as the sheet goes.
 * Each active filter is a chip that removes it. Both reset when the learner leaves the deck.
 */
function Tools({
  sections,
  filters,
  setFilters,
  count,
  total,
  sort,
  setSort,
}: {
  sections: { id: string; name: string }[];
  filters: DeckFilters;
  setFilters: (f: DeckFilters) => void;
  /** How many of the deck's cards a set of filters keeps. */
  count: (f: DeckFilters) => number;
  total: number;
  sort: DeckSort;
  setSort: (s: DeckSort) => void;
}) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const [choosing, setChoosing] = useState(false);
  const [draft, setDraft] = useState<DeckFilters>(filters);
  const [allSections, setAllSections] = useState(false);
  const sortName: Record<DeckSort, string> = {
    section: t`Section`,
    due: t`When it’s back`,
    added: t`Recently added`,
    az: t`A–Z`,
  };
  const dueName = { today: t`Due today`, week: t`Due this week` };
  const sectionName = (sid: string) =>
    sid ? (sections.find((s) => s.id === sid)?.name ?? "") : t`No section`;
  const toggle = <T,>(list: T[], item: T) =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
  const chips = [
    ...filters.states.map((s) => ({
      key: s,
      label: i18n._(stateMarks[s].groupLabel),
      remove: () => setFilters({ ...filters, states: toggle(filters.states, s) }),
    })),
    ...(filters.due
      ? [
          {
            key: "due",
            label: dueName[filters.due],
            remove: () => setFilters({ ...filters, due: null }),
          },
        ]
      : []),
    ...filters.sections.map((sid) => ({
      key: `s:${sid}`,
      label: sectionName(sid),
      remove: () => setFilters({ ...filters, sections: toggle(filters.sections, sid) }),
    })),
  ];
  const open = () => {
    setDraft(filters);
    setAllSections(false);
    setChoosing(true);
  };
  const drafted = draft.states.length > 0 || draft.due !== null || draft.sections.length > 0;
  const kept = count(draft);
  const shown = i18n.number(kept);
  const counted = drafted
    ? plural(total, { one: `${shown} of # card`, other: `${shown} of # cards` })
    : plural(total, { one: "# card", other: "# cards" });
  const sectionIds = [...sections.map((s) => s.id), ""];
  // Past five a long list of lessons would push everything under the fold.
  const visibleSections = allSections ? sectionIds : sectionIds.slice(0, 5);
  const hiddenSections = sectionIds.length - visibleSections.length;
  const pill = (icon: "filter" | "sort", label: string, on = false) => {
    const Glyph = icon === "filter" ? ListFilter : ArrowUpDown;
    return (
      <View
        className={`min-h-9 flex-row items-center gap-1.5 rounded-full border bg-plate px-3.5 py-1.5 ${on ? "border-text" : "border-edge"}`}
      >
        <Glyph size={15} color={p["text-2"]} strokeWidth={2} />
        <Text className="text-base font-medium text-text">{label}</Text>
      </View>
    );
  };
  const sorts = sections.length
    ? (["section", "due", "added", "az"] as const)
    : (["added", "due", "az"] as const);
  return (
    <View className="gap-2.5">
      <View className="flex-row flex-wrap items-center gap-2">
        <Press onPress={open} accessibilityRole="button" accessibilityLabel={t`Filter`}>
          {pill(
            "filter",
            chips.length ? t`Filter · ${i18n.number(chips.length)}` : t`Filter`,
            chips.length > 0,
          )}
        </Press>
        <Select
          label={t`Sort`}
          value={sort}
          options={sorts.map((k) => ({ value: k, label: sortName[k] }))}
          onChange={setSort}
          trigger={pill("sort", sortName[sort])}
        />
        {chips.map((c) => {
          const name = c.label;
          return (
            <Press
              key={c.key}
              onPress={c.remove}
              accessibilityRole="button"
              accessibilityLabel={t`Remove filter: ${name}`}
              // Grows with the text and stops at the row's width, so a long section name ends in an ellipsis.
              className="min-h-9 max-w-full flex-row items-center gap-1.5 rounded-full bg-plate-2 py-1.5 ps-3 pe-2.5"
            >
              <Text className="shrink text-base font-medium text-text-2" numberOfLines={1}>
                {name}
              </Text>
              <Icon name="close" size={14} colour={p.muted} />
            </Press>
          );
        })}
      </View>
      <Sheet
        title={t`Filter`}
        description={counted}
        aside={
          drafted && (
            <Press
              onPress={() => setDraft(noFilters)}
              accessibilityRole="button"
              className="h-11 justify-center px-2"
            >
              <Text className="text-md font-medium text-text">{t`Reset`}</Text>
            </Press>
          )
        }
        open={choosing}
        onOpenChange={setChoosing}
        onDismiss={() => {
          if (JSON.stringify(draft) !== JSON.stringify(filters)) setFilters(draft);
        }}
      >
        <SheetHeading>{t`State`}</SheetHeading>
        <SheetGroup>
          {(["new", "learning", "known"] as const).map((s) => (
            <SheetRow
              key={s}
              label={i18n._(stateMarks[s].groupLabel)}
              value={i18n.number(count({ ...draft, states: [s] }))}
              chosen={draft.states.includes(s)}
              multiple
              onPress={() => setDraft({ ...draft, states: toggle(draft.states, s) })}
            />
          ))}
        </SheetGroup>
        <SheetHeading>{t`Due`}</SheetHeading>
        <Segmented
          label={t`Due`}
          value={draft.due ?? "any"}
          options={[
            { value: "any", label: t`Any time` },
            { value: "today", label: t`Today` },
            { value: "week", label: t`This week` },
          ]}
          onChange={(v) => setDraft({ ...draft, due: v === "any" ? null : v })}
        />
        {sections.length > 0 && (
          <>
            <SheetHeading>{t`Section`}</SheetHeading>
            <SheetGroup>
              {visibleSections.map((sid) => (
                <SheetRow
                  key={sid || "none"}
                  label={sectionName(sid)}
                  value={i18n.number(count({ ...draft, sections: [sid] }))}
                  chosen={draft.sections.includes(sid)}
                  multiple
                  onPress={() => setDraft({ ...draft, sections: toggle(draft.sections, sid) })}
                />
              ))}
              {hiddenSections > 0 && (
                <SheetRow
                  label={plural(hiddenSections, { one: "Show # more", other: "Show # more" })}
                  onPress={() => setAllSections(true)}
                />
              )}
            </SheetGroup>
          </>
        )}
      </Sheet>
    </View>
  );
}

/** One heading and its words: a section, when it's back, or the day the words arrived. */
function Group({
  group: g,
  deckId,
  hereId,
  starting,
  onStart,
  selection,
}: {
  group: DeckGroup;
  deckId: string;
  /** The section the learner is on, for You are here. */
  hereId: string | null;
  starting: string | undefined;
  onStart: (section: Section) => void;
  /** Set while the list is choosing cards. */
  selection?: { ids: ReadonlySet<string>; onToggle: (cardId: string) => void } | undefined;
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
    <View>
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
      <Plate
        className={`overflow-hidden ${section && section.status !== "open" ? "opacity-70" : ""}`}
      >
        {g.rows.map((row, i) => (
          <WordRow
            key={row.card.id}
            row={row}
            first={i === 0}
            selected={selection?.ids.has(row.card.id)}
            onToggle={selection?.onToggle}
          />
        ))}
      </Plate>
    </View>
  );
}

/**
 * A word as a glossary reads it: the state's mark, the term with its forms quieter, and the meaning
 * under it, at most three lines of term and two of meaning. The open card shows the rest. While the
 * list is choosing cards, the mark is a checkbox and a tap chooses rather than opens.
 */
function WordRow({
  row,
  first,
  selected,
  onToggle,
}: {
  row: DeckRow;
  first: boolean;
  /** Undefined unless the list is choosing cards. */
  selected?: boolean | undefined;
  onToggle?: ((cardId: string) => void) | undefined;
}) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const router = useRouter();
  const state = stateKey(row.state?.state);
  const { word, forms } = splitForms(row.card.term);
  const selecting = selected !== undefined;
  return (
    <Press
      scale={0.99}
      onPress={() =>
        selecting
          ? onToggle?.(row.card.id)
          : router.push(`/library/card/${row.card.id}?deck=${row.card.deckId}` as Href)
      }
      accessibilityRole={selecting ? "checkbox" : "link"}
      accessibilityState={selecting ? { checked: selected } : undefined}
      accessibilityLabel={`${row.card.term}, ${row.card.meaning ?? ""}, ${i18n._(stateMarks[state].label)}`}
      className={`flex-row gap-3 py-3.5 ps-4 pe-5 ${first ? "" : "border-t border-edge"}`}
      style={selected ? { backgroundColor: p.hover } : undefined}
    >
      <View className="pt-[5px]">
        {selecting ? <SelectBox checked={selected} /> : <StateIcon state={state} size={15} />}
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-md font-medium text-text" numberOfLines={3}>
          {word}
          {forms && <Text className="font-normal text-text-2">{` · ${forms}`}</Text>}
          {row.card.important && <Text style={{ color: p["amber-mark"] }}>{" ★"}</Text>}
        </Text>
        <Text className="text-base text-text-2" numberOfLines={2}>
          {row.card.meaning || t`No meaning yet`}
        </Text>
      </View>
    </Press>
  );
}

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
    Haptics.selectionAsync();
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
              router.push(`/series?deck=${deck.id}` as Href);
            }}
          />
        </SheetGroup>
      )}
    </Sheet>
  );
}
