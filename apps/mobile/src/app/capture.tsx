import { useLingui } from "@lingui/react/macro";
import { api, errorMessage } from "@lymi/client/api";
import { addInput, clearSent } from "@lymi/client/card-input";
import { decksQuery, roundsQuery } from "@lymi/client/queries";
import { writes } from "@lymi/client/writes";
import { CHIPS_LEAVE } from "@lymi/design";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Keyboard, ScrollView, type TextInput, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { CardFields, FORM_FIELD, useFormFields } from "../capture/card-fields";
import { CHIPS_RETURN, ChipIn } from "../capture/chip-in";
import { type ChipKey, markChipUsed, useRecentFirst } from "../capture/chip-order";
import { CHOICE_TITLES, CHOICES, type ChoiceKind } from "../capture/choice-sheets";
import { ChoicesProvider, useChoices } from "../capture/choices";
import { EMPTY_FORM, type FormValues } from "../capture/form";
import { LastAdd } from "../capture/last-add";
import { type Outcome, type Picture, UNDO_FOR } from "../capture/model";
import { MODE_LABELS } from "../capture/modes";
import { useReveal } from "../capture/reveal";
import { CAPTURE_KEYS, captureStore } from "../data/kept";
import { useDecks, useSections } from "../data/queries";
import { timed } from "../theme/motion";
import { usePalette } from "../theme/palette";
import { FieldChip, FieldChipRow } from "../ui/field-chip";
import { FormHeader } from "../ui/form-header";
import { GlassPill } from "../ui/glass";
import { KeyboardRoom } from "../ui/keyboard";
import { Icon, Press, Text } from "../ui/primitives";
import { Sheet } from "../ui/sheet";
import { OnGlass } from "../ui/surface";

/** The chips' clock runs straight; each chip eases its own rise. */
const CHIPS_BACK = { duration: CHIPS_RETURN, ease: "linear" } as const;
const SETTLE = { duration: 0.25, ease: "linear" } as const;

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

/** Add a word: the term and the meaning, the rest as chips; a choice opens as a sheet over it. phone.md. */
export default function Capture() {
  return (
    <ChoicesProvider>
      <Composer />
    </ChoicesProvider>
  );
}

function Composer() {
  const { t, i18n } = useLingui();
  const router = useRouter();
  const qc = useQueryClient();
  const p = usePalette();
  const decksQuery_ = useDecks();
  const decks = decksQuery_.data ?? [];
  const { deckId, sectionId, picture, setPicture, modes, setModes } = useChoices();
  const deck = decks.find((d) => d.id === deckId) ?? decks[0];
  const deckName = deck?.name ?? "";
  // Read as a Select's trigger is, so the deck pill and the section chip share that message.
  const said = (label: string, chosen: string) => t`${label}: ${chosen}`;
  const deckSaid = said(t`Deck`, deckName);
  const [enrich, setEnrich] = useState(() => captureStore.getBoolean(CAPTURE_KEYS.enrich) ?? true);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const write = (key: keyof Draft) => (value: string) => setDraft((d) => ({ ...d, [key]: value }));
  const fields = useFormFields(draft);
  const form = useReveal();
  const recentFirst = useRecentFirst();
  const sections = useSections(deck?.id).data?.sections ?? [];
  const section = sections.find((s) => s.id === sectionId);
  const sectionSaid = said(t`Section`, section?.name ?? t`No section`);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<Outcome | null>(null);
  const [undoable, setUndoable] = useState(false);
  const [pending, setPending] = useState(false);
  const termRef = useRef<TextInput>(null);
  // Once the next term is being typed, the line about the last add has done its job.
  const [movedOn, setMovedOn] = useState<Outcome | null>(null);
  const moved = last !== null && movedOn === last;
  // The open choice, and the one its sheet holds, which stays while the sheet goes.
  const [choice, setChoice] = useState<ChoiceKind | null>(null);
  const [held, setHeld] = useState<ChoiceKind | null>(null);
  // While a choice is open the form keeps the keyboard's room, so the chips hold still and fade.
  const hold = useSharedValue(0);
  const chips = useSharedValue(1);
  const chipsLine = useAnimatedStyle(() => ({ opacity: chips.value }));
  const choosing = useRef(false);
  choosing.current = choice !== null;
  useEffect(() => {
    const shown = Keyboard.addListener("keyboardDidShow", () => {
      if (!choosing.current) hold.value = withTiming(0, timed(SETTLE));
    });
    return () => shown.remove();
  }, [hold]);

  const open = (kind: ChoiceKind) => {
    // A second tap lands while the keyboard is already leaving, and would drop the held room.
    if (choosing.current) return;
    choosing.current = true;
    hold.value = Keyboard.isVisible() ? (Keyboard.metrics()?.height ?? 0) : 0;
    chips.value = withTiming(0, timed(CHIPS_LEAVE));
    Keyboard.dismiss();
    setHeld(kind);
    setChoice(kind);
  };
  const close = () => setChoice(null);
  // Once the sheet has gone, the keyboard comes back on the term and the chips return over it.
  const closed = () => {
    chips.value = withTiming(1, timed(CHIPS_BACK));
    termRef.current?.focus();
  };

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

  const Choice = held && CHOICES[held];
  return (
    <View className="flex-1">
      <KeyboardRoom hold={hold}>
        <OnGlass>
          <FormHeader
            close={{ label: t`Done`, onPress: () => router.back() }}
            middle={
              deck && (
                <Press
                  onPress={() => open("deck")}
                  accessibilityRole="button"
                  accessibilityLabel={deckSaid}
                >
                  <GlassPill icon="deck">{deck.name}</GlassPill>
                </Press>
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
                {...form.scroll}
                className="flex-1"
                contentContainerClassName="gap-3 px-5 pt-4 pb-4"
                keyboardShouldPersistTaps="always"
              >
                <CardFields
                  reveal={form.reveal}
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
                  <Animated.View style={chipsLine}>
                    <LastAdd
                      last={last}
                      onUndo={undoable ? undo : undefined}
                      onRetry={last.kind === "added" && last.picture ? retryPicture : undefined}
                    />
                  </Animated.View>
                )}
                <FieldChipRow label={t`More about this card`}>
                  <ChipIn index={0} shown={chips}>
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
                  </ChipIn>
                  {recentFirst([
                    ...fields.missing.map((f) => ({
                      key: f as ChipKey,
                      chip: (
                        <FieldChip
                          key={f}
                          icon={FORM_FIELD[f].icon}
                          onPress={() => {
                            markChipUsed(f);
                            fields.add(f);
                          }}
                        >
                          {i18n._(FORM_FIELD[f].label)}
                        </FieldChip>
                      ),
                    })),
                    ...(sections.length > 0
                      ? [
                          {
                            key: "section" as const,
                            chip: (
                              <FieldChip
                                key="section"
                                icon="section"
                                on={!!section}
                                opens
                                accessibilityLabel={sectionSaid}
                                onPress={() => {
                                  markChipUsed("section");
                                  open("section");
                                }}
                              >
                                {section?.name ?? t`Section`}
                              </FieldChip>
                            ),
                          },
                        ]
                      : []),
                    {
                      key: "picture" as const,
                      chip: (
                        <FieldChip
                          key="picture"
                          icon="picture"
                          on={!!picture}
                          accessibilityLabel={t`Picture`}
                          onPress={() => {
                            markChipUsed("picture");
                            open("picture");
                          }}
                        >
                          {picture ? t`Picture added` : t`Picture`}
                        </FieldChip>
                      ),
                    },
                    {
                      key: "modes" as const,
                      chip: (
                        <FieldChip
                          key="modes"
                          icon="modes"
                          on={!!modes}
                          accessibilityLabel={t`How it’s asked`}
                          onPress={() => {
                            markChipUsed("modes");
                            open("modes");
                          }}
                        >
                          {modes
                            ? modes.map((m) => i18n._(MODE_LABELS[m])).join(" · ")
                            : t`How it’s asked`}
                        </FieldChip>
                      ),
                    },
                  ]).map((c, i) => (
                    <ChipIn key={c.key} index={i + 1} shown={chips}>
                      {c.chip}
                    </ChipIn>
                  ))}
                </FieldChipRow>
              </View>
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
      {/* Filled from its first frame, since iOS sizes the sheet to what it holds as it rises. */}
      <Sheet
        open={choice !== null}
        onOpenChange={(open) => !open && close()}
        onDismiss={closed}
        title={held ? i18n._(CHOICE_TITLES[held]) : ""}
      >
        {Choice && <Choice onChosen={close} />}
      </Sheet>
    </View>
  );
}
