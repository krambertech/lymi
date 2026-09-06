import { clsx } from "clsx";
import { useState } from "react";
import { Button } from "../components/Button";
import { SAMPLE_CARDS } from "./cards";
import { prefersReducedMotion } from "./motion";

const CARD = SAMPLE_CARDS[0];

/** Which fields the AI can fill in, in the order they arrive. */
const FIELDS = [
  { key: "Meaning", value: CARD?.meaning ?? "" },
  { key: "Example", value: CARD?.example ?? "" },
  { key: "Say it", value: CARD?.say ?? "" },
];

interface RowProps {
  label: string;
  source: "Lesson" | "AI";
  filled: boolean;
  children: React.ReactNode;
}

function Row({ label, source, filled, children }: RowProps) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-edge py-2.5 last:border-b-0">
      <span className="w-[68px] shrink-0 pt-1 text-2xs tracking-[0.06em] text-faint uppercase">
        {label}
      </span>
      <div className="flex-1 text-sm text-text-2">
        {filled ? children : <span className="text-faint italic">empty</span>}
      </div>
      <span
        className={clsx(
          "mt-0.5 shrink-0 rounded-xs px-1.5 py-px text-[9px] tracking-[0.06em] uppercase transition-opacity duration-300",
          source === "AI" ? "bg-amber-soft text-amber-text" : "bg-plate-2 text-muted",
          filled ? "opacity-100" : "opacity-0",
        )}
      >
        {source}
      </span>
    </div>
  );
}

/**
 * The honest half of the AI story. A card arrives with a term and nothing else; enriching
 * fills in the rest and labels every field with where it came from, so AI text is never
 * mistaken for something the lesson said. Nothing with text in it is overwritten.
 */
export function EnrichDemo() {
  const [done, setDone] = useState(0);
  const [running, setRunning] = useState(false);

  const run = () => {
    if (running || done >= FIELDS.length) return;
    setRunning(true);
    const step = prefersReducedMotion() ? 0 : 420;
    FIELDS.forEach((_, i) => {
      window.setTimeout(
        () => {
          setDone(i + 1);
          if (i === FIELDS.length - 1) setRunning(false);
        },
        step * (i + 1),
      );
    });
  };

  if (!CARD) return null;

  return (
    <div className="mx-auto max-w-[400px]">
      <div className="rounded-md bg-plate px-5 py-3 edge">
        <Row label="Term" source="Lesson" filled>
          <span className="text-xl font-medium tracking-[-0.026em] text-text">{CARD.term}</span>
        </Row>
        {FIELDS.map((f, i) => (
          <Row key={f.key} label={f.key} source="AI" filled={done > i}>
            {f.value}
          </Row>
        ))}
      </div>
      <Button
        variant={done >= FIELDS.length ? "secondary" : "primary"}
        size="sm"
        className="mx-auto mt-4 flex"
        onClick={run}
        disabled={done >= FIELDS.length}
        loading={running}
      >
        {done >= FIELDS.length ? "Three fields, all labelled" : "Enrich"}
      </Button>
    </div>
  );
}
