import { Trans, useLingui } from "@lingui/react/macro";
import { stripReadings } from "@lymi/core/reading";
import { ExternalLink } from "lucide-react";
import { productLinks, type ViewCard } from "../../../shared/mcp-app";
import { Button } from "../../components/button";
import { SourceChip } from "../../components/chip";
import { useHost } from "../host";
import { ViewFrame } from "../view-frame";

/** One card, as `get_card` or `update_card` returned it. Changes go through the assistant. */
export function CardView({ card }: { card: ViewCard }) {
  const { t } = useLingui();
  const host = useHost();
  const links = productLinks(host.origin);
  const lang = card.language ?? undefined;
  const rows: {
    label: string;
    text: string | null;
    field: "example" | "pronunciation" | "hook" | null;
    ai: boolean;
    lang?: string | undefined;
  }[] = [
    {
      label: t`Example`,
      // Small type leaves no room for furigana, so the example reads as written.
      text: card.example && stripReadings(card.example, card.language),
      field: "example",
      ai: card.exampleSource === "ai",
      lang,
    },
    {
      label: t`Pronunciation`,
      text: card.pronunciation,
      field: "pronunciation",
      ai: card.pronunciationSource === "ai",
    },
    { label: t`Hook`, text: card.hook, field: "hook", ai: card.hookSource === "ai" },
    { label: t`Picture`, text: card.image?.description ?? null, field: null, ai: false },
    { label: t`Source`, text: card.source, field: null, ai: false },
  ];
  const shown = rows.filter((row) => row.text);

  return (
    <ViewFrame
      title={card.term}
      action={
        <Button
          size="sm"
          variant="ghost"
          onClick={() => host.open(links.card(card.deckId, card.id))}
        >
          <Trans>Open in Lymi</Trans>
          <ExternalLink data-icon="inline-end" aria-hidden="true" />
        </Button>
      }
    >
      <p className="flex flex-wrap items-center gap-2 text-text-2">
        {card.meaning ? (
          <span>{card.meaning}</span>
        ) : (
          <span className="text-muted">{t`No meaning yet`}</span>
        )}
        {card.meaningSource === "ai" && <SourceChip source="ai" field="meaning" size="xs" />}
      </p>
      {shown.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {shown.map((row) => (
            <div key={row.label} className="contents">
              <dt className="flex items-center gap-1.5 text-muted">
                {row.label}
                {row.ai && row.field && <SourceChip source="ai" field={row.field} size="xs" />}
              </dt>
              <dd className="min-w-0 text-text" lang={row.lang}>
                {row.text}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </ViewFrame>
  );
}
