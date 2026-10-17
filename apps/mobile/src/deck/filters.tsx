import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import {
  activeFilterCount,
  type DeckFilters,
  type DeckRow,
  type DeckSort,
  deckTags,
  noFilters,
} from "@lymi/client/deck-list";
import type { AnalyticsProperties } from "@lymi/core/analytics";
import { EASE_OUT } from "@lymi/design";
import { ArrowUpDown, ListFilter } from "lucide-react-native";
import { type ReactNode, useMemo, useState } from "react";
import { I18nManager, ScrollView, useWindowDimensions, View } from "react-native";
import Animated, { withTiming } from "react-native-reanimated";
import { captureEvent } from "../telemetry/posthog";
import { ALWAYS, CROSSFADE, curve, useReduceMotion } from "../theme/motion";
import { usePalette } from "../theme/palette";
import { Icon } from "../ui/icons";
import { SEARCHED_PAST, SearchField, Select, useSearched } from "../ui/menu";
import { Press, Text } from "../ui/primitives";
import { Sheet, SheetGroup, SheetHeading, SheetRow } from "../ui/sheet";
import { stateMarks } from "../ui/state-mark";

type Kind = AnalyticsProperties<"deck_filter_added">["kind"];
type Level = "filters" | "tags" | "sections";

/** How far a level travels as it arrives, while the sheet glides to its height. */
const LEVEL_TRAVEL = 16;

/** A level arriving: it fades in and settles from the side the learner is going toward. */
function levelIn(from: number) {
  const easing = curve(EASE_OUT);
  return () => {
    "worklet";
    return {
      initialValues: { opacity: 0, transform: [{ translateX: from }] },
      animations: {
        opacity: withTiming(1, { duration: 220, easing, reduceMotion: ALWAYS }),
        transform: [{ translateX: withTiming(0, { duration: 260, easing, reduceMotion: ALWAYS }) }],
      },
    };
  };
}

const toggle = <T,>(list: T[], item: T) =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

/** The kinds of filter turned on from `before` to `after`, each once. */
function addedKinds(before: DeckFilters, after: DeckFilters): Kind[] {
  const grew = (a: string[], b: string[]) => b.some((x) => !a.includes(x));
  return [
    ...(grew(before.states, after.states) ? (["state"] as const) : []),
    ...(after.due && after.due !== before.due ? (["due"] as const) : []),
    ...(grew(before.sections, after.sections) ? (["section"] as const) : []),
    ...(grew(before.tags, after.tags) ? (["tag"] as const) : []),
  ];
}

interface FilterToolsProps {
  rows: DeckRow[];
  sections: { id: string; name: string }[];
  filters: DeckFilters;
  setFilters: (f: DeckFilters) => void;
  /** How many of the deck's cards a set of filters keeps. */
  count: (f: DeckFilters) => number;
  sort: DeckSort;
  setSort: (s: DeckSort) => void;
  /** Under the row, such as the filtered review where the tab bar cannot carry it. */
  footer?: ReactNode;
}

/**
 * Filter and Sort over the list. Filter is one sheet: state and when cards are due are chosen on
 * its first level, and Section and Tags, which can run long, each open a level of their own in the
 * same sheet. Each tap saves to a draft that the count under the title answers, and the list
 * changes once, as the sheet goes. With filters on, the Filter pill counts them. Both reset when
 * the learner leaves the deck. phone.md "Sheets".
 */
export function FilterTools({
  rows,
  sections,
  filters,
  setFilters,
  count,
  sort,
  setSort,
  footer,
}: FilterToolsProps) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const [choosing, setChoosing] = useState(false);
  const [level, setLevel] = useState<Level>("filters");
  // Into a list the level arrives from the end; back out, from the start, mirrored right to left.
  const [deeper, setDeeper] = useState(true);
  // Only a change of level travels; the sheet's own rise brings the first one.
  const [moved, setMoved] = useState(false);
  // A list level keeps the first level's height and scrolls inside it, so the sheet never resizes between levels.
  const [firstHeight, setFirstHeight] = useState<number | null>(null);
  const fill = firstHeight ?? undefined;
  const reduce = useReduceMotion();
  const go = (next: Level) => {
    setDeeper(next !== "filters");
    setMoved(true);
    setLevel(next);
  };
  const travel = (deeper ? LEVEL_TRAVEL : -LEVEL_TRAVEL) * (I18nManager.isRTL ? -1 : 1);
  const [draft, setDraft] = useState<DeckFilters>(filters);
  const tags = useMemo(() => deckTags(rows), [rows]);
  const total = rows.length;
  const sortName: Record<DeckSort, string> = {
    section: t`Section`,
    due: t`When it’s back`,
    added: t`Recently added`,
    az: t`A–Z`,
  };
  const sectionName = (sid: string) =>
    sid ? (sections.find((s) => s.id === sid)?.name ?? "") : t`No section`;
  const tagName = (key: string) => tags.find((tag) => tag.key === key)?.name ?? key;
  const active = activeFilterCount(filters);
  const open = () => {
    setDraft(filters);
    setLevel("filters");
    setMoved(false);
    setChoosing(true);
  };
  const drafted =
    draft.states.length > 0 ||
    draft.due !== null ||
    draft.sections.length > 0 ||
    draft.tags.length > 0;
  const shown = i18n.number(count(draft));
  const counted = drafted
    ? plural(total, { one: `${shown} of # card`, other: `${shown} of # cards` })
    : plural(total, { one: "# card", other: "# cards" });
  const picked = (keys: string[], name: (key: string) => string, many: string) =>
    keys.length === 0 ? undefined : keys.length === 1 ? name(keys[0] ?? "") : many;
  const pill = (icon: "filter" | "sort", label: string) => {
    const Glyph = icon === "filter" ? ListFilter : ArrowUpDown;
    return (
      <View className="min-h-9 flex-row items-center gap-1.5 rounded-full border border-edge bg-plate px-3.5 py-1.5">
        <Glyph size={15} color={p["text-2"]} strokeWidth={2} />
        <Text className="text-base font-medium text-text">{label}</Text>
      </View>
    );
  };
  // With filters on, Filter is ink, as a chosen chip is, and its count stands in a badge of its own.
  const filterPill = active ? (
    <View className="min-h-9 flex-row items-center gap-1.5 rounded-full border border-text bg-text py-1.5 ps-3.5 pe-1.5">
      <ListFilter size={15} color={p.canvas} strokeWidth={2} />
      <Text className="text-base font-medium" style={{ color: p.canvas }}>
        {t`Filter`}
      </Text>
      <View className="h-6 min-w-6 items-center justify-center rounded-full bg-canvas px-1.5">
        <Text className="text-sm font-semibold text-text" style={{ fontVariant: ["tabular-nums"] }}>
          {i18n.number(active)}
        </Text>
      </View>
    </View>
  ) : (
    pill("filter", t`Filter`)
  );
  const sorts = sections.length
    ? (["section", "due", "added", "az"] as const)
    : (["added", "due", "az"] as const);

  const apply = () => {
    if (JSON.stringify(draft) !== JSON.stringify(filters)) {
      for (const kind of addedKinds(filters, draft)) captureEvent("deck_filter_added", { kind });
      setFilters(draft);
    }
    setChoosing(false);
  };
  const dueOptions = [
    { value: null, label: t`Any time` },
    { value: "today", label: t`Today` },
    { value: "week", label: t`This week` },
  ] as const;

  const content =
    level === "tags" ? (
      <Choices
        fill={fill}
        label={t`Tags`}
        options={tags.map((tag) => ({ key: tag.key, label: tag.name }))}
        chosen={draft.tags}
        count={(key) => i18n.number(count({ ...draft, tags: [key] }))}
        onToggle={(key) => setDraft({ ...draft, tags: toggle(draft.tags, key) })}
      />
    ) : level === "sections" ? (
      <Choices
        fill={fill}
        label={t`Section`}
        options={[...sections.map((s) => s.id), ""].map((sid) => ({
          key: sid,
          label: sectionName(sid),
        }))}
        chosen={draft.sections}
        count={(key) => i18n.number(count({ ...draft, sections: [key] }))}
        onToggle={(key) => setDraft({ ...draft, sections: toggle(draft.sections, key) })}
      />
    ) : (
      // Every filter is a heading over one plate of rows whose labels share a line: a mark, a check
      // or an icon in the slot, the label, and what it keeps at the end.
      <>
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
        <SheetGroup>
          {dueOptions.map((o) => (
            <SheetRow
              key={o.value ?? "any"}
              label={o.label}
              value={i18n.number(count({ ...draft, due: o.value }))}
              chosen={draft.due === o.value}
              onPress={() => setDraft({ ...draft, due: o.value })}
            />
          ))}
        </SheetGroup>
        {sections.length > 0 && (
          <>
            <SheetHeading>{t`Section`}</SheetHeading>
            <SheetGroup>
              <SheetRow
                icon="section"
                label={
                  picked(
                    draft.sections,
                    sectionName,
                    plural(draft.sections.length, { one: "# section", other: "# sections" }),
                  ) ?? t`Any section`
                }
                opens
                onPress={() => go("sections")}
              />
            </SheetGroup>
          </>
        )}
        {tags.length > 0 && (
          <>
            <SheetHeading>{t`Tags`}</SheetHeading>
            <SheetGroup>
              <SheetRow
                icon="tags"
                label={
                  picked(
                    draft.tags,
                    tagName,
                    plural(draft.tags.length, { one: "# tag", other: "# tags" }),
                  ) ?? t`Any tag`
                }
                opens
                onPress={() => go("tags")}
              />
            </SheetGroup>
          </>
        )}
        {/* An action on the whole sheet rather than a row of a section, so it stands apart under them. */}
        {drafted && (
          <Press
            onPress={() => setDraft(noFilters)}
            accessibilityRole="button"
            className="mt-3 min-h-11 flex-row items-center justify-center gap-2 self-center px-4"
          >
            <Icon name="reset" size={18} colour={p.text} />
            <Text className="text-md font-medium text-text">{t`Reset filters`}</Text>
          </Press>
        )}
      </>
    );

  return (
    <View className="gap-2.5">
      <View className="flex-row flex-wrap items-center gap-2">
        <Press
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel={t`Filter`}
          accessibilityValue={
            active
              ? { text: plural(active, { one: "# filter on", other: "# filters on" }) }
              : undefined
          }
        >
          {filterPill}
        </Press>
        <Select
          label={t`Sort`}
          value={sort}
          options={sorts.map((k) => ({ value: k, label: sortName[k] }))}
          onChange={setSort}
          trigger={pill("sort", sortName[sort])}
        />
      </View>
      {footer}
      <Sheet
        title={level === "tags" ? t`Tags` : level === "sections" ? t`Section` : t`Filter`}
        back={level === "filters" ? undefined : { label: t`Filter`, onPress: () => go("filters") }}
        subtitle={counted}
        save={{ label: t`Apply filters`, onPress: apply }}
        open={choosing}
        onOpenChange={setChoosing}
        // Close and a swipe leave the filters as they were; the next opening starts from them.
        onDismiss={() => setLevel("filters")}
      >
        {/* No exit, so the two levels never stand together and the sheet glides once. */}
        <Animated.View
          key={level}
          className="gap-3"
          entering={!moved ? undefined : reduce ? CROSSFADE : levelIn(travel)}
          onLayout={
            level === "filters" ? (e) => setFirstHeight(e.nativeEvent.layout.height) : undefined
          }
          style={level !== "filters" && fill ? { height: fill } : undefined}
        >
          {content}
        </Animated.View>
      </Sheet>
    </View>
  );
}

/** One list on its own level of the Filter sheet, ticked into the draft; past fifteen it is searched. */
function Choices({
  fill,
  label,
  options,
  chosen,
  count,
  onToggle,
}: {
  /** The height the level keeps, which the list scrolls within. */
  fill: number | undefined;
  /** What the search field searches, for VoiceOver. */
  label: string;
  options: { key: string; label: string }[];
  chosen: string[];
  /** How many cards this option keeps with the other filters as drafted. */
  count: (key: string) => string;
  onToggle: (key: string) => void;
}) {
  const { t } = useLingui();
  const { height } = useWindowDimensions();
  const { query, setQuery, shown } = useSearched(options);
  const rows = (
    <SheetGroup>
      {shown.map((o) => (
        <SheetRow
          key={o.key || "none"}
          label={o.label}
          value={count(o.key)}
          chosen={chosen.includes(o.key)}
          multiple
          onPress={() => onToggle(o.key)}
        />
      ))}
    </SheetGroup>
  );
  const searched = options.length > SEARCHED_PAST;
  if (!searched && !fill) return rows;
  if (!searched) {
    return (
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
        {rows}
      </ScrollView>
    );
  }
  return (
    <>
      <SearchField
        label={label}
        query={query}
        onChange={setQuery}
        onSubmit={() => {
          const first = shown[0];
          if (first) onToggle(first.key);
          setQuery("");
        }}
      />
      <ScrollView
        style={fill ? { flex: 1 } : { height: height * 0.5 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {shown.length > 0 ? (
          rows
        ) : (
          <Text className="px-4 py-3 text-md text-muted">{t`No matches`}</Text>
        )}
      </ScrollView>
    </>
  );
}
