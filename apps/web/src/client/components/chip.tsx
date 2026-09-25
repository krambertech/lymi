import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { FieldSource } from "@lymi/core";
import { clsx } from "clsx";
import { BookOpen, PencilLine, Sparkle } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { StateIcon, stateKey, stateMarks } from "./state-mark";

export type ChipTone = "default" | "ai" | "danger";

const tones: Record<ChipTone, string> = {
  default: "bg-plate-2 text-text-2",
  ai: "bg-ai-soft text-ai",
  danger: "bg-danger-soft text-danger",
};

interface ChipProps extends ComponentProps<"span"> {
  tone?: ChipTone | undefined;
  size?: "xs" | "sm" | "md" | "lg" | undefined;
  children: ReactNode;
}

export function Chip({ tone = "default", size = "md", className, ...rest }: ChipProps) {
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-medium tabular-nums",
        size === "lg" && "h-7 gap-2 px-3 text-sm",
        size === "md" && "h-[26px] px-2.5 text-xs",
        size === "sm" && "h-[22px] px-2 text-2xs",
        size === "xs" && "h-[17px] gap-1 px-1.5 text-2xs",
        tones[tone],
        className,
      )}
      {...rest}
    />
  );
}

/**
 * FSRS state as the learner sees it: the state's icon on a plain chip, so the colour is the mark's
 * alone. Under review a relearning card says what happened, "Forgotten recently", with the Forgot
 * grade's mark; elsewhere the lapse may be months old, so it is plain Learning.
 */
export function StateChip({
  state,
  size,
  inReview = false,
}: {
  state: number | null | undefined;
  size?: "sm" | "md" | "lg" | undefined;
  inReview?: boolean | undefined;
}) {
  const { i18n } = useLingui();
  const icon = size === "lg" ? "size-3.5" : "size-3";
  if (inReview && state === 3)
    return (
      <Chip size={size}>
        <StateIcon state="forgot" className={icon} />
        <Trans>Forgotten recently</Trans>
      </Chip>
    );
  const key = stateKey(state);
  return (
    <Chip size={size}>
      <StateIcon state={key} className={icon} />
      {i18n._(stateMarks[key].label)}
    </Chip>
  );
}

const sourceMeta: Record<
  FieldSource,
  { icon: typeof Sparkle; tone: ChipTone; mark: MessageDescriptor }
> = {
  lesson: { icon: BookOpen, tone: "default", mark: msg`Lesson` },
  ai: { icon: Sparkle, tone: "ai", mark: msg`AI` },
  manual: { icon: PencilLine, tone: "default", mark: msg`You` },
};

type SourceField = "meaning" | "example" | "pronunciation";

// Whole sentences per field, so each language can inflect the field word on its own. `field`
// is the form for a place that does not name the field next to the chip.
const sourceLabels: Record<SourceField | "field", Record<FieldSource, MessageDescriptor>> = {
  field: {
    lesson: msg`From the lesson`,
    ai: msg`AI wrote this`,
    manual: msg`You wrote this`,
  },
  meaning: {
    lesson: msg`Meaning from lesson`,
    ai: msg`AI meaning`,
    manual: msg`Meaning by you`,
  },
  example: {
    lesson: msg`Example from lesson`,
    ai: msg`AI example`,
    manual: msg`Example by you`,
  },
  pronunciation: {
    lesson: msg`Pronunciation from lesson`,
    ai: msg`AI pronunciation`,
    manual: msg`Pronunciation by you`,
  },
};

/**
 * Where a field's content came from. AI text is always labelled so it is never mistaken for
 * the lesson, and it is the one source with a colour: the lesson and the learner are the
 * ordinary case and stay in ink.
 *
 * `xs` is the badge form: the mark and one word, beside the label of the field it belongs to. It
 * keeps the whole sentence for a screen reader, because two letters are not a sentence.
 */
export function SourceChip({
  source,
  field,
  size = "sm",
}: {
  source: FieldSource;
  /** Which field. Shown as "AI meaning". */
  field?: SourceField | undefined;
  size?: "xs" | "sm" | "md" | undefined;
}) {
  const { i18n } = useLingui();
  const m = sourceMeta[source];
  const Icon = m.icon;
  const label = i18n._(sourceLabels[field ?? "field"][source]);
  const badge = size === "xs";
  return (
    <Chip tone={m.tone} size={size}>
      <Icon className={badge ? "size-2.5" : "size-3"} aria-hidden="true" />
      {badge ? (
        <>
          <span aria-hidden="true">{i18n._(m.mark)}</span>
          <span className="sr-only">{label}</span>
        </>
      ) : (
        label
      )}
    </Chip>
  );
}
