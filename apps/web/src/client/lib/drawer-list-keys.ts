import { type KeyboardEvent, type RefObject, useCallback, useRef } from "react";

interface Options {
  /** Selector for the rows inside `ref`. */
  items: string;
  /** Whether ArrowDown on the last row wraps to the first. Menus wrap; a select stops. */
  loop: boolean;
  /** Whether typing letters jumps to the row whose text starts with them. */
  typeahead?: boolean | undefined;
  /** Tab leaves the list, and the caller closes it. */
  onLeave: () => void;
}

/**
 * The anchored popup's keyboard model for its drawer shape, on a touch device with a keyboard
 * attached: rows are out of the tab order, the arrows and Home and End move focus between them,
 * and Tab leaves. Disabled rows are walked too, so a screen reader still hears them.
 */
export function useDrawerListKeyDown(
  ref: RefObject<HTMLElement | null>,
  { items, loop, typeahead = false, onLeave }: Options,
) {
  const typed = useRef({ text: "", at: 0 });
  return useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        onLeave();
        return;
      }
      const rows = Array.from(ref.current?.querySelectorAll<HTMLElement>(items) ?? []);
      if (rows.length === 0) return;
      const i = rows.indexOf(document.activeElement as HTMLElement);
      const last = rows.length - 1;
      let to: HTMLElement | undefined;
      if (e.key === "ArrowDown") to = rows[loop ? (i + 1) % rows.length : Math.min(i + 1, last)];
      else if (e.key === "ArrowUp")
        to = rows[loop ? (i - 1 + rows.length) % rows.length : Math.max(i - 1, 0)];
      else if (e.key === "Home") to = rows[0];
      else if (e.key === "End") to = rows[last];
      else if (
        typeahead &&
        e.key.length === 1 &&
        e.key !== " " &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        // Letters typed within 600 ms of each other spell one name; a single letter walks the matches.
        const now = Date.now();
        const text = (now - typed.current.at < 600 ? typed.current.text : "") + e.key.toLowerCase();
        typed.current = { text, at: now };
        const from = text.length === 1 ? i + 1 : Math.max(i, 0);
        const order = rows.map((_, k) => rows[(k + from) % rows.length] as HTMLElement);
        to = order.find((row) => row.textContent?.trim().toLowerCase().startsWith(text));
      }
      if (to) {
        e.preventDefault();
        to.focus();
      }
    },
    [ref, items, loop, typeahead, onLeave],
  );
}
