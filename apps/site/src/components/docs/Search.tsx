import { clsx } from "clsx";
import { CornerDownLeft, Search as SearchIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Kbd } from "../Kbd";
import { type DocPage, PAGES } from "./nav";

/** Words a reader might type that do not appear in a page's title or blurb. */
const TERMS: Record<string, string[]> = {
  "/docs": ["openapi", "base url", "rate limit", "what can i build"],
  "/docs/quickstart": ["curl", "first request", "x-api-key", "hello world", "get started"],
  "/docs/authentication": [
    "api key",
    "scope",
    "read",
    "write",
    "401",
    "403",
    "429",
    "revoke",
    "session",
    "errors",
    "rate limit",
  ],
  "/docs/mobile": [
    "iphone",
    "ipad",
    "android",
    "ios",
    "mobile app",
    "install",
    "home screen",
    "pwa",
    "app store",
    "google play",
    "offline",
    "notifications",
    "reminder",
  ],
  "/docs/cards": [
    "deck",
    "card",
    "duplicate",
    "language",
    "direction",
    "recognition",
    "production",
    "archive",
    "restore",
    "tags",
    "queue",
  ],
  "/docs/import-from-anki": [
    "anki",
    "apkg",
    "colpkg",
    "export",
    "import",
    "ankidroid",
    "ankimobile",
    "migrate",
    "move",
    "switch",
    "cloze",
    "furigana",
  ],
  "/docs/import-from-mochi": [
    "mochi",
    "export",
    "import",
    "migrate",
    "move",
    "switch",
    "markdown",
    "template",
    "attachments",
    "reverse",
  ],
  "/docs/export": [
    "export",
    "download",
    "backup",
    "apkg",
    "anki",
    "mochi",
    "zip",
    "csv",
    "leave",
    "move",
  ],
  "/docs/scheduling": [
    "fsrs",
    "spaced repetition",
    "interval",
    "stability",
    "difficulty",
    "retrievability",
    "retention",
    "due",
    "queue",
    "order",
    "new cards",
    "forgot",
    "simulation",
  ],
  "/docs/recipes": ["batch", "import", "csv", "export", "backup", "idempotent", "script", "python"],
  "/docs/api": ["endpoints", "routes", "schema", "openapi.json", "parameters", "responses"],
  "/docs/mcp": ["model context protocol", "oauth", "consent", "assistant", "tools"],
  "/docs/mcp/claude": ["claude desktop", "claude code", "claude.ai", "connector", "mcp add"],
  "/docs/mcp/chatgpt": ["chatgpt", "codex", "connector", "developer mode", "openai"],
  "/docs/mcp/gemini": ["gemini", "google", "settings.json", "mcp auth", "client id"],
};

function score(page: DocPage, q: string): number {
  const nav = page.nav.toLowerCase();
  const title = page.title.toLowerCase();
  if (title.startsWith(q) || nav.startsWith(q)) return 0;
  if (title.includes(q) || nav.includes(q)) return 1;
  if (page.blurb.toLowerCase().includes(q)) return 2;
  if ((TERMS[page.to] ?? []).some((t) => t.includes(q))) return 3;
  return -1;
}

/** Search over the pages. Ten of them, so a substring match is the whole algorithm. */
export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return PAGES;
    return PAGES.map((p) => ({ p, s: score(p, term) }))
      .filter((r) => r.s >= 0)
      .sort((a, b) => a.s - b.s)
      .map((r) => r.p);
  }, [q]);

  // A modal <dialog> keeps Tab inside it and closes on Escape; focus goes back to the opener.
  useEffect(() => {
    const d = dialog.current;
    if (!open || !d) return;
    setQ("");
    setI(0);
    const opener = document.activeElement as HTMLElement | null;
    const scroll = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    d.showModal();
    inputRef.current?.focus();
    return () => {
      document.body.style.overflow = scroll;
      if (d.open) d.close();
      opener?.focus?.();
    };
  }, [open]);

  const go = (page: DocPage | undefined) => {
    if (!page) return;
    onClose();
    window.location.assign(page.to);
  };

  return (
    <dialog
      ref={dialog}
      aria-label="Search the documentation"
      onClose={onClose}
      // A press on the scrim lands on the dialog itself, outside the panel.
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setI((n) => Math.min(n + 1, results.length - 1));
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setI((n) => Math.max(n - 1, 0));
        }
        // A focused result opens itself; Enter in the field opens the highlighted one.
        if (e.key === "Enter" && e.target === inputRef.current) {
          e.preventDefault();
          go(results[i]);
        }
      }}
      className="m-0 h-dvh max-h-none w-full max-w-none bg-scrim px-4 pt-[10vh] backdrop:bg-transparent"
    >
      <div className="enter-card relative mx-auto w-full max-w-xl overflow-hidden rounded-lg bg-plate edge">
        <div className="flex h-12 items-center gap-2.5 border-b border-edge px-3.5">
          <SearchIcon className="size-4 shrink-0 text-muted" aria-hidden="true" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setI(0);
            }}
            placeholder="Search the docs"
            aria-label="Search the docs"
            className="min-w-0 flex-1 bg-transparent text-base text-text outline-none placeholder:text-muted"
          />
          <Kbd>Esc</Kbd>
        </div>
        {results.length === 0 ? (
          <p className="px-3.5 py-6 text-base text-muted">
            No page matches “{q.trim()}”. Try “key”, “duplicate” or “Claude”.
          </p>
        ) : (
          <ul className="max-h-[52vh] overflow-y-auto p-1.5">
            {results.map((p, n) => (
              <li key={p.to}>
                <button
                  type="button"
                  onMouseEnter={() => setI(n)}
                  onFocus={() => setI(n)}
                  onClick={() => go(p)}
                  className={clsx(
                    "flex w-full items-center gap-3 rounded-sm px-2.5 py-2 text-start",
                    n === i ? "bg-plate-2" : "bg-transparent",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base text-text">{p.title}</span>
                    <span className="block truncate text-sm text-muted">{p.blurb}</span>
                  </span>
                  <span className="shrink-0 text-xs text-faint">{p.section}</span>
                  {n === i && (
                    <CornerDownLeft className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </dialog>
  );
}
