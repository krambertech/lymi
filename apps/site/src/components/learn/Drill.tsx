import { Trans } from "@lingui/react/macro";
import { useCallback, useContext } from "react";
import { currentReview, drawDrill, localDay } from "../../lib/learn/review";
import { Button } from "../Button";
import { questionsOf } from "./drill-banks";
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

export function Drill() {
  const { slug, finishSection } = useLesson();
  const section = useContext(SectionContext);
  const { session, open, more } = useDrillSession(
    () => [slug],
    (sources) => drawDrill(questionsOf(sources), currentReview(), localDay()),
  );
  const finish = useCallback(() => {
    if (section) finishSection(section);
  }, [section, finishSection]);

  const title = <Trans>Ten questions</Trans>;
  if (session.status === "open")
    return (
      <DrillRunner
        key={session.set}
        id="drill"
        lesson={slug}
        title={title}
        questions={session.questions}
        sources={session.sources}
        repeats
        onFinish={finish}
        end={
          <Button variant="primary" onClick={more}>
            <Trans>Ten more</Trans>
          </Button>
        }
      />
    );
  return (
    <QuizCard title={title}>
      <Button variant="primary" loading={session.status === "loading"} onClick={open}>
        <Trans>Start</Trans>
      </Button>
      {session.status === "idle" && session.failed && <LoadProblem />}
    </QuizCard>
  );
}
