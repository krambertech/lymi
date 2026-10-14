import { useLingui } from "@lingui/react/macro";
import { api, errorMessage } from "@lymi/client/api";
import { addInput, clearSent } from "@lymi/client/card-input";
import { decksQuery, roundsQuery } from "@lymi/client/queries";
import { writes } from "@lymi/client/writes";
import { modeKey, type ReviewModeKey } from "@lymi/core";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, ScrollView, type TextInput, View } from "react-native";
import { AddFieldChips, CardFields, useFormFields } from "../capture/card-fields";
import { EMPTY_FORM, type FormValues } from "../capture/form";
import { LastAdd } from "../capture/last-add";
import { type Outcome, type Picture, UNDO_FOR } from "../capture/model";
import { isTextMode, MODE_LABELS, ModesSheet } from "../capture/modes-sheet";
import { PictureSheet } from "../capture/picture-sheet";
import { CAPTURE_KEYS, captureStore } from "../data/kept";
import { useDecks, useSections } from "../data/queries";
import { usePalette } from "../theme/palette";
import { FieldChip, FieldChipFace, FieldChipRow } from "../ui/field-chip";
import { FormHeader } from "../ui/form-header";
import { GlassPill } from "../ui/glass";
import { KeyboardRoom } from "../ui/keyboard";
import { Select } from "../ui/menu";
import { Icon, Text } from "../ui/primitives";
import { OnGlass } from "../ui/surface";

/** Everything typed into the composer, the term to the source. */
type Draft = FormValues;
const EMPTY = EMPTY_FORM;

/** Uploads a picture to a card that exists; resolves with why it failed, or nothing. */
function uploadPicture(cardId: string, picture: Picture) {
  return api
    .uploadCardImage(
      cardId,
      { uri: picture.uri, name: picture.name, type: picture.type },
      null,
      picture.description.trim() || undefined,
    )
    .then(
      () => undefined,
      (e: unknown) => errorMessage(e),
    );
}

/**
 * Add a word, as Linear composes on a phone: the term and the meaning, and the card's other fields
 * as chips over the keyboard. A chip opens its one field in a sheet and then shows what it holds,
 * as the web's FieldChip does. Return in the meaning adds; the sheet stays for the next card,
 * keeping the deck, the AI choice and the source.
 */
export default function Capture() {
  const { t, i18n } = useLingui();
  const router = useRouter();
  const qc = useQueryClient();
  const p = usePalette();
  const params = useLocalSearchParams<{ deck?: string }>();
  const decksQuery_ = useDecks();
  const decks = decksQuery_.data ?? [];
  const [chosen, setDeck] = useState(
    () => params.deck ?? captureStore.getString(CAPTURE_KEYS.deck) ?? null,
  );
  const deck = decks.find((d) => d.id === chosen) ?? decks[0];
  const deckName = deck?.name ?? "";
  const [enrich, setEnrich] = useState(() => captureStore.getBoolean(CAPTURE_KEYS.enrich) ?? true);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const write = (key: keyof Draft) => (value: string) => setDraft((d) => ({ ...d, [key]: value }));
  const fields = useFormFields(draft);
  const [picture, setPicture] = useState<Picture | null>(null);
  const [picturing, setPicturing] = useState(false);
  const sections = useSections(deck?.id).data?.sections ?? [];
  const [sectionId, setSectionId] = useState<string | null>(null);
  const section = sections.find((s) => s.id === sectionId);
  const [modes, setModes] = useState<ReviewModeKey[] | null>(null);
  const [asking, setAsking] = useState(false);
  const deckModes = (deck?.reviewModes ?? []).map(modeKey).filter(isTextMode);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<Outcome | null>(null);
  const [undoable, setUndoable] = useState(false);
  const [pending, setPending] = useState(false);
  const termRef = useRef<TextInput>(null);
  // Once the next term is being typed, the line about the last add has done its job.
  const [movedOn, setMovedOn] = useState<Outcome | null>(null);
  const moved = last !== null && movedOn === last;
  // A sheet's dismissal is still running when it reports closed; focus a frame later or iOS keeps the keyboard down.
  const focusTerm = () => requestAnimationFrame(() => termRef.current?.focus());

  // Each add starts its own five seconds, so a second add keeps its Undo for the full time.
  useEffect(() => {
    if (!undoable || last?.kind !== "added") return;
    const timer = setTimeout(() => setUndoable(false), UNDO_FOR);
    return () => clearTimeout(timer);
  }, [undoable, last]);

  const add = async () => {
    const text = draft.term.trim();
    // The cursor in the empty term says what is missing.
    if (!text) {
      termRef.current?.focus();
      return;
    }
    if (!deck || pending) return;
    const sent = Object.fromEntries(
      Object.entries(draft).map(([key, value]) => [key, value.trim()]),
    ) as Draft;
    setPending(true);
    setError(null);
    try {
      const { outcome, queued } = await writes.addCard({
        ...addInput({
          deckId: deck.id,
          ...sent,
          sectionId: section?.id ?? null,
          reviewModes: modes,
        }),
        enrich,
      });
      Haptics.selectionAsync();
      if (outcome.status === "skipped") {
        const { term, deckName } = { term: outcome.existing.term, deckName: outcome.deckName };
        setLast({ kind: "skipped", term, deckName });
        setUndoable(false);
        AccessibilityInfo.announceForAccessibility(t`“${term}” is already in ${deckName}`);
        // The form stays, with the term selected, so it can be changed or cleared, as on the web.
        termRef.current?.focus();
        termRef.current?.setSelection(0, text.length);
        return;
      }
      const term = outcome.card.term;
      // Clear what was sent; anything typed since stays, and so does the lesson it came from.
      setDraft((d) => clearSent(d, sent, ["source"]));
      fields.settle();
      setModes((m) => (m === modes ? null : m));
      setPicture((x) => (x === picture ? null : x));
      termRef.current?.focus();
      // A picture goes to the card once the card is on the server. Until it gets there, the line
      // under the fields holds it with Try again, so it is never lost.
      const pictureError = !picture
        ? undefined
        : queued
          ? t`Pictures need a connection. Try again once you’re back online.`
          : await uploadPicture(outcome.card.id, picture);
      setLast({
        kind: "added",
        id: outcome.card.id,
        term,
        deckName: deck.name,
        queued,
        pictureError,
        ...(pictureError && picture ? { picture } : {}),
      });
      setUndoable(true);
      captureStore.set(CAPTURE_KEYS.deck, deck.id);
      AccessibilityInfo.announceForAccessibility(t`Added “${term}”`);
      void qc.invalidateQueries({ queryKey: [...decksQuery.queryKey] });
      void qc.invalidateQueries({ queryKey: [...roundsQuery.queryKey] });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  };

  const undo = () => {
    if (last?.kind !== "added") return;
    Haptics.selectionAsync();
    setUndoable(false);
    setLast(null);
    writes
      .archiveCard(last.id)
      .then(() => {
        void qc.invalidateQueries({ queryKey: [...decksQuery.queryKey] });
        void qc.invalidateQueries({ queryKey: [...roundsQuery.queryKey] });
      })
      .catch((e: unknown) => {
        setLast(last);
        setError(errorMessage(e));
      });
    termRef.current?.focus();
  };

  const retryPicture = async () => {
    if (last?.kind !== "added" || !last.picture) return;
    const held = last;
    const pictureError = await uploadPicture(held.id, held.picture as Picture);
    setLast((l) =>
      l?.kind === "added" && l.id === held.id
        ? { ...l, pictureError, picture: pictureError ? l.picture : undefined }
        : l,
    );
    if (!pictureError) void qc.invalidateQueries({ queryKey: [...decksQuery.queryKey] });
  };

  return (
    <KeyboardRoom>
      <OnGlass>
        <FormHeader
          close={{ label: t`Done`, onPress: () => router.back() }}
          middle={
            deck && (
              <Select
                label={t`Deck`}
                value={deck.id}
                options={decks.map((d) => ({ value: d.id, label: d.name }))}
                onChange={(id) => {
                  setDeck(id);
                  setSectionId(null);
                  setModes(null);
                  captureStore.set(CAPTURE_KEYS.deck, id);
                }}
                trigger={<GlassPill icon="deck">{deck.name}</GlassPill>}
                onClosed={focusTerm}
              />
            )
          }
          action={{
            icon: "plus",
            label: t`Add to ${deckName}`,
            disabled: !draft.term.trim(),
            onPress: () => void add(),
          }}
        />

        {decksQuery_.isPending ? null : deck ? (
          <>
            <ScrollView
              className="flex-1"
              contentContainerClassName="gap-3 px-5 pt-4 pb-4"
              keyboardShouldPersistTaps="always"
            >
              <CardFields
                values={draft}
                onChange={(field, value) => {
                  write(field)(value);
                  if (field === "term" && error) setError(null);
                  if (field === "term") setMovedOn(last);
                }}
                shown={fields.shown}
                adding={fields.adding}
                termRef={termRef}
                submitFrom="meaning"
                onSubmit={() => void add()}
                placeholder={{
                  meaning: enrich ? t`Leave it empty and the AI fills it in` : t`What it means`,
                }}
                footer={
                  error && (
                    <View
                      className="flex-row items-center gap-1.5 pt-2"
                      accessibilityLiveRegion="polite"
                    >
                      <Icon name="alert" size={14} colour={p.danger} />
                      <Text className="flex-1 text-base text-danger">{error}</Text>
                    </View>
                  )
                }
              />
            </ScrollView>

            <View className="px-4 pt-1 pb-2">
              {/* Pinned over the chips, by the keyboard, rather than wherever the fields end. */}
              {last && !error && !moved && (
                <LastAdd
                  last={last}
                  onUndo={undoable ? undo : undefined}
                  onRetry={last.kind === "added" && last.picture ? retryPicture : undefined}
                />
              )}
              <FieldChipRow label={t`More about this card`}>
                <FieldChip
                  icon="ai"
                  tone="ai"
                  on={enrich}
                  checked={enrich}
                  accessibilityLabel={t`Fill in the rest with AI`}
                  onPress={() => {
                    setEnrich(!enrich);
                    captureStore.set(CAPTURE_KEYS.enrich, !enrich);
                  }}
                >
                  {enrich ? t`AI fills in` : t`AI off`}
                </FieldChip>
                <AddFieldChips missing={fields.missing} onAdd={fields.add} />
                {sections.length > 0 && (
                  <Select
                    label={t`Section`}
                    value={sectionId ?? ""}
                    options={[
                      { value: "", label: t`No section` },
                      ...sections.map((s) => ({ value: s.id, label: s.name })),
                    ]}
                    onChange={(id) => setSectionId(id || null)}
                    onClosed={focusTerm}
                    trigger={
                      <FieldChipFace icon="section" on={!!section} opens>
                        {section?.name ?? t`Section`}
                      </FieldChipFace>
                    }
                  />
                )}
                <FieldChip
                  icon="picture"
                  on={!!picture}
                  accessibilityLabel={t`Picture`}
                  onPress={() => setPicturing(true)}
                >
                  {picture ? t`Picture added` : t`Picture`}
                </FieldChip>
                <FieldChip
                  icon="modes"
                  on={!!modes}
                  accessibilityLabel={t`How it’s asked`}
                  onPress={() => setAsking(true)}
                >
                  {modes ? modes.map((m) => i18n._(MODE_LABELS[m])).join(" · ") : t`How it’s asked`}
                </FieldChip>
              </FieldChipRow>
            </View>
            <ModesSheet
              open={asking}
              value={modes}
              deckModes={deckModes}
              onChange={setModes}
              onClose={() => setAsking(false)}
              onClosed={focusTerm}
            />
            <PictureSheet
              open={picturing}
              value={picture}
              onChange={setPicture}
              onClose={() => setPicturing(false)}
              onClosed={focusTerm}
            />
          </>
        ) : (
          <View className="flex-row items-start gap-2 px-5 pt-4">
            <Icon name="alert" size={16} colour={p.muted} />
            <Text className="flex-1 text-base text-muted">
              {t`Create a deck on the web first, then add cards here.`}
            </Text>
          </View>
        )}
      </OnGlass>
    </KeyboardRoom>
  );
}
