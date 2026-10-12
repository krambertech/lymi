import { useLingui } from "@lingui/react/macro";
import { api } from "@lymi/client/api";
import { canSpeakTerm } from "@lymi/core";
import { requireOptionalNativeModule } from "expo";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSessionHeaders } from "../auth/client";
import { ALWAYS, useReduceMotion } from "../theme/motion";
import { IconButton, Text } from "../ui/primitives";

/** Long enough for speech the server makes on first ask; past it, the play counts as failed. */
const LOAD_LIMIT_MS = 12_000;
const TIP_MS = 4000;

type ExpoAudio = typeof import("expo-audio");
// A build from before the audio module has no pronunciation rather than a broken review.
const audio: ExpoAudio | null = requireOptionalNativeModule("ExpoAudio")
  ? (require("expo-audio") as ExpoAudio)
  : null;

// A pronunciation is asked for with a tap, so it plays with the ringer off, as a podcast does.
void audio
  ?.setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "duckOthers" })
  .catch(() => undefined);

type Card = { id: string; term: string; language?: string | null | undefined };

/**
 * Plays a card's pronunciation from the API with the learner's session. A second press replays it
 * from the start; a failure says why on the button, as the web's does. motion.md "Review".
 */
function useAudioPronunciation(
  card: Card | null,
  { useAudioPlayer, useAudioPlayerStatus }: ExpoAudio,
) {
  const { t } = useLingui();
  const headers = useSessionHeaders();
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [asked, setAsked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef<string | null>(null);
  const speakable = !!card && canSpeakTerm(card) && !!headers;

  // A new card starts quiet, with no error from the last one.
  const cardId = card?.id ?? null;
  const shown = useRef(cardId);
  useEffect(() => {
    if (shown.current === cardId) return;
    shown.current = cardId;
    setError(null);
    setAsked(false);
    player.pause();
  }, [cardId, player]);

  useEffect(() => {
    if (!asked || status.isLoaded) return;
    const timer = setTimeout(() => {
      setAsked(false);
      loaded.current = null;
      setError(t`Couldn’t play the pronunciation. Try again in a moment.`);
    }, LOAD_LIMIT_MS);
    return () => clearTimeout(timer);
  }, [asked, status.isLoaded, t]);
  useEffect(() => {
    if (asked && status.isLoaded && status.didJustFinish) setAsked(false);
  }, [asked, status.isLoaded, status.didJustFinish]);

  const play = () => {
    if (!speakable || !headers || !card) return;
    setError(null);
    const uri = api.audioUrl(card.id);
    if (loaded.current !== uri) {
      player.replace({ uri, headers });
      loaded.current = uri;
    } else {
      void player.seekTo(0);
    }
    player.play();
    setAsked(true);
  };

  const state: "idle" | "loading" | "playing" = !asked
    ? "idle"
    : status.isLoaded && status.playing
      ? "playing"
      : "loading";
  return speakable ? { play, state, error } : null;
}

const noPronunciation = (_card: Card | null) => null;
export const usePronunciation = audio
  ? (card: Card | null) => useAudioPronunciation(card, audio)
  : noPronunciation;

/**
 * The round pronunciation button. It turns red and shakes once when a play fails, and says why in a
 * tip over itself for four seconds, so nothing is added under the card.
 */
export type Pronunciation = NonNullable<ReturnType<typeof useAudioPronunciation>>;

export function PronounceButton({ pronounce }: { pronounce: Pronunciation }) {
  const { t } = useLingui();
  const reduce = useReduceMotion();
  const shake = useSharedValue(0);
  const [tip, setTip] = useState<string | null>(null);
  const { error, state, play } = pronounce;

  useEffect(() => {
    if (!error) return;
    setTip(error);
    AccessibilityInfo.announceForAccessibility(error);
    if (!reduce) {
      shake.value = withSequence(
        ...[-6, 6, -4, 4, 0].map((x) => withTiming(x, { duration: 80, reduceMotion: ALWAYS })),
      );
    }
    const timer = setTimeout(() => setTip(null), TIP_MS);
    return () => clearTimeout(timer);
  }, [error, reduce, shake]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  return (
    <View>
      {tip && (
        <Animated.View
          entering={FadeIn.duration(150).reduceMotion(ALWAYS)}
          exiting={FadeOut.duration(100).reduceMotion(ALWAYS)}
          pointerEvents="none"
          className="absolute bottom-12 end-0 w-56 rounded-lg bg-text px-3 py-2"
        >
          <Text className="text-sm text-canvas">{tip}</Text>
        </Animated.View>
      )}
      <Animated.View style={style}>
        <IconButton
          icon="pronunciation"
          label={state === "playing" ? t`Replay pronunciation` : t`Play pronunciation`}
          variant={error ? "danger" : "secondary"}
          size="md"
          round
          onPress={() => {
            setTip(null);
            play();
          }}
        />
      </Animated.View>
    </View>
  );
}
