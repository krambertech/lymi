import { Plural, useLingui } from "@lingui/react/macro";
import type { StreakOut } from "@lymi/core";
import { StreakWeek } from "../../components/streak-week";
import { ViewFrame } from "../view-frame";

/** The week's lights and the run, with today against the goal. Never a nudge: an unlit day is just unlit. */
export function StreakView({ result }: { result: StreakOut }) {
  const { t } = useLingui();
  const { today } = result;
  return (
    <ViewFrame title={t`Your week`}>
      <StreakWeek summary={result} size="lg" className="py-2" />
      {/* The streak panel's own wording, so the two never disagree. */}
      <p className="text-sm tabular-nums text-text-2">
        {today.attempts > today.goal ? (
          <Plural
            value={today.attempts}
            one={`# review, goal ${today.goal}`}
            other={`# reviews, goal ${today.goal}`}
          />
        ) : (
          <Plural
            value={today.goal}
            one={`${today.attempts} of # review`}
            other={`${today.attempts} of # reviews`}
          />
        )}
      </p>
    </ViewFrame>
  );
}
