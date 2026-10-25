import { useLingui } from "@lingui/react/macro";
import { SPEAKER_WAVES } from "@lymi/design";
import { clsx } from "clsx";
import { Clock, Loader2 } from "lucide-react";
import { motion, useAnimate } from "motion/react";
import { useEffect, useRef } from "react";
import { useReduceMotion } from "../lib/use-reduce-motion";
import { IconButton } from "./button";
import { ErrorTip } from "./error-tip";

interface AudioButtonProps {
  state: "idle" | "loading" | "playing";
  error: string | null;
  onPlay: () => void;
  className?: string | undefined;
  /** Its names, the term's speaker's when left out. */
  labels?: { play: string; replay: string } | undefined;
  /** A second speaker on the card, such as the example's, steps back from the term's. */
  quiet?: boolean | undefined;
  /** Why it cannot play just now, said in a calm tip that leaves the button as it was. */
  unavailable?: string | null | undefined;
}

/**
 * Pronunciation, at the end of the word. A failure turns the button red, shakes it once and says
 * why in a tip over it; the button stays red until the next try.
 *
 * The word joiner keeps the button on the line with the word's last letters, and the line-tall box
 * centres it on that line. Its name is in the app language, not the card's.
 */
export function AudioButton({
  state,
  error,
  onPlay,
  className,
  labels,
  quiet,
  unavailable,
}: AudioButtonProps) {
  const { t, i18n } = useLingui();
  const button = useRef<HTMLButtonElement>(null);
  const [scope, animate] = useAnimate<HTMLSpanElement>();
  const reduce = useReduceMotion();
  const shaken = useRef(error);

  // Shake once per new failure, never for an error the button was drawn with.
  useEffect(() => {
    if (error === shaken.current) return;
    shaken.current = error;
    if (!error || reduce || !scope.current) return;
    animate(scope.current, { x: [0, -4, 4, -3, 3, -1, 0] }, { duration: 0.4, ease: "easeInOut" });
  }, [error, reduce, animate, scope]);

  return (
    <span className="whitespace-nowrap" lang={i18n.locale}>
      {"\u2060"}
      <span ref={scope} className={quiet ? ON_LETTERS : ON_LINE}>
        <IconButton
          ref={button}
          label={
            state === "playing"
              ? (labels?.replay ?? t`Replay pronunciation`)
              : (labels?.play ?? t`Play pronunciation`)
          }
          size={quiet ? "xs" : "sm"}
          variant={error ? "danger" : quiet ? "ghost" : "secondary"}
          round
          className={clsx(
            quiet
              ? // A bare glyph in muted, a size down, so the term's speaker stays the card's main one.
                [
                  "absolute! start-0 top-[calc(-0.35em-12px)]",
                  !error && "text-muted! hoverable:hover:text-text!",
                ]
              : // A miss reveals the card, so the speaker reaches 56 px rather than the usual 44.
                "[--hit-x:-12px] before:-inset-y-3!",
            className,
          )}
          aria-disabled={state === "loading"}
          // The review lets the grade keys through from here, since a click leaves focus on it.
          data-audio=""
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
        >
          {/* A clip voiced before is preloaded, so a load here is speech being made. */}
          {state === "loading" ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Speaker playing={state === "playing" && !reduce} />
          )}
        </IconButton>
      </span>
      <ErrorTip
        anchor={button}
        message={error ?? unavailable ?? null}
        reason={!error && unavailable ? Clock : undefined}
      />
    </span>
  );
}

/** Centres a 32 px speaker on its line, after the word it follows. */
const ON_LINE = "ms-3 inline-flex h-[1lh] items-center align-top";
/**
 * Hangs a 24 px speaker from the baseline, centred on the letters rather than the line box, so
 * readings drawn over the line never lift it.
 */
const ON_LETTERS = "relative ms-2 inline-block h-0 w-6 align-baseline";

/** The button's room in a measuring copy, without a second live button. */
export function AudioPlace({ quiet }: Pick<AudioButtonProps, "quiet">) {
  return (
    <span className="whitespace-nowrap">
      {"\u2060"}
      {quiet ? (
        <span className={ON_LETTERS} />
      ) : (
        <span className={ON_LINE}>
          <span className="size-8" />
        </span>
      )}
    </span>
  );
}

/** How dim a wave is between its turns of light, as on the phone's speaker. */
const WAVE_REST = 0.3;
const WAVE_STEPS = 24;

/** A wave's opacity through one loop: full at its `peak`, falling away smoothly either side. */
function waveLoop(peak: number) {
  return Array.from({ length: WAVE_STEPS + 1 }, (_, step) => {
    const apart = Math.abs(((step / WAVE_STEPS - peak + 1.5) % 1) - 0.5);
    return WAVE_REST + (1 - WAVE_REST) * Math.exp(-((apart / 0.18) ** 2));
  });
}
const WAVES = [
  { d: "M16 9a5 5 0 0 1 0 6", loop: waveLoop(0.3) },
  { d: "M19.364 18.364a9 9 0 0 0 0-12.728", loop: waveLoop(0.55) },
];

/**
 * Lucide's `volume-2`, whose waves light one after the other, outward, while it plays, and settle
 * back whole when it stops. motion.md "Review".
 */
function Speaker({ playing }: { playing: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" />
      {WAVES.map((wave) => (
        <motion.path
          key={wave.d}
          d={wave.d}
          initial={false}
          animate={{ strokeOpacity: playing ? wave.loop : 1 }}
          transition={playing ? { ...SPEAKER_WAVES.loop, repeat: Infinity } : SPEAKER_WAVES.settle}
        />
      ))}
    </svg>
  );
}
