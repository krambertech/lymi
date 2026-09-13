import { clsx } from "clsx";
import type { ReactNode } from "react";
import { SAMPLE_CARDS } from "./cards";

const CARD = SAMPLE_CARDS[0];

const FIELDS = [
  { key: "Meaning", value: CARD?.meaning ?? "" },
  { key: "Example", value: CARD?.example ?? "" },
  { key: "Say it", value: CARD?.say ?? "" },
];

interface RowProps {
  label: string;
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
        {source}
      </span>
    </div>
  );
}

/** Every field names its source, so AI text is never mistaken for something the lesson said. */
export function EnrichDemo() {
  if (!CARD) return null;

  return (
    <div className="mx-auto max-w-[420px]">
      <div className="bg-plate px-5 py-3 edge" style={{ borderRadius: 14 }}>
        <Row label="Term" source="Lesson">
          <span className="text-xl font-medium tracking-[-0.026em] text-text">{CARD.term}</span>
        </Row>
        {FIELDS.map((f) => (
          <Row key={f.key} label={f.key} source="AI">
            {f.value}
          </Row>
        ))}
      </div>
    </div>
  );
}
