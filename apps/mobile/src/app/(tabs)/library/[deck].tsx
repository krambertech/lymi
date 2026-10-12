import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { errorMessage } from "@lymi/client/api";
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
import * as Haptics from "expo-haptics";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowUpDown, ListFilter } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Alert, View } from "react-native";
import { useDeckExits } from "../../../data/decks";
import { moveBack } from "../../../data/move-undo";
import { useNextDue } from "../../../data/next-due";
import { useDeckCards, useDecks, useSections, useSeriesList } from "../../../data/queries";
import { useMoveNotice, useSeriesActions } from "../../../data/series";
import { useOnline } from "../../../streak/goal-picker";
import { usePalette } from "../../../theme/palette";
import { EmptyState } from "../../../ui/empty-state";
import { Icon } from "../../../ui/icons";
import { LoadFailed, useLoadFailed } from "../../../ui/load-failed";
import { DropdownMenu, Select } from "../../../ui/menu";
import { OfflineNote } from "../../../ui/offline-note";
import { Button, Plate, Press, SectionTitle, Text } from "../../../ui/primitives";
import { BarButton, Screen } from "../../../ui/screen";
import { Sheet, SheetGroup, SheetRow } from "../../../ui/sheet";
import { Skeleton } from "../../../ui/skeleton";
import { StateIcon, stateMarks } from "../../../ui/state-mark";
import { DECK_ACCESSORY } from "../../../ui/tab-bar";

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
  const sections = useSections(id).data?.sections ?? [];
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
  const exits = useDeckExits(deck);
  const [moving, setMoving] = useState(false);
  // The deck's name and counts come from the deck list, its words from its cards: either can fail.
  const cardsFailed = useLoadFailed(cards);
  const decksFailed = useLoadFailed(decks);
  const addCard = () => router.push(`/capture?deck=${id}` as Href);

  return (
    <Screen
      title={deck?.name ?? ""}
      back={{ label: t`Library`, to: "/library" }}
      actions={
        // A deck that has gone has nothing to search or change.
        !gone && (
          <View className="flex-row items-center gap-2.5">
            <BarButton
              icon="search"
              label={t`Search this deck`}
              onPress={() => router.push(`/search?deck=${id}` as Href)}
            />
            <DropdownMenu
              title={deck?.name}
              trigger={(open) => <BarButton icon="more" label={t`Deck options`} onPress={open} />}
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
                          label: t`Move to series`,
                          icon: "series" as const,
                          onSelect: () => setMoving(true),
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
          <Top deck={deck} rows={rows} />
          <View className="gap-6">
            <Tools
              sections={sections}
              filters={filters}
              setFilters={setFilters}
              sort={sort}
              setSort={setSort}
            />
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
              groups.map((g) => <Group key={g.key} group={g} />)
            )}
          </View>
        </>
      )}
      {deck && owner && <MoveToSeries deck={deck} open={moving} onOpenChange={setMoving} />}
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

function Top({ deck, rows }: { deck: DeckData; rows: DeckRow[] }) {
  const { t, i18n } = useLingui();
  const router = useRouter();
  const counts = useCounts(rows);
  const next = useNextDue(rows);
  const due = deck.due;
  const review = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/review?deck=${deck.id}` as Href);
  };
  const line =
    due > 0 ? null : next ? t`Next card due ${next}.` : rows.length ? t`Nothing scheduled.` : null;
  // From iOS 26 the deck's review rides in the tab bar's accessory instead. phone.md.
  const button = !DECK_ACCESSORY && due > 0 && (
    <Button label={t`Review`} variant="primary" size="lg" onPress={review} />
  );
  const dueText = plural(due, { one: "card to review now", other: "cards to review now" });
  const groupLabel = (k: keyof typeof counts) => i18n._(stateMarks[k].groupLabel);

  return (
    <Plate className="flex-row overflow-hidden">
      <View className="flex-1 justify-between gap-3 p-5">
        <View className="gap-1">
          <Text
            className="text-5xl font-semibold text-text"
            style={{ fontVariant: ["tabular-nums"], letterSpacing: -1.5 }}
          >
            {due}
          </Text>
          <Text className="text-base text-text-2">{dueText}</Text>
          {line && <Text className="text-sm text-muted">{line}</Text>}
        </View>
        {button}
      </View>
      <View className="w-px bg-edge" />
      <View className="justify-center gap-3 px-5 py-5">
        <View className="flex-row items-baseline gap-2 border-b border-edge pb-3">
          <Text
            className="text-lg font-semibold text-text"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {rows.length}
          </Text>
          <Text className="text-base text-muted">
            {plural(rows.length, { one: "card", other: "cards" })}
          </Text>
        </View>
        {(["new", "learning", "known"] as const).map((k) => (
          <View key={k} className="flex-row items-center gap-2">
            <StateIcon state={k} size={16} />
            <Text
              className={`text-lg font-semibold ${counts[k] ? "text-text" : "text-muted"}`}
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {counts[k]}
            </Text>
            <Text className="text-base text-muted">{groupLabel(k)}</Text>
          </View>
        ))}
      </View>
    </Plate>
  );
}

/**
 * Filter and Sort over the list, as the web's: Filter is one sheet of choices that stays open while
 * choosing, each active filter a chip that removes it. Both reset when the learner leaves the deck.
 */
function Tools({
  sections,
  filters,
  setFilters,
  sort,
  setSort,
}: {
  sections: { id: string; name: string }[];
  filters: DeckFilters;
  setFilters: (f: DeckFilters) => void;
  sort: DeckSort;
  setSort: (s: DeckSort) => void;
}) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const [choosing, setChoosing] = useState(false);
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
  const pill = (icon: "filter" | "sort", label: string, on = false) => {
    const Glyph = icon === "filter" ? ListFilter : ArrowUpDown;
    return (
      <View
        className={`h-9 flex-row items-center gap-1.5 rounded-full border bg-plate px-3.5 ${on ? "border-text" : "border-edge"}`}
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
        <Press
          onPress={() => setChoosing(true)}
          accessibilityRole="button"
          accessibilityLabel={t`Filter`}
        >
          {pill("filter", chips.length ? t`Filter · ${chips.length}` : t`Filter`, chips.length > 0)}
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
              className="h-9 flex-row items-center gap-1.5 rounded-full bg-plate-2 ps-3 pe-2.5"
            >
              <Text className="text-base font-medium text-text-2">{name}</Text>
              <Icon name="close" size={14} colour={p.muted} />
            </Press>
          );
        })}
      </View>
      <Sheet title={t`Filter`} open={choosing} onOpenChange={setChoosing}>
        <SheetGroup>
          {(["new", "learning", "known"] as const).map((s) => (
            <SheetRow
              key={s}
              label={i18n._(stateMarks[s].groupLabel)}
              chosen={filters.states.includes(s)}
              multiple
              onPress={() => setFilters({ ...filters, states: toggle(filters.states, s) })}
            />
          ))}
        </SheetGroup>
        <SheetGroup>
          {([null, "today", "week"] as const).map((d) => (
            <SheetRow
              key={d ?? "any"}
              label={d ? dueName[d] : t`Any time`}
              chosen={filters.due === d}
              onPress={() => setFilters({ ...filters, due: d })}
            />
          ))}
        </SheetGroup>
        {sections.length > 0 && (
          <SheetGroup>
            {[...sections.map((s) => s.id), ""].map((sid) => (
              <SheetRow
                key={sid || "none"}
                label={sectionName(sid)}
                chosen={filters.sections.includes(sid)}
                multiple
                onPress={() => setFilters({ ...filters, sections: toggle(filters.sections, sid) })}
              />
            ))}
          </SheetGroup>
        )}
      </Sheet>
    </View>
  );
}

/** One heading and its words: a section, when it's back, or the day the words arrived. */
function Group({ group: g }: { group: DeckGroup }) {
  const { t, i18n } = useLingui();
  const title =
    g.kind === "section"
      ? (g.section?.name ?? t`No section`)
      : g.kind === "due"
        ? { now: t`Due now`, week: t`This week`, later: t`Later`, new: t`Not started` }[g.bucket]
        : g.kind === "day"
          ? i18n.date(g.day, { weekday: "long", day: "numeric", month: "long" })
          : null;
  return (
    <View>
      {title && (
        <SectionTitle
          end={
            <Text className="text-base text-muted" style={{ fontVariant: ["tabular-nums"] }}>
              {plural(g.rows.length, { one: "# card", other: "# cards" })}
            </Text>
          }
        >
          {title}
        </SectionTitle>
      )}
      <Plate className="overflow-hidden">
        {g.rows.map((row, i) => (
          <WordRow key={row.card.id} row={row} first={i === 0} />
        ))}
      </Plate>
    </View>
  );
}

/**
 * A word as a glossary reads it: the state's mark, the term with its forms quieter, and the meaning
 * under it, at most three lines of term and two of meaning. The open card shows the rest.
 */
function WordRow({ row, first }: { row: DeckRow; first: boolean }) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const router = useRouter();
  const state = stateKey(row.state?.state);
  const { word, forms } = splitForms(row.card.term);
  return (
    <Press
      scale={0.99}
      onPress={() => router.push(`/library/card/${row.card.id}?deck=${row.card.deckId}` as Href)}
      accessibilityRole="link"
      accessibilityLabel={`${row.card.term}, ${row.card.meaning ?? ""}, ${i18n._(stateMarks[state].label)}`}
      className={`flex-row gap-3 py-3.5 ps-4 pe-5 ${first ? "" : "border-t border-edge"}`}
    >
      <View className="pt-[5px]">
        <StateIcon state={state} size={15} />
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
  const p = usePalette();
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
        onError: (e) => Alert.alert(t`Couldn’t move the deck`, errorMessage(e)),
      },
    );
  const pick = (seriesId: string | null) => {
    if (!online || !back) return;
    onOpenChange(false);
    if (seriesId === deck.seriesId) return;
    Haptics.selectionAsync();
    const name = seriesId ? series.find((s) => s.id === seriesId)?.name : undefined;
    move(seriesId, () => notice(deckName, name, () => undoMove(deck.id, back)));
  };
  return (
    <Sheet title={t`Move to series`} open={open} onOpenChange={onOpenChange}>
      <Text className="px-1 text-base text-text-2">
        {t`“${deckName}” is reviewed with the other decks in its series.`}
      </Text>
      {!online && (
        <View className="flex-row items-center gap-1.5 px-1">
          <Icon name="offline" size={14} colour={p.muted} />
          <Text className="flex-1 text-base text-muted">{t`Changing series needs a connection.`}</Text>
        </View>
      )}
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
