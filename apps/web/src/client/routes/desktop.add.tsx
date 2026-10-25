import { useLingui } from "@lingui/react/macro";
import { writes } from "@lymi/client/writes";
import { isolate, standsAlone } from "@lymi/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { clsx } from "clsx";
import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ApiError, api, errorMessage } from "../lib/api";
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

/** The Mac app's quick-add panel: the term on one line, with its deck quiet at the end. */
function DesktopAdd() {
  const { t } = useLingui();
  const qc = useQueryClient();
  const me = useQuery(meQuery);
  const decks = useQuery({ ...decksQuery, enabled: me.isSuccess });
  const own = decks.data?.filter((d) => d.role === "owner") ?? [];
  // The learner's pick wins; otherwise the deck in the term's language, then the last one added to.
  const [deckId, setDeckId] = useState<string | null>(null);
  const [guessed, setGuessed] = useState<string | null>(null);
  const target =
    own.find((d) => d.id === deckId) ??
    own.find((d) => d.id === guessed) ??
    own.find((d) => d.id === lastDeckId()) ??
    own[0];
  const [term, setTerm] = useState("");
  const [line, setLine] = useState<Line | null>(null);
  const [adding, setAdding] = useState(false);
  const [picking, setPicking] = useState(false);
  // The deck the arrow keys are on while the list is open.
  const [active, setActive] = useState(0);
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const signedOut = me.error instanceof ApiError && me.error.status === 401;
  // A card needs a deck of the learner's own to land in, and the panel has no room to make one.
  const noDeck = decks.isSuccess && own.length === 0;

  // The page is the whole panel, so it draws no room of its own and lends the window its colour.
  useLayoutEffect(() => {
    document.documentElement.dataset.surface = "panel";
    const paint = () => {
      const canvas = document
        .createElement("canvas")
        .getContext("2d", { willReadFrequently: true });
      if (!canvas) return;
      // The pixel a canvas draws is sRGB whatever the CSS colour's space, which is what the window takes.
      canvas.fillStyle = getComputedStyle(document.body).backgroundColor;
      canvas.fillRect(0, 0, 1, 1);
      const [r = 0, g = 0, b = 0] = canvas.getImageData(0, 0, 1, 1).data;
      desktop()?.setPanelBackground(
        `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`,
      );
    };
    paint();
    const theme = new MutationObserver(paint);
    theme.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    const scheme = matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", paint);
    return () => {
      theme.disconnect();
      scheme.removeEventListener("change", paint);
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
      desktop()?.onPanelShown(({ selection }) => {
        setLine(null);
        setPicking(false);
        setDeckId(null);
        setGuessed(null);
        if (selection) setTerm(selection);
        input.current?.focus();
        input.current?.select();
        void qc.invalidateQueries(decksQuery);
      }),
    [qc],
  );

  const trimmed = term.trim();
  const ready = !!target && standsAlone(trimmed);
  const deckName = target?.name ?? "";

  useEffect(() => {
    if (deckId || !standsAlone(trimmed) || own.length < 2) return;
    // An answer for an earlier term, arriving after a later one, is dropped.
    let current = true;
    const timer = window.setTimeout(() => {
      api
        .chooseDeck({ term: trimmed })
        .then((choice) => {
          if (current) setGuessed(choice.deckId);
        })
        .catch(() => {});
    }, 350);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [deckId, trimmed, own.length]);

  function openList() {
    if (own.length < 2) return;
    setActive(
      Math.max(
        0,
        own.findIndex((d) => d.id === target?.id),
      ),
    );
    setPicking(true);
    requestAnimationFrame(() => list.current?.focus());
  }

  function closeList() {
    setPicking(false);
    input.current?.focus();
  }

  function pick(id: string) {
    setDeckId(id);
    closeList();
  }

  // Esc closes the deck list first and the panel after, wherever focus is.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      if (picking) closeList();
      else desktop()?.hidePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function onListKeyDown(e: React.KeyboardEvent) {
    const last = own.length - 1;
    if (e.key === "ArrowDown") setActive((i) => Math.min(i + 1, last));
    else if (e.key === "ArrowUp") setActive((i) => Math.max(i - 1, 0));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(last);
    else if (e.key === "Enter" || e.key === " ") {
      const deck = own[active];
      if (deck) pick(deck.id);
    } else if (e.key === "Tab") setPicking(false);
    else return;
    if (e.key !== "Tab") e.preventDefault();
  }

  async function add(open: boolean) {
    if (!target || !ready || adding) return;
    setAdding(true);
    const quoted = shortQuote(trimmed);
    try {
      const { outcome, queued } = await writes.addCard(
        addInput({ deckId: target.id, term: trimmed }),
        "desktop_panel",
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
    try {
      await writes.archiveCard(line.cardId);
    } catch (e) {
      setLine({ kind: "failed", text: errorMessage(e) });
      return;
    }
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
      if (noDeck) return desktop()?.openApp("/library");
      if (!ready && line?.kind === "existing") return desktop()?.openApp(line.path);
      void add(e.metaKey);
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      openList();
    }
    if (e.key === "z" && e.metaKey && !trimmed && line?.kind === "added") {
      e.preventDefault();
      void undo();
    }
  }

  const status = line && (
    <p className="flex min-w-0 items-start gap-2 text-sm text-text-2">
      {line.kind === "added" && (
        <Check
          aria-hidden
          className="mt-[calc(0.5lh-0.5rem)] size-4 shrink-0 text-good"
          strokeWidth={2.5}
        />
      )}
      {/* A queued add wraps rather than cut off the sentence that says where the card waits. */}
      <span
        className={clsx(
          "min-w-0",
          line.kind === "added" && line.queued ? "line-clamp-3" : "truncate",
          line.kind === "failed" && "text-danger",
        )}
      >
        {line.text}
      </span>
      {line.kind === "added" && (
        <button
          type="button"
          onClick={() => void undo()}
          aria-keyshortcuts="Meta+Z"
          className="shrink-0 rounded-xs font-medium text-text underline underline-offset-3 focus-visible:outline-2 focus-visible:outline-ring"
        >
          {t`Undo`}
        </button>
      )}
    </p>
  );

  return (
    // The window is the plate: macOS rounds its corners and draws its shadow.
    <div ref={root} className="flex flex-col bg-plate text-text">
      <div className="flex h-14 items-center gap-2 ps-4.5 pe-3">
        <input
          ref={input}
          // biome-ignore lint/a11y/noAutofocus: the panel opens to type a term, like Spotlight
          autoFocus
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setPicking(false);
            if (line?.kind !== "added") setLine(null);
          }}
          onKeyDown={onKeyDown}
          placeholder={signedOut ? t`Sign in to add cards` : t`Add a card`}
          aria-label={t`Term`}
          spellCheck={false}
          autoComplete="off"
          dir="auto"
          className="min-w-0 flex-1 bg-transparent text-xl font-medium outline-none placeholder:font-normal placeholder:text-faint"
        />
        {target && (
          <button
            type="button"
            onClick={() => (picking ? closeList() : openList())}
            onKeyDown={(e) => {
              if (e.key !== "ArrowDown") return;
              e.preventDefault();
              openList();
            }}
            aria-haspopup="listbox"
            aria-expanded={picking}
            aria-controls={picking ? listId : undefined}
            aria-label={t`Deck: ${{ deckName: isolate(deckName) }}`}
            className="flex min-w-0 max-w-48 shrink-0 items-center gap-1 rounded-xs px-1.5 py-0.5 text-sm text-muted hoverable:hover:bg-hover focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span className="truncate">{deckName}</span>
            <ChevronsUpDown aria-hidden className="size-3.5 shrink-0 opacity-70" />
          </button>
        )}
      </div>
      {picking && (
        <div
          ref={list}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-label={t`Deck`}
          aria-activedescendant={`${listId}-${active}`}
          onKeyDown={onListKeyDown}
          onBlur={(e) => {
            if (!root.current?.contains(e.relatedTarget)) setPicking(false);
          }}
          className="flex max-h-56 flex-col overflow-y-auto border-t border-edge p-1.5 outline-none"
        >
          {own.map((d, i) => (
            // biome-ignore lint/a11y/useKeyWithClickEvents: the listbox takes the keys, as aria-activedescendant expects
            <div
              key={d.id}
              id={`${listId}-${i}`}
              role="option"
              tabIndex={-1}
              aria-selected={d.id === target?.id}
              onClick={() => pick(d.id)}
              onMouseMove={() => setActive(i)}
              className={clsx(
                "flex cursor-default items-center gap-2 rounded-sm px-2.5 py-1.5 text-md",
                i === active && "bg-hover",
              )}
            >
              <span className="min-w-0 flex-1 truncate">{d.name}</span>
              {d.id === target?.id && <Check aria-hidden className="size-4 text-text-2" />}
            </div>
          ))}
        </div>
      )}
      {!picking && (status || signedOut || noDeck) && (
        <div className="border-t border-edge px-4.5 py-2.5">
          {status || (
            <p className="text-sm text-text-2">
              {signedOut
                ? t`Open Lymi to sign in`
                : t`Make a deck in Lymi first. Enter opens Library.`}
            </p>
          )}
        </div>
      )}
      {/* Mounted from the start, so a screen reader announces each line as it changes. */}
      <p role="status" className="sr-only">
        {line?.text ?? ""}
      </p>
    </div>
  );
}
