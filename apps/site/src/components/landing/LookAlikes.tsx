import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Volume2 } from "lucide-react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { EASE, useStill } from "./playback";
import type { LookAlike } from "./polish";

const BEAT_MS = 1500;
const FIRST_MS = 700;
const HOLD_MS = 8000;

interface Props {
  words: readonly LookAlike[];
  /** The reader's language, which the look-alikes and meanings are written in. */
  reader: string;
}

/**
 * A Polish word, the reader's word it looks like, then what it really means. The look-alike is
 * crossed out on the second beat, as a card's note would correct it.
 */
export function LookAlikes({ words, reader }: Props) {
  const { t } = useLingui();
  const still = useStill();
  const stage = useRef<HTMLDivElement>(null);
  const inView = useInView(stage, { amount: 0.3 });
  const [beat, setBeat] = useState(0);
  const heldUntil = useRef(0);
  const clip = useRef<HTMLAudioElement | null>(null);
  const at = Math.floor(beat / 2) % words.length;
  const revealed = still || beat % 2 === 1;
  const current = words[at] ?? words[0];

  useEffect(() => {
    if (still || !inView) return;
    const step = () => {
      if (Date.now() < heldUntil.current) return;
      setBeat((b) => b + 1);
    };
    const first = window.setTimeout(step, FIRST_MS);
    const timer = window.setInterval(step, BEAT_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [still, inView]);

  if (!current) return null;

  const play = () => {
    clip.current?.pause();
    clip.current = new Audio(`/audio/polish/${current.id}.mp3`);
    void clip.current.play().catch(() => {});
  };

  return (
    <div
      ref={stage}
      className="mt-12 rounded-2xl bg-plate-2 px-4 pt-10 pb-7 edge-inset @2xl:px-10 @2xl:pt-14 @4xl:mt-16"
    >
      <dl className="sr-only">
        {words.map((w) => (
          <div key={w.id}>
            <dt lang="pl">{w.term}</dt>
            <dd lang={reader}>
              {w.meaning}. <Trans>Looks like</Trans> {w.looksLike}.
            </dd>
          </div>
        ))}
      </dl>

      <div aria-hidden="true" className="grid justify-items-center">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.p
            key={current.id}
            lang="pl"
            initial={still ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8, transition: { duration: still ? 0 : 0.2 } }}
            transition={{ duration: 0.45, ease: EASE }}
            className="col-start-1 row-start-1 text-[clamp(64px,13cqw,152px)] leading-[1.1] font-medium tracking-[-0.03em] whitespace-nowrap text-text"
          >
            {current.term}
          </motion.p>
        </AnimatePresence>

        <div className="mt-6 grid w-full max-w-[560px] grid-cols-2 gap-px overflow-hidden rounded-xl bg-edge edge">
          <div className="grid gap-1 bg-plate px-4 py-4 @2xl:px-6">
            <span className="text-sm text-muted">
              <Trans>Looks like</Trans>
            </span>
            <span
              lang={reader}
              className="relative w-fit text-2xl font-medium tracking-[-0.02em] text-text-2"
            >
              {current.looksLike}
              <motion.span
                initial={false}
                animate={{ scaleX: revealed ? 1 : 0 }}
                transition={{ duration: still ? 0 : 0.35, ease: EASE }}
                className="absolute inset-x-[-4px] top-1/2 h-[3px] origin-left rounded-full bg-amber-mark rtl:origin-right"
              />
            </span>
            <span lang="pl" className="text-sm text-muted">
              <Trans>in Polish</Trans> {current.inPolish}
            </span>
          </div>
          <div className="grid gap-1 bg-plate px-4 py-4 @2xl:px-6">
            <span className="text-sm text-muted">
              <Trans>Means</Trans>
            </span>
            <motion.span
              lang={reader}
              initial={false}
              animate={{ opacity: revealed ? 1 : 0, y: revealed ? 0 : 6 }}
              transition={{ duration: still ? 0 : 0.35, ease: EASE }}
              className="text-2xl font-medium tracking-[-0.02em] text-text"
            >
              {current.meaning}
            </motion.span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-1.5">
        <button
          type="button"
          onClick={play}
          aria-label={t`Hear ${current.term}`}
          className="me-2 inline-flex size-9 items-center justify-center rounded-full bg-plate text-text-2 edge hoverable:hover:text-text"
        >
          <Volume2 aria-hidden="true" className="size-4" />
        </button>
        {words.map((w, i) => (
          <button
            key={w.id}
            type="button"
            lang="pl"
            aria-pressed={i === at}
            onClick={() => {
              heldUntil.current = Date.now() + HOLD_MS;
              setBeat(i * 2 + 1);
            }}
            className={clsx(
              "relative h-9 rounded-full px-3.5 text-md text-muted transition-colors duration-200 hoverable:hover:text-text aria-pressed:text-text",
            )}
          >
            {i === at && (
              <motion.span
                layoutId="look-alike"
                transition={
                  still ? { duration: 0 } : { type: "spring", duration: 0.45, bounce: 0.15 }
                }
                className="absolute inset-0 rounded-full bg-plate edge"
              />
            )}
            <span className="relative">{w.term}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
