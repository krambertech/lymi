import { I18nProvider } from "@lingui/react";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Check, RotateCcw } from "lucide-react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";
import {
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type { TryCard } from "../../lib/deck-page";
import { pageI18n } from "../../lib/i18n";
import { buttonClass } from "../Button";
import { Kbd } from "../Kbd";

interface Props {
  locale: string;
  cards: TryCard[];
  /** The section the cards come from, in the deck's own language. */
  section: string | null;
  termLanguage: string | null;
  meaningLanguage: string;
  total: number;
  addUrl: string;
}

export default function TryDeck({ locale, ...props }: Props) {
  return (
    <I18nProvider i18n={pageI18n(locale)}>
      <MotionConfig reducedMotion="user">
        <TryDeckCards {...props} />
      </MotionConfig>
    </I18nProvider>
  );
}

type Answer = "forgot" | "knew";

// The product's review curve and reveal, so a card here moves the way it does in Lymi.
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const cardMotion: Variants = {
  // The next card starts where the one behind was peeking out, so the stack reads as advancing.
  behind: { opacity: 1, y: 14, scale: 0.955, zIndex: 1 },
  front: {
    opacity: 1,
    y: 0,
    x: 0,
    rotate: 0,
    scale: 1,
    zIndex: 1,
    transition: { duration: 0.42, ease: EASE_OUT },
  },
  // Known cards are set aside over the deck; forgotten ones sink back into it, to come round again.
  gone: (answer: Answer) =>
    answer === "knew"
      ? {
          opacity: 0,
          x: "62%",
          rotate: 6,
          zIndex: 2,
          transition: { duration: 0.44, ease: EASE_OUT },
        }
      : {
          opacity: 0,
          y: 30,
          scale: 0.92,
          zIndex: 0,
          transition: { duration: 0.36, ease: EASE_OUT },
        },
};
const answerGroup: Variants = {
  hidden: {},
  shown: { transition: { delayChildren: 0.04, staggerChildren: 0.05 } },
};
const answerRule: Variants = {
  hidden: { scaleX: 0 },
  shown: { scaleX: 1, transition: { duration: 0.36, ease: EASE_OUT } },
};
// Blur settles to `none` rather than `blur(0)`, which Safari rasterises soft.
const answerLine: Variants = {
  hidden: { opacity: 0, y: 10, filter: "blur(4px)" },
  shown: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.26, ease: EASE_OUT },
    transitionEnd: { filter: "none" },
  },
};
const gradeGroup: Variants = {
  hidden: {},
  shown: { transition: { delayChildren: 0.08, staggerChildren: 0.035 } },
};
const gradeRise: Variants = {
  hidden: { opacity: 0, y: 10 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE_OUT } },
};

const plate = "rounded-xl bg-plate edge";
const CARD_HEIGHT = "min-h-[360px] @2xl:min-h-[392px]";

/**
 * A few of the deck's first cards to recall, graded Forgot or Knew it, then a result that says what
 * Lymi would do with each. Nothing is saved. Until the island hydrates, and without JavaScript, the
 * first card reveals its meaning through a `<details>`.
 */
function TryDeckCards({
  cards,
  section,
  termLanguage,
  meaningLanguage,
  total,
  addUrl,
}: Omit<Props, "locale">) {
  const { t } = useLingui();
  const titleId = useId();
  const reduce = useReducedMotion();
  const [hydrated, setHydrated] = useState(false);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
  // Focus follows the visitor's own presses only, never the first render.
  const pressed = useRef(false);
  const revealButton = useRef<HTMLButtonElement>(null);
  const firstGrade = useRef<HTMLButtonElement>(null);
  const endTitle = useRef<HTMLHeadingElement>(null);

  const count = cards.length;
  const done = index >= count;
  const card = cards[index];
  const last = answers.at(-1) ?? "knew";

  useEffect(() => setHydrated(true), []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: each new card mounts a new button to focus.
  useEffect(() => {
    if (!pressed.current) return;
    const target = done ? endTitle.current : revealed ? firstGrade.current : revealButton.current;
    target?.focus({ preventScroll: true });
  }, [done, revealed, index]);

  if (count === 0) return null;

  const reveal = () => {
    pressed.current = true;
    setRevealed(true);
  };
  const answer = (value: Answer) => {
    pressed.current = true;
    setAnswers((list) => [...list, value]);
    setRevealed(false);
    setIndex((i) => i + 1);
  };
  const restart = () => {
    pressed.current = true;
    setAnswers([]);
    setRevealed(false);
    setIndex(0);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (done || event.altKey || event.ctrlKey || event.metaKey) return;
    if (!revealed && event.key === " " && !(event.target instanceof HTMLAnchorElement)) {
      event.preventDefault();
      reveal();
    } else if (revealed && event.key === "1") {
      answer("forgot");
    } else if (revealed && event.key === "2") {
      answer("knew");
    }
  };

  const position = Math.min(index + 1, count);
  const term = card?.term ?? "";
  const status = done
    ? ""
    : revealed && card
      ? `${term}: ${card.meaning}`
      : index > 0
        ? t`Card ${position} of ${count}: ${term}`
        : "";
  const behind = Math.min(2, count - index - 1);

  return (
    <section
      aria-labelledby={titleId}
      onKeyDown={hydrated ? onKeyDown : undefined}
      className="w-full min-w-0"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={titleId} className="text-md font-medium text-text">
          <Plural value={count} one="Try the first card" other="Try the first # cards" />
        </h2>
        <p className="text-sm text-muted">
          <Trans>Nothing is saved.</Trans>
        </p>
      </div>

      <div className="relative mt-4 pb-7">
        {/* The rest of the deck, peeking out under the card. */}
        {[2, 1].map((depth) => (
          <div
            key={depth}
            aria-hidden="true"
            className={clsx(
              plate,
              "absolute inset-x-0 top-0 bottom-7 origin-bottom transition-opacity duration-300",
            )}
            style={{
              transform: `translateY(${depth * 12}px) scale(${1 - depth * 0.045})`,
              opacity: depth > (done ? 0 : behind) ? 0 : depth === 1 ? 0.7 : 0.4,
            }}
          />
        ))}

        {hydrated ? (
          <AnimatePresence initial={false} mode="popLayout" custom={last}>
            {done ? (
              <motion.article
                key="done"
                variants={cardMotion}
                initial="behind"
                animate="front"
                className={clsx(plate, CARD_HEIGHT, "relative flex flex-col p-6 @2xl:p-7")}
                style={{ borderRadius: 22 }}
              >
                <Result
                  answers={answers}
                  cards={cards}
                  total={total}
                  addUrl={addUrl}
                  termLanguage={termLanguage}
                  onRestart={restart}
                  titleRef={endTitle}
                />
              </motion.article>
            ) : (
              card && (
                <motion.article
                  key={index}
                  custom={last}
                  variants={cardMotion}
                  initial="behind"
                  animate="front"
                  exit="gone"
                  className={clsx(plate, CARD_HEIGHT, "relative flex flex-col p-6 @2xl:p-7")}
                  style={{ borderRadius: 22 }}
                >
                  {!revealed && (
                    // The whole card turns it over on a tap; the button below is the named way in.
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-hidden="true"
                      onClick={reveal}
                      className="absolute inset-0 cursor-pointer rounded-xl"
                    />
                  )}
                  <CardHead section={section} meaningLanguage={meaningLanguage}>
                    <Trans>
                      {position} of {count}
                    </Trans>
                  </CardHead>
                  <div className="flex flex-1 flex-col justify-center gap-5 py-6">
                    <motion.p
                      layout={reduce ? false : "position"}
                      transition={{ layout: { duration: 0.34, ease: EASE_OUT } }}
                      lang={termLanguage ?? undefined}
                      className="text-center text-4xl font-medium tracking-[-0.03em] text-balance text-text [overflow-wrap:anywhere] @2xl:text-5xl"
                    >
                      {card.term}
                    </motion.p>
                    {revealed && (
                      <motion.div
                        variants={answerGroup}
                        initial="hidden"
                        animate="shown"
                        className="grid gap-4"
                      >
                        <motion.div
                          variants={answerRule}
                          className="h-px origin-left bg-edge-2 rtl:origin-right"
                        />
                        <motion.p
                          variants={answerLine}
                          lang={meaningLanguage}
                          className="text-center text-xl text-pretty text-text-2 [overflow-wrap:anywhere]"
                        >
                          {card.meaning}
                        </motion.p>
                      </motion.div>
                    )}
                  </div>
                  <div className="relative min-h-14">
                    {revealed ? (
                      <motion.fieldset
                        variants={gradeGroup}
                        initial="hidden"
                        animate="shown"
                        className="grid grid-cols-2 gap-2"
                      >
                        <legend className="sr-only">
                          <Trans>Did you know it?</Trans>
                        </legend>
                        <motion.div variants={gradeRise} className="grid">
                          <GradeButton
                            ref={firstGrade}
                            hint="1"
                            onClick={() => answer("forgot")}
                            icon={<RotateCcw className="size-[18px] text-grade-forgot" />}
                          >
                            <Trans>Forgot</Trans>
                          </GradeButton>
                        </motion.div>
                        <motion.div variants={gradeRise} className="grid">
                          <GradeButton
                            hint="2"
                            onClick={() => answer("knew")}
                            icon={<Check className="size-[18px] text-grade-good" />}
                          >
                            <Trans>Knew it</Trans>
                          </GradeButton>
                        </motion.div>
                      </motion.fieldset>
                    ) : (
                      <button
                        ref={revealButton}
                        type="button"
                        onClick={reveal}
                        className="flex h-14 w-full items-center justify-center gap-2 rounded-lg border border-edge-2 border-dashed text-md text-text-2 transition-[border-color,color,scale] duration-150 ease-out active:scale-[0.98] hoverable:hover:border-text-2 hoverable:hover:text-text"
                      >
                        <Trans>Show the meaning</Trans>
                        <Kbd className="hidden hoverable:inline-flex">
                          <Trans>Space</Trans>
                        </Kbd>
                      </button>
                    )}
                  </div>
                </motion.article>
              )
            )}
          </AnimatePresence>
        ) : (
          card && (
            <StaticCard
              card={card}
              section={section}
              termLanguage={termLanguage}
              meaningLanguage={meaningLanguage}
              count={count}
            />
          )
        )}
      </div>

      <ol aria-hidden="true" className="mt-1 flex gap-1 px-6">
        {cards.map((_, i) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: one mark per place in a fixed run.
            key={i}
            className={clsx(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              i < index ? "bg-muted" : i === index && !done ? "bg-text" : "bg-edge-2",
            )}
          />
        ))}
      </ol>

      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>
    </section>
  );
}

function CardHead({
  section,
  meaningLanguage,
  children,
}: {
  section: string | null;
  meaningLanguage: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm text-muted">
      <span lang={meaningLanguage} className="min-w-0 truncate">
        {section}
      </span>
      {children && <span className="shrink-0 tabular-nums">{children}</span>}
    </div>
  );
}

interface GradeButtonProps {
  hint: string;
  icon: ReactNode;
  onClick: () => void;
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

function GradeButton({ hint, icon, onClick, children, ref }: GradeButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className="relative flex h-14 items-center justify-center gap-2 rounded-lg bg-plate text-md font-medium text-text-2 edge transition-[scale,background-color,box-shadow,color] duration-150 ease-out active:scale-[0.96] hoverable:hover:bg-hover hoverable:hover:text-text hoverable:hover:edge-2"
    >
      <span aria-hidden="true" className="grid place-items-center">
        {icon}
      </span>
      {children}
      <Kbd className="hidden hoverable:inline-flex">{hint}</Kbd>
    </button>
  );
}

interface ResultProps {
  answers: Answer[];
  cards: TryCard[];
  total: number;
  addUrl: string;
  termLanguage: string | null;
  onRestart: () => void;
  titleRef: Ref<HTMLHeadingElement>;
}

/** What the visitor just did, and what Lymi would do with each card next. */
function Result({ answers, cards, total, addUrl, termLanguage, onRestart, titleRef }: ResultProps) {
  const { t } = useLingui();
  const count = cards.length;
  const known = answers.filter((a) => a === "knew").length;
  const forgot = count - known;
  const forgotten = cards.filter((_, i) => answers[i] === "forgot");

  return (
    <motion.div
      variants={answerGroup}
      initial="hidden"
      animate="shown"
      className="flex flex-1 flex-col"
    >
      <motion.h3
        ref={titleRef}
        tabIndex={-1}
        variants={answerLine}
        className="text-3xl font-medium tracking-[-0.03em] text-balance text-text outline-none"
      >
        <Trans>
          You knew {known} of {count}.
        </Trans>
      </motion.h3>
      <motion.p variants={answerLine} className="mt-3 text-md text-pretty text-text-2">
        {forgot === 0 ? (
          <Trans>
            In Lymi, each of them would come back less and less often, right before you’d forget it.
          </Trans>
        ) : known === 0 ? (
          <Trans>
            In Lymi, they would come back a few cards later, then less often as you learn them.
          </Trans>
        ) : (
          <Plural
            value={forgot}
            one="In Lymi, the one you forgot would come back a few cards later. The ones you knew come back less and less often, right before you’d forget them."
            other="In Lymi, the # you forgot would come back a few cards later. The ones you knew come back less and less often, right before you’d forget them."
          />
        )}
      </motion.p>
      {forgotten.length > 0 && (
        <motion.ul
          variants={answerLine}
          aria-label={t`Cards you forgot`}
          className="mt-4 flex flex-wrap gap-1.5"
        >
          {forgotten.map((card, i) => (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: a term can repeat; the list never reorders.
              key={i}
              lang={termLanguage ?? undefined}
              className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full bg-plate-2 px-2.5 text-sm text-text-2"
            >
              <RotateCcw aria-hidden="true" className="size-3.5 shrink-0 text-grade-forgot" />
              <span className="truncate">{card.term}</span>
            </li>
          ))}
        </motion.ul>
      )}
      <motion.div variants={answerLine} className="mt-auto grid gap-1 pt-6">
        <a href={addUrl} className={buttonClass("primary", "lg", "w-full")}>
          <Plural value={total} one="Add the deck to Lymi" other="Add all # cards to Lymi" />
        </a>
        <button type="button" onClick={onRestart} className={buttonClass("ghost", "lg", "w-full")}>
          <Trans>Start again</Trans>
        </button>
      </motion.div>
    </motion.div>
  );
}

/** The first card as plain HTML: the meaning opens in a `<details>` before and without scripts. */
function StaticCard({
  card,
  section,
  termLanguage,
  meaningLanguage,
  count,
}: {
  card: TryCard;
  section: string | null;
  termLanguage: string | null;
  meaningLanguage: string;
  count: number;
}) {
  const position = 1;
  return (
    <article className={clsx(plate, CARD_HEIGHT, "relative flex flex-col p-6 @2xl:p-7")}>
      <CardHead section={section} meaningLanguage={meaningLanguage}>
        <Trans>
          {position} of {count}
        </Trans>
      </CardHead>
      <details className="group flex flex-1 flex-col">
        <summary className="flex flex-1 cursor-pointer list-none flex-col [&::-webkit-details-marker]:hidden">
          <span
            lang={termLanguage ?? undefined}
            className="my-auto py-6 text-center text-4xl font-medium tracking-[-0.03em] text-balance text-text [overflow-wrap:anywhere] @2xl:text-5xl"
          >
            {card.term}
          </span>
          <span className="flex h-14 items-center justify-center rounded-lg border border-edge-2 border-dashed text-md text-text-2 group-open:hidden">
            <Trans>Show the meaning</Trans>
          </span>
        </summary>
        <div className="grid gap-4 pb-2">
          <div className="h-px bg-edge-2" />
          <p lang={meaningLanguage} className="text-center text-xl text-text-2">
            {card.meaning}
          </p>
        </div>
      </details>
    </article>
  );
}
