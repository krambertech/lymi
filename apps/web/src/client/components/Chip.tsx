import { Trans, useLingui } from "@lingui/react/macro";
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
        <Trans>Known</Trans>
      </Chip>
    );
  if (state === 0 || state == null)
    return (
      <Chip tone="new" dot size={size}>
        <Trans>New</Trans>
      </Chip>
    );
  return (
    <Chip tone="learning" dot size={size}>
      {state === 3 ? <Trans>Relearning</Trans> : <Trans>Learning</Trans>}
    </Chip>
  );
}

const sourceMeta: Record<FieldSource, { icon: typeof Sparkle; tone: ChipTone }> = {
  lesson: { icon: BookOpen, tone: "default" },
  ai: { icon: Sparkle, tone: "ai" },
  manual: { icon: PencilLine, tone: "default" },
};

type SourceField = "meaning" | "example";

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
  /** Which field. Shown as "AI meaning". */
  field?: SourceField | undefined;
  size?: "sm" | "md" | undefined;
}) {
  const { t } = useLingui();
  const m = sourceMeta[source];
  const Icon = m.icon;
  // Whole sentences per field, so each language can inflect the field word on its own.
  const text = !field
    ? source === "ai"
      ? t`AI wrote this`
      : source === "lesson"
        ? t`From the lesson`
        : t`You wrote this`
    : source === "ai"
      ? field === "meaning"
        ? t`AI meaning`
        : t`AI example`
      : source === "lesson"
        ? field === "meaning"
          ? t`Meaning from lesson`
          : t`Example from lesson`
        : field === "meaning"
          ? t`Meaning by you`
          : t`Example by you`;
  return (
    <Chip tone={m.tone} size={size}>
      <Icon className="size-3" aria-hidden="true" />
      {text}
    </Chip>
  );
}
