import { Trans } from "@lingui/react/macro";
import { Volume2 } from "lucide-react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useStill } from "../landing/playback";

const EXAMPLES: { lang: string; sentence: ReactNode; translation: ReactNode }[] = [
  {
    lang: "es",
    sentence: "Abre la ventana, por favor.",
    translation: <Trans>Open the window, please.</Trans>,
  },
  {
    lang: "ja",
    sentence: (
      <>
        毎朝パンを
        <ruby>
          食<rt className="text-[0.6em] font-normal text-ink-secondary">た</rt>
        </ruby>
        べる。
      </>
    ),
    translation: <Trans>I eat bread every morning.</Trans>,
  },
  {
    lang: "uk",
    sentence: "За́мок стої́ть на горі́.",
    translation: <Trans>The castle stands on a hill.</Trans>,
  },
];

/** Examples in three languages dealt one after another, each with its play button and translation. */
export function ExampleFigure() {
  const root = useRef<HTMLDivElement>(null);
  const still = useStill();
  const inView = useInView(root, { amount: 0.4 });
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (still || !inView) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % EXAMPLES.length), 2800);
    return () => window.clearInterval(timer);
  }, [still, inView]);

  const example = EXAMPLES[index];
  if (!example) return null;
  return (
    <div ref={root} aria-hidden="true" className="relative mx-auto h-56 max-w-[420px]">
      <div className="absolute inset-x-8 -top-3 h-44 -rotate-6 rounded-xl bg-plate-nested edge" />
      <div className="absolute inset-x-4 -top-1 h-44 rotate-4 rounded-xl bg-plate-hover edge" />
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 24, rotate: 3 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          exit={{ opacity: 0, y: -24, rotate: -4 }}
          transition={{ type: "spring", duration: 0.6, bounce: 0.14 }}
          className="absolute inset-x-0 top-5 grid gap-2 rounded-xl bg-plate p-6 edge-strong shadow-[0_12px_32px_-12px_oklch(0.2_0.03_60/0.35)]"
        >
          <p
            lang={example.lang}
            className="flex items-center gap-3 text-[1.625rem] font-medium text-ink"
          >
            <span className="min-w-0 flex-1 leading-relaxed">{example.sentence}</span>
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-amber text-amber-ink">
              <Volume2 className="size-5" />
            </span>
          </p>
          <p className="text-lg text-ink-secondary">{example.translation}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
