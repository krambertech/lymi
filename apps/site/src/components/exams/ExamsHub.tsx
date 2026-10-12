import { msg } from "@lingui/core/macro";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { ArrowRight, Languages, ListChecks, Smartphone } from "lucide-react";
import { AnimatePresence, animate, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { EXAMS, type Exam, examPath } from "../../lib/exams";
import { openLymiUrl } from "../../lib/origins";
import { buttonClass } from "../Button";
import { Assurances } from "../landing/Assurances";
import { FeatureSection, SectionTitle } from "../landing/FeatureSection";
import { EXAMS_QUESTIONS } from "../landing/faq";
import { Questions } from "../landing/Questions";
import { RightMoment } from "../landing/RightMoment";
import { SignUpSection } from "../landing/SignUpSection";
import { SiteFooter } from "../landing/SiteFooter";
import { SiteNav } from "../landing/SiteNav";
import { ExamReview } from "./ExamReview";

export const EXAMS_TITLE = msg`Citizenship, language and driving test prep with flashcards · Lymi`;
export const EXAMS_BLURB = msg`Flashcards for the Einbürgerungstest, the US, Canadian, Czech and Spanish citizenship tests, Goethe, HSK, JLPT and TOPIK vocabulary, and driving theory. In the exam’s language, with a translation alongside. Free.`;
export const EXAMS_HEADING = msg`Learn the questions once. Keep them until exam day.`;

/** Explore's tray hues, skipping violet and amber, so each exam's tile keeps its own colour. */
const HUES = [4, 0, 2, 3, 1, 7, 6];

interface Props {
  /** Cards per exam this locale's catalogue holds; an exam missing here has no decks to show. */
  counts: Record<string, number>;
}

/** The exam vertical: try a question, find your exam, and why a deck beats cramming. */
export function ExamsHub({ counts }: Props) {
  const openAppUrl = openLymiUrl();
  const listed = EXAMS.filter((exam) => (counts[exam.id] ?? 0) > 0);
  const reviewable = listed.filter((exam) => exam.group === "citizenship");

  return (
    <div className="@container min-h-dvh overflow-x-clip bg-canvas text-text">
      <header className="shelf-hero over-tint" data-hue="3">
        <SiteNav openAppUrl={openAppUrl} current="exams" />
        <Hero exams={reviewable} />
      </header>

      <main className="relative">
        <Assurances
          label={<Trans>What every exam deck gives you</Trans>}
          items={[
            {
              id: "questions",
              icon: ListChecks,
              title: <Trans>The questions, with answers</Trans>,
              body: (
                <Trans>
                  Each deck holds the exam’s published questions, or practice questions from its
                  official guide, each with its answer.
                </Trans>
              ),
            },
            {
              id: "language",
              icon: Languages,
              title: <Trans>A translation beside each one</Trans>,
              body: (
                <Trans>
                  Questions stay in the exam’s language, with English, Ukrainian or Russian next to
                  them.
                </Trans>
              ),
            },
            {
              id: "daily",
              icon: Smartphone,
              title: <Trans>A few minutes a day</Trans>,
              body: (
                <Trans>
                  Review on your phone or your computer, for free, even without a connection.
                </Trans>
              ),
            },
          ]}
        />

        <ExamPicker exams={listed} counts={counts} />

        <div id="how" className="scroll-mt-6">
          <RightMoment
            title={<Trans>Cramming fades. Spacing lasts.</Trans>}
            body={
              <Trans>
                What you cram the night before fades within days. Spaced repetition asks each
                question again just as you’re about to forget it, and every time you remember, the
                next gap grows. Lymi uses your grade to decide when each question comes back.
              </Trans>
            }
          />
        </div>

        <FeatureSection
          tinted
          title={<Trans>Know where you stand.</Trans>}
          body={
            <Trans>
              Each deck counts its questions as New, Learning and Known. A few minutes a day moves
              them along, and one look tells you how much of the catalogue you already know before
              your test date.
            </Trans>
          }
        >
          <ProgressDemo />
        </FeatureSection>

        <DeckNotQuiz />

        <Questions title={<Trans>Questions before you start.</Trans>} items={EXAMS_QUESTIONS} />

        <SignUpSection title={<Trans>Start with your exam’s deck.</Trans>} />
      </main>

      <SiteFooter openAppUrl={openAppUrl} page="exams" />
    </div>
  );
}

function Hero({ exams }: { exams: readonly Exam[] }) {
  const { i18n } = useLingui();
  return (
    <div className="mx-auto grid max-w-[1120px] items-center gap-12 px-5 pt-10 pb-16 @2xl:px-10 @4xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] @4xl:gap-16 @4xl:pt-16 @4xl:pb-24">
      <div>
        <p className="text-sm font-medium text-text-2">
          <Trans>Exam prep</Trans>
        </p>
        <h1 className="mt-4 max-w-[15ch] text-5xl leading-[0.98] font-medium tracking-[-0.04em] text-balance text-text @4xl:text-[4.25rem]">
          {i18n._(EXAMS_HEADING)}
        </h1>
        <p className="mt-6 max-w-[48ch] text-lg text-pretty text-text-2 @2xl:text-xl">
          <Trans>
            Ready decks for citizenship, language and driving theory tests after a move. Each holds
            what the exam asks in its own language, with a translation alongside, and brings back
            what you get wrong until it sticks.
          </Trans>
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          <a href="#exams" className={buttonClass("secondary", "lg")}>
            <Trans>Find your exam</Trans>
          </a>
          <a href="#how" className={buttonClass("ghost", "lg")}>
            <Trans>How it works</Trans>
          </a>
        </div>
      </div>
      {exams.length > 0 && <ExamReview exams={exams} />}
    </div>
  );
}

function ExamPicker({ exams, counts }: { exams: readonly Exam[]; counts: Record<string, number> }) {
  return (
    <section
      id="exams"
      aria-labelledby="exams-title"
      className="scroll-mt-6 px-5 pt-20 pb-16 @2xl:px-10 @4xl:pt-28"
    >
      <div className="mx-auto max-w-[1040px]">
        <h2
          id="exams-title"
          className="text-4xl font-medium tracking-[-0.03em] text-balance text-text @2xl:text-5xl"
        >
          <Trans>Pick your exam.</Trans>
        </h2>
        <ExamGroup
          group="citizenship"
          title={<Trans>Citizenship tests</Trans>}
          exams={exams}
          counts={counts}
        />
        <ExamGroup
          group="language"
          title={<Trans>Language exams</Trans>}
          exams={exams}
          counts={counts}
        />
        <ExamGroup
          group="driving"
          title={<Trans>Driving tests</Trans>}
          exams={exams}
          counts={counts}
        />
      </div>
    </section>
  );
}

function ExamGroup({
  group,
  title,
  exams,
  counts,
}: {
  group: Exam["group"];
  title: React.ReactNode;
  exams: readonly Exam[];
  counts: Record<string, number>;
}) {
  const own = exams.filter((exam) => exam.group === group);
  if (own.length === 0) return null;
  return (
    <div id={group} className="mt-12 scroll-mt-6">
      <h3 className="border-b border-edge pb-3 text-2xl font-medium tracking-[-0.03em] text-text">
        {title}
      </h3>
      <ul className="mt-5 grid gap-3 @xl:grid-cols-2 @2xl:gap-4 @4xl:grid-cols-3">
        {own.map((exam) => (
          <ExamTile key={exam.id} exam={exam} cards={counts[exam.id] ?? 0} />
        ))}
      </ul>
    </div>
  );
}

/** One exam on a tray of its own colour, with a real question from its deck peeking out. */
function ExamTile({ exam, cards }: { exam: Exam; cards: number }) {
  const { i18n } = useLingui();
  const hue = HUES[EXAMS.indexOf(exam) % HUES.length];
  const answer = exam.sample.translation
    ? i18n._(exam.sample.translation.answer)
    : exam.sample.answer;
  return (
    <li
      data-hue={hue}
      className="use-case-tile group relative flex min-h-[340px] flex-col overflow-hidden rounded-2xl p-6 pb-0 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring @2xl:pb-0"
    >
      <p className="text-sm text-text-2">{i18n._(exam.country)}</p>
      <h4 className="mt-1 text-xl leading-tight font-medium tracking-[-0.02em] text-balance text-text">
        <a
          href={examPath(exam, i18n.locale)}
          className="after:absolute after:inset-0 after:z-10 focus-visible:outline-none"
        >
          {i18n._(exam.name)}
        </a>
      </h4>
      <p className="mt-2 text-sm text-pretty text-text-2">{i18n._(exam.summary)}</p>
      <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-text">
        <Plural value={cards} one="# card" other="# cards" />
        <ArrowRight
          aria-hidden="true"
          className="size-4 transition-transform duration-200 ease-out rtl:-scale-x-100 hoverable:group-hover:translate-x-0.5"
        />
      </p>
      <div className="relative mt-auto -mb-6 flex min-h-36 flex-col pt-6">
        <span className="use-case-paper" data-at="1" aria-hidden="true" />
        <div className="use-case-card relative flex flex-1 flex-col rounded-xl bg-plate p-5 pb-10 edge">
          <p
            lang={exam.sample.language}
            className="line-clamp-2 text-md leading-snug font-medium text-pretty text-text"
          >
            {exam.sample.question}
          </p>
          <p className="mt-3 line-clamp-2 border-t border-edge-2 pt-2.5 text-sm text-pretty text-text-2">
            {answer}
          </p>
        </div>
      </div>
    </li>
  );
}

const STAGES = [
  { id: "start", label: msg`First day`, known: 0, learning: 12 },
  { id: "weeks", label: msg`A few weeks in`, known: 96, learning: 58 },
  { id: "test", label: msg`Before the test`, known: 271, learning: 29 },
] as const;

const TOTAL = 300;

/** A number that moves to its new value rather than jumping. */
function Count({ value, still }: { value: number; still: boolean | null }) {
  const { i18n } = useLingui();
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(value);
  useEffect(() => {
    const format = new Intl.NumberFormat(i18n.locale);
    if (still) {
      if (ref.current) ref.current.textContent = format.format(value);
      from.current = value;
      return;
    }
    const controls = animate(from.current, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        if (ref.current) ref.current.textContent = format.format(Math.round(latest));
      },
    });
    from.current = value;
    return () => controls.stop();
  }, [value, still, i18n.locale]);
  return <span ref={ref}>{new Intl.NumberFormat(i18n.locale).format(value)}</span>;
}

/**
 * An example deck's counts moving from the first day to the test, once it is on screen. Under
 * reduced motion it holds the last moment.
 */
function ProgressDemo() {
  const { t, i18n } = useLingui();
  const still = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const visible = useInView(root, { amount: 0.5 });
  const [at, setAt] = useState(still ? STAGES.length - 1 : 0);

  useEffect(() => {
    if (still || !visible) return;
    const timer = window.setInterval(() => setAt((n) => (n + 1) % STAGES.length), 2600);
    return () => window.clearInterval(timer);
  }, [still, visible]);

  const stage = STAGES[at] ?? STAGES[0];
  const fresh = TOTAL - stage.known - stage.learning;
  const bars = [
    {
      id: "known",
      label: t({ message: "Known", context: "cards in this state" }),
      value: stage.known,
      className: "bg-state-known",
    },
    {
      id: "learning",
      label: t({ message: "Learning", context: "cards in this state" }),
      value: stage.learning,
      className: "bg-state-learning",
    },
    {
      id: "new",
      label: t({ message: "New", context: "cards in this state" }),
      value: fresh,
      className: "bg-state-new",
    },
  ];
  return (
    <div ref={root} className="mx-auto w-full max-w-[440px]" aria-hidden="true">
      <article className="rounded-xl bg-canvas p-6 edge">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium tracking-[0.07em] text-muted uppercase">
            <Trans>An example deck</Trans>
          </p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={stage.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: still ? 0 : 0.25 }}
              className="rounded-full bg-plate-2 px-2.5 py-1 text-xs font-medium text-text-2"
            >
              {i18n._(stage.label)}
            </motion.p>
          </AnimatePresence>
        </div>
        <p className="mt-2 text-xl font-medium tracking-[-0.02em] text-text">
          Leben in Deutschland
        </p>
        <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-plate-2">
          {bars.map((bar) => (
            <motion.span
              key={bar.id}
              className={bar.className}
              initial={false}
              animate={{ width: `${(bar.value / TOTAL) * 100}%` }}
              transition={still ? { duration: 0 } : { type: "spring", duration: 0.9, bounce: 0.08 }}
            />
          ))}
        </div>
        <dl className="mt-5 grid grid-cols-3 gap-3">
          {bars.map((bar) => (
            <div key={bar.id}>
              <dt className="flex items-center gap-1.5 text-sm text-text-2">
                <span aria-hidden="true" className={clsx("size-2 rounded-full", bar.className)} />
                {bar.label}
              </dt>
              <dd className="mt-0.5 text-2xl font-medium tracking-[-0.03em] text-text tabular-nums">
                <Count value={bar.value} still={still} />
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 flex gap-1.5">
          {STAGES.map((each, n) => (
            <span
              key={each.id}
              className={clsx(
                "h-1 flex-1 rounded-full transition-colors duration-300",
                n <= at ? "bg-text-2" : "bg-plate-2",
              )}
            />
          ))}
        </div>
      </article>
    </div>
  );
}

/** Where a deck and a practice quiz part ways, side by side. */
function DeckNotQuiz() {
  const rows = [
    {
      id: "which",
      topic: <Trans>Which questions come up</Trans>,
      quiz: <Trans>All of them, equally often</Trans>,
      deck: <Trans>The ones you’re about to forget</Trans>,
    },
    {
      id: "wrong",
      topic: <Trans>A question you got wrong</Trans>,
      quiz: <Trans>Waits for its turn</Trans>,
      deck: <Trans>Comes back a few cards later, then after longer gaps</Trans>,
    },
    {
      id: "progress",
      topic: <Trans>What you can see</Trans>,
      quiz: <Trans>A score for one attempt</Trans>,
      deck: <Trans>Each question as New, Learning or Known</Trans>,
    },
  ];
  return (
    <section className="border-b border-edge px-5 py-20 @2xl:px-10 @4xl:py-28">
      <div className="mx-auto max-w-[1040px]">
        <SectionTitle>
          <Trans>A deck, not a quiz.</Trans>
        </SectionTitle>
        <p className="mt-5 max-w-[56ch] text-md text-pretty text-text-2">
          <Trans>
            A practice quiz tells you how you did today. A deck keeps track of every question, so
            the review you do tomorrow is the one you need.
          </Trans>
        </p>
        <div className="mt-10 overflow-hidden rounded-xl bg-plate edge">
          <div
            aria-hidden="true"
            className="hidden grid-cols-3 gap-4 bg-plate-2 px-5 py-3 text-sm font-medium text-text-2 @2xl:grid"
          >
            <span />
            <span>
              <Trans>A practice quiz</Trans>
            </span>
            <span className="text-text">
              <Trans>A Lymi deck</Trans>
            </span>
          </div>
          <ul>
            {rows.map((row) => (
              <li
                key={row.id}
                className="grid gap-3 border-t border-edge px-5 py-5 first:border-t-0 @2xl:grid-cols-3 @2xl:gap-4 @2xl:first:border-t"
              >
                <p className="font-medium text-text">{row.topic}</p>
                <p className="text-text-2">
                  <span className="block text-xs tracking-[0.06em] text-muted uppercase @2xl:sr-only">
                    <Trans>A practice quiz</Trans>
                  </span>
                  {row.quiz}
                </p>
                <p className="text-text">
                  <span className="block text-xs tracking-[0.06em] text-muted uppercase @2xl:sr-only">
                    <Trans>A Lymi deck</Trans>
                  </span>
                  {row.deck}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
