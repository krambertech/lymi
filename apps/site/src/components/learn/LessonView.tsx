import { Trans, useLingui } from "@lingui/react/macro";
import { captureAnalytics } from "@lymi/client/analytics";
import { clsx } from "clsx";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { lessonBySlug, lessonPath, nextLesson } from "../../lib/learn/catalogue";
import { finishSection as saveSection, startLesson } from "../../lib/learn/progress";
import { localizedPath } from "../../lib/routes";
import { buttonClass } from "../Button";
import { LearnLayout } from "./LearnLayout";
import { LessonWords } from "./LessonWords";
import { type Glossary, LessonContext, SectionContext, useLesson } from "./lesson-context";
import { WordCards } from "./Word";

export interface LessonSection {
  /** Stable id: the read bar and progress use it. */
  id: string;
  title: string;
  /** A section with a quiz is done when the quiz is; a reading section, once read past. */
  quiz?: boolean;
  children: ReactNode;
}

interface Props {
  slug: string;
  /** The line under the title. */
  sub: ReactNode;
  /** Short facts under it: minutes, quizzes. */
  facts: readonly ReactNode[];
  glossary: Glossary;
  sections: readonly LessonSection[];
  /** What to remember: three to five rules, one per line. */
  recap: readonly ReactNode[];
  /** The words worth keeping, as glossary keys. */
  words: readonly string[];
}

/** A lesson page: its head, a read bar, its sections, what to remember, its words and the next lesson. */
export function LessonView({ slug, sub, facts, glossary, sections, recap, words }: Props) {
  const { t, i18n } = useLingui();
  const lesson = lessonBySlug(slug);
  if (!lesson) throw new Error(`No lesson ${slug}`);
  const all = [...sections.map((s) => s.id), "recap"];
  const number = lesson.n;
  const level = lesson.stage.level;

  useEffect(() => startLesson(slug), [slug]);
  // The lesson's sections never change, so the callback reads them from a ref and stays stable.
  const sectionIds = useRef(all);
  const finishSection = useCallback(
    (section: string) => {
      if (saveSection(slug, section, sectionIds.current).lessonFinished)
        captureAnalytics("learn_lesson_finished", { lesson: slug });
    },
    [slug],
  );
  const paths = {
    en: lessonPath(slug, "en"),
    uk: lessonPath(slug, "uk"),
    ru: lessonPath(slug, "ru"),
  };

  return (
    <LessonContext.Provider value={{ slug, glossary, finishSection }}>
      <WordCards>
        <LearnLayout languages={{ paths }} hue={lesson.stage.hue}>
          <div className="mx-auto max-w-[720px] px-5">
            <header className="grid gap-3 pt-5 pb-5">
              <a
                href={localizedPath("learn", i18n.locale)}
                className="relative inline-flex items-center gap-1.5 justify-self-start rounded-xs text-sm font-medium text-ink-secondary before:absolute before:inset-x-0 before:-inset-y-3 hoverable:hover:text-ink"
              >
                <ArrowLeft aria-hidden="true" className="size-4 rtl:-scale-x-100" />
                <Trans>All lessons</Trans>
              </a>
              <span className="mt-3 text-md font-medium text-(--form)">
                <Trans>
                  Lesson {number} · {level}
                </Trans>
                {" · "}
                <span lang="et">{lesson.et}</span>
              </span>
              <h1 className="text-[clamp(2.75rem,7vw,4.25rem)] leading-none font-semibold tracking-[-0.035em] text-balance">
                {i18n._(lesson.title)}
              </h1>
              <p className="max-w-[44ch] text-[clamp(1.125rem,2vw,1.3125rem)] text-pretty text-ink-secondary">
                {sub}
              </p>
              <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
                {facts.map((fact, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: a lesson's facts are fixed
                  <span key={i}>{fact}</span>
                ))}
              </p>
            </header>
          </div>
          <ReadBar
            title={i18n._(lesson.name)}
            sections={[...sections, { id: "recap", title: t`What to remember`, children: null }]}
          />
          <div className="mx-auto max-w-[720px] px-5">
            {sections.map((section) => (
              <Section key={section.id} id={section.id} title={section.title} quiz={section.quiz}>
                {section.children}
              </Section>
            ))}
            <Section id="recap" title={t`What to remember`}>
              <ol className="m-0 grid list-decimal gap-2.5 rounded-xl bg-(--tray) py-5.5 ps-11 pe-5.5 text-lg marker:font-medium marker:text-(--form) max-sm:-mx-1">
                {recap.map((line, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: the recap is fixed and numbered
                  <li key={i}>{line}</li>
                ))}
              </ol>
              <LessonWords words={words} />
            </Section>
            <NextLesson slug={slug} locale={i18n.locale} onFinish={() => finishSection("recap")} />
          </div>
        </LearnLayout>
      </WordCards>
    </LessonContext.Provider>
  );
}

function Section({
  id,
  title,
  quiz,
  children,
}: {
  id: string;
  title: string;
  quiz?: boolean | undefined;
  children: ReactNode;
}) {
  const { finishSection } = useLesson();
  const end = useRef<HTMLSpanElement>(null);
  // A reading section counts once its end has been on screen, however tall the section is.
  useEffect(() => {
    const node = end.current;
    if (!node || quiz) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) finishSection(id);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [id, quiz, finishSection]);
  return (
    <SectionContext.Provider value={id}>
      <section
        id={id}
        data-section={id}
        className="grid scroll-mt-14 gap-4.5 py-10 not-first:border-t not-first:border-edge max-sm:py-8"
      >
        <h2 className="text-3xl font-semibold tracking-tight max-sm:text-[1.5625rem]">{title}</h2>
        {children}
        <span ref={end} aria-hidden="true" className="-mt-4.5 h-px" />
      </section>
    </SectionContext.Provider>
  );
}

/** Reading copy in a lesson: larger than the site's body text, in short paragraphs. */
export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="grid max-w-[62ch] gap-3.5 text-[1.1875rem] leading-[1.62] text-pretty text-ink-secondary max-sm:text-lg [&_b]:font-medium [&_b]:text-ink [&_em]:font-medium [&_em]:text-(--form) [&_em]:not-italic">
      {children}
    </div>
  );
}

/** A small line under an explorer or quiz, for an aside that can be skipped. */
export function Aside({ children }: { children: ReactNode }) {
  return <p className="max-w-[62ch] text-md text-pretty text-ink-muted">{children}</p>;
}

/** Where the reader is in the lesson: segments fill in order up to the section on screen. */
function ReadBar({ title, sections }: { title: string; sections: readonly LessonSection[] }) {
  const { t } = useLingui();
  const count = sections.length;
  const [now, setNow] = useState<string | null>(null);
  const [stuck, setStuck] = useState(false);
  const bar = useRef<HTMLDivElement>(null);
  const at = Math.max(
    0,
    sections.findIndex((section) => section.id === now),
  );
  const position = at + 1;

  useEffect(() => {
    const nodes = sections
      .map((s) => document.getElementById(s.id))
      .filter((n): n is HTMLElement => !!n);
    const watch = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setNow(entry.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const node of nodes) watch.observe(node);
    const top = new IntersectionObserver(
      ([entry]) => setStuck(!!entry && entry.boundingClientRect.top <= 0 && !entry.isIntersecting),
      {
        threshold: [0, 1],
      },
    );
    const sentinel = bar.current?.previousElementSibling;
    if (sentinel) top.observe(sentinel);
    return () => {
      watch.disconnect();
      top.disconnect();
    };
  }, [sections]);

  return (
    <div
      ref={bar}
      className={clsx(
        "sticky top-0 z-10 border-b bg-canvas transition-colors duration-200",
        stuck ? "border-edge" : "border-transparent",
      )}
    >
      <div className="mx-auto flex max-w-[720px] items-center px-5 py-2.5">
        <span
          lang="et"
          aria-hidden={!stuck}
          className={clsx(
            "overflow-hidden font-medium text-ellipsis whitespace-nowrap transition-[max-width,opacity,margin] duration-300",
            stuck ? "me-3.5 max-w-56 opacity-100 max-sm:max-w-28" : "me-0 max-w-0 opacity-0",
          )}
        >
          {title}
        </span>
        <nav aria-label={t`Sections`} className="flex min-w-0 flex-1 gap-1">
          {sections.map((section, i) => {
            return (
              <button
                key={section.id}
                type="button"
                aria-label={`${i + 1}. ${section.title}`}
                aria-current={now === section.id ? "location" : undefined}
                onClick={() =>
                  document.getElementById(section.id)?.scrollIntoView({
                    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
                      ? "auto"
                      : "smooth",
                  })
                }
                className="flex h-5 flex-1 cursor-pointer items-center rounded-xs"
              >
                <span
                  className={clsx(
                    "h-[5px] flex-1 rounded-full transition-colors duration-300",
                    i < at
                      ? "bg-(--form)"
                      : i === at
                        ? "bg-[color-mix(in_oklab,var(--form)_45%,var(--plate-nested))]"
                        : "bg-plate-nested",
                  )}
                />
              </button>
            );
          })}
        </nav>
        <span className="ms-3.5 text-sm whitespace-nowrap text-ink-muted tabular-nums">
          <Trans>
            {position} of {count}
          </Trans>
        </span>
      </div>
    </div>
  );
}

function NextLesson({
  slug,
  locale,
  onFinish,
}: {
  slug: string;
  locale: string;
  onFinish: () => void;
}) {
  const { i18n } = useLingui();
  const next = nextLesson(slug);
  const number = next?.n;
  return (
    <nav className="flex flex-wrap justify-between gap-3 pt-2 pb-18">
      <a
        href={localizedPath("learn", locale)}
        className={buttonClass("secondary", "lg", "self-end")}
      >
        <span className="flex items-center gap-1.5">
          <ArrowLeft aria-hidden="true" data-icon="inline-start" />
          <Trans>All lessons</Trans>
        </span>
      </a>
      {next?.slug ? (
        <a
          href={lessonPath(next.slug, locale)}
          onClick={onFinish}
          className={buttonClass(
            "primary",
            "lg",
            "ms-auto h-auto flex-col items-end gap-0 py-3 whitespace-normal",
          )}
        >
          <small className="flex items-center gap-1 text-sm font-normal opacity-80">
            <Trans>Lesson {number}</Trans>
            <ArrowRight aria-hidden="true" className="size-3.5!" />
          </small>
          <span>{i18n._(next.name)}</span>
        </a>
      ) : next ? (
        <p className="ms-auto grid justify-items-end text-end text-ink-muted">
          <small className="text-sm">
            <Trans>Lesson {number}, coming soon</Trans>
          </small>
          <span className="text-md font-medium text-ink-secondary">{i18n._(next.name)}</span>
        </p>
      ) : null}
    </nav>
  );
}
