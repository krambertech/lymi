import { I18nProvider } from "@lingui/react";
import { Trans, useLingui } from "@lingui/react/macro";
import { captureAnalytics } from "@lymi/client/analytics";
import { ArrowRight, Check, RotateCcw } from "lucide-react";
import { type ReactNode, useEffect, useReducer, useRef, useState } from "react";
import { lessonPath } from "../../lib/learn/catalogue";
import { clipId, clipUrl } from "../../lib/learn/clips";
import {
  drillReducer,
  drillWord,
  endsWithThis,
  ruleScores,
  runQuizState,
  settledCount,
  startRun,
} from "../../lib/learn/drill";
import { saveAnswer } from "../../lib/learn/review";
import { Button } from "../Button";
import type { DrillSource, Question } from "./drill-banks";
import { DrillRound, RichText } from "./DrillRound";
import { QuizCard, ResultDots, Score } from "./Quiz";

interface Props {
  id: "drill" | "warm-up" | "review";
  lesson: string;
  title: ReactNode;
  questions: readonly Question[];
  sources: readonly DrillSource[];
  repeats: boolean;
  bandEnd?: ReactNode;
  onFinish?: () => void;
  end: ReactNode;
}

export function DrillRunner(props: Props) {
  const { id, lesson, title, questions, sources, repeats, bandEnd, onFinish, end } = props;
  const { t } = useLingui();
  const [run, dispatch] = useReducer(drillReducer, { items: questions, repeats }, startRun);
  const [autoplay, setAutoplay] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const finished = run.status === "finished";
  const reported = useRef(false);
  useEffect(() => {
    if (!finished || reported.current) return;
    reported.current = true;
    captureAnalytics("learn_quiz_finished", {
      lesson,
      quiz: id,
      right: Object.values(run.first).filter(Boolean).length,
      total: run.items.length,
      missed_rules: ruleScores(run)
        .filter((score) => score.right < score.total)
        .map(({ rule }) => rule),
    });
    onFinish?.();
  }, [finished, run, lesson, id, onFinish]);

  useEffect(() => {
    if (run.status === "answered") nextRef.current?.focus({ preventScroll: true });
    if (run.status === "finished")
      endRef.current?.querySelector<HTMLElement>("button, a")?.focus({ preventScroll: true });
    if (run.status === "asking") {
      const body = bodyRef.current;
      if (body && !body.contains(document.activeElement))
        body
          .querySelector<HTMLElement>("input:not([readonly]), button")
          ?.focus({ preventScroll: true });
    }
  }, [run.status, run.turn]);

  const total = run.items.length;
  const settled = settledCount(run);
  const right = Object.values(run.first).filter(Boolean).length;
  const announcement = finished
    ? t`${right} of ${total} right`
    : run.status === "answered"
      ? run.right
        ? t`Right.`
        : t`Not this one.`
      : "";
  const question = finished ? undefined : questions.find(({ id: each }) => each === run.now.id);
  const position = finished ? -1 : run.items.findIndex((each) => each.id === run.now.id);

  return (
    <QuizCard
      title={title}
      aside={
        <span className="flex flex-wrap items-center gap-2">
          <span className="flex items-center rounded-full bg-plate">
            <ResultDots
              results={run.items.map((each) => run.first[each.id])}
              now={position}
              total={total}
            />
            {!finished && (
              <>
                <span
                  aria-hidden="true"
                  className="pe-3 text-sm whitespace-nowrap text-ink-secondary tabular-nums"
                >
                  <Trans>
                    {settled} of {total}
                  </Trans>
                </span>
                <span className="sr-only">
                  <Trans>
                    Questions done: {settled} of {total}
                  </Trans>
                </span>
              </>
            )}
          </span>
          {!finished && bandEnd}
        </span>
      }
    >
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {run.status === "finished" ? (
        <>
          <Score
            right={right}
            total={total}
            verdict={() =>
              repeats ? <Trans>Counted on your first answer to each question.</Trans> : null
            }
            results={run.items.map((each) => run.first[each.id] === true)}
            recalled={questions.map(({ item, source }) => ({
              label: drillWord(item),
              src: clipUrl(source.lesson, clipId(item.say)),
            }))}
          />
          <RuleResults scores={ruleScores(run)} sources={sources} lesson={lesson} />
          <div ref={endRef} className="flex w-full flex-wrap gap-2.5">
            {end}
          </div>
        </>
      ) : (
        question && (
          <div ref={bodyRef} className="grid w-full grid-cols-1 justify-items-start gap-4">
            <I18nProvider i18n={question.source.i18n}>
              <div key={run.turn} className="grid w-full grid-cols-1 justify-items-start gap-4">
                <DrillRound
                  item={question.item}
                  lesson={question.source.lesson}
                  state={runQuizState(run)}
                  heard={() => dispatch({ type: "heard" })}
                  answer={(picked, isRight) => {
                    if (run.status === "asking" && !(question.id in run.first))
                      saveAnswer(question.id, isRight);
                    dispatch({ type: "answered", picked, right: isRight });
                  }}
                  autoplay={autoplay}
                />
              </div>
            </I18nProvider>
            {run.status === "answered" && (
              <div className="flex w-full justify-end pt-1">
                <Button
                  ref={nextRef}
                  variant="primary"
                  onClick={() => {
                    setAutoplay(true);
                    dispatch({ type: "next" });
                  }}
                >
                  {endsWithThis(run) ? t`See how you did` : t`Next`}
                  <ArrowRight aria-hidden="true" data-icon="inline-end" />
                </Button>
              </div>
            )}
          </div>
        )
      )}
    </QuizCard>
  );
}

function RuleResults({
  scores,
  sources,
  lesson,
}: {
  scores: ReturnType<typeof ruleScores>;
  sources: readonly DrillSource[];
  lesson: string;
}) {
  const { i18n } = useLingui();
  const rows = sources.flatMap((source) =>
    Object.entries(source.bank.rules).flatMap(([key, rule]) => {
      const score = scores.find((each) => each.rule === `${source.lesson}/${key}`);
      return score ? [{ ...score, ...rule, source }] : [];
    }),
  );
  return (
    <ul className="m-0 grid w-full list-none border-t border-edge p-0">
      {rows.map(({ rule, label, section, source, right, total }) => {
        const missed = right < total;
        const Icon = missed ? RotateCcw : Check;
        return (
          <li
            key={rule}
            className="flex items-start gap-3 border-b border-edge py-2.5 last:border-b-0"
          >
            <Icon
              aria-hidden="true"
              className={
                missed ? "mt-1 size-4 shrink-0 text-danger" : "mt-1 size-4 shrink-0 text-success"
              }
              strokeWidth={2.5}
            />
            <span className="grid min-w-0 flex-1 gap-0.5">
              <span className="font-medium">
                <I18nProvider i18n={source.i18n}>
                  <RichText text={label} />
                </I18nProvider>
              </span>
              {missed && (
                <a
                  href={
                    source.lesson === lesson
                      ? `#${section}`
                      : `${lessonPath(source.lesson, i18n.locale)}#${section}`
                  }
                  className="relative justify-self-start text-sm text-(--form) underline underline-offset-2 before:absolute before:-inset-y-2 before:inset-x-0"
                >
                  <Trans>Read it again</Trans>
                </a>
              )}
            </span>
            <span className="whitespace-nowrap text-ink-secondary tabular-nums">
              <Trans>
                {right} of {total}
              </Trans>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
