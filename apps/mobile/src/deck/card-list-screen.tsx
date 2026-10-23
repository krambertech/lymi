import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { Section } from "@lymi/client/api";
import {
  type DeckFilters,
  type DeckGroup,
  type DeckRow,
  type DeckScope,
  type DeckSort,
  deckTags,
  filterRows,
  groupRows,
  liveFilters,
  noFilters,
  rowState,
  scopedFilters,
  splitForms,
  stateKey,
} from "@lymi/client/deck-list";
import { type LineColumn, lineColumns, opening } from "@lymi/client/section-line";
import { isolate } from "@lymi/core";
import { type Href, useRouter } from "expo-router";
import { memo, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCardMenu } from "../card/card-menu";
import { CardPeek, peekHeight, usePeekSize } from "../card/card-peek";
import { useDeckExits } from "../data/decks";
import { moveBack } from "../data/move-undo";
import { useNextDue } from "../data/next-due";
import { useDeckCards, useDecks, useSections, useSeriesList } from "../data/queries";
import { useMoveNotice, useSeriesActions } from "../data/series";
import { ExportSheet } from "../export/export-sheet";
import { useArchiveSection } from "../sections/archive-section";
import { useNewSection } from "../sections/name-sheet";
import { OpeningLine, OpensAfter, SectionLine, sectionPage } from "../sections/section-line";
import { ReadyNote, SectionHeading, useSectionMenu, useStartSection } from "../sections/sections";
import { reportHref } from "../sharing/report";
import { useOnline } from "../streak/goal-picker";
import { captureEvent } from "../telemetry/posthog";
import { haptics } from "../theme/haptics";
import { usePalette, useRoom } from "../theme/palette";
import { TEXT_END } from "../theme/type";
import { ActionMenu } from "../ui/action-menu";
import { EmptyState } from "../ui/empty-state";
import { Icon } from "../ui/icons";
import { LoadFailed, useLoadFailed } from "../ui/load-failed";
import { OfflineNote } from "../ui/offline-note";
import { Button, LIFT, Plate, Press, SectionTitle, Text } from "../ui/primitives";
import { RowMenu, type RowMenuItem } from "../ui/row-menu";
import { BarButton, Screen } from "../ui/screen";
import { Sheet, SheetGroup, SheetRow } from "../ui/sheet";
import { Skeleton } from "../ui/skeleton";
import { StateIcon, stateMarks } from "../ui/state-mark";
import { setDeckReviewHidden } from "../ui/tab-bar";
import { TermText } from "../ui/term-text";
import { toast } from "../ui/toast-host";
import { useCardBatch, useMoveToDeck } from "./card-batch";
import { useCardSelection } from "./card-selection";
import { FilterTools } from "./filters";
import { useMoveToSection } from "./move-to-section";
import { SelectBox } from "./selection";
import { StateBar, StateCounts } from "./state-bar";
import { useTagCards } from "./tag-cards";

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
 * and Sort narrow and order. Search opens at the foot, as Library's does, for this deck only. A
 * section scope is the same page with its list kept to that section, its own summary, its menu and
 * Previous and Next. docs/proposals/section-pages.md.
 */
export function CardListScreen({ scope }: { scope: DeckScope }) {
  const { t, i18n } = useLingui();
  const router = useRouter();
  const { deckId: id, sectionId } = scope;
  const scoped = sectionId !== undefined;
  const decks = useDecks();
  const deck = decks.data?.find((d) => d.id === id);
  const gone = !!decks.data && !deck;
  const cards = useDeckCards(id);
  const rows = cards.data ?? NO_ROWS;
  const sectionsQuery = useSections(id);
  const sections = sectionsQuery.data?.sections ?? NO_SECTIONS;
  // The section this page is kept to, or null for the deck or for the cards with no section.
  const section = sectionId ? (sections.find((s) => s.id === sectionId) ?? null) : null;
  const sectionGone = !!sectionId && !!sectionsQuery.data && !section;
  const scopeRows = useMemo(
    () =>
      scoped
        ? filterRows(rows, scopedFilters(noFilters, { sectionId }), "", Date.now(), sections)
        : rows,
    [rows, scoped, sectionId, sections],
  );
  const [filters, setFilters] = useState<DeckFilters>(noFilters);
  const [chosenSort, setSort] = useState<DeckSort | null>(null);
  // A tag renamed or a section deleted while the page is open would leave a filter nothing lists to untick.
  useEffect(() => {
    if (!cards.data || !sectionsQuery.data) return;
    const tagKeys = new Set(deckTags(cards.data).map((tag) => tag.key));
    const sectionIds = new Set(sectionsQuery.data.sections.map((s) => s.id));
    setFilters((f) => liveFilters(f, tagKeys, sectionIds));
  }, [cards.data, sectionsQuery.data]);
  // A section's list is one section, so it has no Section sort.
  const sort = chosenSort ?? (sections.length && !scoped ? "section" : "added");
  const groups = useMemo(() => {
    const now = Date.now();
    return groupRows(
      filterRows(rows, scopedFilters(filters, { sectionId }), "", now, sections),
      sort,
      now,
      i18n.locale,
      sections,
    );
  }, [rows, filters, sectionId, sort, i18n.locale, sections]);
  const owner = deck?.role === "owner";
  // A deck that opens every section at once has no "where you are" to show.
  const progress =
    deck?.sectionProgression === "open" ? null : (sectionsQuery.data?.progress ?? null);
  const sectionStart = useStartSection(id, sections);
  const exits = useDeckExits(deck);
  const [moving, setMoving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const moveToSection = useMoveToSection(id);
  const newSection = useNewSection(id);
  const moveToDeck = useMoveToDeck(id);
  const batch = useCardBatch(id);
  const tagCards = useTagCards(id);
  const cardMenu = useCardMenu({
    owner: () => owner,
    moveToSection: (c) => () => moveToSection.open([c.id]),
    moveToDeck: moveToDeck.canMove ? (c) => () => moveToDeck.open([c.id]) : undefined,
  });
  // Rows keep one menu function, so a render of the page redraws only rows whose card changed.
  const latestMenu = useRef(cardMenu);
  latestMenu.current = cardMenu;
  const menu = useCallback((card: DeckRow["card"]) => latestMenu.current(card), []);
  const menuShape = `${owner} ${moveToDeck.canMove}`;
  const lift = useRoom() === "dark";
  const ordered = useMemo(() => groups.flatMap((g) => g.rows), [groups]);
  const {
    selection,
    start: startSelecting,
    toggle: toggleSelected,
  } = useCardSelection({
    deckId: id,
    rows,
    shown: ordered,
    owner,
    batch,
    tagCards,
    moveToSection,
    moveToDeck,
  });
  // Archiving the section a page is kept to leaves nothing to show, so the page goes back to its deck.
  const archiveSection = useArchiveSection((archived) => {
    if (archived.id === sectionId) router.dismissTo(`/library/${id}` as Href);
  });
  const sectionMenu = useSectionMenu(
    id,
    { owner, several: sections.length > 1, selecting: !!selection },
    {
      onStart: sectionStart.start,
      // From a heading, the section's cards in the list start chosen; its own page starts with none.
      onSelectCards: (s) =>
        startSelecting(
          scoped ? [] : ordered.filter((r) => r.card.sectionId === s.id).map((r) => r.card.id),
        ),
      onArchive: (s) => archiveSection.archive(s),
    },
  );
  const statusOf = useMemo(() => new Map(sections.map((s) => [s.id, s.status])), [sections]);
  const items = useMemo(
    () =>
      groups.flatMap((group): Item[] => [
        { kind: "heading", key: `h:${group.key}`, group },
        ...group.rows.map((row, i): Item => {
          // A card in a section that isn't open is dimmed however the list is sorted.
          const status = row.card.sectionId ? statusOf.get(row.card.sectionId) : undefined;
          const dim = !!status && status !== "open";
          return {
            kind: "row",
            key: row.card.id,
            row,
            first: i === 0,
            last: i === group.rows.length - 1,
            dim,
            waiting: dim && rowState(row) === "new",
          };
        }),
      ]),
    [groups, statusOf],
  );
  // Where Review ends on the page; past it, under the bar, the tab bar's accessory takes over.
  const [reviewEnd, setReviewEnd] = useState<number | null>(null);
  const insets = useSafeAreaInsets();
  const onReviewPast = useCallback((hidden: boolean) => setDeckReviewHidden(id, hidden), [id]);
  useEffect(() => () => setDeckReviewHidden(id, false), [id]);
  // The deck's name and counts come from the deck list, its words from its cards: either can fail.
  const cardsFailed = useLoadFailed(cards);
  const decksFailed = useLoadFailed(decks);
  const addCard = () =>
    router.push(
      (section ? `/capture?deck=${id}&section=${section.id}` : `/capture?deck=${id}`) as Href,
    );
  const columns = useMemo(() => lineColumns(sections, rows), [sections, rows]);
  // Previous and Next walk the line's columns, so the cards with no section are the last stop.
  const at = columns.findIndex((c) => c.id === sectionId);
  const step = (c: LineColumn | undefined) =>
    c && {
      column: c,
      onPress: () => {
        captureEvent("section_page_opened", { from: "step" });
        router.replace(sectionPage(id, c.id));
      },
    };
  const steps = scoped && at >= 0 && (
    <Steps back={step(columns[at - 1])} forward={step(columns[at + 1])} />
  );
  // The words draw as a list only once the page has a deck with cards to show.
  const listed =
    !gone && !sectionGone && !cardsFailed && !decksFailed && !!deck && scopeRows.length > 0;
  const deckName = deck?.name;
  const title = scoped ? (section?.name ?? (sectionId === "" ? t`No section` : "")) : deck?.name;

  return (
    <Screen
      title={title ?? ""}
      onRefresh={() => Promise.all([decks.refetch(), cards.refetch(), sectionsQuery.refetch()])}
      back={
        scoped
          ? { label: deck?.name ?? t`Deck`, to: `/library/${id}` as Href }
          : { label: t`Library`, to: "/library" }
      }
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
                    menu={sectionMenu}
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
              footer: (steps || selection) && (
                <View>
                  {steps}
                  {/* The last cards scroll clear of the pinned toolbar. */}
                  {selection && <View className="h-16" />}
                </View>
              ),
            }
          : undefined
      }
      past={
        // A section's Review reviews the section, so the deck's accessory stays on the deck's page.
        scoped || reviewEnd === null
          ? undefined
          : { y: reviewEnd - insets.top - 56, onChange: onReviewPast }
      }
      actions={
        // A deck or section that has gone has nothing to search or change.
        !gone &&
        !sectionGone && (
          <View className="flex-row items-center gap-2.5">
            <BarButton
              icon="search"
              label={t`Search this deck`}
              onPress={() => router.push(`/search?deck=${id}` as Href)}
            />
            <ActionMenu
              label={scoped ? t`Section options` : t`Deck options`}
              symbol="ellipsis"
              look="bar"
              items={
                scoped
                  ? section
                    ? sectionMenu(section)
                    : selection || scopeRows.length === 0
                      ? []
                      : [
                          [
                            {
                              label: t`Select cards`,
                              icon: "check" as const,
                              onSelect: () => startSelecting(),
                            },
                          ],
                        ]
                  : [
                      ...(deck
                        ? [
                            [
                              {
                                label: t`Report deck`,
                                icon: "report" as const,
                                onSelect: () => router.push(reportHref("deck", id, deck.name)),
                              },
                            ],
                          ]
                        : []),
                      // A deck added from Explore or shared with the learner is left, not archived.
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
                                label: t`New section`,
                                icon: "section" as const,
                                onSelect: () => newSection.open(),
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
                                onSelect: () => startSelecting(),
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
                    ]
              }
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
      ) : sectionGone && deckName ? (
        // Archived elsewhere since the deck was opened.
        <EmptyState
          kind="noMatch"
          icon="section"
          title={t`This section isn’t in the deck`}
          body={t`It was archived.`}
          action={{
            label: t`Back to ${{ deckName: isolate(deckName) }}`,
            onPress: () => router.dismissTo(`/library/${id}` as Href),
          }}
        />
      ) : !deck || !cards.data || (scoped && !sectionsQuery.data) ? (
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
      ) : scoped && scopeRows.length === 0 ? (
        // Inline, so Previous and Next stay above the tab bar.
        <View>
          <Plate>
            <EmptyState
              kind="start"
              size="inline"
              icon="section"
              title={section ? t`No cards in this section yet` : t`Every card has a section`}
              action={section && owner ? { label: t`Add card here`, onPress: addCard } : undefined}
            />
          </Plate>
          {steps}
        </View>
      ) : (
        <>
          <View
            className="gap-3"
            onLayout={(e) => setReviewEnd(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}
          >
            {scoped ? (
              <SectionTop
                section={section}
                at={at}
                count={sections.length}
                rows={scopeRows}
                opening={
                  section &&
                  (() => {
                    const state = opening(sections, progress);
                    const about =
                      state &&
                      (state.current.id === section.id ||
                        (state.kind !== "open" && state.next.id === section.id));
                    if (state && about)
                      return (
                        <OpeningLine
                          state={state}
                          due={section.due}
                          starting={sectionStart.starting}
                          onStart={sectionStart.start}
                        />
                      );
                    const before = sections[sections.indexOf(section) - 1];
                    return progress && section.status !== "open" && before ? (
                      <OpensAfter before={before} />
                    ) : null;
                  })()
                }
              />
            ) : (
              <Top
                deck={deck}
                rows={rows}
                section={
                  columns.length > 0 && (
                    <DeckSections
                      deckId={id}
                      columns={columns}
                      state={opening(sections, progress)}
                      due={deck.due}
                      starting={sectionStart.starting}
                      onStart={sectionStart.start}
                    />
                  )
                }
              />
            )}
            {scoped
              ? section && (
                  <SectionReview
                    deckId={id}
                    section={section}
                    starting={sectionStart.starting === section.id}
                    onStart={sectionStart.start}
                  />
                )
              : deck.due > 0 && <ReviewButton deck={deck} />}
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
                rows={scopeRows}
                // A section's list has no Section filter or sort to offer.
                sections={scoped ? NO_SECTIONS : sections}
                filters={filters}
                setFilters={setFilters}
                count={(f) =>
                  filterRows(rows, scopedFilters(f, scope), "", Date.now(), sections).length
                }
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
      {owner && newSection.sheet}
      {owner && archiveSection.sheet}
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
  /** The deck's sections as a line, with what opens the next. */
  section?: ReactNode;
}) {
  const { t } = useLingui();
  const counts = useCounts(rows);
  const next = useNextDue(rows);
  const due = deck.due;
  const line =
    due > 0 ? null : next ? t`Next card due ${next}.` : rows.length ? t`Nothing scheduled.` : null;
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
        <StateBar counts={counts} />
        <StateCounts counts={counts} />
      </View>
      {line && <Text className="text-sm text-muted">{line}</Text>}
      {section}
    </Plate>
  );
}

/**
 * The deck's sections under its summary: a column each, which opens that section's page, then the
 * one sentence about what opens the next. Replaced the web's SectionProgress on the phone.
 */
function DeckSections({
  deckId,
  columns,
  state,
  due,
  starting,
  onStart,
}: {
  deckId: string;
  columns: LineColumn[];
  state: ReturnType<typeof opening>;
  due: number;
  starting: string | undefined;
  onStart: (section: Section) => void;
}) {
  const { t } = useLingui();
  const router = useRouter();
  return (
    <View className="gap-3 border-t border-edge pt-4">
      <Text className="text-md font-medium text-text" accessibilityRole="header">
        {t`Sections`}
      </Text>
      <SectionLine
        columns={columns}
        hereId={state?.current.id ?? null}
        tick={state && state.kind !== "open" ? state.current.knownNeeded : null}
        onOpen={(c) => {
          captureEvent("section_page_opened", { from: "line" });
          router.push(sectionPage(deckId, c.id));
        }}
      />
      {state && <OpeningLine state={state} due={due} starting={starting} onStart={onStart} />}
    </View>
  );
}

/**
 * A section's summary on its page: how much of it is known, where it sits in the deck, its cards'
 * states as the deck's bar, and what opens next when that is about this section.
 */
function SectionTop({
  section,
  at,
  count,
  rows,
  opening: openingNode,
}: {
  /** Null for the cards with no section. */
  section: Section | null;
  /** Its place in the line, from 0. */
  at: number;
  count: number;
  rows: DeckRow[];
  opening: ReactNode;
}) {
  const { t, i18n } = useLingui();
  const counts = useCounts(rows);
  const percent = i18n.number(rows.length ? counts.known / rows.length : 0, {
    style: "percent",
  });
  const known = i18n.number(counts.known);
  const place = i18n.number(at + 1);
  const total = i18n.number(count);
  return (
    <Plate className="gap-4 p-5">
      <View className="flex-row items-end justify-between gap-3">
        <View className="shrink gap-1">
          {section && (
            <Text
              className="text-sm font-medium uppercase text-muted"
              style={{ letterSpacing: 0.8 }}
            >
              {t`Section ${place} of ${total}`}
            </Text>
          )}
          <Text className="text-lg text-muted">
            <Trans>
              <Text
                className="text-3xl font-medium tracking-tight text-text"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {percent}
              </Text>{" "}
              known
            </Trans>
          </Text>
        </View>
        <Text className="shrink pb-1 text-base text-text-2" style={TEXT_END}>
          {plural(rows.length, { one: `${known} of # card`, other: `${known} of # cards` })}
        </Text>
      </View>
      <View className="gap-2.5">
        <StateBar counts={counts} />
        <StateCounts counts={counts} />
      </View>
      {openingNode && <View className="border-t border-edge pt-4">{openingNode}</View>}
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

/**
 * A section page's one action: Review this section when it has cards due, or Start anyway while it
 * waits. A section that is ready starts from its summary.
 */
function SectionReview({
  deckId,
  section,
  starting,
  onStart,
}: {
  deckId: string;
  section: Section;
  starting: boolean;
  onStart: (section: Section) => void;
}) {
  const { t } = useLingui();
  const router = useRouter();
  if (section.status === "locked")
    return (
      <Button
        label={t`Start anyway`}
        variant="secondary"
        size="lg"
        loading={starting}
        onPress={() => onStart(section)}
      />
    );
  if (section.status !== "open" || section.due === 0) return null;
  return (
    <Button
      label={t`Review this section`}
      variant="primary"
      size="lg"
      onPress={() => {
        haptics.start();
        router.push(`/review?deck=${deckId}&section=${section.id}` as Href);
      }}
    />
  );
}

/** The section before and after, so a learner walks the deck without going back to it. */
function Steps({
  back,
  forward,
}: {
  back: { column: LineColumn; onPress: () => void } | undefined;
  forward: { column: LineColumn; onPress: () => void } | undefined;
}) {
  if (!back && !forward) return null;
  return (
    <View className="flex-row gap-3 pt-6">
      {back ? <Step {...back} dir="back" /> : <View className="flex-1" />}
      {forward ? <Step {...forward} dir="forward" /> : <View className="flex-1" />}
    </View>
  );
}

function Step({
  column,
  dir,
  onPress,
}: {
  column: LineColumn;
  dir: "back" | "forward";
  onPress: () => void;
}) {
  const { t } = useLingui();
  const p = usePalette();
  const forward = dir === "forward";
  const name = column.section?.name ?? t`No section`;
  return (
    <Press
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={forward ? t`Next section, ${name}` : t`Previous section, ${name}`}
      className={`flex-1 gap-0.5 rounded-xl border border-edge px-4 py-3 ${forward ? "items-end" : "items-start"}`}
    >
      <View className="flex-row items-center gap-1">
        {!forward && <Icon name="back" size={14} colour={p.muted} />}
        <Text className="text-sm text-muted">{forward ? t`Next` : t`Previous`}</Text>
        {forward && <Icon name="forward" size={14} colour={p.muted} />}
      </View>
      <Text className="text-base font-medium text-text" numberOfLines={1}>
        {name}
      </Text>
    </Press>
  );
}

/** A group's heading over its words: a section, when it's back, or the day the words arrived. */
function Heading({
  group: g,
  deckId,
  hereId,
  starting,
  onStart,
  menu,
}: {
  group: DeckGroup;
  deckId: string;
  /** The section the learner is on, for You are here. */
  hereId: string | null;
  starting: string | undefined;
  onStart: (section: Section) => void;
  menu: ReturnType<typeof useSectionMenu>;
}) {
  const { t, i18n } = useLingui();
  const router = useRouter();
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
          rows={menu(section)}
        />
      ) : g.kind === "section" ? (
        // The cards with no section open their page as a section's heading does.
        <Press
          scale={0.99}
          onPress={() => {
            captureEvent("section_page_opened", { from: "heading" });
            router.push(sectionPage(deckId, ""));
          }}
          accessibilityRole="link"
        >
          <SectionTitle
            end={
              <Text className="text-base text-muted">
                {plural(g.rows.length, { one: "# card", other: "# cards" })}
              </Text>
            }
          >
            {t`No section`}
          </SectionTitle>
        </Press>
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
        {/* A row without a reading keeps a reading's room, so every row in the deck is one height. */}
        <TermText
          card={{ ...row.card, term: word }}
          room
          className="text-md font-medium text-text"
          lines={3}
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
            title: t`Couldn’t move “${{ deckName: isolate(deckName) }}”.`,
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
          ? t`Decks in a series are reviewed together.`
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
