import type { FieldSource } from "@lymi/core";
import { clsx } from "clsx";
import { BookOpen, PencilLine, Sparkle } from "lucide-react";
import type { ReactNode } from "react";

export type ChipTone = "default" | "new" | "learning" | "known" | "ai" | "danger";

const tones: Record<ChipTone, string> = {
  default: "bg-plate-2 text-text-2",
  new: "bg-amber-soft text-amber-text",
  learning: "edge bg-transparent text-text-2",
  known: "bg-good-soft text-good",
  ai: "border border-dashed border-edge-2 bg-transparent text-muted",
  danger: "bg-danger-soft text-danger",
};

export function Chip({
  tone = "default",
  dot,
  size = "md",
  children,
  className,
}: {
  tone?: ChipTone | undefined;
  dot?: boolean | undefined;
  size?: "sm" | "md" | undefined;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-medium tabular-nums",
        size === "md" ? "h-[26px] px-2.5 text-xs" : "h-[22px] px-2 text-2xs",
        tones[tone],
        className,
      )}
    >
      {dot && <i className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}

/** FSRS state as the learner sees it. 0 New, 1 Learning, 2 Review (Known), 3 Relearning. */
export function StateChip({
  state,
  size,
}: {
  state: number | null | undefined;
  size?: "sm" | "md" | undefined;
}) {
  if (state === 2)
    return (
      <Chip tone="known" dot size={size}>
        Known
      </Chip>
    );
  if (state === 0 || state == null)
    return (
      <Chip tone="new" dot size={size}>
        New
      </Chip>
    );
  return (
    <Chip tone="learning" dot size={size}>
      {state === 3 ? "Relearning" : "Learning"}
    </Chip>
  );
}

const sourceMeta: Record<FieldSource, { label: string; icon: typeof Sparkle; tone: ChipTone }> = {
  lesson: { label: "From the lesson", icon: BookOpen, tone: "default" },
  ai: { label: "AI wrote this", icon: Sparkle, tone: "ai" },
  manual: { label: "You wrote this", icon: PencilLine, tone: "default" },
};

/**
 * Where a field's content came from. AI text is always labelled so it is never mistaken for
 * the lesson. The dashed edge is the "not confirmed" signal, on top of the label.
 */
export function SourceChip({
  source,
  field,
  size = "sm",
}: {
  source: FieldSource;
  /** Which field, e.g. "meaning". Shown as "AI meaning". */
  field?: string | undefined;
  size?: "sm" | "md" | undefined;
}) {
  const m = sourceMeta[source];
  const Icon = m.icon;
  const cap = field ? `${field[0]?.toUpperCase()}${field.slice(1)}` : "";
  const text = !field
    ? m.label
    : source === "ai"
      ? `AI ${field}`
      : source === "lesson"
        ? `${cap} from lesson`
        : `${cap} by you`;
  return (
    <Chip tone={m.tone} size={size}>
      <Icon className="size-3" aria-hidden="true" />
      {text}
    </Chip>
  );
}
