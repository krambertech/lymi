import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { cardLimits } from "@lymi/core";
import { type ReactNode, type RefObject, useEffect, useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { usePalette } from "../theme/palette";
import { inputCap } from "../theme/type";
import { FieldChip } from "../ui/field-chip";
import type { IconName } from "../ui/icons";
import { Icon } from "../ui/primitives";
import { FieldName } from "./composer-field";
import { FORM_FIELDS, type FormField, type FormValues } from "./form";

/** Always on the form; the rest show once they hold something or a chip adds them. */
const CORE: readonly FormField[] = ["term", "meaning"];

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

/**
 * Which fields a card form shows: the term and the meaning, then every field holding something and
 * any a chip added, in the order they came, so a tapped chip's field appears last, where the eye is.
 * A field once shown stays until `settle`, even emptied to be rewritten, so it never vanishes from
 * under the keyboard.
 */
export function useFormFields(values: FormValues, first?: FormField) {
  const [added, setAdded] = useState<ReadonlySet<FormField>>(() => new Set(first ? [first] : []));
  const [adding, setAdding] = useState<FormField | null>(null);
  const order = useRef<FormField[]>(first && !CORE.includes(first) ? [first] : []);
  for (const f of FORM_FIELDS) {
    if (!CORE.includes(f) && values[f].trim() && !order.current.includes(f)) order.current.push(f);
  }
  for (const f of added) if (!CORE.includes(f) && !order.current.includes(f)) order.current.push(f);
  const shown = [...CORE, ...order.current];
  const missing = FORM_FIELDS.filter((f) => !shown.includes(f));
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
  footer,
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
  /** Under the fields: an error, or what the last add did. */
  footer?: ReactNode;
}) {
  const { i18n } = useLingui();
  const p = usePalette();
  const refs = useRef<Partial<Record<FormField, TextInput | null>>>({});
  useEffect(() => {
    if (adding) refs.current[adding]?.focus();
  }, [adding]);
  return (
    <>
      {shown.map((f, i) => {
        const spec = FORM_FIELD[f];
        const label = i18n._(spec.label);
        const next = shown[i + 1];
        const submits = f === submitFrom || !next;
        const term = f === "term";
        return (
          <View key={f}>
            <View className="flex-row items-center gap-1.5">
              <FieldName>{label}</FieldName>
              {ai?.(f) && <Icon name="ai" size={12} colour={p.ai} />}
            </View>
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
              placeholderTextColor={p.muted}
              accessibilityLabel={label}
              autoCorrect={!spec.learned}
              spellCheck={!spec.learned}
              autoCapitalize={spec.learned && f !== "example" ? "none" : "sentences"}
              // Each wraps as it fills; Return in the notes starts a new line.
              multiline
              submitBehavior={f === "notes" ? "newline" : "submit"}
              returnKeyType={f === "notes" ? "default" : submits ? "done" : "next"}
              onSubmitEditing={
                f === "notes"
                  ? undefined
                  : () => (submits || !next ? onSubmit() : refs.current[next]?.focus())
              }
              selectionColor={p.text}
              className={
                term
                  ? "min-h-12 py-1.5 font-sans font-medium text-text"
                  : "min-h-9 py-1.5 font-sans text-text"
              }
              style={term ? { fontSize: 28, letterSpacing: -0.56 } : { fontSize: 17 }}
              maxFontSizeMultiplier={inputCap(term ? 28 : 17)}
            />
          </View>
        );
      })}
      {footer}
    </>
  );
}

/** A chip for each empty text field; a press adds the field to the form in place. */
export function AddFieldChips({
  missing,
  onAdd,
}: {
  missing: readonly FormField[];
  onAdd: (field: FormField) => void;
}) {
  const { i18n } = useLingui();
  return (
    <>
      {missing.map((f) => (
        <FieldChip key={f} icon={FORM_FIELD[f].icon} onPress={() => onAdd(f)}>
          {i18n._(FORM_FIELD[f].label)}
        </FieldChip>
      ))}
    </>
  );
}
