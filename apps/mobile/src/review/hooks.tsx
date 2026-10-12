import { useLingui } from "@lingui/react/macro";
import type { Card } from "@lymi/client/api";
import { hookDraftQuery } from "@lymi/client/queries";
import { writes } from "@lymi/client/writes";
import { CARD_LIMITS, type FieldSource } from "@lymi/core";
import { EASE_OUT } from "@lymi/design";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Alert, Pressable, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeOut, Keyframe } from "react-native-reanimated";
import { ALWAYS, CROSSFADE, curve, useReduceMotion } from "../theme/motion";
import { usePalette } from "../theme/palette";
import { inputCap } from "../theme/type";
import { SourceChip } from "../ui/chip";
import { Button, Icon, Text } from "../ui/primitives";
import { Sheet } from "../ui/sheet";

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

/**
 * The pill at the foot of an unrevealed card that peeks at its hook. A tap on it never turns the
 * card, and once the hook shows it goes, since there is nothing more to take.
 */
export function PeekButton({ onPeek }: { onPeek: () => void }) {
  const { t } = useLingui();
  return (
    <Animated.View
      exiting={FadeOut.duration(120).reduceMotion(ALWAYS)}
      className="items-center px-5 pb-5"
    >
      <Button size="md" icon="hook" label={t`Peek at your hook`} onPress={onPeek} />
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

/**
 * The offer to write a hook for an often-forgotten card, at the foot of a revealed card. It asks for
 * nothing, so it is never amber and never in the way of a grade.
 */
export function HookOffer({ still, onOpen }: { still: boolean; onOpen: () => void }) {
  const { t } = useLingui();
  const p = usePalette();
  const reduce = useReduceMotion();
  const [ready, setReady] = useState(still);
  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => setReady(true), OFFER_DELAY + 200);
    return () => clearTimeout(timer);
  }, [ready]);
  return (
    <Animated.View
      entering={
        still
          ? undefined
          : reduce
            ? FadeIn.duration(200).delay(OFFER_DELAY).reduceMotion(ALWAYS)
            : arrive(200, 6, OFFER_DELAY)
      }
      exiting={FadeOut.duration(140).reduceMotion(ALWAYS)}
      className="px-4 pb-4"
    >
      <Pressable
        // It cannot be pressed until it can be seen.
        disabled={!ready}
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={t`Try a memory hook`}
        accessibilityHint={t`A short phrase that helps you remember it`}
        className="flex-row items-center gap-3 rounded-lg bg-plate-2 px-3 py-3"
        style={({ pressed }) => (pressed ? { backgroundColor: p.hover } : null)}
      >
        <View className="size-10 items-center justify-center rounded-full bg-plate">
          <Icon name="hook" size={18} colour={p["text-2"]} />
        </View>
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="text-md font-medium text-text" numberOfLines={2}>
            {t`Try a memory hook`}
          </Text>
          <Text className="text-sm text-muted" numberOfLines={2}>
            {t`A short phrase that helps you remember it`}
          </Text>
        </View>
        <Icon name="forward" size={16} colour={p.faint} />
      </Pressable>
    </Animated.View>
  );
}

/**
 * The card's memory hook, written in a sheet with the keyboard up, as the card's other fields are.
 * The keyboard's done key saves, as no button repeats it; on an empty field it keeps the AI's draft,
 * which is the placeholder. A swipe down lets go.
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
  // biome-ignore lint/correctness/useExhaustiveDependencies: once per opening, not per render of the card.
  useEffect(() => {
    if (!open || !card) return;
    setShown(card);
    setText(card.hook ?? "");
  }, [open]);
  const editing = card ?? shown;
  const draft = useQuery({
    ...hookDraftQuery(editing ?? { id: "", term: "", meaning: null }),
    enabled: open && !!editing && !editing.hook,
  });
  const drafted = draft.data ?? null;
  const empty = !text.trim();

  const save = async () => {
    if (!editing || pending) return;
    const hook = text.trim() || drafted || "";
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
      title={editing?.hook ? t`Edit hook` : t`Add hook`}
    >
      <View className="gap-3">
        <View className="rounded-xl bg-glass-plate px-4">
          <TextInput
            autoFocus
            value={text}
            maxLength={CARD_LIMITS.hook}
            onChangeText={setText}
            placeholder={drafted ?? t`A sound-alike, or something to picture`}
            placeholderTextColor={p.muted}
            accessibilityLabel={t`Memory hook`}
            multiline
            submitBehavior="blurAndSubmit"
            returnKeyType="done"
            onSubmitEditing={() => void save()}
            selectionColor={p.text}
            className="min-h-24 py-3 font-sans text-text"
            style={{ fontSize: 17, textAlignVertical: "top" }}
            maxFontSizeMultiplier={inputCap(17)}
          />
        </View>
        {/* Its room is kept, so the sheet never changes height as the draft arrives. */}
        <View className="min-h-5 flex-row items-center gap-1.5 ps-4">
          {empty && drafted ? (
            <>
              <Icon name="ai" size={14} colour={p.muted} />
              <Text className="text-sm text-muted">{t`AI draft · Done keeps it`}</Text>
            </>
          ) : empty && draft.isFetching ? (
            <Text className="text-sm text-muted">{t`Drafting a hook…`}</Text>
          ) : null}
        </View>
      </View>
    </Sheet>
  );
}
