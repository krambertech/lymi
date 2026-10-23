import { useLingui } from "@lingui/react/macro";
import { writes } from "@lymi/client/writes";
import { isolate, standsAlone } from "@lymi/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { clsx } from "clsx";
import { Check, CornerDownLeft, Plus } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Kbd } from "../components/kbd";
import { ApiError, errorMessage } from "../lib/api";
import { addInput, refreshAfterCardWrite } from "../lib/card-writes";
import { desktop } from "../lib/desktop";
import { lastDeckId, rememberDeck } from "../lib/last-deck";
import { decksQuery, meQuery } from "../lib/queries";
import { shortQuote } from "../lib/short-quote";

export const Route = createFileRoute("/desktop/add")({
  component: DesktopAdd,
});

type Line =
  | { kind: "added"; cardId: string; quoted: string; text: string; queued: boolean }
  | { kind: "existing"; path: string; text: string }
  | { kind: "undone"; text: string }
  | { kind: "failed"; text: string };

/** The Mac app's quick-add panel: one line, like the add strip in the command menu. */
function DesktopAdd() {
  const { t } = useLingui();
  const qc = useQueryClient();
  const me = useQuery(meQuery);
  const decks = useQuery({ ...decksQuery, enabled: me.isSuccess });
  const own = decks.data?.filter((d) => d.role === "owner") ?? [];
  const [deckId, setDeckId] = useState<string | null>(null);
  const target =
    own.find((d) => d.id === deckId) ?? own.find((d) => d.id === lastDeckId()) ?? own[0];
  const [term, setTerm] = useState("");
  const [line, setLine] = useState<Line | null>(null);
  const [adding, setAdding] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const signedOut = me.error instanceof ApiError && me.error.status === 401;

  // The window's own material shows through, so the page draws no room of its own.
  useLayoutEffect(() => {
    document.documentElement.dataset.surface = "panel";
    return () => {
      delete document.documentElement.dataset.surface;
    };
  }, []);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const observer = new ResizeObserver(() => desktop()?.resizePanel(node.offsetHeight));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(
    () =>
      desktop()?.onPanelShown(() => {
        setLine(null);
        input.current?.focus();
        input.current?.select();
        void qc.invalidateQueries(decksQuery);
      }),
    [qc],
  );

  const trimmed = term.trim();
  const ready = !!target && standsAlone(trimmed);
  const deckName = target?.name ?? "";

  async function add(open: boolean) {
    if (!target || !ready || adding) return;
    setAdding(true);
    const quoted = shortQuote(trimmed);
    try {
      const { outcome, queued } = await writes.addCard(
        addInput({ deckId: target.id, term: trimmed }),
      );
      if (outcome.status === "skipped") {
        const existing = outcome.existing;
        const path = `/library/${existing.deckId}?card=${existing.id}`;
        if (open) return desktop()?.openApp(path);
        setLine({
          kind: "existing",
          path,
          text: t`“${{ quoted: isolate(quoted) }}” is already in ${isolate(outcome.deckName)}`,
        });
        return;
      }
      rememberDeck(target.id);
      setTerm((current) => (current.trim() === trimmed ? "" : current));
      await refreshAfterCardWrite(qc);
      desktop()?.added();
      if (open) return desktop()?.openApp(`/library/${target.id}?card=${outcome.card.id}`);
      setLine({
        kind: "added",
        cardId: outcome.card.id,
        quoted,
        queued,
        text: queued
          ? t`Added “${{ quoted: isolate(quoted) }}” to ${{ deckName: isolate(deckName) }}. It’s saved on this Mac until Lymi can be reached.`
          : t`Added “${{ quoted: isolate(quoted) }}” to ${{ deckName: isolate(deckName) }}`,
      });
    } catch (e) {
      setLine({ kind: "failed", text: errorMessage(e) });
    } finally {
      setAdding(false);
    }
  }

  async function undo() {
    if (line?.kind !== "added") return;
    await writes.archiveCard(line.cardId);
    await refreshAfterCardWrite(qc);
    desktop()?.added();
    const archivedTerm = line.quoted;
    setLine({ kind: "undone", text: t`Archived “${{ archivedTerm: isolate(archivedTerm) }}”` });
    input.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter") {
      e.preventDefault();
      if (signedOut) return desktop()?.openApp("/login");
      if (!ready && line?.kind === "existing") return desktop()?.openApp(line.path);
      void add(e.metaKey);
    }
    if (e.key === "z" && e.metaKey && !trimmed && line?.kind === "added") {
      e.preventDefault();
      void undo();
    }
  }

  return (
    <div ref={root} className="flex flex-col px-2 pb-2 text-text">
      <div className="flex h-14 items-center gap-3 ps-3 pe-1">
        <Plus aria-hidden className="size-5 shrink-0 text-muted" strokeWidth={2.25} />
        <input
          ref={input}
          // biome-ignore lint/a11y/noAutofocus: the panel opens to type a term, like Spotlight
          autoFocus
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            if (line?.kind !== "added") setLine(null);
          }}
          onKeyDown={onKeyDown}
          placeholder={signedOut ? t`Sign in to add cards` : t`Add a card`}
          aria-label={t`Term`}
          spellCheck={false}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-2xl font-medium tracking-[-0.01em] outline-none placeholder:font-normal placeholder:text-faint"
        />
        {own.length > 0 && (
          <select
            value={target?.id}
            onChange={(e) => setDeckId(e.target.value)}
            aria-label={t`Deck`}
            className="max-w-44 shrink-0 text-sm"
          >
            {own.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        )}
      </div>
      {(ready || line || signedOut) && (
        <div className="flex flex-col gap-0.5 border-t border-edge pt-2">
          {signedOut ? (
            <Row tone="act">
              <span className="flex-1">{t`Open Lymi to sign in`}</span>
              <Return />
            </Row>
          ) : ready ? (
            <Row tone="act">
              <span className="min-w-0 flex-1 truncate">
                {t`Add “${{ quoted: isolate(shortQuote(trimmed)) }}” to ${{ deckName: isolate(deckName) }}`}
              </span>
              <Return />
            </Row>
          ) : null}
          {line && (
            <Row>
              {line.kind === "added" && (
                <Check aria-hidden className="size-4 shrink-0 text-good" strokeWidth={2.5} />
              )}
              <span
                role="status"
                className={clsx("min-w-0 flex-1", line.kind === "failed" && "text-danger")}
              >
                {line.text}
              </span>
              {line.kind === "added" && (
                <button
                  type="button"
                  onClick={() => void undo()}
                  className="flex items-center gap-1.5 rounded-xs px-1.5 py-0.5 font-medium hoverable:hover:bg-hover"
                >
                  {t`Undo`}
                  <Kbd>⌘Z</Kbd>
                </button>
              )}
              {line.kind === "existing" && !ready && <Return />}
            </Row>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ tone, children }: { tone?: "act"; children: React.ReactNode }) {
  return (
    <div
      className={clsx(
        "flex min-h-9 items-center gap-2.5 rounded-sm px-3 text-md",
        tone === "act" ? "bg-amber-tint text-amber-tint-ink" : "text-text-2",
      )}
    >
      {children}
    </div>
  );
}

function Return() {
  return <CornerDownLeft aria-hidden className="size-4 shrink-0 opacity-70" />;
}
