import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type CSSProperties,
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { buttonClass } from "../Button";
import type { FieldLanguage, WordFrame } from "./hero-words";

/** Long enough to read the language's name and glance at a word or two. */
const FRAME_MS = 3400;
const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Places around the headline, in percent of the hero, listed clockwise so every other slot is an
 * even spread. Depths repeat near, near, far, far, middle, middle, so every other slot mixes all three. `x`/`y` are for a wide hero; `mx`/`my` keep a phone's words above and below the copy.
 */
const SLOTS = [
  { x: 20, y: 12, mx: 18, my: 8, size: "text-5xl", depth: 0.6 },
  { x: 50, y: 7, mx: 50, my: 13, size: "text-4xl", depth: 0.55 },
  { x: 80, y: 13, mx: 80, my: 7, size: "text-xl", depth: 0.28 },
  { x: 93, y: 34, mx: 70, my: 15, size: "text-2xl", depth: 0.32 },
  { x: 87, y: 57, mx: 82, my: 88, size: "text-3xl", depth: 0.45 },
  { x: 93, y: 79, mx: 58, my: 94, size: "text-3xl", depth: 0.45 },
  { x: 76, y: 90, mx: 30, my: 90, size: "text-5xl", depth: 0.6 },
  { x: 50, y: 94, mx: 20, my: 95, size: "text-4xl", depth: 0.55 },
  { x: 24, y: 89, mx: 45, my: 86, size: "text-xl", depth: 0.28 },
  { x: 7, y: 77, mx: 12, my: 91, size: "text-2xl", depth: 0.32 },
  { x: 13, y: 55, mx: 88, my: 93, size: "text-3xl", depth: 0.45 },
  { x: 7, y: 33, mx: 35, my: 10, size: "text-3xl", depth: 0.45 },
] as const;

/** The headline's language is the one moving part inside it, keyed by the frame's language. */
const FrameKey = createContext<{ language: string; animate: boolean }>({
  language: "",
  animate: false,
});

function Word({ children }: { children?: ReactNode }) {
  const still = useReducedMotion();
  const { language, animate } = useContext(FrameKey);
  const text = typeof children === "string" ? children : null;
  return (
    <span className="relative block text-amber-text">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={language}
          className="block"
          exit={still ? { opacity: 0 } : { opacity: 0, y: "-0.45em", filter: "blur(10px)" }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          {text && animate && !still
            ? Array.from(text).map((char, i) => (
                <motion.span
                  // biome-ignore lint/suspicious/noArrayIndexKey: a letter's place in the word is its identity
                  key={i}
                  className="inline-block whitespace-pre"
                  initial={{ opacity: 0, y: "0.55em", filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.6, ease: EASE, delay: 0.12 + i * 0.035 }}
                >
                  {char}
                </motion.span>
              ))
            : children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Headline({ language }: { language: FieldLanguage }) {
  switch (language) {
    case "es":
      return (
        <Trans>
          Keep what you learn in <Word>Spanish.</Word>
        </Trans>
      );
    case "ja":
      return (
        <Trans>
          Keep what you learn in <Word>Japanese.</Word>
        </Trans>
      );
    case "fr":
      return (
        <Trans>
          Keep what you learn in <Word>French.</Word>
        </Trans>
      );
    case "de":
      return (
        <Trans>
          Keep what you learn in <Word>German.</Word>
        </Trans>
      );
    case "et":
      return (
        <Trans>
          Keep what you learn in <Word>Estonian.</Word>
        </Trans>
      );
    case "ko":
      return (
        <Trans>
          Keep what you learn in <Word>Korean.</Word>
        </Trans>
      );
    case "it":
      return (
        <Trans>
          Keep what you learn in <Word>Italian.</Word>
        </Trans>
      );
    case "pt":
      return (
        <Trans>
          Keep what you learn in <Word>Portuguese.</Word>
        </Trans>
      );
    case "fi":
      return (
        <Trans>
          Keep what you learn in <Word>Finnish.</Word>
        </Trans>
      );
    case "uk":
      return (
        <Trans>
          Keep what you learn in <Word>Ukrainian.</Word>
        </Trans>
      );
    case "zh":
      return (
        <Trans>
          Keep what you learn in <Word>Chinese.</Word>
        </Trans>
      );
    case "tr":
      return (
        <Trans>
          Keep what you learn in <Word>Turkish.</Word>
        </Trans>
      );
    case "ar":
      return (
        <Trans>
          Keep what you learn in <Word>Arabic.</Word>
        </Trans>
      );
  }
}

interface Props {
  frames: WordFrame[];
  /** What a screen reader hears instead of the headline that keeps changing. */
  label: string;
  lede: ReactNode;
}

/**
 * A centred headline with words drifting behind it. It only illustrates: the frames change on a
 * timer, nothing else on the page follows them, the words lean away from the pointer, and a
 * pointer on a word shows its meaning and holds the frame. Reduced motion keeps the first frame.
 */
export function WordFieldHero({ frames, label, lede }: Props) {
  const { i18n } = useLingui();
  const still = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const [inView, setInView] = useState(true);
  const frame = frames[index % frames.length] as WordFrame;
  const changes = frames.length > 1 && !still && !held && inView;

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(!!entry?.isIntersecting), {
      threshold: 0.3,
    });
    observer.observe(el);
    if (still) return () => observer.disconnect();
    // Written straight to CSS variables, so following the pointer never re-renders React.
    let frameRequest = 0;
    const lean = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      cancelAnimationFrame(frameRequest);
      frameRequest = requestAnimationFrame(() => {
        const box = el.getBoundingClientRect();
        field.current?.style.setProperty("--px", `${((e.clientX - box.left) / box.width) * 2 - 1}`);
        field.current?.style.setProperty("--py", `${((e.clientY - box.top) / box.height) * 2 - 1}`);
      });
    };
    el.addEventListener("pointermove", lean);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameRequest);
      el.removeEventListener("pointermove", lean);
    };
  }, [still]);

  useEffect(() => {
    if (!changes) return;
    const next = window.setInterval(() => setIndex((i) => i + 1), FRAME_MS);
    return () => window.clearInterval(next);
  }, [changes]);

  return (
    <div
      ref={root}
      className="relative isolate mx-auto flex min-h-[800px] max-w-[1280px] items-center justify-center overflow-hidden px-5 py-40 @2xl:px-10 @3xl:min-h-[700px] @3xl:py-28 @4xl:min-h-[780px]"
    >
      <div ref={field} aria-hidden="true" className="word-field absolute inset-0 -z-10">
        <AnimatePresence>
          {frame.words.map((word, i) => {
            const slot = SLOTS[(index * 5 + i * 2) % SLOTS.length] as (typeof SLOTS)[number];
            return (
              <motion.span
                key={`${index}-${word.term}`}
                lang={frame.language}
                dir="auto"
                initial={still ? false : { opacity: 0, filter: "blur(14px)", scale: 0.8, y: 18 }}
                animate={{ opacity: 1, filter: "blur(0px)", scale: 1, y: 0 }}
                exit={{ opacity: 0, filter: "blur(14px)", scale: 1.12, y: -14 }}
                transition={{
                  duration: 1.1,
                  ease: EASE,
                  delay: still ? 0 : 0.15 + i * 0.09,
                }}
                onPointerEnter={() => setHeld(true)}
                onPointerLeave={() => setHeld(false)}
                className={clsx(
                  "floating-word group absolute -translate-1/2 font-medium tracking-[-0.02em] whitespace-nowrap text-text",
                  slot.size,
                  "@max-3xl:text-2xl!",
                )}
                style={
                  {
                    "--x": `${slot.x}%`,
                    "--y": `${slot.y}%`,
                    "--mx": `${slot.mx}%`,
                    "--my": `${slot.my}%`,
                    "--depth": slot.depth,
                    "--wander": `${10 + ((i * 3 + index) % 6)}s`,
                    "--wander-delay": `${-((i * 1.7 + index) % 9)}s`,
                  } as CSSProperties
                }
              >
                <span className="floating-word-lean">
                  <span className={clsx("floating-word-term", slot.depth < 0.35 && "blur-[1.5px]")}>
                    {word.term}
                  </span>
                </span>
                <span className="pointer-events-none absolute start-1/2 top-full z-10 mt-2 -translate-x-1/2 rounded-sm bg-plate px-2.5 py-1 text-sm font-normal tracking-normal whitespace-nowrap text-text-2 opacity-0 edge transition-opacity duration-150 group-hover:opacity-100">
                  {i18n._(word.meaning)}
                </span>
              </motion.span>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="relative max-w-[780px] text-center">
        <h1 className="text-5xl font-medium tracking-[-0.038em] text-balance text-text @4xl:text-[4.5rem] @4xl:leading-[1.04]">
          <span className="sr-only">{label}</span>
          <span aria-hidden="true">
            <FrameKey.Provider value={{ language: frame.language, animate: index > 0 }}>
              <Headline language={frame.language} />
            </FrameKey.Provider>
          </span>
        </h1>
        <p className="mx-auto mt-7 max-w-[46ch] text-lg text-pretty text-text-2 @2xl:text-xl">
          {lede}
        </p>
        <div className="mt-9">
          <a href="#join" className={buttonClass("primary", "lg")}>
            <Trans>Request access</Trans>
          </a>
        </div>
        <p className="mt-3.5 text-sm text-muted">
          <Trans>Free during the private beta.</Trans>
        </p>
      </div>
    </div>
  );
}
