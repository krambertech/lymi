import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { ArrowRight, Check } from "lucide-react";
import type { CSSProperties } from "react";
import { LESSONS, lessonPath, type PlacedLesson, STAGES } from "../../lib/learn/catalogue";
import { type Progress, useProgress } from "../../lib/learn/progress";
import { buttonClass } from "../Button";
import { LearnLayout } from "./LearnLayout";

type Status = "done" | "started" | "ready" | "soon";
const statusOf = (lesson: PlacedLesson, progress: Progress): Status =>
  !lesson.slug ? "soon" : (progress.lessons[lesson.slug]?.state ?? "ready");

/** The course: where to pick up, then every stage as a line of lessons, done, open or coming. */
export function HubView() {
  return (
    <LearnLayout languages={{ page: "learn" }}>
      <div className="mx-auto max-w-[1040px] px-5 pb-24">
        <section className="grid items-end gap-10 pt-9 pb-12 @3xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] max-sm:gap-6 max-sm:pt-5 max-sm:pb-8">
          <div>
            <h1 className="text-[clamp(2.75rem,7vw,4.75rem)] leading-[0.98] font-semibold tracking-[-0.04em] text-balance">
              <Trans>Estonian grammar, one idea at a time</Trans>
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
        <div className="mx-auto grid max-w-[720px] gap-3">
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
  const about = next ? i18n._(next.about) : "";
  const number = next?.n;
  return (
    <div
      className="learn-hue grid gap-3.5 rounded-xl bg-plate p-4.5 ring-1 ring-edge"
      style={{ "--h": next?.stage.hue ?? 222 } as CSSProperties}
    >
      {next ? (
        <>
          <span className="text-sm text-ink-muted">
            {begun ? <Trans>Pick up where you left off</Trans> : <Trans>Start here</Trans>}
          </span>
          <p className="text-2xl/tight font-semibold tracking-tight">
            <span lang="et">{next.et}</span>
            <span className="mt-0.5 block text-md font-normal tracking-normal text-ink-secondary">
              <Trans>
                Lesson {number} · {about} · {minutes} min
              </Trans>
            </span>
          </p>
          <a
            href={lessonPath(next.slug as string, i18n.locale)}
            className={buttonClass("primary", "lg", "justify-self-start")}
          >
            {begun ? <Trans>Continue</Trans> : <Trans>Start lesson 1</Trans>}
            <ArrowRight aria-hidden="true" data-icon="inline-end" />
          </a>
        </>
      ) : (
        <>
          <span className="text-sm text-ink-muted">
            <Trans>You've finished every lesson so far</Trans>
          </span>
          <p className="text-2xl/tight font-semibold tracking-tight">
            <Trans>More are on the way.</Trans>
          </p>
        </>
      )}
      <p className="flex flex-wrap gap-x-4 gap-y-1 border-t border-edge pt-3 text-sm text-ink-muted">
        <span>
          <Trans>
            <b className="font-semibold text-ink tabular-nums">{doneCount}</b> of {builtCount}{" "}
            lessons done
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
  const lessons = LESSONS.filter((lesson) => lesson.stage === stage);
  const id = `stage-${index + 1}`;
  return (
    <section
      aria-labelledby={id}
      className="learn-hue grid gap-1 rounded-xl bg-(--tray) px-5.5 pt-6 pb-3.5 max-sm:-mx-1 max-sm:px-3.5 max-sm:pt-5"
      style={{ "--h": stage.hue } as CSSProperties}
    >
      <div className="grid gap-2 pb-3.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="grid h-6 place-items-center rounded-[7px] bg-plate px-2 text-sm font-semibold text-(--form)">
            {stage.level}
          </span>
          <h2 id={id} className="text-[1.625rem] leading-tight font-semibold tracking-tight">
            {i18n._(stage.name)}
          </h2>
          <span className="ms-auto text-sm text-ink-muted tabular-nums">
            {builtCount ? (
              <Trans>
                {doneCount} of {builtCount} done
              </Trans>
            ) : (
              <Trans>Coming soon</Trans>
            )}
          </span>
        </div>
        <p className="max-w-[52ch] text-md text-ink-secondary">{i18n._(stage.goal)}</p>
      </div>
      <ol className="relative m-0 list-none p-0 before:absolute before:inset-y-5.5 before:start-[21px] before:w-1 before:rounded-full before:bg-[color-mix(in_oklab,var(--form)_30%,transparent)]">
        {lessons.map((lesson) => (
          <Stop key={lesson.n} lesson={lesson} status={statusOf(lesson, progress)} />
        ))}
      </ol>
    </section>
  );
}

function Stop({ lesson, status }: { lesson: PlacedLesson; status: Status }) {
  const { i18n } = useLingui();
  const open = status !== "soon";
  const body = (
    <>
      <span className="relative z-1 grid size-[46px] place-items-center">
        <i
          className={clsx(
            "grid place-items-center rounded-full not-italic transition-transform duration-200",
            open
              ? "size-10 border-3 border-(--form) text-[15px] font-semibold tabular-nums"
              : "size-[18px] border-4 border-[color-mix(in_oklab,var(--form)_45%,transparent)] bg-(--tray)",
            status === "done" ? "bg-(--form) text-plate" : open && "bg-plate text-(--form)",
            status === "started" && "shadow-[0_0_0_4px_var(--tray),0_0_0_6px_var(--form)]",
          )}
        >
          {status === "done" ? (
            <Check aria-hidden="true" className="size-4.5" strokeWidth={2.5} />
          ) : open ? (
            lesson.n
          ) : null}
        </i>
      </span>
      <span className="min-w-0">
        <span
          className={clsx(
            "block leading-tight tracking-tight",
            open ? "text-lg font-semibold" : "text-md font-medium text-ink-secondary",
          )}
        >
          <span className="me-1.5 text-xs font-medium tracking-normal text-ink-muted tabular-nums">
            {lesson.n}
          </span>
          <span lang="et">{lesson.et}</span>
        </span>
        <span
          className={clsx("block", open ? "text-sm text-ink-secondary" : "text-xs text-ink-muted")}
        >
          {i18n._(lesson.about)}
        </span>
      </span>
      {open && <StatusTag status={status} />}
    </>
  );
  const row =
    "grid grid-cols-[46px_minmax(0,1fr)_auto] items-center gap-3.5 rounded-tile py-2 pe-2.5";
  return (
    <li>
      {lesson.slug ? (
        <a
          href={lessonPath(lesson.slug, i18n.locale)}
          className={clsx(
            row,
            "min-h-15 text-ink no-underline transition-colors duration-150 hoverable:hover:bg-[color-mix(in_oklab,var(--plate)_55%,transparent)] [&:hover_i]:scale-105",
          )}
        >
          {body}
        </a>
      ) : (
        <div className={clsx(row, "min-h-[46px]")}>{body}</div>
      )}
    </li>
  );
}

function StatusTag({ status }: { status: Status }) {
  if (status === "done")
    return (
      <span className="text-sm font-medium text-ink-secondary">
        <Trans>Done</Trans>
      </span>
    );
  if (status === "started")
    return (
      <span className="text-sm font-medium text-(--form)">
        <Trans>In progress</Trans>
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-(--form)">
      <Trans>Start</Trans>
      <ArrowRight aria-hidden="true" className="size-4" />
    </span>
  );
}
