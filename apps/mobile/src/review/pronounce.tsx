import { useLingui } from "@lingui/react/macro";
import { api } from "@lymi/client/api";
import { canPlayPronunciation, pronunciationInputKey } from "@lymi/core";
import { SPEAKER_WAVES } from "@lymi/design";
import { requireOptionalNativeModule } from "expo";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, StyleSheet, View, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  FadeIn,
  FadeOut,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { useSessionHeaders } from "../auth/client";
import { useAiConsent } from "../privacy/ai-consent";
import { ALWAYS, timed, useReduceMotion } from "../theme/motion";
import { usePalette } from "../theme/palette";
import { IconButton, Text } from "../ui/primitives";

/** Long enough for speech the server makes on first ask; past it, the play counts as failed. */
const LOAD_LIMIT_MS = 12_000;
const TIP_MS = 4000;

export type ExpoAudio = typeof import("expo-audio");
// A build from before the audio module has no pronunciation rather than a broken review.
export const audio: ExpoAudio | null = requireOptionalNativeModule("ExpoAudio")
  ? (require("expo-audio") as ExpoAudio)
  : null;

// A pronunciation is asked for with a tap, so it plays with the ringer off, as a podcast does.
void audio
  ?.setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "duckOthers" })
  .catch(() => undefined);

type Card = {
  id: string;
  /** The card's owner, whose choice decides whether its words are voiced. */
  userId?: string | undefined;
  updatedAt?: Date | string | undefined;
  term: string;
  pronunciation?: string | null | undefined;
  meaning?: string | null | undefined;
  language?: string | null | undefined;
  audioSource?: string | null | undefined;
  audioKey?: string | null | undefined;
};
/** How a press ended, with the sound started or never come; a card changed mid-load reports nothing. */
export type PlaySettled = (
  outcome: "played" | "failed",
  timing: { preloaded: boolean; waitMs: number },
) => void;

/**
 * Plays a card's pronunciation from the API with the learner's session. A second press replays it
 * from the start; a failure says why on the button, as the web's does. motion.md "Review".
 */
function useAudioPronunciation(
  card: Card | null,
  { useAudioPlayer, useAudioPlayerStatus }: ExpoAudio,
  onSettled?: PlaySettled,
) {
  const { t } = useLingui();
  const headers = useSessionHeaders();
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [asked, setAsked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef<string | null>(null);
  const preloaded = useRef(false);
  const pressed = useRef({ at: 0, preloaded: false });
  const settled = useRef(onSettled);
  settled.current = onSettled;
  const speakable = !!card && canPlayPronunciation(card) && !!headers;

  // A new card starts quiet, with no error from the last one, and loads a clip voiced before so a
  // tap plays it at once; a missing clip is never voiced ahead.
  const cardId = card?.id ?? null;
  const audioInput = card ? pronunciationInputKey(card) : null;
  const preload = speakable && !!card?.audioKey;
  const shown = useRef<string | null>(null);
  useEffect(() => {
    if (shown.current === audioInput) return;
    shown.current = audioInput;
    setError(null);
    setAsked(false);
    player.pause();
    loaded.current = null;
    if (cardId && preload && headers) {
      const uri = api.storedAudioUrl(cardId, card?.updatedAt);
      player.replace({ uri, headers });
      loaded.current = audioInput;
      preloaded.current = true;
    }
  }, [cardId, audioInput, card?.updatedAt, preload, headers, player]);

  // An ask is answered once the sound starts; until then it can time out.
  const playing = status.isLoaded && status.playing;
  useEffect(() => {
    if (!asked) return;
    const timing = () => ({
      preloaded: pressed.current.preloaded,
      waitMs: Math.min(60_000, Math.round(performance.now() - pressed.current.at)),
    });
    if (playing) {
      setAsked(false);
      settled.current?.("played", timing());
      return;
    }
    const timer = setTimeout(() => {
      setAsked(false);
      settled.current?.("failed", timing());
      loaded.current = null;
      setError(t`Couldn’t play the pronunciation. Try again in a moment.`);
    }, LOAD_LIMIT_MS);
    return () => clearTimeout(timer);
  }, [asked, playing, t]);

  const consent = useAiConsent("speech");
  // Only the learner's own card waits for their yes, and only for a clip not voiced yet.
  const waitsForYes =
    !!card && card.userId === consent.userId && !card.audioKey && !consent.allowed;

  const play = () => {
    if (!speakable || !headers || !card) return;
    if (waitsForYes) {
      void consent.ask().then((allowed) => {
        if (allowed) start();
      });
      return;
    }
    start();
  };

  const start = () => {
    if (!speakable || !headers || !card) return;
    setError(null);
    const uri = api.audioUrl(card.id, card.updatedAt);
    const source = pronunciationInputKey(card);
    // A preload that has not loaded may be a clip not voiced yet, so the full address voices it.
    const ready = loaded.current === source && (!preloaded.current || status.isLoaded);
    pressed.current = { at: performance.now(), preloaded: ready && status.isLoaded };
    if (ready) {
      void player.seekTo(0);
    } else {
      player.replace({ uri, headers });
      loaded.current = source;
      preloaded.current = false;
    }
    player.play();
    setAsked(true);
  };

  // The player's own state, since a replay starts while the last play's `didJustFinish` still holds.
  const state: "idle" | "loading" | "playing" = playing ? "playing" : asked ? "loading" : "idle";
  return speakable ? { play, state, error, sheet: consent.sheet } : null;
}

const noPronunciation = (_card: Card | null, _onSettled?: PlaySettled) => null;
export const usePronunciation = audio
  ? (card: Card | null, onSettled?: PlaySettled) => useAudioPronunciation(card, audio, onSettled)
  : noPronunciation;

interface Anchor {
  x: number;
  y: number;
  width: number;
  height: number;
}
interface Tips {
  show: (text: string, anchor: Anchor) => void;
  hide: () => void;
}
const TipContext = createContext<Tips | null>(null);
export const TipProvider = TipContext.Provider;
/** Room a two-line tip needs over its button before it drops below instead. */
const TIP_ROOM = 72;
const TIP_GAP = 6;
const TIP_INSET = 12;

/**
 * Where the pronunciation's tip draws: a layer over the whole card. The button sits inside a line of
 * text and a scroll view, and either would cut a tip drawn beside it.
 */
export function useTipLayer() {
  const host = useRef<View>(null);
  const [tip, setTip] = useState<{ text: string; place: ViewStyle } | null>(null);
  const tips = useMemo<Tips>(
    () => ({
      show: (text, a) =>
        host.current?.measureInWindow((hx, hy, hw, hh) => {
          const width = Math.min(256, hw - 2 * TIP_INSET);
          const x = a.x - hx;
          const y = a.y - hy;
          const left = Math.min(
            Math.max(x + a.width / 2 - width / 2, TIP_INSET),
            hw - TIP_INSET - width,
          );
          setTip({
            text,
            place:
              y >= TIP_ROOM
                ? { left, width, bottom: hh - y + TIP_GAP }
                : { left, width, top: y + a.height + TIP_GAP },
          });
        }),
      hide: () => setTip(null),
    }),
    [],
  );
  useEffect(() => {
    if (!tip) return;
    const timer = setTimeout(() => setTip(null), TIP_MS);
    return () => clearTimeout(timer);
  }, [tip]);
  const layer = (
    <View ref={host} pointerEvents="none" style={StyleSheet.absoluteFill}>
      {tip && (
        <Animated.View
          entering={FadeIn.duration(150).reduceMotion(ALWAYS)}
          exiting={FadeOut.duration(100).reduceMotion(ALWAYS)}
          className="absolute rounded-lg bg-ink px-3 py-2"
          style={tip.place}
        >
          <Text className="text-sm text-canvas">{tip.text}</Text>
        </Animated.View>
      )}
    </View>
  );
  return { tips, layer };
}

/**
 * The round pronunciation button. It turns red and shakes once when a play fails, and says why in a
 * tip over itself for four seconds, drawn on the card's tip layer so nothing is added under the card.
 */
export type Pronunciation = NonNullable<ReturnType<typeof useAudioPronunciation>>;

export function PronounceButton({ pronounce }: { pronounce: Pronunciation }) {
  const { t } = useLingui();
  return (
    <SpeakerButton
      sound={pronounce}
      labels={{ play: t`Play pronunciation`, replay: t`Replay pronunciation` }}
    />
  );
}

/** A failed play said over what was pressed, on the card's tip layer, with one shake. */
export function useSoundError(error: string | null) {
  const reduce = useReduceMotion();
  const tips = useContext(TipContext);
  const anchor = useRef<View>(null);
  const shake = useSharedValue(0);
  // Only a failure that happens here is said; a button drawn already failed, as on a graded copy, stays quiet.
  const said = useRef(error);

  useEffect(() => {
    if (error === said.current) return;
    said.current = error;
    if (!error) return;
    anchor.current?.measureInWindow((x, y, width, height) =>
      tips?.show(error, { x, y, width, height }),
    );
    AccessibilityInfo.announceForAccessibility(error);
    if (!reduce) {
      shake.value = withSequence(
        ...[-6, 6, -4, 4, 0].map((x) => withTiming(x, { duration: 80, reduceMotion: ALWAYS })),
      );
    }
  }, [error, reduce, shake, tips]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  return { anchor, style, tips };
}

/** A speaker for any sound the card plays on a press; `quiet` steps a second one back from the term's. */
export function SpeakerButton({
  sound: { error, state, play },
  labels,
  quiet = false,
}: {
  sound: Pick<Pronunciation, "error" | "state" | "play">;
  labels: { play: string; replay: string };
  quiet?: boolean;
}) {
  const reduce = useReduceMotion();
  const p = usePalette();
  const { anchor, style, tips } = useSoundError(error);

  return (
    // Its box sits inside the text's line height, so the line never moves when it appears.
    <View className="-my-2">
      <Animated.View ref={anchor} style={style}>
        <IconButton
          icon="pronunciation"
          label={state === "playing" ? labels.replay : labels.play}
          variant={error ? "danger" : quiet ? "ghost" : "secondary"}
          size="sm"
          round
          // A miss reveals the card, so the speaker reaches 56 pt rather than the usual 44.
          reach={12}
          // A clip voiced before is preloaded, so a load here is speech being made.
          busy={state === "loading"}
          // A quiet speaker is a bare glyph in muted, a size down, so the term's stays the card's main one.
          glyph={(ink, size) => (
            <Speaker
              ink={quiet && !error ? p["ink-muted"] : ink}
              size={quiet ? size - 1 : size}
              playing={state === "playing" && !reduce}
            />
          )}
          onPress={() => {
            tips?.hide();
            play();
          }}
        />
      </Animated.View>
    </View>
  );
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
/** How dim a wave is between its turns of light. */
const WAVE_REST = 0.3;

/** How lit a wave is at `t` through the loop: full at its `peak`, falling away smoothly either side. */
function waveLight(t: number, peak: number) {
  "worklet";
  const apart = Math.abs(((t - peak + 1.5) % 1) - 0.5);
  return Math.exp(-((apart / 0.18) ** 2));
}

/** One wave, dimmed while the speaker plays and lit as its turn comes round; whole when it is still. */
function Wave({
  d,
  peak,
  clock,
  on,
}: {
  d: string;
  peak: number;
  clock: SharedValue<number>;
  on: SharedValue<number>;
}) {
  const props = useAnimatedProps(() => {
    const lit = WAVE_REST + (1 - WAVE_REST) * waveLight(clock.value, peak);
    return { strokeOpacity: 1 - on.value * (1 - lit) };
  });
  return <AnimatedPath d={d} animatedProps={props} />;
}

/**
 * Lucide's `volume-2`, whose waves light one after the other, outward, while the pronunciation
 * plays, as iOS's own speaker does, and settle back whole when it stops. motion.md "Review".
 */
function Speaker({ ink, size, playing }: { ink: string; size: number; playing: boolean }) {
  const clock = useSharedValue(0);
  const on = useSharedValue(0);
  useEffect(() => {
    if (playing) {
      clock.value = 0;
      clock.value = withRepeat(
        withTiming(1, timed(SPEAKER_WAVES.loop)),
        -1,
        false,
        undefined,
        ALWAYS,
      );
      on.value = withTiming(1, timed(SPEAKER_WAVES.start));
      return;
    }
    on.value = withTiming(0, timed(SPEAKER_WAVES.settle), (done) => {
      if (done) cancelAnimation(clock);
    });
  }, [playing, clock, on]);
  useEffect(() => () => cancelAnimation(clock), [clock]);
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={ink}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" />
      <Wave d="M16 9a5 5 0 0 1 0 6" peak={0.3} clock={clock} on={on} />
      <Wave d="M19.364 18.364a9 9 0 0 0 0-12.728" peak={0.55} clock={clock} on={on} />
    </Svg>
  );
}
