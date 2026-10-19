import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { type DeckSummary, errorMessage } from "@lymi/client/api";
import { type DeckPatch, writes } from "@lymi/client/writes";
import {
  DECK_ENRICH_FIELDS,
  type DeckEnrichField,
  DeckInput,
  type DeckPurpose,
  type Directions,
  deckLimits,
  LANGUAGE_TAGS,
} from "@lymi/core";
import { useQueryClient } from "@tanstack/react-query";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { type ReactNode, useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { useDeckExits } from "../../../data/decks";
import { openDraft } from "../../../data/draft";
import { languageName } from "../../../data/languages";
import { usePurposes } from "../../../data/purposes";
import { useDeckCards, useDecks, useSections } from "../../../data/queries";
import { usePalette } from "../../../theme/palette";
import { inputCap, MULTILINE } from "../../../theme/type";
import { FieldError } from "../../../ui/field";
import { Select } from "../../../ui/menu";
import { Plate, Text } from "../../../ui/primitives";
import { Row, RowFace, Rows } from "../../../ui/row";
import { Screen } from "../../../ui/screen";
import { Sheet, SheetGroup, SheetRow } from "../../../ui/sheet";
import { useSheetFocus } from "../../../ui/sheet-focus";
import { Skeleton } from "../../../ui/skeleton";

/**
 * Deck settings, as the web's: a choice is made when it is made, and a text field saves with its
 * sheet's ✓. Publishing stays on the web (ADR 0030). A member reads the same facts and can leave.
 */
export default function DeckSettings() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const deck = useDecks().data?.find((d) => d.id === id);
  const { t } = useLingui();
  // The fields start from the deck, so they wait for it rather than start empty and save that.
  if (deck) return <Settings deck={deck} />;
  return (
    <Screen title="" back={{ label: t`Deck`, to: `/library/${id}` as Href }}>
      <Skeleton height={200} />
    </Screen>
  );
}

function Settings({ deck }: { deck: DeckSummary }) {
  const { t } = useLingui();
  const qc = useQueryClient();
  const p = usePalette();
  const example = useDeckCards(deck.id).data?.find((r) => r.card.meaning)?.card;
  const [name, setName] = useState(deck.name);
  const [description, setDescription] = useState(deck.description ?? "");
  const [instructions, setInstructions] = useState(deck.enrichInstructions ?? "");
  const [saved, setSaved] = useState<"saving" | "saved" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const owner = deck.role === "owner";
  const router = useRouter();
  const sectionCount = useSections(owner ? deck.id : undefined).data?.sections.length ?? 0;

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
  // What each text field last saved, so a sheet closing after its done key does not save twice.
  const kept = useRef({
    name: deck.name,
    description: deck.description ?? null,
    instructions: deck.enrichInstructions ?? null,
  });
  const commitName = () => {
    if (name.trim() === kept.current.name) return;
    const parsed = DeckInput.shape.name.safeParse(name);
    if (!parsed.success) {
      setError(name.trim() ? t`Keep the name under 80 characters.` : t`Give the deck a name.`);
      return;
    }
    kept.current.name = parsed.data;
    void save({ name: parsed.data });
  };
  const commitDescription = () => {
    const next = description.trim() || null;
    if (next === kept.current.description) return;
    kept.current.description = next;
    void save({ description: next });
  };
  const commitInstructions = () => {
    const next = instructions.trim() || null;
    if (next === kept.current.instructions) return;
    kept.current.instructions = next;
    void save({ enrichInstructions: next });
  };
  const { archive, leave } = useDeckExits(deck);
  const purposes = usePurposes();
  const [editing, setEditing] = useState<"name" | "description" | "instructions" | null>(null);
  const [asking, setAsking] = useState(false);
  // The fields ticked in the sheet, saved together by its ✓; null while the sheet is closed.
  const [fields, setFields] = useState<DeckEnrichField[] | null>(null);
  // ✓ or the keyboard's done key saves; close or a swipe leaves the deck as it was. phone.md "Sheets".
  const finishEditing = () => {
    if (editing === "name") commitName();
    if (editing === "description") commitDescription();
    if (editing === "instructions") commitInstructions();
    setEditing(null);
  };
  const cancelEditing = () => {
    if (editing === "name") setName(kept.current.name);
    if (editing === "description") setDescription(kept.current.description ?? "");
    if (editing === "instructions") setInstructions(kept.current.instructions ?? "");
    setEditing(null);
  };
  // A sheet opens on the deck as it is now, so a change made on the web since is never saved over.
  const edit = (field: "name" | "description" | "instructions") => {
    if (field === "name") {
      const next = openDraft(name, kept.current.name, deck.name);
      setName(next.draft);
      kept.current.name = next.saved ?? deck.name;
    } else if (field === "description") {
      const next = openDraft(description, kept.current.description, deck.description ?? null);
      setDescription(next.draft);
      kept.current.description = next.saved;
    } else {
      const next = openDraft(
        instructions,
        kept.current.instructions,
        deck.enrichInstructions ?? null,
      );
      setInstructions(next.draft);
      kept.current.instructions = next.saved;
    }
    setEditing(field);
  };

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
    {
      value: "both",
      label: t`Both ways`,
      line: t`Each card is asked both ways, each way on its own schedule.`,
    },
  ];
  const fieldLabels: Record<DeckEnrichField, string> = {
    meaning: t`Meaning`,
    example: t`Example`,
    notes: t`Notes`,
    pronunciation: t`Pronunciation`,
  };
  const filled = DECK_ENRICH_FIELDS.filter((f) => deck.enrichFields.includes(f));
  const fieldsValue =
    filled.length === 0
      ? t`None`
      : filled.length === 1
        ? fieldLabels[filled[0] as DeckEnrichField]
        : filled.length === DECK_ENRICH_FIELDS.length
          ? t`All`
          : plural(filled.length, { one: "# field", other: "# fields" });
  const toggleField = (field: DeckEnrichField) =>
    setFields((prev) =>
      prev
        ? DECK_ENRICH_FIELDS.filter((f) => (f === field ? !prev.includes(f) : prev.includes(f)))
        : prev,
    );
  const saveFields = () => {
    if (fields && fields.join() !== deck.enrichFields.join()) void save({ enrichFields: fields });
    setFields(null);
  };
  const language = deck.defaultLanguage ? languageName(deck.defaultLanguage) : t`No language`;
  const way = asked.find((a) => a.value === deck.directions) ?? asked[0];

  const focus = {
    name: useSheetFocus({ open: editing === "name" }),
    description: useSheetFocus({ open: editing === "description" }),
    instructions: useSheetFocus({ open: editing === "instructions" }),
  };
  const nameField = (
    <TextInput
      value={name}
      onChangeText={setName}
      {...focus.name}
      onSubmitEditing={finishEditing}
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
      {...focus.description}
      submitBehavior="blurAndSubmit"
      returnKeyType="done"
      onSubmitEditing={finishEditing}
      maxLength={deckLimits.description ?? undefined}
      placeholder={t`Cards from Marco’s Tuesday lessons.`}
      placeholderTextColor={p.muted}
      accessibilityLabel={t`Description`}
      multiline
      selectionColor={p.text}
      className="min-h-11 font-sans text-text"
      style={MULTILINE}
      maxFontSizeMultiplier={inputCap(17)}
    />
  );
  const instructionsField = (
    <TextInput
      value={instructions}
      onChangeText={setInstructions}
      {...focus.instructions}
      submitBehavior="blurAndSubmit"
      returnKeyType="done"
      onSubmitEditing={finishEditing}
      maxLength={deckLimits.enrichInstructions ?? undefined}
      placeholder={t`Medical French for nurses. Use the clinical meaning.`}
      placeholderTextColor={p.muted}
      accessibilityLabel={t`Instructions`}
      multiline
      selectionColor={p.text}
      className="min-h-48 font-sans text-text"
      style={MULTILINE}
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
    <Screen
      title={owner ? t`Deck settings` : t`About this deck`}
      back={{ label: deck.name, to: `/library/${deck.id}` as Href }}
      actions={
        <Text className="text-base text-muted" accessibilityLiveRegion="polite">
          {saved === "saving" ? t`Saving…` : saved === "saved" ? t`Saved` : ""}
        </Text>
      }
    >
      <FieldError>{error}</FieldError>
      {!owner ? (
        <>
          <Group title={t`Shared with you`}>
            <Plate className="px-4 py-3.5">
              <Text className="text-md text-text">
                {deck.owner.former
                  ? t`Its owner left Lymi, so nobody can change this deck.`
                  : t`${deck.owner.name} owns this deck and writes its cards.`}
              </Text>
            </Plate>
          </Group>
          <Rows>
            <RowFace icon="meaning" label={t`Language`} value={language} end="none" />
            <RowFace icon="modes" label={t`Modes`} value={way?.label} end="none" />
          </Rows>
          <Rows>
            <Row icon="signOut" label={t`Leave deck`} destructive end="none" onPress={leave} />
          </Rows>
        </>
      ) : (
        <>
          {/* Each setting is a row that opens its own sheet over the page, never a sheet over a sheet. */}
          <Rows>
            <Row icon="edit" label={t`Name`} value={deck.name} onPress={() => edit("name")} />
            <Row
              icon="notes"
              label={t`Description`}
              value={deck.description ?? t`None`}
              onPress={() => edit("description")}
            />
            <Select
              label={t`What it’s for`}
              value={deck.purpose ?? ("" as DeckPurpose)}
              options={purposes}
              onChange={(purpose) => void save({ purpose })}
              trigger={
                <RowFace
                  icon="deck"
                  label={t`What it’s for`}
                  value={purposes.find((o) => o.value === deck.purpose)?.label ?? t`Not set`}
                />
              }
            />
            {languageSelect(<RowFace icon="meaning" label={t`Language`} value={language} />)}
            <Row icon="modes" label={t`Modes`} value={way?.label} onPress={() => setAsking(true)} />
          </Rows>
          <Group title={t`AI`}>
            <Rows>
              <Row
                icon="ai"
                label={t`AI fills`}
                value={fieldsValue}
                onPress={() => setFields(deck.enrichFields)}
              />
              <Row
                icon="lesson"
                label={t`Instructions`}
                value={deck.enrichInstructions ?? t`None`}
                onPress={() => edit("instructions")}
              />
            </Rows>
          </Group>
          <Sheet
            title={
              editing === "description"
                ? t`Description`
                : editing === "instructions"
                  ? t`Instructions`
                  : t`Name`
            }
            description={
              editing === "instructions"
                ? t`AI follows these when filling cards. Only you see them.`
                : undefined
            }
            save={{ label: t`Save`, onPress: finishEditing }}
            open={editing !== null}
            onOpenChange={(open) => !open && cancelEditing()}
          >
            <View className="rounded-xl bg-glass-plate px-4">
              {editing === "description"
                ? descriptionField
                : editing === "instructions"
                  ? instructionsField
                  : nameField}
            </View>
          </Sheet>
          <Sheet
            title={t`Fields AI can fill`}
            description={t`AI only fills empty fields. It never changes your text.`}
            open={fields !== null}
            onOpenChange={(open) => !open && setFields(null)}
            save={{ label: t`Save`, onPress: saveFields }}
          >
            <SheetGroup>
              {DECK_ENRICH_FIELDS.map((field) => (
                <SheetRow
                  key={field}
                  label={fieldLabels[field]}
                  multiple
                  chosen={(fields ?? deck.enrichFields).includes(field)}
                  onPress={() => toggleField(field)}
                />
              ))}
            </SheetGroup>
          </Sheet>
          <Sheet title={t`How cards are asked`} open={asking} onOpenChange={setAsking}>
            <SheetGroup>
              {asked.map((a) => (
                <SheetRow
                  key={a.value}
                  label={a.label}
                  detail={a.line}
                  chosen={a.value === deck.directions}
                  onPress={() => {
                    setAsking(false);
                    if (a.value !== deck.directions) void save({ directions: a.value });
                  }}
                />
              ))}
            </SheetGroup>
          </Sheet>
          <Rows>
            <Row
              icon="section"
              label={t`Sections`}
              value={
                sectionCount > 0
                  ? plural(sectionCount, { one: "# section", other: "# sections" })
                  : t`None`
              }
              onPress={() => router.push(`/library/sections?id=${deck.id}` as Href)}
            />
          </Rows>
          <Rows>
            <Row
              icon="share"
              label={t`Share deck`}
              onPress={() => router.push(`/share?id=${deck.id}` as Href)}
            />
          </Rows>
          <Rows>
            <Row icon="archive" label={t`Archive deck`} destructive end="none" onPress={archive} />
          </Rows>
        </>
      )}
    </Screen>
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
