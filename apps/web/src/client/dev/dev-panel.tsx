import { useQuery } from "@tanstack/react-query";
import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "../lib/api";
import "./dev-panel.css";
import { devApi } from "./dev-api";
import { DevPalette } from "./dev-palette";
import { PersonaAvatar } from "./persona-avatar";

/**
 * Local development and isolated app previews only. A tab on the screen's end edge shows who
 * you are; pressing it, or the backtick key, opens the command palette, across the whole screen
 * on a phone or a touch screen. Dragging the tab moves it up or down the edge. Never bundled:
 * the root route imports it behind a compile-time development or preview branch.
 */

const TOP_KEY = "lymi-dev-tab-top";

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
  const [open, setOpen] = useState(false);
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
    if (!open) return;
    // The palette focuses its search on a keyboard device; otherwise the dialog takes focus.
    if (!panelRef.current?.contains(document.activeElement)) {
      panelRef.current?.focus({ preventScroll: true });
    }
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
    <div className="dev-skin">
      <DevPalette
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
          open ? "max-md:hidden" : "hoverable:hover:text-text",
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
