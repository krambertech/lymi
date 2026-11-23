import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { ArrowLeft } from "lucide-react";
import { type ReactNode, useSyncExternalStore } from "react";
import {
  currentReview,
  dueIds,
  interleave,
  localDay,
  nextDueDay,
  type Review,
  SET_SIZE,
  useReview,
} from "../../lib/learn/review";
import { localizedPath } from "../../lib/routes";
import { Button, buttonClass } from "../Button";
import { LoadProblem } from "./Drill";
import { type DrillSource, drillSlugs, lessonsOf, pickQuestions } from "./drill-banks";
import { useDrillSession } from "./drill-session";
import { DrillRunner } from "./DrillRunner";
import { LearnLayout } from "./LearnLayout";

const dueNow = (review: Review) => dueIds(review, localDay(), drillSlugs);

const drawDue = (sources: readonly DrillSource[]) =>
  interleave(pickQuestions(dueNow(currentReview()), sources).slice(0, SET_SIZE));

const never = () => () => {};
const useHydrated = () =>
  useSyncExternalStore(
    never,
    () => true,
    () => false,
  );

export function ReviewView() {
  const { i18n } = useLingui();
  return (
    <LearnLayout languages={{ page: "learnReview" }}>
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
            <Trans>Review</Trans>
          </h1>
          <p className="max-w-[44ch] text-[clamp(1.125rem,2vw,1.3125rem)] text-pretty text-ink-secondary">
            <Trans>
              Questions from the drills you’ve done, mixed across lessons, each on the day it’s due.
            </Trans>
          </p>
        </header>
        <Today />
        <p className="text-sm text-ink-muted">
          <Trans>
            A right answer brings a question back after 1, 3, 7 and then 21 days. A miss brings it
            back the next day. Your answers stay in this browser.
          </Trans>
        </p>
      </div>
    </LearnLayout>
  );
}

function Plate({ children }: { children?: ReactNode }) {
  return (
    <div className="grid min-h-52 content-center justify-items-start gap-4 rounded-xl bg-plate p-5 ring-1 ring-edge">
      {children}
    </div>
  );
}

function Today() {
  const hydrated = useHydrated();
  return hydrated ? <Due /> : <Plate />;
}

function Due() {
  const review = useReview();
  const due = dueNow(review);
  const { session, open, more } = useDrillSession(
    () => lessonsOf(dueNow(currentReview())),
    drawDue,
  );
  const left = due.length;
  const next = Math.min(left, SET_SIZE);

  if (session.status === "open")
    return (
      <DrillRunner
        key={session.set}
        id="review"
        lesson="review"
        title={<Trans>Due today</Trans>}
        questions={session.questions}
        sources={session.sources}
        repeats
        end={
          left > 0 ? (
            <Button variant="primary" onClick={more}>
              <Plural value={next} one="# more" other="# more" />
            </Button>
          ) : (
            <AllLessons primary />
          )
        }
      />
    );

  if (left === 0)
    return (
      <Plate>
        <NothingDue day={nextDueDay(review, localDay(), drillSlugs)} />
        <AllLessons />
      </Plate>
    );

  return (
    <Plate>
      <p className="text-2xl/tight font-semibold tracking-tight">
        <Plural value={left} one="# question to review" other="# questions to review" />
      </p>
      <Button variant="primary" size="lg" loading={session.status === "loading"} onClick={open}>
        <Trans>Start</Trans>
      </Button>
      {session.status === "idle" && session.failed && <LoadProblem />}
    </Plate>
  );
}

function AllLessons({ primary = false }: { primary?: boolean }) {
  const { i18n } = useLingui();
  return (
    <a
      href={localizedPath("learn", i18n.locale)}
      className={buttonClass(primary ? "primary" : "secondary")}
    >
      <Trans>All lessons</Trans>
    </a>
  );
}

function NothingDue({ day }: { day: number | null }) {
  const { i18n } = useLingui();
  if (day === null)
    return (
      <p className="text-lg text-ink-secondary">
        <Trans>
          Nothing to review yet. Do the drill at the end of a lesson, and its questions come back
          here.
        </Trans>
      </p>
    );
  const date = i18n.date(new Date(day * 86_400_000), {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  return (
    <p className="text-lg text-ink-secondary">
      <Trans>Nothing is due today. The next questions are due on {date}.</Trans>
    </p>
  );
}
