import { plural } from "@lingui/core/macro";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import {
  type ActivityMark,
  activityCaller,
  activityMark,
  exportFormat,
  exportOutcome,
  exportStage,
  importOutcome,
  importStage,
  namesCaller,
} from "@lymi/client/activity";
import type { ActivityCard, ActivityEntry } from "@lymi/client/api";
import { SOURCE_NAMES } from "@lymi/client/imports";
import { isolate } from "@lymi/core";
import { type Href, useRouter } from "expo-router";
import { type ReactNode, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { ExportSheet } from "../export/export-sheet";
import { usePalette } from "../theme/palette";
import { Chip } from "../ui/chip";
import type { IconName } from "../ui/icons";
import { Button, Icon, Plate, Press, RowArrow, Text } from "../ui/primitives";
import { Sheet, SheetGroup, SheetRow } from "../ui/sheet";
import { Skeleton } from "../ui/skeleton";

// The web's Activity on the phone: one list under day headings, each day a plate of rows.
// docs/design/activity.md.

/** The verb of a row, which is what its mark says; the sentence says what it was done to. */
const MARK_ICONS: Record<ActivityMark, IconName> = {
  added: "plus",
  enriched: "ai",
  edited: "edit",
  archived: "archive",
  restored: "restore",
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
          Added <Plural value={count} one="# card" other="# cards" /> to {{ deck: isolate(deck) }}
        </Trans>
      );
    case "cards_enriched":
      return (
        <Trans>
          Enriched <Plural value={count} one="# card" other="# cards" /> in{" "}
          {{ deck: isolate(deck) }}
        </Trans>
      );
    case "cards_edited":
      return (
        <Trans>
          Edited <Plural value={count} one="# card" other="# cards" /> in {{ deck: isolate(deck) }}
        </Trans>
      );
    case "cards_archived":
      return (
        <Trans>
          Archived <Plural value={count} one="# card" other="# cards" /> in{" "}
          {{ deck: isolate(deck) }}
        </Trans>
      );
    case "cards_restored":
      return (
        <Trans>
          Restored <Plural value={count} one="# card" other="# cards" /> in{" "}
          {{ deck: isolate(deck) }}
        </Trans>
      );
    case "deck_added":
      return <Trans>Created the deck {{ deck: isolate(deck) }}</Trans>;
    case "deck_edited":
      return <Trans>Edited the deck {{ deck: isolate(deck) }}</Trans>;
    case "deck_archived":
      return <Trans>Archived the deck {{ deck: isolate(deck) }}</Trans>;
    case "deck_restored":
      return <Trans>Restored the deck {{ deck: isolate(deck) }}</Trans>;
    case "series_added":
      return <Trans>Created the series {{ name: isolate(name) }}</Trans>;
    case "series_edited":
      return <Trans>Edited the series {{ name: isolate(name) }}</Trans>;
    case "series_deleted":
      return <Trans>Deleted the series {{ name: isolate(name) }}</Trans>;
    case "series_restored":
      return <Trans>Restored the series {{ name: isolate(name) }}</Trans>;
    case "section_added":
      return (
        <Trans>
          Created the section {{ name: isolate(name) }} in {{ deck: isolate(deck) }}
        </Trans>
      );
    case "section_edited":
      return (
        <Trans>
          Edited the section {{ name: isolate(name) }} in {{ deck: isolate(deck) }}
        </Trans>
      );
    case "section_archived":
      return (
        <Trans>
          Archived the section {{ name: isolate(name) }} in {{ deck: isolate(deck) }}
        </Trans>
      );
    case "section_restored":
      return (
        <Trans>
          Restored the section {{ name: isolate(name) }} in {{ deck: isolate(deck) }}
        </Trans>
      );
    case "member_joined":
      return (
        <Trans>
          {{ name: isolate(name) }} joined {{ deck: isolate(deck) }}
        </Trans>
      );
    case "member_left":
      return (
        <Trans>
          {{ name: isolate(name) }} left {{ deck: isolate(deck) }}
        </Trans>
      );
    case "invitation_sent":
      return (
        <Trans>
          Invited {{ name: isolate(name) }} to {{ deck: isolate(deck) }}
        </Trans>
      );
    case "invitation_cancelled":
      return (
        <Trans>
          Cancelled the invitation to {{ name: isolate(name) }} for {{ deck: isolate(deck) }}
        </Trans>
      );
    case "member_removed":
      return (
        <Trans>
          Removed {{ name: isolate(name) }} from {{ deck: isolate(deck) }}
        </Trans>
      );
    case "link_on":
      return <Trans>Turned on the join link for {{ deck: isolate(deck) }}</Trans>;
    case "link_off":
      return <Trans>Turned off the join link for {{ deck: isolate(deck) }}</Trans>;
    case "export":
      return <ExportSentence entry={entry} />;
    case "import":
      return <ImportSentence entry={entry} />;
    default:
      return deck ? (
        <Trans>Made a change in {{ deck: isolate(deck) }}</Trans>
      ) : (
        <Trans>Made a change</Trans>
      );
  }
}

/**
 * An export says it wrote a file only once it did, and names only a format this release knows.
 * Still writing or stopped, it says it was exporting; a stage a newer server adds claims neither.
 */
function ExportSentence({ entry }: { entry: ActivityEntry }) {
  const item = entry.export;
  if (!item) return <Trans>Export of your cards</Trans>;
  const cards = item.counts?.cards ?? 0;
  const format = exportFormat(item);
  switch (exportOutcome(item)) {
    case "exported":
      return format === "anki" ? (
        <Trans>
          Exported <Plural value={cards} one="# card" other="# cards" /> as an Anki package
        </Trans>
      ) : format === "lymi" ? (
        <Trans>
          Exported <Plural value={cards} one="# card" other="# cards" /> as a Lymi file
        </Trans>
      ) : (
        <Trans>
          Exported <Plural value={cards} one="# card" other="# cards" />
        </Trans>
      );
    case "exporting":
      return format === "anki" ? (
        <Trans>Exporting as an Anki package</Trans>
      ) : format === "lymi" ? (
        <Trans>Exporting as a Lymi file</Trans>
      ) : (
        <Trans>Exporting your cards</Trans>
      );
    default:
      return <Trans>Export of your cards</Trans>;
  }
}

/** An import says it brought cards in only when it did; a stage this release doesn't know says neither. */
function ImportSentence({ entry }: { entry: ActivityEntry }) {
  const item = entry.import;
  // A source a newer server adds is named as the server sends it.
  const source = item ? ((SOURCE_NAMES as Record<string, string>)[item.source] ?? item.source) : "";
  if (!item) return <Trans>Import of your cards</Trans>;
  const added = item.counts?.added ?? 0;
  switch (importOutcome(item)) {
    case "imported":
      return (
        <Trans>
          Imported <Plural value={added} one="# card" other="# cards" /> from {source}
        </Trans>
      );
    case "importing":
      return <Trans>Importing from {source}</Trans>;
    default:
      return <Trans>Import from {source}</Trans>;
  }
}

/** Where a file stands, when it is not simply done; a stage a newer server adds says nothing. */
function FileChip({ entry }: { entry: ActivityEntry }) {
  const { t } = useLingui();
  if (entry.import) {
    switch (importStage(entry.import)) {
      case "archived":
        return <Chip size="sm">{t`Archived`}</Chip>;
      case "uploading":
        return <Chip size="sm">{t`Uploading`}</Chip>;
      case "reading":
        return <Chip size="sm">{t`Reading`}</Chip>;
      case "ready":
        return <Chip size="sm">{t`Ready to import`}</Chip>;
      case "importing":
        return <Chip size="sm">{t`Importing`}</Chip>;
      case "stopped":
        return <Chip size="sm" tone="danger">{t`Stopped`}</Chip>;
      case "cancelled":
        return <Chip size="sm">{t`Cancelled`}</Chip>;
      default:
        return null;
    }
  }
  if (!entry.export) return null;
  switch (exportStage(entry.export)) {
    case "writing":
      return <Chip size="sm">{t`Writing`}</Chip>;
    case "stopped":
      return <Chip size="sm" tone="danger">{t`Stopped`}</Chip>;
    case "deleted":
      return <Chip size="sm">{t`Deleted`}</Chip>;
    default:
      return null;
  }
}

/** Who wrote, as the line under the sentence says it. A named app says its own name. */
function useCaller() {
  const { t } = useLingui();
  return (entry: ActivityEntry): string => {
    const caller = activityCaller(entry);
    switch (caller.kind) {
      case "app":
        return caller.name;
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
  /** Off on an app's own page, which already says whose writes these are. */
  caller?: boolean;
  /** Opens the list's one sheet on this row's cards. */
  onCards: (entry: ActivityEntry, meta: string) => void;
  /** Opens the list's export sheet on this row's file. */
  onExport: (entry: ActivityEntry) => void;
}

/**
 * One row: the verb's mark, the sentence, and who and when under it. Rows that wrote cards open the
 * cards in a sheet over the list; an import opens its page and an export its sheet, as on the web;
 * a deck opens in Library.
 */
function ActivityRow({ entry, time, first, caller: named = true, onCards, onExport }: RowProps) {
  const p = usePalette();
  const router = useRouter();
  const caller = useCaller()(entry);
  const file = entry.import ?? entry.export;
  const meta = [named && namesCaller(entry) ? isolate(caller) : null, isolate(file?.fileName), time]
    .filter(Boolean)
    .join(" · ");
  const hasCards = entry.cards.length > 0;
  const deck = entry.deck && !entry.deck.archived ? entry.deck : null;
  const importId = entry.import?.id;
  const press = hasCards
    ? () => onCards(entry, meta)
    : importId
      ? () => router.push(`/import/${importId}` as Href)
      : entry.export
        ? () => onExport(entry)
        : deck
          ? () => router.push(`/library/${deck.id}`)
          : undefined;

  const face = (
    <View className="min-h-[72px] flex-row items-center gap-3 py-3 ps-4 pe-4">
      <View className="size-9 items-center justify-center rounded-full bg-plate-nested">
        <Icon name={MARK_ICONS[activityMark(entry.kind)]} size={17} colour={p["ink-secondary"]} />
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-md font-medium text-ink" numberOfLines={3}>
          <Sentence entry={entry} />
        </Text>
        <FileChip entry={entry} />
        <Text className="text-sm text-ink-muted" numberOfLines={1}>
          {meta}
        </Text>
      </View>
      {press ? <RowArrow /> : null}
    </View>
  );

  return (
    <View className={first ? undefined : "border-t border-edge"}>
      {press ? (
        <Press
          scale={0.99}
          onPress={press}
          accessibilityRole={hasCards || entry.export ? "button" : "link"}
        >
          {face}
        </Press>
      ) : (
        face
      )}
    </View>
  );
}

/** How many cards the sheet shows before it is dragged up for the rest. */
const PEEK = 6;

/**
 * The cards a row wrote, in a sheet over the list so the day stays as it was. A card opens its deck
 * once the sheet has gone; a card in an archived deck has no screen, so it is read, not pressed.
 */
function CardsSheet({
  entry,
  meta,
  open,
  onOpenChange,
}: {
  /** The row whose cards it shows; it stays while the sheet closes, so nothing empties mid-swipe. */
  entry: ActivityEntry | null;
  /** Who and when, as the row says it. */
  meta: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLingui();
  const router = useRouter();
  const [going, setGoing] = useState<string | null>(null);
  const deck = entry?.deck && !entry.deck.archived ? entry.deck : null;
  const cards = entry?.cards ?? [];
  const rows = (cards: ActivityCard[]) =>
    cards.map((card) => (
      <CardRow
        key={card.id}
        card={card}
        onPress={() => {
          setGoing(card.deckId);
          onOpenChange(false);
        }}
      />
    ));
  const rest = cards.slice(PEEK);
  const name = deck?.name ?? "";
  const more = deck && entry && entry.count > cards.length && (
    <SheetGroup>
      <SheetRow
        icon="deck"
        label={t`Open ${{ name: isolate(name) }}`}
        detail={t`${plural(entry.count - entry.cards.length, { one: "# more card", other: "# more cards" })}`}
        opens
        onPress={() => {
          setGoing(deck.id);
          onOpenChange(false);
        }}
      />
    </SheetGroup>
  );
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      onDismiss={() => {
        if (going) router.push(`/library/${going}`);
        setGoing(null);
      }}
      more={
        rest.length > 0 ? (
          <>
            <SheetGroup>{rows(rest)}</SheetGroup>
            {more}
          </>
        ) : undefined
      }
    >
      {entry && (
        <View className="gap-1 px-4 pb-1">
          <Text className="text-lg font-medium text-ink" accessibilityRole="header">
            <Sentence entry={entry} />
          </Text>
          <Text className="text-sm text-ink-muted">{meta}</Text>
        </View>
      )}
      <SheetGroup>{rows(cards.slice(0, PEEK))}</SheetGroup>
      {rest.length === 0 && more}
    </Sheet>
  );
}

function CardRow({ card, onPress }: { card: ActivityCard; onPress: () => void }) {
  const { t } = useLingui();
  const p = usePalette();
  const face = (
    <View className="min-h-[52px] flex-row items-center gap-3 py-2.5 ps-4 pe-3.5">
      <View className="flex-1 gap-0.5">
        <Text className="text-md font-medium text-ink" numberOfLines={1}>
          {card.term}
        </Text>
        {card.meaning && (
          <Text className="text-sm text-ink-muted" numberOfLines={1}>
            {card.meaning}
          </Text>
        )}
      </View>
      {card.archived && <Chip size="sm">{t`Archived`}</Chip>}
      {!card.deckArchived && <Icon name="forward" size={18} colour={p["ink-faint"]} />}
    </View>
  );
  if (card.deckArchived) return face;
  return (
    <Press scale={0.99} onPress={onPress} accessibilityRole="link">
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
  /** No connection and nothing loaded: Activity is read from the server each time. */
  offline: boolean;
  retrying: boolean;
  onRetry: () => void;
  hasMore: boolean;
  loadingMore: boolean;
  moreFailed: boolean;
  onMore: () => void;
  /** Only one app's writes, opened from that app's page; `onClear` shows everything again. */
  filter?: { name: string | null; onClear: () => void } | undefined;
}

export function ActivityView({
  entries,
  today,
  zone,
  failed,
  offline,
  retrying,
  onRetry,
  hasMore,
  loadingMore,
  moreFailed,
  onMore,
  filter,
}: Props) {
  const { t, i18n } = useLingui();
  const sheets = useRowSheets();
  const p = usePalette();
  const only = filter && (
    <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1 px-1">
      <Text className="text-base text-ink-secondary">
        {filter.name ? t`Only what ${{ app: isolate(filter.name) }} did` : t`Only one app’s writes`}
      </Text>
      <Button label={t`Show everything`} variant="ghost" size="sm" onPress={filter.onClear} />
    </View>
  );
  if (offline) {
    return (
      <View className="items-center gap-3 pt-20">
        <View className="size-16 items-center justify-center rounded-full bg-plate-nested">
          <Icon name="activity" size={28} colour={p["ink-secondary"]} strokeWidth={1.75} />
        </View>
        <Text className="text-center text-lg font-medium text-ink">
          {t`Activity needs a connection`}
        </Text>
        <Text className="max-w-72 text-center text-base text-ink-secondary">
          {t`It loads as soon as you’re back online.`}
        </Text>
      </View>
    );
  }
  if (failed && !entries) {
    return (
      <Plate className="items-start gap-3 p-5">
        <Text className="text-md font-medium text-ink">{t`Couldn’t load Activity`}</Text>
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
              <View className="size-9 rounded-full bg-plate-nested" />
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
  if (entries.length === 0 && filter) {
    return (
      <>
        {only}
        <Plate className="p-4">
          <Text className="text-base text-ink-secondary">
            {filter.name
              ? t`Nothing from ${{ app: isolate(filter.name) }} yet. What it adds, edits or archives shows here.`
              : t`Nothing from this app yet. What it adds, edits or archives shows here.`}
          </Text>
        </Plate>
      </>
    );
  }
  if (entries.length === 0) {
    // An empty Activity is the good news that nothing landed unseen, so it asks for nothing.
    return (
      <View className="items-center gap-3 pt-20">
        <View className="size-16 items-center justify-center rounded-full bg-plate-nested">
          <Icon name="activity" size={28} colour={p["ink-secondary"]} strokeWidth={1.75} />
        </View>
        <Text className="text-center text-lg font-medium text-ink">{t`No activity yet`}</Text>
        <Text className="max-w-72 text-center text-base text-ink-secondary">
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
      {only}
      {days.map((day) => (
        <View key={day.key} className="gap-2">
          <Text className="px-1 text-base font-medium text-ink-muted" accessibilityRole="header">
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
                onCards={sheets.onCards}
                onExport={sheets.onExport}
              />
            ))}
          </Plate>
        </View>
      ))}
      <Foot hasMore={hasMore} loading={loadingMore} failed={moreFailed} onMore={onMore} />
      {sheets.sheets}
    </>
  );
}

/**
 * The list's one cards sheet and one export sheet, so a page of rows does not mount a sheet each.
 * `onCardsOpened` hears a row open its cards.
 */
function useRowSheets(onCardsOpened?: () => void) {
  const [chosen, setChosen] = useState<{ entry: ActivityEntry; meta: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<ActivityEntry | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  return {
    onCards: (entry: ActivityEntry, meta: string) => {
      setChosen({ entry, meta });
      setOpen(true);
      onCardsOpened?.();
    },
    onExport: (entry: ActivityEntry) => {
      setFile(entry);
      setExportOpen(true);
    },
    sheets: (
      <>
        <CardsSheet
          entry={chosen?.entry ?? null}
          meta={chosen?.meta ?? ""}
          open={open}
          onOpenChange={setOpen}
        />
        {file?.export && (
          <ExportSheet
            key={file.group}
            open={exportOpen}
            onOpenChange={setExportOpen}
            initial={file.export}
            scope={
              file.deck && file.export.deckId
                ? { kind: "deck", deckId: file.export.deckId, deckName: file.deck.name }
                : { kind: "library" }
            }
          />
        )}
      </>
    ),
  };
}

/**
 * One app's rows on one plate, for its page under Apps: each says its day and time, since there are
 * no day headings, and none repeats the app's name. `foot` closes the plate, such as a link to the
 * whole of Activity.
 */
export function ActivityList({
  entries,
  today,
  zone,
  foot,
  onCardsOpened,
}: {
  entries: ActivityEntry[];
  today: string | undefined;
  zone: string | undefined;
  foot?: ReactNode;
  onCardsOpened?: () => void;
}) {
  const { t, i18n } = useLingui();
  const sheets = useRowSheets(onCardsOpened);
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
      <Plate className="overflow-hidden">
        {days.flatMap((day, d) =>
          day.entries.map((entry, i) => (
            <ActivityRow
              key={entry.group}
              entry={entry}
              time={`${day.label} · ${time.format(new Date(entry.at))}`}
              first={d === 0 && i === 0}
              caller={false}
              onCards={sheets.onCards}
              onExport={sheets.onExport}
            />
          )),
        )}
        {foot && <View className="border-t border-edge">{foot}</View>}
      </Plate>
      {sheets.sheets}
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
        // More loads as the end comes near; a button only when that failed.
        failed ? (
          <View className="self-stretch">
            <Button label={t`Try again`} onPress={onMore} loading={loading} />
          </View>
        ) : (
          <ActivityIndicator accessibilityLabel={t`Loading more`} />
        )
      ) : (
        <Text className="text-base text-ink-muted" accessibilityLiveRegion="polite">
          {t`That’s everything.`}
        </Text>
      )}
    </View>
  );
}
