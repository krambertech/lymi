import { Plural, Trans, useLingui } from "@lingui/react/macro";
import type { FilterContext } from "@lymi/client/deck-filters";
import {
  activeFilterCount,
  type DeckFilters,
  type DeckRow,
  type DeckScope,
  type DeckSort,
  deckCsv,
  deckCsvName,
  deckTags,
  filterRows,
  groupRows,
  liveFilters,
  noFilters,
  rowState,
  scopedFilters,
} from "@lymi/client/deck-list";
import { CHOSEN_LIMIT, type ContentReportTarget, isolate, type KnownReadings } from "@lymi/core";
import { clsx } from "clsx";
import {
  Archive,
  ArrowUpDown,
  ChevronDown,
  Download,
  Flag,
  FolderInput,
  KeyRound,
  Layers,
  ListFilter,
  LogOut,
  MoreHorizontal,
  PenLine,
  Plug,
  Plus,
  RotateCcw,
  Search,
  SearchX,
  Settings2,
  Signpost,
  Sparkles,
  SquareCheck,
  Star,
  Tags,
  X,
} from "lucide-react";
import {
  Fragment,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Avatar, FormerOwnerMark } from "../components/avatar";
import { Button, IconButton } from "../components/button";
import { CardPlace } from "../components/card-place";
import { Chip } from "../components/chip";
import { directionLabel, languageName } from "../components/deck-fields";
import { FilterChips, FilterMenu } from "../components/deck-filter";
import { ErrorState, NoResults } from "../components/empty-state";
import { Screen, ScreenBar } from "../components/layout/screen";
import { NavLink, useStaticNav } from "../components/nav-link";
import { NextStep, NextSteps } from "../components/next-steps";
import { PublisherMark } from "../components/publisher-mark";
import { ReportDialog } from "../components/report-dialog";
import { SectionProgress } from "../components/section-progress";
import { Skeleton } from "../components/skeleton";
import { StartPanel, StartPanelSection } from "../components/start-panel";
import { StateIcon, stateMarks } from "../components/state-mark";
import { type StreakSummary, useTodayStatus } from "../components/streak";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Input } from "../components/ui/input";
import type { DeckSummary, Section, Sections } from "../lib/api";
import { captureAnalytics } from "../lib/telemetry";
import { useCardSelection } from "../lib/use-card-selection";
import { Glossary, type SectionEditing, sectionAnchor } from "./deck-glossary";
import { type WordHistory, WordView } from "./word-view";

/** Stable, so a section's list tools do not redraw on every render. */
const NO_SECTIONS: Section[] = [];
/** The narrowest list that still keeps meanings beside words; narrower than it and a card, the card is a sheet. */
const LIST_PX = 640;
const CARD_PX = 400;
const DAY = 86_400_000;

/** A deck the screen cannot draw: one that is not there any more, or one it could not reach. */
export type DeckFailure = "gone" | "unreachable";

export interface DeckDetailProps {
  deck: DeckSummary | undefined;
  cards: DeckRow[] | undefined;
  /** The learner's Known pairs across every deck, whose readings fade in an open card's example. */
  knownReadings?: KnownReadings | undefined;
  /** Where today's goal stands, for the line under the due count. */
  streak?: StreakSummary | undefined;
  onReview?: (() => void) | undefined;
  onSettings?: (() => void) | undefined;
  /** Every write to the deck. Absent for a member, who reads someone else's deck. */
  owner?: DeckOwnerActions | undefined;
  /** Absent for the owner, who archives the deck instead of leaving it. */
  member?: DeckMemberActions | undefined;
  /** The owner's series the deck is in, named under the title. */
  seriesName?: string | undefined;
  /** The word that is open, if one is. The view owns it when the route does not. */
  openCardId?: string | null | undefined;
  onOpen?: ((id: string | null) => void) | undefined;
  /** The open word's history, when the route has fetched it. */
  history?: WordHistory | undefined;
  /** Play the word's pronunciation. Absent, the Say button is not drawn. */
  onPlayAudio?: ((card: DeckRow["card"]) => void) | undefined;
  /** Mark or unmark a card as important for this learner; a member can, as the mark is their own. */
  onImportantChange?: ((card: DeckRow["card"], important: boolean) => void) | undefined;
  /** Mark or unmark chosen cards, from the selection toolbar; a member's too. */
  onMarkCards?: ((cardIds: string[], important: boolean) => void) | undefined;
  /** Every deck, so a word can be moved out of this one. */
  decks?: { id: string; name: string }[] | undefined;
  /** How to connect an assistant, offered while the deck has no cards. */
  connectUrl?: string | undefined;
  /** Whether an assistant is connected; undefined while unknown, so its row does not flash. */
  connected?: boolean | undefined;
  /** The deck's active sections with the learner's standing, and where the learner is. */
  sections?: Section[] | undefined;
  progress?: Sections["progress"] | undefined;
  /** Start a section, for anyone studying the deck. */
  onStartSection?: ((section: Section) => void) | undefined;
  /** Review one section's cards, from its heading's menu. */
  onReviewSection?: ((section: Section) => void) | undefined;
  /** Review chosen cards, from the selection toolbar. */
  onReviewCards?: ((cardIds: string[]) => void) | undefined;
  startSectionPending?: boolean | undefined;
  /** Why the deck is not on screen: gone for good, or the app could not reach it. */
  failure?: DeckFailure | undefined;
  /** Fetch the deck again, for a failure that can be recovered from. */
  onRetry?: (() => void) | undefined;
  retryPending?: boolean | undefined;
  /** Draw an open card beside the list at any width, for the design system's narrower frames. */
  cardBeside?: boolean | undefined;
  /** A section's id narrows the list to that section; without one it shows the whole deck. */
  scope?: Pick<DeckScope, "sectionId"> | undefined;
}

/** What the owner does to the deck and its cards; the route holds the sheets and dialogs. */
export interface DeckOwnerActions {
  onAddCard: () => void;
  /** Reading a lesson into cards; absent while the account cannot use it. */
  onSmartAdd?: (() => void) | undefined;
  onArchiveCard: (id: string) => void;
  onEditCard: (card: DeckRow["card"]) => void;
  /** Asks the AI to fill a card's empty fields. */
  onEnrichCard: (card: DeckRow["card"]) => void;
  onMoveCard: (id: string, deckId: string) => void;
  onArchiveDeck: () => void;
  onExport: () => void;
  onMoveToSeries: () => void;
  onTagCards: (cardIds: string[]) => void;
  /** Open the deck picker for these cards; absent while the learner has no other deck of their own. */
  onMoveCardsToDeck?: ((cardIds: string[], after: () => void) => void) | undefined;
  onArchiveCards: (cardIds: string[]) => void;
  sections: DeckSectionActions;
}

export interface DeckMemberActions {
  onLeave: () => void;
}

/** What the owner does to sections from the deck page; the route holds the dialogs. */
export interface DeckSectionActions extends Omit<SectionEditing, "onDropCards" | "several"> {
  onCreate: () => void;
  onPickSection: (cardIds: string[]) => void;
  onMoveCards: (cardIds: string[], section: Section | null) => void;
}

/** Word, meaning, status and next review as a CSV file the browser saves. */
export function exportCsv(deckName: string, rows: DeckRow[]) {
  const blob = new Blob([deckCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = deckCsvName(deckName);
  a.click();
  URL.revokeObjectURL(url);
}

/** Whose deck this is, under its title, with the mark the Library card draws. */
function OwnerLine({ deck }: { deck: DeckSummary }) {
  const owner = deck.owner.name;
  if (deck.owner.former) {
    return (
      <>
        <FormerOwnerMark size={18} />
        <span className="min-w-0 truncate">
          <Trans>Its owner left Lymi</Trans>
        </span>
      </>
    );
  }
  return (
    <>
      {deck.published ? (
        <PublisherMark name={owner} src={deck.owner.avatarUrl} size={18} />
      ) : (
        <Avatar name={owner} size={18} />
      )}
      <span className="min-w-0 truncate">
        <Trans>Shared by {{ owner: isolate(owner) }}</Trans>
      </span>
    </>
  );
}

/** What a member sees in a shared deck with nothing in it yet. */
function OwnerAddsCards({ owner, former }: { owner: string; former: boolean }) {
  if (former) return <Trans>Its owner left Lymi, so no cards will be added.</Trans>;
  return <Trans>Cards appear here when {{ owner: isolate(owner) }} adds them.</Trans>;
}

/** The parts under a deck's title, dot-separated, or nothing when there are none. */
function subline(...parts: ReactNode[]) {
  const shown = parts.filter(Boolean);
  if (shown.length === 0) return undefined;
  // One centred row, so a part that carries an icon sits on the same line as the text beside it.
  return (
    <span className="flex flex-wrap items-center gap-x-1.5">
      {shown.map((part, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: the parts have a fixed order
        <Fragment key={index}>
          {index > 0 && <span aria-hidden="true">·</span>}
          <span className="inline-flex items-center gap-1">{part}</span>
        </Fragment>
      ))}
    </span>
  );
}

/** "tomorrow", "in 3 days": when the deck's next card comes back, in the interface language. */
function nextDueLabel(locale: string, cards: DeckRow[], now = Date.now()): string | null {
  let next = Number.POSITIVE_INFINITY;
  for (const { state } of cards) {
    const at = state ? new Date(state.due).getTime() : Number.NaN;
    if (at > now && at < next) next = at;
  }
  if (!Number.isFinite(next)) return null;
  const days = Math.round((next - now) / DAY);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (days < 1) return rtf.format(Math.max(1, Math.round((next - now) / 3_600_000)), "hour");
  if (days < 30) return rtf.format(days, "day");
  return rtf.format(Math.round(days / 30), "month");
}

function useWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

/**
 * Two stacked plates. Review's is the one with an action: the cards due now, where today's goal
 * stands, and Review, or with nothing due, when the next card is back and Add card. The deck's is
 * its total and split between New, Learning and Known, which never read as zero on a quiet day.
 */
function DeckPlates({
  deck,
  cards,
  streak,
  onReview,
  onAdd,
  section,
}: {
  deck: DeckSummary;
  cards: DeckRow[];
  streak?: StreakSummary | undefined;
  onReview?: (() => void) | undefined;
  onAdd?: (() => void) | undefined;
  /** The row about sections under Today's, when the deck opens them in order. */
  section?: ReactNode;
}) {
  const { t, i18n } = useLingui();
  const summary = useTodayStatus(streak);
  // A summary fetched before these cards arrived would say nothing is due beside a count that is not zero.
  const status = deck.due > 0 && streak?.today.outcome === "nothing_due" ? "" : summary;
  const due = deck.due;
  const next = due === 0 ? nextDueLabel(i18n.locale, cards) : null;
  const total = cards.length;
  const counts = { new: 0, learning: 0, known: 0 };
  for (const row of cards) counts[rowState(row)]++;

  return (
    // A container query styles only what is inside the container, so the plates sit one level in.
    <div className="@container/plates">
      <div className="grid gap-3">
        <section aria-label={t`Today`} className="edge grid rounded-xl bg-plate">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-4 p-5 @md/plates:ps-6">
            <p className="text-4xl font-semibold leading-none tracking-[-0.03em] tabular-nums">
              {i18n.number(due)}
            </p>
            <div className="grid min-w-0 flex-1 gap-0.5">
              <p className="text-md text-text">
                <Plural value={due} one="card to review now" other="cards to review now" />
              </p>
              {next ? (
                <p className="text-sm text-muted">{t`Next card due ${next}.`}</p>
              ) : (
                status && <p className="text-sm text-muted">{status}</p>
              )}
            </div>
            {due > 0 ? (
              <Button
                variant="primary"
                onClick={onReview}
                aria-disabled={!onReview}
                className="w-full @md/plates:w-auto @md/plates:px-8"
              >
                <Trans>Review</Trans>
              </Button>
            ) : (
              onAdd && (
                <Button onClick={onAdd} kbd="N" className="w-full @md/plates:w-auto">
                  <Plus data-icon="inline-start" aria-hidden="true" />
                  <Trans>Add card</Trans>
                </Button>
              )
            )}
          </div>
          {section}
        </section>
        {/* A narrow plate cannot fit four counts in the hundreds, so the total takes its own row there. */}
        <dl className="edge grid grid-cols-3 items-center rounded-xl bg-plate py-4 @md/plates:grid-cols-4">
          <div className="col-span-3 grid justify-items-center gap-0.5 border-b border-edge px-2 pb-3 @md/plates:col-span-1 @md/plates:border-b-0 @md/plates:pb-0">
            <dt className="order-last text-sm text-muted">
              <Trans context="cards in this deck">Total</Trans>
            </dt>
            <dd className="text-xl font-semibold proportional-nums">{i18n.number(total)}</dd>
          </div>
          {(["new", "learning", "known"] as const).map((key) => (
            <div
              key={key}
              className={clsx(
                "grid justify-items-center gap-0.5 border-edge px-2 pt-3 @md/plates:border-s @md/plates:pt-0",
                key !== "new" && "border-s",
              )}
            >
              <dt className="order-last text-sm text-muted">
                {i18n._(stateMarks[key].groupLabel)}
              </dt>
              <dd
                className={clsx(
                  "flex items-center gap-1.5 text-xl font-semibold proportional-nums",
                  counts[key] === 0 && "text-muted",
                )}
              >
                <StateIcon state={key} className="size-[18px]" />
                {i18n.number(counts[key])}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

/** A filter that is on, with the press that turns it off. */
function ListTools({
  sections,
  filters,
  setFilters,
  filterCtx,
  sort,
  setSort,
  query,
  setQuery,
  searchRef,
}: {
  sections: Section[];
  filters: DeckFilters;
  setFilters: (next: DeckFilters) => void;
  filterCtx: FilterContext;
  sort: DeckSort;
  setSort: (next: DeckSort) => void;
  query: string;
  setQuery: (next: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
}) {
  const { t } = useLingui();
  // Where focus lands when a chip's menu empties it and the chip leaves.
  const filterButton = useRef<HTMLButtonElement>(null);
  const sortName: Record<DeckSort, string> = {
    section: t`Section`,
    due: t`Due date`,
    added: t`Recently added`,
    az: t`A–Z`,
  };

  return (
    <div className="grid gap-2.5">
      <div className="flex items-center gap-2">
        <FilterMenu
          filters={filters}
          setFilters={setFilters}
          ctx={filterCtx}
          triggerRef={filterButton}
        />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button size="sm" variant="ghost" aria-label={t`Sort: ${sortName[sort]}`}>
                <ArrowUpDown data-icon="inline-start" aria-hidden="true" />
                {sortName[sort]}
              </Button>
            }
          />
          <DropdownMenuContent aria-label={t`Sort`}>
            <DropdownMenuRadioGroup value={sort} onValueChange={(v) => setSort(v as DeckSort)}>
              {(sections.length > 0
                ? (["section", "due", "added", "az"] as const)
                : (["added", "due", "az"] as const)
              ).map((key) => (
                <DropdownMenuRadioItem key={key} value={key}>
                  {sortName[key]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* Desktop keeps search beside the tools, where "/" lands; the phone has it up top. */}
        <div className="relative ms-auto hidden w-56 min-w-0 @3xl/shell:block">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <Input
            ref={searchRef}
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t`Search this deck`}
            aria-label={t`Search this deck`}
            autoComplete="off"
            inputSize="sm"
            className="ps-9"
          />
        </div>
      </div>
      <FilterChips
        filters={filters}
        setFilters={setFilters}
        ctx={filterCtx}
        fallbackFocus={filterButton}
      />
    </div>
  );
}

/**
 * While cards are being chosen, this takes the place of Filter and Sort and sticks to the top of
 * the page, so the count and the action stay where the eye already is and cover nothing.
 */
function SelectionToolbar({
  count,
  total,
  reviewable,
  due,
  onAll,
  onClear,
  onReview,
  marked,
  onMark,
  onTags,
  onMove,
  onMoveToDeck,
  onArchive,
  onDone,
}: {
  count: number;
  total: number;
  /** Chosen cards a review takes: started, and not reviewed today. */
  reviewable: number;
  /** Of those, the ones due before the day ends. */
  due: number;
  onAll: () => void;
  onClear: () => void;
  onReview?: ((kind: "due" | "all") => void) | undefined;
  /** Whether every chosen card is already marked important, so the mark comes off. */
  marked: boolean;
  onMark?: (() => void) | undefined;
  /** The owner's: a member reads the deck, so Review and the mark, which is their own, are theirs. */
  onTags?: (() => void) | undefined;
  onMove?: (() => void) | undefined;
  onMoveToDeck?: (() => void) | undefined;
  onArchive?: (() => void) | undefined;
  onDone: () => void;
}) {
  const { t } = useLingui();
  const all = count > 0 && count === total;
  const limit = CHOSEN_LIMIT;
  return (
    <section
      aria-label={t`Selected cards`}
      className="@container/tools edge-2 flex h-11 items-center gap-1 rounded-lg bg-plate ps-1 pe-1.5"
    >
      <IconButton size="sm" label={t`Stop selecting`} onClick={onDone}>
        <X />
      </IconButton>
      <p
        className="me-auto min-w-0 truncate ps-1 text-base font-medium tabular-nums"
        aria-live="polite"
      >
        <Plural value={count} _0="Select cards" one="# selected" other="# selected" />
      </p>
      <Button size="sm" variant="ghost" onClick={all ? onClear : onAll}>
        {all ? <Trans>Clear</Trans> : <Trans>Select all</Trans>}
      </Button>
      {/* One menu of what can be done to the chosen cards, as the phone's toolbar has. */}
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={count === 0}
          render={
            <Button size="sm" variant="primary">
              <Trans>Actions</Trans>
              <ChevronDown data-icon="inline-end" aria-hidden="true" />
            </Button>
          }
        />
        <DropdownMenuContent aria-label={t`Actions`} align="end">
          {onReview && (
            <DropdownMenuGroup>
              {/* Due first, since clearing today's work is why most learners narrow the list. */}
              {due > 0 && (
                <DropdownMenuItem onClick={() => onReview("due")}>
                  <RotateCcw />
                  {due > limit ? (
                    <Trans>
                      Review {limit} of {due} due
                    </Trans>
                  ) : (
                    <Plural value={due} one="Review # due" other="Review # due" />
                  )}
                </DropdownMenuItem>
              )}
              {(due === 0 || reviewable > due) && (
                <DropdownMenuItem disabled={reviewable === 0} onClick={() => onReview("all")}>
                  <RotateCcw />
                  {reviewable > limit ? (
                    <Trans>
                      Review {limit} of {reviewable}
                    </Trans>
                  ) : (
                    <Plural
                      value={reviewable}
                      _0="Nothing to review"
                      one="Review all #"
                      other="Review all #"
                    />
                  )}
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          )}
          {onReview && onMark && <DropdownMenuSeparator />}
          {onMark && (
            <DropdownMenuItem onClick={onMark}>
              <Star className={marked ? "fill-current" : undefined} />
              {/* Its own message, since Ukrainian and Russian say it of several cards. */}
              {marked
                ? t({ message: "Unmark important", context: "chosen cards" })
                : t({ message: "Mark important", context: "chosen cards" })}
            </DropdownMenuItem>
          )}
          {(onReview || onMark) && (onTags || onMove || onMoveToDeck) && <DropdownMenuSeparator />}
          {onTags && (
            <DropdownMenuItem onClick={onTags}>
              <Tags />
              <Trans>Tags…</Trans>
            </DropdownMenuItem>
          )}
          {onMove && (
            <DropdownMenuItem onClick={onMove}>
              <Signpost />
              <Trans>Move to section…</Trans>
            </DropdownMenuItem>
          )}
          {onMoveToDeck && (
            <DropdownMenuItem onClick={onMoveToDeck}>
              <FolderInput />
              <Trans>Move to deck…</Trans>
            </DropdownMenuItem>
          )}
          {onArchive && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="danger" onClick={onArchive}>
                <Archive />
                <Trans>Archive</Trans>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </section>
  );
}

/**
 * One deck: two plates, then its words as a glossary under a filter, a sort and search. A card
 * opens beside the list when both fit, and otherwise as a sheet over the page on a
 * desktop or a drawer on touch. The deck page is for reading; writing a card happens in capture,
 * an integration or the open card.
 */
export function DeckDetailView({
  deck,
  cards,
  knownReadings,
  streak,
  onReview,
  onSettings,
  owner,
  member,
  seriesName,
  openCardId,
  onOpen,
  history,
  onPlayAudio,
  onImportantChange,
  onMarkCards,
  decks,
  sections = [],
  progress,
  onStartSection,
  onReviewSection,
  onReviewCards,
  startSectionPending,
  failure,
  onRetry,
  retryPending,
  cardBeside,
  connectUrl,
  connected,
  scope = {},
}: DeckDetailProps) {
  const { t, i18n } = useLingui();
  const st = useStaticNav();
  // A member reports the deck or one of its cards; the subject stays while the dialog closes.
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState<ContentReportTarget | null>(null);
  const [reportedName, setReportedName] = useState("");
  const report = (target: NonNullable<typeof reported>, name: string) => {
    setReported(target);
    setReportedName(name);
    setReporting(true);
  };
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<DeckFilters>(noFilters);
  // A tag renamed or archived, or a section gone, leaves the filter rather than an orphan chip.
  useEffect(() => {
    if (!cards) return;
    const tagKeys = new Set(deckTags(cards).map((tag) => tag.key));
    const sectionIds = new Set(sections.map((s) => s.id));
    setFilters((f) => liveFilters(f, tagKeys, sectionIds));
  }, [cards, sections]);
  const [chosenSort, setSort] = useState<DeckSort | null>(null);
  // A deck with sections opens on them; one without has nothing to group that way.
  const sectionId = scope.sectionId;
  const scoped = sectionId !== undefined;
  // A section's list is one section, so it has no Section sort.
  const sort: DeckSort =
    chosenSort === "section" || chosenSort === null
      ? sections.length > 0 && !scoped
        ? "section"
        : "added"
      : chosenSort;
  const [localOpen, setLocalOpen] = useState<string | null>(null);
  const openId = openCardId === undefined ? localOpen : openCardId;
  // Read through a ref, so the rows' `onOpen` stays the same function across the route's renders.
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  const setOpen = useCallback((id: string | null) => {
    setLocalOpen(id);
    onOpenRef.current?.(id);
  }, []);
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const closeSearch = () => {
    setQ("");
    setSearchOpen(false);
  };
  const clearAll = () => {
    setQ("");
    setFilters(noFilters);
  };

  // "/" puts the caret in the deck's own search, the shortcut PRODUCT.md promises.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      // The desktop field is not drawn in a narrow container, so open the top bar's instead.
      if (searchRef.current?.offsetParent) searchRef.current.focus();
      else setSearchOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The list's clock, refreshed with the cards rather than every render, so headings hold still.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the cards are the reason to look again
  const now = useMemo(() => Date.now(), [cards]);
  // A section's filters count only its own cards, and offer no Section filter.
  const filterCtx = useMemo<FilterContext>(
    () =>
      scoped
        ? {
            rows: filterRows(
              cards ?? [],
              scopedFilters(noFilters, { sectionId }),
              "",
              now,
              sections,
            ),
            sections: NO_SECTIONS,
            now,
            query: q,
          }
        : { rows: cards ?? [], sections, now, query: q },
    [cards, scoped, sectionId, sections, now, q],
  );
  const shown = useMemo(
    () =>
      cards
        ? filterRows(cards, scopedFilters(filters, { sectionId }), q, now, sections)
        : undefined,
    [cards, filters, sectionId, q, now, sections],
  );
  const everything = q.trim() === "" && activeFilterCount(filters) === 0;
  // The owner sees every section, empty ones too, so there is always somewhere to drop a card.
  const arranging = !!owner && !scoped && sort === "section" && everything;
  const groups = useMemo(
    () => (shown ? groupRows(shown, sort, now, i18n.locale, sections, arranging) : []),
    [shown, sort, now, i18n.locale, sections, arranging],
  );
  const ordered = useMemo(() => groups.flatMap((g) => g.rows), [groups]);
  const {
    selected,
    start: startSelecting,
    toggle: toggleSelected,
    all: selectAll,
    clear: clearSelection,
    stop: stopSelecting,
    unmarked,
    reviewable,
  } = useCardSelection(cards, shown && ordered);

  const goToSection = (id: string) => {
    if (chosenSort !== null && chosenSort !== "section") setSort("section");
    setFilters(noFilters);
    setQ("");
    requestAnimationFrame(() => {
      const heading = document.getElementById(sectionAnchor(id));
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      heading?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      heading?.focus({ preventScroll: true });
    });
  };

  const openIndex = ordered.findIndex((r) => r.card.id === openId);
  const open = openIndex >= 0 ? ordered[openIndex] : cards?.find((r) => r.card.id === openId);

  const rootRef = useRef<HTMLDivElement>(null);
  const width = useWidth(rootRef);
  const fits = cardBeside || width >= LIST_PX + CARD_PX;
  // A resize moves an open card between beside and sheet, but waits while an edit or the Move sheet is open.
  const [busy, setBusy] = useState(false);
  const [held, setHeld] = useState<boolean | null>(null);
  if (busy && held === null) setHeld(fits);
  if (!busy && held !== null) setHeld(null);
  const beside = held ?? fits;
  const measuring = !!open && !cardBeside && width === 0;

  // The sheet keeps drawing the last word while it slides away.
  const lastOpen = useRef(open);
  if (open) lastOpen.current = open;
  const shownWord = open ?? lastOpen.current;

  // Walking the list with a word open, the way a mail client does.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // The sheet closes itself on Escape; beside the list, the page does.
      if (e.key === "Escape" && beside) setOpen(null);
      const step = e.key === "j" ? 1 : e.key === "k" ? -1 : 0;
      const next = step && openIndex >= 0 ? ordered[openIndex + step] : undefined;
      if (next) setOpen(next.card.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, ordered, openIndex, beside, setOpen]);

  // Archiving takes away the row that opened the card, so focus moves on to its neighbour.
  const archivedNeighbour = useRef<string | null>(null);

  const titleId = useId();
  const word = shownWord && deck && (
    <WordView
      key={shownWord.card.id}
      card={shownWord.card}
      state={shownWord.state}
      deckName={deck.name}
      modes={shownWord.card.reviewModes ?? deck.reviewModes}
      knownReadings={knownReadings}
      history={history}
      onPlayAudio={onPlayAudio ? () => onPlayAudio(shownWord.card) : undefined}
      onImportantChange={
        onImportantChange ? (important) => onImportantChange(shownWord.card, important) : undefined
      }
      hasPrev={openIndex > 0}
      hasNext={openIndex >= 0 && openIndex < ordered.length - 1}
      onPrev={() => {
        const prev = ordered[openIndex - 1];
        if (prev) setOpen(prev.card.id);
      }}
      onNext={() => {
        const next = ordered[openIndex + 1];
        if (next) setOpen(next.card.id);
      }}
      onClose={() => {
        const id = shownWord.card.id;
        setOpen(null);
        // Beside the list nothing hands focus back, so the row that opened the card takes it.
        requestAnimationFrame(() => cardRow(id)?.focus());
      }}
      onReport={
        member
          ? () => report({ kind: "card", cardId: shownWord.card.id }, shownWord.card.term)
          : undefined
      }
      owner={
        owner && {
          onEdit: () => owner.onEditCard(shownWord.card),
          onEnrich: () => owner.onEnrichCard(shownWord.card),
          enrichFields: deck.enrichFields,
          onArchive: () => {
            const near =
              openIndex >= 0 ? (ordered[openIndex + 1] ?? ordered[openIndex - 1]) : undefined;
            archivedNeighbour.current = near?.card.id ?? null;
            setOpen(null);
            owner.onArchiveCard(shownWord.card.id);
            if (beside && near) requestAnimationFrame(() => cardRow(near.card.id)?.focus());
          },
          onMove: (deckId) => owner.onMoveCard(shownWord.card.id, deckId),
          onMoveToSection: () => owner.sections.onPickSection([shownWord.card.id]),
        }
      }
      decks={decks}
      titleId={titleId}
      onBusyChange={setBusy}
    />
  );

  const addButton =
    owner &&
    (owner.onSmartAdd ? (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <IconButton label={t`Add`}>
              <Plus />
            </IconButton>
          }
        />
        <DropdownMenuContent aria-label={t`Add`} align="end">
          <DropdownMenuItem onClick={owner.onAddCard}>
            <PenLine />
            <Trans>New card</Trans>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={owner.onSmartAdd}>
            <Sparkles />
            <Trans>Smart add</Trans>
            <Chip size="sm" className="ms-auto">
              <Trans>Beta</Trans>
            </Chip>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ) : (
      <IconButton label={t`Add card`} onClick={owner.onAddCard}>
        <Plus />
      </IconButton>
    ));

  const deckMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <IconButton label={t`Deck options`}>
            <MoreHorizontal />
          </IconButton>
        }
      />
      <DropdownMenuContent aria-label={t`Deck options`} align="end">
        <DropdownMenuItem onClick={onSettings} disabled={!onSettings}>
          <Settings2 />
          {deck && deck.role !== "owner" ? <Trans>About this deck</Trans> : <Trans>Settings</Trans>}
        </DropdownMenuItem>
        {owner && (
          <>
            <DropdownMenuItem onClick={owner.onMoveToSeries}>
              <Layers />
              <Trans>Move to series</Trans>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={owner.sections.onCreate}>
              <Signpost />
              <Trans>New section</Trans>
            </DropdownMenuItem>
          </>
        )}
        {/* A member selects too, to review chosen cards; changing them stays the owner's. */}
        <DropdownMenuItem onClick={startSelecting} disabled={!cards?.length || !!selected}>
          <SquareCheck />
          <Trans>Select cards</Trans>
        </DropdownMenuItem>
        {owner && (
          <DropdownMenuItem onClick={owner.onExport} disabled={!deck}>
            <Download />
            <Trans>Export</Trans>
          </DropdownMenuItem>
        )}
        {member && deck && <DropdownMenuSeparator />}
        {member && deck && (
          <DropdownMenuItem onClick={() => report({ kind: "deck", deckId: deck.id }, deck.name)}>
            <Flag />
            <Trans>Report deck</Trans>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {member ? (
          <DropdownMenuItem variant="danger" onClick={member.onLeave}>
            <LogOut />
            <Trans>Leave deck</Trans>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem variant="danger" onClick={owner?.onArchiveDeck} disabled={!owner}>
            <Archive />
            <Trans>Archive</Trans>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
  const reportDialog = reported && (
    <ReportDialog
      open={reporting}
      onOpenChange={setReporting}
      target={reported}
      name={reportedName}
    />
  );

  const backToLibrary = { label: t`Library`, to: "/library" };

  // A deck that could not be loaded takes the whole screen, so no skeleton is left waiting under it.
  if (failure) {
    return (
      <Screen back={backToLibrary} ownTitle>
        {failure === "gone" ? (
          <ErrorState
            title={t`This deck is no longer here`}
            body={t`It may have been archived, or you were removed from it.`}
            action={
              <Button variant="primary" render={<NavLink to="/library" />}>
                {t`Open Library`}
              </Button>
            }
          />
        ) : (
          <ErrorState
            title={t`Couldn’t load this deck`}
            onRetry={onRetry}
            retrying={retryPending}
          />
        )}
      </Screen>
    );
  }

  const query = q.trim();
  const filtered = query !== "" || activeFilterCount(filters) > 0;

  return (
    <div ref={rootRef} className="flex min-h-0 flex-1">
      <Screen
        title={deck && <bdi>{deck.name}</bdi>}
        back={backToLibrary}
        sub={
          deck
            ? subline(
                deck.role !== "owner" && <OwnerLine deck={deck} />,
                seriesName && (
                  // Marked, so a series named after the deck's language never reads as the language twice.
                  <>
                    <Layers className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="sr-only">{t`Series`}</span>
                    <span>{seriesName}</span>
                  </>
                ),
                deck.defaultLanguage ? languageName(deck.defaultLanguage) : null,
                deck.directions !== "recognition" ? directionLabel(deck.directions) : null,
              )
            : undefined
        }
        actions={
          <>
            {/* Desktop keeps search beside the list tools, where "/" lands. */}
            {cards && cards.length > 0 && (
              <IconButton
                label={t`Search this deck`}
                onClick={() => setSearchOpen(true)}
                className="@3xl/shell:hidden"
              >
                <Search />
              </IconButton>
            )}
            {addButton}
            {deckMenu}
            {reportDialog}
          </>
        }
        bar={
          searchOpen ? (
            <ScreenBar>
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
                <Input
                  autoFocus
                  enterKeyHint="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") closeSearch();
                  }}
                  placeholder={t`Search this deck`}
                  aria-label={t`Search this deck`}
                  autoComplete="off"
                  className="w-full ps-9"
                />
              </div>
              <Button variant="ghost" onClick={closeSearch}>
                <Trans>Cancel</Trans>
              </Button>
            </ScreenBar>
          ) : undefined
        }
      >
        {/* While the phone searches, the list is the answer, so the plates step aside. */}
        <div className={clsx(searchOpen && "hidden @3xl/shell:block")}>
          {deck === undefined || cards === undefined ? (
            <div className="grid gap-3">
              <Skeleton className="h-[84px] rounded-xl" />
              <Skeleton className="h-[84px] rounded-xl" />
            </div>
          ) : cards.length > 0 ? (
            <DeckPlates
              deck={deck}
              cards={cards}
              streak={streak}
              onReview={onReview}
              onAdd={owner?.onAddCard}
              section={
                progress &&
                onStartSection && (
                  <SectionProgress
                    sections={sections}
                    progress={progress}
                    due={deck.due}
                    onGoTo={goToSection}
                    onStart={onStartSection}
                    starting={startSectionPending}
                  />
                )
              }
            />
          ) : !owner ? (
            <StartPanel
              title={<Trans>No cards in {isolate(deck.name)} yet</Trans>}
              body={<OwnerAddsCards owner={deck.owner.name} former={deck.owner.former === true} />}
            />
          ) : (
            <StartPanel
              icon={<Layers />}
              title={<Trans>No cards in {isolate(deck.name)} yet</Trans>}
              body={<Trans>Add cards from your last lesson, then review them here.</Trans>}
              action={
                <Button
                  variant="primary"
                  className="justify-self-start"
                  onClick={owner.onAddCard}
                  kbd="N"
                >
                  <Trans>Add a card</Trans>
                </Button>
              }
            >
              <StartPanelSection>
                <NextSteps label={t`Other ways to add cards`}>
                  {owner.onSmartAdd && (
                    <NextStep
                      icon={<Sparkles />}
                      title={<Trans>Turn your notes into cards</Trans>}
                      detail={
                        <Trans>Paste a lesson or add photos of it, then pick the words</Trans>
                      }
                      onClick={() => {
                        captureAnalytics("empty_state_option_picked", { option: "lesson" });
                        owner.onSmartAdd?.();
                      }}
                    />
                  )}
                  {connected === false && connectUrl && (
                    <NextStep
                      icon={<Plug />}
                      title={<Trans>Send a lesson from Claude or ChatGPT</Trans>}
                      detail={<Trans>Connect Lymi, paste the lesson, and ask for the cards</Trans>}
                      href={connectUrl}
                    />
                  )}
                  <NextStep
                    icon={<KeyRound />}
                    title={<Trans>Add cards with the API</Trans>}
                    detail={<Trans>Create a key in Settings</Trans>}
                    to="/settings"
                    hash="api-keys"
                  />
                </NextSteps>
              </StartPanelSection>
            </StartPanel>
          )}
        </div>

        {cards && cards.length > 0 && (
          <div
            className={clsx(
              searchOpen ? "mt-2 @3xl/shell:mt-6" : "mt-6",
              // Pinned over a strip of the page's own ground, so rows never show beside it.
              selected &&
                "sticky top-(--inset-top) z-20 -mx-5 bg-canvas px-5 py-2 @3xl/shell:-mx-8 @3xl/shell:px-8",
            )}
          >
            {selected ? (
              <SelectionToolbar
                count={selected.size}
                total={ordered.length}
                reviewable={reviewable.length}
                due={reviewable.filter((r) => r.due).length}
                onAll={selectAll}
                onClear={clearSelection}
                onReview={
                  onReviewCards &&
                  ((kind) =>
                    // One review takes at most CHOSEN_LIMIT, and the list is due first, so the cap keeps those.
                    onReviewCards(
                      reviewable
                        .filter((r) => kind === "all" || r.due)
                        .slice(0, CHOSEN_LIMIT)
                        .map((r) => r.id),
                    ))
                }
                marked={!!cards?.length && !unmarked}
                // In-place changes keep the cards chosen for the next; Move to deck and Archive end it.
                onMark={onMarkCards && (() => onMarkCards([...selected], unmarked))}
                onTags={owner && (() => owner.onTagCards([...selected]))}
                onMove={owner && (() => owner.sections.onPickSection([...selected]))}
                onMoveToDeck={
                  owner?.onMoveCardsToDeck &&
                  (() => owner.onMoveCardsToDeck?.([...selected], stopSelecting))
                }
                onArchive={
                  owner &&
                  (() => {
                    const ids = [...selected];
                    stopSelecting();
                    owner.onArchiveCards(ids);
                  })
                }
                onDone={stopSelecting}
              />
            ) : (
              <ListTools
                // A section's list has no Section filter or sort to offer.
                sections={scoped ? NO_SECTIONS : sections}
                filters={filters}
                setFilters={setFilters}
                filterCtx={filterCtx}
                sort={sort}
                setSort={setSort}
                query={q}
                setQuery={setQ}
                searchRef={searchRef}
              />
            )}
          </div>
        )}

        {cards === undefined && (
          <div className="grid gap-2 pt-6">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        )}

        {groups.length > 0 && (
          <div className={clsx(sort === "az" && "pt-4")}>
            <Glossary
              groups={groups}
              sort={sort}
              openId={openId}
              onOpen={setOpen}
              now={now}
              progress={progress}
              onStart={onStartSection}
              onReview={onReviewSection}
              editing={
                owner && {
                  ...owner.sections,
                  several: sections.length > 1,
                  onDropCards: owner.sections.onMoveCards,
                }
              }
              movable={arranging && !st}
              selection={selected ? { ids: selected, onToggle: toggleSelected } : undefined}
            />
          </div>
        )}

        {/* The search and the filter stay in view above it, so the way back is beside its cause. */}
        {shown && shown.length === 0 && cards && cards.length > 0 && (
          <NoResults
            icon={query ? <SearchX /> : <ListFilter />}
            title={
              query
                ? t`No cards match “${{ query: isolate(query) }}”`
                : t`No cards match these filters`
            }
            detail={
              query ? (
                <Trans>Try a different term or meaning, or clear the search.</Trans>
              ) : (
                <Trans>Remove a filter above, or show every card in this deck.</Trans>
              )
            }
            action={
              filtered ? (
                <Button onClick={clearAll}>
                  {query ? <Trans>Clear search</Trans> : <Trans>Show all</Trans>}
                </Button>
              ) : undefined
            }
          />
        )}
      </Screen>

      {/* Beside the list: sticky with its own scroll so J and K walk the list, and risen over the top inset so the Mac's title bar sits on its plate, outside the scroll. */}
      {open && beside && (
        <aside className="sticky top-0 z-(--z-sticky) -mt-(--inset-top) flex max-h-dvh w-[400px] shrink-0 flex-col border-s border-edge bg-plate pt-(--inset-top)">
          <div className="min-h-0 overflow-y-auto px-7 pt-6 pb-10">{word}</div>
        </aside>
      )}
      {!beside && !st && (
        <CardPlace
          open={!!open && !measuring}
          onClose={() => setOpen(null)}
          titleId={titleId}
          finalFocus={() => {
            const id = archivedNeighbour.current;
            archivedNeighbour.current = null;
            return (id && cardRow(id)) || true;
          }}
        >
          {word}
        </CardPlace>
      )}
    </div>
  );
}

function cardRow(id: string) {
  return document.querySelector<HTMLElement>(`[data-card-row="${CSS.escape(id)}"]`);
}
