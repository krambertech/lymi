import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { ExternalLink } from "lucide-react";
import { productLinks } from "../../../shared/mcp-app";
import { Button } from "../../components/button";
import { DueCount } from "../../components/due-count";
import { useHost } from "../host";
import { ViewFrame } from "../view-frame";

export interface HomeResult {
  dueNow: number;
  decks: { id: string; name: string; due: number }[];
}

/**
 * Lymi's home in ChatGPT's sidebar and beside a conversation: what is due, per deck. Review
 * opens in Lymi, as everywhere else in the assistant.
 */
export function HomeView({ result }: { result: HomeResult }) {
  const { t } = useLingui();
  const host = useHost();
  const links = productLinks(host.origin);
  const decks = result.decks.filter((d) => d.due > 0).sort((a, b) => b.due - a.due);

  const title =
    result.dueNow === 0
      ? t`Nothing due right now`
      : plural(result.dueNow, { one: "# card due", other: "# cards due" });

  return (
    <ViewFrame
      title={title}
      action={
        <Button
          size="sm"
          variant={result.dueNow > 0 ? "primary" : "secondary"}
          onClick={() => host.open(result.dueNow > 0 ? links.review() : links.today())}
        >
          {result.dueNow > 0 ? <Trans>Review in Lymi</Trans> : <Trans>Open Lymi</Trans>}
          <ExternalLink data-icon="inline-end" aria-hidden="true" />
        </Button>
      }
    >
      {decks.length > 0 && (
        <ul aria-label={t`Due by deck`} className="flex flex-wrap gap-2">
          {decks.map((deck) => (
            <li
              key={deck.id}
              className="inline-flex items-center gap-2 rounded-full bg-plate-2 py-1 ps-3 pe-1 text-sm text-text-2"
            >
              {deck.name}
              <DueCount count={deck.due} />
            </li>
          ))}
        </ul>
      )}
    </ViewFrame>
  );
}
