import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { ArrowRight, Check } from "lucide-react";
import type { CSSProperties } from "react";
import {
  LESSONS,
  lessonPath,
  type PlacedLesson,
  reviewPath,
  STAGES,
} from "../../lib/learn/catalogue";
import { type Progress, useProgress } from "../../lib/learn/progress";
import { dueIds, localDay, useReview } from "../../lib/learn/review";
import { localizedPath } from "../../lib/routes";
import { buttonClass } from "../Button";
import { drillSlugs } from "./drill-banks";
import { LearnLayout } from "./LearnLayout";

type Status = "done" | "started" | "ready" | "soon";
const statusOf = (lesson: PlacedLesson, progress: Progress): Status =>
  !lesson.slug ? "soon" : (progress.lessons[lesson.slug]?.state ?? "ready");

/** The course: where to pick up, then every stage as a table of contents, done, open or coming. */
export function HubView() {
  return (
    <LearnLayout languages={{ page: "learn" }}>
      <div className="mx-auto max-w-[1040px] px-5 pb-24">
        <section className="grid items-end gap-10 pt-9 pb-12 @3xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] max-sm:gap-6 max-sm:pt-5 max-sm:pb-8">
          <div>
            <h1 className="text-[clamp(2.75rem,7vw,4.75rem)] leading-[0.98] font-semibold tracking-[-0.04em] text-balance">
              <Trans>Estonian grammar lessons</Trans>
            </h1>
            <p className="mt-4 max-w-[40ch] text-[clamp(1.125rem,2vw,1.3125rem)] text-pretty text-ink-secondary">
              <Trans>
                Short, free lessons from the first sounds to B1. Tap any word to hear it, and try
                each idea as you read.
              </Trans>
            </p>
          </div>
          <Resume />
        </section>
        <div className="grid">
          {STAGES.map((stage, i) => (
            <Stage key={stage.hue} index={i} />
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-[60ch] text-center text-sm text-ink-muted">
          <Trans>
            The lessons are free and need no account. Your progress stays in this browser.
          </Trans>
        </p>
      </div>
    </LearnLayout>
  );
}

function Resume() {
  const { i18n } = useLingui();
  const progress = useProgress();
  const built = LESSONS.filter((lesson) => lesson.slug);
  const doneCount = built.filter(
    (lesson) => progress.lessons[lesson.slug as string]?.state === "done",
  ).length;
  const builtCount = built.length;
  const plannedCount = LESSONS.length;
  const started = built.find(
    (lesson) => progress.lessons[lesson.slug as string]?.state === "started",
  );
  const next =
    started ?? built.find((lesson) => progress.lessons[lesson.slug as string]?.state !== "done");
  const begun = built.some((lesson) => progress.lessons[lesson.slug as string]);
  const minutes = next?.minutes;
  const number = next?.n;
  return (
    <div
      className="learn-hue grid gap-3.5 rounded-xl bg-plate p-4.5 ring-1 ring-edge"
      style={{ "--h": next?.stage.hue ?? 222 } as CSSProperties}
    >
      {next ? (
        <>
          <div className="flex items-start justify-between gap-4 text-sm">
            <span className="text-ink-muted">
              {begun ? <Trans>Pick up where you left off</Trans> : <Trans>Start here</Trans>}
            </span>
            <ToReview />
          </div>
          <p className="text-2xl/tight font-semibold tracking-tight">
            {i18n._(next.name)}
            <span className="mt-0.5 block text-md font-normal tracking-normal text-ink-secondary">
              <Trans>
                Lesson {number} · {minutes} min
              </Trans>
              {" · "}
              <span lang="et">{next.et}</span>
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={lessonPath(next.slug as string, i18n.locale)}
              className={buttonClass("primary", "lg", "justify-self-start")}
            >
              {begun ? <Trans>Continue</Trans> : <Trans>Start lesson 1</Trans>}
              <ArrowRight aria-hidden="true" data-icon="inline-end" />
            </a>
            <a
              href={localizedPath("learnPlacement", i18n.locale)}
              className={buttonClass("secondary", "md", "justify-self-start")}
            >
              <Trans>Find your level</Trans>
            </a>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-4 text-sm">
            <span className="text-ink-muted">
              <Trans>You’ve finished every lesson so far</Trans>
            </span>
            <ToReview />
          </div>
          <p className="text-2xl/tight font-semibold tracking-tight">
            <Trans>More are on the way.</Trans>
          </p>
        </>
      )}
      <p className="flex flex-wrap gap-x-4 gap-y-1 border-t border-edge pt-3 text-sm text-ink-muted">
        <span>
          <Trans>
            Lessons done: <b className="font-semibold text-ink tabular-nums">{doneCount}</b> of{" "}
            {builtCount}
          </Trans>
        </span>
        <span>
          <Trans>
            <b className="font-semibold text-ink tabular-nums">{plannedCount}</b> planned, A1 to B1
          </Trans>
        </span>
      </p>
    </div>
  );
}

function ToReview() {
  const { i18n } = useLingui();
  const review = useReview();
  const count = dueIds(review, localDay(), drillSlugs).length;
  if (count === 0) return null;
  return (
    <a
      href={reviewPath(i18n.locale)}
      className="relative font-medium whitespace-nowrap text-(--form) underline underline-offset-2 before:absolute before:-inset-x-2 before:-inset-y-3"
    >
      <Plural value={count} one="# to review" other="# to review" />
    </a>
  );
}

/** One stage as a book's contents: its name, goal and progress beside the list of its lessons. */
function Stage({ index }: { index: number }) {
  const { i18n } = useLingui();
  const progress = useProgress();
  const stage = STAGES[index];
  if (!stage) return null;
  const built = stage.lessons.filter((lesson) => lesson.slug);
  const doneCount = built.filter(
    (lesson) => progress.lessons[lesson.slug as string]?.state === "done",
  ).length;
  const builtCount = built.length;
  const lessonCount = stage.lessons.length;
  const lessons = LESSONS.filter((lesson) => lesson.stage === stage);
  const id = `stage-${index + 1}`;
  return (
    <section
      aria-labelledby={id}
      className="learn-hue grid gap-10 border-t border-edge py-9 @3xl:grid-cols-[minmax(0,300px)_minmax(0,1fr)] max-@3xl:gap-4 max-@3xl:py-7"
      style={{ "--h": stage.hue } as CSSProperties}
    >
      <div className="grid content-start gap-2.5 self-start @3xl:sticky @3xl:top-5">
        <span>
          <span className="inline-grid h-6 place-items-center rounded-[7px] bg-(--tray) px-2 text-sm font-semibold text-(--form)">
            {stage.level}
          </span>
        </span>
        <h2 id={id} className="text-3xl leading-tight font-semibold tracking-tight">
          {i18n._(stage.name)}
        </h2>
        <p className="text-md text-ink-secondary">{i18n._(stage.goal)}</p>
        <div className="mt-1 grid gap-1.5 text-sm text-ink-muted tabular-nums">
          {builtCount ? (
            <>
              <span>
                <Trans>
                  {doneCount} of {builtCount} done
                </Trans>
              </span>
              <span className="h-1.5 overflow-hidden rounded-full bg-plate-nested">
                <span
                  className="block h-full rounded-full bg-(--form) transition-[width] duration-500"
                  style={{ width: `${(doneCount / builtCount) * 100}%` }}
                />
              </span>
            </>
          ) : (
            <span>
              <Plural
                value={lessonCount}
                one="# lesson, coming soon"
                other="# lessons, coming soon"
              />
            </span>
          )}
        </div>
      </div>
      <ol className="m-0 grid list-none p-0">
        {lessons.map((lesson) => (
          <Row key={lesson.n} lesson={lesson} status={statusOf(lesson, progress)} />
        ))}
      </ol>
    </section>
  );
}

function Row({ lesson, status }: { lesson: PlacedLesson; status: Status }) {
  const { i18n } = useLingui();
  const open = status !== "soon";
  const body = (
    <>
      <span
        aria-hidden="true"
        className={clsx(
          "min-w-[2.5ch] text-md font-semibold tabular-nums",
          open ? "text-(--form)" : "text-ink-muted",
        )}
      >
        {lesson.n}
      </span>
      <span className="min-w-0">
        <span
          className={clsx(
            "block text-xl leading-tight tracking-tight max-@3xl:text-lg",
            open ? "font-semibold" : "font-medium text-ink-secondary",
          )}
        >
          {i18n._(lesson.name)}
        </span>
        <span
          lang="et"
          className={clsx("block text-md", open ? "text-ink-secondary" : "text-ink-muted")}
        >
          {lesson.et}
        </span>
      </span>
      <StatusTag status={status} />
    </>
  );
  const row =
    "-mx-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-tile px-3 py-3.5 max-@3xl:gap-2.5";
  return (
    <li className="border-t border-edge first:border-t-0">
      {lesson.slug ? (
        <a
          href={lessonPath(lesson.slug, i18n.locale)}
          className={clsx(
            row,
            "text-ink no-underline transition-colors duration-150 hoverable:hover:bg-plate-nested",
          )}
        >
          {body}
        </a>
      ) : (
        <div className={row}>{body}</div>
      )}
    </li>
  );
}

function StatusTag({ status }: { status: Status }) {
  if (status === "done")
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-(--form)">
        <span className="grid size-5 place-items-center rounded-full bg-(--form) text-plate">
          <Check aria-hidden="true" className="size-3" strokeWidth={3} />
        </span>
        <Trans>Done</Trans>
      </span>
    );
  if (status === "started")
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-(--form)">
        <span
          aria-hidden="true"
          className="size-4 rounded-full border-2 border-(--form) border-s-transparent border-b-transparent"
        />
        <Trans>In progress</Trans>
      </span>
    );
  if (status === "soon")
    return (
      <span className="text-sm text-ink-muted">
        <Trans>Soon</Trans>
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-(--form)">
      <Trans>Start</Trans>
      <ArrowRight aria-hidden="true" className="size-4" />
    </span>
  );
}
