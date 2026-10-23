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
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { type ReactNode, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, ScrollView, TextInput, View } from "react-native";
import { FieldName } from "../capture/composer-field";
import { languageName } from "../data/languages";
import { usePurposes } from "../data/purposes";
import { useSeriesList } from "../data/queries";
import { haptics } from "../theme/haptics";
import { usePalette } from "../theme/palette";
import { inputCap } from "../theme/type";
import { FieldError } from "../ui/field";
import { FormHeader } from "../ui/form-header";
import type { IconName } from "../ui/icons";
import { Select } from "../ui/menu";
import { Icon, Plate, RowArrow, Text } from "../ui/primitives";
import { Radio } from "../ui/radio";
import { RowFace, Rows } from "../ui/row";
import { OnGlass } from "../ui/surface";

/**
 * New deck: a short form, not a row of chips, since every field matters. The name takes the large
 * field with the keyboard up and Return lowers it; what the deck is for is three cards to read and
 * choose, a language deck's language sits inside its card, and how cards are asked is one quiet
 * row with its default. Opened from a series' menu, a Series row says where the deck goes. Creating
 * lands in the empty deck. library-decks-and-cards.md.
 */
export default function NewDeck() {
  const { t } = useLingui();
  const router = useRouter();
  const qc = useQueryClient();
  const p = usePalette();
  const params = useLocalSearchParams<{ series?: string }>();
  const seriesList = useSeriesList(!!params.series).data ?? [];
  // "" is no series, so the learner can still make the deck loose.
  const [seriesId, setSeriesId] = useState(params.series ?? "");
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState<DeckPurpose | null>(null);
  const [language, setLanguage] = useState("");
  // A language deck needs its language, so choosing A language opens the list at once.
  const [choosingLanguage, setChoosingLanguage] = useState(false);
  const [directions, setDirections] = useState<Directions>("recognition");
  const [error, setError] = useState<string | null>(null);
  // What the deck is for is asked apart from the name, so its error sits under its cards.
  const [purposeError, setPurposeError] = useState(false);
  const [pending, setPending] = useState(false);
  const nameRef = useRef<TextInput>(null);
  const languages = LANGUAGE_TAGS.map((tag) => ({ value: tag, label: languageName(tag) })).sort(
    (a, b) => a.label.localeCompare(b.label),
  );
  const asked: { value: Directions; label: string }[] = [
    { value: "recognition", label: t`Recognition` },
    { value: "production", label: t`Production` },
    { value: "both", label: t`Both ways` },
  ];
  const way = asked.find((a) => a.value === directions) ?? asked[0];
  const purposes = usePurposes();

  const purposeIcon: Record<DeckPurpose, IconName> = {
    language: "meaning",
    subject: "lesson",
    other: "notes",
  };

  const create = async () => {
    if (pending) return;
    const parsed = DeckInput.safeParse({
      name,
      purpose: purpose ?? undefined,
      // Only a language deck asks for a language, so another keeps none.
      defaultLanguage: purpose === "language" ? language || null : null,
      directions,
      ...(seriesId ? { seriesId } : {}),
    });
    if (!parsed.success) {
      setError(name.trim() ? t`Keep the name under 80 characters.` : t`Give the deck a name.`);
      nameRef.current?.focus();
      return;
    }
    // The app asks what every deck is for, and a language deck which language, though the API need not.
    if (!purpose) {
      setPurposeError(true);
      AccessibilityInfo.announceForAccessibility(t`Choose what the deck is for.`);
      return;
    }
    // What is still missing opens rather than only being named, so ✓ never leads nowhere.
    if (purpose === "language" && !language) return setChoosingLanguage(true);
    setPending(true);
    setError(null);
    try {
      const { id } = await writes.createDeck(parsed.data);
      haptics.success();
      void qc.invalidateQueries({ queryKey: ["decks"] });
      if (seriesId) void qc.invalidateQueries({ queryKey: ["series"] });
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
      onChange={(next) => {
        setLanguage(next);
        if (error) setError(null);
      }}
      open={choosingLanguage}
      onOpenChange={setChoosingLanguage}
      trigger={trigger}
    />
  );
  const seriesOptions = [
    { value: "", label: t`No series` },
    ...seriesList.map((s) => ({ value: s.id, label: s.name })),
  ];
  const seriesName = seriesOptions.find((o) => o.value === seriesId)?.label;
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
      <FormHeader
        close={{ label: t`Cancel`, onPress: () => router.back() }}
        title={t`New deck`}
        action={{
          icon: "check",
          label: t`Create deck`,
          disabled: !name.trim(),
          busy: pending,
          onPress: () => void create(),
        }}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerClassName="gap-6 px-5 pt-3 pb-10"
      >
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
            // Return lowers the keyboard, so the choices under the name are all in view.
            returnKeyType="next"
            submitBehavior="blurAndSubmit"
            selectionColor={p.text}
            className="min-h-12 py-1.5 font-sans font-medium text-text"
            style={{ fontSize: 28, letterSpacing: -0.56 }}
            maxFontSizeMultiplier={inputCap(28)}
          />
          {error && (
            <View className="pt-2">
              <FieldError flush>{error}</FieldError>
            </View>
          )}
        </View>

        <View className="gap-2.5">
          <FieldName>{t`What it’s for`}</FieldName>
          <Plate className="overflow-hidden" accessibilityRole="radiogroup">
            {purposes.map((o, i) => {
              const chosen = purpose === o.value;
              return (
                <View key={o.value} className={i > 0 ? "border-t border-edge" : ""}>
                  <Pressable
                    onPress={() => {
                      haptics.tick();
                      setPurpose(o.value);
                      setPurposeError(false);
                      if (o.value === "language" && !language) setChoosingLanguage(true);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: chosen }}
                    accessibilityLabel={o.label}
                    accessibilityHint={o.detail}
                    className="flex-row items-start gap-3 px-4 py-3.5"
                    style={({ pressed }) => (pressed ? { backgroundColor: p.hover } : null)}
                  >
                    <View className="pt-0.5">
                      <Icon name={purposeIcon[o.value]} size={20} colour={p["text-2"]} />
                    </View>
                    <View className="flex-1 gap-0.5">
                      <Text className="text-md font-medium text-text">{o.label}</Text>
                      <Text className="text-base text-text-2">{o.detail}</Text>
                    </View>
                    <Radio on={chosen} className="mt-0.5" />
                  </Pressable>
                  {/* The language is part of this answer, so it sits inside its card. */}
                  {chosen &&
                    o.value === "language" &&
                    languageSelect(
                      <View className="mx-4 mb-3.5 ms-12 flex-row items-center gap-3 rounded-lg bg-plate-2 py-3 ps-3.5 pe-2.5">
                        <Text className="flex-1 text-md text-text">{t`Language`}</Text>
                        <Text
                          className={`text-md ${language ? "text-text-2" : "font-medium text-amber-text"}`}
                          numberOfLines={1}
                        >
                          {language ? languageName(language) : t`Choose`}
                        </Text>
                        <RowArrow />
                      </View>,
                    )}
                </View>
              );
            })}
          </Plate>
          {purposeError && <FieldError>{t`Choose what the deck is for.`}</FieldError>}
        </View>

        <Rows>
          {params.series && (
            <Select
              label={t`Series`}
              value={seriesId}
              options={seriesOptions}
              onChange={setSeriesId}
              trigger={<RowFace icon="series" label={t`Series`} value={seriesName} stacked />}
            />
          )}
          {askedSelect(
            <RowFace icon="modes" label={t`How cards are asked`} value={way?.label} stacked />,
          )}
        </Rows>
      </ScrollView>
    </OnGlass>
  );
}
