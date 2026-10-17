import { useLingui } from "@lingui/react/macro";
import { api, errorMessage } from "@lymi/client/api";
import { addInput, clearSent } from "@lymi/client/card-input";
import { decksQuery, roundsQuery } from "@lymi/client/queries";
import { writes } from "@lymi/client/writes";
import { useQueryClient } from "@tanstack/react-query";
import { File } from "expo-file-system";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, type TextInput, View } from "react-native";
import { CardFields, FORM_FIELD, useFormFields } from "../capture/card-fields";
import { ChipIn } from "../capture/chip-in";
import { type ChipKey, markChipUsed, useRecentFirst } from "../capture/chip-order";
import { useChoiceSheet } from "../capture/choice-sheet";
import { CHOICE_TITLES, CHOICES, type ChoiceKind } from "../capture/choice-sheets";
import { ChoicesProvider, useChoices } from "../capture/choices";
import { EMPTY_FORM, type FormValues } from "../capture/form";
import type { Picture } from "../capture/model";
import { MODE_LABELS } from "../capture/modes";
import { describesAnswer } from "../capture/picture";
import { useReveal } from "../capture/reveal";
import { tagsSummary } from "../capture/tags";
import { CAPTURE_KEYS, captureStore } from "../data/kept";
import { useOwnedDecks, useSections } from "../data/queries";
import { formatList } from "../i18n/list";
import { usePalette } from "../theme/palette";
import { FieldError } from "../ui/field";
import { FieldChip, FieldChipRow } from "../ui/field-chip";
import { FormHeader } from "../ui/form-header";
import { GlassPill } from "../ui/glass";
import { KeyboardRoom } from "../ui/keyboard";
import { Button, Icon, Press, Text } from "../ui/primitives";
import { Sheet } from "../ui/sheet";
import { OnGlass } from "../ui/surface";
import { ToastHost, toast } from "../ui/toast-host";

/** Add a word's own toasts, which show over its chips since the app's sit under the sheet. */
const TOASTS = "capture";

/** Everything typed into the composer, the term to the source. */
type Draft = FormValues;
const EMPTY = EMPTY_FORM;

/** Uploads a picture to a card that exists; resolves with why it failed, or nothing. */
function uploadPicture(cardId: string, picture: Picture) {
  return api
    .uploadCardImage(
      cardId,
      // Expo's fetch sends a file it can read the bytes of; it cannot send React Native's `{ uri }`.
      new File(picture.uri),
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
  const decksQuery_ = useOwnedDecks();
  const decks = decksQuery_.data ?? [];
  const { deckId, sectionId, picture, setPicture, modes, setModes, tags } = useChoices();
  const deck = decks.find((d) => d.id === deckId) ?? decks[0];
  const deckName = deck?.name ?? "";
  // Read as a Select's trigger is, so the deck pill and the section chip share that message.
  const said = (label: string, chosen: string) => t`${label}: ${chosen}`;
  const deckSaid = said(t`Deck`, deckName);
  const list = formatList(tags, i18n.locale);
  const [enrich, setEnrich] = useState(() => captureStore.getBoolean(CAPTURE_KEYS.enrich) ?? true);
  // Siri and Shortcuts can name the term: `lymi://capture?term=gelato`.
  const { term: named } = useLocalSearchParams<{ term?: string }>();
  const [draft, setDraft] = useState<Draft>(() => ({ ...EMPTY, term: named?.trim() ?? "" }));
  // A shortcut run while this screen is open changes its params rather than opening another.
  const lastNamed = useRef(named);
  useEffect(() => {
    if (named === lastNamed.current) return;
    lastNamed.current = named;
    const term = named?.trim();
    if (term) setDraft((d) => ({ ...d, term }));
  }, [named]);
  const write = (key: keyof Draft) => (value: string) => setDraft((d) => ({ ...d, [key]: value }));
  const fields = useFormFields(draft);
  const form = useReveal();
  const recentFirst = useRecentFirst();
  const sections = useSections(deck?.id).data?.sections ?? [];
  const section = sections.find((s) => s.id === sectionId);
  const sectionSaid = said(t`Section`, section?.name ?? t`No section`);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const termRef = useRef<TextInput>(null);
  // Once a choice's sheet has gone, the keyboard comes back on the term.
  const { held, hold, chips, open, close, sheet } = useChoiceSheet<ChoiceKind>(() =>
    termRef.current?.focus(),
  );

  const add = async () => {
    const text = draft.term.trim();
    // The cursor in the empty term says what is missing.
    if (!text) {
      termRef.current?.focus();
      return;
    }
    if (!deck || pending) return;
    // The server refuses a description that names the answer, so it is fixed before the card exists.
    if (describesAnswer({ term: text, meaning: draft.meaning.trim() }, picture)) {
      open("picture");
      return;
    }
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
          tags,
        }),
        enrich,
      });
      Haptics.selectionAsync();
      if (outcome.status === "skipped") {
        const { term, deckName } = { term: outcome.existing.term, deckName: outcome.deckName };
        say(t`“${term}” is already in ${deckName}`);
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
      // A picture goes to the card once the card is on the server; until then its toast holds it.
      const missed = picture && (queued || (await uploadPicture(outcome.card.id, picture)));
      if (picture && missed) offerPicture(outcome.card.id, term, picture);
      else
        say(
          queued
            ? t`Added “${term}”. It’s saved on this phone until Lymi can be reached.`
            : t`Added “${term}” to ${deckName}`,
          { label: t`Undo`, onPress: () => undo(outcome.card.id) },
        );
      captureStore.set(CAPTURE_KEYS.deck, deck.id);
      void qc.invalidateQueries({ queryKey: [...decksQuery.queryKey] });
      void qc.invalidateQueries({ queryKey: [...roundsQuery.queryKey] });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  };

  // One toast at a time: each add replaces the last one's.
  const say = (title: string, action?: { label: string; onPress: () => void }, error = false) =>
    toast.add({ id: TOASTS, scope: TOASTS, title, error, ...(action ? { action } : {}) });

  const undo = (id: string) => {
    Haptics.selectionAsync();
    writes
      .archiveCard(id)
      .then(() => {
        void qc.invalidateQueries({ queryKey: [...decksQuery.queryKey] });
        void qc.invalidateQueries({ queryKey: [...roundsQuery.queryKey] });
      })
      .catch((e: unknown) => setError(errorMessage(e)));
    termRef.current?.focus();
  };

  // A picture that did not reach its card waits on the toast's Try again.
  const offerPicture = (id: string, term: string, held: Picture) =>
    say(
      t`Added “${term}” without its picture`,
      {
        label: t`Try again`,
        onPress: async () => {
          if (await uploadPicture(id, held)) offerPicture(id, term, held);
          else void qc.invalidateQueries({ queryKey: [...decksQuery.queryKey] });
        },
      },
      true,
    );

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
                      <View className="pt-2">
                        <FieldError flush>{error}</FieldError>
                      </View>
                    )
                  }
                />
              </ScrollView>

              <View className="px-4 pt-1 pb-2">
                {/* Toasts rise over the chips, by the keyboard, inside the sheet. */}
                <View pointerEvents="box-none" className="absolute inset-x-0 bottom-full">
                  <ToastHost scope={TOASTS} bottom={10} />
                </View>
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
                          picture={picture?.uri}
                          accessibilityLabel={picture ? t`Picture added` : t`Picture`}
                          onPress={() => {
                            markChipUsed("picture");
                            open("picture");
                          }}
                        >
                          {t`Picture`}
                        </FieldChip>
                      ),
                    },
                    {
                      key: "tags" as const,
                      chip: (
                        <FieldChip
                          key="tags"
                          icon="tags"
                          accessibilityLabel={tags.length ? t`Tags: ${list}` : t`Tags`}
                          onPress={() => {
                            markChipUsed("tags");
                            open("tags");
                          }}
                        >
                          {tagsSummary(tags) ?? t`Tags`}
                        </FieldChip>
                      ),
                    },
                    {
                      key: "modes" as const,
                      chip: (
                        <FieldChip
                          key="modes"
                          icon="modes"
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
            <View className="items-start gap-4 px-5 pt-4">
              <View className="flex-row items-start gap-2">
                <Icon name="alert" size={16} colour={p.muted} />
                <Text className="flex-1 text-base text-muted">
                  {t`Cards go in a deck you own. Create one first.`}
                </Text>
              </View>
              <Button label={t`New deck`} icon="deck" onPress={() => router.replace("/new-deck")} />
            </View>
          )}
        </OnGlass>
      </KeyboardRoom>
      {/* Filled from its first frame, since iOS sizes the sheet to what it holds as it rises. */}
      <Sheet {...sheet} title={held ? i18n._(CHOICE_TITLES[held]) : ""}>
        {Choice && <Choice onChosen={close} card={{ term: draft.term, meaning: draft.meaning }} />}
      </Sheet>
    </View>
  );
}
