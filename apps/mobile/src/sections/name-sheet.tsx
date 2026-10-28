import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { api, errorMessage, type Section } from "@lymi/client/api";
import { isolate, SectionInput, sectionLimits } from "@lymi/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { TextInput, View } from "react-native";
import { usePalette } from "../theme/palette";
import { inputCap } from "../theme/type";
import { Sheet, SheetError } from "../ui/sheet";
import { useSheetFocus } from "../ui/sheet-focus";
import { toast } from "../ui/toast-host";

/** A section is a name, so making or renaming one is one field. */
export function NameSheet({
  target,
  onClose,
  onSubmit,
  busy,
  description,
}: {
  target: { section?: Section } | null;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
  busy: boolean;
  description?: string | undefined;
}) {
  const { t } = useLingui();
  const p = usePalette();
  const [name, setName] = useState("");
  const [invalid, setInvalid] = useState<string | null>(null);
  const [opened, setOpened] = useState<typeof target>(null);
  const focus = useSheetFocus({ open: target !== null });
  // Each opening starts from the section's name, or empty for a new one.
  if (target !== opened) {
    setOpened(target);
    setName(target?.section?.name ?? "");
    setInvalid(null);
  }
  const submit = () => {
    if (busy) return;
    const parsed = SectionInput.shape.name.safeParse(name);
    if (!parsed.success) {
      setInvalid(t`Give the section a name.`);
      return;
    }
    // Under the field, since a toast would sit under this sheet.
    void onSubmit(parsed.data).catch((e) => setInvalid(errorMessage(e)));
  };
  const renaming = !!target?.section;
  return (
    <Sheet
      title={renaming ? t`Rename section` : t`New section`}
      description={description}
      save={{
        label: renaming ? t`Save` : t`Create section`,
        onPress: submit,
        busy,
        disabled: !name.trim(),
      }}
      open={target !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <View className="rounded-xl bg-glass-plate px-4">
        <TextInput
          value={name}
          onChangeText={(next) => {
            setName(next);
            setInvalid(null);
          }}
          {...focus}
          onSubmitEditing={submit}
          submitBehavior="submit"
          returnKeyType="done"
          maxLength={sectionLimits.name ?? undefined}
          placeholder={t`Lesson 15`}
          placeholderTextColor={p["ink-muted"]}
          accessibilityLabel={t`Name`}
          selectionColor={p.ink}
          className="min-h-11 py-2 font-sans text-ink"
          style={{ fontSize: 17 }}
          maxFontSizeMultiplier={inputCap(17)}
        />
      </View>
      {invalid && <SheetError>{invalid}</SheetError>}
    </Sheet>
  );
}

/**
 * New section, from the deck's menu or from Move to section with the cards to move into it: one
 * write, so a failure never leaves an empty section behind. `open`, and render `sheet`.
 */
export function useNewSection(deckId: string) {
  const { t } = useLingui();
  const qc = useQueryClient();
  const [moving, setMoving] = useState<{ cardIds: string[]; after?: () => void } | null>(null);
  const [target, setTarget] = useState<{ section?: Section } | null>(null);
  const create = useMutation({
    mutationFn: (name: string) =>
      api.createSection(deckId, { name, ...(moving ? { cardIds: moving.cardIds } : {}) }),
    onSettled: () =>
      Promise.all(
        ["decks", "series", "queue", "rounds"].map((key) =>
          qc.invalidateQueries({ queryKey: [key] }),
        ),
      ),
  });
  const count = moving?.cardIds.length ?? 0;
  return {
    open: (cards?: { cardIds: string[]; after?: () => void }) => {
      setMoving(cards ?? null);
      setTarget({});
    },
    sheet: (
      <NameSheet
        target={target}
        onClose={() => setTarget(null)}
        busy={create.isPending}
        description={
          count > 0
            ? plural(count, { one: "The card moves into it.", other: "The # cards move into it." })
            : undefined
        }
        onSubmit={async (name) => {
          const created = await create.mutateAsync(name);
          setTarget(null);
          if (!moving) return;
          moving.after?.();
          const sectionName = created.name;
          toast.add({
            id: `move-cards-${deckId}`,
            title: t`Moved to ${{ sectionName: isolate(sectionName) }}`,
          });
        }}
      />
    ),
  };
}
