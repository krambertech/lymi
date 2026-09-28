import { Trans, useLingui } from "@lingui/react/macro";
import { ChevronLeft, ChevronRight, List } from "lucide-react";
import {
  type MouseEvent,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Shelf } from "../../lib/explore";
import { shelfLabel } from "./explore-labels";

export const shelfId = (key: string) => `shelf-${key}`;

const still = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The shelf whose heading has passed under the bar, or null while the bar is still above the first. */
function useCurrentShelf(keys: readonly string[], bar: RefObject<HTMLElement | null>) {
  const [current, setCurrent] = useState<string | null>(null);
  const [stuck, setStuck] = useState(false);
  // A shelf just jumped to stays chosen while its heading is on screen, even when the page ends
  // before the heading can reach the bar.
  const picked = useRef<{ key: string; seen: boolean } | null>(null);
  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const box = bar.current?.getBoundingClientRect();
      if (!box) return;
      // The bar is stuck once its top meets the viewport's, less the notch it keeps clear of.
      const isStuck =
        box.top <= Number.parseFloat(getComputedStyle(bar.current as Element).top) + 1;
      setStuck(isStuck);
      const pick = picked.current;
      const target = pick && document.getElementById(shelfId(pick.key));
      if (pick && target) {
        const top = target.getBoundingClientRect().top;
        const visible = top >= box.top && top < window.innerHeight;
        // Chosen while the page travels to it and while it stays on screen after.
        if (visible) pick.seen = true;
        if (visible || !pick.seen) {
          setCurrent(pick.key);
          return;
        }
      }
      picked.current = null;
      // Until the bar meets the top, the reader is still above the shelves.
      if (!isStuck) {
        setCurrent(null);
        return;
      }
      const line = box.bottom + 48;
      let found: string | null = null;
      for (const key of keys) {
        const heading = document.getElementById(shelfId(key));
        if (heading && heading.getBoundingClientRect().top <= line) found = key;
      }
      setCurrent(found);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [keys, bar]);
  const pick = useCallback((key: string) => {
    picked.current = { key, seen: false };
    setCurrent(key);
  }, []);
  return { current, stuck, pick };
}

/** Whether the strip has chips past its start or end edge, which decides the fade and the arrows. */
function useStripEdges(strip: RefObject<HTMLUListElement | null>, count: number) {
  const [edges, setEdges] = useState({ start: false, end: false });
  useEffect(() => {
    const node = strip.current;
    // Search changes how many chips there are, which moves the end edge without resizing the strip.
    if (!node || count === 0) return;
    const read = () => {
      // Negative in a right-to-left strip, so the distance is measured either way.
      const scrolled = Math.abs(node.scrollLeft);
      setEdges({ start: scrolled > 1, end: scrolled + node.clientWidth < node.scrollWidth - 1 });
    };
    read();
    node.addEventListener("scroll", read, { passive: true });
    const size = new ResizeObserver(read);
    size.observe(node);
    return () => {
      node.removeEventListener("scroll", read);
      size.disconnect();
    };
  }, [strip, count]);
  return edges;
}

const chipClass =
  "inline-flex h-10 items-center gap-2 rounded-full whitespace-nowrap px-4 text-md font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring pointer-coarse:h-11";

/**
 * The shelves as one line that stays at the top while the page scrolls, with the shelf in view
 * chosen and a list of every shelf behind the first button. Without JavaScript each chip is a link
 * to its shelf's heading and the list still opens, because it is a native popover.
 */
export function ShelfBar({ shelves }: { shelves: readonly Shelf[] }) {
  const { i18n, t } = useLingui();
  const bar = useRef<HTMLElement>(null);
  const row = useRef<HTMLUListElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const listId = useId();
  const keys = useMemo(() => shelves.map((shelf) => shelf.key), [shelves]);
  const { current, stuck, pick } = useCurrentShelf(keys, bar);
  const edges = useStripEdges(row, shelves.length);

  useEffect(() => {
    const strip = row.current;
    const chip = current ? strip?.querySelector<HTMLElement>(`[data-shelf="${current}"]`) : null;
    const item = chip?.parentElement;
    if (!strip || !item) return;
    const hidden =
      item.offsetLeft < strip.scrollLeft ||
      item.offsetLeft + item.offsetWidth > strip.scrollLeft + strip.clientWidth;
    if (hidden)
      strip.scrollTo({ left: item.offsetLeft - 24, behavior: still() ? "auto" : "smooth" });
  }, [current]);

  const jump = (event: MouseEvent<HTMLAnchorElement>, key: string) => {
    const heading = document.getElementById(shelfId(key));
    if (!heading) return;
    event.preventDefault();
    pick(key);
    if (list.current?.matches(":popover-open")) list.current.hidePopover();
    heading.scrollIntoView({ block: "start", behavior: still() ? "auto" : "smooth" });
    // Reading moves with the view, so a screen reader continues at the shelf rather than the bar.
    heading.focus({ preventScroll: true });
  };
  const nudge = (direction: 1 | -1) => {
    const strip = row.current;
    strip?.scrollBy({
      left: direction * strip.clientWidth * 0.7,
      behavior: still() ? "auto" : "smooth",
    });
  };

  const languages = shelves
    .filter((shelf) => shelf.language)
    .map((shelf) => ({ shelf, label: shelfLabel(i18n, shelf) }))
    .sort((a, b) => a.label.localeCompare(b.label, i18n.locale));
  const others = shelves
    .filter((shelf) => !shelf.language)
    .map((shelf) => ({ shelf, label: shelfLabel(i18n, shelf) }));

  const listLink = ({ shelf, label }: { shelf: Shelf; label: string }) => (
    <li key={shelf.key} className="break-inside-avoid">
      <a
        href={`#${shelfId(shelf.key)}`}
        onClick={(event) => jump(event, shelf.key)}
        className="flex min-h-10 items-center justify-between gap-3 rounded-sm px-2.5 text-md font-medium text-text transition-colors duration-150 hoverable:hover:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring pointer-coarse:min-h-12"
      >
        {label}
        <span className="text-sm font-normal text-muted tabular-nums">{shelf.decks.length}</span>
      </a>
    </li>
  );

  return (
    <nav
      ref={bar}
      aria-label={t`Shelves`}
      className={`sticky top-[env(safe-area-inset-top,0px)] z-(--z-sticky) -mx-5 mt-6 bg-canvas px-5 transition-shadow duration-150 @2xl:-mx-10 @2xl:px-10 ${stuck ? "shadow-[0_1px_0_var(--edge)]" : ""}`}
    >
      <div className="flex items-center gap-2 py-2.5">
        <button
          type="button"
          popoverTarget={listId}
          className={`${chipClass} shrink-0 bg-transparent text-text shadow-[inset_0_0_0_1px_var(--edge-2)] hoverable:hover:bg-hover`}
        >
          <List aria-hidden="true" className="size-4 text-muted" />
          <Trans>All shelves</Trans>
        </button>
        <span aria-hidden="true" className="h-6 w-px shrink-0 bg-edge-2" />
        <ul
          ref={row}
          data-fade={edges.end || undefined}
          className="shelf-strip relative flex min-w-0 flex-1 gap-2 overflow-x-auto"
        >
          {shelves.map((shelf) => {
            const on = shelf.key === current;
            return (
              <li key={shelf.key}>
                <a
                  href={`#${shelfId(shelf.key)}`}
                  data-shelf={shelf.key}
                  aria-current={on ? "location" : undefined}
                  onClick={(event) => jump(event, shelf.key)}
                  className={`${chipClass} ${on ? "bg-text text-canvas" : "bg-plate-2 text-text hoverable:hover:bg-hover active:bg-hover"}`}
                >
                  {shelfLabel(i18n, shelf)}
                  <span className={`text-sm tabular-nums ${on ? "text-canvas/60" : "text-muted"}`}>
                    {shelf.decks.length}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
        <span
          className={`hidden shrink-0 gap-1.5 ${edges.start || edges.end ? "pointer-fine:@2xl:flex" : ""}`}
        >
          <button
            type="button"
            onClick={() => nudge(-1)}
            aria-label={t`Earlier shelves`}
            className="grid size-9 place-items-center rounded-full bg-plate text-text edge transition-colors duration-150 hoverable:hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ChevronLeft aria-hidden="true" className="size-4 rtl:-scale-x-100" />
          </button>
          <button
            type="button"
            onClick={() => nudge(1)}
            aria-label={t`Later shelves`}
            className="grid size-9 place-items-center rounded-full bg-plate text-text edge transition-colors duration-150 hoverable:hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ChevronRight aria-hidden="true" className="size-4 rtl:-scale-x-100" />
          </button>
        </span>
      </div>
      <div
        ref={list}
        id={listId}
        popover="auto"
        role="dialog"
        className="shelf-list"
        aria-label={t`All shelves`}
      >
        <p className="px-2.5 pt-3 pb-1 text-sm text-muted">
          <Trans>Languages</Trans>
        </p>
        <ul className="shelf-list-columns">{languages.map(listLink)}</ul>
        {others.length > 0 && (
          <>
            <p className="px-2.5 pt-4 pb-1 text-sm text-muted">
              <Trans>Subjects</Trans>
            </p>
            <ul className="shelf-list-columns">{others.map(listLink)}</ul>
          </>
        )}
      </div>
    </nav>
  );
}
