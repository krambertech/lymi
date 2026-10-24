import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { cardLimits, pronunciationName } from "@lymi/core";
import { PLATE_ARRIVE, PLATE_RISE } from "@lymi/design";
import { type ReactNode, type RefObject, useEffect, useRef, useState } from "react";
import { TextInput, View } from "react-native";
import Animated, { Keyframe, LinearTransition } from "react-native-reanimated";
import { ALWAYS, CROSSFADE, timed, useReduceMotion } from "../theme/motion";
import { usePalette } from "../theme/palette";
import { inputCap, textStart } from "../theme/type";
import { FieldChip } from "../ui/field-chip";
import type { IconName } from "../ui/icons";
import { Icon, Text } from "../ui/primitives";
import { markChipUsed, useRecentFirst } from "./chip-order";
import { FieldName } from "./composer-field";
import { FORM_FIELDS, type FormField, type FormValues } from "./form";

/** Always on the form; the rest show once they hold something or a chip adds them. */
const CORE: readonly FormField[] = ["term", "meaning"];
/** The translation has no chip: it stands under the example once the example has text. */
const UNDER_EXAMPLE: FormField = "exampleTranslation";

// A field a chip adds arrives as a plate does, once the fields after it have made room. motion.md.
const { duration, easing } = timed(PLATE_ARRIVE);
const ARRIVE = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: PLATE_RISE }] },
  100: { opacity: 1, transform: [{ translateY: 0 }], easing },
})
  .duration(duration)
  .delay(duration / 2)
  .reduceMotion(ALWAYS);
const MAKE_ROOM = LinearTransition.duration(duration).easing(easing).reduceMotion(ALWAYS);

export const FORM_FIELD: Record<
  FormField,
  {
    label: MessageDescriptor;
    icon: IconName;
    hint: MessageDescriptor;
    limit: number | null;
    /** In the language being learned, which the phone's dictionary gets wrong. */
    learned: boolean;
  }
> = {
  term: {
    label: msg`Term`,
    icon: "edit",
    hint: msg`A word or phrase`,
    limit: cardLimits.term,
    learned: true,
  },
  meaning: {
    label: msg`Meaning`,
    icon: "meaning",
    hint: msg`What it means`,
    limit: cardLimits.meaning,
    learned: false,
  },
  pronunciation: {
    label: msg`Pronunciation`,
    icon: "pronunciation",
    hint: msg`How it sounds`,
    limit: cardLimits.pronunciation,
    learned: true,
  },
  example: {
    label: msg`Example`,
    icon: "example",
    hint: msg`A sentence that uses it`,
    limit: cardLimits.example,
    learned: true,
  },
  exampleTranslation: {
    label: msg`Translation`,
    icon: "example",
    hint: msg`Add a translation`,
    limit: cardLimits.exampleTranslation,
    learned: false,
  },
  notes: {
    label: msg`Notes`,
    icon: "notes",
    hint: msg`Grammar, usage, anything else`,
    limit: cardLimits.notes,
    learned: false,
  },
  hook: {
    label: msg`Memory hook`,
    icon: "hook",
    hint: msg`A sound-alike, or something to picture`,
    limit: cardLimits.hook,
    learned: false,
  },
  source: {
    label: msg`Source`,
    icon: "source",
    hint: msg`Where you met it, such as a lesson`,
    limit: cardLimits.source,
    learned: false,
  },
};

const PRONUNCIATION_NAME = {
  reading: msg({ message: "Reading", context: "how a term is read" }),
  stress: msg({ message: "Stress", context: "which syllable of a term is stressed" }),
} as const;

/** A field's name: Japanese and Chinese call a term's pronunciation its reading, and Russian its stress. */
export function fieldLabel(field: FormField, language: string | null | undefined) {
  const named = pronunciationName(language);
  return field === "pronunciation" && named !== "pronunciation"
    ? PRONUNCIATION_NAME[named]
    : FORM_FIELD[field].label;
}

/**
 * Which fields a card form shows: the term and the meaning, then every field holding something and
 * any a chip added, in the order they came, so a tapped chip's field appears last, where the eye is.
 * A field once shown stays until `settle`, even emptied to be rewritten, so it never vanishes from
 * under the keyboard.
 */
export function useFormFields(values: FormValues, opened?: FormField) {
  const first = opened === UNDER_EXAMPLE ? "example" : opened;
  const [added, setAdded] = useState<ReadonlySet<FormField>>(() => new Set(first ? [first] : []));
  const [adding, setAdding] = useState<FormField | null>(null);
  const order = useRef<FormField[]>(first && !CORE.includes(first) ? [first] : []);
  const ordered = (f: FormField) => !CORE.includes(f) && f !== UNDER_EXAMPLE;
  for (const f of FORM_FIELDS) {
    if (ordered(f) && values[f].trim() && !order.current.includes(f)) order.current.push(f);
  }
  for (const f of added) if (ordered(f) && !order.current.includes(f)) order.current.push(f);
  const translated = !!(values.example.trim() || values.exampleTranslation.trim());
  const shown = [...CORE, ...order.current].flatMap((f) =>
    f === "example" && translated ? [f, UNDER_EXAMPLE] : [f],
  );
  const missing = FORM_FIELDS.filter((f) => f !== UNDER_EXAMPLE && !shown.includes(f));
  return {
    shown,
    missing,
    adding,
    add: (f: FormField) => {
      setAdded((s) => new Set(s).add(f));
      setAdding(f);
    },
    /** Forgets the fields added and left empty, as after a card is added. */
    settle: () => {
      order.current = [];
      setAdded(new Set());
      setAdding(null);
    },
  };
}

/**
 * The fields of a card being added or edited, each its name over a line with no box: the term
 * large, the rest at reading size. Return moves to the next field and submits from `submitFrom`,
 * or from the last one.
 */
export function CardFields({
  values,
  onChange,
  shown,
  adding,
  focus = "term",
  termRef,
  submitFrom,
  onSubmit,
  placeholder,
  ai,
  below,
  footer,
  reveal,
  language,
}: {
  values: FormValues;
  onChange: (field: FormField, value: string) => void;
  shown: readonly FormField[];
  /** The field a chip just added, which takes the keyboard. */
  adding: FormField | null;
  /** The field that has the keyboard when the form opens. */
  focus?: FormField;
  termRef?: RefObject<TextInput | null>;
  /** Return here submits rather than moving on, as the meaning adds in Add a word. */
  submitFrom?: FormField;
  onSubmit: () => void;
  /** A field's own placeholder, such as the meaning's when the AI will fill it. */
  placeholder?: Partial<Record<FormField, string>>;
  /** Fields the AI wrote, marked beside their name. */
  ai?: (field: FormField) => boolean;
  /** A quiet line under a field, such as a translation written for an earlier example. */
  below?: Partial<Record<FormField, string>>;
  /** Under the fields: an error, or what the last add did. */
  footer?: ReactNode;
  /** Brings the field being added or typed in into view within the form's scroll. */
  reveal?: (y: number, height: number) => void;
  /** The card's language, which names its pronunciation. */
  language?: string | null | undefined;
}) {
  const { i18n } = useLingui();
  const p = usePalette();
  const refs = useRef<Partial<Record<FormField, TextInput | null>>>({});
  const reduce = useReduceMotion();
  // The field being typed in, so the form keeps it in view as it grows; a chip's field takes focus too.
  const [typing, setTyping] = useState<FormField | null>(null);
  useEffect(() => {
    if (adding) refs.current[adding]?.focus();
  }, [adding]);
  const line = (f: FormField, i: number, label: string) => {
    const spec = FORM_FIELD[f];
    const next = shown[i + 1];
    const submits = f === submitFrom || !next;
    const term = f === "term";
    const quiet = f === UNDER_EXAMPLE;
    const size = term ? 28 : 17;
    return (
      <TextInput
        ref={(r) => {
          refs.current[f] = r;
          if (term && termRef) termRef.current = r;
        }}
        autoFocus={f === focus}
        value={values[f]}
        maxLength={spec.limit ?? undefined}
        onChangeText={(v) => onChange(f, v)}
        placeholder={placeholder?.[f] ?? i18n._(spec.hint)}
        placeholderTextColor={quiet ? p.faint : p.muted}
        accessibilityLabel={label}
        autoCorrect={!spec.learned}
        spellCheck={!spec.learned}
        autoCapitalize={spec.learned && f !== "example" ? "none" : "sentences"}
        // Each wraps as it fills; Return in the notes starts a new line.
        multiline
        submitBehavior={f === "notes" ? "newline" : "submit"}
        returnKeyType={f === "notes" ? "default" : submits ? "done" : "next"}
        onFocus={() => setTyping(f)}
        onSubmitEditing={
          f === "notes"
            ? undefined
            : () => (submits || !next ? onSubmit() : refs.current[next]?.focus())
        }
        selectionColor={p.text}
        className={
          term
            ? "min-h-12 py-1.5 font-sans font-medium text-text"
            : quiet
              ? "min-h-8 py-1 font-sans text-text-2"
              : "min-h-9 py-1.5 font-sans text-text"
        }
        // Fields in the language being learned follow its direction, so an Arabic term starts on the right.
        style={[
          { fontSize: size },
          term ? { letterSpacing: -0.56 } : null,
          spec.learned ? textStart(language) : null,
        ]}
        maxFontSizeMultiplier={inputCap(size)}
      />
    );
  };
  return (
    <>
      {shown.map((f, i) => {
        // The translation is drawn inside the example's block, under its line.
        if (f === UNDER_EXAMPLE) return null;
        const label = i18n._(fieldLabel(f, language));
        return (
          <Animated.View
            key={f}
            entering={f === adding ? (reduce ? CROSSFADE : ARRIVE) : undefined}
            layout={reduce ? undefined : MAKE_ROOM}
            // Fires as it grows with each new line too, so the line being typed stays above the keyboard.
            onLayout={(e) => {
              const shownTyping = typing === UNDER_EXAMPLE ? "example" : typing;
              if (f === (shownTyping ?? adding ?? focus))
                reveal?.(e.nativeEvent.layout.y, e.nativeEvent.layout.height);
            }}
          >
            <View className="flex-row items-center gap-1.5">
              <FieldName>{label}</FieldName>
              {ai?.(f) && <Icon name="ai" size={12} colour={p.ai} />}
            </View>
            {line(f, i, label)}
            {below?.[f] && <Text className="text-sm text-muted">{below[f]}</Text>}
            {f === "example" && shown[i + 1] === UNDER_EXAMPLE && (
              // The translation belongs to the example, so it sits indented under its line, behind a hairline.
              <View className="mt-1 ps-3" style={{ borderStartWidth: 2, borderColor: p.edge }}>
                <View className="flex-row items-center gap-1.5">
                  <FieldName>{i18n._(FORM_FIELD[UNDER_EXAMPLE].label)}</FieldName>
                  {ai?.(UNDER_EXAMPLE) && <Icon name="ai" size={12} colour={p.ai} />}
                </View>
                {line(UNDER_EXAMPLE, i + 1, i18n._(FORM_FIELD[UNDER_EXAMPLE].label))}
                {below?.[UNDER_EXAMPLE] && (
                  <Text className="text-sm text-muted">{below[UNDER_EXAMPLE]}</Text>
                )}
              </View>
            )}
          </Animated.View>
        );
      })}
      {footer && <Animated.View layout={reduce ? undefined : MAKE_ROOM}>{footer}</Animated.View>}
    </>
  );
}

/** A chip for each empty text field; a press adds the field to the form in place. */
export function AddFieldChips({
  missing,
  onAdd,
  language,
}: {
  missing: readonly FormField[];
  onAdd: (field: FormField) => void;
  language?: string | null | undefined;
}) {
  const { i18n } = useLingui();
  const recentFirst = useRecentFirst();
  return (
    <>
      {recentFirst(missing.map((f) => ({ key: f }))).map(({ key: f }) => (
        <FieldChip
          key={f}
          icon={FORM_FIELD[f].icon}
          onPress={() => {
            markChipUsed(f);
            onAdd(f);
          }}
        >
          {i18n._(fieldLabel(f, language))}
        </FieldChip>
      ))}
    </>
  );
}
