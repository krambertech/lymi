import { useLingui } from "@lingui/react/macro";
import { canPlayExample } from "@lymi/core";
import { useEffect, useReducer, useRef } from "react";
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
 * The example's clip, for the address it was pressed for. A new address, from the next card or an
 * edit, reads as idle, so a load left behind never holds the button.
 */
export type ExampleClip =
  | { status: "idle" }
  | { status: "loading"; url: string }
  | { status: "playing"; url: string }
  /** Today's new example audio is used up. */
  | { status: "limited"; url: string }
  | { status: "failed"; url: string };

export type ExampleClipEvent =
  | { type: "load"; url: string }
  | { type: "play"; url: string }
  | { type: "stop"; url: string }
  | { type: "limit"; url: string }
  | { type: "fail"; url: string };

const IDLE: ExampleClip = { status: "idle" };

/**
 * A press for an address already loading changes nothing, and an answer for one address never
 * replaces another's load.
 */
export function exampleClip(state: ExampleClip, event: ExampleClipEvent): ExampleClip {
  const otherLoading = state.status === "loading" && state.url !== event.url;
  switch (event.type) {
    case "load":
      return state.status === "loading" && state.url === event.url
        ? state
        : { status: "loading", url: event.url };
    case "play":
      return otherLoading ? state : { status: "playing", url: event.url };
    case "stop":
      return state.status === "playing" && state.url === event.url ? IDLE : state;
    case "limit":
      return otherLoading ? state : { status: "limited", url: event.url };
    case "fail":
      return otherLoading ? state : { status: "failed", url: event.url };
  }
}

/** The clip as it stands for this address. */
export function clipFor(state: ExampleClip, url: string): ExampleClip {
  return state.status !== "idle" && state.url === url ? state : IDLE;
}

/**
 * Reads the card's example aloud on a press, making its clip the first time; it never plays on its
 * own. Null when the example cannot be spoken.
 */
export function useExampleAudio(card: SpokenCard, surface: Surface) {
  const { t } = useLingui();
  const played = useRef<Played | null>(null);
  const [clip, dispatch] = useReducer(exampleClip, IDLE);
  const url = api.exampleAudioUrl(card.id, card.updatedAt);
  const shownClip = clipFor(clip, url);
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
    if (shownClip.status === "loading") return;
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
        dispatch({ type: "load", url });
        const response = await fetch(url, { credentials: "include" });
        if (response.status === 429) {
          dispatch({ type: "limit", url });
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
        for (const done of ["ended", "pause"])
          audio.addEventListener(done, () => dispatch({ type: "stop", url }));
        played.current = { url, audio, objectUrl };
      }
      audio.currentTime = 0;
      await playAlone(audio);
      dispatch({ type: "play", url });
      report("played");
    } catch {
      dispatch({ type: "fail", url });
      report("failed");
    }
  };

  const state: "idle" | "loading" | "playing" =
    shownClip.status === "loading" || shownClip.status === "playing" ? shownClip.status : "idle";
  return {
    state,
    error:
      shownClip.status === "failed" ? t`Couldn’t play the example. Try again in a moment.` : null,
    limited:
      shownClip.status === "limited"
        ? t`Today’s new example audio is used up. Examples you’ve played still play.`
        : null,
    play: (control: Control = "speaker") => void play(control),
  };
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
