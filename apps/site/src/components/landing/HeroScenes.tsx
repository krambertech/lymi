import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Pick } from "./MaterialToCards";
import { EASE } from "./playback";

/** A word as the hero's card shows it, already in the page's language. */
export interface HeroWord {
  id: string;
  term: string;
  lang?: string | undefined;
  label: string;
  say?: string | undefined;
  meaning: string;
}

/** Draws the material, wrapping word `i` with `mark` wherever it appears. */
export type MarkedMaterial = (mark: (i: number, text: ReactNode) => ReactNode) => ReactNode;

/**
 * The material and its cards on one edgeless ground, the card overlapping the material's foot by a
 * fixed row so the pair holds together at every width. The material tilts a little, as paper does.
 */
export function HeroGround({
  material,
  children,
  frameRef,
}: {
  material: ReactNode;
  children: ReactNode;
  frameRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div className="hero-ground w-full max-w-[500px] py-4">
      <div ref={frameRef} className="relative grid grid-cols-12 grid-rows-[auto_6rem_auto]">
        <div className="relative col-span-9 col-start-1 row-span-2 row-start-1 -rotate-2">
          {material}
        </div>
        {children}
      </div>
    </div>
  );
}

/** One word per beat: it lights, lifts off as a small card, and grows into the top card. */
const CYCLE_MS = 3400;
const LIGHT_MS = 550;
const GROW_S = 0.75;

type Box = { x: number; y: number; w: number; h: number };

function within(el: Element | null | undefined, frame: DOMRect): Box | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left - frame.left, y: r.top - frame.top, w: r.width, h: r.height };
}

const TERM = "text-2xl leading-tight font-medium tracking-[-0.03em] text-text @lg:text-[1.75rem]";

function WordCard({
  word,
  termRef,
}: {
  word: HeroWord;
  termRef?: (el: HTMLElement | null) => void;
}) {
  return (
    <div className="flex h-full flex-col p-5 @2xl:p-6">
      <p className="text-xs tracking-[0.07em] text-muted uppercase">{word.label}</p>
      <p ref={termRef} lang={word.lang} className={`mt-2 text-balance hyphens-auto ${TERM}`}>
        {word.term}
      </p>
      {word.say && <p className="mt-1 text-sm text-muted">{word.say}</p>}
      <div className="mt-5 border-t border-edge pt-3">
        <p className="text-md text-pretty text-text-2">{word.meaning}</p>
      </div>
    </div>
  );
}

/**
 * The material, and beside it the card stack its words become. Each beat lights a word, which
 * lifts off as a small outlined card and grows into the top card. Reduced motion shows the last
 * word lit and on the card.
 */
export function HeroLiftOff({
  words,
  material,
  chip = "text-sm font-medium",
}: {
  words: HeroWord[];
  material: MarkedMaterial;
  /** Type for the word as it lifts off, so it leaves the material looking as it was written. */
  chip?: string;
}) {
  const still = useReducedMotion();
  const frame = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const term = useRef<HTMLElement | null>(null);
  const marks = useRef<(HTMLElement | null)[]>([]);
  const inView = useInView(frame, { amount: 0.3 });
  const [step, setStep] = useState(-1);
  const [landed, setLanded] = useState(words.length - 1);
  const [flight, setFlight] = useState<{
    key: number;
    i: number;
    from: Box;
    to: Box;
    /** Where the card's term sits inside the card, and how much smaller the word starts. */
    termAt: { x: number; y: number };
    scale: number;
  } | null>(null);

  useEffect(() => {
    if (still || !inView) return;
    const tick = () => setStep((s) => (s + 1) % words.length);
    const first = window.setTimeout(tick, 500);
    const every = window.setInterval(tick, CYCLE_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(every);
    };
  }, [inView, still, words.length]);

  useEffect(() => {
    if (step < 0) return;
    const timers = [
      window.setTimeout(() => {
        const f = frame.current?.getBoundingClientRect();
        const mark = marks.current[step];
        const from = f && within(mark, f);
        const to = f && within(card.current, f);
        const at = to && f && within(term.current, f);
        if (!from || !to || !at || !mark || !term.current) return;
        const size = (el: Element) => Number.parseFloat(getComputedStyle(el).fontSize);
        setFlight({
          key: Date.now(),
          i: step,
          from,
          to,
          termAt: { x: at.x - to.x, y: at.y - to.y },
          scale: size(mark) / size(term.current),
        });
      }, LIGHT_MS),
      window.setTimeout(() => setLanded(step), LIGHT_MS + GROW_S * 1000),
      window.setTimeout(() => setFlight(null), LIGHT_MS + GROW_S * 1000 + 40),
    ];
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, [step]);

  const lit = still ? words.length - 1 : step;
  const shown = words[still ? words.length - 1 : landed] ?? words[0];
  const flying = flight ? words[flight.i] : undefined;

  return (
    <HeroGround
      frameRef={frame}
      material={material((i, text) => (
        <span
          ref={(el) => {
            marks.current[i] = el;
          }}
          className="inline-block"
        >
          <Pick on={lit === i}>{text}</Pick>
        </span>
      ))}
    >
      <div className="relative col-span-8 col-start-5 row-span-2 row-start-2 mb-3">
        <div
          aria-hidden="true"
          className="absolute inset-x-3 top-3 -bottom-3 rounded-2xl bg-plate edge"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-1.5 top-1.5 -bottom-1.5 rounded-2xl bg-plate edge"
        />
        <div ref={card} className="relative grid min-h-[220px] rounded-2xl bg-plate edge">
          {/* Every word laid out unseen in the same cell, so the card is as tall as its longest
                word at this width and never changes size as words land. */}
          {words.map((word) => (
            <div key={word.id} aria-hidden="true" className="invisible col-start-1 row-start-1">
              <WordCard word={word} />
            </div>
          ))}
          <AnimatePresence initial={false}>
            {shown && (
              <motion.div
                key={shown.id}
                className="col-start-1 row-start-1"
                initial={false}
                exit={{ opacity: 0, transition: { duration: 0 } }}
              >
                <WordCard
                  word={shown}
                  termRef={(el) => {
                    term.current = el;
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {flight && flying && (
          <motion.div
            key={flight.key}
            aria-hidden="true"
            className="pointer-events-none absolute start-0 top-0 overflow-hidden bg-plate edge"
            initial={{
              x: flight.from.x,
              y: flight.from.y,
              width: flight.from.w,
              height: flight.from.h,
              borderRadius: 4,
              rotate: -2,
            }}
            animate={{
              x: flight.to.x,
              y: flight.to.y,
              width: flight.to.w,
              height: flight.to.h,
              borderRadius: 16,
              rotate: 0,
            }}
            exit={{ opacity: 0, transition: { duration: 0.22, ease: "easeOut" } }}
            // Across fast and down slow, so the word arcs onto the stack instead of sliding.
            transition={{
              duration: GROW_S,
              ease: EASE,
              y: { duration: GROW_S, ease: [0.55, 0, 0.3, 1] },
            }}
          >
            {/* The highlight it lifted off with, fading as it becomes a card. */}
            <motion.span
              className="absolute inset-0 bg-amber-soft"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: GROW_S * 0.8, ease: "easeOut" }}
            />
            {/* The word as written, handing over to the card's own type halfway. */}
            <motion.span
              lang={flying.lang}
              className={`absolute start-0 top-0 px-0.5 whitespace-nowrap text-text ${chip}`}
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{ x: flight.termAt.x, y: flight.termAt.y, opacity: 0 }}
              transition={{
                duration: GROW_S,
                ease: EASE,
                opacity: { delay: GROW_S * 0.3, duration: GROW_S * 0.25 },
              }}
            >
              {flying.term}
            </motion.span>
            <motion.span
              lang={flying.lang}
              className={`absolute start-0 top-0 origin-top-left whitespace-nowrap rtl:origin-top-right ${TERM}`}
              initial={{ x: 0, y: 0, scale: flight.scale, opacity: 0 }}
              animate={{ x: flight.termAt.x, y: flight.termAt.y, scale: 1, opacity: 1 }}
              transition={{
                duration: GROW_S,
                ease: EASE,
                opacity: { delay: GROW_S * 0.3, duration: GROW_S * 0.3 },
              }}
            >
              {flying.term}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </HeroGround>
  );
}
