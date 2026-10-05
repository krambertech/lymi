import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { InsightsOut } from "@lymi/core";
import { ExternalLink } from "lucide-react";
import { productLinks } from "../../../shared/mcp-app";
import { Button } from "../../components/button";
import { RecallTally } from "../../components/recall-tally";
import { RunStrip } from "../../components/run-strip";
import { StatPlate } from "../../components/stat-plate";
import { StateIcon, stateMarks } from "../../components/state-mark";
import { useHost } from "../host";
import { ViewFrame } from "../view-frame";

/** Recall, the days reviewed and the cards by stage: the first three plates of Insights. */
export function InsightsView({ result }: { result: InsightsOut }) {
  const { t, i18n } = useLingui();
  const host = useHost();
  const links = productLinks(host.origin);
  const { recall, consistency, cards } = result;
  const pct = (v: number) => i18n.number(v, { style: "percent" });
  return (
    <ViewFrame
      title={t`How it’s going`}
      action={
        <Button size="sm" variant="ghost" onClick={() => host.open(links.insights())}>
          <Trans>Open Insights</Trans>
          <ExternalLink data-icon="inline-end" aria-hidden="true" />
        </Button>
      }
    >
      <div className="grid gap-3 @lg:grid-cols-2">
        <StatPlate
          label={t`Recall`}
          value={recall.rate === null ? "—" : pct(recall.rate)}
          figure={
            recall.passed + recall.failed > 0 ? (
              <RecallTally passed={recall.passed} failed={recall.failed} />
            ) : undefined
          }
          note={
            recall.rate === null
              ? t`No recall data yet. Review more cards to see how you’re doing.`
              : t`${recall.passed} remembered, ${recall.failed} forgotten.`
          }
        />
        <StatPlate
          label={t`Consistency`}
          value={consistency.lit}
          unit={t`/ ${plural(consistency.days.length, { one: "# day", other: "# days" })}`}
          figure={<RunStrip days={consistency.days} />}
          note={
            consistency.lit === 0
              ? t`No reviews yet. Each day you review adds a block.`
              : t`Each block is one day you reviewed.`
          }
        />
      </div>
      <ul aria-label={t`Cards by stage`} className="flex flex-wrap gap-x-5 gap-y-2 px-1 text-sm">
        {(["new", "learning", "known"] as const).map((stage) => (
          <li key={stage} className="inline-flex items-center gap-1.5 text-text-2">
            <StateIcon state={stage} className="size-3.5" />
            <span className="font-medium tabular-nums text-text">{i18n.number(cards[stage])}</span>
            {i18n._(stateMarks[stage].groupLabel)}
          </li>
        ))}
      </ul>
    </ViewFrame>
  );
}
