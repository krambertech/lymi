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
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
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
  member: Users,
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
  ref: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  personas: PersonaSummary[];
  personasFailed: boolean;
  state: UseQueryResult<DevState>;
  signedOut: boolean;
}

export function DevPalette({
  ref,
  open,
  onClose,
  personasFailed,
  state,
  signedOut,
  ...props
}: Props) {
  const personas = [...props.personas].sort(byGroup);
  const queryClient = useQueryClient();
  const compact = useCompact();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState<Page | null>(null);
  const [raw, setRaw] = useState("");
  const [selected, setSelected] = useState(0);
  const [theme, setThemeState] = useState<ThemeChoice>(getTheme);
  const [recent, setRecent] = useState(readRecent);
  const [note, setNote] = useState<{ text: string; tone: "muted" | "danger" } | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  const current = state.data?.persona ?? null;
  const language = state.data?.settings.appLanguage ?? "en";

  const commands = useQuery({
    queryKey: ["dev", "commands"],
    queryFn: devApi.commands,
    enabled: open && !signedOut,
    staleTime: 0,
    retry: false,
  });

  useEffect(() => {
    if (!open) return;
    setPage(null);
    setRaw("");
    setSelected(0);
    if (!compact) inputRef.current?.focus({ preventScroll: true });
  }, [open, compact]);

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
      const next = [{ id: command.id, count }, ...recent.filter((r) => r.id !== command.id)].slice(
        0,
        3,
      );
      setRecent(next);
      writeRecent(next);
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
    window.location.assign(devApi.signInUrl(id, returnTo));
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
      const command = list.find((c) => c.id === id);
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
  const active = Math.min(selected, Math.max(0, shown.length - 1));

  function activate(row: Row | undefined) {
    if (!row) return;
    if (row.kind === "page") {
      setPage(row.page);
      setRaw("");
      setSelected(0);
      if (!compact) inputRef.current?.focus();
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
    run.mutate({ key: row.key, command: row.command, count: row.count });
    setRaw("");
    setSelected(0);
  }

  function back() {
    setPage(null);
    setRaw("");
    setSelected(0);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!shown.length) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setSelected((active + step + shown.length) % shown.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      activate(shown[active]);
    } else if (e.key === "Escape" && (page || raw)) {
      // Stop here so the shell does not close the palette as well.
      e.preventDefault();
      e.stopPropagation();
      if (raw) setRaw("");
      else back();
    } else if (e.key === "Backspace" && !raw && page) {
      e.preventDefault();
      back();
    } else if (e.key === "`" && !raw) {
      e.preventDefault();
      onClose();
    }
  }

  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);

  const c = state.data?.counts;
  let group = "";

  return (
    <>
      {open && !compact && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-(--z-backdrop) bg-scrim backdrop-blur-sm"
        />
      )}
      <section
        ref={ref}
        id="dev-panel"
        tabIndex={-1}
        inert={!open}
        role="dialog"
        aria-label="Developer tools"
        className={clsx(
          "fixed z-(--z-sheet) flex flex-col bg-plate text-text outline-none",
          compact
            ? "inset-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
            : "inset-x-0 top-[12vh] mx-auto max-h-[min(560px,76dvh)] w-[min(600px,calc(100vw-32px))] overflow-hidden rounded-lg edge-2 shadow-[0_24px_64px_var(--scrim)]",
          !open && "hidden",
        )}
      >
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
            <h2 className="text-base font-medium">
              {page ? PAGE_TITLES[page] : "Developer tools"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="h-11 justify-self-end px-3 font-medium text-amber"
            >
              Done
            </button>
          </header>
        )}

        <div
          className={clsx(
            "flex shrink-0 items-center gap-2",
            compact
              ? "mx-4 my-2 h-11 rounded-lg bg-plate-2 px-3"
              : "h-14 border-b border-edge px-4",
          )}
        >
          {page && !compact && (
            <span className="shrink-0 rounded-sm bg-plate-2 px-1.5 py-0.5 font-mono text-xs text-text-2">
              {page}
            </span>
          )}
          <span aria-hidden="true" className="shrink-0 font-mono text-amber">
            ›
          </span>
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={!compact && shown.length ? `${listId}-${active}` : undefined}
            aria-autocomplete="list"
            aria-label="Search developer tools"
            autoComplete="off"
            spellCheck={false}
            value={raw}
            placeholder={page ? "filter" : "command, persona, or due 12"}
            onChange={(e) => {
              setRaw(e.target.value);
              setSelected(0);
            }}
            onKeyDown={onKeyDown}
            className="h-full min-w-0 flex-1 bg-transparent font-mono text-base text-text caret-amber outline-none placeholder:text-muted md:text-sm"
          />
        </div>

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
                    <span className="font-mono text-xs text-muted">
                      {current?.id ?? "real account"}
                    </span>
                  </p>
                  {c && (
                    <p className="font-mono text-xs text-text-2">
                      {c.cards.toLocaleString("en")} cards · {c.due.toLocaleString("en")} due ·{" "}
                      {c.reviews.toLocaleString("en")} reviews
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-text-2">
                {signedOut ? "Signed out. Pick a persona to sign in as them." : "Loading…"}
              </p>
            )}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
          {compact && !page && !searching && personas.length > 0 && (
            <fieldset
              aria-label="Become a persona"
              className="m-0 min-w-0 border-0 px-2.5 pt-2 pb-3"
            >
              <p className="pb-2 font-mono text-2xs tracking-wider text-muted uppercase">Become</p>
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
          )}

          <div id={listId} role="listbox" aria-label="Developer commands">
            {shown.map((row, i) => {
              const header = row.group !== group;
              group = row.group;
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
                <div key={row.key} role="presentation">
                  {header && (
                    <p
                      role="presentation"
                      className="px-2.5 pt-3 pb-1 font-mono text-2xs tracking-wider text-muted uppercase"
                    >
                      {row.group}
                    </p>
                  )}
                  <div
                    id={`${listId}-${i}`}
                    role="option"
                    tabIndex={-1}
                    aria-selected={!compact && i === active}
                    aria-disabled={blocked ? true : undefined}
                    onPointerMove={() => {
                      if (!compact && i !== active) setSelected(i);
                    }}
                    onClick={() => activate(row)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        activate(row);
                      }
                    }}
                    className={clsx(
                      "flex cursor-default items-center gap-3 rounded-sm px-2.5 text-sm",
                      compact ? "min-h-12 py-2" : "min-h-10 py-1.5",
                      !compact && i === active && "bg-hover",
                      compact && "active:bg-hover",
                      blocked && "text-faint",
                    )}
                  >
                    <span className="grid size-6 shrink-0 place-items-center text-muted">
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
                            "block text-xs leading-snug text-muted",
                            !compact && "truncate",
                          )}
                        >
                          {row.detail}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-muted">
                      {working
                        ? "Working…"
                        : (blocked ??
                          (row.kind === "page" ? (
                            <ChevronRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                          ) : switching &&
                            row.kind === "persona" &&
                            switching === row.persona.id ? (
                            "Switching…"
                          ) : row.kind === "command" ? (
                            <span className="font-mono text-faint">{row.command.id}</span>
                          ) : row.kind === "persona" ? (
                            <span className="font-mono text-faint">{row.persona.id}</span>
                          ) : null))}
                    </span>
                  </div>
                </div>
              );
            })}
            {shown.length === 0 && (
              <p className="px-2.5 py-6 text-center text-sm text-muted">
                {commands.isPending && !personas.length ? "Loading…" : `Nothing matches "${raw}".`}
              </p>
            )}
          </div>
        </div>

        <footer className="flex min-h-10 shrink-0 items-center gap-4 border-t border-edge px-4 py-2 font-mono text-xs">
          <p
            role="status"
            className={clsx(
              "min-w-0 flex-1",
              note?.tone === "danger" ? "text-danger" : "text-text-2",
            )}
          >
            {note?.text ??
              (personasFailed || commands.isError ? "Developer tools are unavailable." : "")}
          </p>
          {!compact && (
            <p className="flex shrink-0 gap-3 text-muted">
              <span>
                <Kbd>↵</Kbd> run
              </span>
              <span>
                <Kbd>esc</Kbd> {page ? "back" : "close"}
              </span>
            </p>
          )}
        </footer>
      </section>
    </>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-sm bg-plate-2 px-1 font-mono text-2xs text-text-2">{children}</kbd>
  );
}
