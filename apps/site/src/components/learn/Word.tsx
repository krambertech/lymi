import { useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import {
  type CSSProperties,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { lessonBySlug } from "../../lib/learn/catalogue";
import { playSound, usePlaying } from "../../lib/learn/player";
import { useLesson, useWord } from "./lesson-context";
import { PlayButton } from "./Sound";

/** How long a pointer rests on a word before its card opens, so reading past one doesn't cover the text. */
const OPEN_AFTER_MS = 500;
const CLOSE_AFTER_MS = 300;

interface Open {
  word: string;
  anchor: HTMLElement;
  /** A tap or click keeps it open until the visitor clicks elsewhere. */
  pinned: boolean;
  /** Opened with Enter or Space: focus moves into the card and back to the word when it closes. */
  keyboard: boolean;
}

interface CardControl {
  openAfter: (word: string, anchor: HTMLElement) => void;
  openNow: (word: string, anchor: HTMLElement, keyboard: boolean) => void;
  closeSoon: () => void;
  open: Open | null;
}

const CardContext = createContext<CardControl | null>(null);

/** One word card for the whole lesson, opened by whichever word asks. */
export function WordCards({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<Open | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const clear = useCallback(() => clearTimeout(timer.current), []);

  const openAfter = useCallback(
    (word: string, anchor: HTMLElement) => {
      clear();
      timer.current = setTimeout(
        () => setOpen({ word, anchor, pinned: false, keyboard: false }),
        OPEN_AFTER_MS,
      );
    },
    [clear],
  );
  const openNow = useCallback(
    (word: string, anchor: HTMLElement, keyboard: boolean) => {
      clear();
      setOpen({ word, anchor, pinned: true, keyboard });
    },
    [clear],
  );
  const closeSoon = useCallback(() => {
    clear();
    timer.current = setTimeout(
      () => setOpen((current) => (current?.pinned ? current : null)),
      CLOSE_AFTER_MS,
    );
  }, [clear]);

  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!open.anchor.contains(target) && !document.getElementById("learn-card")?.contains(target))
        setOpen(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const focusInside = !!document.getElementById("learn-card")?.contains(document.activeElement);
      setOpen(null);
      // Only a card the visitor opened or is in hands focus back; a hover card leaves it alone.
      if (open.pinned || focusInside) open.anchor.focus();
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  useEffect(() => clear, [clear]);

  return (
    <CardContext.Provider value={{ openAfter, openNow, closeSoon, open }}>
      {children}
      {open &&
        createPortal(
          <Card
            open={open}
            onEnter={clear}
            onLeave={() => {
              if (!open.pinned) closeSoon();
            }}
            onFocusOut={() => {
              setOpen(null);
              open.anchor.focus();
            }}
          />,
          document.body,
        )}
    </CardContext.Provider>
  );
}

function Card({
  open,
  onEnter,
  onLeave,
  onFocusOut,
}: {
  open: Open;
  onEnter: () => void;
  onLeave: () => void;
  /** Tab moved past the card's last control. */
  onFocusOut: () => void;
}) {
  const { i18n, t } = useLingui();
  const { gloss, src, show } = useWord(open.word);
  // The card is portalled out of the lesson, so it carries the lesson's hue itself.
  const hue = lessonBySlug(useLesson().slug)?.stage.hue;
  const ref = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ top: number; left: number; below: boolean } | null>(null);
  const [shown, setShown] = useState(false);

  useLayoutEffect(() => {
    const measure = () => {
      const card = ref.current;
      if (!card) return;
      const r = open.anchor.getBoundingClientRect();
      let top = r.top - card.offsetHeight - 10;
      const below = top < 8;
      if (below) top = r.bottom + 10;
      const left = Math.min(
        Math.max(16, r.left + r.width / 2 - card.offsetWidth / 2),
        innerWidth - card.offsetWidth - 16,
      );
      setPlace({ top, left, below });
    };
    measure();
    addEventListener("scroll", measure, { passive: true });
    addEventListener("resize", measure);
    return () => {
      removeEventListener("scroll", measure);
      removeEventListener("resize", measure);
    };
  }, [open.anchor]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  // Focus the card once, when it is first placed; scrolling re-places it but must not pull focus back.
  const placed = !!place;
  useEffect(() => {
    if (open.keyboard && placed) ref.current?.focus({ preventScroll: true });
  }, [open.keyboard, placed]);

  return (
    <div
      id="learn-card"
      ref={ref}
      role="dialog"
      aria-label={show}
      aria-describedby={gloss ? "learn-card-meaning" : undefined}
      tabIndex={-1}
      onBlur={(event) => {
        if (open.keyboard && !event.currentTarget.contains(event.relatedTarget)) onFocusOut();
      }}
      data-open={shown && place ? "" : undefined}
      data-below={place?.below ? "" : undefined}
      style={{ top: place?.top ?? -9999, left: place?.left ?? 0, "--h": hue } as CSSProperties}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      className="learn learn-card grid gap-1.5 rounded-lg bg-plate p-3.5 pt-3 ring-1 ring-edge outline-none"
    >
      <div className="flex items-center gap-2.5">
        <span
          lang="et"
          className="me-auto min-w-0 text-2xl font-semibold tracking-tight wrap-anywhere"
        >
          {show}
        </span>
        {src && <PlayButton src={src} label={t`Play ${show}`} />}
      </div>
      {gloss && (
        <div id="learn-card-meaning" className="grid gap-1.5">
          <p className="text-md text-ink">{i18n._(gloss.en)}</p>
          {gloss.note && <p className="text-sm text-ink-muted">{i18n._(gloss.note)}</p>}
        </div>
      )}
    </div>
  );
}

interface WordProps {
  /** The word as it appears, which is also its glossary key in lower case. */
  w: string;
}

/**
 * An Estonian word in a lesson's prose. Resting on it opens its card; a tap or click plays it and
 * keeps the card open. Written `<Word w="kõrv" />` inside `<Trans>`, so a translation can move the
 * word but never change it.
 */
export function Word({ w }: WordProps) {
  const cards = useContext(CardContext);
  const { src } = useWord(w);
  const playing = usePlaying(src ?? "");
  const id = useId();
  const expanded = cards?.open?.anchor.dataset.word === id;
  return (
    <button
      type="button"
      lang="et"
      data-word={id}
      aria-haspopup="dialog"
      aria-expanded={expanded}
      aria-controls={expanded ? "learn-card" : undefined}
      data-playing={playing ? "" : undefined}
      className={clsx("learn-word")}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") cards?.openAfter(w, event.currentTarget);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") cards?.closeSoon();
      }}
      onClick={(event) => {
        cards?.openNow(w, event.currentTarget, event.detail === 0);
        if (src) void playSound(src);
      }}
    >
      {w}
    </button>
  );
}
