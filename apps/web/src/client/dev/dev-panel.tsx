import type { AppLanguage } from "@lymi/core";
import { type UseQueryResult, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import {
  ChevronDown,
  Clock,
  type LucideIcon,
  PenLine,
  Plug,
  RefreshCw,
  RotateCcw,
  Target,
  TrendingDown,
  X,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { ApiError, api } from "../lib/api";
import { clearPersistedLearnerState } from "../lib/persisted";
import { getTheme, setTheme, type ThemeChoice } from "../lib/theme";
import "./dev-panel.css";
import { type DevCounts, type DevState, devApi, type PersonaSummary } from "./dev-api";
import { PersonaAvatar } from "./persona-avatar";

/**
 * Local development and isolated app previews only. A tab on the screen's end edge shows who
 * you are; pressing it, or the backtick key, opens the tools beside it, or across a phone's
 * whole screen. Dragging the tab moves it up or down the edge. Never bundled: the root route
 * imports it behind a compile-time development or preview branch.
 */

const OPEN_KEY = "lymi-dev-panel";
const TOP_KEY = "lymi-dev-tab-top";
const LANGUAGES: { value: AppLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "uk", label: "Українська" },
];
const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];
interface Action {
  key: string;
  icon: LucideIcon;
  label: string;
  /** Why the action cannot do anything for this account right now. */
  blocked?: string | undefined;
  /** Runs the action and says what happened. */
  run: () => Promise<string>;
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}
function clampTop(fraction: number) {
  return Math.min(0.88, Math.max(0.12, fraction));
}

export default function DevPanel() {
  const [open, setOpen] = useState(() => read(OPEN_KEY) === "1");
  const [top, setTop] = useState(() => clampTop(Number(read(TOP_KEY) ?? 0.5) || 0.5));
  const panelRef = useRef<HTMLElement>(null);
  const tabRef = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ y: number; top: number; moved: boolean } | null>(null);
  const dragged = useRef(false);

  const personas = useQuery({
    queryKey: ["dev", "personas"],
    queryFn: devApi.personas,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
  const state = useQuery({
    queryKey: ["dev", "state"],
    queryFn: devApi.state,
    staleTime: 0,
    retry: false,
  });
  const signedOut = state.isError && state.error instanceof ApiError && state.error.status === 401;
  const who = state.data?.persona?.name ?? state.data?.user.name ?? state.data?.user.email;

  const { refetch } = state;
  useEffect(() => {
    write(OPEN_KEY, open ? "1" : "0");
    if (!open) return;
    panelRef.current?.focus({ preventScroll: true });
    // Reviews and adds made in the app since change what each action can do.
    void refetch();
  }, [open, refetch]);

  useEffect(() => {
    // A keyboard dismissal puts focus back on the tab, so the next Tab starts from it
    // rather than from the top of the page.
    const dismiss = () => {
      setOpen(false);
      requestAnimationFrame(() => tabRef.current?.focus());
    };
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if (e.key === "`" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (open) dismiss();
        else setOpen(true);
      }
      const idle = document.activeElement === document.body;
      if (
        e.key === "Escape" &&
        open &&
        (idle || panelRef.current?.contains(document.activeElement))
      ) {
        dismiss();
      }
    };
    // A press anywhere else on the page closes it, except inside a drawer the app has open above it.
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (
        !open ||
        !target ||
        panelRef.current?.contains(target) ||
        tabRef.current?.contains(target) ||
        target.closest('[data-slot^="drawer"]')
      ) {
        return;
      }
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div className="dev-skin [--dev-w:min(344px,calc(100vw-40px))]">
      <Panel
        ref={panelRef}
        open={open}
        onClose={() => {
          setOpen(false);
          requestAnimationFrame(() => tabRef.current?.focus());
        }}
        personas={personas.data?.personas ?? []}
        personasFailed={personas.isError}
        state={state}
        signedOut={signedOut}
      />
      <button
        ref={tabRef}
        type="button"
        aria-label={
          open ? "Close developer tools" : `Developer tools, signed in as ${who ?? "nobody"}`
        }
        aria-expanded={open}
        aria-controls="dev-panel"
        title="Developer tools (`). Drag to move."
        style={{ top: `${top * 100}%` }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          drag.current = { y: e.clientY, top, moved: false };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const dy = e.clientY - d.y;
          if (!d.moved && Math.abs(dy) < 5) return;
          d.moved = true;
          setTop(clampTop(d.top + dy / window.innerHeight));
        }}
        onPointerUp={() => {
          if (drag.current?.moved) {
            dragged.current = true;
            setTop((t) => {
              write(TOP_KEY, String(t));
              return t;
            });
          }
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onClick={() => {
          // A drag ends in a click; only a press without one toggles.
          if (dragged.current) {
            dragged.current = false;
            return;
          }
          setOpen((v) => !v);
        }}
        className={clsx(
          "group fixed end-0 z-(--z-sticky) flex w-8 -translate-y-1/2 touch-none select-none flex-col items-center gap-2 rounded-s-lg py-2.5",
          "edge-2 bg-plate text-muted outline-offset-2",
          // The pseudo-element carries the touch target 16 px into the page.
          "before:absolute before:inset-y-0 before:-start-4 before:end-0 before:content-['']",
          open
            ? "max-md:hidden md:-translate-x-(--dev-w) md:rtl:translate-x-(--dev-w)"
            : "hoverable:hover:text-text",
        )}
      >
        <PersonaAvatar
          key={who ?? "?"}
          id={state.data?.persona?.id}
          name={signedOut ? undefined : who}
          className="size-6 text-xs"
        />
        <span
          aria-hidden="true"
          className="text-2xs font-semibold tracking-wide [writing-mode:vertical-rl]"
        >
          dev
        </span>
      </button>
    </div>
  );
}

interface PanelProps {
  ref: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  personas: PersonaSummary[];
  personasFailed: boolean;
  state: UseQueryResult<DevState>;
  signedOut: boolean;
}

function Panel({ ref, open, onClose, personas, personasFailed, state, signedOut }: PanelProps) {
  const queryClient = useQueryClient();
  const headingId = useId();
  const [theme, setThemeState] = useState<ThemeChoice>(getTheme);
  const [note, setNote] = useState<{ text: string; tone: "muted" | "danger" } | null>(null);
  const [previewed, setPreviewed] = useState<string | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  const current = state.data?.persona ?? null;

  // Something on the screen behind changed, so every query the screen holds is stale.
  async function landed(text: string) {
    setNote({ text, tone: "muted" });
    await queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "dev" });
    await state.refetch();
  }
  function failed(err: unknown) {
    setNote({
      text: err instanceof Error ? err.message : "That did not go through",
      tone: "danger",
    });
  }

  const c = state.data?.counts;
  const noCards = c?.cards ? undefined : "No cards";
  const nothingDue = noCards ?? (c?.due ? undefined : "Nothing due");
  const noReviews = noCards ?? (c?.reviews ? undefined : "No reviews");
  const actions: Action[] = [
    {
      key: "claude",
      icon: Plug,
      label: "Claude adds 5 cards",
      run: async () => `Claude added ${(await devApi.cards(5)).added} cards.`,
    },
    {
      key: "enrich",
      icon: PenLine,
      label: "Enrich 5 cards",
      blocked: noCards,
      run: async () => {
        const { enriched } = await devApi.enrich(5);
        return enriched ? `Enriched ${enriched} cards.` : "Every card already has an example.";
      },
    },
    {
      key: "forget",
      icon: RotateCcw,
      label: "Forget 3 cards",
      blocked: nothingDue,
      run: async () => `Forgot ${(await devApi.recall(3, 1)).graded} cards.`,
    },
    {
      key: "slip",
      icon: TrendingDown,
      label: "Make 3 often forgotten",
      blocked: noReviews,
      run: async () => `${(await devApi.slip(3)).slipped} cards are now often forgotten.`,
    },
    {
      key: "goal",
      icon: Target,
      label: "Reach today's goal",
      blocked: noCards,
      run: async () => {
        const { graded } = await devApi.goal();
        return graded
          ? `Graded ${graded} more. Today's goal is met.`
          : "Today's goal was already met.";
      },
    },
    {
      key: "due",
      icon: Clock,
      label: "Make 5 cards due",
      blocked: noCards,
      run: async () => `${(await devApi.due(5)).due} cards due now.`,
    },
  ];
  const reseed: Action = {
    key: "reseed",
    icon: RefreshCw,
    label: "Reseed",
    run: async () => `Reseeded: ${counts((await devApi.seed(current?.id)).counts)}.`,
  };
  const act = useMutation({
    mutationFn: (a: Action) => a.run(),
    onSuccess: landed,
    onError: failed,
  });
  const language = useMutation({
    mutationFn: (appLanguage: AppLanguage) => api.updateSettings({ appLanguage }),
    onSuccess: async (s) => {
      setNote({ text: `Interface and meanings in ${s.appLanguage}.`, tone: "muted" });
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
      await state.refetch();
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

  // Pointing at a face describes it; otherwise the panel describes who you are.
  const shown = personas.find((p) => p.id === (switching ?? previewed)) ?? current;

  return (
    <section
      ref={ref}
      id="dev-panel"
      tabIndex={-1}
      inert={!open}
      aria-labelledby={headingId}
      className={clsx(
        // A phone gives the tools the whole screen; a desktop keeps them beside the tab.
        "fixed inset-0 z-(--z-sheet) flex flex-col bg-plate pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-text outline-none",
        "md:edge-2 md:inset-auto md:end-0 md:top-1/2 md:max-h-[min(640px,calc(100dvh-24px))] md:w-(--dev-w) md:-translate-y-1/2 md:rounded-s-xl md:py-0",
        !open && "hidden",
      )}
    >
      <header className="flex items-center gap-2 ps-4 pe-2 pt-2">
        <h2 id={headingId} className="flex items-center gap-2 text-base font-medium">
          Developer tools
        </h2>
        <button
          type="button"
          aria-label="Close developer tools"
          onClick={onClose}
          className="ms-auto grid size-8 place-items-center rounded-full text-muted hoverable:hover:bg-hover hoverable:hover:text-text"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 pt-2 pb-4">
        <div className="grid shrink-0 gap-3 rounded-lg bg-plate-2 p-3">
          <fieldset
            aria-label="Become a persona"
            className="m-0 grid min-w-0 grid-cols-7 gap-1.5 border-0 p-0"
            onPointerLeave={() => setPreviewed(null)}
          >
            {personas.map((p) => {
              const isCurrent = p.id === current?.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-label={`Become ${p.name}, ${p.id}`}
                  aria-current={isCurrent || undefined}
                  disabled={switching !== null}
                  onPointerEnter={() => setPreviewed(p.id)}
                  onFocus={() => setPreviewed(p.id)}
                  onBlur={() => setPreviewed(null)}
                  onClick={() => {
                    if (!isCurrent) become(p.id);
                  }}
                  className={clsx(
                    "grid aspect-square place-items-center rounded-full disabled:opacity-60",
                    (isCurrent || switching === p.id) &&
                      "ring-2 ring-amber ring-offset-2 ring-offset-plate-2",
                    switching === p.id && "disabled:opacity-100",
                  )}
                >
                  <PersonaAvatar id={p.id} name={p.name} className="size-full text-sm" />
                </button>
              );
            })}
          </fieldset>

          <div className="min-h-[3.75rem]">
            {shown ? (
              <>
                <p className="flex items-baseline gap-2">
                  <span className="font-medium">{shown.name}</span>
                  <span className="font-mono text-xs text-muted">{shown.id}</span>
                  {switching === shown.id && (
                    <span className="ms-auto text-sm text-muted">Switching…</span>
                  )}
                  {!switching && shown.id !== current?.id && previewed && (
                    <span className="ms-auto text-sm text-muted">Press to become</span>
                  )}
                  {!switching && shown.id === current?.id && (
                    <button
                      type="button"
                      aria-disabled={act.isPending || undefined}
                      onClick={() => {
                        if (!act.isPending) act.mutate(reseed);
                      }}
                      className="-me-1.5 ms-auto flex h-7 items-center gap-1.5 self-center rounded-sm px-1.5 text-sm text-muted hoverable:hover:bg-hover hoverable:hover:text-text"
                    >
                      <RefreshCw className="size-3.5" aria-hidden="true" />
                      {act.isPending && act.variables?.key === "reseed" ? "Reseeding…" : "Reseed"}
                    </button>
                  )}
                </p>
                <p className="mt-0.5 text-sm leading-snug text-text-2">{shown.description}</p>
              </>
            ) : signedOut ? (
              <p className="text-sm text-text-2">Signed out. Pick a face to sign in as them.</p>
            ) : state.data ? (
              <>
                <p className="font-medium">{state.data.user.email}</p>
                <p className="mt-0.5 text-sm text-text-2">A real account, not a persona.</p>
              </>
            ) : null}
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2">
          {state.data && (
            <Choice
              label="Language"
              // The chosen language shows while it saves, rather than jumping back until the refetch.
              value={
                language.isPending ? language.variables : (state.data.settings.appLanguage ?? "en")
              }
              options={LANGUAGES}
              onChange={(v) => language.mutate(v as AppLanguage)}
            />
          )}
          <Choice
            label="Theme"
            value={theme}
            options={THEMES}
            onChange={(v) => {
              setTheme(v as ThemeChoice);
              setThemeState(v as ThemeChoice);
            }}
          />
        </div>

        {state.data && (
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <p className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-text-2">Simulate</span>
              <span className="tabular-nums text-muted">
                {state.data.counts.cards} cards · {state.data.counts.due} due
              </span>
            </p>
            <ul className="m-0 flex min-h-0 list-none flex-col overflow-y-auto overscroll-contain rounded-lg bg-plate-2 p-1">
              {actions.map((a) => {
                const running = act.isPending && act.variables?.key === a.key;
                const blocked = act.isPending || !!a.blocked;
                return (
                  <li key={a.key}>
                    <button
                      type="button"
                      aria-disabled={blocked || undefined}
                      onClick={() => {
                        if (!blocked) act.mutate(a);
                      }}
                      className={clsx(
                        "flex h-11 w-full items-center gap-3 rounded-md px-2.5 text-start text-sm md:h-9",
                        a.blocked ? "text-faint" : "text-text hoverable:hover:bg-hover",
                      )}
                    >
                      <a.icon className="size-4 shrink-0 text-muted" aria-hidden="true" />
                      <span className="flex-1 truncate">{a.label}</span>
                      <span className="shrink-0 text-xs text-muted">
                        {running ? "Working…" : a.blocked}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <footer className="flex items-baseline gap-4 border-t border-edge px-4 py-3 text-sm">
        <p
          role="status"
          className={clsx("min-w-0 flex-1", note?.tone === "danger" ? "text-danger" : "text-muted")}
        >
          {note?.text ?? (personasFailed ? "Preview tools are unavailable." : "")}
        </p>
        <p className="flex shrink-0 gap-3 text-muted">
          <TextLink href="/design">Design</TextLink>
          <TextLink href="/api/docs">API</TextLink>
        </p>
      </footer>
    </section>
  );
}

function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="grid min-w-0 gap-1.5">
      <label htmlFor={id} className="text-sm text-text-2">
        {label}
      </label>
      {/* Native, so its list takes the panel's dark scheme and a phone opens its own picker. */}
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="edge h-11 w-full appearance-none rounded-md bg-plate-2 ps-3 pe-9 text-base text-text outline-none hoverable:hover:bg-hover focus-visible:edge-2 md:h-9 md:text-sm"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="rounded-sm underline decoration-edge-2 underline-offset-4 transition-colors duration-150 hoverable:hover:text-text"
    >
      {children}
    </a>
  );
}

function counts(c: DevCounts): string {
  return `${c.cards} cards · ${c.reviews} reviews`;
}
