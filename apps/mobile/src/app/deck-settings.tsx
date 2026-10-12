import { useLingui } from "@lingui/react/macro";
import { errorMessage } from "@lymi/client/api";
import { type DeckPatch, writes } from "@lymi/client/writes";
import { DeckInput, type Directions, deckLimits, LANGUAGE_TAGS } from "@lymi/core";
import { useQueryClient } from "@tanstack/react-query";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { type ReactNode, useState } from "react";
import { Alert, ScrollView, TextInput, View } from "react-native";
import { languageName } from "../data/languages";
import { useDeckCards, useDecks } from "../data/queries";
import { usePalette } from "../theme/palette";
import { inputCap } from "../theme/type";
import { GlassButton } from "../ui/glass";
import { Icon } from "../ui/icons";
import { KeyboardRoom } from "../ui/keyboard";
import { Select } from "../ui/menu";
import { openWeb } from "../ui/on-the-web";
import { Plate, Press, Text } from "../ui/primitives";
import { Row, RowFace, Rows } from "../ui/row";
import { OnGlass } from "../ui/surface";

/**
 * Deck settings, as the web's: nothing has a Save button. A choice is made when it is made, and
 * the name and description commit when the field is left. People, invitations and publishing stay
 * on the web (ADR 0030). A member reads the same facts and can leave.
 */
export default function DeckSettings() {
  const { t } = useLingui();
  const router = useRouter();
  const qc = useQueryClient();
  const p = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const deck = useDecks().data?.find((d) => d.id === id);
  const example = useDeckCards(id).data?.find((r) => r.card.meaning)?.card;
  const [name, setName] = useState(deck?.name ?? "");
  const [description, setDescription] = useState(deck?.description ?? "");
  const [saved, setSaved] = useState<"saving" | "saved" | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!deck) return null;
  const owner = deck.role === "owner";

  const save = async (patch: DeckPatch) => {
    setSaved("saving");
    setError(null);
    try {
      await writes.updateDeck(deck.id, patch);
      void qc.invalidateQueries({ queryKey: ["decks"] });
      setSaved("saved");
    } catch (e) {
      setSaved(null);
      setError(errorMessage(e));
    }
  };
  const commitName = () => {
    if (name.trim() === deck.name) return;
    const parsed = DeckInput.shape.name.safeParse(name);
    if (!parsed.success) {
      setError(name.trim() ? t`Keep the name under 80 characters.` : t`Give the deck a name.`);
      return;
    }
    void save({ name: parsed.data });
  };
  const commitDescription = () => {
    const next = description.trim() || null;
    if (next !== (deck.description ?? null)) void save({ description: next });
  };
  const archive = () =>
    Alert.alert(
      t`Archive “${deck.name}”?`,
      t`It leaves Library. You can restore it from Archived.`,
      [
        { text: t`Cancel`, style: "cancel" },
        {
          text: t`Archive deck`,
          style: "destructive",
          onPress: async () => {
            await writes.archiveDeck(deck.id);
            void qc.invalidateQueries({ queryKey: ["decks"] });
            router.dismissTo("/library" as Href);
          },
        },
      ],
    );

  const languages = [
    { value: "", label: t`No language` },
    ...LANGUAGE_TAGS.map((tag) => ({ value: tag, label: languageName(tag) })).sort((a, b) =>
      a.label.localeCompare(b.label),
    ),
  ];
  const asked: { value: Directions; label: string; line: string }[] = [
    {
      value: "recognition",
      label: t`Recognition`,
      line: example?.meaning
        ? t`See ${example.term}, recall “${example.meaning}”`
        : t`See the term, recall what it means.`,
    },
    {
      value: "production",
      label: t`Production`,
      line: example?.meaning
        ? t`See “${example.meaning}”, recall ${example.term}`
        : t`See the meaning, recall the term.`,
    },
    { value: "both", label: t`Both ways`, line: t`Every card is asked twice.` },
  ];
  const language = deck.defaultLanguage ? languageName(deck.defaultLanguage) : t`No language`;
  const way = asked.find((a) => a.value === deck.directions) ?? asked[0];

  const nameField = (
    <TextInput
      value={name}
      onChangeText={setName}
      onEndEditing={commitName}
      maxLength={deckLimits.name ?? undefined}
      accessibilityLabel={t`Name`}
      returnKeyType="done"
      selectionColor={p.text}
      className="min-h-11 py-2 font-sans text-text"
      style={{ fontSize: 17 }}
      maxFontSizeMultiplier={inputCap(17)}
    />
  );
  const descriptionField = (
    <TextInput
      value={description}
      onChangeText={setDescription}
      onEndEditing={commitDescription}
      maxLength={deckLimits.description ?? undefined}
      placeholder={t`Cards from Marco’s Tuesday lessons.`}
      placeholderTextColor={p.muted}
      accessibilityLabel={t`Description`}
      multiline
      selectionColor={p.text}
      className="min-h-11 py-2 font-sans text-text"
      style={{ fontSize: 17 }}
      maxFontSizeMultiplier={inputCap(17)}
    />
  );
  const languageSelect = (trigger: ReactNode) => (
    <Select
      label={t`Language`}
      value={deck.defaultLanguage ?? ""}
      options={languages}
      onChange={(tag) => void save({ defaultLanguage: tag || null })}
      trigger={trigger}
    />
  );

  return (
    <KeyboardRoom>
      <OnGlass>
        <View className="flex-row items-center justify-between gap-3 px-4 pt-5 pb-2">
          <GlassButton icon="close" label={t`Done`} onPress={() => router.back()} />
          <View className="flex-1 items-center">
            <Text className="text-md font-medium text-text" accessibilityRole="header">
              {owner ? t`Deck settings` : t`About this deck`}
            </Text>
            <Text className="text-sm text-muted" accessibilityLiveRegion="polite">
              {saved === "saving" ? t`Saving…` : saved === "saved" ? t`Saved` : " "}
            </Text>
          </View>
          <View className="size-11" />
        </View>
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-6 px-5 pt-3 pb-10"
          keyboardShouldPersistTaps="handled"
        >
          {error && (
            <View className="flex-row items-center gap-1.5 px-1" accessibilityLiveRegion="polite">
              <Icon name="alert" size={14} colour={p.danger} />
              <Text className="flex-1 text-base text-danger">{error}</Text>
            </View>
          )}
          {!owner ? (
            <>
              <Group title={t`Shared with you`}>
                <Plate className="px-4 py-3.5">
                  <Text className="text-md text-text">
                    {t`${deck.owner.name} owns this deck and writes its cards.`}
                  </Text>
                </Plate>
              </Group>
              <Rows>
                <RowFace icon="meaning" label={t`Language`} value={language} end="none" />
                <RowFace
                  icon="modes"
                  label={t`How cards are asked`}
                  value={way?.label}
                  end="none"
                />
              </Rows>
            </>
          ) : (
            <>
              <Group title={t`Deck`}>
                <Plate className="overflow-hidden">
                  <View className="px-4">{nameField}</View>
                  <View className="h-px bg-edge" />
                  <View className="px-4">{descriptionField}</View>
                </Plate>
              </Group>
              <Rows>
                {languageSelect(<RowFace icon="meaning" label={t`Language`} value={language} />)}
              </Rows>
              <Group title={t`How cards are asked`}>
                <Plate className="overflow-hidden">
                  {asked.map((a, i) => (
                    <Press
                      key={a.value}
                      scale={0.99}
                      onPress={() =>
                        a.value !== deck.directions && void save({ directions: a.value })
                      }
                      accessibilityRole="radio"
                      accessibilityState={{ checked: a.value === deck.directions }}
                      className={`min-h-[60px] flex-row items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-edge" : ""}`}
                    >
                      <View className="flex-1 gap-0.5">
                        <Text className="text-md text-text">{a.label}</Text>
                        <Text className="text-sm text-muted">{a.line}</Text>
                      </View>
                      {a.value === deck.directions && (
                        <Icon name="check" size={20} colour={p.text} strokeWidth={2.25} />
                      )}
                    </Press>
                  ))}
                </Plate>
              </Group>
              <Rows>
                <Row
                  icon="apps"
                  label={t`People and sharing`}
                  end="web"
                  onPress={() => openWeb(`/library/${deck.id}/settings`)}
                />
              </Rows>
              <Rows>
                <Row
                  icon="archive"
                  label={t`Archive deck`}
                  destructive
                  end="none"
                  onPress={archive}
                />
              </Rows>
            </>
          )}
        </ScrollView>
      </OnGlass>
    </KeyboardRoom>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="px-1 text-sm font-medium text-muted" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}
