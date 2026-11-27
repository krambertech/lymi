import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Pause, Play, Turtle } from "lucide-react";
import type { ReactNode } from "react";
import { slowKey, toggleSlowly, toggleSound, usePlaying } from "../../lib/learn/player";

/** Three bars that move while a sound plays. */
export function Playing({ className }: { className?: string | undefined }) {
  return (
    <span aria-hidden="true" className={clsx("learn-eq", className)}>
      <i />
      <i />
      <i />
    </span>
  );
}

interface PlayProps {
  src: string;
  /**
   * What it plays, for a screen reader: “Play kõrv”. Give a node when the Estonian in it needs its
   * own `lang`, such as a sentence.
   */
  label: ReactNode;
  className?: string | undefined;
}

/** The round button that plays one clip. While it plays, its triangle becomes moving bars. */
export function PlayButton({ src, label, className }: PlayProps) {
  const playing = usePlaying(src);
  return (
    <button
      type="button"
      aria-label={typeof label === "string" ? label : undefined}
      aria-pressed={playing}
      onClick={() => void toggleSound(src)}
      className={clsx(
        "relative grid size-9 shrink-0 cursor-pointer place-items-center rounded-full transition-[background-color,color,scale] duration-150 active:scale-[0.94]",
        playing
          ? "learn-ring bg-(--form) text-plate"
          : "edge-lift bg-plate text-ink hoverable:hover:bg-plate-hover",
        className,
      )}
    >
      {typeof label === "string" ? null : <span className="sr-only">{label}</span>}
      {playing ? <Playing /> : <Play aria-hidden="true" className="size-3.5 fill-current" />}
    </button>
  );
}

/** The mark inside a row or key that plays: a still triangle, or moving bars while it plays. */
export function PlayMark({ playing }: { playing: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "relative grid size-9 shrink-0 place-items-center rounded-full transition-colors duration-150",
        playing ? "learn-ring bg-(--form) text-plate" : "edge-lift bg-plate text-ink",
      )}
    >
      {playing ? <Playing /> : <Play className="size-3.5 fill-current" />}
    </span>
  );
}

interface ListenProps {
  src: string;
  onPlay?: (() => void) | undefined;
  children?: ReactNode;
}

/** The one sound a quiz round asks about. Bigger than a play button, with its own label. */
export function Listen({ src, onPlay, children }: ListenProps) {
  const { t } = useLingui();
  const playing = usePlaying(src);
  return (
    <button
      type="button"
      aria-pressed={playing}
      onClick={() => {
        onPlay?.();
        void toggleSound(src);
      }}
      className="edge-lift inline-flex h-14 cursor-pointer items-center gap-3 rounded-full bg-plate ps-2 pe-5 text-md font-medium text-ink transition-[background-color,scale] duration-150 active:scale-[0.97] hoverable:hover:bg-plate-hover"
    >
      <span
        className={clsx(
          "grid size-10 place-items-center rounded-full bg-(--form) text-plate transition-shadow duration-200",
          playing && "shadow-[0_0_0_4px_var(--form-faint)]",
        )}
      >
        {playing ? (
          <Pause aria-hidden="true" className="size-4 fill-current" />
        ) : (
          <Play aria-hidden="true" className="size-4 fill-current" />
        )}
      </span>
      {children ?? t`Listen`}
    </button>
  );
}

interface ListenSlowlyProps {
  src: string;
  onPlay?: (() => void) | undefined;
}

export function ListenSlowly({ src, onPlay }: ListenSlowlyProps) {
  const playing = usePlaying(slowKey(src));
  return (
    <button
      type="button"
      aria-pressed={playing}
      onClick={() => {
        onPlay?.();
        void toggleSlowly(src);
      }}
      className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-3.5 text-md font-medium text-(--form) transition-[background-color,scale] duration-150 active:scale-[0.97] hoverable:hover:bg-(--form-soft)"
    >
      <span className="grid w-5 place-items-center">
        {playing ? <Playing /> : <Turtle aria-hidden="true" className="size-5" />}
      </span>
      <Trans>Slower</Trans>
    </button>
  );
}
