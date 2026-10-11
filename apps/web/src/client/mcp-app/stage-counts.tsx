import { useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { StateIcon, type StateKey, stateMarks } from "../components/state-mark";

const STAGES = ["new", "learning", "known"] as const satisfies StateKey[];

interface Props {
  stages: Record<StateKey, number>;
  /** Draw the share of each stage as one bar above the counts. */
  bar?: boolean | undefined;
}

/** Cards by stage, each in its state's colour and icon, as Insights lists them. */
export function StageCounts({ stages, bar = false }: Props) {
  const { t, i18n } = useLingui();
  const total = stages.new + stages.learning + stages.known;
  return (
    <div className="flex flex-col gap-2.5">
      {bar && total > 0 && (
        // The counts below say the same in words, so the bar is not announced.
        <div aria-hidden="true" className="flex h-2 gap-0.5 overflow-hidden rounded-full">
          {STAGES.map(
            (stage) =>
              stages[stage] > 0 && (
                <span
                  key={stage}
                  className={clsx("h-full", stateMarks[stage].bg)}
                  style={{ flexGrow: stages[stage] }}
                />
              ),
          )}
        </div>
      )}
      <ul aria-label={t`Cards by stage`} className="flex flex-wrap gap-x-5 gap-y-2 px-1 text-sm">
        {STAGES.map((stage) => (
          <li key={stage} className="inline-flex items-center gap-1.5 text-text-2">
            <StateIcon state={stage} className="size-3.5" />
            <span className="font-medium tabular-nums text-text">{i18n.number(stages[stage])}</span>
            {i18n._(stateMarks[stage].groupLabel)}
          </li>
        ))}
      </ul>
    </div>
  );
}
