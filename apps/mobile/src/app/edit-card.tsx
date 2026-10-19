import { useLingui } from "@lingui/react/macro";
import { api, apiUrl, type Card, errorMessage } from "@lymi/client/api";
import { writes } from "@lymi/client/writes";
import { modeKey, type ReviewModeKey } from "@lymi/core";
import { useQueryClient } from "@tanstack/react-query";
import { File } from "expo-file-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import { type ComponentProps, useEffect, useRef, useState } from "react";
import { Alert, ScrollView, type TextInput, View } from "react-native";
import { AddFieldChips, CardFields, useFormFields } from "../capture/card-fields";
import { ChipIn } from "../capture/chip-in";
import { useChoiceSheet, useDraft } from "../capture/choice-sheet";
import { CHOICE_TITLES, DRAFTED } from "../capture/choice-sheets";
import {
  choicesPatch,
  EMPTY_FORM,
  editPatch,
  FORM_FIELDS,
  type FormField,
  type FormValues,
  formValues,
  pictureWrite,
} from "../capture/form";
import type { Picture } from "../capture/model";
import { MODE_LABELS, ModesChoices } from "../capture/modes";
import { describesAnswer, PictureChoices } from "../capture/picture";
import { useReveal } from "../capture/reveal";
import { TagsChoices, tagsSummary } from "../capture/tags";
import { cardEdited, heldCard } from "../card/edited";
import { useDeckCards, useDecks } from "../data/queries";
import { formatList } from "../i18n/list";
import { FieldChip, FieldChipRow } from "../ui/field-chip";
import { FormHeader } from "../ui/form-header";
import { GlassPill } from "../ui/glass";
import { KeyboardRoom } from "../ui/keyboard";
import { Sheet } from "../ui/sheet";
import { OnGlass } from "../ui/surface";

/** The choices Edit card opens as a sheet over the form, as Add a word does. */
type EditChoice = "picture" | "modes" | "tags";
const CHOICES: readonly string[] = ["picture", "modes", "tags"];

/** The card's picture as the form starts with it. */
function keptPicture(card: Card): Picture | null {
  if (!card.image) return null;
  return {
    uri: apiUrl(card.image.url),
    name: "",
    type: "",
    description: card.image.description ?? "",
    kept: true,
  };
}

/** Sends a picture change once the card's text is saved; resolves with the card as it then stands. */
function savePicture(card: Card, picture: Picture | null | undefined): Promise<Card> | null {
  const write = pictureWrite(card, picture);
  if (!write) return null;
  if (write.kind === "archive") return api.archiveCardImage(card.id, card.imageVersion);
  if (write.kind === "describe")
    return api.describeCardImage(card.id, {
      description: write.description,
      version: card.imageVersion,
    });
  return api.uploadCardImage(
    card.id,
    // Expo's fetch sends a file it can read the bytes of; it cannot send React Native's `{ uri }`.
    new File(write.picture.uri),
    card.imageVersion,
    write.picture.description.trim() || undefined,
  );
}

/**
 * The whole card in one form, the one Add a word composes with: close, the deck and Save as glass
 * in the top corners, the term large, the meaning, then only the fields the card uses. The empty
 * ones wait as chips over the keyboard, and a chip adds its field in place. The picture, how it's
 * asked and the tags open as sheets over the form.
 */
export default function EditCard() {
  const { t, i18n } = useLingui();
  const router = useRouter();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{
    card: string;
    deck: string;
    field?: string;
    choice?: string;
  }>();
  const deck = useDecks().data?.find((d) => d.id === params.deck);
  const card =
    useDeckCards(params.deck).data?.find((r) => r.card.id === params.card)?.card ??
    heldCard(params.card) ??
    undefined;
  const focus = FORM_FIELDS.find((f) => f === params.field) ?? "term";
  // Only what the learner types is held here; every other field reads the card as it stands, so
  // enrichment or another device filling one while the form is open shows and is never undone.
  const [typed, setTyped] = useState<Partial<FormValues>>({});
  // Each choice is undefined until the learner makes it, for the same reason.
  const [modes, setModes] = useState<ReviewModeKey[] | null | undefined>(undefined);
  const [tags, setTags] = useState<string[] | undefined>(undefined);
  const [picture, setPicture] = useState<Picture | null | undefined>(undefined);
  const live = card ? formValues(card) : EMPTY_FORM;
  const values = { ...live, ...typed };
  const fields = useFormFields(values, focus);
  const form = useReveal();
  const [saving, setSaving] = useState(false);
  const fieldRef = useRef<TextInput>(null);
  const { held, hold, chips, open, keep, done, sheet } = useChoiceSheet<EditChoice>(() =>
    fieldRef.current?.focus(),
  );
  // Opened from the card page's Asked or Tags, the form starts on that choice's sheet.
  const opened = useRef(false);
  const found = !!card;
  useEffect(() => {
    if (opened.current || !found || !CHOICES.includes(params.choice ?? "")) return;
    opened.current = true;
    open(params.choice as EditChoice);
  });
  if (!card) return null;

  const cardModes = card.reviewModes?.map(modeKey) ?? null;
  const shownModes = modes === undefined ? cardModes : modes;
  const shownTags = tags ?? card.tags;
  const list = formatList(shownTags, i18n.locale);
  const shownPicture = picture === undefined ? keptPicture(card) : picture;
  const said = { term: values.term.trim() || card.term, meaning: values.meaning.trim() };

  const save = async () => {
    // The server refuses a description that names the answer, so it is fixed before anything is sent.
    if (describesAnswer(said, shownPicture)) {
      open("picture");
      return;
    }
    const changes = { ...editPatch(live, typed), ...choicesPatch(card, modes, tags) };
    const pictureChanged = pictureWrite(card, picture) !== null;
    if (Object.keys(changes).length === 0 && !pictureChanged) {
      router.back();
      return;
    }
    setSaving(true);
    let written: Card | null = null;
    try {
      if (Object.keys(changes).length > 0) {
        written = (await writes.updateCard(card, changes)).card;
        cardEdited(written);
      }
      const pictured = await savePicture(written ?? card, picture);
      if (pictured) {
        cardEdited(pictured);
        void qc.invalidateQueries({ queryKey: ["decks"] });
        void qc.invalidateQueries({ queryKey: ["cards"] });
      }
      router.back();
    } catch (e) {
      setSaving(false);
      // The text may be saved, or queued offline, before the picture fails, so the alert names only what failed.
      Alert.alert(
        written ? t`Couldn’t change the picture.` : t`Couldn’t save the card.`,
        errorMessage(e),
      );
    }
  };
  // Marked until changed, as a field the learner rewrites becomes theirs.
  const ai = (f: FormField) =>
    f !== "term" && f !== "source" && card[`${f}Source`] === "ai" && typed[f] === undefined;

  const choices = [
    {
      key: "picture" as const,
      chip: (
        <FieldChip
          icon="picture"
          picture={shownPicture && !shownPicture.kept ? shownPicture.uri : undefined}
          accessibilityLabel={shownPicture ? t`Picture added` : t`Picture`}
          onPress={() => open("picture")}
        >
          {t`Picture`}
        </FieldChip>
      ),
    },
    {
      key: "modes" as const,
      chip: (
        <FieldChip
          icon="modes"
          accessibilityLabel={t`How it’s asked`}
          onPress={() => open("modes")}
        >
          {shownModes
            ? shownModes.map((m) => i18n._(MODE_LABELS[m])).join(" · ")
            : t`How it’s asked`}
        </FieldChip>
      ),
    },
    {
      key: "tags" as const,
      chip: (
        <FieldChip
          icon="tags"
          accessibilityLabel={shownTags.length ? t`Tags: ${list}` : t`Tags`}
          onPress={() => open("tags")}
        >
          {tagsSummary(shownTags) ?? t`Tags`}
        </FieldChip>
      ),
    },
  ];

  return (
    <View className="flex-1">
      <KeyboardRoom hold={hold}>
        <OnGlass>
          <FormHeader
            close={{ label: t`Cancel`, onPress: () => router.back() }}
            middle={deck && <GlassPill icon="deck">{deck.name}</GlassPill>}
            action={{ icon: "check", label: t`Save`, busy: saving, onPress: () => void save() }}
          />
          <ScrollView
            {...form.scroll}
            className="flex-1"
            contentContainerClassName="gap-3 px-5 pt-4 pb-4"
            keyboardShouldPersistTaps="always"
          >
            <CardFields
              reveal={form.reveal}
              language={card.language}
              values={values}
              onChange={(f, v) => setTyped((d) => ({ ...d, [f]: v }))}
              shown={fields.shown}
              adding={fields.adding}
              focus={focus}
              termRef={fieldRef}
              onSubmit={() => void save()}
              ai={ai}
            />
          </ScrollView>
          <View className="px-4 pt-1 pb-2">
            <FieldChipRow label={t`More about this card`}>
              {choices.map((c, i) => (
                <ChipIn key={c.key} index={i} shown={chips}>
                  {c.chip}
                </ChipIn>
              ))}
              <ChipIn index={choices.length} shown={chips}>
                <View className="flex-row gap-2">
                  <AddFieldChips
                    missing={fields.missing}
                    onAdd={fields.add}
                    language={card.language}
                  />
                </View>
              </ChipIn>
            </FieldChipRow>
          </View>
        </OnGlass>
      </KeyboardRoom>
      {/* Filled from its first frame, since iOS sizes the sheet to what it holds as it rises. */}
      <Sheet
        {...sheet}
        title={held ? i18n._(CHOICE_TITLES[held]) : ""}
        save={held && DRAFTED.has(held) ? { label: t`Apply`, onPress: done } : undefined}
      >
        {held === "picture" && (
          <PictureChoices value={shownPicture} onChange={setPicture} card={said} />
        )}
        {held === "modes" && (
          <DraftedModes
            keep={keep}
            value={shownModes}
            deckModes={(deck?.reviewModes ?? []).map(modeKey)}
            onChange={setModes}
            term={said.term}
            meaning={said.meaning}
            picture={
              !shownPicture ? "none" : shownPicture.description.trim() ? "described" : "undescribed"
            }
          />
        )}
        {held === "tags" && (
          <TagsChoices
            keep={keep}
            value={shownTags}
            onChange={setTags}
            deckId={params.deck}
            onDone={done}
          />
        )}
      </Sheet>
    </View>
  );
}

type Keeps = { keep: (apply: () => void) => void };

/** How the card is asked, ticked as a draft that the sheet's ✓ keeps. */
function DraftedModes({
  keep,
  value,
  onChange,
  ...rest
}: ComponentProps<typeof ModesChoices> & Keeps) {
  const [draft, setDraft] = useDraft(value, onChange, keep);
  return <ModesChoices {...rest} value={draft} onChange={setDraft} />;
}
