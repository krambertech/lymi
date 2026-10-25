import { useLingui } from "@lingui/react/macro";
import { canPlayExample } from "@lymi/core";
import { useEffect, useRef, useState } from "react";
import { api, type Card } from "../lib/api";
import { playAlone } from "../lib/now-playing";
import { captureAnalytics } from "../lib/telemetry";
import { AudioButton, AudioPlace } from "./audio-button";

type SpokenCard = Pick<Card, "id" | "example" | "language" | "updatedAt" | "exampleRecorded">;
/** Where it was pressed, for `example_audio_played`. */
type Surface = "review" | "card";
/** What was pressed: the speaker, or in review the sentence itself. */
type Control = "speaker" | "sentence";

type Played = { url: string; audio: HTMLAudioElement; objectUrl: string };

/**
 * Reads the card's example aloud on a press, making its clip the first time; it never plays on its
 * own. Null when the example cannot be spoken.
 */
export function useExampleAudio(card: SpokenCard, surface: Surface) {
  const { t } = useLingui();
  const played = useRef<Played | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const [error, setError] = useState<string | null>(null);
  const [limited, setLimited] = useState<string | null>(null);
  const url = api.exampleAudioUrl(card.id, card.updatedAt);
  // The example on screen now, which a load that settles late checks before it plays.
  const shown = useRef(url);
  shown.current = url;

  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new example, or leaving the card, stops the clip and lets it go
  useEffect(
    () => () => {
      const last = played.current;
      played.current = null;
      if (!last) return;
      last.audio.pause();
      URL.revokeObjectURL(last.objectUrl);
    },
    [url],
  );

  if (!canPlayExample(card)) return null;

  const play = async (control: Control) => {
    if (state === "loading") return;
    setError(null);
    setLimited(null);
    const pressed = performance.now();
    const waited = () => Math.min(60_000, Math.round(performance.now() - pressed));
    const kept = played.current?.url === url ? played.current : null;
    const report = (outcome: "played" | "failed" | "limited") =>
      captureAnalytics("example_audio_played", {
        outcome,
        surface,
        control,
        ...(kept ? {} : { wait_ms: waited() }),
      });
    try {
      let audio = kept?.audio;
      if (!audio) {
        setState("loading");
        const response = await fetch(url, { credentials: "include" });
        if (response.status === 429) {
          setState("idle");
          setLimited(t`Today’s new example audio is used up. Examples you’ve played still play.`);
          report("limited");
          return;
        }
        if (!response.ok) throw new Error(`example audio ${response.status}`);
        const objectUrl = URL.createObjectURL(await response.blob());
        // The learner moved on while it loaded, so it never plays over the next card.
        if (!mounted.current || shown.current !== url) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        audio = new Audio(objectUrl);
        // Ended, or paused because the term's clip started.
        for (const done of ["ended", "pause"]) audio.addEventListener(done, () => setState("idle"));
        played.current = { url, audio, objectUrl };
      }
      audio.currentTime = 0;
      await playAlone(audio);
      setState("playing");
      report("played");
    } catch {
      setState("idle");
      setError(t`Couldn’t play the example. Try again in a moment.`);
      report("failed");
    }
  };

  return { state, error, limited, play: (control: Control = "speaker") => void play(control) };
}

export type ExampleAudio = NonNullable<ReturnType<typeof useExampleAudio>>;

/** The example's speaker: a bare glyph, quieter than the term's. */
export function ExampleAudioButton({ sound }: { sound: ExampleAudio }) {
  const { t } = useLingui();
  return (
    <AudioButton
      state={sound.state}
      error={sound.error}
      unavailable={sound.limited}
      onPlay={() => sound.play()}
      labels={{ play: t`Play example`, replay: t`Replay example` }}
      quiet
    />
  );
}

/** The button's room in review's measuring copy, where the example can be played. */
export function ExamplePlace({ card }: { card: SpokenCard }) {
  return canPlayExample(card) ? <AudioPlace quiet /> : null;
}
