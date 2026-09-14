import type { AppLanguage } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { Wrench, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Field } from "../components/Field";
import { Kbd } from "../components/Kbd";
import { Segmented } from "../components/Segmented";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemHint,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "../components/ui/combobox";
import { ApiError, api } from "../lib/api";
import { clearPersistedLearnerState } from "../lib/persisted";
import { getTheme, setTheme, type ThemeChoice } from "../lib/theme";
import { type DevCounts, devApi } from "./dev-api";

/**
 * Local development and isolated app previews only. One small form: who you are, how many
 * cards are due, what the account holds, the meaning language and the theme. Every row is
 * the app's own Combobox, so a person reads the current value at a glance and an agent changes it
 * by typing into its search.
 * The panel opens above the button that toggles it, in the bottom-right corner; the
 * backtick key toggles it too. Never bundled: the root route imports it behind
 * a compile-time development or preview branch.
 */

const OPEN_KEY = "lymi-dev-panel";
const LANGUAGES: { value: AppLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "uk", label: "Українська" },
  { value: "ru", label: "Русский" },
];
const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];
/** The resting value of a row that runs an action rather than holding a setting. */
const NOW = "now";
interface Choice {
  value: string;
  label: string;
  hint?: string | undefined;
}

const DUE_OPTIONS: Choice[] = [
  { value: "0", label: "Make nothing due" },
  { value: "1", label: "Make 1 card due" },
  { value: "5", label: "Make 5 cards due" },
  { value: "20", label: "Make 20 cards due" },
  { value: "all", label: "Make every card due" },
];

// The corner the panel lives in. On a phone it sits above the pill and the grade strip.
const CORNER = "fixed right-3 z-(--z-sticky)";
const TRIGGER_BOTTOM = "bottom-[calc(env(safe-area-inset-bottom)+92px)] md:bottom-3";
const PANEL_BOTTOM = "bottom-[calc(env(safe-area-inset-bottom)+140px)] md:bottom-[60px]";

function readOpen(): boolean {
  try {
    return localStorage.getItem(OPEN_KEY) === "1";
  } catch {
    return false;
  }
}

export default function DevPanel() {
  const [open, setOpen] = useState(readOpen);
  const panelRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(OPEN_KEY, open ? "1" : "0");
    } catch {}
  }, [open]);

  useEffect(() => {
    // A keyboard dismissal puts focus back on the button, so the next Tab starts from it
    // rather than from the top of the page.
    const dismiss = () => {
      setOpen(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
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
      if (e.key === "Escape" && open && panelRef.current?.contains(document.activeElement)) {
        dismiss();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {open && <Panel ref={panelRef} />}
      <button
        ref={triggerRef}
        type="button"
        aria-label={open ? "Close developer tools" : "Developer tools"}
        aria-expanded={open}
        aria-controls="dev-panel"
        title="Developer tools (`)"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          CORNER,
          TRIGGER_BOTTOM,
          "flex size-9 items-center justify-center rounded-full transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96]",
          open
            ? "bg-text text-canvas"
            : "edge bg-plate text-muted hoverable:hover:bg-hover hoverable:hover:text-text",
        )}
      >
        {open ? (
          <X className="size-4" aria-hidden="true" />
        ) : (
          <Wrench className="size-4" aria-hidden="true" />
        )}
      </button>
    </>
  );
}

function Panel({ ref }: { ref: React.RefObject<HTMLElement | null> }) {
  const queryClient = useQueryClient();
  const headingId = useId();
  const [theme, setThemeState] = useState<ThemeChoice>(getTheme);
  const [note, setNote] = useState<{ text: string; tone: "muted" | "danger" } | null>(null);

  const personas = useQuery({
    queryKey: ["dev", "personas"],
    queryFn: devApi.personas,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 0,
    retry: false,
  });
  const state = useQuery({
    queryKey: ["dev", "state"],
    queryFn: devApi.state,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
  const signedOut = state.isError && state.error instanceof ApiError && state.error.status === 401;
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

  const seed = useMutation({
    mutationFn: (persona?: string) => devApi.seed(persona),
    onSuccess: (r, persona) =>
      landed(`Loaded ${persona ?? current?.id ?? "learner"}: ${counts(r.counts)}.`),
    onError: failed,
  });
  const reset = useMutation({
    mutationFn: devApi.reset,
    onSuccess: () => landed("Emptied the account."),
    onError: failed,
  });
  const due = useMutation({
    mutationFn: devApi.due,
    onSuccess: (r) => landed(`${r.due} cards due now.`),
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
    clearPersistedLearnerState();
    queryClient.clear();
    const { pathname, search } = window.location;
    const returnTo = pathname === "/login" ? "/today" : `${pathname}${search}`;
    window.location.assign(devApi.signInUrl(id, returnTo));
  }

  useEffect(() => {
    ref.current?.focus();
  }, [ref]);

  const list = personas.data?.personas ?? [];
  const personaOptions: Choice[] = [
    ...(signedOut ? [{ value: "out", label: "Signed out" }] : []),
    ...(state.data && !current
      ? [{ value: "real", label: state.data.user.email, hint: "real account" }]
      : []),
    ...list.map((p) => ({ value: p.id, label: p.name, hint: p.id })),
  ];
  const personaValue = current?.id ?? (state.data ? "real" : signedOut ? "out" : null);

  const dataOptions: Choice[] = state.data
    ? [
        { value: NOW, label: counts(state.data.counts) },
        { value: "reseed", label: `Reseed ${current?.id ?? "learner"}` },
        { value: "empty", label: "Empty the account" },
        ...list
          .filter((p) => p.id !== current?.id)
          .map((p) => ({ value: `load:${p.id}`, label: `Load ${p.id} instead` })),
      ]
    : [];

  return (
    <section
      ref={ref}
      id="dev-panel"
      tabIndex={-1}
      aria-labelledby={headingId}
      className={clsx(
        CORNER,
        PANEL_BOTTOM,
        "enter-fade edge-2 left-3 flex max-h-[calc(100dvh-160px)] flex-col rounded-xl bg-plate text-text outline-none md:left-auto md:w-[344px]",
      )}
    >
      <h2 id={headingId} className="flex items-center gap-2 px-5 pt-4 text-base font-medium">
        Developer tools
        <Kbd className="h-5 px-1.5 text-[0.625rem]">`</Kbd>
      </h2>

      <div className="grid gap-3.5 overflow-y-auto overscroll-contain px-5 pt-4 pb-5">
        <Row label="Persona" hint={current?.description}>
          <Choices
            label="Persona"
            value={personaValue}
            options={personaOptions}
            searchLabel="Search personas"
            onChange={(v) => {
              if (v !== "real" && v !== "out") become(v);
            }}
          />
        </Row>

        {state.data && (
          <>
            <Row label="Due">
              <Choices
                label="Due"
                value={NOW}
                options={[
                  { value: NOW, label: `${state.data.counts.due} due now` },
                  ...DUE_OPTIONS,
                ]}
                searchLabel="Choose how many are due"
                onChange={(v) => {
                  if (v !== NOW) due.mutate(v === "all" ? "all" : Number(v));
                }}
              />
            </Row>

            <Row label="Data">
              <Choices
                label="Data"
                value={NOW}
                options={dataOptions}
                searchLabel="Choose what to load"
                onChange={(v) => {
                  if (v === "empty") reset.mutate();
                  else if (v === "reseed") seed.mutate(current?.id);
                  else if (v.startsWith("load:")) seed.mutate(v.slice(5));
                }}
              />
            </Row>

            <Row label="Language">
              <Segmented
                size="sm"
                value={(state.data.settings.appLanguage ?? "en") as AppLanguage}
                options={LANGUAGES}
                label="Interface language"
                className="mt-1"
                onChange={(v) => language.mutate(v)}
              />
            </Row>
          </>
        )}

        <Row label="Theme">
          <Segmented
            size="sm"
            value={theme}
            options={THEMES}
            label="Theme"
            className="mt-1"
            onChange={(t) => {
              setTheme(t);
              setThemeState(t);
            }}
          />
        </Row>
      </div>

      <footer className="flex items-baseline justify-between gap-4 border-t border-edge px-5 py-3.5 text-sm">
        <p
          role="status"
          className={clsx("min-w-0 flex-1", note?.tone === "danger" ? "text-danger" : "text-muted")}
        >
          {note?.text ?? (personas.isError ? "Preview tools are unavailable." : "")}
        </p>
        <p className="flex shrink-0 gap-4 text-muted">
          <FooterLink href="/design">Design</FooterLink>
          <FooterLink href="/api/docs">API</FooterLink>
        </p>
      </footer>
    </section>
  );
}

/** A row's value, or the action it runs, picked from a searchable list. */
function Choices({
  label,
  value,
  options,
  searchLabel,
  onChange,
}: {
  label: string;
  value: string | null;
  options: Choice[];
  searchLabel: string;
  onChange: (value: string) => void;
}) {
  return (
    <Combobox<Choice>
      items={options}
      value={options.find((o) => o.value === value) ?? null}
      onValueChange={(next) => {
        if (next) onChange(next.value);
      }}
      isItemEqualToValue={(a, b) => a.value === b.value}
    >
      <ComboboxTrigger>
        <ComboboxValue placeholder="Choose one" />
      </ComboboxTrigger>
      <ComboboxContent aria-label={label}>
        <ComboboxInput placeholder={searchLabel} />
        <ComboboxEmpty>Nothing matches</ComboboxEmpty>
        <ComboboxList>
          {(option: Choice) => (
            <ComboboxItem key={option.value} value={option}>
              <span className="flex-1 truncate">{option.label}</span>
              {option.hint && <ComboboxItemHint>{option.hint}</ComboboxItemHint>}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

/** A Field turned sideways: the label beside its control, the hint under the control. */
function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <Field
      label={label}
      hint={hint}
      className="grid-cols-[68px_minmax(0,1fr)] items-start gap-x-3 gap-y-1 [&>div:first-child]:mt-2.5 [&>p]:col-start-2 [&>p]:text-xs [&>p]:leading-snug"
    >
      {children}
    </Field>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
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
