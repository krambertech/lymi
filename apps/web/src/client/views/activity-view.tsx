import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import {
  Activity as ActivityIcon,
  Archive,
  ArchiveRestore,
  ChevronDown,
  Download,
  FileUp,
  Link2Off,
  Link as LinkIcon,
  type LucideIcon,
  Mail,
  MailX,
  Pencil,
  Plus,
  Sparkle,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Button, buttonClass } from "../components/button";
import { Chip } from "../components/chip";
import { EmptySection, ErrorState } from "../components/empty-state";
import { SOURCE_NAMES } from "../components/import-parts";
import { Screen } from "../components/layout/screen";
import { Go } from "../components/next-steps";
import { Skeleton } from "../components/skeleton";
import type { ActivityCard, ActivityEntry, Export, Import } from "../lib/api";

/** The verb of a row, which is what its mark says. The sentence says what the verb was done to. */
const KIND_ICONS: Record<string, LucideIcon> = {
  added: Plus,
  enriched: Sparkle,
  edited: Pencil,
  archived: Archive,
  restored: ArchiveRestore,
  import: FileUp,
  export: Download,
  member_joined: UserPlus,
  member_left: UserMinus,
  member_removed: UserMinus,
  invitation_sent: Mail,
  invitation_cancelled: MailX,
  link_on: LinkIcon,
  link_off: Link2Off,
};

function iconFor(kind: ActivityEntry["kind"]): LucideIcon {
  const verb = kind.slice(kind.indexOf("_") + 1);
  return KIND_ICONS[kind] ?? KIND_ICONS[verb] ?? Pencil;
}

/** What an import row says about where its import is. Done says nothing: its count says it. */
function StatusChip({ item }: { item: Import }) {
  const { t } = useLingui();
  if (item.archivedAt) return <Chip>{t`Archived`}</Chip>;
  switch (item.status) {
    case "uploading":
      return <Chip>{t`Uploading`}</Chip>;
    case "inspecting":
      return <Chip>{t`Reading`}</Chip>;
    case "ready":
      return <Chip>{t`Ready to import`}</Chip>;
    case "importing":
      return <Chip>{t`Importing`}</Chip>;
    case "failed":
      return <Chip tone="danger">{t`Stopped`}</Chip>;
    case "cancelled":
      return <Chip>{t`Cancelled`}</Chip>;
    default:
      return null;
  }
}

/** Where an export stands. Done says nothing: its count says it, and its file is on the row. */
function ExportChip({ item }: { item: Export }) {
  const { t } = useLingui();
  switch (item.status) {
    case "exporting":
      return <Chip>{t`Writing`}</Chip>;
    case "failed":
      return <Chip tone="danger">{t`Stopped`}</Chip>;
    case "expired":
      return <Chip>{t`Deleted`}</Chip>;
    default:
      return null;
  }
}

/** The sentence a row leads with. It never names the caller: the line under it does. */
function Sentence({ entry }: { entry: ActivityEntry }) {
  const { t } = useLingui();
  // Every row the server sends names its deck, so there is no sentence for a deck with no name.
  const deck = entry.deck?.name ?? "";
  const name = entry.person ?? t`Someone`;
  const count = entry.count;
  switch (entry.kind) {
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
      return <ExportSentence item={entry.export} />;
    default:
      return <ImportSentence item={entry.import} />;
  }
}

/**
 * An export names the format it was written in, so the two formats are two whole sentences
 * rather than one sentence with a noun dropped into it.
 */
function ExportSentence({ item }: { item: Export | null }) {
  if (!item) return null;
  const cards = item.counts?.cards ?? 0;
  if (item.status !== "done") {
    return item.format === "lymi" ? (
      <Trans>Exporting as a Lymi file</Trans>
    ) : (
      <Trans>Exporting as an Anki package</Trans>
    );
  }
  return item.format === "lymi" ? (
    <Trans>
      Exported <Plural value={cards} one="# card" other="# cards" /> as a Lymi file
    </Trans>
  ) : (
    <Trans>
      Exported <Plural value={cards} one="# card" other="# cards" /> as an Anki package
    </Trans>
  );
}

function ImportSentence({ item }: { item: Import | null }) {
  const source = item ? SOURCE_NAMES[item.source] : "";
  const added = item?.counts?.added ?? 0;
  if (!item) return null;
  if (item.status === "done" || (item.status === "failed" && added > 0)) {
    return (
      <Trans>
        Imported <Plural value={added} one="# card" other="# cards" /> from {source}
      </Trans>
    );
  }
  return <Trans>Importing from {source}</Trans>;
}

/** Who wrote, as the line under the sentence says it. A named app says its own name. */
function useCaller() {
  const { t } = useLingui();
  return (entry: ActivityEntry): string | null => {
    if (entry.app) return entry.app;
    switch (entry.actor) {
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
  /** Wraps the row in a link when pressing it opens something. */
  link: ((className: string, children: ReactNode) => ReactNode) | null;
  deckLink: (deckId: string, className: string, children: ReactNode) => ReactNode;
  cardLink: CardLink;
}

const ROW =
  "group flex w-full min-h-[72px] items-center gap-3 px-4 py-3 text-start transition-[background-color] duration-150 hoverable:hover:bg-hover group-first/row:rounded-t-xl";

function ActivityRow({ entry, time, link, deckLink, cardLink }: RowProps) {
  const { t } = useLingui();
  const caller = useCaller()(entry);
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const cardsId = useId();
  const Icon = iconFor(entry.kind);
  // The people rows name the person in the sentence, so the line under it would say them twice.
  const named = entry.kind.startsWith("member_") && entry.kind !== "member_removed";
  // A file the learner moved themselves says so by being theirs; what it needs is which file.
  const file = entry.import ?? entry.export;
  const own = !!file && entry.actor === "user";
  const meta = [named || own ? null : caller, file?.fileName, time].filter(Boolean);
  const expandable = entry.cards.length > 0;
  // The one row whose action is on the row itself, because the file is what it offers.
  const download = entry.export?.status === "done" ? entry.export.downloadUrl : null;

  const face = (
    <>
      <span
        className="edge-inset grid size-9 shrink-0 place-items-center rounded-full bg-plate-2 text-text-2 [&_svg]:size-4"
        aria-hidden="true"
      >
        <Icon />
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="flex min-w-0 items-center gap-2">
          {/* Three lines on a narrow screen, so a long deck name is read rather than cut. */}
          <span className="line-clamp-3 text-md font-medium">
            <Sentence entry={entry} />
          </span>
          {entry.import && <StatusChip item={entry.import} />}
          {entry.export && <ExportChip item={entry.export} />}
        </span>
        {/* Only the file name gives way; the time is the one part that must stay readable. */}
        <span className="flex min-w-0 gap-1 text-sm text-muted tabular-nums">
          {meta.length > 1 && <span className="truncate">{meta.slice(0, -1).join(" · ")}</span>}
          {meta.length > 1 && <span className="shrink-0">·</span>}
          <span className="shrink-0">{meta.at(-1)}</span>
        </span>
      </span>
      {download ? (
        <a
          href={download}
          download={entry.export?.fileName}
          className={buttonClass("secondary", "sm", "shrink-0")}
          aria-label={t`Download ${entry.export?.fileName ?? ""}`}
        >
          <Download data-icon="inline-start" aria-hidden="true" />
          {/* The label only where there is room; the aria-label names the file at every size. */}
          <span className="sr-only @3xl:not-sr-only">
            <Trans>Download</Trans>
          </span>
        </a>
      ) : expandable ? (
        <Go
          icon={
            <ChevronDown
              className={clsx(
                "size-4 transition-transform duration-200 motion-reduce:transition-none",
                open && "rotate-180",
              )}
              aria-hidden="true"
            />
          }
        />
      ) : link ? (
        <Go />
      ) : null}
    </>
  );

  return (
    <li className="group/row border-edge [&:not(:first-child)]:border-t">
      {expandable ? (
        <button
          type="button"
          aria-expanded={open}
          // AnimatePresence unmounts the region, so the id is only named while it is there.
          {...(open ? { "aria-controls": cardsId } : {})}
          onClick={() => setOpen(!open)}
          className={clsx(ROW, !open && "group-last/row:rounded-b-xl")}
        >
          {face}
        </button>
      ) : link ? (
        link(clsx(ROW, "group-last/row:rounded-b-xl"), face)
      ) : (
        <div className={clsx(ROW, "group-last/row:rounded-b-xl")}>{face}</div>
      )}
      <AnimatePresence initial={false}>
        {expandable && open && (
          <motion.div
            id={cardsId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={
              reduceMotion
                ? { duration: 0.15, height: { duration: 0 } }
                : { duration: 0.26, ease: [0.22, 1, 0.36, 1], opacity: { duration: 0.18 } }
            }
            className="overflow-hidden group-last/row:rounded-b-xl"
          >
            {/* The cards sit under the sentence they belong to, so the two read as one row. */}
            <ul className="grid pb-2 pe-2 ps-13">
              {entry.cards.map((card) => (
                <CardRow key={card.id} card={card} link={cardLink} />
              ))}
              {entry.count > entry.cards.length && entry.deck && !entry.deck.archived && (
                <li>
                  {deckLink(
                    entry.deck.id,
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-2 transition-[background-color] duration-150 hoverable:hover:bg-hover",
                    <>
                      <span className="flex-1">
                        <Plural
                          value={entry.count - entry.cards.length}
                          one="# more card in this deck"
                          other="# more cards in this deck"
                        />
                      </span>
                      <Go>{t`Open deck`}</Go>
                    </>,
                  )}
                </li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function CardRow({ card, link }: { card: ActivityCard; link: CardLink }) {
  const { t } = useLingui();
  const face = (
    <>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="truncate text-base font-medium">{card.term}</span>
        {card.meaning && <span className="truncate text-sm text-muted">{card.meaning}</span>}
      </span>
      {card.archived && <Chip size="sm">{t`Archived`}</Chip>}
    </>
  );
  const className =
    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start transition-[background-color] duration-150 hoverable:hover:bg-hover";
  // A card in an archived deck has no screen to open, so its row is read rather than pressed.
  return (
    <li>
      {card.deckArchived ? (
        <div className={className}>{face}</div>
      ) : (
        link(card.deckId, card.id, className, face)
      )}
    </li>
  );
}

/** Opens one card where cards are read: the word in its deck. */
type CardLink = (
  deckId: string,
  cardId: string,
  className: string,
  children: ReactNode,
) => ReactNode;

export interface ActivityViewProps {
  entries: ActivityEntry[] | undefined;
  /** The learner-local day the server is on, so a heading says Today without the browser clock. */
  today?: string | undefined;
  /** The learner's review timezone, so a row's time belongs to the day it is filed under. */
  zone?: string | undefined;
  error?: boolean | undefined;
  onRetry: () => void;
  retrying?: boolean | undefined;
  /** There is another page to read. */
  hasMore?: boolean | undefined;
  loadingMore?: boolean | undefined;
  onMore?: (() => void) | undefined;
  /** The page the button asked for failed; the list above it is still good. */
  moreFailed?: boolean | undefined;
  importLink: (item: Import, className: string, children: ReactNode) => ReactNode;
  deckLink: (deckId: string, className: string, children: ReactNode) => ReactNode;
  cardLink: CardLink;
}

/**
 * Activity: what came into the learner's decks from outside the app, the files they took out,
 * and who is in their shared decks. One list under day headings. docs/design/activity.md.
 */
export function ActivityView({
  entries,
  today,
  zone,
  error,
  onRetry,
  retrying,
  hasMore,
  loadingMore,
  onMore,
  moreFailed,
  importLink,
  deckLink,
  cardLink,
}: ActivityViewProps) {
  const { t, i18n } = useLingui();
  const foot = useRef<HTMLParagraphElement>(null);
  const asked = useRef(false);
  if (loadingMore) asked.current = true;
  // The button the learner pressed has just unmounted; the line that replaced it takes the focus.
  useEffect(() => {
    if (hasMore || !asked.current) return;
    asked.current = false;
    foot.current?.focus();
  }, [hasMore]);
  const time = new Intl.DateTimeFormat(i18n.locale, {
    timeStyle: "short",
    ...(zone ? { timeZone: zone } : {}),
  });
  const days = entries
    ? byDay(entries, i18n.locale, {
        today: t`Today`,
        yesterday: t`Yesterday`,
        todayKey: today ?? "",
      })
    : [];

  return (
    // No action in the header: Activity is a log of what happened, and importing starts in
    // Settings. The empty state still offers it, because there it teaches the screen.
    <Screen title={t`Activity`} width="md" back={{ label: t`Today`, to: "/today" }}>
      {error && !entries ? (
        <ErrorState title={t`Couldn’t load Activity`} onRetry={onRetry} retrying={retrying} />
      ) : !entries ? (
        // A day heading and its plate of two rows, at the height they load at.
        <div className="grid gap-2">
          <Skeleton className="ms-1 h-4 w-20 rounded-full" />
          <Skeleton className="h-[145px] rounded-xl" />
        </div>
      ) : entries.length === 0 ? (
        // Not a start panel: an empty Activity is not a screen to fill, it is the good news that
        // nothing landed unseen. It says what the screen is for and asks for nothing.
        <EmptySection
          icon={<ActivityIcon />}
          title={t`No activity yet`}
          body={t`Changes from AI apps, imports, AI enrichment and shared decks show up here.`}
        />
      ) : (
        <div className="grid gap-6">
          {days.map((day) => (
            <section key={day.key} aria-labelledby={`day-${day.key}`} className="grid gap-2">
              <h2 id={`day-${day.key}`} className="px-1 text-sm font-medium text-muted">
                {day.label}
              </h2>
              <ul className="edge grid rounded-xl bg-plate">
                {day.entries.map((entry) => {
                  const file = entry.import;
                  const deck = entry.deck;
                  return (
                    <ActivityRow
                      // The group, not the newest row's id, so a refetch does not close an open row.
                      key={entry.group}
                      entry={entry}
                      time={time.format(new Date(entry.at))}
                      link={
                        file
                          ? (className, children) => importLink(file, className, children)
                          : deck && !deck.archived && entry.cards.length === 0
                            ? (className, children) => deckLink(deck.id, className, children)
                            : null
                      }
                      deckLink={deckLink}
                      cardLink={cardLink}
                    />
                  );
                })}
              </ul>
            </section>
          ))}
          {/* The foot stays mounted when the last page lands, so the focus on Show more has
              somewhere to go and the keyboard is told the list is finished. */}
          <div className="grid gap-2 justify-items-center">
            {moreFailed && (
              <p role="status" className="text-sm text-danger">
                <Trans>Couldn’t load more.</Trans>
              </p>
            )}
            {hasMore ? (
              <Button variant="secondary" onClick={onMore} loading={loadingMore} className="w-full">
                {moreFailed ? <Trans>Try again</Trans> : <Trans>Show more</Trans>}
              </Button>
            ) : (
              <p ref={foot} tabIndex={-1} role="status" className="text-sm text-muted">
                <Trans>That’s everything.</Trans>
              </p>
            )}
          </div>
        </div>
      )}
    </Screen>
  );
}

/** Rows under the learner-local day the server grouped them on, not the browser's own. */
function byDay(
  entries: ActivityEntry[],
  locale: string,
  names: { today: string; yesterday: string; todayKey: string },
) {
  const yesterdayKey = new Date(`${names.todayKey}T12:00:00Z`);
  yesterdayKey.setUTCDate(yesterdayKey.getUTCDate() - 1);
  const wasYesterday = yesterdayKey.toISOString().slice(0, 10);
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" });
  const days: { key: string; label: string; entries: ActivityEntry[] }[] = [];
  for (const entry of entries) {
    const open = days.at(-1);
    if (open?.key === entry.day) open.entries.push(entry);
    else days.push({ key: entry.day, label: labelOf(entry.day), entries: [entry] });
  }
  return days;

  /** A YYYY-MM-DD reads as a day at noon UTC, where no zone can shift it to another date. */
  function labelOf(day: string) {
    if (day === names.todayKey) return names.today;
    if (day === wasYesterday) return names.yesterday;
    return date.format(new Date(`${day}T12:00:00Z`));
  }
}
