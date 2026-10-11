import { useLingui } from "@lingui/react/macro";
import { useEffect, useState } from "react";
import { TextInput, View } from "react-native";
import { usePalette } from "../theme/palette";
import { inputCap } from "../theme/type";
import { Sheet } from "../ui/sheet";
import type { EXTRAS } from "./model";

/**
 * One of the card's other fields, alone in a sheet over the composer with the keyboard up. The
 * keyboard's done key closes it, as a swipe does; no button repeats them. The web's FieldChip drawer.
 */
export function FieldSheet({
  field: current,
  value,
  onChange,
  onClose,
  onClosed,
}: {
  field: (typeof EXTRAS)[number] | undefined;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onClosed: () => void;
}) {
  const { i18n } = useLingui();
  const p = usePalette();
  // The sheet keeps its field while it slides away, so it does not collapse on the way out.
  const [shown, setShown] = useState(current);
  useEffect(() => {
    if (current) setShown(current);
  }, [current]);
  const open = !!current;
  const field = current ?? shown;
  // These two are in the language being learned, which the phone's dictionary gets wrong.
  const learned = field?.key === "example" || field?.key === "pronunciation";
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      onDismiss={onClosed}
      title={field ? i18n._(field.label) : undefined}
    >
      {field && (
        <View className="rounded-xl bg-glass-plate px-4">
          <TextInput
            autoFocus
            value={value}
            maxLength={field.limit ?? undefined}
            onChangeText={onChange}
            placeholder={i18n._(field.hint)}
            placeholderTextColor={p.muted}
            accessibilityLabel={i18n._(field.label)}
            autoCorrect={!learned}
            spellCheck={!learned}
            autoCapitalize={field.key === "pronunciation" ? "none" : "sentences"}
            multiline
            submitBehavior="blurAndSubmit"
            returnKeyType="done"
            onSubmitEditing={onClose}
            selectionColor={p.text}
            // Room for a whole sentence; it grows past this as it fills.
            className={`py-3 font-sans text-text ${field.key === "example" || field.key === "hook" ? "min-h-28" : "min-h-12"}`}
            style={{ fontSize: 17, textAlignVertical: "top" }}
            maxFontSizeMultiplier={inputCap(17)}
          />
        </View>
      )}
    </Sheet>
  );
}
