import { chosenReview, type DeckRow } from "@lymi/client/deck-list";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Select cards on a card list: the chosen cards, Shift-click ranges, Escape to stop, and what
 * Review and Mark important would take from them. A deck page and a section page share it.
 */
export function useCardSelection(
  /** Every card in the deck, which Review reads the chosen ones from. */
  cards: readonly DeckRow[] | undefined,
  /** The cards the list shows, in its order; undefined until they load. */
  ordered: readonly DeckRow[] | undefined,
) {
  const [selected, setSelected] = useState<ReadonlySet<string> | null>(null);
  const anchor = useRef<string | null>(null);
  const orderedRef = useRef(ordered);
  orderedRef.current = ordered;
  // A chosen card the list stops showing, such as one unmarked under the Important filter, leaves the selection.
  useEffect(() => {
    if (!ordered) return;
    setSelected((prev) => {
      if (!prev) return prev;
      const here = new Set(ordered.map((r) => r.card.id));
      const kept = [...prev].filter((id) => here.has(id));
      return kept.length === prev.size ? prev : new Set(kept);
    });
  }, [ordered]);

  // Stable, so the memoised rows keep their props while one card's checkbox changes.
  const toggle = useCallback((id: string, range: boolean) => {
    setSelected((prev) => {
      const rows = orderedRef.current ?? [];
      const next = new Set(prev ?? []);
      const from = anchor.current ? rows.findIndex((r) => r.card.id === anchor.current) : -1;
      const to = rows.findIndex((r) => r.card.id === id);
      if (range && from >= 0 && to >= 0) {
        const on = !next.has(id);
        for (const row of rows.slice(Math.min(from, to), Math.max(from, to) + 1)) {
          if (on) next.add(row.card.id);
          else next.delete(row.card.id);
        }
      } else if (next.has(id)) next.delete(id);
      else next.add(id);
      anchor.current = id;
      return next;
    });
  }, []);
  const start = useCallback(() => setSelected(new Set()), []);
  const all = useCallback(
    () => setSelected(new Set((orderedRef.current ?? []).map((r) => r.card.id))),
    [],
  );
  const clear = useCallback(() => setSelected(new Set()), []);
  const stop = useCallback(() => {
    setSelected(null);
    anchor.current = null;
  }, []);

  // Escape leaves selection, unless something above the list has it.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      // A menu or dialog open over the list takes this Escape for itself; a toast is a dialog too, but never does.
      const overlay = document.querySelector(
        "[role='menu'], [role='dialog']:not([data-slot='toast'])",
      );
      if (e.key === "Escape" && !e.defaultPrevented && !overlay) stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, stop]);

  // Mark important marks them all unless every chosen card already has the mark.
  const unmarked = !!selected && !!cards?.some((r) => selected.has(r.card.id) && !r.card.important);
  // What Review takes from the selection: started cards not reviewed today, as the server counts them.
  const reviewable = useMemo(
    () => (selected && cards ? chosenReview(cards, selected, Date.now()) : []),
    [selected, cards],
  );

  return { selected, start, toggle, all, clear, stop, unmarked, reviewable };
}
