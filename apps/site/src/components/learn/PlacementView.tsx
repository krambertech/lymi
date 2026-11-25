import { Trans, useLingui } from "@lingui/react/macro";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { lessonPath, STAGES } from "../../lib/learn/catalogue";
import type { ruleScores } from "../../lib/learn/drill";
import { shuffle } from "../../lib/learn/quiz";
import { localizedPath } from "../../lib/routes";
import { Button, buttonClass } from "../Button";
import { LoadProblem } from "./Drill";
import { type DrillSource, drillSlugs, type Question, questionsOf } from "./drill-banks";
import { useDrillSession } from "./drill-session";
import { DrillRunner } from "./DrillRunner";
import { LearnLayout } from "./LearnLayout";
import { QuizCard } from "./Quiz";

const PER_STAGE = 3;

function placementSlugs(): string[] {
  return STAGES.flatMap((stage) => {
    const drilled = stage.lessons
      .map((lesson) => lesson.slug)
      .filter((slug): slug is string => !!slug && drillSlugs.has(slug));
    if (drilled.length <= PER_STAGE) return drilled;
    const mid = Math.floor(drilled.length / 2);
    return [drilled[0] as string, drilled[mid] as string, drilled[drilled.length - 1] as string];
  });
}

function drawPlacement(sources: readonly DrillSource[]): Question[] {
  const bySlug = new Map(sources.map((source) => [source.lesson, source]));
  const picked: Question[] = [];
  for (const stage of STAGES) {
    const stageSources = stage.lessons
      .map((lesson) => (lesson.slug ? bySlug.get(lesson.slug) : undefined))
      .filter((source): source is DrillSource => !!source);
    const pool = shuffle(questionsOf(stageSources));
    const seenRules = new Set<string>();
    const chosen: Question[] = [];
    for (const q of pool) {
      if (chosen.length >= PER_STAGE) break;
      if (seenRules.has(q.rule)) continue;
      seenRules.add(q.rule);
      chosen.push(q);
    }
    for (const q of pool) {
      if (chosen.length >= PER_STAGE) break;
      if (!chosen.includes(q)) chosen.push(q);
    }
    picked.push(...chosen);
  }
  return picked;
}

function PlacementResult({
  scores,
  sources,
}: {
  scores: ReturnType<typeof ruleScores>;
  sources: readonly DrillSource[];
}) {
  const { i18n } = useLingui();
  const stageOfLesson = new Map<string, number>();
  STAGES.forEach((stage, index) => {
    for (const lesson of stage.lessons) {
      if (lesson.slug) stageOfLesson.set(lesson.slug, index);
    }
  });

  const totals = STAGES.map((stage, index) => ({
    index,
    stage,
    right: 0,
    total: 0,
  }));
  for (const score of scores) {
    const slug = score.rule.split("/")[0] ?? "";
    const idx = stageOfLesson.get(slug);
    if (idx !== undefined && totals[idx]) {
      totals[idx].right += score.right;
      totals[idx].total += score.total;
    }
  }
  const active = totals.filter((entry) => entry.total > 0);
  const weak = active.find((entry) => entry.right / entry.total < 2 / 3);
  const targetStage = weak?.stage ?? STAGES[STAGES.length - 1];
  const targetNumber = (weak?.index ?? STAGES.length - 1) + 1;
  const startLesson = weak
    ? targetStage?.lessons.find((lesson) => lesson.slug)
    : targetStage?.lessons.findLast((lesson) => lesson.slug);
  const sourceCount = sources.length;

  return (
    <div className="grid w-full gap-4 rounded-xl bg-(--tray) p-4.5">
      <div className="grid gap-1">
        <span className="text-sm font-medium text-(--form)">
          {weak ? (
            <Trans>
              Recommended start · Stage {targetNumber} ({targetStage?.level})
            </Trans>
          ) : (
            <Trans>Ready for B1 practice ({sourceCount} lessons checked)</Trans>
          )}
        </span>
        <p className="text-xl/snug font-semibold tracking-tight">
          {weak && targetStage ? (
            <Trans>Start with {i18n._(targetStage.name)}</Trans>
          ) : (
            <Trans>You already handle A1 to B1 fundamentals well.</Trans>
          )}
        </p>
        {startLesson?.slug && (
          <a
            href={lessonPath(startLesson.slug, i18n.locale)}
            className={buttonClass("primary", "md", "mt-2 justify-self-start")}
          >
            <Trans>Open {i18n._(startLesson.name)}</Trans>
            <ArrowRight aria-hidden="true" data-icon="inline-end" />
          </a>
        )}
      </div>
      <ul className="m-0 grid list-none gap-1.5 border-t border-edge pt-3 p-0 text-sm">
        {active.map(({ index, stage, right, total }) => (
          <li key={stage.hue} className="flex items-center justify-between gap-3">
            <span className="text-ink-secondary">
              <Trans>
                Stage {index + 1} · {stage.level} · {i18n._(stage.name)}
              </Trans>
            </span>
            <span className="font-medium tabular-nums">
              <Trans>
                {right} of {total}
              </Trans>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PlacementView() {
  const { i18n } = useLingui();
  const { session, open, more } = useDrillSession(placementSlugs, drawPlacement);

  return (
    <LearnLayout languages={{ page: "learnPlacement" }}>
      <div className="mx-auto grid max-w-[720px] gap-6 px-5 pt-5 pb-24">
        <header className="grid gap-3">
          <a
            href={localizedPath("learn", i18n.locale)}
            className="relative inline-flex items-center gap-1.5 justify-self-start rounded-xs text-sm font-medium text-ink-secondary before:absolute before:inset-x-0 before:-inset-y-3 hoverable:hover:text-ink"
          >
            <ArrowLeft aria-hidden="true" className="size-4 rtl:-scale-x-100" />
            <Trans>All lessons</Trans>
          </a>
          <h1 className="mt-3 text-[clamp(2.75rem,7vw,4.25rem)] leading-none font-semibold tracking-[-0.035em] text-balance">
            <Trans>Find your level</Trans>
          </h1>
          <p className="max-w-[44ch] text-[clamp(1.125rem,2vw,1.3125rem)] text-pretty text-ink-secondary">
            <Trans>
              Eighteen short questions from A1 basics to B1 sentences. No hints beforehand — at the
              end we suggest where in the course to start.
            </Trans>
          </p>
        </header>
        {session.status === "open" ? (
          <DrillRunner
            key={session.set}
            id="placement"
            lesson="tasemetest"
            title={<Trans>Placement test</Trans>}
            questions={session.questions}
            sources={session.sources}
            repeats={false}
            afterScore={(scores) => <PlacementResult scores={scores} sources={session.sources} />}
            end={
              <Button variant="secondary" onClick={more}>
                <Trans>Take again</Trans>
              </Button>
            }
          />
        ) : (
          <QuizCard title={<Trans>Placement test</Trans>}>
            <p className="text-md text-ink-secondary">
              <Trans>Takes about 10 minutes. Includes audio and short typed answers.</Trans>
            </p>
            <Button variant="primary" loading={session.status === "loading"} onClick={open}>
              <Trans>Start placement test</Trans>
            </Button>
            {session.status === "idle" && session.failed && <LoadProblem />}
          </QuizCard>
        )}
      </div>
    </LearnLayout>
  );
}
