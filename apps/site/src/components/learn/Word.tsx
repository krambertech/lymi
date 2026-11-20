import { useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import {
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
import { playSound, usePlaying } from "../../lib/learn/player";
import { useWord } from "./lesson-context";
import { PlayButton } from "./Sound";

/** How long a pointer rests on a word before its card opens, so reading past one doesn't cover the text. */
const OPEN_AFTER_MS = 500;
const CLOSE_AFTER_MS = 300;

interface Open {
  word: string;
  anchor: HTMLElement;
  /** A tap or click keeps it open until the visitor clicks elsewhere. */
  pinned: boolean;
}

interface CardControl {
  openAfter: (word: string, anchor: HTMLElement) => void;
  openNow: (word: string, anchor: HTMLElement) => void;
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
      timer.current = setTimeout(() => setOpen({ word, anchor, pinned: false }), OPEN_AFTER_MS);
    },
    [clear],
  );
  const openNow = useCallback(
    (word: string, anchor: HTMLElement) => {
      clear();
      setOpen({ word, anchor, pinned: true });
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
      setOpen(null);
      open.anchor.focus();
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
}: {
  open: Open;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const { i18n, t } = useLingui();
  const { gloss, src, show } = useWord(open.word);
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

  return (
    <div
      id="learn-card"
      ref={ref}
      role="dialog"
      aria-label={show}
      data-open={shown && place ? "" : undefined}
      data-below={place?.below ? "" : undefined}
      style={{ top: place?.top ?? -9999, left: place?.left ?? 0 }}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      className="learn-card grid gap-1.5 rounded-lg bg-plate p-3.5 pt-3 ring-1 ring-edge"
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
      {gloss && <p className="text-md text-ink">{i18n._(gloss.en)}</p>}
      {gloss?.note && <p className="text-sm text-ink-muted">{i18n._(gloss.note)}</p>}
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
      data-playing={playing ? "" : undefined}
      className={clsx("learn-word")}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") cards?.openAfter(w, event.currentTarget);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") cards?.closeSoon();
      }}
      onClick={(event) => {
        cards?.openNow(w, event.currentTarget);
        if (src) void playSound(src);
      }}
    >
      {w}
    </button>
  );
}
