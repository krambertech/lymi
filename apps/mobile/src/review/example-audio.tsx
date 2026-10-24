import { useLingui } from "@lingui/react/macro";
import { api } from "@lymi/client/api";
import { canSpeakExample } from "@lymi/core";
import { fetch } from "expo/fetch";
import { File, Paths } from "expo-file-system";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Pressable } from "react-native";
import Animated from "react-native-reanimated";
import { useSessionHeaders } from "../auth/client";
import { captureEvent } from "../telemetry/posthog";
import { audio, type ExpoAudio, SpeakerButton, useSoundError } from "./pronounce";

/** Past this from a clip in hand to no sound, the play counts as failed. */
const START_LIMIT_MS = 12_000;

const EXTENSION: Record<string, string> = { "audio/wav": "wav", "audio/x-wav": "wav" };

type Card = {
  id: string;
  updatedAt?: Date | string | undefined;
  example?: string | null | undefined;
  language?: string | null | undefined;
};
/** Where it was pressed, for `example_audio_played`. */
type Surface = "review" | "card";

/**
 * Reads a card's example aloud on a press, never on its own. The clip is fetched with the session so
 * a spent daily allowance can be told from a failure, then played from the phone's cache.
 */
function useAudioExample(
  card: Card | null,
  surface: Surface,
  { useAudioPlayer, useAudioPlayerStatus }: ExpoAudio,
) {
  const { t } = useLingui();
  const headers = useSessionHeaders();
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [loading, setLoading] = useState(false);
  const [asked, setAsked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = card && canSpeakExample(card) ? api.exampleAudioUrl(card.id, card.updatedAt) : null;
  // The example on screen now, which a load that settles late checks before it plays.
  const shown = useRef(url);
  shown.current = url;
  const loaded = useRef<string | null>(null);
  // A screen closed mid-load has let its player go, so a late clip is dropped rather than loaded.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const pressed = useRef<{ at: number; kept: boolean }>({ at: 0, kept: false });

  const report = (outcome: "played" | "failed" | "limited") =>
    captureEvent("example_audio_played", {
      outcome,
      surface,
      ...(pressed.current.kept
        ? {}
        : { wait_ms: Math.min(60_000, Math.round(performance.now() - pressed.current.at)) }),
    });
  const reported = useRef(report);
  reported.current = report;

  // biome-ignore lint/correctness/useExhaustiveDependencies: a new example, or another card, stops the clip and starts quiet
  useEffect(() => {
    player.pause();
    loaded.current = null;
    setLoading(false);
    setAsked(false);
    setError(null);
  }, [url, player]);

  const playing = status.isLoaded && status.playing;
  useEffect(() => {
    if (!asked) return;
    if (playing) {
      setAsked(false);
      reported.current("played");
      return;
    }
    const timer = setTimeout(() => {
      setAsked(false);
      loaded.current = null;
      setError(t`Couldn’t play the example. Try again in a moment.`);
      reported.current("failed");
    }, START_LIMIT_MS);
    return () => clearTimeout(timer);
  }, [asked, playing, t]);

  if (!url || !headers || !card) return null;
  const cardId = card.id;

  // The learner left the screen or moved to another card while it loaded, so it never plays over them.
  const left = () => !mounted.current || shown.current !== url;
  const play = async () => {
    if (loading) return;
    setError(null);
    const kept = loaded.current === url;
    pressed.current = { at: performance.now(), kept };
    if (kept) {
      void player.seekTo(0);
      player.play();
      setAsked(true);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(url, { headers });
      if (response.status === 429) {
        if (left()) return;
        setLoading(false);
        setError(t`Today’s new example audio is used up. Examples you’ve played still play.`);
        report("limited");
        return;
      }
      if (!response.ok) throw new Error(`example audio ${response.status}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (left()) return;
      const type = response.headers.get("content-type")?.split(";")[0] ?? "";
      const file = new File(Paths.cache, `example-${cardId}.${EXTENSION[type] ?? "mp3"}`);
      file.write(bytes);
      player.replace({ uri: file.uri });
      loaded.current = url;
      player.play();
      setLoading(false);
      setAsked(true);
    } catch {
      if (left()) return;
      setLoading(false);
      setError(t`Couldn’t play the example. Try again in a moment.`);
      report("failed");
    }
  };

  const state: "idle" | "loading" | "playing" = playing
    ? "playing"
    : loading || asked
      ? "loading"
      : "idle";
  return { play: () => void play(), state, error };
}

const noExample = (_card: Card | null, _surface: Surface) => null;
const player = audio;
export const useExampleAudio = player
  ? (card: Card | null, surface: Surface) => useAudioExample(card, surface, player)
  : noExample;
export type ExampleAudio = NonNullable<ReturnType<typeof useAudioExample>>;

/** The example's speaker at the card page's row end: quieter than the term's. */
export function ExampleAudioButton({ sound }: { sound: ExampleAudio }) {
  const { t } = useLingui();
  return (
    <SpeakerButton
      sound={sound}
      labels={{ play: t`Play example`, replay: t`Replay example` }}
      quiet
    />
  );
}

/**
 * The example as its own play control in review: a tap reads it aloud, so the card carries no
 * second speaker. A hold still opens the card's menu, and VoiceOver plays it as the card's action.
 */
export function ExamplePress({
  sound,
  onLongPress,
  children,
}: {
  sound: ExampleAudio | null;
  onLongPress?: (() => void) | undefined;
  children: (state: ExampleAudio["state"]) => ReactNode;
}) {
  const { anchor, style, tips } = useSoundError(sound?.error ?? null);
  if (!sound) return children("idle");
  return (
    <Animated.View ref={anchor} style={style}>
      <Pressable
        accessible={false}
        onPress={() => {
          tips?.hide();
          sound.play();
        }}
        onLongPress={onLongPress}
        delayLongPress={400}
      >
        {children(sound.state)}
      </Pressable>
    </Animated.View>
  );
}
