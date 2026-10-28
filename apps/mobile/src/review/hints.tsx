import { useLingui } from "@lingui/react/macro";
import { aiChoice } from "@lymi/client/ai-consent";
import { api, type Card } from "@lymi/client/api";
import { settingsQuery } from "@lymi/client/queries";
import { writes } from "@lymi/client/writes";
import { CARD_LIMITS, type FieldSource, hintable } from "@lymi/core";
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
import { Button, Icon, Text } from "../ui/primitives";
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

/** What Peek at your hint takes at the card's foot: its 32 pt button over a 20 pt margin. */
export const PEEK_ROOM = 52;

/**
 * The quiet control at the foot of an unrevealed card that peeks at its hint, as quiet as Show hint
 * after the reveal, since recall comes first. A tap on it never turns the card, and once the hint
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
      <Button size="sm" variant="ghost" icon="hint" label={t`Peek at your hint`} onPress={onPeek} />
    </Animated.View>
  );
}

/**
 * After a reveal without a peek, the quiet control in the hint's own place under the cue. Seeing it
 * once the answer is out is no help with recall, so it records nothing.
 */
export function ShowHintButton({ still, onShow }: { still: boolean; onShow: () => void }) {
  const { t } = useLingui();
  const reduce = useReduceMotion();
  return (
    <Animated.View
      entering={still ? undefined : reduce ? CROSSFADE : arrive(260, 10, 120)}
      exiting={FadeOut.duration(120).reduceMotion(ALWAYS)}
      // Pulled to the start edge, so its life buoy stands where the hint's will.
      className="-ms-3 flex-row"
    >
      <Button size="sm" variant="ghost" icon="hint" label={t`Show hint`} onPress={onShow} />
    </Animated.View>
  );
}

/** The hint under the cue: its life buoy and its words. Who wrote it is the card page's to say, not review's. */
export function HintLine({ text, still }: { text: string; still: boolean }) {
  const { t } = useLingui();
  const p = usePalette();
  const reduce = useReduceMotion();
  return (
    <Animated.View
      entering={still ? undefined : reduce ? CROSSFADE : arrive(360, 4)}
      accessible
      accessibilityLabel={t`Hint: ${text}`}
      className="flex-row items-start gap-2"
    >
      <View className="pt-1">
        <Icon name="hint" size={16} colour={p["ink-muted"]} />
      </View>
      <Text className="min-w-0 flex-1 text-md text-ink-secondary">{text}</Text>
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
 * The offer to write a hint for an often-forgotten card. It floats in clear glass over the card's foot,
 * so a long card scrolls on under it rather than stopping at its edge. It asks for nothing, so it
 * is never amber and never in the way of a grade. Glass that starts transparent never draws, so it
 * rises in from under the card's edge rather than fading. phone.md "Glass".
 */
export function HintOffer({
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
      accessibilityLabel={t`Try a hint`}
      accessibilityHint={t`A short phrase that helps you remember it`}
      className="flex-row items-center gap-2 py-3 ps-4 pe-3"
      style={({ pressed }) => (pressed && !glass ? { backgroundColor: p["plate-hover"] } : null)}
    >
      <Icon name="hint" size={16} colour={p["ink-secondary"]} />
      {/* One line, so a long card keeps its room; what a hint is stays in the hint. */}
      <Text className="min-w-0 flex-1 text-base font-medium text-ink" numberOfLines={1}>
        {t`Try a hint`}
      </Text>
      <Icon name="forward" size={16} colour={p["ink-muted"]} />
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
          tintColor={`${p["plate-nested"]}b3`}
          style={OFFER_SHAPE}
        >
          {face}
        </GlassView>
      ) : (
        <View className="overflow-hidden bg-plate-nested" style={OFFER_SHAPE}>
          {face}
        </View>
      )}
    </Animated.View>
  );
}

const OFFER_SHAPE = { borderRadius: 18 } as const;

/**
 * The card's hint, written in a sheet with the keyboard up, as the card's other fields are.
 * ✓ and the keyboard's done key save; Close and a swipe down let go. Draft a hint asks the AI for
 * one and puts it in the field to edit, as the web's editor does; while the field still holds that
 * draft, the button asks for another.
 */
export function HintSheet({
  card,
  open,
  onClose,
  onSaved,
}: {
  card: Card | null;
  open: boolean;
  onClose: () => void;
  /** The hint as the server keeps it, which marks a saved AI draft as the AI's. */
  onSaved: (hint: { text: string; source: FieldSource | null }) => void;
}) {
  const { t } = useLingui();
  const p = usePalette();
  // The sheet keeps its card while it slides away, so it does not empty on the way out.
  const [shown, setShown] = useState(card);
  const [text, setText] = useState(card?.hint ?? "");
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
    setText(card.hint ?? "");
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
    hintable(editing, settings.data.meaningLanguage) &&
    (empty || untouched || drafting);

  const draft = async () => {
    if (!editing || drafting) return;
    // This sheet can't hold the ask over itself, so it says where AI is allowed.
    if (aiChoice(settings.data) !== true) {
      setDraftNote(t`Drafting a hint uses AI. Turn on AI services in You to draft one.`);
      return;
    }
    const asked = opening.current;
    const before = latest.current;
    setDrafting(true);
    setDraftNote(null);
    const started = performance.now();
    const waited = () => Math.min(60_000, Math.round(performance.now() - started));
    try {
      const { hint } = await api.draftHint(editing.id);
      captureEvent("hint_drafted", { outcome: hint ? "drafted" : "none", wait_ms: waited() });
      if (opening.current !== asked || latest.current !== before) return;
      if (hint) {
        setText(hint);
        setDrafted(hint);
      } else {
        setDraftNote(t`No strong hint for this one. Try again, or write your own.`);
      }
    } catch {
      captureEvent("hint_drafted", { outcome: "failed", wait_ms: waited() });
      if (opening.current === asked) setDraftNote(t`Couldn’t draft a hint. Try again in a moment.`);
    } finally {
      if (opening.current === asked) setDrafting(false);
    }
  };

  const save = async () => {
    if (!editing || pending) return;
    const hint = text.trim();
    if (!hint) {
      Alert.alert(t`Write a hint.`);
      return;
    }
    if (hint === editing.hint) {
      onClose();
      return;
    }
    setPending(true);
    try {
      const { card: written } = await writes.updateCard(editing, { hint, hintSource: "manual" });
      onSaved({ text: written.hint ?? hint, source: written.hintSource ?? "manual" });
    } catch (e) {
      Alert.alert(t`Couldn’t save the hint.`, e instanceof Error ? e.message : undefined);
    } finally {
      setPending(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      // Named as it opened, so a saved first hint never retitles the sheet on its way out.
      title={shown?.hint ? t`Edit hint` : t`Add hint`}
      save={{ label: t`Save`, onPress: () => void save(), busy: pending }}
    >
      <View className="rounded-xl bg-glass-plate px-4 pb-3">
        <TextInput
          {...focus}
          value={text}
          maxLength={CARD_LIMITS.hint}
          onChangeText={(next) => {
            setText(next);
            setDraftNote(null);
          }}
          placeholder={t`A sound-alike, or something to picture`}
          placeholderTextColor={p["ink-muted"]}
          accessibilityLabel={t`Hint`}
          multiline
          submitBehavior="blurAndSubmit"
          returnKeyType="done"
          onSubmitEditing={() => void save()}
          selectionColor={p.ink}
          className="min-h-16 pt-3 pb-1 font-sans text-ink"
          style={{ fontSize: 17, textAlignVertical: "top" }}
          maxFontSizeMultiplier={inputCap(17)}
        />
        {/* The sheet sits on the keyboard and grows upward, so a note above Draft leaves the button under the finger that pressed it. */}
        {draftNote && <Text className="pt-1 text-sm text-ink-muted">{draftNote}</Text>}
        {/* Its room kept, so a draft arriving or the button going never changes the sheet's height. */}
        <View className="min-h-8 flex-row items-center">
          {/* One control throughout, as on the web: its label says what a press does, and its loader turns in the sparkle's place. */}
          {draftable && (
            <View className="-ms-3">
              <Button
                size="sm"
                variant="ghost"
                icon="ai"
                label={drafting ? t`Drafting…` : untouched ? t`Another draft` : t`Draft`}
                busy={drafting}
                onPress={() => void draft()}
              />
            </View>
          )}
        </View>
      </View>
    </Sheet>
  );
}
