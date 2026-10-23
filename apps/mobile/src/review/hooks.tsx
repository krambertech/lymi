import { useLingui } from "@lingui/react/macro";
import { api, type Card } from "@lymi/client/api";
import { settingsQuery } from "@lymi/client/queries";
import { writes } from "@lymi/client/writes";
import { CARD_LIMITS, type FieldSource, hookable } from "@lymi/core";
import { EASE_OUT } from "@lymi/design";
import { useQuery } from "@tanstack/react-query";
import { GlassView } from "expo-glass-effect";
import { useEffect, useRef, useState } from "react";
import { Alert, type LayoutChangeEvent, Pressable, TextInput, View } from "react-native";
import Animated, {
  FadeOut,
  Keyframe,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { captureEvent } from "../telemetry/posthog";
import { useGlass } from "../theme/glass";
import { ALWAYS, CROSSFADE, curve, useReduceMotion } from "../theme/motion";
import { usePalette } from "../theme/palette";
import { inputCap } from "../theme/type";
import { SourceChip } from "../ui/chip";
import { Button, Icon, IconButton, Text } from "../ui/primitives";
import { Sheet } from "../ui/sheet";
import { useSheetFocus } from "../ui/sheet-focus";

const EASE = curve(EASE_OUT);
/** The offer waits for the answer to settle, so it never arrives with it. */
const OFFER_DELAY = 500;

const arrive = (ms: number, y: number, delay = 0) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ translateY: y }] },
    100: { opacity: 1, transform: [{ translateY: 0 }], easing: EASE },
  })
    .duration(ms)
    .delay(delay)
    .reduceMotion(ALWAYS);

/** What Peek at your hook takes at the card's foot: its 32 pt button over a 20 pt margin. */
export const PEEK_ROOM = 52;

/**
 * The quiet control at the foot of an unrevealed card that peeks at its hook, as quiet as Show hook
 * after the reveal, since recall comes first. A tap on it never turns the card, and once the hook
 * shows it goes, since there is nothing more to take. It floats over the foot, whose room the card
 * keeps until the reveal, so the cue stays put as it goes.
 */
export function PeekButton({ onPeek }: { onPeek: () => void }) {
  const { t } = useLingui();
  return (
    <Animated.View
      exiting={FadeOut.duration(120).reduceMotion(ALWAYS)}
      className="absolute inset-x-0 bottom-0 items-center px-5 pb-5"
    >
      <Button size="sm" variant="ghost" icon="hook" label={t`Peek at your hook`} onPress={onPeek} />
    </Animated.View>
  );
}

/**
 * After a reveal without a peek, the quiet control in the hook's own place under the cue. Seeing it
 * once the answer is out is no help with recall, so it records nothing.
 */
export function ShowHookButton({ still, onShow }: { still: boolean; onShow: () => void }) {
  const { t } = useLingui();
  const reduce = useReduceMotion();
  return (
    <Animated.View
      entering={still ? undefined : reduce ? CROSSFADE : arrive(260, 10, 120)}
      // Pulled to the start edge, so its anchor stands where the hook's will.
      className="-ms-3 flex-row"
    >
      <Button size="sm" variant="ghost" icon="hook" label={t`Show hook`} onPress={onShow} />
    </Animated.View>
  );
}

/** The hook under the cue: its anchor, its words, and the AI's mark while the words are the AI's. */
export function HookLine({
  text,
  source,
  still,
}: {
  text: string;
  source: FieldSource | null;
  still: boolean;
}) {
  const { t } = useLingui();
  const p = usePalette();
  const reduce = useReduceMotion();
  return (
    <Animated.View
      entering={still ? undefined : reduce ? CROSSFADE : arrive(360, 4)}
      accessible
      accessibilityLabel={t`Memory hook: ${text}`}
      className="flex-row items-start gap-2"
    >
      <View className="pt-1">
        <Icon name="hook" size={16} colour={p.muted} />
      </View>
      <View className="min-w-0 flex-1 flex-row flex-wrap items-center gap-x-2 gap-y-1">
        <Text className="text-md text-text-2">{text}</Text>
        {source === "ai" && <SourceChip source="ai" field="hook" badge />}
      </View>
    </Animated.View>
  );
}

/** How far the offer rises from under the card's foot, past its own height so it waits unseen. */
const OFFER_RISE = 120;
const offerOut = new Keyframe({
  0: { transform: [{ translateY: 0 }] },
  100: { transform: [{ translateY: OFFER_RISE }], easing: EASE },
})
  .duration(200)
  .reduceMotion(ALWAYS);

/**
 * The offer to write a hook for an often-forgotten card. It floats in clear glass over the card's foot,
 * so a long card scrolls on under it rather than stopping at its edge. It asks for nothing, so it
 * is never amber and never in the way of a grade. Glass that starts transparent never draws, so it
 * rises in from under the card's edge rather than fading. phone.md "Glass".
 */
export function HookOffer({
  still,
  onOpen,
  onLayout,
}: {
  still: boolean;
  onOpen: () => void;
  /** Its height, so the card can leave that room under its last line. */
  onLayout?: (e: LayoutChangeEvent) => void;
}) {
  const { t } = useLingui();
  const p = usePalette();
  const glass = useGlass();
  const reduce = useReduceMotion();
  const [ready, setReady] = useState(still);
  // Below the card's edge from the reveal, so the card leaves its room at once and nothing jumps when it rises.
  const rise = useSharedValue(still ? 0 : OFFER_RISE);
  useEffect(() => {
    if (ready) return;
    rise.value = withDelay(
      OFFER_DELAY,
      withTiming(0, { duration: reduce ? 0 : 320, easing: EASE, reduceMotion: ALWAYS }),
    );
    const timer = setTimeout(() => setReady(true), OFFER_DELAY + 320);
    return () => clearTimeout(timer);
  }, [ready, reduce, rise]);
  const risen = useAnimatedStyle(() => ({ transform: [{ translateY: rise.value }] }));
  const face = (
    <Pressable
      // It cannot be pressed until it has landed.
      disabled={!ready}
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={t`Try a memory hook`}
      accessibilityHint={t`A short phrase that helps you remember it`}
      className="flex-row items-center gap-2 py-3 ps-4 pe-3"
      style={({ pressed }) => (pressed && !glass ? { backgroundColor: p.hover } : null)}
    >
      <Icon name="hook" size={16} colour={p["text-2"]} />
      {/* One line, so a long card keeps its room; what a hook is stays in the hint. */}
      <Text className="min-w-0 flex-1 text-base font-medium text-text" numberOfLines={1}>
        {t`Try a memory hook`}
      </Text>
      <Icon name="forward" size={16} colour={p.muted} />
    </Pressable>
  );
  return (
    <Animated.View
      style={risen}
      exiting={reduce ? FadeOut.duration(140).reduceMotion(ALWAYS) : offerOut}
      onLayout={onLayout}
      // Inset 12 under a 30 pt card corner, so its 18 pt corners run parallel to the card's.
      className="absolute inset-x-0 bottom-0 px-3 pb-3"
    >
      {glass ? (
        <GlassView
          isInteractive
          glassEffectStyle="clear"
          // Untinted clear glass on the white card glows past the card's white on device, so it takes the fallback's grey.
          tintColor={`${p["plate-2"]}b3`}
          style={OFFER_SHAPE}
        >
          {face}
        </GlassView>
      ) : (
        <View className="overflow-hidden bg-plate-2" style={OFFER_SHAPE}>
          {face}
        </View>
      )}
    </Animated.View>
  );
}

const OFFER_SHAPE = { borderRadius: 18 } as const;

/**
 * The card's memory hook, written in a sheet with the keyboard up, as the card's other fields are.
 * ✓ and the keyboard's done key save; Close and a swipe down let go. Draft a hook asks the AI for
 * one and puts it in the field to edit, as the web's editor does; while the field still holds that
 * draft, the button asks for another.
 */
export function HookSheet({
  card,
  open,
  onClose,
  onSaved,
}: {
  card: Card | null;
  open: boolean;
  onClose: () => void;
  /** The hook as the server keeps it, which marks a saved AI draft as the AI's. */
  onSaved: (hook: { text: string; source: FieldSource | null }) => void;
}) {
  const { t } = useLingui();
  const p = usePalette();
  // The sheet keeps its card while it slides away, so it does not empty on the way out.
  const [shown, setShown] = useState(card);
  const [text, setText] = useState(card?.hook ?? "");
  const [pending, setPending] = useState(false);
  const [drafted, setDrafted] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [draftNote, setDraftNote] = useState<string | null>(null);
  const focus = useSheetFocus({ open });
  // The sheet stays mounted between cards, so each opening counts and a reply from an earlier one is dropped.
  const opening = useRef(0);
  // What the field holds now, read when a draft lands after the learner may have typed.
  const latest = useRef(text);
  latest.current = text;
  // biome-ignore lint/correctness/useExhaustiveDependencies: once per opening, not per render of the card.
  useEffect(() => {
    if (!open || !card) return;
    opening.current += 1;
    setShown(card);
    setText(card.hook ?? "");
    setDrafted(null);
    setDrafting(false);
    setDraftNote(null);
  }, [open]);
  const settings = useQuery(settingsQuery);
  const editing = card ?? shown;
  const empty = !text.trim();
  const untouched = drafted !== null && text === drafted;
  // Only where the server drafts at all, and never over the learner's own words.
  const draftable =
    !!editing &&
    !!settings.data &&
    hookable(editing, settings.data.meaningLanguage) &&
    (empty || untouched || drafting);

  const draft = async () => {
    if (!editing || drafting) return;
    const asked = opening.current;
    const before = latest.current;
    setDrafting(true);
    setDraftNote(null);
    const started = performance.now();
    const waited = () => Math.min(60_000, Math.round(performance.now() - started));
    try {
      const { hook } = await api.draftHook(editing.id);
      captureEvent("hook_drafted", { outcome: hook ? "drafted" : "none", wait_ms: waited() });
      if (opening.current !== asked || latest.current !== before) return;
      if (hook) {
        setText(hook);
        setDrafted(hook);
      } else {
        setDraftNote(t`No strong hook for this one. Try again, or write your own.`);
      }
    } catch {
      captureEvent("hook_drafted", { outcome: "failed", wait_ms: waited() });
      if (opening.current === asked) setDraftNote(t`Couldn’t draft a hook. Try again in a moment.`);
    } finally {
      if (opening.current === asked) setDrafting(false);
    }
  };

  const save = async () => {
    if (!editing || pending) return;
    const hook = text.trim();
    if (!hook) {
      Alert.alert(t`Write a hook.`);
      return;
    }
    if (hook === editing.hook) {
      onClose();
      return;
    }
    setPending(true);
    try {
      const { card: written } = await writes.updateCard(editing, { hook, hookSource: "manual" });
      onSaved({ text: written.hook ?? hook, source: written.hookSource ?? "manual" });
    } catch (e) {
      Alert.alert(t`Couldn’t save the hook.`, e instanceof Error ? e.message : undefined);
    } finally {
      setPending(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      // Named as it opened, so a saved first hook never retitles the sheet on its way out.
      title={shown?.hook ? t`Edit hook` : t`Add hook`}
      save={{ label: t`Save`, onPress: () => void save(), busy: pending }}
    >
      <View className="rounded-xl bg-glass-plate px-4 pb-3">
        <TextInput
          {...focus}
          value={text}
          maxLength={CARD_LIMITS.hook}
          onChangeText={(next) => {
            setText(next);
            setDraftNote(null);
          }}
          placeholder={t`A sound-alike, or something to picture`}
          placeholderTextColor={p.muted}
          accessibilityLabel={t`Memory hook`}
          multiline
          submitBehavior="blurAndSubmit"
          returnKeyType="done"
          onSubmitEditing={() => void save()}
          selectionColor={p.text}
          className="min-h-16 pt-3 pb-1 font-sans text-text"
          style={{ fontSize: 17, textAlignVertical: "top" }}
          maxFontSizeMultiplier={inputCap(17)}
        />
        {/* Inside the field and its room kept, so the sheet never changes height as a draft arrives or the button goes. */}
        <View className="min-h-8 flex-row items-center gap-3">
          <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
            {draftNote ? (
              <Text className="text-sm text-muted">{draftNote}</Text>
            ) : untouched ? (
              <>
                <Icon name="ai" size={14} colour={p.muted} />
                <Text className="text-sm text-muted">{t`AI draft`}</Text>
              </>
            ) : null}
          </View>
          {/* Labelled while the field is empty, an icon once a draft is in; the sheet's ✓ saves, so the row holds only the draft. */}
          {draftable &&
            (untouched ? (
              <IconButton
                size="sm"
                icon="ai"
                label={t`Another draft`}
                busy={drafting}
                onPress={() => void draft()}
              />
            ) : (
              <Button
                size="sm"
                variant="ghost"
                icon="ai"
                label={t`Draft`}
                loading={drafting}
                onPress={() => void draft()}
              />
            ))}
        </View>
      </View>
    </Sheet>
  );
}
