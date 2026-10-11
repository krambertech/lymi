import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { api, errorMessage } from "@lymi/client/api";
import { decksQuery, roundsQuery } from "@lymi/client/queries";
import { writes } from "@lymi/client/writes";
import { cardLimits, modeKey, modeOf, type ReviewModeKey } from "@lymi/core";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";

import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Image, ScrollView, TextInput, View } from "react-native";
import { createMMKV } from "react-native-mmkv";
import Animated from "react-native-reanimated";
import { useDecks, useSections } from "../data/queries";
import { CROSSFADE } from "../theme/motion";
import { usePalette } from "../theme/palette";
import { inputCap } from "../theme/type";
import { FieldChip, FieldChipFace, FieldChipRow } from "../ui/field-chip";
import { GlassButton, GlassPill } from "../ui/glass";
import type { IconName } from "../ui/icons";
import { KeyboardRoom } from "../ui/keyboard";
import { Select } from "../ui/menu";
import { Button, Icon, Text } from "../ui/primitives";
import { Sheet, SheetGroup, SheetRow } from "../ui/sheet";
import { OnGlass } from "../ui/surface";

// The deck and the AI choice carry over to the next time Add a word opens.
const kept = createMMKV({ id: "lymi-capture" });

/** The fields a card can carry beyond its term and meaning, offered as chips over the keyboard. */
type Extra = "example" | "pronunciation" | "hook" | "source";

const EXTRAS: {
  key: Extra;
  icon: IconName;
  label: MessageDescriptor;
  /** What goes in it, as the empty line's placeholder. */
  hint: MessageDescriptor;
  limit: number | null;
}[] = [
  {
    key: "example",
    icon: "example",
    label: msg`Example`,
    hint: msg`A sentence that uses it`,
    limit: cardLimits.example,
  },
  {
    key: "pronunciation",
    icon: "pronunciation",
    label: msg`Pronunciation`,
    hint: msg`How it sounds`,
    limit: cardLimits.pronunciation,
  },
  {
    key: "hook",
    icon: "hook",
    label: msg`Memory hook`,
    hint: msg`A short phrase that helps you remember it.`,
    limit: cardLimits.hook,
  },
  {
    key: "source",
    icon: "source",
    label: msg`Source`,
    hint: msg`Where you met it, such as a lesson`,
    limit: cardLimits.source,
  },
];

/** What the last add did, said under the fields until the next one. */
type Outcome =
  | {
      kind: "added";
      id: string;
      term: string;
      deckName: string;
      queued: boolean;
      /** Why the card went in without its picture. */
      pictureError?: string | undefined;
    }
  | { kind: "skipped"; term: string; deckName: string };

const UNDO_FOR = 5000;

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
  const [chosen, setDeck] = useState(() => params.deck ?? kept.getString("deck") ?? null);
  const deck = decks.find((d) => d.id === chosen) ?? decks[0];
  const deckName = deck?.name ?? "";
  const [enrich, setEnrich] = useState(() => kept.getBoolean("enrich") ?? true);
  const [term, setTerm] = useState("");
  const [meaning, setMeaning] = useState("");
  const [noteText, setNoteText] = useState("");
  const [editing, setEditing] = useState<Extra | null>(null);
  const [picture, setPicture] = useState<Picture | null>(null);
  const [picturing, setPicturing] = useState(false);
  const sections = useSections(deck?.id).data?.sections ?? [];
  const [sectionId, setSectionId] = useState<string | null>(null);
  const section = sections.find((s) => s.id === sectionId);
  const [modes, setModes] = useState<ReviewModeKey[] | null>(null);
  const [asking, setAsking] = useState(false);
  const deckModes = (deck?.reviewModes ?? []).map(modeKey).filter(isTextMode);
  const [extra, setExtra] = useState<Partial<Record<Extra, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<Outcome | null>(null);
  const [undoable, setUndoable] = useState(false);
  const [pending, setPending] = useState(false);
  const termRef = useRef<TextInput>(null);
  const meaningRef = useRef<TextInput>(null);

  // Each add starts its own five seconds, so a second add keeps its Undo for the full time.
  useEffect(() => {
    if (!undoable || last?.kind !== "added") return;
    const timer = setTimeout(() => setUndoable(false), UNDO_FOR);
    return () => clearTimeout(timer);
  }, [undoable, last]);

  const add = async () => {
    const text = term.trim();
    // The cursor in the empty term says what is missing.
    if (!text) {
      termRef.current?.focus();
      return;
    }
    if (!deck || pending) return;
    const own = meaning.trim();
    const typed = (key: Extra) => extra[key]?.trim() || undefined;
    const example = typed("example");
    const pronunciation = typed("pronunciation");
    const hook = typed("hook");
    const notes = noteText.trim() || undefined;
    const source = typed("source");
    setPending(true);
    setError(null);
    try {
      const { outcome, queued } = await writes.addCard({
        deckId: deck.id,
        term: text,
        ...(own ? { meaning: own, meaningSource: "manual" as const } : {}),
        ...(example ? { example, exampleSource: "manual" as const } : {}),
        ...(pronunciation ? { pronunciation, pronunciationSource: "manual" as const } : {}),
        ...(hook ? { hook, hookSource: "manual" as const } : {}),
        ...(notes ? { notes } : {}),
        ...(source ? { source } : {}),
        ...(section ? { sectionId: section.id } : {}),
        ...(modes ? { reviewModes: modes.map(modeOf) } : {}),
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
      // Clear what was sent before the picture uploads; anything typed since stays.
      const sent = (v: string, was: string | undefined) => (v.trim() === (was ?? "") ? "" : v);
      setTerm((v) => sent(v, text));
      setMeaning((v) => sent(v, own));
      setNoteText((v) => sent(v, notes));
      setModes((m) => (m === modes ? null : m));
      setPicture((x) => (x === picture ? null : x));
      // The source is usually the same lesson for the next card, so it stays.
      setExtra((x) => ({
        source: x.source,
        ...(sent(x.example ?? "", example) ? { example: x.example } : {}),
        ...(sent(x.pronunciation ?? "", pronunciation) ? { pronunciation: x.pronunciation } : {}),
        ...(sent(x.hook ?? "", hook) ? { hook: x.hook } : {}),
      }));
      termRef.current?.focus();
      // A picture is uploaded to the card on the server, so one chosen offline waits.
      let pictureError: string | undefined;
      if (picture && queued)
        pictureError = t`Pictures need a connection. Add it once you’re back online.`;
      else if (picture) {
        await api
          .uploadCardImage(
            outcome.card.id,
            { uri: picture.uri, name: picture.name, type: picture.type },
            outcome.card.imageVersion,
            picture.description.trim() || undefined,
          )
          .catch((e: unknown) => {
            pictureError = errorMessage(e);
          });
      }
      setLast({
        kind: "added",
        id: outcome.card.id,
        term,
        deckName: deck.name,
        queued,
        pictureError,
      });
      setUndoable(true);
      kept.set("deck", deck.id);
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

  return (
    <KeyboardRoom>
      <OnGlass>
        <View className="flex-row items-center justify-between gap-3 px-4 pt-5 pb-2">
          <GlassButton icon="close" label={t`Done`} onPress={() => router.back()} />
          {deck && (
            <Select
              label={t`Deck`}
              value={deck.id}
              options={decks.map((d) => ({ value: d.id, label: d.name }))}
              onChange={(id) => {
                setDeck(id);
                setSectionId(null);
                setModes(null);
                kept.set("deck", id);
              }}
              trigger={<GlassPill icon="deck">{deck.name}</GlassPill>}
              onClosed={() => termRef.current?.focus()}
            />
          )}
          <GlassButton
            icon="plus"
            label={t`Add to ${deckName}`}
            primary
            onPress={() => void add()}
          />
        </View>

        {decksQuery_.isPending ? null : deck ? (
          <>
            <ScrollView
              className="flex-1"
              contentContainerClassName="gap-3 px-5 pt-4 pb-4"
              keyboardShouldPersistTaps="always"
            >
              <View>
                <FieldName>{t`Term`}</FieldName>
                <TextInput
                  ref={termRef}
                  autoFocus
                  value={term}
                  maxLength={cardLimits.term ?? undefined}
                  onChangeText={(v) => {
                    setTerm(v);
                    if (error) setError(null);
                  }}
                  placeholder={t`A word or phrase`}
                  placeholderTextColor={p.muted}
                  accessibilityLabel={t`Term`}
                  accessibilityHint={error ?? undefined}
                  // The term is in the language being learned, which the phone's dictionary gets wrong.
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  multiline
                  submitBehavior="submit"
                  returnKeyType="next"
                  onSubmitEditing={() => meaningRef.current?.focus()}
                  selectionColor={p.text}
                  className="min-h-12 py-1.5 font-sans font-medium text-text"
                  style={{ fontSize: 28, letterSpacing: -0.56 }}
                  maxFontSizeMultiplier={inputCap(28)}
                />
              </View>
              <ComposerField
                ref={meaningRef}
                value={meaning}
                onChange={setMeaning}
                label={t`Meaning`}
                placeholder={enrich ? t`Leave it empty and the AI fills it in` : t`What it means`}
                limit={cardLimits.meaning}
                onNext={() => void add()}
              />
              <ComposerField
                value={noteText}
                onChange={setNoteText}
                label={t`Notes`}
                placeholder={t`Grammar, usage, anything else`}
                limit={cardLimits.notes}
                newline
              />
              {error ? (
                <View
                  className="flex-row items-center gap-1.5 pt-2"
                  accessibilityLiveRegion="polite"
                >
                  <Icon name="alert" size={14} colour={p.danger} />
                  <Text className="flex-1 text-base text-danger">{error}</Text>
                </View>
              ) : (
                last && <LastAdd last={last} onUndo={undoable ? undo : undefined} />
              )}
            </ScrollView>

            <View className="px-4 pt-1 pb-2">
              <FieldChipRow label={t`More about this card`}>
                <FieldChip
                  icon="ai"
                  tone="ai"
                  on={enrich}
                  checked={enrich}
                  accessibilityLabel={t`Fill in the rest with AI`}
                  onPress={() => {
                    setEnrich(!enrich);
                    kept.set("enrich", !enrich);
                  }}
                >
                  {enrich ? t`AI fills in` : t`AI off`}
                </FieldChip>
                {EXTRAS.map((field) => {
                  const label = i18n._(field.label);
                  const value = extra[field.key]?.trim();
                  return (
                    <FieldChip
                      key={field.key}
                      icon={field.icon}
                      on={!!value}
                      accessibilityLabel={value ? t`${label}: ${value}` : label}
                      onPress={() => setEditing(field.key)}
                    >
                      {value || label}
                    </FieldChip>
                  );
                })}
                {sections.length > 0 && (
                  <Select
                    label={t`Section`}
                    value={sectionId ?? ""}
                    options={[
                      { value: "", label: t`No section` },
                      ...sections.map((s) => ({ value: s.id, label: s.name })),
                    ]}
                    onChange={(id) => setSectionId(id || null)}
                    onClosed={() => termRef.current?.focus()}
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
              onClosed={() => termRef.current?.focus()}
            />
            <PictureSheet
              open={picturing}
              value={picture}
              onChange={setPicture}
              onClose={() => setPicturing(false)}
              onClosed={() => termRef.current?.focus()}
            />
            <FieldSheet
              field={EXTRAS.find((f) => f.key === editing)}
              value={editing ? (extra[editing] ?? "") : ""}
              onChange={(v) => editing && setExtra((x) => ({ ...x, [editing]: v }))}
              onClose={() => setEditing(null)}
              onClosed={() => termRef.current?.focus()}
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

/** A line under the term, the meaning or the notes: its name over it and no box, at one edge. */
function ComposerField({
  ref,
  value,
  onChange,
  label,
  placeholder,
  limit,
  newline = false,
  onNext,
}: {
  ref?: React.Ref<TextInput>;
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
  limit: number | null;
  /** Return starts a new line, as in notes, instead of adding the card. */
  newline?: boolean;
  /** Return adds the card. */
  onNext?: () => void;
}) {
  const p = usePalette();
  return (
    <Animated.View entering={CROSSFADE}>
      <FieldName>{label}</FieldName>
      <TextInput
        ref={ref}
        value={value}
        maxLength={limit ?? undefined}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={p.muted}
        accessibilityLabel={label}
        // It wraps as it fills; Return adds the card, or in notes starts a new line.
        multiline
        submitBehavior={newline ? "newline" : "submit"}
        returnKeyType={newline ? "default" : "done"}
        onSubmitEditing={newline ? undefined : onNext}
        selectionColor={p.text}
        className="min-h-9 py-1.5 font-sans text-text"
        style={{ fontSize: 17 }}
        maxFontSizeMultiplier={inputCap(17)}
      />
    </Animated.View>
  );
}

/**
 * One of the card's other fields, alone in a sheet over the composer with the keyboard up. The
 * keyboard's done key closes it, as a swipe does; no button repeats them. The web's FieldChip drawer.
 */
function FieldSheet({
  field: current,
  value,
  onChange,
  onClose,
  onClosed,
}: {
  field: (typeof EXTRAS)[number] | undefined;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onClosed: () => void;
}) {
  const { i18n } = useLingui();
  const p = usePalette();
  // The sheet keeps its field while it slides away, so it does not collapse on the way out.
  const [shown, setShown] = useState(current);
  useEffect(() => {
    if (current) setShown(current);
  }, [current]);
  const open = !!current;
  const field = current ?? shown;
  // These two are in the language being learned, which the phone's dictionary gets wrong.
  const learned = field?.key === "example" || field?.key === "pronunciation";
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      onDismiss={onClosed}
      title={field ? i18n._(field.label) : undefined}
    >
      {field && (
        <View className="rounded-xl bg-glass-plate px-4">
          <TextInput
            autoFocus
            value={value}
            maxLength={field.limit ?? undefined}
            onChangeText={onChange}
            placeholder={i18n._(field.hint)}
            placeholderTextColor={p.muted}
            accessibilityLabel={i18n._(field.label)}
            autoCorrect={!learned}
            spellCheck={!learned}
            autoCapitalize={field.key === "pronunciation" ? "none" : "sentences"}
            multiline
            submitBehavior="blurAndSubmit"
            returnKeyType="done"
            onSubmitEditing={onClose}
            selectionColor={p.text}
            // Room for a whole sentence; it grows past this as it fills.
            className={`py-3 font-sans text-text ${field.key === "example" || field.key === "hook" ? "min-h-28" : "min-h-12"}`}
            style={{ fontSize: 17, textAlignVertical: "top" }}
            maxFontSizeMultiplier={inputCap(17)}
          />
        </View>
      )}
    </Sheet>
  );
}

/** A picture chosen for the card, uploaded once the card exists. */
type Picture = { uri: string; name: string; type: string; description: string };

/**
 * The card's picture: taken or chosen, then described without naming the answer, which is what a
 * screen reader says and what review shows if it cannot load. It is uploaded after the card is added.
 */
function PictureSheet({
  open,
  value,
  onChange,
  onClose,
  onClosed,
}: {
  open: boolean;
  value: Picture | null;
  onChange: (value: Picture | null) => void;
  onClose: () => void;
  onClosed: () => void;
}) {
  const { t } = useLingui();
  const p = usePalette();
  const pick = async (from: "camera" | "library") => {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
    };
    if (from === "camera") {
      const allowed = await ImagePicker.requestCameraPermissionsAsync();
      if (!allowed.granted) return;
    }
    const result =
      from === "camera"
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    onChange({
      uri: asset.uri,
      name: asset.fileName ?? "picture.jpg",
      type: asset.mimeType ?? "image/jpeg",
      description: value?.description ?? "",
    });
  };
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      onDismiss={onClosed}
      title={t`Picture`}
    >
      {value && (
        <View className="gap-3">
          <Image
            source={{ uri: value.uri }}
            className="h-44 w-full rounded-xl"
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
          <View className="rounded-xl bg-glass-plate px-4">
            <TextInput
              value={value.description}
              maxLength={300}
              onChangeText={(description) => onChange({ ...value, description })}
              placeholder={t`Describe what the picture shows without naming the term or the meaning.`}
              placeholderTextColor={p.muted}
              accessibilityLabel={t`Description`}
              multiline
              submitBehavior="blurAndSubmit"
              returnKeyType="done"
              selectionColor={p.text}
              className="min-h-20 py-3 font-sans text-text"
              style={{ fontSize: 17, textAlignVertical: "top" }}
              maxFontSizeMultiplier={inputCap(17)}
            />
          </View>
        </View>
      )}
      <SheetGroup>
        <SheetRow label={t`Take a photo`} icon="camera" onPress={() => void pick("camera")} />
        <SheetRow
          label={value ? t`Choose another` : t`Choose from photos`}
          icon="picture"
          onPress={() => void pick("library")}
        />
      </SheetGroup>
      {value && (
        <SheetGroup>
          <SheetRow
            label={t`Clear the picture`}
            icon="close"
            destructive
            onPress={() => onChange(null)}
          />
        </SheetGroup>
      )}
    </Sheet>
  );
}

/** What each text mode is called, as on the web (ADR 0014). Picture modes wait for a picture. */
const MODE_LABELS: Record<ReviewModeKey, MessageDescriptor> = {
  term_to_meaning: msg`Recognition`,
  meaning_to_term: msg`Production`,
  image_to_term: msg`Picture → term`,
  image_to_meaning: msg`Picture → meaning`,
};

function isTextMode(key: ReviewModeKey) {
  return key === "term_to_meaning" || key === "meaning_to_term";
}

/**
 * How the card is asked: as its deck asks, or in the modes ticked here, at least one. The phone adds
 * no picture, so only the two text modes are offered. ADR 0014.
 */
function ModesSheet({
  open,
  value,
  deckModes,
  onChange,
  onClose,
  onClosed,
}: {
  open: boolean;
  value: ReviewModeKey[] | null;
  deckModes: ReviewModeKey[];
  onChange: (value: ReviewModeKey[] | null) => void;
  onClose: () => void;
  onClosed: () => void;
}) {
  const { t, i18n } = useLingui();
  const chosen = value ?? [];
  const toggle = (key: ReviewModeKey) => {
    const next = chosen.includes(key) ? chosen.filter((k) => k !== key) : [...chosen, key];
    // A card is asked at least one way, so unticking the last one goes back to the deck's.
    onChange(
      next.length === 0
        ? null
        : (["term_to_meaning", "meaning_to_term"] as const).filter((k) => next.includes(k)),
    );
  };
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      onDismiss={onClosed}
      title={t`How it’s asked`}
    >
      <SheetGroup>
        <SheetRow
          label={t`Same as the deck`}
          detail={deckModes.map((m) => i18n._(MODE_LABELS[m])).join(" · ")}
          chosen={value === null}
          onPress={() => onChange(null)}
        />
      </SheetGroup>
      <SheetGroup>
        {(["term_to_meaning", "meaning_to_term"] as const).map((key) => (
          <SheetRow
            key={key}
            label={i18n._(MODE_LABELS[key])}
            detail={
              key === "term_to_meaning"
                ? t`See the term, recall what it means`
                : t`See the meaning, recall the term`
            }
            chosen={chosen.includes(key)}
            multiple
            onPress={() => toggle(key)}
          />
        ))}
      </SheetGroup>
    </Sheet>
  );
}

/** A field's name over its line, so a filled line still says what it holds. */
function FieldName({ children }: { children: string }) {
  return (
    // The input below carries the same name, so VoiceOver and TalkBack read it once.
    <Text
      className="text-sm font-medium text-muted"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {children}
    </Text>
  );
}

/** The last add, under the fields: where it went, or where the card already is. */
function LastAdd({ last, onUndo }: { last: Outcome; onUndo: (() => void) | undefined }) {
  const { t } = useLingui();
  const p = usePalette();
  const { term, deckName } = last;
  const reason = last.kind === "added" ? last.pictureError : undefined;
  const line =
    last.kind === "skipped"
      ? t`“${term}” is already in ${deckName}`
      : reason
        ? t`Added “${term}” without its picture. ${reason}`
        : last.queued
          ? t`Added “${term}”. It’s saved on this phone until Lymi can be reached.`
          : t`Added “${term}” to ${deckName}`;
  return (
    <Animated.View
      entering={CROSSFADE}
      className="min-h-8 flex-row items-center gap-2 pt-2"
      accessibilityLiveRegion="polite"
    >
      <Icon
        name={last.kind === "skipped" ? "alert" : "check"}
        size={14}
        colour={last.kind === "skipped" ? p.muted : p.good}
        strokeWidth={2.25}
      />
      <Text className="flex-1 text-base text-text-2" numberOfLines={2}>
        {line}
      </Text>
      {onUndo && <Button label={t`Undo`} variant="ghost" size="sm" onPress={onUndo} />}
    </Animated.View>
  );
}
