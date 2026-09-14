import { Trans, useLingui } from "@lingui/react/macro";
import type { FieldSource } from "@lymi/core";
import { clsx } from "clsx";
import { BookOpen, PencilLine, Sparkle } from "lucide-react";
import type { ReactNode } from "react";
import { StateIcon, stateKey } from "./state-mark";

export type ChipTone = "default" | "ai" | "danger";

const tones: Record<ChipTone, string> = {
  default: "bg-plate-2 text-text-2",
  ai: "border border-dashed border-edge-2 bg-transparent text-muted",
  danger: "bg-danger-soft text-danger",
};

export function Chip({
  tone = "default",
  size = "md",
  children,
  className,
}: {
  tone?: ChipTone | undefined;
  size?: "sm" | "md" | "lg" | undefined;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-medium tabular-nums",
        size === "lg" && "h-7 gap-2 px-3 text-sm",
        size === "md" && "h-[26px] px-2.5 text-xs",
        size === "sm" && "h-[22px] px-2 text-2xs",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * FSRS state as the learner sees it: the state's icon on a plain chip, so the colour is the mark's
 * alone. Relearning says what happened, "Forgot recently", with the Forgot grade's mark.
 */
export function StateChip({
  state,
  size,
}: {
  state: number | null | undefined;
  size?: "sm" | "md" | "lg" | undefined;
}) {
  const icon = size === "lg" ? "size-3.5" : "size-3";
  if (state === 3)
    return (
      <Chip size={size}>
        <StateIcon state="forgot" className={icon} />
        <Trans>Forgot recently</Trans>
      </Chip>
    );
  const key = stateKey(state);
  return (
    <Chip size={size}>
      <StateIcon state={key} className={icon} />
      {key === "known" ? (
        <Trans>Known</Trans>
      ) : key === "learning" ? (
        <Trans>Learning</Trans>
      ) : (
        <Trans>New</Trans>
      )}
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
