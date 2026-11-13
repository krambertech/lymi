import { plural } from "@lingui/core/macro";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { groupDecks, nameInSeries } from "@lymi/client/library-groups";
import { isolate } from "@lymi/core";
import { clsx } from "clsx";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  BookMarked,
  ChevronRight,
  FileUp,
  Layers,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SearchX,
  Trash2,
  X,
} from "lucide-react";
import {
  type FocusEvent,
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button, IconButton } from "../components/button";
import { languageName } from "../components/deck-fields";
import { DeckRow } from "../components/deck-row";
import { ErrorState, NoResults } from "../components/empty-state";
import { Screen } from "../components/layout/screen";
import { LibraryBoard } from "../components/library-board";
import { NavLink, useStaticNav } from "../components/nav-link";
import { NextStep, NextSteps } from "../components/next-steps";
import { Skeleton } from "../components/skeleton";
import { StartPanel, StartPanelSection } from "../components/start-panel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Input } from "../components/ui/input";
import type { DeckSummary, Series } from "../lib/api";
import { captureAnalytics } from "../lib/telemetry";

export interface LibraryProps {
  decks: DeckSummary[] | undefined;
  /** The decks failed to load and nothing is cached, so the screen offers a retry. */
  failed?: boolean | undefined;
  onRetry?: (() => void) | undefined;
  retrying?: boolean | undefined;
  /** The learner's series. Undefined while loading or offline, which shows every deck loose. */
  series?: Series[] | undefined;
  /** When each deck's next card comes back, keyed by deck id. E.g. "Monday". */
  next?: Record<string, string> | undefined;
  archivedCount?: number | undefined;
  /** Opens Archived, which Library's menu offers while any deck is archived. */
  onShowArchived?: (() => void) | undefined;
  onCreateDeck?: (() => void) | undefined;
  /** New deck from a series' menu, which makes the deck inside that series. */
  onCreateDeckInSeries?: ((series: Series) => void) | undefined;
  onImport?: (() => void) | undefined;
  onNewSeries?: (() => void) | undefined;
  onEditSeries?: ((series: Series) => void) | undefined;
  onDeleteSeries?: ((series: Series) => void) | undefined;
  /** Move a series one place up or down among the series. */
  onMoveSeries?: ((series: Series, by: -1 | 1) => void) | undefined;
  /** A series' whole deck list after a drag. Absent, decks cannot be dragged. */
  onSetSeriesDecks?: ((seriesId: string, deckIds: string[]) => void) | undefined;
  onRemoveFromSeries?: ((deckId: string) => void) | undefined;
}

/** How many decks a search left, in bands, so the event never carries the learner's words. */
const matchBand = (n: number) => (n <= 1 ? "1" : n <= 5 ? "2-5" : "6+");

/**
 * Every deck, as rows in one plate per group like Today's deck lists: the learner's own decks
 * first with no heading, then each series under its name with Review all at the top of its plate.
 * Search narrows them by name, language or series. Today owns the daily review.
 */
export function LibraryView({
  decks,
  failed,
  onRetry,
  retrying,
  series,
  next,
  archivedCount,
  onShowArchived,
  onCreateDeck,
  onCreateDeckInSeries,
  onImport,
  onNewSeries,
  onEditSeries,
  onDeleteSeries,
  onMoveSeries,
  onSetSeriesDecks,
  onRemoveFromSeries,
}: LibraryProps) {
  const { t, i18n } = useLingui();
  const st = useStaticNav();
  const total = decks?.reduce((n, d) => n + d.total, 0) ?? 0;
  const failedEmpty = failed === true && decks === undefined;
  const loading = decks === undefined && !failedEmpty;
  const hasDecks = !!decks && decks.length > 0;

  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const deskSearchRef = useRef<HTMLInputElement>(null);
  const phoneSearchRef = useRef<HTMLInputElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const q = query.trim().toLocaleLowerCase(i18n.locale);

  const seriesName = useMemo(() => new Map((series ?? []).map((s) => [s.id, s.name])), [series]);
  const visible = useMemo(() => {
    if (!decks || !q) return decks ?? [];
    const has = (text: string | null | undefined) =>
      !!text && text.toLocaleLowerCase(i18n.locale).includes(q);
    return decks.filter(
      (d) =>
        has(d.name) ||
        has(d.defaultLanguage ? languageName(d.defaultLanguage) : null) ||
        has(d.seriesId ? seriesName.get(d.seriesId) : null),
    );
  }, [decks, q, i18n.locale, seriesName]);
  const groups = useMemo(() => {
    const all = groupDecks(visible, series);
    // While searching, a series none of whose decks match steps aside rather than reading as empty.
    return q ? { ...all, series: all.series.filter((g) => g.decks.length > 0) } : all;
  }, [visible, series, q]);
  // A series reviews all its decks, so its count ignores the search.
  const dueBySeries = useMemo(() => {
    const due = new Map<string, number>();
    for (const d of decks ?? []) {
      if (d.seriesId) due.set(d.seriesId, (due.get(d.seriesId) ?? 0) + d.due);
    }
    return due;
  }, [decks]);

  const refocusButton = useRef(false);
  const openSearch = () => setSearchOpen(true);
  const closeSearch = (restoreFocus: boolean) => {
    refocusButton.current = restoreFocus;
    setQuery("");
    setSearchOpen(false);
  };
  const deskOpen = searchOpen || !!query;
  // Focus follows the field: into it as it opens, back to its button once it has closed.
  useEffect(() => {
    if (deskOpen) {
      deskSearchRef.current?.focus();
    } else if (refocusButton.current) {
      refocusButton.current = false;
      searchButtonRef.current?.focus();
    }
  }, [deskOpen]);

  // "/" puts the caret in Library's search, the shortcut PRODUCT.md promises.
  useEffect(() => {
    if (!hasDecks) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) {
        return;
      }
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      // The phone's field is always drawn; the desktop's opens from its button.
      if (phoneSearchRef.current?.offsetParent) phoneSearchRef.current.focus();
      else if (deskSearchRef.current) deskSearchRef.current.focus();
      else setSearchOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasDecks]);

  const opened = () => {
    if (q) captureAnalytics("library_searched", { matches: matchBand(visible.length) });
  };

  // Quiet on purpose: these are occasional, and the decks are what Library is for.
  const archived = !!archivedCount && onShowArchived;
  const libraryMenu = (onNewSeries || onImport || archived) && (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <IconButton label={t`Library options`}>
            <MoreHorizontal aria-hidden="true" />
          </IconButton>
        }
      />
      <DropdownMenuContent aria-label={t`Library options`} align="end">
        {onNewSeries && (
          <DropdownMenuItem onClick={onNewSeries}>
            <Layers />
            <Trans>New series</Trans>
          </DropdownMenuItem>
        )}
        {onNewSeries && onImport && <DropdownMenuSeparator />}
        {onImport && (
          <DropdownMenuItem onClick={onImport}>
            <FileUp />
            <Trans>Import decks</Trans>
          </DropdownMenuItem>
        )}
        {/* Deleting a series can archive its decks, so Library says where they went. */}
        {archived && (
          <DropdownMenuItem onClick={onShowArchived}>
            <Archive />
            <Trans>Archived decks</Trans>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Desktop: search and New deck are icons beside the menu, and search opens into a field there.
  const deskTools = hasDecks && (
    <div className="hidden items-center gap-1 @3xl/shell:flex">
      {deskOpen ? (
        <SearchField
          inputRef={deskSearchRef}
          size="sm"
          value={query}
          onChange={setQuery}
          className="w-60"
          dismissLabel={t`Close search`}
          onDismiss={() => closeSearch(true)}
          onKeyDown={(e) => {
            if (e.key !== "Escape") return;
            e.preventDefault();
            if (query) setQuery("");
            else closeSearch(true);
          }}
          onBlur={(e) => {
            // An empty field closes when focus leaves it, unless focus went to its own X.
            if (query || e.currentTarget.parentElement?.contains(e.relatedTarget as Node | null))
              return;
            closeSearch(false);
          }}
        />
      ) : (
        <IconButton
          ref={searchButtonRef}
          label={t`Search decks`}
          aria-keyshortcuts="/"
          onClick={openSearch}
        >
          <Search aria-hidden="true" />
        </IconButton>
      )}
      {onCreateDeck && (
        <IconButton label={t`New deck`} onClick={onCreateDeck}>
          <Plus aria-hidden="true" />
        </IconButton>
      )}
    </div>
  );

  const seriesHeader = (s: Series) => {
    const index = groups.series.findIndex((g) => g.series.id === s.id);
    const seriesName = s.name;
    return (
      // One line: a long name truncates rather than pushing the menu under it.
      <div className="flex min-h-8 items-center gap-2 px-1">
        <h2 className="min-w-0 flex-1 truncate text-lg font-medium tracking-[-0.01em]">
          {seriesName}
        </h2>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <IconButton label={t`Options for ${{ seriesName: isolate(seriesName) }}`} size="sm">
                <MoreHorizontal />
              </IconButton>
            }
          />
          <DropdownMenuContent aria-label={t`Options for ${seriesName}`} align="end">
            {onCreateDeckInSeries && (
              <DropdownMenuItem onClick={() => onCreateDeckInSeries(s)}>
                <Plus />
                <Trans>New deck</Trans>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onEditSeries?.(s)} disabled={!onEditSeries}>
              <Pencil />
              <Trans>Edit series</Trans>
            </DropdownMenuItem>
            {groups.series.length > 1 && !q && (
              <>
                <DropdownMenuItem
                  onClick={() => onMoveSeries?.(s, -1)}
                  disabled={!onMoveSeries || index <= 0}
                >
                  <ArrowUp />
                  <Trans>Move up</Trans>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onMoveSeries?.(s, 1)}
                  disabled={!onMoveSeries || index >= groups.series.length - 1}
                >
                  <ArrowDown />
                  <Trans>Move down</Trans>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="danger"
              onClick={() => onDeleteSeries?.(s)}
              disabled={!onDeleteSeries}
            >
              <Trash2 />
              <Trans>Delete series</Trans>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  // The series' Review, a strip the plate rests on, in the due count's amber tint.
  const seriesReview = (s: Series) => {
    const due = dueBySeries.get(s.id) ?? 0;
    if (due === 0) return null;
    const seriesName = s.name;
    return (
      <NavLink
        to="/review"
        search={{ series: s.id }}
        aria-label={t`Review ${seriesName}, ${plural(due, { one: "# card due", other: "# cards due" })}`}
        // The end matches a deck row's (DeckRow): the count where theirs sits, the chevron under theirs.
        className="group -mt-3.5 flex items-center gap-4 rounded-b-xl bg-amber-soft pt-6 pb-3 ps-5 pe-4 text-amber-tint-ink transition-[background-color] duration-150 hoverable:hover:bg-amber-tint"
      >
        <span className="min-w-0 flex-1 truncate text-base font-medium">
          <Trans>Review all</Trans>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {/* Ends where the rows' chips end, so it sits as close to its chevron as they do. */}
          <span className="text-xs font-semibold tabular-nums">{i18n.number(due)}</span>
          <span className="grid size-5 place-items-center [&_svg]:size-[18px]">
            <ChevronRight className="rtl:-scale-x-100" aria-hidden="true" />
          </span>
        </span>
      </NavLink>
    );
  };

  const emptySeries = (s: Series) => (
    <div className="flex min-h-[72px] w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-dashed border-edge-strong px-5 py-3">
      <p className="max-w-sm text-sm text-ink-secondary">
        {onSetSeriesDecks ? (
          <Trans>Drag decks here to add them to this series.</Trans>
        ) : (
          <Trans>No decks in this series yet.</Trans>
        )}
      </p>
      <Button size="sm" onClick={() => onEditSeries?.(s)} aria-disabled={!onEditSeries}>
        <Trans>Choose decks</Trans>
      </Button>
    </div>
  );

  const searching = !!q;
  const term = query.trim();
  const matches = visible.length;
  const noMatch = searching && matches === 0;

  return (
    <Screen
      kind="tab"
      title={t`Library`}
      sub={
        decks
          ? t`${plural(decks.length, { one: "# deck", other: "# decks" })} · ${plural(total, { one: "# card", other: "# cards" })}`
          : undefined
      }
      actions={
        decks && (deskTools || libraryMenu) ? (
          <>
            {deskTools}
            {libraryMenu}
          </>
        ) : undefined
      }
    >
      {loading && (
        <div className="grid gap-3">
          <Skeleton className="h-[216px] rounded-xl" />
        </div>
      )}

      {failedEmpty && (
        <ErrorState
          title={t`Couldn’t load Library`}
          onRetry={onRetry}
          retrying={retrying}
          className="flex-1"
        />
      )}

      {decks && decks.length === 0 && (
        <StartPanel
          icon={<BookMarked />}
          title={<Trans>No decks yet</Trans>}
          body={<Trans>Make one for each course or topic.</Trans>}
          action={
            <Button
              variant="primary"
              className="justify-self-start"
              onClick={() => {
                captureAnalytics("empty_state_option_picked", { option: "create_deck" });
                onCreateDeck?.();
              }}
              aria-disabled={!onCreateDeck}
            >
              <Plus data-icon="inline-start" aria-hidden="true" />
              <Trans>New deck</Trans>
            </Button>
          }
        >
          {onImport && (
            <StartPanelSection>
              <NextSteps label={t`Other ways to add decks`}>
                <NextStep
                  icon={<FileUp />}
                  title={<Trans>Import decks</Trans>}
                  detail={<Trans>Decks from Anki, Mochi or Noji, with their review history.</Trans>}
                  onClick={() => {
                    captureAnalytics("empty_state_option_picked", { option: "import" });
                    onImport?.();
                  }}
                />
              </NextSteps>
            </StartPanelSection>
          )}
        </StartPanel>
      )}

      {hasDecks && (
        // The phone has no room beside the title, so search and New deck get a row of their own.
        <div className="mb-6 flex items-center gap-2 @3xl/shell:hidden">
          <SearchField
            inputRef={phoneSearchRef}
            value={query}
            onChange={setQuery}
            className="flex-1"
            dismissLabel={t`Clear search`}
            onDismiss={query ? () => setQuery("") : undefined}
            onKeyDown={(e) => {
              if (e.key === "Escape" && query) {
                e.preventDefault();
                setQuery("");
              }
            }}
          />
          {onCreateDeck && (
            <Button onClick={onCreateDeck}>
              <Plus data-icon="inline-start" aria-hidden="true" />
              <Trans>New deck</Trans>
            </Button>
          )}
        </div>
      )}

      {/* Always present, so a screen reader hears the count change as the search narrows Library. */}
      <p className="sr-only" aria-live="polite">
        {searching && (
          <Plural value={matches} _0="No decks match" one="# deck matches" other="# decks match" />
        )}
      </p>

      {noMatch && (
        <NoResults
          icon={<SearchX />}
          title={t`No decks match “${{ term: isolate(term) }}”`}
          detail={<Trans>Try a deck’s name, its language or its series.</Trans>}
          action={
            <Button onClick={() => setQuery("")}>
              <Trans>Clear search</Trans>
            </Button>
          }
        />
      )}

      {hasDecks && !noMatch && (
        <LibraryBoard
          loose={groups.loose}
          series={groups.series}
          // A search shows a slice of Library, so nothing moves until it is cleared.
          onSetSeriesDecks={st || searching ? undefined : onSetSeriesDecks}
          onRemoveFromSeries={st || searching ? undefined : onRemoveFromSeries}
          renderDeck={(d, describedBy) => (
            <DeckRow
              id={d.id}
              name={d.seriesId ? nameInSeries(d.name, seriesName.get(d.seriesId) ?? "") : d.name}
              language={d.defaultLanguage}
              due={d.due}
              total={d.total}
              next={next?.[d.id]}
              owner={d.role === "owner" ? null : d.owner.name}
              ownerLeft={d.role !== "owner" && d.owner.former === true}
              published={d.published}
              publisherPhoto={d.owner.avatarUrl}
              aria-describedby={describedBy}
              onOpen={opened}
            />
          )}
          renderSeriesHeader={seriesHeader}
          renderSeriesFoot={seriesReview}
          renderEmptySeries={emptySeries}
          looseTarget={
            <p className="flex min-h-[72px] w-full items-center justify-center rounded-xl border border-dashed border-edge-strong px-5 text-center text-sm text-ink-secondary">
              <Trans>Drop a deck here to take it out of its series.</Trans>
            </p>
          }
        />
      )}
    </Screen>
  );
}

interface SearchFieldProps {
  /** `sm` beside the title's icon buttons on a desktop; the phone's row takes the full 44 px control. */
  size?: "sm" | "md" | undefined;
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (value: string) => void;
  className?: string | undefined;
  /** The X inside the field. Absent, the field shows none. */
  onDismiss?: (() => void) | undefined;
  dismissLabel: string;
  onKeyDown?: ((e: KeyboardEvent<HTMLInputElement>) => void) | undefined;
  onBlur?: ((e: FocusEvent<HTMLInputElement>) => void) | undefined;
}

function SearchField({
  inputRef,
  size = "md",
  value,
  onChange,
  className,
  onDismiss,
  dismissLabel,
  onKeyDown,
  onBlur,
}: SearchFieldProps) {
  const { t } = useLingui();
  return (
    <div className={clsx("relative min-w-0", className)}>
      <Search
        className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
        aria-hidden="true"
      />
      <Input
        ref={inputRef}
        enterKeyHint="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        placeholder={t`Search decks`}
        aria-label={t`Search decks`}
        autoComplete="off"
        inputSize={size}
        className={clsx("ps-9", onDismiss && "pe-9")}
      />
      {onDismiss && (
        // IconButton positions itself, so the wrapper places it inside the field's end.
        <span className="absolute inset-y-0 end-1.5 flex items-center">
          <IconButton label={dismissLabel} size="xs" onClick={onDismiss}>
            <X aria-hidden="true" />
          </IconButton>
        </span>
      )}
    </div>
  );
}
