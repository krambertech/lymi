import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { ExternalLink } from "lucide-react";
import { productLinks, type ViewDueResult } from "../../../shared/mcp-app";
import { Button } from "../../components/button";
import { DueCount } from "../../components/due-count";
import { useHost } from "../host";
import { ViewFrame } from "../view-frame";

/**
 * What is waiting, per deck, with the way into review. Review happens in Lymi, never here,
 * because an assistant must never grade one. ADR 0026.
 */
export function DueView({ result }: { result: ViewDueResult }) {
  const { t } = useLingui();
  const host = useHost();
  const links = productLinks(host.origin);
  const decks = result.decks.filter((d) => d.due > 0).sort((a, b) => b.due - a.due);
  const title =
    result.dueNow === 0
      ? t`Nothing due right now`
      : plural(result.dueNow, { one: "# card due", other: "# cards due" });
  return (
    <ViewFrame title={title}>
      {decks.length > 0 && (
        <ul aria-label={t`Due by deck`} className="flex flex-col divide-y divide-edge">
          {decks.map((deck) => (
            <li key={deck.id} className="flex items-center justify-between gap-3 py-2.5">
              <span className="min-w-0 truncate text-text">{deck.name}</span>
              <DueCount>{deck.due}</DueCount>
            </li>
          ))}
        </ul>
      )}
      {(result.rounds.forgotten > 0 || result.rounds.slipping > 0) && (
        <p className="text-sm text-text-2">
          {result.rounds.forgotten > 0 &&
            plural(result.rounds.forgotten, {
              one: "# forgotten today.",
              other: "# forgotten today.",
            })}{" "}
          {result.rounds.slipping > 0 &&
            plural(result.rounds.slipping, {
              one: "# often forgotten.",
              other: "# often forgotten.",
            })}
        </p>
      )}
      <div>
        <Button
          size="sm"
          variant={result.dueNow > 0 ? "primary" : "secondary"}
          onClick={() => host.open(result.dueNow > 0 ? links.review() : links.today())}
        >
          {result.dueNow > 0 ? <Trans>Review in Lymi</Trans> : <Trans>Open Lymi</Trans>}
          <ExternalLink data-icon="inline-end" aria-hidden="true" />
        </Button>
      </div>
    </ViewFrame>
  );
}
