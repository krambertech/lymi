import { Trans } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Check } from "lucide-react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { FADE_CARDS as CARDS, FADE_TEXT as TEXT } from "./chinese";
import { EASE, useStill } from "./playback";

const MotionRt = motion.create("rt");
const HAN = /\p{Script=Han}/u;

const TWIST = CARDS.length;
const END = CARDS.length + 1;

const pairsOf = (cards: typeof CARDS) => {
  const pairs = new Set<string>();
  for (const c of cards) {
    const syl = c.pinyin.split(" ");
    for (const [i, ch] of Array.from(c.term).entries()) pairs.add(`${ch}|${syl[i]}`);
  }
  return pairs;
};

const Zh = ({ children }: { children: ReactNode }) => <span lang="zh-Hans">{children}</span>;

function Caption({ step }: { step: number }) {
  if (step === 0) return <Trans>At first, every character has pinyin.</Trans>;
  if (step >= END) return <Trans>The pinyin left is what you haven’t learned yet.</Trans>;
  if (step === TWIST)
    return (
      <Trans>
        You know <Zh>银行</Zh>. <Zh>行</Zh> loses háng in <Zh>行长</Zh> too, but keeps xíng in{" "}
        <Zh>不行</Zh>.
      </Trans>
    );
  const term = CARDS[step - 1]?.term ?? "";
  return (
    <Trans>
      You know <Zh>{term}</Zh>. Its pinyin goes from the examples on all your cards.
    </Trans>
  );
}

/** A short text whose pinyin leaves each character as the card that teaches it reaches Known. */
export function PinyinFade() {
  const still = useStill();
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root, { amount: 0.35 });
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (still) return setStep(END);
    // Off screen it starts over, so it plays again the next time it's scrolled to.
    if (!inView) return setStep(0);
    if (step >= END) return;
    const wait = step === 0 ? 1400 : step === TWIST ? 3200 : step === TWIST - 1 ? 1500 : 1050;
    const timer = window.setTimeout(() => setStep((n) => n + 1), wait);
    return () => window.clearTimeout(timer);
  }, [still, inView, step]);

  const knownCount = Math.min(step, CARDS.length);
  const pairs = pairsOf(CARDS.slice(0, knownCount));
  const fresh =
    step >= 1 && step <= CARDS.length ? pairsOf(CARDS.slice(step - 1, step)) : new Set<string>();
  const done = step >= END;
  let order = 0;

  return (
    <div ref={root} className="grid gap-8">
      <div lang="zh-Hans" className="grid gap-1">
        {TEXT.map((line) => {
          const syl = line.pinyin.split(" ");
          let han = 0;
          return (
            <p
              key={line.zh}
              className="text-[length:clamp(24px,5.2cqw,56px)] leading-[1.8] font-medium tracking-[0.02em] text-text"
            >
              {Array.from(line.zh).map((ch, i) => {
                // biome-ignore lint/suspicious/noArrayIndexKey: characters in a fixed order
                if (!HAN.test(ch)) return <span key={`${ch}${i}`}>{ch}</span>;
                const py = syl[han++] ?? "";
                const key = `${ch}|${py}`;
                const gone = pairs.has(key);
                const flash = fresh.has(key);
                const left = done && !gone;
                const stays = step >= TWIST && key === "行|xíng";
                const at = flash ? order++ : 0;
                return (
                  // biome-ignore lint/suspicious/noArrayIndexKey: characters in a fixed order
                  <ruby key={`${ch}${i}`}>
                    <span
                      className={clsx(
                        "rounded-[0.12em] transition-[background-color,color] duration-500 ease-out",
                        flash ? "bg-amber-soft" : "bg-transparent",
                        stays &&
                          step === TWIST &&
                          "shadow-[inset_0_0_0_1.5px_var(--color-amber-mark)]",
                      )}
                    >
                      {ch}
                    </span>
                    <MotionRt
                      aria-hidden="true"
                      initial={false}
                      animate={
                        gone
                          ? { opacity: 0, y: -10, filter: "blur(5px)" }
                          : { opacity: 1, y: 0, filter: "blur(0px)" }
                      }
                      transition={{
                        duration: still ? 0 : gone ? 0.7 : 0.4,
                        ease: EASE,
                        delay: still || !gone ? 0 : 0.25 + at * 0.08,
                      }}
                      className={clsx(
                        "text-[0.36em] font-normal tracking-normal transition-colors duration-700",
                        left || stays ? "text-amber-text" : "text-text-2",
                      )}
                    >
                      {py}
                    </MotionRt>
                  </ruby>
                );
              })}
            </p>
          );
        })}
      </div>

      <div className="min-h-[1.6em] text-lg text-text-2">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={step}
            initial={still ? false : { opacity: 0, y: 6, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -4, filter: "blur(4px)", transition: { duration: 0.18 } }}
            transition={{ duration: 0.4, ease: EASE }}
            className={clsx(done && "text-amber-text")}
          >
            <Caption step={step} />
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="grid gap-2.5">
        <p className="text-sm text-muted">
          <Trans>Your cards, as you learn them</Trans>
        </p>
        <ul className="flex flex-wrap gap-1.5">
          {CARDS.map((c, i) => {
            const known = i < knownCount;
            const now = i === step - 1 && step <= CARDS.length;
            return (
              <motion.li
                key={c.term}
                initial={false}
                animate={{ scale: now && !still ? [1, 1.09, 1] : 1 }}
                transition={{ duration: 0.45, ease: EASE }}
                className={clsx(
                  "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-md transition-[background-color,color,box-shadow] duration-500",
                  known ? "bg-good-soft text-text" : "bg-plate text-muted edge",
                )}
              >
                <Zh>{c.term}</Zh>
                <AnimatePresence initial={false}>
                  {known && (
                    <motion.span
                      initial={still ? false : { opacity: 0, scale: 0.4, width: 0 }}
                      animate={{ opacity: 1, scale: 1, width: "auto" }}
                      exit={{ opacity: 0, scale: 0.4, width: 0 }}
                      transition={{ type: "spring", duration: 0.45, bounce: 0.3 }}
                      className="inline-flex"
                    >
                      <Check aria-hidden="true" className="size-3.5 text-good" strokeWidth={3} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
