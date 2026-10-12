import { msg } from "@lingui/core/macro";
import { I18nProvider } from "@lingui/react";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import { Check, ChevronRight, List } from "lucide-react";
import type { ReactNode } from "react";
import {
  EINBUERGERUNGSTEST,
  EXAMS,
  type Exam,
  type ExamSource,
  examPath,
  examsPath,
} from "../../lib/exams";
import { pageI18n } from "../../lib/i18n";
import type { Locale } from "../../lib/routes";
import { buttonClass } from "../Button";
import { addUrl } from "../deck/DeckView";
import { SectionTitle } from "../landing/FeatureSection";
import type { Question } from "../landing/faq";
import { Questions } from "../landing/Questions";
import { DeckShowcase } from "./DeckShowcase";

export const EINBUERGERUNGSTEST_TITLE = msg`Einbürgerungstest and Leben in Deutschland: questions and answers in English · Lymi`;
export const EINBUERGERUNGSTEST_BLURB = msg`All 300 general questions of the Einbürgerungstest and the 10 for your state, in German as on the test, with English next to each. Free flashcards from the BAMF catalogue.`;

interface LocaleProps {
  locale: Locale;
}

interface ExamProps extends LocaleProps {
  exam: Exam;
}

/** Server-rendered parts share one provider each; only the nav hydrates. */
function Localized({ locale, children }: LocaleProps & { children: ReactNode }) {
  return <I18nProvider i18n={pageI18n(locale)}>{children}</I18nProvider>;
}

/** An exam page's document title: its heading and Lymi's name. */
export function examTitle(exam: Exam, locale: Locale): string {
  const i18n = pageI18n(locale);
  const heading = i18n._(exam.heading);
  return i18n._(msg`${heading} · Lymi`);
}

/** The latest change among some decks, for "updated" beside a source. */
function latest(slugs: readonly string[], updated: Record<string, string>): string | undefined {
  return slugs
    .map((slug) => updated[slug])
    .filter((date): date is string => Boolean(date))
    .sort()
    .at(-1);
}

function useDate() {
  const { i18n } = useLingui();
  return (iso: string) =>
    new Intl.DateTimeFormat(i18n.locale, { dateStyle: "long", timeZone: "UTC" }).format(
      new Date(iso),
    );
}

/** Where the questions come from, how current that source is, and anything its licence asks. */
function SourceLine({ source, changed }: { source: ExamSource; changed: string | undefined }) {
  const { i18n } = useLingui();
  const date = useDate();
  const title = source.title;
  return (
    <div className="grid gap-1 text-sm text-pretty text-muted">
      <p>
        <Trans>
          Questions from{" "}
          <a
            href={source.url}
            rel="noopener"
            className="font-medium text-text-2 underline decoration-edge-2 underline-offset-2 hoverable:hover:text-text"
          >
            {title}
          </a>
        </Trans>
        {source.edition && (
          <>
            <span aria-hidden="true" className="px-1.5 text-faint">
              ·
            </span>
            {i18n._(source.edition)}
          </>
        )}
      </p>
      {changed && (
        <p>
          <Trans>Decks updated {date(changed)}</Trans>
        </p>
      )}
      {source.licence && <p>{i18n._(source.licence)}</p>}
    </div>
  );
}

/** The exam's real question as a card, answer showing, with its translation under it. */
function SampleCard({ exam }: { exam: Exam }) {
  const { t, i18n } = useLingui();
  const { sample } = exam;
  const translated = sample.translation && !(sample.language === "en" && i18n.locale === "en");
  return (
    <div className="relative mx-auto w-full max-w-[420px]" aria-hidden="true">
      <span className="exam-review-paper" data-at="2" />
      <span className="exam-review-paper" data-at="1" />
      <article className="relative rounded-xl bg-plate p-6 edge">
        <p className="text-xs font-medium tracking-[0.07em] text-amber-text uppercase">
          {i18n._(exam.country)}
        </p>
        <p
          lang={sample.language}
          className="mt-3 text-xl leading-snug font-medium tracking-[-0.02em] text-pretty text-text"
        >
          {sample.question}
        </p>
        {sample.options ? (
          <ul className="mt-4 grid gap-1.5">
            {sample.options.map((option) => (
              <li
                key={option}
                lang={sample.language}
                className={
                  option === sample.answer
                    ? "flex items-center justify-between gap-3 rounded-md bg-good-soft px-3 py-2 text-md text-text"
                    : "rounded-md bg-plate-2 px-3 py-2 text-md text-text-2 opacity-60"
                }
              >
                <span>{option}</span>
                {option === sample.answer && (
                  <Check aria-label={t`Right answer`} className="size-4 shrink-0 text-good" />
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p lang={sample.language} className="mt-3 border-t border-edge pt-3 text-lg text-text">
            {sample.answer}
          </p>
        )}
        {translated && sample.translation && (
          <p className="mt-4 border-t border-edge pt-3 text-md text-pretty text-text-2">
            {i18n._(sample.translation.question)}{" "}
            <span className="font-medium text-text">{i18n._(sample.translation.answer)}</span>
          </p>
        )}
      </article>
    </div>
  );
}

function Breadcrumb({ locale, here }: LocaleProps & { here: string }) {
  const { t } = useLingui();
  return (
    <nav aria-label={t`Breadcrumb`}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
        <li>
          <a
            href={examsPath(locale)}
            className="rounded-xs font-medium text-text-2 transition-colors duration-150 hoverable:hover:text-text"
          >
            <Trans>Exam prep</Trans>
          </a>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="size-3.5 text-faint rtl:-scale-x-100" />
        </li>
        <li aria-current="page">{here}</li>
      </ol>
    </nav>
  );
}

/** The exam by its own name, the deck most people add first, and one of its real questions. */
export function ExamHero({
  locale,
  exam,
  first,
}: ExamProps & { first: PublicDeckSummary | undefined }) {
  return (
    <Localized locale={locale}>
      <ExamHeroContent locale={locale} exam={exam} first={first} />
    </Localized>
  );
}

function ExamHeroContent({
  locale,
  exam,
  first,
}: ExamProps & { first: PublicDeckSummary | undefined }) {
  const germany = exam.slug === EINBUERGERUNGSTEST;
  const { i18n } = useLingui();
  return (
    <div className="mx-auto grid max-w-[1120px] items-center gap-12 px-5 pt-8 pb-14 @2xl:px-10 @4xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] @4xl:gap-16 @4xl:pt-12 @4xl:pb-20">
      <div>
        <Breadcrumb locale={locale} here={i18n._(exam.name)} />
        <h1 className="mt-5 max-w-[20ch] text-4xl leading-[1.02] font-medium tracking-[-0.04em] text-balance text-text @xl:text-5xl @xl:leading-[0.98] @4xl:text-[3.75rem]">
          {i18n._(exam.heading)}
        </h1>
        <p className="mt-5 max-w-[52ch] text-lg text-pretty text-text-2 @2xl:text-xl">
          {i18n._(exam.lede)}
        </p>
        <div className="mt-7 flex flex-wrap gap-2">
          {first && (
            <a
              href={addUrl(first.slug, first.meaningLanguage)}
              className={buttonClass("primary", "lg")}
            >
              {germany ? <Trans>Add the 300 questions</Trans> : <Trans>Add the deck</Trans>}
            </a>
          )}
          {germany ? (
            <a href="#states" className={buttonClass("secondary", "lg")}>
              <Trans>Choose your state</Trans>
            </a>
          ) : (
            <a href="#decks" className={buttonClass("secondary", "lg")}>
              <Trans>See the decks</Trans>
            </a>
          )}
        </div>
      </div>
      <SampleCard exam={exam} />
    </div>
  );
}

/** The format as the authority states it, checked against its own page. */
export function ExamFacts({ locale, exam }: ExamProps) {
  if (!exam.facts?.length) return null;
  return (
    <Localized locale={locale}>
      <ExamFactsContent exam={exam}>
        {exam.slug === EINBUERGERUNGSTEST && <EinbuergerungstestFormatNotes />}
      </ExamFactsContent>
    </Localized>
  );
}

function ExamFactsContent({ exam, children }: { exam: Exam; children?: ReactNode }) {
  const { i18n } = useLingui();
  return (
    <section
      aria-labelledby="format-title"
      className="border-t border-edge px-5 py-16 @2xl:px-10 @4xl:py-20"
    >
      <div className="mx-auto max-w-[1040px]">
        <h2
          id="format-title"
          className="text-3xl font-medium tracking-[-0.03em] text-balance text-text @2xl:text-4xl"
        >
          <Trans>What the test looks like</Trans>
        </h2>
        <dl className="mt-8 grid gap-x-8 gap-y-6 @xl:grid-cols-2 @4xl:grid-cols-4">
          {exam.facts?.map((fact) => (
            <div
              key={fact.value + fact.label.id}
              className="grid content-start gap-1 border-t border-edge pt-4"
            >
              <dt className="order-2 text-md text-pretty text-text-2">{i18n._(fact.label)}</dt>
              <dd className="order-1 text-5xl font-medium tracking-[-0.04em] text-text tabular-nums">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
        {(exam.factsNote || children) && (
          <div className="mt-8 grid max-w-[62ch] gap-3 text-md text-pretty text-text-2">
            {exam.factsNote && <p>{i18n._(exam.factsNote)}</p>}
            {children}
          </div>
        )}
      </div>
    </section>
  );
}

/** What Germany's page adds under the format: the name people search for, and the course test. */
function EinbuergerungstestFormatNotes() {
  return (
    <>
      <p>
        <Trans>
          Every question has four answers and one is right. Because you learn 310 questions in all,
          it’s often called the 310-question test.
        </Trans>
      </p>
      <p>
        <Trans>
          The Leben in Deutschland test at the end of an integration course uses the same questions.
          There, 15 correct answers earn the certificate; for citizenship you need 17.
        </Trans>
      </p>
    </>
  );
}

/** Every deck for the exam, each shown large with its add. */
export function ExamDecks({ locale, decks }: LocaleProps & { decks: PublicDeckSummary[] }) {
  return (
    <Localized locale={locale}>
      <section
        id="decks"
        aria-labelledby="decks-title"
        className="scroll-mt-6 border-t border-edge px-5 py-16 @2xl:px-10 @4xl:py-24"
      >
        <div className="mx-auto max-w-[1040px]">
          <SectionTitle>
            <span id="decks-title">
              <Plural value={decks.length} one="Your deck" other="Your decks" />
            </span>
          </SectionTitle>
          <div className="mt-10 grid gap-5">
            {decks.map((deck) => (
              <DeckShowcase key={deck.slug} deck={deck} locale={locale} />
            ))}
          </div>
        </div>
      </section>
    </Localized>
  );
}

/** Where the questions come from and anything its licence asks, quietly, at the page's end. */
export function ExamSources({
  locale,
  exam,
  updated,
}: ExamProps & { updated: Record<string, string> }) {
  return (
    <Localized locale={locale}>
      <section aria-labelledby="sources-title" className="px-5 pb-10 @2xl:px-10">
        <div className="mx-auto max-w-[1040px] border-t border-edge pt-6">
          <h2 id="sources-title" className="text-sm font-medium text-text-2">
            <Trans>Sources</Trans>
          </h2>
          <div className="mt-2">
            <SourceLine source={exam.source} changed={latest(exam.decks, updated)} />
          </div>
        </div>
      </section>
    </Localized>
  );
}

/** What to expect between now and the test. */
export function ExamPlan({ locale, several }: LocaleProps & { several: boolean }) {
  return (
    <Localized locale={locale}>
      <ExamPlanContent several={several} />
    </Localized>
  );
}

function ExamPlanContent({ several }: { several: boolean }) {
  const steps = [
    {
      id: "add",
      title: several ? <Trans>Add both decks</Trans> : <Trans>Add the deck</Trans>,
      body: several ? (
        <Trans>Lymi mixes their questions into one daily review.</Trans>
      ) : (
        <Trans>It joins your daily review straight away. There is nothing to build.</Trans>
      ),
    },
    {
      id: "daily",
      title: <Trans>Review a few minutes a day</Trans>,
      body: (
        <Trans>
          Each question comes back right before you’d forget it, and the ones you get wrong come
          back sooner.
        </Trans>
      ),
    },
    {
      id: "progress",
      title: <Trans>See what you know</Trans>,
      body: (
        <Trans>
          Each deck counts its questions as New, Learning and Known, so you can see how much of the
          catalogue you have before your test date.
        </Trans>
      ),
    },
  ];
  return (
    <section
      aria-labelledby="plan-title"
      className="border-t border-edge px-5 py-16 @2xl:px-10 @4xl:py-20"
    >
      <div className="mx-auto max-w-[1040px]">
        <h2
          id="plan-title"
          className="text-3xl font-medium tracking-[-0.03em] text-balance text-text @2xl:text-4xl"
        >
          <Trans>From now until your test date</Trans>
        </h2>
        <ol className="mt-8 grid gap-x-10 gap-y-7 @2xl:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.id} className="border-t border-edge pt-5">
              <p className="text-sm text-muted tabular-nums">{index + 1}</p>
              <h3 className="mt-1 text-lg font-medium tracking-[-0.02em] text-text">
                {step.title}
              </h3>
              <p className="mt-1.5 text-md text-pretty text-text-2">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** The questions an exam page answers, built from the exam so the schema reads the same. */
export function examQuestions(exam: Exam, locale: Locale): Question[] {
  const i18n = pageI18n(locale);
  const authority = exam.authority;
  const source = exam.source.title;
  const edition = exam.source.edition ? i18n._(exam.source.edition) : "";
  const note = exam.note ? i18n._(exam.note) : "";
  return [
    {
      id: "official",
      question: msg`Are these the official questions?`,
      answer: note
        ? msg`${note} Lymi isn’t affiliated with ${authority} and can’t promise a pass.`
        : edition
          ? msg`They follow ${source} (${edition}), in the exam’s own words. Lymi wrote the translations and notes, isn’t affiliated with ${authority} and can’t promise a pass.`
          : msg`They follow ${source}, in the exam’s own words. Lymi wrote the translations and notes, isn’t affiliated with ${authority} and can’t promise a pass.`,
    },
    {
      id: "cost",
      question: msg`Is it free?`,
      answer: msg`Yes. Adding the decks and reviewing them is free.`,
    },
    {
      id: "phone",
      question: msg`Does it work on my phone?`,
      answer: msg`Yes. Lymi runs in the browser on your phone and your computer, and you can add it to your home screen. Your cards and progress are the same on both.`,
    },
    {
      id: "offline",
      question: msg`Can I review offline?`,
      answer: msg`Yes. Open Lymi once while you’re online, and after that you can review without a connection. Your answers are sent when you’re back online.`,
    },
  ];
}

export function ExamQuestions({ locale, items }: LocaleProps & { items: Question[] }) {
  return (
    <Localized locale={locale}>
      <Questions title={<Trans>Questions</Trans>} items={items} />
    </Localized>
  );
}

/** The other exams with a page, and the way back to all of them. */
export function OtherExams({ locale, exam, listed }: ExamProps & { listed: readonly string[] }) {
  return (
    <Localized locale={locale}>
      <OtherExamsLinks locale={locale} exam={exam} listed={listed} />
    </Localized>
  );
}

function OtherExamsLinks({ locale, exam, listed }: ExamProps & { listed: readonly string[] }) {
  const { i18n } = useLingui();
  const others = EXAMS.filter((other) => other !== exam && listed.includes(other.id));
  const chip =
    "inline-flex h-10 items-center gap-2 rounded-full whitespace-nowrap px-4 text-md font-medium text-text transition-colors duration-150 hoverable:hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring pointer-coarse:h-11";
  return (
    <nav aria-labelledby="more-exams" className="border-b border-edge px-5 py-12 @2xl:px-10">
      <div className="mx-auto max-w-[1040px]">
        <h2 id="more-exams" className="text-sm text-muted">
          <Trans>Other exams</Trans>
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {others.map((other) => (
            <li key={other.id}>
              <a href={examPath(other, locale)} className={`${chip} bg-plate-2`}>
                {i18n._(other.name)}
              </a>
            </li>
          ))}
          <li>
            <a
              href={examsPath(locale)}
              className={`${chip} shadow-[inset_0_0_0_1px_var(--edge-2)]`}
            >
              <List aria-hidden="true" className="size-4 text-muted" />
              <Trans>All exams</Trans>
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
}
