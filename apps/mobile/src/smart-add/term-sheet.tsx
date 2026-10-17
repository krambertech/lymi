import { useLingui } from "@lingui/react/macro";
import type { LessonTerm } from "@lymi/client/api";
import { cardLimits } from "@lymi/core";
import { useEffect, useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { FieldName } from "../capture/composer-field";
import { usePalette } from "../theme/palette";
import { inputCap, MULTILINE } from "../theme/type";
import { Text } from "../ui/primitives";
import { Sheet, SheetNote } from "../ui/sheet";
import type { TermEdit } from "./steps";

interface TermSheetProps {
  /** The term being edited, or null while the sheet is closed. */
  term: LessonTerm | null;
  edit: TermEdit | undefined;
  onClose: () => void;
  /** An edit, or undefined when the learner put the term back as the lesson had it. */
  onSave: (edit: TermEdit | undefined) => void;
}

/** One term of the pick list with its meaning and its lesson line; an untouched gloss stays as the list had it. */
export function TermSheet({ term, edit, onClose, onSave }: TermSheetProps) {
  const { t } = useLingui();
  const p = usePalette();
  const [name, setName] = useState("");
  const [meaning, setMeaning] = useState("");
  const meaningRef = useRef<TextInput>(null);
  useEffect(() => {
    if (!term) return;
    setName(edit?.term ?? term.term);
    setMeaning(edit?.meaning === undefined ? term.gloss : (edit.meaning ?? ""));
  }, [term, edit]);

  const save = () => {
    if (!term || !name.trim()) return;
    const nextTerm = name.trim();
    const nextMeaning = meaning.trim();
    const unchanged = nextTerm === term.term && nextMeaning === term.gloss;
    onSave(
      unchanged
        ? undefined
        : {
            term: nextTerm,
            // An untouched gloss stays as the lesson or the AI had it.
            ...(nextMeaning === term.gloss ? {} : { meaning: nextMeaning || null }),
          },
    );
    onClose();
  };

  const seen = term?.seen ?? "";
  const box = "rounded-xl bg-glass-plate px-4 font-sans text-md text-text";
  return (
    <Sheet
      open={term !== null}
      onOpenChange={(open) => !open && onClose()}
      title={t`Edit term`}
      save={{ label: t`Save term`, onPress: save, disabled: !name.trim() }}
    >
      <View className="gap-1.5">
        <View className="ps-4">
          <FieldName>{t`Term`}</FieldName>
        </View>
        <TextInput
          value={name}
          onChangeText={setName}
          maxLength={cardLimits.term ?? undefined}
          autoCorrect={false}
          autoFocus
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => meaningRef.current?.focus()}
          accessibilityLabel={t`Term`}
          selectionColor={p.text}
          className={`${box} min-h-11 py-2.5`}
          maxFontSizeMultiplier={inputCap(17)}
        />
      </View>
      <View className="gap-1.5">
        <View className="ps-4">
          <FieldName>{t`Meaning`}</FieldName>
        </View>
        <TextInput
          ref={meaningRef}
          value={meaning}
          onChangeText={setMeaning}
          maxLength={cardLimits.meaning ?? undefined}
          multiline
          submitBehavior="submit"
          returnKeyType="done"
          onSubmitEditing={save}
          placeholder={t`Leave empty for Lymi to write it`}
          placeholderTextColor={p.muted}
          accessibilityLabel={t`Meaning`}
          selectionColor={p.text}
          className={`${box} min-h-11 py-2.5`}
          style={MULTILINE}
          maxFontSizeMultiplier={inputCap(17)}
        />
      </View>
      {term?.seen ? (
        <View className="gap-1 pt-1">
          <SheetNote>{t`From the lesson`}</SheetNote>
          <Text className="ps-4 text-base text-text-2" style={{ fontStyle: "italic" }}>
            {t`“${seen}”`}
          </Text>
        </View>
      ) : null}
    </Sheet>
  );
}
