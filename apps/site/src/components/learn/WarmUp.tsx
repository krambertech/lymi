import { Plural, Trans } from "@lingui/react/macro";
import { useEffect, useRef, useState } from "react";
import { LESSONS, lessonBySlug } from "../../lib/learn/catalogue";
import { interleave, localDay, useReview, warmUpIds } from "../../lib/learn/review";
import { Button } from "../Button";
import { LoadProblem } from "./Drill";
import { drillSlugs, lessonsOf, pickQuestions } from "./drill-banks";
import { useDrillSession } from "./drill-session";
import { DrillRunner } from "./DrillRunner";

function earlierLessons(slug: string): ReadonlySet<string> {
  const number = lessonBySlug(slug)?.n ?? 0;
  return new Set(
    LESSONS.flatMap((lesson) =>
      lesson.slug && lesson.n < number && drillSlugs.has(lesson.slug) ? [lesson.slug] : [],
    ),
  );
}

export function useWarmUp(slug: string, focusLesson: () => void) {
  const review = useReview();
  const [earlier] = useState(() => earlierLessons(slug));
  const ids = warmUpIds(review, localDay(), earlier);
  const { session, open, close } = useDrillSession(
    () => lessonsOf(ids),
    (sources) => interleave(pickQuestions(ids, sources)),
  );
  const card = useRef<HTMLDivElement>(null);
  const opened = session.status === "open";
  useEffect(() => {
    if (!opened) return;
    card.current?.scrollIntoView({
      block: "start",
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, [opened]);

  const leave = () => {
    close();
    focusLesson();
  };
  const count = ids.length;
  const offered = session.status === "idle" || session.status === "loading";
  return {
    offer:
      offered && count > 0 ? (
        <Button size="sm" loading={session.status === "loading"} onClick={open}>
          <Plural value={count} one="Warm-up: # question" other="Warm-up: # questions" />
        </Button>
      ) : null,
    card: opened ? (
      <div ref={card} className="scroll-mt-4 pb-6">
        <DrillRunner
          id="warm-up"
          lesson={slug}
          title={<Trans>Warm-up</Trans>}
          questions={session.questions}
          sources={session.sources}
          repeats={false}
          bandEnd={
            <Button size="sm" onClick={leave}>
              <Trans>Skip</Trans>
            </Button>
          }
          end={
            <Button variant="primary" onClick={leave}>
              <Trans>Go to the lesson</Trans>
            </Button>
          }
        />
      </div>
    ) : session.status === "idle" && session.failed ? (
      <div className="pb-6">
        <LoadProblem />
      </div>
    ) : null,
  };
}
