import { plural } from "@lingui/core/macro";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  FileUp,
  Layers,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { Button, IconButton } from "../components/button";
import { DeckCard } from "../components/deck-card";
import { DueCount } from "../components/due-count";
import { ErrorState } from "../components/empty-state";
import { Screen } from "../components/layout/screen";
import { LibraryBoard } from "../components/library-board";
import { Go } from "../components/next-steps";
import { Skeleton } from "../components/skeleton";
import { StartPanel, StartPanelSection } from "../components/start-panel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import type { DeckSummary, Series } from "../lib/api";
import { groupDecks } from "../lib/library-groups";
import type { StaticNav } from "./shell";

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
  onCreateDeck?: (() => void) | undefined;
  onImport?: (() => void) | undefined;
  onNewSeries?: (() => void) | undefined;
  onEditSeries?: ((series: Series) => void) | undefined;
  onDeleteSeries?: ((series: Series) => void) | undefined;
  /** Move a series one place up or down among the series. */
  onMoveSeries?: ((series: Series, by: -1 | 1) => void) | undefined;
  /** A series' whole deck list after a drag. Absent, decks cannot be dragged. */
  onSetSeriesDecks?: ((seriesId: string, deckIds: string[]) => void) | undefined;
  onRemoveFromSeries?: ((deckId: string) => void) | undefined;
  static?: StaticNav;
}

/**
 * Every deck, as a card: its name, whether it has cards due today, and its language and size.
 * Decks without a series come first, as they always have; each series follows under its own
 * heading, with its decks in order and a Review for all of them. Nothing else here reviews or
 * searches: Today owns the daily review, and a deck owns its own.
 */
export function LibraryView({
  decks,
  failed,
  onRetry,
  retrying,
  series,
  next,
  archivedCount,
  onCreateDeck,
  onImport,
  onNewSeries,
  onEditSeries,
  onDeleteSeries,
  onMoveSeries,
  onSetSeriesDecks,
  onRemoveFromSeries,
  static: st,
}: LibraryProps) {
  const { t } = useLingui();
  const total = decks?.reduce((n, d) => n + d.total, 0) ?? 0;
  const failedEmpty = failed === true && decks === undefined;
  const loading = decks === undefined && !failedEmpty;
  const groups = useMemo(() => groupDecks(decks ?? [], series), [decks, series]);

  const To = ({
    to,
    className,
    children,
  }: {
    to: "/archived";
    className?: string | undefined;
    children: ReactNode;
  }) =>
    st ? (
      <a href={to} onClick={(e) => e.preventDefault()} className={className}>
        {children}
      </a>
    ) : (
      <Link to={to} className={className}>
        {children}
      </Link>
    );

  // Quiet on purpose: making a deck or a series is occasional, and the decks are what Library is for.
  const libraryMenu = (onCreateDeck || onNewSeries || onImport) && (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <IconButton label={t`Library options`}>
            <MoreHorizontal aria-hidden="true" />
          </IconButton>
        }
      />
      <DropdownMenuContent aria-label={t`Library options`} align="end">
        {onCreateDeck && (
          <DropdownMenuItem onClick={onCreateDeck}>
            <Plus />
            <Trans>New deck</Trans>
          </DropdownMenuItem>
        )}
        {onNewSeries && (
          <DropdownMenuItem onClick={onNewSeries}>
            <Layers />
            <Trans>New series</Trans>
          </DropdownMenuItem>
        )}
        {onImport && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onImport}>
              <FileUp />
              <Trans>Import decks</Trans>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const seriesHeader = (s: Series, inSeries: DeckSummary[]) => {
    const index = groups.series.findIndex((g) => g.series.id === s.id);
    const cards = inSeries.reduce((n, d) => n + d.total, 0);
    const due = inSeries.reduce((n, d) => n + d.due, 0);
    const seriesName = s.name;
    const dueDecks = inSeries.filter((d) => d.due > 0).length;
    const bannerClass =
      "group flex min-h-12 w-full items-center gap-3 rounded-lg bg-plate-2 py-2 ps-3 pe-2 text-start transition-[background-color,scale] duration-150 active:scale-[0.99] hoverable:hover:bg-hover motion-reduce:active:scale-100";
    const banner = (
      <>
        <DueCount>{due}</DueCount>
        <span className="grid min-w-0 flex-1 gap-0.5 @2xl:flex @2xl:items-baseline @2xl:gap-2">
          <span className="truncate text-base font-medium">
            <Trans>Review this series</Trans>
          </span>
          <span className="truncate text-sm text-muted">
            {t`${plural(due, { one: "card due", other: "cards due" })} in ${plural(dueDecks, { one: "# deck", other: "# decks" })}`}
          </span>
        </span>
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-plate text-text transition-[background-color] duration-150">
          <ChevronRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        </span>
      </>
    );
    return (
      <>
        {/* The actions wrap under the name on a narrow phone rather than squeezing it. */}
        <div className="flex min-h-10 flex-wrap items-center gap-x-2 gap-y-2 px-1">
          <div className="grid min-w-0 flex-1 basis-40 gap-0.5">
            <h2 className="truncate text-lg font-medium tracking-[-0.01em]">{s.name}</h2>
            <p className="truncate text-sm text-muted tabular-nums">
              {t`${plural(inSeries.length, { one: "# deck", other: "# decks" })} · ${plural(cards, { one: "# card", other: "# cards" })}`}
            </p>
          </div>
          <div className="ms-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <IconButton label={t`Options for ${seriesName}`} size="sm">
                    <MoreHorizontal />
                  </IconButton>
                }
              />
              <DropdownMenuContent aria-label={t`Options for ${seriesName}`} align="end">
                <DropdownMenuItem onClick={() => onEditSeries?.(s)} disabled={!onEditSeries}>
                  <Pencil />
                  <Trans>Edit series</Trans>
                </DropdownMenuItem>
                {groups.series.length > 1 && (
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
                  variant="destructive"
                  onClick={() => onDeleteSeries?.(s)}
                  disabled={!onDeleteSeries}
                >
                  <Trash2 />
                  <Trans>Delete series</Trans>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {/* Sunk into a well, so it never reads as one more deck. */}
        {due > 0 &&
          (st ? (
            <a
              href={`/review?series=${s.id}`}
              onClick={(e) => e.preventDefault()}
              className={bannerClass}
            >
              {banner}
            </a>
          ) : (
            <Link to="/review" search={{ series: s.id }} className={bannerClass}>
              {banner}
            </Link>
          ))}
      </>
    );
  };

  const emptySeries = (s: Series) => (
    <div className="flex min-h-[72px] w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-dashed border-edge-2 px-4 py-3">
      <p className="max-w-sm text-sm text-text-2">
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

  return (
    <Screen
      kind="tab"
      title={t`Library`}
      sub={
        decks
          ? t`${plural(decks.length, { one: "# deck", other: "# decks" })} · ${plural(total, { one: "# card", other: "# cards" })}`
          : undefined
      }
      actions={decks ? libraryMenu : undefined}
    >
      {loading && (
        <div className="grid gap-3 @3xl:grid-cols-2">
          <Skeleton className="h-[118px] rounded-lg" />
          <Skeleton className="h-[118px] rounded-lg" />
          <Skeleton className="h-[118px] rounded-lg" />
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
          title={<Trans>No decks yet</Trans>}
          body={<Trans>Make one for each course or topic.</Trans>}
          action={
            <Button
              variant="primary"
              className="justify-self-start"
              onClick={onCreateDeck}
              aria-disabled={!onCreateDeck}
            >
              <Plus aria-hidden="true" />
              <Trans>New deck</Trans>
            </Button>
          }
        >
          {onImport && (
            <StartPanelSection>
              <button
                type="button"
                onClick={onImport}
                className="group -mx-2 flex min-h-16 w-[calc(100%+1rem)] items-center gap-4 rounded-lg px-2 py-2.5 text-start transition-[background-color] duration-150 hoverable:hover:bg-hover"
              >
                <span
                  className="edge-inset grid size-10 shrink-0 place-items-center rounded-full text-text-2 [&_svg]:size-[18px]"
                  aria-hidden="true"
                >
                  <FileUp />
                </span>
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="text-md font-medium">
                    <Trans>Import decks</Trans>
                  </span>
                  <span className="text-sm text-muted">
                    <Trans>Decks from Anki or Mochi, with their review history.</Trans>
                  </span>
                </span>
                <Go />
              </button>
            </StartPanelSection>
          )}
        </StartPanel>
      )}

      {decks && decks.length > 0 && (
        <LibraryBoard
          loose={groups.loose}
          series={groups.series}
          onSetSeriesDecks={st ? undefined : onSetSeriesDecks}
          onRemoveFromSeries={st ? undefined : onRemoveFromSeries}
          renderDeck={(d, describedBy) => (
            <DeckCard
              id={d.id}
              name={d.name}
              language={d.defaultLanguage}
              due={d.due}
              total={d.total}
              next={next?.[d.id]}
              owner={d.role === "owner" ? null : d.owner.name}
              published={d.published}
              publisherPhoto={d.owner.avatarUrl}
              describedBy={describedBy}
              st={st}
            />
          )}
          renderSeriesHeader={seriesHeader}
          renderEmptySeries={emptySeries}
          looseTrailer={
            <li className="flex min-w-0">
              {/* Dashed rather than amber: capture is the standing action, and a second amber
                  thing on the page would make the due counts read as buttons. */}
              <button
                type="button"
                onClick={onCreateDeck}
                aria-disabled={!onCreateDeck}
                className="flex min-h-[72px] w-full items-center justify-center gap-2 rounded-lg border border-dashed border-edge-2 text-base font-medium text-text-2 transition-[background-color,color,scale] duration-150 active:scale-[0.98] hoverable:hover:bg-plate hoverable:hover:text-text"
              >
                <Plus className="size-[18px]" aria-hidden="true" />
                <Trans>New deck</Trans>
              </button>
            </li>
          }
        />
      )}

      {archivedCount ? (
        <section className="mt-8">
          <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-[0.06em] text-muted">
            <Trans>Archived</Trans>
          </h2>
          <To
            to="/archived"
            className="edge flex items-center justify-between gap-3 rounded-lg bg-plate px-4 py-3.5 text-base transition-[background-color,box-shadow] duration-150 hoverable:hover:edge-2 hoverable:hover:bg-hover"
          >
            <span className="font-medium">
              <Plural value={archivedCount} one="# archived deck" other="# archived decks" />
            </span>
            <span className="flex items-center gap-1 text-sm text-muted">
              <Trans>Show</Trans>
              <ChevronRight className="size-4 text-faint" aria-hidden="true" />
            </span>
          </To>
        </section>
      ) : null}
    </Screen>
  );
}
