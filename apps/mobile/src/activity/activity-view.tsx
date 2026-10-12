import { Plural, Trans, useLingui } from "@lingui/react/macro";
import type { ActivityCard, ActivityEntry } from "@lymi/client/api";
import { useRouter } from "expo-router";
import { type ReactNode, useState } from "react";
import { View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { useReduceMotion } from "../theme/motion";
import { usePalette } from "../theme/palette";
import { Chip } from "../ui/chip";
import type { IconName } from "../ui/icons";
import { openWeb } from "../ui/on-the-web";
import { Button, Icon, Plate, Press, RowArrow, Text } from "../ui/primitives";
import { Skeleton } from "../ui/skeleton";

// The web's Activity on the phone: one list under day headings, each day a plate of rows.
// docs/design/activity.md.

/** The verb of a row, which is what its mark says; the sentence says what it was done to. */
const VERB_ICONS: Record<string, IconName> = {
  added: "plus",
  enriched: "ai",
  edited: "edit",
  archived: "archive",
  restored: "restore",
  deleted: "archive",
  import: "fileIn",
  export: "export",
  member_joined: "joined",
  member_left: "left",
  member_removed: "left",
  invitation_sent: "invite",
  invitation_cancelled: "uninvite",
  link_on: "linkOn",
  link_off: "linkOff",
};

function iconFor(kind: string): IconName {
  return VERB_ICONS[kind] ?? VERB_ICONS[kind.slice(kind.indexOf("_") + 1)] ?? "edit";
}

const SOURCE_NAMES: Record<string, string> = { anki: "Anki", mochi: "Mochi", lymi: "Lymi" };

/** The row's sentence. It never names the caller, which the line under it does. */
function Sentence({ entry }: { entry: ActivityEntry }) {
  const { t } = useLingui();
  const deck = entry.deck?.name ?? "";
  const name = entry.person ?? t`Someone`;
  const count = entry.count;
  // The kind is an open list: a kind a newer server adds reads as a change, never as a blank row.
  switch (entry.kind as string) {
    case "cards_added":
      return (
        <Trans>
          Added <Plural value={count} one="# card" other="# cards" /> to {deck}
        </Trans>
      );
    case "cards_enriched":
      return (
        <Trans>
          Enriched <Plural value={count} one="# card" other="# cards" /> in {deck}
        </Trans>
      );
    case "cards_edited":
      return (
        <Trans>
          Edited <Plural value={count} one="# card" other="# cards" /> in {deck}
        </Trans>
      );
    case "cards_archived":
      return (
        <Trans>
          Archived <Plural value={count} one="# card" other="# cards" /> in {deck}
        </Trans>
      );
    case "cards_restored":
      return (
        <Trans>
          Restored <Plural value={count} one="# card" other="# cards" /> in {deck}
        </Trans>
      );
    case "deck_added":
      return <Trans>Made the deck {deck}</Trans>;
    case "deck_edited":
      return <Trans>Edited the deck {deck}</Trans>;
    case "deck_archived":
      return <Trans>Archived the deck {deck}</Trans>;
    case "deck_restored":
      return <Trans>Restored the deck {deck}</Trans>;
    case "series_added":
      return <Trans>Made the series {name}</Trans>;
    case "series_edited":
      return <Trans>Edited the series {name}</Trans>;
    case "series_deleted":
      return <Trans>Deleted the series {name}</Trans>;
    case "series_restored":
      return <Trans>Restored the series {name}</Trans>;
    case "section_added":
      return (
        <Trans>
          Made the section {name} in {deck}
        </Trans>
      );
    case "section_edited":
      return (
        <Trans>
          Edited the section {name} in {deck}
        </Trans>
      );
    case "section_archived":
      return (
        <Trans>
          Archived the section {name} in {deck}
        </Trans>
      );
    case "section_restored":
      return (
        <Trans>
          Restored the section {name} in {deck}
        </Trans>
      );
    case "member_joined":
      return (
        <Trans>
          {name} joined {deck}
        </Trans>
      );
    case "member_left":
      return (
        <Trans>
          {name} left {deck}
        </Trans>
      );
    case "invitation_sent":
      return (
        <Trans>
          Invited {name} to {deck}
        </Trans>
      );
    case "invitation_cancelled":
      return (
        <Trans>
          Cancelled the invitation to {name} for {deck}
        </Trans>
      );
    case "member_removed":
      return (
        <Trans>
          Removed {name} from {deck}
        </Trans>
      );
    case "link_on":
      return <Trans>Turned on the join link for {deck}</Trans>;
    case "link_off":
      return <Trans>Turned off the join link for {deck}</Trans>;
    case "export":
      return <ExportSentence entry={entry} />;
    case "import":
      return <ImportSentence entry={entry} />;
    default:
      return deck ? <Trans>Made a change in {deck}</Trans> : <Trans>Made a change</Trans>;
  }
}

function ExportSentence({ entry }: { entry: ActivityEntry }) {
  const item = entry.export;
  if (!item) return <Trans>Exported your cards</Trans>;
  const cards = item.counts?.cards ?? 0;
  if (item.status === "exporting") {
    return item.format === "anki" ? (
      <Trans>Exporting as an Anki package</Trans>
    ) : (
      <Trans>Exporting as a Lymi file</Trans>
    );
  }
  return item.format === "anki" ? (
    <Trans>
      Exported <Plural value={cards} one="# card" other="# cards" /> as an Anki package
    </Trans>
  ) : (
    <Trans>
      Exported <Plural value={cards} one="# card" other="# cards" /> as a Lymi file
    </Trans>
  );
}

function ImportSentence({ entry }: { entry: ActivityEntry }) {
  const item = entry.import;
  const source = item ? (SOURCE_NAMES[item.source] ?? item.source) : "";
  const added = item?.counts?.added ?? 0;
  if (item && (item.status === "done" || (item.status === "failed" && added > 0))) {
    return (
      <Trans>
        Imported <Plural value={added} one="# card" other="# cards" /> from {source}
      </Trans>
    );
  }
  return <Trans>Importing from {source}</Trans>;
}

/** Where a file stands, when it is not simply done; a status a newer server adds says nothing. */
function FileChip({ entry }: { entry: ActivityEntry }) {
  const { t } = useLingui();
  const item = entry.import;
  if (item) {
    if (item.archivedAt) return <Chip size="sm">{t`Archived`}</Chip>;
    const label: Record<string, string> = {
      uploading: t`Uploading`,
      inspecting: t`Reading`,
      ready: t`Ready to import`,
      importing: t`Importing`,
      cancelled: t`Cancelled`,
    };
    if (item.status === "failed") return <Chip size="sm" tone="danger">{t`Stopped`}</Chip>;
    const text = label[item.status];
    return text ? <Chip size="sm">{text}</Chip> : null;
  }
  const file = entry.export;
  if (!file) return null;
  if (file.status === "failed") return <Chip size="sm" tone="danger">{t`Stopped`}</Chip>;
  if (file.status === "exporting") return <Chip size="sm">{t`Writing`}</Chip>;
  if (file.status === "expired") return <Chip size="sm">{t`Deleted`}</Chip>;
  return null;
}

/** Who wrote, as the line under the sentence says it. A named app says its own name. */
function useCaller() {
  const { t } = useLingui();
  return (entry: ActivityEntry): string => {
    if (entry.app) return entry.app;
    switch (entry.actor as string) {
      case "user":
        return t`You`;
      case "api":
        return t`The API`;
      case "mcp":
        return t`A connected app`;
      case "ai":
        return t`The AI`;
      default:
        return t`Lymi`;
    }
  };
}

interface RowProps {
  entry: ActivityEntry;
  time: string;
  first: boolean;
}

/**
 * One row: the verb's mark, the sentence, and who and when under it. Rows that wrote cards open in
 * place to the cards; a file opens on the web, where files are handled (ADR 0030); a deck opens.
 */
function ActivityRow({ entry, time, first }: RowProps) {
  const { t } = useLingui();
  const p = usePalette();
  const router = useRouter();
  const reduce = useReduceMotion();
  const caller = useCaller()(entry);
  const [open, setOpen] = useState(false);
  // The people rows name the person in the sentence, so the line under it would say them twice.
  const named = entry.kind.startsWith("member_") && entry.kind !== "member_removed";
  const file = entry.import ?? entry.export;
  const own = !!file && entry.actor === "user";
  const meta = [named || own ? null : caller, file?.fileName, time].filter(Boolean).join(" · ");
  const expandable = entry.cards.length > 0;
  const deck = entry.deck && !entry.deck.archived ? entry.deck : null;
  const onWeb = entry.import
    ? `/import/${entry.import.id}`
    : entry.export
      ? "/settings#export"
      : null;
  const press = expandable
    ? () => setOpen(!open)
    : onWeb
      ? () => openWeb(onWeb)
      : deck
        ? () => router.push(`/library/${deck.id}`)
        : undefined;

  const face = (
    <View className="min-h-[72px] flex-row items-center gap-3 py-3 ps-4 pe-4">
      <View className="size-9 items-center justify-center rounded-full bg-plate-2">
        <Icon name={iconFor(entry.kind)} size={17} colour={p["text-2"]} />
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-md font-medium text-text" numberOfLines={3}>
          <Sentence entry={entry} />
        </Text>
        <FileChip entry={entry} />
        <Text className="text-sm text-muted" numberOfLines={1}>
          {meta}
        </Text>
      </View>
      {expandable ? (
        <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}>
          <Icon name="down" size={18} colour={p.muted} strokeWidth={2.5} />
        </View>
      ) : onWeb ? (
        <Icon name="web" size={18} colour={p.muted} strokeWidth={2.25} />
      ) : press ? (
        <RowArrow />
      ) : null}
    </View>
  );

  return (
    <Animated.View
      layout={reduce ? undefined : LinearTransition.duration(260)}
      className={first ? undefined : "border-t border-edge"}
    >
      {press ? (
        <Press
          scale={0.99}
          onPress={press}
          accessibilityRole={expandable ? "button" : "link"}
          accessibilityState={expandable ? { expanded: open } : undefined}
          accessibilityHint={expandable ? t`Shows the cards` : undefined}
        >
          {face}
        </Press>
      ) : (
        face
      )}
      {expandable && open && (
        <Animated.View
          entering={reduce ? undefined : FadeIn.duration(180)}
          exiting={reduce ? undefined : FadeOut.duration(120)}
          className="pb-2 pe-2 ps-14"
        >
          {entry.cards.map((card) => (
            <CardRow key={card.id} card={card} />
          ))}
          {deck && entry.count > entry.cards.length && (
            <Press
              scale={0.99}
              onPress={() => router.push(`/library/${deck.id}`)}
              accessibilityRole="link"
            >
              <View className="min-h-11 flex-row items-center gap-3 px-3 py-2.5">
                <Text className="flex-1 text-base text-text-2">
                  <Plural
                    value={entry.count - entry.cards.length}
                    one="# more card in this deck"
                    other="# more cards in this deck"
                  />
                </Text>
                <RowArrow />
              </View>
            </Press>
          )}
        </Animated.View>
      )}
    </Animated.View>
  );
}

/** A card the row wrote, opening its deck; a card in an archived deck is read, not pressed. */
function CardRow({ card }: { card: ActivityCard }) {
  const { t } = useLingui();
  const router = useRouter();
  const face = (
    <View className="min-h-11 flex-row items-center gap-3 px-3 py-2">
      <View className="flex-1 gap-0.5">
        <Text className="text-base font-medium text-text" numberOfLines={1}>
          {card.term}
        </Text>
        {card.meaning && (
          <Text className="text-sm text-muted" numberOfLines={1}>
            {card.meaning}
          </Text>
        )}
      </View>
      {card.archived && <Chip size="sm">{t`Archived`}</Chip>}
      {!card.deckArchived && <RowArrow />}
    </View>
  );
  if (card.deckArchived) return face;
  return (
    <Press
      scale={0.99}
      onPress={() => router.push(`/library/${card.deckId}`)}
      accessibilityRole="link"
    >
      {face}
    </Press>
  );
}

/** Rows under the learner-local day the server filed them on, not the phone's own clock. */
function byDay(
  entries: ActivityEntry[],
  locale: string,
  names: { today: string; yesterday: string; todayKey: string },
) {
  const before = new Date(`${names.todayKey}T12:00:00Z`);
  before.setUTCDate(before.getUTCDate() - 1);
  const yesterday = before.toISOString().slice(0, 10);
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" });
  const days: { key: string; label: string; entries: ActivityEntry[] }[] = [];
  for (const entry of entries) {
    const last = days.at(-1);
    if (last?.key === entry.day) last.entries.push(entry);
    else {
      const label =
        entry.day === names.todayKey
          ? names.today
          : entry.day === yesterday
            ? names.yesterday
            : date.format(new Date(`${entry.day}T12:00:00Z`));
      days.push({ key: entry.day, label, entries: [entry] });
    }
  }
  return days;
}

interface Props {
  entries: ActivityEntry[] | undefined;
  today: string | undefined;
  zone: string | undefined;
  failed: boolean;
  retrying: boolean;
  onRetry: () => void;
  hasMore: boolean;
  loadingMore: boolean;
  moreFailed: boolean;
  onMore: () => void;
}

export function ActivityView({
  entries,
  today,
  zone,
  failed,
  retrying,
  onRetry,
  hasMore,
  loadingMore,
  moreFailed,
  onMore,
}: Props) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  if (failed && !entries) {
    return (
      <Plate className="items-start gap-3 p-5">
        <Text className="text-md font-medium text-text">{t`Couldn’t load Activity`}</Text>
        <Button label={t`Try again`} onPress={onRetry} loading={retrying} />
      </Plate>
    );
  }
  if (!entries) {
    return (
      <View className="gap-2">
        <View className="px-1">
          <Skeleton width={80} height={14} />
        </View>
        <Plate className="gap-5 p-4">
          {[0, 1].map((i) => (
            <View key={i} className="flex-row gap-3">
              <View className="size-9 rounded-full bg-plate-2" />
              <View className="flex-1 gap-2">
                <Skeleton width="80%" height={16} />
                <Skeleton width="40%" height={12} />
              </View>
            </View>
          ))}
        </Plate>
      </View>
    );
  }
  if (entries.length === 0) {
    // An empty Activity is the good news that nothing landed unseen, so it asks for nothing.
    return (
      <View className="items-center gap-3 pt-20">
        <View className="size-16 items-center justify-center rounded-full bg-plate-2">
          <Icon name="activity" size={28} colour={p["text-2"]} strokeWidth={1.75} />
        </View>
        <Text className="text-center text-lg font-medium text-text">{t`No activity yet`}</Text>
        <Text className="max-w-72 text-center text-base text-text-2">
          {t`Changes from AI apps, imports, AI enrichment and shared decks show up here.`}
        </Text>
      </View>
    );
  }
  const time = new Intl.DateTimeFormat(i18n.locale, {
    timeStyle: "short",
    ...(zone ? { timeZone: zone } : {}),
  });
  const days = byDay(entries, i18n.locale, {
    today: t`Today`,
    yesterday: t`Yesterday`,
    todayKey: today ?? "",
  });
  return (
    <>
      {days.map((day) => (
        <View key={day.key} className="gap-2">
          <Text className="px-1 text-base font-medium text-muted" accessibilityRole="header">
            {day.label}
          </Text>
          <Plate className="overflow-hidden">
            {day.entries.map((entry, i) => (
              <ActivityRow
                // The group, not the newest row's id, so a refetch does not close an open row.
                key={entry.group}
                entry={entry}
                time={time.format(new Date(entry.at))}
                first={i === 0}
              />
            ))}
          </Plate>
        </View>
      ))}
      <Foot hasMore={hasMore} loading={loadingMore} failed={moreFailed} onMore={onMore} />
    </>
  );
}

function Foot({
  hasMore,
  loading,
  failed,
  onMore,
}: {
  hasMore: boolean;
  loading: boolean;
  failed: boolean;
  onMore: () => void;
}): ReactNode {
  const { t } = useLingui();
  return (
    <View className="items-center gap-2">
      {failed && (
        <Text className="text-base text-danger" accessibilityLiveRegion="polite">
          {t`Couldn’t load more.`}
        </Text>
      )}
      {hasMore ? (
        <View className="self-stretch">
          <Button label={failed ? t`Try again` : t`Show more`} onPress={onMore} loading={loading} />
        </View>
      ) : (
        <Text className="text-base text-muted" accessibilityLiveRegion="polite">
          {t`That’s everything.`}
        </Text>
      )}
    </View>
  );
}
