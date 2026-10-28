import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Brain, Check, type LucideIcon, RotateCcw, Zap } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { Exam } from "../../lib/exams";

const SPRING = { type: "spring", duration: 0.62, bounce: 0.12 } as const;

interface Props {
  exams: readonly Exam[];
}

/**
 * A review of real exam questions: read it in the exam's language, show the answer with its
 * translation, then grade it and see when it would come back. The intervals are the ones the
 * landing's review shows, there to make the mechanic legible rather than to promise a schedule.
 */
export function ExamReview({ exams }: Props) {
  const { t, i18n } = useLingui();
  const still = useReducedMotion();
  const timer = useRef<number | null>(null);
  const [index, setIndex] = useState(0);
  const [revealedFor, setRevealedFor] = useState(-1);
  const [answered, setAnswered] = useState<number | null>(null);
  // The app's own grade buttons: its icons and colours, with the gap each grade would set.
  const grades: {
    name: string;
    when: string;
    announcement: string;
    icon: LucideIcon;
    tone: string;
  }[] = [
    {
      name: t`Forgot`,
      when: t`10 min`,
      announcement: t`Back in 10 minutes.`,
      icon: RotateCcw,
      tone: "text-grade-forgot",
    },
    {
      name: t`Hard`,
      when: t`2 days`,
      announcement: t`Back in 2 days.`,
      icon: Brain,
      tone: "text-grade-hard",
    },
    {
      name: t`Good`,
      when: t`4 days`,
      announcement: t`Back in 4 days.`,
      icon: Check,
      tone: "text-grade-good",
    },
    {
      name: t`Easy`,
      when: t`9 days`,
      announcement: t`Back in 9 days.`,
      icon: Zap,
      tone: "text-grade-easy",
    },
  ];

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const exam = exams[index % exams.length];
  if (!exam) return null;
  const { sample } = exam;
  const revealed = revealedFor === index;
  const chosen = answered === null ? null : grades[answered];
  // An English question needs no translation on an English page.
  const translated = sample.translation && !(sample.language === "en" && i18n.locale === "en");
  const examName = i18n._(exam.name);
  const position = (index % exams.length) + 1;
  const total = exams.length;

  const grade = (n: number) => {
    if (!revealed || answered !== null) return;
    setAnswered(n);
    timer.current = window.setTimeout(
      () => {
        setIndex((i) => i + 1);
        setAnswered(null);
      },
      still ? 0 : 1300,
    );
  };

  return (
    <div className="mx-auto w-full max-w-[440px]">
      <div className="flex items-center justify-between px-1 text-xs tracking-[0.06em] text-ink-muted uppercase">
        <span>
          <Trans>Try a question</Trans>
        </span>
        <span className="tabular-nums">
          <Trans>
            {position} of {total}
          </Trans>
        </span>
      </div>

      <div className="relative mt-3 grid">
        <span className="exam-review-paper" data-at="2" aria-hidden="true" />
        <span className="exam-review-paper" data-at="1" aria-hidden="true" />
        <AnimatePresence initial={false} mode="popLayout">
          <motion.article
            key={index}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97, rotate: -1.5 }}
            transition={still ? { duration: 0 } : SPRING}
            aria-label={examName}
            className="relative flex min-h-[420px] flex-col rounded-xl bg-plate p-6 edge"
          >
            <p className="text-xs font-medium tracking-[0.07em] text-amber-text uppercase">
              {i18n._(exam.country)} · {examName}
            </p>
            <p
              lang={sample.language}
              className="mt-3 text-xl leading-snug font-medium tracking-[-0.02em] text-pretty text-ink"
            >
              {sample.question}
            </p>

            {sample.options && (
              <ul className="mt-4 grid gap-1.5">
                {sample.options.map((option) => {
                  const right = revealed && option === sample.answer;
                  return (
                    <li
                      key={option}
                      lang={sample.language}
                      className={clsx(
                        "flex items-center justify-between gap-3 rounded-md px-3 py-2 text-md transition-colors duration-300",
                        right ? "bg-success-soft text-ink" : "bg-plate-nested text-ink-secondary",
                        revealed && !right && "opacity-55",
                      )}
                    >
                      <span>{option}</span>
                      {right && (
                        <Check
                          aria-label={t`Right answer`}
                          className="size-4 shrink-0 text-success"
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-4 flex-1">
              <AnimatePresence initial={false} mode="wait">
                {revealed ? (
                  <motion.div
                    key="answer"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={still ? { duration: 0 } : { duration: 0.36 }}
                    className="border-t border-edge pt-3"
                  >
                    {!sample.options && (
                      <p lang={sample.language} className="text-lg font-medium text-ink">
                        {sample.answer}
                      </p>
                    )}
                    {translated && sample.translation && (
                      <p className="mt-1 text-md text-pretty text-ink-secondary">
                        {sample.translation.question && <>{i18n._(sample.translation.question)} </>}
                        <span className="font-medium text-ink">
                          {i18n._(sample.translation.answer)}
                        </span>
                      </p>
                    )}
                  </motion.div>
                ) : (
                  <motion.button
                    key="reveal"
                    type="button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={still ? { duration: 0 } : { duration: 0.18 }}
                    onClick={() => setRevealedFor(index)}
                    className="w-full rounded-sm border border-edge-strong border-dashed py-2.5 text-sm text-ink-muted transition-colors hoverable:hover:border-amber hoverable:hover:text-ink-secondary"
                  >
                    <Trans>Show the answer</Trans>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-5 grid grid-cols-4 gap-2">
              {grades.map((g, n) => {
                const Icon = g.icon;
                return (
                  <motion.button
                    key={g.name}
                    type="button"
                    onClick={() => grade(n)}
                    disabled={!revealed || answered !== null}
                    aria-label={t`${g.name}, next in ${g.when}`}
                    animate={{ opacity: revealed ? 1 : 0.35, scale: answered === n ? 1.04 : 1 }}
                    transition={still ? { duration: 0 } : { duration: 0.2 }}
                    className={clsx(
                      "grid h-[72px] min-w-0 content-center justify-items-center gap-1 rounded-lg px-1 text-sm font-medium edge transition-colors duration-150 disabled:cursor-default",
                      answered === n
                        ? "bg-plate-nested text-ink"
                        : "bg-plate text-ink-secondary hoverable:hover:bg-plate-nested hoverable:hover:text-ink",
                    )}
                  >
                    <Icon
                      aria-hidden="true"
                      strokeWidth={1.75}
                      className={clsx("size-[18px]", g.tone)}
                    />
                    <span>{g.name}</span>
                    <span className="text-2xs font-normal text-ink-muted tabular-nums">
                      {g.when}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.article>
        </AnimatePresence>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {chosen
          ? `${chosen.name}. ${chosen.announcement}`
          : revealed
            ? t`Choose a grade to move to the next question.`
            : t`Show the answer, then grade how well you knew it.`}
      </p>
    </div>
  );
}
