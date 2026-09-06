import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../components/Button";
import { SAMPLE_CARDS } from "./cards";
import { prefersReducedMotion } from "./motion";

/**
 * The four answers, with what each one costs. The intervals are the shape FSRS produces
 * for a card seen a few times; they are here to make the mechanic legible, not to promise
 * a schedule, so the page says nothing about them beyond what the buttons show.
 */
const GRADES = [
  { name: "Again", when: "10 min", said: "10 minutes" },
  { name: "Hard", when: "2 days", said: "2 days" },
  { name: "Good", when: "4 days", said: "4 days" },
  { name: "Easy", when: "9 days", said: "9 days" },
] as const;

const DECK = [SAMPLE_CARDS[0], SAMPLE_CARDS[3], SAMPLE_CARDS[1]].filter(
  (c): c is NonNullable<typeof c> => !!c,
);

const REST = "Pick one. The card tells you when it comes back.";

/**
 * One real review, done by the reader. Reveal the meaning, say how hard it was, and see
 * what that answer costs. This is the whole of spaced repetition in one control, which
 * beats the paragraph explaining it that nobody reads.
 */
export function ReviewDemo() {
  const [index, setIndex] = useState(0);
  // Open revealed, so the first frame shows the mechanic instead of a card face and a button.
  const [revealed, setRevealed] = useState(true);
  const [result, setResult] = useState(REST);
  const box = useRef<HTMLDivElement>(null);
  const card = DECK[index % DECK.length];

  const grade = useCallback((n: number) => {
    const g = GRADES[n];
    if (!g) return;
    setResult(`You said ${g.name}. This card comes back in ${g.said}.`);
    window.setTimeout(
      () => {
        setIndex((i) => i + 1);
        setRevealed(false);
      },
      prefersReducedMotion() ? 0 : 480,
    );
  }, []);

  // The app grades with 1 to 4 and reveals with Space. The demo answers to the same keys
  // while it has focus, so the shortcut is learned here rather than described later.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === " " && !revealed) {
        e.preventDefault();
        setRevealed(true);
        return;
      }
      const n = Number.parseInt(e.key, 10);
      if (revealed && n >= 1 && n <= 4) {
        e.preventDefault();
        grade(n - 1);
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [revealed, grade]);

  if (!card) return null;

  return (
    // biome-ignore lint/a11y/noNoninteractiveTabindex: the panel takes focus so 1-4 and Space work
    <div ref={box} tabIndex={0} className="rounded-md outline-offset-4">
      <div className="mx-auto flex max-w-[360px] items-center justify-between text-2xs tracking-[0.06em] text-faint uppercase">
        <span>Tonight</span>
        <span>{DECK.length - (index % DECK.length)} due</span>
      </div>

      <div className="mx-auto mt-3 max-w-[360px] rounded-md bg-plate p-6 text-center edge">
        <p className="text-2xs tracking-[0.07em] text-amber-text uppercase">{card.label}</p>
        <p className="mt-2 text-3xl font-medium tracking-[-0.03em] text-text">{card.term}</p>

        {revealed ? (
          <div className="mt-3 border-t border-edge pt-3">
            <p className="text-lg text-text-2">{card.meaning}</p>
            {card.example && <p className="mt-2 text-xs text-muted italic">{card.example}</p>}
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="mt-4 w-full border border-edge-2 border-dashed"
            onClick={() => setRevealed(true)}
          >
            Show the meaning
          </Button>
        )}

        <div className="mt-4 flex gap-1.5 transition-opacity duration-200">
          {GRADES.map((g, n) => (
            <button
              key={g.name}
              type="button"
              disabled={!revealed}
              onClick={() => grade(n)}
              className="flex flex-1 flex-col items-center gap-0.5 rounded-sm bg-plate-2 py-2 transition-[background-color,scale] duration-150 ease-out edge hoverable:hover:bg-hover active:scale-[0.97] disabled:pointer-events-none disabled:opacity-30"
            >
              <span className="text-sm font-medium text-text">{g.name}</span>
              <span className="text-2xs tabular-nums text-muted">{g.when}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="mx-auto mt-3 max-w-[360px] text-center text-xs text-muted" aria-live="polite">
        {result}
      </p>
      <button
        type="button"
        onClick={() => {
          setIndex(0);
          setRevealed(true);
          setResult(REST);
        }}
        className="mx-auto mt-2 block text-2xs tracking-[0.06em] text-faint uppercase transition-colors hoverable:hover:text-muted"
      >
        Start over
      </button>
    </div>
  );
}
