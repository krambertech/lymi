import { Plural, Trans } from "@lingui/react/macro";
import { RotateCcw } from "lucide-react";
import { useCallback, useContext } from "react";
import { currentReview, drawDrill, localDay } from "../../lib/learn/review";
import { Button } from "../Button";
import { type DrillKind, LAST_EXERCISE_SIZE, questionsOf } from "./drill-banks";
import { useDrillSession } from "./drill-session";
import { DrillRunner } from "./DrillRunner";
import { SectionContext, useLesson } from "./lesson-context";
import { QuizCard } from "./Quiz";

export function LoadProblem() {
  return (
    <p role="alert" className="text-md text-danger">
      <Trans>The questions didn’t load. Check your connection and try again.</Trans>
    </p>
  );
}

export function LastExercise({ kinds }: { kinds: readonly DrillKind[] }) {
  const { slug, finishSection } = useLesson();
  const section = useContext(SectionContext);
  const { session, open, more } = useDrillSession(
    () => [slug],
    (sources) =>
      drawDrill(
        questionsOf(sources).filter(({ item }) => kinds.includes(item.kind)),
        currentReview(),
        localDay(),
        LAST_EXERCISE_SIZE,
      ),
  );
  const finish = useCallback(() => {
    if (section) finishSection(section);
  }, [section, finishSection]);

  if (session.status === "open")
    return (
      <DrillRunner
        key={session.set}
        id="last"
        lesson={slug}
        title={<Plural value={session.questions.length} one="# question" other="# questions" />}
        questions={session.questions}
        sources={session.sources}
        repeats={false}
        onFinish={finish}
        end={
          <Button onClick={more}>
            <RotateCcw aria-hidden="true" data-icon="inline-start" />
            <Trans>Try again</Trans>
          </Button>
        }
      />
    );
  return (
    <QuizCard title={<Trans>A few questions</Trans>}>
      <Button variant="primary" loading={session.status === "loading"} onClick={open}>
        <Trans>Start</Trans>
      </Button>
      {session.status === "idle" && session.failed && <LoadProblem />}
    </QuizCard>
  );
}
