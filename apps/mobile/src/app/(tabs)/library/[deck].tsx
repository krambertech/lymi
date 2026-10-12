import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
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
import { View } from "react-native";
import { useDeckExits } from "../../../data/decks";
import { useDeckCards, useDecks, useSections } from "../../../data/queries";
import { usePalette } from "../../../theme/palette";
import { Icon } from "../../../ui/icons";
import { DropdownMenu, Select } from "../../../ui/menu";
import { OfflineNote } from "../../../ui/offline-note";
import { Button, Plate, Press, SectionTitle, Text } from "../../../ui/primitives";
import { BarButton, Screen } from "../../../ui/screen";
import { Sheet, SheetGroup, SheetRow } from "../../../ui/sheet";
import { Skeleton } from "../../../ui/skeleton";
import { StateIcon, stateMarks } from "../../../ui/state-mark";
import { DECK_ACCESSORY } from "../../../ui/tab-bar";

const DAY = 86_400_000;

/**
 * A deck: what it wants today and how far along it is, then its words as a glossary, which Filter
 * and Sort narrow and order. Search opens at the foot, as Library's does, for this deck only.
 */
export default function Deck() {
  const { t, i18n } = useLingui();
  const router = useRouter();
  const { deck: id } = useLocalSearchParams<{ deck: string }>();
  const deck = useDecks().data?.find((d) => d.id === id);
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

  return (
    <Screen
      title={deck?.name ?? ""}
      back={{ label: t`Library`, to: "/library" }}
      actions={
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
                        onSelect: () => router.push(`/capture?deck=${id}` as Href),
                      },
                    ]
                  : []),
                {
                  label: owner ? t`Deck settings` : t`About this deck`,
                  icon: "settings",
                  onSelect: () => router.push(`/deck-settings?id=${id}` as Href),
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
                : []),
            ]}
          />
        </View>
      }
    >
      <OfflineNote query={cards} />
      {!deck || !cards.data ? (
        <View className="gap-3">
          <Skeleton height={120} />
          <Skeleton height={64} />
        </View>
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
              <Text className="px-1 text-base text-muted">
                {rows.length === 0 ? t`No cards yet.` : t`No cards match these filters.`}
              </Text>
            ) : (
              groups.map((g) => <Group key={g.key} group={g} />)
            )}
          </View>
        </>
      )}
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

/** "tomorrow", "in 3 days": when the deck's next card comes back. Hermes has no RelativeTimeFormat. */
function useNextDue(rows: DeckRow[]) {
  const { t } = useLingui();
  const now = Date.now();
  let next = Number.POSITIVE_INFINITY;
  for (const { state } of rows) {
    const at = state ? new Date(state.due).getTime() : Number.NaN;
    if (at > now && at < next) next = at;
  }
  if (!Number.isFinite(next)) return null;
  const hours = Math.max(1, Math.round((next - now) / 3_600_000));
  const days = Math.round((next - now) / DAY);
  if (days < 1) return plural(hours, { one: "in # hour", other: "in # hours" });
  if (days === 1) return t`tomorrow`;
  if (days < 30) return plural(days, { one: "in # day", other: "in # days" });
  return plural(Math.round(days / 30), { one: "in # month", other: "in # months" });
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
