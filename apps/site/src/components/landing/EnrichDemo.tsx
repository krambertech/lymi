import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import type { ReactNode } from "react";
import { SAMPLE_CARDS, type SampleCard } from "./cards";

interface RowProps {
  label: ReactNode;
  source: "Lesson" | "AI";
  children: ReactNode;
}

function Row({ label, source, children }: RowProps) {
  return (
    <div className="flex min-h-[46px] items-start justify-between gap-3 border-b border-edge py-2.5 last:border-b-0">
      <span className="w-[68px] shrink-0 pt-1 text-2xs tracking-[0.06em] text-muted uppercase">
        {label}
      </span>
      <div className="flex-1 text-sm text-text-2">{children}</div>
      <span
        className={clsx(
          "mt-0.5 shrink-0 rounded-xs px-1.5 py-px text-[0.5625rem] tracking-[0.06em] uppercase",
          source === "AI" ? "bg-amber-soft text-amber-text" : "bg-plate-2 text-muted",
        )}
      >
        {source === "AI" ? <Trans>AI</Trans> : <Trans>Lesson</Trans>}
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
      <div className="bg-plate px-5 py-3 edge" style={{ borderRadius: 14 }}>
        <Row label={<Trans>Term</Trans>} source="Lesson">
          <span lang={card.language} className="text-xl font-medium tracking-[-0.026em] text-text">
            {card.term}
          </span>
        </Row>
        <Row label={<Trans>Meaning</Trans>} source="AI">
          {i18n._(card.meaning)}
        </Row>
        <Row label={<Trans>Example</Trans>} source="AI">
          <span lang={card.language}>{card.example}</span>
        </Row>
        <Row label={<Trans>Say it</Trans>} source="AI">
          {card.say}
        </Row>
      </div>
    </div>
  );
}
