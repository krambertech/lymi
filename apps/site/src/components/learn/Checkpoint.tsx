import { Trans } from "@lingui/react/macro";
import { useCallback, useContext } from "react";
import { STAGES } from "../../lib/learn/catalogue";
import { shuffle } from "../../lib/learn/quiz";
import { Button } from "../Button";
import { LoadProblem } from "./Drill";
import { type DrillSource, drillSlugs, type Question, questionsOf } from "./drill-banks";
import { useDrillSession } from "./drill-session";
import { DrillRunner } from "./DrillRunner";
import { SectionContext, useLesson } from "./lesson-context";
import { QuizCard } from "./Quiz";

function drawStageQuestions(sources: readonly DrillSource[], count: number): Question[] {
  const byRule = new Map<string, Question[]>();
  for (const question of shuffle(questionsOf(sources))) {
    const list = byRule.get(question.rule) ?? [];
    list.push(question);
    byRule.set(question.rule, list);
  }
  const rules = shuffle([...byRule.keys()]);
  const picked: Question[] = [];
  let round = 0;
  while (picked.length < count) {
    let added = false;
    for (const rule of rules) {
      const next = byRule.get(rule)?.[round];
      if (next && picked.length < count) {
        picked.push(next);
        added = true;
      }
    }
    if (!added) break;
    round += 1;
  }
  return shuffle(picked);
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
