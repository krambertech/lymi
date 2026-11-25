import { Trans } from "@lingui/react/macro";
import { useCallback, useContext } from "react";
import { STAGES } from "../../lib/learn/catalogue";
import { drawBalanced } from "../../lib/learn/placement";
import { Button } from "../Button";
import { LoadProblem } from "./Drill";
import { type DrillSource, drillSlugs, type Question, questionsOf } from "./drill-banks";
import { useDrillSession } from "./drill-session";
import { DrillRunner } from "./DrillRunner";
import { SectionContext, useLesson } from "./lesson-context";
import { QuizCard } from "./Quiz";

function drawStageQuestions(sources: readonly DrillSource[], count: number): Question[] {
  return drawBalanced(questionsOf(sources), count, (question) => question.source.lesson);
}

export function Checkpoint({ stageIndex, count = 20 }: { stageIndex: number; count?: number }) {
  const { slug, finishSection } = useLesson();
  const section = useContext(SectionContext);
  const stage = STAGES[stageIndex];
  const slugs = (stage?.lessons ?? [])
    .map((lesson) => lesson.slug)
    .filter((item): item is string => !!item && item !== slug && drillSlugs.has(item));

  const { session, open, more } = useDrillSession(
    () => slugs,
    (sources) => drawStageQuestions(sources, count),
  );
  const finish = useCallback(() => {
    if (section) finishSection(section);
  }, [section, finishSection]);

  const title = <Trans>Stage checkpoint</Trans>;
  if (session.status === "open")
    return (
      <DrillRunner
        key={session.set}
        id="checkpoint"
        lesson={slug}
        title={title}
        questions={session.questions}
        sources={session.sources}
        repeats={false}
        onFinish={finish}
        end={
          <Button variant="primary" onClick={more}>
            <Trans>Try a new set</Trans>
          </Button>
        }
      />
    );
  return (
    <QuizCard title={title}>
      <Button variant="primary" loading={session.status === "loading"} onClick={open}>
        <Trans>Start checkpoint</Trans>
      </Button>
      {session.status === "idle" && session.failed && <LoadProblem />}
    </QuizCard>
  );
}
