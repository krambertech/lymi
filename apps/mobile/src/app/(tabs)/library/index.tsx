import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { type DeckSummary, errorMessage, type Series } from "@lymi/client/api";
import { groupDecks } from "@lymi/client/library-groups";
import * as Haptics from "expo-haptics";
import { type Href, Link, useRouter } from "expo-router";
import { Alert, Pressable, View } from "react-native";
import { languageName } from "../../../data/languages";
import { useArchivedDecks, useDecks, useSeriesList } from "../../../data/queries";
import { useOnline, useSeriesActions } from "../../../data/series";
import { usePalette } from "../../../theme/palette";
import { ListRow, ListRowFace, listRowLabel } from "../../../ui/list-row";
import { DropdownMenu } from "../../../ui/menu";
import { MorphMenu } from "../../../ui/morph-menu";
import { OfflineNote } from "../../../ui/offline-note";
import { openWeb } from "../../../ui/on-the-web";
import { Icon, IconButton, Plate, Press, Text } from "../../../ui/primitives";
import { Row, Rows } from "../../../ui/row";
import { BarButton, Screen } from "../../../ui/screen";

/**
 * Library: the decks without a series in one plate, then each series under its heading, then
 * Archived. The bar holds what Library is for: search across every deck, and a plus that adds a
 * card, a deck or a series. The streak stays on Today.
 */
export default function Library() {
  const { t } = useLingui();
  const router = useRouter();
  const query = useDecks();
  const decks = query.data ?? [];
  const series = useSeriesList(true).data;
  const archived = useArchivedDecks().data?.length ?? 0;
  const groups = groupDecks(decks, series);
  const p = usePalette();
  const newDeck = () => router.push("/new-deck");
  const newSeries = () => router.push("/series");
  return (
    <Screen
      title={t`Library`}
      kind="tab"
      actions={
        <>
          <BarButton icon="search" label={t`Search`} onPress={() => router.push("/search")} />
          <MorphMenu
            label={t`Add`}
            items={[
              { label: t`Add a card`, icon: "plus", onSelect: () => router.push("/capture") },
              { label: t`New deck`, icon: "deck", onSelect: newDeck },
              { label: t`New series`, icon: "series", onSelect: newSeries },
              { label: t`Import decks`, icon: "import", onSelect: () => openWeb("/import") },
            ]}
          />
        </>
      }
    >
      <OfflineNote query={query} />
      <Plate className="overflow-hidden">
        {groups.loose.map((d, i) => (
          <DeckRow key={d.id} deck={d} first={i === 0} />
        ))}
        <ListRow
          first={groups.loose.length === 0}
          title={t`New deck`}
          mark={<Icon name="plus" size={16} colour={p["text-2"]} strokeWidth={2.25} />}
          end="none"
          onPress={newDeck}
        />
      </Plate>
      {groups.series.map(({ series: s, decks: inSeries }, i) => (
        <SeriesGroup
          key={s.id}
          series={s}
          decks={inSeries}
          index={i}
          count={groups.series.length}
        />
      ))}
      <Rows>
        <Row
          icon="archive"
          label={t`Archived`}
          value={archived ? String(archived) : undefined}
          onPress={() => router.push("/library/archived")}
        />
      </Rows>
    </Screen>
  );
}

/**
 * A series is a heading with its menu, then one plate: Review all first, because a series is
 * studied as one, then its decks in the series' order.
 */
function SeriesGroup({
  series: s,
  decks,
  index,
  count,
}: {
  series: Series;
  decks: DeckSummary[];
  index: number;
  count: number;
}) {
  const { t } = useLingui();
  const router = useRouter();
  const p = usePalette();
  const cards = decks.reduce((n, d) => n + d.total, 0);
  const due = decks.reduce((n, d) => n + d.due, 0);
  const review = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/review?series=${s.id}`);
  };
  const seriesName = s.name;
  const reviewLabel = t`Review ${seriesName}, ${plural(due, { one: "# card due", other: "# cards due" })}`;
  return (
    <View>
      <View className="flex-row items-center gap-2 pb-3 ps-1 pt-2">
        <View className="flex-1 gap-0.5">
          <Text
            className="text-lg font-medium text-text"
            accessibilityRole="header"
            numberOfLines={1}
          >
            {seriesName}
          </Text>
          <Text className="text-base text-muted" style={{ fontVariant: ["tabular-nums"] }}>
            {t`${plural(decks.length, { one: "# deck", other: "# decks" })} · ${plural(cards, { one: "# card", other: "# cards" })}`}
          </Text>
        </View>
        {/* The series' review is its one action, so it sits on the series, not among its decks. */}
        {due > 0 && (
          <Press
            onPress={review}
            drawn={36}
            accessibilityRole="button"
            accessibilityLabel={reviewLabel}
            className="h-9 flex-row items-center gap-1.5 rounded-full bg-amber ps-3 pe-3.5"
          >
            <Icon name="play" size={15} colour={p["amber-ink"]} strokeWidth={2.25} />
            <Text
              className="text-base font-semibold text-amber-ink"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {due}
            </Text>
          </Press>
        )}
        <SeriesMenu series={s} decks={decks.length} index={index} count={count} />
      </View>
      <Plate className="overflow-hidden">
        {decks.map((d, i) => (
          <DeckRow key={d.id} deck={d} first={i === 0} />
        ))}
      </Plate>
    </View>
  );
}

function SeriesMenu({
  series: s,
  decks,
  index,
  count,
}: {
  series: Series;
  decks: number;
  index: number;
  count: number;
}) {
  const { t } = useLingui();
  const router = useRouter();
  const actions = useSeriesActions();
  const seriesName = s.name;
  const online = useOnline();
  // A series write has no place on screen to say it failed, so iOS says it.
  const failed = (e: unknown) => Alert.alert(t`That didn’t go through`, errorMessage(e));
  // Series writes go straight to the Worker, so offline the menu says so instead of waiting.
  const needsConnection = (then: () => void) => () =>
    online ? then() : Alert.alert(t`Changing series needs a connection.`);
  return (
    <DropdownMenu
      title={seriesName}
      trigger={(open) => (
        <IconButton icon="more" label={t`Options for ${seriesName}`} size="sm" onPress={open} />
      )}
      items={[
        [
          {
            label: t`Choose decks`,
            icon: "deck",
            onSelect: () => router.push(`/series-decks?id=${s.id}` as Href),
          },
          {
            label: t`Rename series`,
            icon: "edit",
            onSelect: () => router.push(`/series?id=${s.id}` as Href),
          },
          ...(index > 0
            ? [
                {
                  label: t`Move up`,
                  icon: "moveUp" as const,
                  onSelect: needsConnection(() =>
                    actions.move.mutate({ series: s, by: -1 }, { onError: failed }),
                  ),
                },
              ]
            : []),
          ...(index < count - 1
            ? [
                {
                  label: t`Move down`,
                  icon: "moveDown" as const,
                  onSelect: needsConnection(() =>
                    actions.move.mutate({ series: s, by: 1 }, { onError: failed }),
                  ),
                },
              ]
            : []),
        ],
        [
          {
            label: t`Delete series`,
            icon: "delete",
            destructive: true,
            onSelect: needsConnection(() =>
              confirmDelete(t, s, decks, (input) =>
                actions.remove.mutate(input, { onError: failed }),
              ),
            ),
          },
        ],
      ]}
    />
  );
}

/**
 * Deleting a series is the one series write with no Undo, so iOS asks first, and the learner
 * chooses whether its decks stay in Library or are archived with it.
 */
function confirmDelete(
  t: ReturnType<typeof useLingui>["t"],
  s: Series,
  decks: number,
  remove: (input: { series: Series; decks: "archive" | "keep" }) => void,
) {
  const name = s.name;
  const cancel = { text: t`Cancel`, style: "cancel" as const };
  if (decks === 0) {
    Alert.alert(t`Delete “${name}”?`, t`The series is deleted for good.`, [
      cancel,
      {
        text: t`Delete`,
        style: "destructive",
        onPress: () => remove({ series: s, decks: "keep" }),
      },
    ]);
    return;
  }
  Alert.alert(
    t`Delete “${name}”?`,
    t`The series is deleted for good. Its decks can stay in Library or be archived with it.`,
    [
      { text: t`Keep the decks`, onPress: () => remove({ series: s, decks: "keep" }) },
      {
        text: t`Archive the decks`,
        style: "destructive",
        onPress: () => remove({ series: s, decks: "archive" }),
      },
      cancel,
    ],
  );
}

/** A deck: its name, then whose it is, its language and size; the due count at the end. */
function DeckRow({ deck: d, first }: { deck: DeckSummary; first: boolean }) {
  const { t } = useLingui();
  const router = useRouter();
  const language = d.defaultLanguage ? languageName(d.defaultLanguage) : null;
  const size =
    d.total === 0 ? t`No cards yet` : plural(d.total, { one: "# card", other: "# cards" });
  const owner = d.owner.name;
  const line = [d.role === "owner" ? null : t`Shared by ${owner}`, language, size]
    .filter(Boolean)
    .join(" · ");
  const due = d.due > 0 ? d.due : undefined;
  return (
    <Link href={`/library/${d.id}`} asChild>
      <Link.Trigger>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={listRowLabel(
            d.name,
            due && plural(due, { one: "# card due", other: "# cards due" }),
            line,
          )}
          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.99 : 1 }] })}
        >
          <ListRowFace first={first} title={d.name} line={line} count={due} end="open" />
        </Pressable>
      </Link.Trigger>
      <Link.Preview />
      <Link.Menu>
        <Link.MenuAction
          title={t`Review`}
          icon="play"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push(`/review?deck=${d.id}`);
          }}
        />
        <Link.MenuAction
          title={t`Add a card`}
          icon="plus"
          onPress={() => router.push("/capture")}
        />
      </Link.Menu>
    </Link>
  );
}
