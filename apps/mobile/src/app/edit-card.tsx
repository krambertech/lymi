import { useLingui } from "@lingui/react/macro";
import { writes } from "@lymi/client/writes";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { AddFieldChips, CardFields, useFormFields } from "../capture/card-fields";
import {
  EMPTY_FORM,
  editPatch,
  FORM_FIELDS,
  type FormField,
  type FormValues,
  formValues,
} from "../capture/form";
import { cardEdited, heldCard } from "../card/edited";
import { useDeckCards, useDecks } from "../data/queries";
import { FieldChipRow } from "../ui/field-chip";
import { GlassButton, GlassPill } from "../ui/glass";
import { KeyboardRoom } from "../ui/keyboard";
import { OnGlass } from "../ui/surface";

/**
 * The whole card in one form, the one Add a word composes with: close, the deck and Save as glass
 * in the top corners, the term large, the meaning, then only the fields the card uses. The empty
 * ones wait as chips over the keyboard, and a chip adds its field in place.
 */
export default function EditCard() {
  const { t } = useLingui();
  const router = useRouter();
  const params = useLocalSearchParams<{ card: string; deck: string; field?: string }>();
  const deck = useDecks().data?.find((d) => d.id === params.deck);
  const card =
    useDeckCards(params.deck).data?.find((r) => r.card.id === params.card)?.card ??
    heldCard(params.card) ??
    undefined;
  const focus = FORM_FIELDS.find((f) => f === params.field) ?? "term";
  // Only what the learner types is held here; every other field reads the card as it stands, so
  // enrichment or another device filling one while the form is open shows and is never undone.
  const [typed, setTyped] = useState<Partial<FormValues>>({});
  const live = card ? formValues(card) : EMPTY_FORM;
  const values = { ...live, ...typed };
  const fields = useFormFields(values, focus);
  const [saving, setSaving] = useState(false);
  if (!card) return null;

  const save = async () => {
    const changes = editPatch(live, typed);
    if (Object.keys(changes).length === 0) {
      router.back();
      return;
    }
    setSaving(true);
    try {
      const { card: written } = await writes.updateCard(card, changes);
      cardEdited(written);
      router.back();
    } catch (e) {
      setSaving(false);
      Alert.alert(t`Couldn’t save the card.`, e instanceof Error ? e.message : undefined);
    }
  };
  // Marked until changed, as a field the learner rewrites becomes theirs.
  const ai = (f: FormField) =>
    f !== "term" && f !== "source" && card[`${f}Source`] === "ai" && typed[f] === undefined;

  return (
    <KeyboardRoom>
      <OnGlass>
        <View className="flex-row items-center justify-between gap-3 px-4 pt-5 pb-2">
          <GlassButton icon="close" label={t`Cancel`} onPress={() => router.back()} />
          {deck && <GlassPill icon="deck">{deck.name}</GlassPill>}
          <GlassButton
            icon="check"
            label={t`Save`}
            primary
            busy={saving}
            onPress={() => void save()}
          />
        </View>
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-3 px-5 pt-4 pb-4"
          keyboardShouldPersistTaps="always"
        >
          <CardFields
            values={values}
            onChange={(f, v) => setTyped((d) => ({ ...d, [f]: v }))}
            shown={fields.shown}
            adding={fields.adding}
            focus={focus}
            onSubmit={() => void save()}
            ai={ai}
          />
        </ScrollView>
        {fields.missing.length > 0 && (
          <View className="px-4 pt-1 pb-2">
            <FieldChipRow label={t`Add to this card`}>
              <AddFieldChips missing={fields.missing} onAdd={fields.add} />
            </FieldChipRow>
          </View>
        )}
      </OnGlass>
    </KeyboardRoom>
  );
}
