import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { writes } from "@lymi/client/writes";
import { isolate, standsAlone } from "@lymi/core";
import type { AnalyticsProperties, COMMAND_MENU_COMMANDS } from "@lymi/core/analytics";
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { clsx } from "clsx";
import {
  Archive,
  ArrowUpRight,
  BookMarked,
  ChartNoAxesColumn,
  Compass,
  CornerDownLeft,
  Download,
  History,
  Keyboard,
  Layers,
  type LucideIcon,
  Play,
  Plus,
  RectangleHorizontal,
  Search,
  Settings,
  Sparkles,
  Sun,
  SunMoon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PRIVATE_TEXT } from "@/lib/telemetry";
import type { CardHit, DeckSummary } from "../lib/api";
import { errorMessage } from "../lib/api";
import { bidi } from "../lib/bidi";
import { addInput, refreshAfterCardWrite } from "../lib/card-writes";
import { composing } from "../lib/composing";
import { modShortcut } from "../lib/device";
import { lastDeckId, rememberDeck } from "../lib/last-deck";
import { cardSearchQuery, cardTermQuery } from "../lib/queries";
import { shortQuote } from "../lib/short-quote";
import { captureAnalytics } from "../lib/telemetry";
import { toggleTheme } from "../lib/theme";
import { Kbd } from "./kbd";
import { ShortcutsDialog } from "./shortcuts-dialog";
import {
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandPalette,
  type RunKeys,
  useCommandList,
} from "./ui/command-palette";
import { toast } from "./ui/toast";

type CommandId = (typeof COMMAND_MENU_COMMANDS)[number];

interface Command {
  id: CommandId;
  kind: "place" | "action";
  title: MessageDescriptor;
  /** Other words it answers to, in the interface's language. */
  keywords?: MessageDescriptor;
  icon: LucideIcon;
  keys?: string;
}

const PLACES: Command[] = [
  { id: "today", kind: "place", title: msg`Today`, icon: Sun },
  {
    id: "library",
    kind: "place",
    title: msg`Library`,
    keywords: msg({
      message: "decks",
      comment: "Words, separated by spaces, that also find this command in the command menu",
    }),
    icon: BookMarked,
  },
  {
    id: "insights",
    kind: "place",
    title: msg`Insights`,
    keywords: msg({
      message: "progress stats",
      comment: "Words, separated by spaces, that also find this command in the command menu",
    }),
    icon: ChartNoAxesColumn,
  },
  {
    id: "explore",
    kind: "place",
    title: msg`Explore`,
    keywords: msg({
      message: "published decks",
      comment: "Words, separated by spaces, that also find this command in the command menu",
    }),
    icon: Compass,
  },
  {
    id: "settings",
    kind: "place",
    title: msg`Settings`,
    keywords: msg({
      message: "account goal",
      comment: "Words, separated by spaces, that also find this command in the command menu",
    }),
    icon: Settings,
  },
  {
    id: "activity",
    kind: "place",
    title: msg`Activity`,
    keywords: msg({
      message: "history changes",
      comment: "Words, separated by spaces, that also find this command in the command menu",
    }),
    icon: History,
  },
  {
    id: "archived",
    kind: "place",
    title: msg`Archived`,
    keywords: msg({
      message: "restore",
      comment: "Words, separated by spaces, that also find this command in the command menu",
    }),
    icon: Archive,
  },
];

const ACTIONS: Command[] = [
  {
    id: "add_card",
    kind: "action",
    title: msg`Add a card`,
    keywords: msg({
      message: "new card",
      comment: "Words, separated by spaces, that also find this command in the command menu",
    }),
    icon: Plus,
    keys: "N",
  },
  { id: "review", kind: "action", title: msg`Start review`, icon: Play, keys: "R" },
  {
    id: "smart_add",
    kind: "action",
    title: msg`Smart add`,
    keywords: msg({
      message: "lesson",
      comment: "Words, separated by spaces, that also find this command in the command menu",
    }),
    icon: Sparkles,
  },
  {
    id: "new_deck",
    kind: "action",
    title: msg`New deck`,
    keywords: msg({
      message: "create deck",
      comment: "Words, separated by spaces, that also find this command in the command menu",
    }),
    icon: Layers,
  },
  {
    id: "import",
    kind: "action",
    title: msg`Import cards`,
    keywords: msg({
      message: "anki quizlet pleco",
      comment: "Words, separated by spaces, that also find this command in the command menu",
    }),
    icon: Download,
  },
  {
    id: "theme",
    kind: "action",
    title: msg`Switch theme`,
    keywords: msg({
      message: "dark light",
      comment: "Words, separated by spaces, that also find this command in the command menu",
    }),
    icon: SunMoon,
  },
  {
    id: "shortcuts",
    kind: "action",
    title: msg`Keyboard shortcuts`,
    keywords: msg({
      message: "keys",
      comment: "Words, separated by spaces, that also find this command in the command menu",
    }),
    icon: Keyboard,
  },
];

const PLACE_PATHS = {
  today: "/today",
  library: "/library",
  insights: "/insights",
  explore: "/explore",
  settings: "/settings",
  activity: "/activity",
  archived: "/archived",
} as const;

type Row =
  | { kind: "command"; key: string; command: Command }
  | { kind: "deck"; key: string; deck: DeckSummary }
  | { kind: "card"; key: string; card: CardHit }
  | { kind: "add"; key: "add"; term: string; existing: CardHit | null };

const CARD_LIMIT = 6;
const NO_HITS: CardHit[] = [];
const SETTLE_MS = 150;
/** ⌘ on a Mac, Ctrl elsewhere, as the key hint shows it. */
const modKey = () => modShortcut("").trim();

/** Every word of the query appears somewhere in what the row is known by. */
function matches(knownBy: string, query: string, locale: string) {
  const hay = knownBy.toLocaleLowerCase(locale);
  return query
    .toLocaleLowerCase(locale)
    .split(/\s+/)
    .every((word) => hay.includes(word));
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  decks: DeckSummary[] | undefined;
  /** The deck on screen, which a quick add lands in when the learner owns it. */
  activeDeckId: string | undefined;
  onAddCard: (deckId: string | undefined, term?: string) => void;
  onCreateDeck: () => void;
  /** Left out when Smart add is not open to this learner. */
  onSmartAdd?: (() => void) | undefined;
}

/** ⌘K: find a card or deck, go to a place, run an action, or add the typed term. */
export function CommandMenu({
  open,
  onOpenChange,
  decks,
  activeDeckId,
  onAddCard,
  onCreateDeck,
  onSmartAdd,
}: Props) {
  const { t, i18n } = useLingui();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [raw, setRaw] = useState("");
  const [settled, setSettled] = useState("");
  const [adding, setAdding] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const query = raw.trim();

  useEffect(() => {
    const timer = setTimeout(() => setSettled(query), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // Each opening starts empty, on the first row.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) {
      setRaw("");
      setSettled("");
    }
  }

  const searchable = settled.length >= 2 || standsAlone(settled);
  const search = useInfiniteQuery({
    ...cardSearchQuery(settled),
    enabled: open && searchable,
    placeholderData: keepPreviousData,
  });
  const hits = (searchable && search.data?.pages[0]?.cards) || NO_HITS;

  const owned = useMemo(() => decks?.filter((d) => d.role === "owner") ?? [], [decks]);
  const target =
    owned.find((d) => d.id === activeDeckId) ??
    owned.find((d) => d.id === lastDeckId()) ??
    owned[0];

  const commands = useMemo(
    () => [...ACTIONS.filter((c) => c.id !== "smart_add" || onSmartAdd), ...PLACES],
    [onSmartAdd],
  );

  const groups = useMemo(() => {
    const out: { label: string | null; rows: Row[] }[] = [];
    const commandRow = (command: Command): Row => ({ kind: "command", key: command.id, command });
    const deckRow = (deck: DeckSummary): Row => ({ kind: "deck", key: `deck:${deck.id}`, deck });
    if (!query) {
      out.push({
        label: t`Actions`,
        rows: ACTIONS.slice(0, 4)
          .filter((c) => commands.includes(c))
          .map(commandRow),
      });
      out.push({ label: t`Go to`, rows: PLACES.map(commandRow) });
      if (decks?.length) out.push({ label: t`Decks`, rows: decks.map(deckRow) });
      return out;
    }
    const found = commands.filter((c) =>
      matches(`${i18n._(c.title)} ${c.keywords ? i18n._(c.keywords) : ""}`, query, i18n.locale),
    );
    if (found.length) out.push({ label: t`Commands`, rows: found.map(commandRow) });
    const namedDecks = decks?.filter((d) => matches(d.name, query, i18n.locale)) ?? [];
    if (namedDecks.length) out.push({ label: t`Decks`, rows: namedDecks.map(deckRow) });
    if (hits.length)
      out.push({
        label: t`Cards`,
        rows: hits
          .slice(0, CARD_LIMIT)
          .map((card) => ({ kind: "card", key: `card:${card.id}`, card })),
      });
    return out;
  }, [query, commands, decks, hits, t, i18n]);

  // A request paused offline or failed counts as landed: waiting on it would leave Enter doing nothing.
  const landed = (q: {
    fetchStatus: string;
    isError: boolean;
    isSuccess: boolean;
    isFetching: boolean;
  }) =>
    settled === query &&
    (q.fetchStatus === "paused" || q.isError || (q.isSuccess && !q.isFetching));
  const searched = landed(search) && !search.isPlaceholderData;
  // Whether the term is already in the target deck, asked of the server exactly as the duplicate rule compares it.
  const termCheck = useQuery({
    ...cardTermQuery(target?.id ?? "", settled),
    enabled: open && !!target && standsAlone(settled),
  });
  const checked = !target || landed(termCheck);
  // Enter or ⌘Enter on the add bar before the check lands, held until it does.
  const [held, setHeld] = useState<RunKeys | null>(null);
  const existing = (checked && termCheck.data) || null;
  const addRow: Row | null = useMemo(
    () => (standsAlone(query) ? { kind: "add", key: "add", term: query, existing } : null),
    [query, existing],
  );

  const rows = useMemo(
    () => [...groups.flatMap((g) => g.rows), ...(addRow ? [addRow] : [])],
    [groups, addRow],
  );

  const close = () => onOpenChange(false);
  const track = (props: AnalyticsProperties<"command_menu_run">) =>
    captureAnalytics("command_menu_run", props);

  // Also run from a toast after the menu stayed open for the next add, so it closes here too.
  const openCard = (card: { id: string; deckId: string }) => {
    close();
    return navigate({
      to: "/library/$deckId",
      params: { deckId: card.deckId },
      search: { card: card.id },
    });
  };

  function runCommand(command: Command) {
    close();
    track({ kind: command.kind, command: command.id, typed: !!query });
    if (command.kind === "place") {
      navigate({ to: PLACE_PATHS[command.id as keyof typeof PLACE_PATHS] });
      return;
    }
    switch (command.id) {
      case "add_card":
        return onAddCard(activeDeckId);
      case "review":
        return navigate({ to: "/review" });
      case "smart_add":
        return onSmartAdd?.();
      case "new_deck":
        return onCreateDeck();
      case "import":
        return navigate({ to: "/import" });
      case "theme":
        return toggleTheme();
      case "shortcuts":
        return setShortcuts(true);
    }
  }

  async function addNow(term: string) {
    if (adding) return;
    if (!target) {
      // No deck of their own yet: the sheet offers to make one.
      close();
      onAddCard(undefined, term);
      return;
    }
    setAdding(true);
    try {
      const { outcome, queued } = await writes.addCard(addInput({ deckId: target.id, term }));
      track({ kind: "add", add: outcome.status === "skipped" ? "existing" : "now", typed: true });
      const quoted = shortQuote(term);
      if (outcome.status === "skipped") {
        const card = outcome.existing;
        toast.add({
          title: t`“${{ quoted: isolate(quoted) }}” is already in ${isolate(outcome.deckName)}`,
          actionProps: { children: t`Open`, onClick: () => openCard(card) },
        });
        return;
      }
      rememberDeck(target.id);
      // Only the term that was sent, so a next one typed while it was adding stays.
      setRaw((current) => (current.trim() === term ? "" : current));
      await refreshAfterCardWrite(qc);
      const card = outcome.card;
      const deckName = target.name;
      toast.add({
        title: queued
          ? t`Added “${{ quoted: isolate(quoted) }}” to ${{ deckName: isolate(deckName) }}. It’s saved on this device until Lymi can be reached.`
          : t`Added “${{ quoted: isolate(quoted) }}” to ${{ deckName: isolate(deckName) }}`,
        ...(queued ? {} : { actionProps: { children: t`Open`, onClick: () => openCard(card) } }),
      });
    } catch (e) {
      toast.add({ title: errorMessage(e), type: "error" });
    } finally {
      setAdding(false);
    }
  }

  function run(row: Row, { mod }: RunKeys) {
    if (row.kind === "command") return runCommand(row.command);
    if (row.kind === "deck") {
      close();
      track({ kind: "deck", ...(mod ? { command: "review_deck" as const } : {}), typed: !!query });
      if (mod) return navigate({ to: "/review", search: { deck: row.deck.id } });
      return navigate({ to: "/library/$deckId", params: { deckId: row.deck.id } });
    }
    if (row.kind === "card") {
      close();
      track({ kind: "card", typed: true });
      return openCard(row.card);
    }
    if (!checked) {
      // A second Enter while the first waits is the same request, not a new one.
      setHeld((current) => current ?? { mod });
      return;
    }
    if (row.existing) {
      close();
      track({ kind: "add", add: "existing", typed: true });
      return openCard(row.existing);
    }
    if (mod) return void addNow(row.term);
    close();
    track({ kind: "add", add: "form", typed: true });
    onAddCard(target?.id, row.term);
  }

  useEffect(() => {
    if (!held || !checked || !addRow) return;
    setHeld(null);
    run(addRow, held);
  });

  const list = useCommandList({ items: rows, onRun: run });
  const { reset } = list;
  useEffect(() => {
    if (open) reset();
  }, [open, reset]);
  // ⌘Enter adds from any row but a deck's, whose second action is reviewing it.
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const active = rows[list.active];
    if (
      e.key === "Enter" &&
      (e.metaKey || e.ctrlKey) &&
      addRow &&
      active?.kind !== "deck" &&
      !composing(e)
    ) {
      e.preventDefault();
      run(addRow, { mod: true });
      return;
    }
    list.inputProps.onKeyDown(e);
  };

  let index = 0;
  const activeRow = rows[list.active];

  return (
    <>
      <CommandPalette open={open} onOpenChange={onOpenChange} label={t`Command menu`}>
        <CommandInput
          {...list.inputProps}
          onKeyDown={onKeyDown}
          lead={<Search className="size-5" />}
          trail={<Kbd className="max-sm:hidden">esc</Kbd>}
          aria-label={t`Search cards, decks and commands`}
          placeholder={t`Search cards, decks and commands`}
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value);
            setHeld(null);
            reset();
          }}
        />
        <CommandList
          {...list.listProps}
          aria-label={t`Results`}
          pinned={
            addRow && (
              <AddBar
                row={addRow}
                deckName={target?.name}
                adding={adding}
                checking={!checked}
                waiting={!!held}
                {...list.optionProps(rows.length - 1)}
              />
            )
          }
        >
          {groups.map((group) => (
            <CommandGroup key={group.label ?? "rows"} label={group.label}>
              {group.rows.map((row) => {
                const i = index++;
                return (
                  <CommandItem
                    key={row.key}
                    {...list.optionProps(i)}
                    // Cards for the previous text, kept so the list doesn't jump, fade until this text's arrive.
                    className={row.kind === "card" && !searched ? "opacity-60" : undefined}
                  >
                    <RowBody row={row} active={activeRow === row} />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
          {groups.length === 0 && !addRow && (!searchable || searched) && (
            <CommandEmpty>{bidi(t`Nothing matches “${isolate(shortQuote(query))}”`)}</CommandEmpty>
          )}
        </CommandList>
      </CommandPalette>
      <ShortcutsDialog open={shortcuts} onClose={() => setShortcuts(false)} />
    </>
  );
}

function RowBody({ row, active }: { row: Row; active: boolean }) {
  const { t, i18n } = useLingui();
  if (row.kind === "command") {
    const Icon = row.command.icon;
    return (
      <>
        <Icon className="size-4 text-text" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{i18n._(row.command.title)}</span>
        {row.command.keys && <Kbd>{row.command.keys}</Kbd>}
      </>
    );
  }
  if (row.kind === "deck") {
    return (
      <>
        <Layers className="size-4 text-text" aria-hidden="true" />
        <span dir="auto" className="min-w-0 flex-1 truncate">
          {row.deck.name}
        </span>
        {active ? (
          <span className="flex shrink-0 items-center gap-1 text-sm text-muted">
            <Kbd>{modKey()}</Kbd>
            <Kbd>
              <CornerDownLeft className="size-3" aria-hidden="true" />
            </Kbd>
            {t`Review`}
          </span>
        ) : (
          <span className="shrink-0 text-sm text-muted tabular-nums">
            {row.deck.due > 0 ? t`${i18n.number(row.deck.due)} due` : null}
          </span>
        )}
      </>
    );
  }
  if (row.kind === "card") {
    return (
      <>
        <RectangleHorizontal className="size-4 text-text" aria-hidden="true" />
        <span className={clsx(PRIVATE_TEXT, "min-w-0 flex-1 truncate")}>
          <bdi className="font-medium">{row.card.term}</bdi>
          {row.card.meaning && (
            <span className="text-muted">
              {" · "}
              <bdi>{row.card.meaning}</bdi>
            </span>
          )}
        </span>
        <span className="max-w-[40%] shrink-0 truncate text-sm text-muted">
          {row.card.deckName}
        </span>
      </>
    );
  }
  return null;
}

interface AddBarProps extends React.ComponentProps<"div"> {
  row: Extract<Row, { kind: "add" }>;
  deckName: string | undefined;
  adding: boolean;
  /** The deck isn't yet known to lack this term, so the bar promises nothing. */
  checking: boolean;
  /** An Enter is held until that check lands. */
  waiting: boolean;
}

/** Layout C: the typed term, pinned under the results, one ⌘Enter from being a card. */
function AddBar({ row, deckName, adding, checking, waiting, ...option }: AddBarProps) {
  const { t } = useLingui();
  const term = row.term;
  return (
    <div
      {...option}
      className="flex min-h-14 shrink-0 cursor-default items-center gap-3 border-edge bg-plate-2 not-first:border-t px-4 py-2.5 data-active:bg-hover"
    >
      {row.existing ? (
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-plate text-text edge">
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </span>
      ) : checking ? (
        // Amber only once the deck is known to lack the term: until then it may still be an Open.
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-plate text-muted edge">
          <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
        </span>
      ) : (
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-amber text-amber-ink">
          <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
        </span>
      )}
      <span className="flex min-w-0 flex-1 text-base">
        {row.existing ? (
          <span className="truncate text-text">
            {bidi(
              t`Open “${isolate(shortQuote(row.existing.term))}” in ${isolate(row.existing.deckName)}`,
            )}
          </span>
        ) : deckName ? (
          // A long term gives way first: the deck is where the card lands.
          <>
            <span className={clsx(PRIVATE_TEXT, "min-w-0 truncate font-medium text-text")}>
              {term}
            </span>
            {!checking && (
              <span className="max-w-[60%] shrink-0 truncate ps-1.5 text-muted">→ {deckName}</span>
            )}
          </>
        ) : (
          <span className="truncate text-text">{bidi(t`Add “${isolate(shortQuote(term))}”`)}</span>
        )}
      </span>
      {!row.existing && deckName && (
        <span className="flex shrink-0 items-center gap-1.5 text-sm text-muted">
          {adding ? (
            t`Adding…`
          ) : waiting ? (
            t`Checking…`
          ) : checking ? null : (
            <>
              <Kbd>{modKey()}</Kbd>
              <Kbd>
                <CornerDownLeft className="size-3" aria-hidden="true" />
              </Kbd>
              <span className="max-sm:hidden">{t`Add now`}</span>
            </>
          )}
        </span>
      )}
    </div>
  );
}
