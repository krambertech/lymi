import { Trans, useLingui } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { SAMPLE_CARDS, type SampleCard } from "./cards";
import { type Source, SourceMark } from "./SourceMark";

interface RowProps {
  label: ReactNode;
  source: Source;
  children: ReactNode;
}

function Row({ label, source, children }: RowProps) {
  return (
    <div className="col-span-full grid min-h-[46px] grid-cols-subgrid items-start gap-x-3 border-b border-edge py-2.5 last:border-b-0">
      <span className="pt-1 text-xs tracking-[0.06em] text-ink-muted uppercase">{label}</span>
      <div className="min-w-0 text-sm text-ink-secondary">{children}</div>
      <span className="mt-0.5 justify-self-end">
        <SourceMark source={source} />
      </span>
    </div>
  );
}

interface Props {
  card?: SampleCard | undefined;
}

/** Every field names its source, so AI text is never mistaken for something the lesson said. */
export function EnrichDemo({ card = SAMPLE_CARDS[0] }: Props) {
  const { i18n } = useLingui();
  if (!card) return null;

  return (
    <div className="mx-auto max-w-[420px]">
      <div
        className="grid grid-cols-[auto_minmax(0,1fr)_auto] bg-plate px-5 py-3 edge"
        style={{ borderRadius: 14 }}
      >
        <Row label={<Trans>Term</Trans>} source="lesson">
          <span lang={card.language} className="text-xl font-medium tracking-[-0.026em] text-ink">
            {card.term}
          </span>
        </Row>
        <Row label={<Trans>Meaning</Trans>} source="ai">
          {i18n._(card.meaning)}
        </Row>
        <Row label={<Trans>Example</Trans>} source="ai">
          <span lang={card.language}>{card.example}</span>
        </Row>
        <Row label={<Trans>Say it</Trans>} source="ai">
          {card.say}
        </Row>
      </div>
    </div>
  );
}
