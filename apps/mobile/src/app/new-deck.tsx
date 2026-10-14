import { useLingui } from "@lingui/react/macro";
import { errorMessage } from "@lymi/client/api";
import { writes } from "@lymi/client/writes";
import {
  DeckInput,
  type DeckPurpose,
  type Directions,
  deckLimits,
  LANGUAGE_TAGS,
} from "@lymi/core";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { type Href, useRouter } from "expo-router";
import { type ReactNode, useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { FieldName } from "../capture/composer-field";
import { languageName } from "../data/languages";
import { usePurposes } from "../data/purposes";
import { usePalette } from "../theme/palette";
import { inputCap } from "../theme/type";
import { FieldChipFace } from "../ui/field-chip";
import { GlassButton } from "../ui/glass";
import { Select } from "../ui/menu";
import { Icon, Text } from "../ui/primitives";
import { OnGlass } from "../ui/surface";

// Prototype switch for #580: how the deck's two settings sit under its name.
const _LAYOUT = "rows" as "composer" | "form" | "rows";

/**
 * New deck: a name and two settings that already have an answer, so a sheet and not a wizard.
 * The name takes the large field with the keyboard up; creating lands in the empty deck, where
 * the words go next. library-decks-and-cards.md.
 */
export default function NewDeck() {
  const { t } = useLingui();
  const router = useRouter();
  const qc = useQueryClient();
  const p = usePalette();
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState<DeckPurpose | null>(null);
  const [language, setLanguage] = useState("");
  const [directions, setDirections] = useState<Directions>("recognition");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const nameRef = useRef<TextInput>(null);
  const languages = [
    { value: "", label: t`No language` },
    ...LANGUAGE_TAGS.map((tag) => ({ value: tag, label: languageName(tag) })).sort((a, b) =>
      a.label.localeCompare(b.label),
    ),
  ];
  const asked: { value: Directions; label: string }[] = [
    { value: "recognition", label: t`Recognition` },
    { value: "production", label: t`Production` },
    { value: "both", label: t`Both ways` },
  ];
  const way = asked.find((a) => a.value === directions) ?? asked[0];
  const purposes = usePurposes();
  const purposeLabel = purposes.find((o) => o.value === purpose)?.label ?? t`What it’s for`;
  const languageLabel = language ? languageName(language) : t`No language`;

  const create = async () => {
    if (pending) return;
    const parsed = DeckInput.safeParse({
      name,
      purpose: purpose ?? undefined,
      // Only a language deck asks for a language, so another keeps none.
      defaultLanguage: purpose === "language" ? language || null : null,
      directions,
    });
    if (!parsed.success) {
      setError(name.trim() ? t`Keep the name under 80 characters.` : t`Give the deck a name.`);
      nameRef.current?.focus();
      return;
    }
    // The app asks what every deck is for, and a language deck which language, though the API need not.
    if (!purpose) return setError(t`Choose what the deck is for.`);
    if (purpose === "language" && !language) {
      return setError(t`Choose the language you’re learning.`);
    }
    setPending(true);
    setError(null);
    try {
      const { id } = await writes.createDeck(parsed.data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void qc.invalidateQueries({ queryKey: ["decks"] });
      router.back();
      router.push(`/library/${id}` as Href);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  };

  const languageSelect = (trigger: ReactNode) => (
    <Select
      label={t`Language`}
      value={language}
      options={languages}
      onChange={setLanguage}
      trigger={trigger}
    />
  );
  const purposeSelect = (trigger: ReactNode) => (
    <Select
      label={t`What it’s for`}
      value={purpose ?? ("" as DeckPurpose)}
      options={purposes}
      onChange={(next) => {
        setPurpose(next);
        if (error) setError(null);
      }}
      trigger={trigger}
    />
  );
  const askedSelect = (trigger: ReactNode) => (
    <Select
      label={t`How cards are asked`}
      value={directions}
      options={asked}
      onChange={setDirections}
      trigger={trigger}
    />
  );

  return (
    <OnGlass>
      <View className="flex-row items-center justify-between gap-3 px-4 pt-5 pb-2">
        <GlassButton icon="close" label={t`Cancel`} onPress={() => router.back()} />
        <Text className="text-md font-medium text-text" accessibilityRole="header">
          {t`New deck`}
        </Text>
        <GlassButton
          icon="check"
          label={t`Create deck`}
          primary
          disabled={!name.trim()}
          busy={pending}
          onPress={() => void create()}
        />
      </View>
      <View className="gap-4 px-5 pt-3 pb-5">
        <View>
          <FieldName>{t`Name`}</FieldName>
          <TextInput
            ref={nameRef}
            autoFocus
            value={name}
            maxLength={deckLimits.name ?? undefined}
            onChangeText={(v) => {
              setName(v);
              if (error) setError(null);
            }}
            placeholder={t`Lesson 15`}
            placeholderTextColor={p.muted}
            accessibilityLabel={t`Name`}
            accessibilityHint={error ?? undefined}
            returnKeyType="done"
            onSubmitEditing={() => void create()}
            selectionColor={p.text}
            className="min-h-12 py-1.5 font-sans font-medium text-text"
            style={{ fontSize: 28, letterSpacing: -0.56 }}
            maxFontSizeMultiplier={inputCap(28)}
          />
          {error && (
            <View className="flex-row items-center gap-1.5 pt-2" accessibilityLiveRegion="polite">
              <Icon name="alert" size={14} colour={p.danger} />
              <Text className="flex-1 text-base text-danger">{error}</Text>
            </View>
          )}
        </View>

        <View
          className="flex-row flex-wrap gap-2"
          accessibilityRole="toolbar"
          accessibilityLabel={t`Deck settings`}
        >
          {purposeSelect(
            <FieldChipFace icon="deck" on={!!purpose} opens>
              {purposeLabel}
            </FieldChipFace>,
          )}
          {purpose === "language" &&
            languageSelect(
              <FieldChipFace icon="meaning" on={!!language} opens>
                {language ? languageLabel : t`Language`}
              </FieldChipFace>,
            )}
          {askedSelect(
            <FieldChipFace icon="modes" on opens>
              {way?.label ?? ""}
            </FieldChipFace>,
          )}
        </View>
      </View>
    </OnGlass>
  );
}
