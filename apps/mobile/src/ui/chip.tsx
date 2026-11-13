import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { FieldSource } from "@lymi/core";
import type { ReactNode } from "react";
import { View } from "react-native";
import { type Palette, usePalette } from "../theme/palette";
import { Icon, type IconName } from "./icons";
import { Text } from "./primitives";
import { StateIcon, stateKey, stateMarks } from "./state-mark";

export type ChipTone = "default" | "ai" | "good" | "danger";
export type ChipSize = "sm" | "md";

const TONE: Record<ChipTone, { box: string; ink: keyof Palette }> = {
  default: { box: "bg-plate-nested", ink: "ink-secondary" },
  ai: { box: "bg-ai-soft", ink: "ai" },
  good: { box: "bg-success-soft", ink: "success" },
  danger: { box: "bg-danger-soft", ink: "danger" },
};

// Heights are minimums, so a chip grows with Dynamic Type instead of clipping.
const SIZE: Record<ChipSize, { box: string; text: string; icon: number }> = {
  sm: { box: "min-h-6 gap-1 px-2", text: "text-xs", icon: 13 },
  md: { box: "min-h-7 gap-1.5 px-2.5", text: "text-sm", icon: 14 },
};

interface ChipProps {
  tone?: ChipTone;
  /** `sm` beside other text in a row, `md` on its own. */
  size?: ChipSize;
  /** Before the label, such as a state's mark. */
  lead?: ReactNode;
  icon?: IconName;
  accessibilityLabel?: string;
  children: string;
}

/** A small label that describes: never a button, and never amber. chips-and-marks.md. */
export function Chip({
  tone = "default",
  size = "md",
  lead,
  icon,
  accessibilityLabel,
  children,
}: ChipProps) {
  const p = usePalette();
  const t = TONE[tone];
  const s = SIZE[size];
  return (
    <View
      className={`flex-row items-center self-start rounded-full ${t.box} ${s.box}`}
      accessible
      accessibilityLabel={accessibilityLabel ?? children}
    >
      {lead}
      {icon && <Icon name={icon} size={s.icon} colour={p[t.ink]} strokeWidth={2.25} />}
      <Text
        className={`${s.text} font-medium`}
        style={{ color: p[t.ink], fontVariant: ["tabular-nums"] }}
        numberOfLines={1}
        maxFontSizeMultiplier={1.6}
      >
        {children}
      </Text>
    </View>
  );
}

/**
 * A card's state on a plain chip, so the colour is the mark's alone. Under review a relearning
 * card says "Forgotten" with the Forgot mark, at the same size; elsewhere the lapse may be months old.
 */
export function StateChip({
  state,
  size = "md",
  inReview = false,
}: {
  state: number | null | undefined;
  size?: ChipSize;
  inReview?: boolean;
}) {
  const { t, i18n } = useLingui();
  const mark = SIZE[size].icon;
  if (inReview && state === 3)
    return (
      <Chip size={size} lead={<StateIcon state="forgot" size={mark} />}>
        {t`Forgotten`}
      </Chip>
    );
  const key = stateKey(state);
  return (
    <Chip size={size} lead={<StateIcon state={key} size={mark} />}>
      {i18n._(stateMarks[key].label)}
    </Chip>
  );
}

const SOURCE: Record<FieldSource, { icon: IconName; tone: ChipTone; mark: MessageDescriptor }> = {
  lesson: { icon: "lesson", tone: "default", mark: msg`Lesson` },
  ai: { icon: "ai", tone: "ai", mark: msg`AI` },
  manual: { icon: "manual", tone: "default", mark: msg`You` },
};

type SourceField =
  | "meaning"
  | "example"
  | "exampleTranslation"
  | "exampleAndTranslation"
  | "pronunciation"
  | "hint";

// Whole sentences per field, so each language can inflect the field word on its own.
const SOURCE_LABEL: Record<SourceField | "field", Record<FieldSource, MessageDescriptor>> = {
  field: { lesson: msg`From the lesson`, ai: msg`AI wrote this`, manual: msg`You wrote this` },
  meaning: { lesson: msg`Meaning from lesson`, ai: msg`AI meaning`, manual: msg`Meaning by you` },
  example: { lesson: msg`Example from lesson`, ai: msg`AI example`, manual: msg`Example by you` },
  exampleTranslation: {
    lesson: msg`Translation from lesson`,
    ai: msg`AI translation`,
    manual: msg`Translation by you`,
  },
  exampleAndTranslation: {
    lesson: msg`Example and translation from lesson`,
    ai: msg`AI example and translation`,
    manual: msg`Example and translation by you`,
  },
  pronunciation: {
    lesson: msg`Pronunciation from lesson`,
    ai: msg`AI pronunciation`,
    manual: msg`Pronunciation by you`,
  },
  hint: { lesson: msg`Hint from lesson`, ai: msg`AI hint`, manual: msg`Hint by you` },
};

/**
 * Who wrote a field. AI text is always labelled and is the one source with a colour. `badge` is
 * the mark and one word beside a field's label, with the whole sentence for VoiceOver.
 */
export function SourceChip({
  source,
  field,
  badge = false,
}: {
  source: FieldSource;
  field?: SourceField;
  badge?: boolean;
}) {
  const { i18n } = useLingui();
  const m = SOURCE[source];
  // A source a newer Worker added has no chip in this release: the field is open. ADR 0032.
  if (!m) return null;
  const label = i18n._(SOURCE_LABEL[field ?? "field"][source]);
  return (
    <Chip tone={m.tone} size="sm" icon={m.icon} accessibilityLabel={label}>
      {badge ? i18n._(m.mark) : label}
    </Chip>
  );
}
