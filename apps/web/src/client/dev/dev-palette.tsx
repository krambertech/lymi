import {
  commandCount,
  commandTitle,
  type DevCommandSummary,
  matchesQuery,
  parsePaletteQuery,
} from "@lymi/client/dev-palette";
import type { AppLanguage } from "@lymi/core";
import { type UseQueryResult, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eraser,
  Languages,
  Link,
  type LucideIcon,
  Mail,
  Palette as PaletteIcon,
  PenLine,
  Play,
  Plug,
  RefreshCw,
  RotateCcw,
  SunMoon,
  Target,
  TrendingDown,
  UserRound,
  Users,
} from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import {
  CommandEmpty,
  CommandFooter,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandPalette,
  useCommandList,
} from "../components/ui/command-palette";
import { api } from "../lib/api";
import { clearPersistedLearnerState } from "../lib/persisted";
import { getTheme, setTheme, type ThemeChoice } from "../lib/theme";
import { type DevState, devApi, type PersonaSummary } from "./dev-api";
import { PersonaAvatar } from "./persona-avatar";

const RECENT_KEY = "lymi-dev-recent";
const LANGUAGES: { value: AppLanguage; label: string; keywords: string }[] = [
  { value: "en", label: "English", keywords: "english" },
  { value: "uk", label: "Українська", keywords: "ukrainian" },
  { value: "ru", label: "Русский", keywords: "russian" },
];
const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];
const ICONS: Record<string, LucideIcon> = {
  claude: Plug,
  enrich: PenLine,
  forget: RotateCcw,
  slip: TrendingDown,
  goal: Target,
  due: Clock,
  owner: Users,
  reseed: RefreshCw,
  reset: Eraser,
};

const GROUP_ORDER = ["Start", "Everyday", "Languages", "Scale and edges", "Together"];
const byGroup = (a: PersonaSummary, b: PersonaSummary) =>
  GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group);

type Page = "persona" | "language" | "theme";
const PAGE_TITLES: Record<Page, string> = {
  persona: "Persona",
  language: "Language",
  theme: "Theme",
};

type Row = { key: string; group: string; title: string; detail?: string | undefined } & (
  | { kind: "command"; command: DevCommandSummary; count: number | null }
  | { kind: "persona"; persona: PersonaSummary }
  | { kind: "page"; page: Page; icon: LucideIcon }
  | { kind: "action"; icon: LucideIcon | null; checked?: boolean; run: () => void }
);

/** The last commands run, with the count each ran with, so Recent repeats exactly that. */
type Recent = { id: string; count: number | null };

function readRecent(): Recent[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is Recent =>
        typeof r?.id === "string" && (typeof r.count === "number" || r.count === null),
    );
  } catch {
    return [];
  }
}
function writeRecent(recent: Recent[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  } catch {}
}

const COMPACT = "(max-width: 767px), (pointer: coarse)";
function subscribeCompact(onChange: () => void) {
  const media = window.matchMedia(COMPACT);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
/** A phone or a touch screen: the palette fills the screen and waits for a tap before the keyboard. */
function useCompact() {
  return useSyncExternalStore(subscribeCompact, () => window.matchMedia(COMPACT).matches);
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personas: PersonaSummary[];
  personasFailed: boolean;
  state: UseQueryResult<DevState>;
  signedOut: boolean;
}

export function DevPalette({ open, onOpenChange, ...props }: Props) {
  const compact = useCompact();
  return (
    <CommandPalette
      open={open}
      onOpenChange={onOpenChange}
      label="Developer tools"
      skin="dev"
      compact={compact}
    >
      {/* Mounted with each opening, so every one starts on the first page with an empty field. */}
      <Body {...props} compact={compact} onClose={() => onOpenChange(false)} />
    </CommandPalette>
  );
}

function Body({
  onClose,
  compact,
  personasFailed,
  state,
  signedOut,
  ...props
}: Omit<Props, "open" | "onOpenChange"> & { onClose: () => void; compact: boolean }) {
  const personas = [...props.personas].sort(byGroup);
  const queryClient = useQueryClient();
  const [page, setPage] = useState<Page | null>(null);
  const [raw, setRaw] = useState("");
  // A command that throws data away runs on its second press, so a stray Enter never empties an account.
  const [confirming, setConfirming] = useState<{
    key: string;
    title: string;
    at: number;
  } | null>(null);
  const [theme, setThemeState] = useState<ThemeChoice>(getTheme);
  const [recent, setRecent] = useState(readRecent);
  const [note, setNote] = useState<{ text: string; tone: "muted" | "danger" } | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  const current = state.data?.persona ?? null;
  const language = state.data?.settings.appLanguage ?? "en";

  const commands = useQuery({
    queryKey: ["dev", "commands"],
    queryFn: devApi.commands,
    enabled: !signedOut,
    staleTime: 0,
    retry: false,
  });

  function failed(err: unknown) {
    setNote({
      text: err instanceof Error ? err.message : "That did not go through",
      tone: "danger",
    });
  }
  // Something on the screen behind changed, so every query the screen holds is stale.
  async function landed(text: string) {
    setNote({ text, tone: "muted" });
    await queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "dev" });
    await Promise.all([state.refetch(), commands.refetch()]);
  }

  const run = useMutation({
    mutationFn: ({
      command,
      count,
    }: {
      key: string;
      command: DevCommandSummary;
      count: number | null;
    }) => devApi.run(command.id, count ?? undefined),
    onSuccess: async ({ note: text }, { command, count }) => {
      if (!command.confirm) {
        const next = [{ id: command.id, count }, ...recent.filter((r) => r.id !== command.id)];
        setRecent(next.slice(0, 3));
        writeRecent(next.slice(0, 3));
      }
      await landed(text);
    },
    onError: failed,
  });
  const saveLanguage = useMutation({
    mutationFn: (appLanguage: AppLanguage) => api.updateSettings({ appLanguage }),
    onSuccess: async (s) => {
      const label = LANGUAGES.find((l) => l.value === s.appLanguage)?.label ?? s.appLanguage;
      await landed(`Interface and meanings in ${label}.`);
    },
    onError: failed,
  });

  function become(id: string) {
    setSwitching(id);
    clearPersistedLearnerState();
    queryClient.clear();
    const { pathname, search } = window.location;
    const returnTo = pathname === "/login" ? "/today" : `${pathname}${search}`;
    const landing = props.personas.find((p) => p.id === id)?.landing;
    window.location.assign(devApi.signInUrl(id, landing ? undefined : returnTo));
  }

  const query = parsePaletteQuery(raw);
  const searching = query.text !== "" || query.count !== null;

  const rows = ((): Row[] => {
    const list = commands.data?.commands ?? [];
    const commandRow = (
      command: DevCommandSummary,
      group: string,
      key = command.id,
      count = commandCount(command, query),
    ): Row => {
      return { kind: "command", key, group, command, count, title: commandTitle(command, count) };
    };
    const personaRows = personas.map<Row>((p) => ({
      kind: "persona",
      key: `as-${p.id}`,
      group: p.group,
      persona: p,
      title: searching ? `Become ${p.name}` : p.name,
      detail: p.description,
    }));
    const languageRows = LANGUAGES.map<Row>((l) => ({
      kind: "action",
      key: `language-${l.value}`,
      group: "Language",
      title: searching ? `Language: ${l.label}` : l.label,
      icon: searching ? Languages : null,
      checked: l.value === language,
      run: () => saveLanguage.mutate(l.value),
    }));
    const themeRows = THEMES.map<Row>((t) => ({
      kind: "action",
      key: `theme-${t.value}`,
      group: "Theme",
      title: searching ? `Theme: ${t.label}` : t.label,
      icon: searching ? SunMoon : null,
      checked: t.value === theme,
      run: () => {
        setTheme(t.value);
        setThemeState(t.value);
        setNote({ text: `Theme: ${t.label}.`, tone: "muted" });
        setPage(null);
      },
    }));
    const open = (title: string, path: string, icon: LucideIcon): Row => ({
      kind: "action",
      key: `open-${path}`,
      group: "Open",
      title,
      detail: path,
      icon,
      run: () => window.location.assign(path),
    });
    const linkRows: Row[] = [
      {
        kind: "action",
        key: "copy-link",
        group: "Open",
        title: "Copy sign-in link to this screen",
        detail: current ? `As ${current.name}` : undefined,
        icon: Link,
        run: () => {
          const { origin, pathname, search } = window.location;
          const link = `${origin}${devApi.signInUrl(current?.id ?? "learner", `${pathname}${search}`)}`;
          navigator.clipboard.writeText(link).then(
            () => setNote({ text: "Copied the sign-in link.", tone: "muted" }),
            () => setNote({ text: link, tone: "muted" }),
          );
        },
      },
      open("Design system", "/design", PaletteIcon),
      open("Emails", "/emails", Mail),
      open("API docs", "/api/docs", BookOpen),
    ];

    const switchPage: Row = {
      kind: "page",
      key: "page-persona",
      group: "Account",
      page: "persona",
      icon: UserRound,
      title: "Switch persona",
      detail: current?.name,
    };
    if (page === "persona") return personaRows;
    if (page === "language") return languageRows;
    if (page === "theme") return themeRows;
    if (searching) {
      return [
        ...list.map((c) => commandRow(c, c.group)),
        switchPage,
        ...personaRows,
        ...languageRows,
        ...themeRows,
        ...linkRows,
      ];
    }
    const recentRows = recent.flatMap(({ id, count }) => {
      const command = list.find((c) => c.id === id && !c.confirm);
      return command ? [commandRow(command, "Recent", `recent-${id}`, count)] : [];
    });
    return [
      ...recentRows,
      ...list.filter((c) => c.group === "Simulate").map((c) => commandRow(c, c.group)),
      // A phone shows the faces above the list instead.
      ...(compact ? [] : [switchPage]),
      ...list.filter((c) => c.group !== "Simulate").map((c) => commandRow(c, c.group)),
      {
        kind: "page",
        key: "page-language",
        group: "View",
        page: "language",
        icon: Languages,
        title: "Language",
        detail: LANGUAGES.find((l) => l.value === language)?.label,
      },
      {
        kind: "page",
        key: "page-theme",
        group: "View",
        page: "theme",
        icon: SunMoon,
        title: "Theme",
        detail: THEMES.find((t) => t.value === theme)?.label,
      },
      ...linkRows,
    ];
  })();

  const shown = searching
    ? rows.filter((r) => {
        const extra =
          r.kind === "command"
            ? `${r.command.keywords} ${r.command.id}`
            : r.kind === "persona"
              ? `${r.persona.id} ${r.persona.group}`
              : r.kind === "action" && r.key.startsWith("language-")
                ? (LANGUAGES.find((l) => `language-${l.value}` === r.key)?.keywords ?? "")
                : "";
        return matchesQuery(`${r.title} ${extra}`, query.text);
      })
    : rows;

  function back() {
    setPage(null);
    setRaw("");
    list.reset();
  }

  const list = useCommandList({
    items: shown,
    onRun: (row) => activate(row),
    // Escape empties the field first, then leaves the page; Backspace in an empty field leaves it too.
    onBack: raw ? () => setRaw("") : page ? back : undefined,
    compact,
  });
  // Moving off a row that waits for its second press disarms it, and its prompt leaves the footer with it.
  if (confirming && confirming.at !== list.active) setConfirming(null);
  const status: typeof note = confirming
    ? { text: `Press again to confirm: ${confirming.title}.`, tone: "danger" }
    : note;

  function activate(row: Row) {
    if (row.kind === "page") {
      setPage(row.page);
      setRaw("");
      list.reset();
      return;
    }
    if (row.kind === "persona") {
      if (row.persona.id !== current?.id) become(row.persona.id);
      return;
    }
    if (row.kind === "action") {
      row.run();
      if (row.key.startsWith("language-")) setPage(null);
      return;
    }
    if (row.command.blocked) {
      setNote({ text: row.command.blocked, tone: "muted" });
      return;
    }
    if (run.isPending) return;
    if (row.command.confirm && confirming?.key !== row.key) {
      setConfirming({ key: row.key, title: row.title, at: list.active });
      setNote(null);
      return;
    }
    setConfirming(null);
    run.mutate({ key: row.key, command: row.command, count: row.count });
    setRaw("");
    list.reset();
  }

  const c = state.data?.counts;
  // Consecutive rows that share a group sit under one heading and keep their place in `shown`.
  const groups: { name: string; rows: { row: Row; i: number }[] }[] = [];
  shown.forEach((row, i) => {
    const last = groups.at(-1);
    if (last?.name === row.group) last.rows.push({ row, i });
    else groups.push({ name: row.group, rows: [{ row, i }] });
  });

  const faces = compact && !page && !searching && personas.length > 0 && (
    <fieldset aria-label="Become a persona" className="m-0 min-w-0 border-0 px-4 pt-3 pb-1">
      <p className="pb-2 font-mono text-2xs tracking-wider text-ink-muted uppercase">Become</p>
      <div className="grid grid-cols-6 gap-2.5">
        {personas.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-label={`Become ${p.name}, ${p.id}. ${p.description}`}
            aria-current={p.id === current?.id || undefined}
            disabled={switching !== null}
            onClick={() => {
              if (p.id !== current?.id) become(p.id);
            }}
            className={clsx(
              "aspect-square rounded-full disabled:opacity-60",
              (p.id === current?.id || switching === p.id) &&
                "ring-2 ring-amber ring-offset-2 ring-offset-plate",
            )}
          >
            <PersonaAvatar id={p.id} name={p.name} className="size-full text-sm" />
          </button>
        ))}
      </div>
    </fieldset>
  );

  const results = (
    <CommandList {...list.listProps} aria-label="Developer commands" className="p-1.5">
      {groups.map((g) => (
        <CommandGroup key={g.name} label={g.name}>
          {g.rows.map(({ row, i }) => {
            const blocked = row.kind === "command" ? row.command.blocked : null;
            const working = run.isPending && run.variables?.key === row.key;
            const Icon =
              row.kind === "command"
                ? (ICONS[row.command.id] ?? Play)
                : row.kind === "page"
                  ? row.icon
                  : row.kind === "action"
                    ? row.checked
                      ? Check
                      : row.icon
                    : null;
            return (
              <CommandItem
                key={row.key}
                {...list.optionProps(i)}
                aria-disabled={blocked ? true : undefined}
                className={clsx("gap-3 text-sm", blocked && "text-ink-faint")}
              >
                <span className="grid size-6 shrink-0 place-items-center text-ink-muted">
                  {row.kind === "persona" ? (
                    <PersonaAvatar
                      id={row.persona.id}
                      name={row.persona.name}
                      className="size-6 text-xs"
                    />
                  ) : (
                    Icon && <Icon className="size-4" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="truncate">{row.title}</span>
                    {row.kind === "persona" && row.persona.id === current?.id && (
                      <span className="text-xs text-amber">You</span>
                    )}
                  </span>
                  {row.detail && (
                    <span
                      className={clsx(
                        "block text-xs leading-snug text-ink-muted",
                        !compact && "truncate",
                      )}
                    >
                      {row.detail}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-xs text-ink-muted">
                  {working
                    ? "Working…"
                    : (blocked ??
                      (row.kind === "page" ? (
                        <ChevronRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                      ) : confirming?.key === row.key ? (
                        <span className="text-danger">Press again</span>
                      ) : switching && row.kind === "persona" && switching === row.persona.id ? (
                        "Switching…"
                      ) : row.kind === "command" ? (
                        <span className="font-mono text-ink-faint">{row.command.id}</span>
                      ) : row.kind === "persona" ? (
                        <span className="font-mono text-ink-faint">{row.persona.id}</span>
                      ) : null))}
                </span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      ))}
      {shown.length === 0 && (
        <CommandEmpty className="text-sm">
          {commands.isPending && !personas.length ? "Loading…" : `Nothing matches "${raw}".`}
        </CommandEmpty>
      )}
    </CommandList>
  );

  return (
    <>
      {compact && (
        <header className="grid grid-cols-[1fr_auto_1fr] items-center px-2 pt-2">
          {page ? (
            <button
              type="button"
              onClick={back}
              className="flex h-11 items-center gap-0.5 justify-self-start px-2 text-amber"
            >
              <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden="true" />
              Back
            </button>
          ) : (
            <span />
          )}
          <h2 className="text-base font-medium">{page ? PAGE_TITLES[page] : "Developer tools"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="h-11 justify-self-end px-3 font-medium text-amber"
          >
            Done
          </button>
        </header>
      )}

      <CommandInput
        {...list.inputProps}
        lead={
          <span className="flex items-center gap-2">
            {page && !compact && (
              <span className="rounded-sm bg-plate-nested px-1.5 py-0.5 font-mono text-xs text-ink-secondary">
                {page}
              </span>
            )}
            <span className="font-mono text-amber">›</span>
          </span>
        }
        aria-label={page ? `Filter ${PAGE_TITLES[page]}` : "Search developer tools"}
        value={raw}
        placeholder={page ? "filter" : "command, persona, or due 12"}
        onChange={(e) => {
          setRaw(e.target.value);
          setConfirming(null);
          list.reset();
        }}
      />

      {!page && !searching && (
        <div className="flex shrink-0 items-center gap-3 border-b border-edge px-4 py-3">
          {current || state.data ? (
            <>
              <PersonaAvatar
                id={current?.id}
                name={current?.name ?? state.data?.user.email}
                className="size-9 shrink-0 text-sm"
              />
              <div className="min-w-0">
                <p className="flex items-baseline gap-2">
                  <span className="truncate font-medium">
                    {current?.name ?? state.data?.user.email}
                  </span>
                  <span className="font-mono text-xs text-ink-muted">
                    {current?.id ?? "real account"}
                  </span>
                </p>
                {c && (
                  <p className="font-mono text-xs text-ink-secondary">
                    {c.cards.toLocaleString("en")} cards · {c.due.toLocaleString("en")} due ·{" "}
                    {c.reviews.toLocaleString("en")} reviews
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-secondary">
              {signedOut ? "Signed out. Pick a persona to sign in as them." : "Loading…"}
            </p>
          )}
        </div>
      )}

      {faces ? (
        // The faces scroll away with the rows, outside the listbox they can't belong to.
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {faces}
          {results}
        </div>
      ) : (
        results
      )}

      <CommandFooter>
        <p
          role="status"
          className={clsx(
            "min-w-0 flex-1",
            status?.tone === "danger" ? "text-danger" : "text-ink-secondary",
          )}
        >
          {status?.text ??
            (personasFailed || commands.isError ? "Developer tools are unavailable." : "")}
        </p>
        {!compact && (
          <p className="flex shrink-0 gap-3 text-ink-muted">
            <span>
              <Kbd>↵</Kbd> run
            </span>
            <span>
              <Kbd>esc</Kbd> {page ? "back" : "close"}
            </span>
          </p>
        )}
      </CommandFooter>
    </>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-sm bg-plate-nested px-1 font-mono text-2xs text-ink-secondary">
      {children}
    </kbd>
  );
}
