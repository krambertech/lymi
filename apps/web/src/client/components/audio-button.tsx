import { useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Clock, Loader2, Volume2 } from "lucide-react";
import { useAnimate } from "motion/react";
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
      <span ref={scope} className="ms-3 inline-flex h-[1lh] items-center align-top">
        <IconButton
          ref={button}
          label={
            state === "playing"
              ? (labels?.replay ?? t`Replay pronunciation`)
              : (labels?.play ?? t`Play pronunciation`)
          }
          size="sm"
          variant={error ? "danger" : quiet ? "ghost" : "secondary"}
          round
          // A miss reveals the card, so the speaker reaches 56 px rather than the usual 44.
          className={clsx("[--hit-x:-12px] before:-inset-y-3!", className)}
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
            <Volume2 aria-hidden="true" />
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

/** The button's room in a measuring copy, without a second live button. */
export function AudioPlace() {
  return (
    <span className="whitespace-nowrap">
      {"\u2060"}
      <span className="ms-3 inline-flex h-[1lh] items-center align-top">
        <span className="size-8" />
      </span>
    </span>
  );
}
