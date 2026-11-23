import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import type { ConversationTurn, LessonVoice } from "../../lib/learn/clips";
import {
  type ExamPlays,
  numberTurns,
  type SpeakerNames,
  speakerLanes,
  speakersOf,
} from "../../lib/learn/conversation";
import { sentenceAt } from "../../lib/learn/passage";
import { clock, onSentenceKey, type PassageControl, PlayPause, Sentence } from "./PassagePlayer";
import { Playing } from "./Sound";

const percent = (share: number) => `${Math.min(100, Math.max(0, share * 100))}%`;

const SKIP_SECONDS = 5;
const SPEEDS = [0.75, 1] as const;

interface ConversationProps {
  passage: PassageControl;
  turns: readonly ConversationTurn[];
  names: SpeakerNames;
}

export function ConversationPlayer({
  passage,
  turns,
  names,
  label,
}: ConversationProps & { label: string }) {
  const { t } = useLingui();
  const { timing } = passage;
  const { marks, duration } = timing;
  const speakers = speakersOf(turns);
  const lanes = speakerLanes(speakers, timing);
  const named = lanes.some(({ voice }) => names[voice]);
  const started = passage.t > 0 || passage.playing;
  const heard = started ? passage.t : 0;
  const speaking: LessonVoice | undefined = passage.playing ? speakers[passage.now] : undefined;
  const number = passage.current + 1;
  const count = marks.length;
  const time = clock(passage.t);
  const speaker = names[speakers[passage.current] ?? "main"];
  const seek = (event: MouseEvent) => {
    const box = event.currentTarget.getBoundingClientRect();
    const share = box.width === 0 ? 0 : (event.clientX - box.left) / box.width;
    void passage.play(marks[sentenceAt(marks, share * duration)] ?? 0);
  };
  return (
    <div className="grid w-full max-w-xl gap-3">
      <div className="flex items-center gap-4">
        <PlayPause passage={passage} />
        <div
          className={clsx(
            "grid min-w-0 flex-1 gap-x-3 gap-y-1.5",
            named ? "grid-cols-[auto_minmax(0,1fr)]" : "grid-cols-1",
          )}
        >
          {named && (
            <div aria-hidden="true" className="grid auto-rows-[1.5rem] gap-1">
              {lanes.map(({ voice }) => (
                <span
                  key={voice}
                  className={clsx(
                    "flex max-w-20 items-center text-sm font-medium transition-colors duration-150 sm:max-w-32",
                    speaking === voice ? "text-(--form)" : "text-ink-secondary",
                  )}
                >
                  <span className="truncate">{names[voice]}</span>
                </span>
              ))}
            </div>
          )}
          <div
            role="slider"
            tabIndex={0}
            aria-label={label}
            aria-valuemin={1}
            aria-valuemax={count}
            aria-valuenow={number}
            aria-valuetext={
              speaker
                ? t`Sentence ${number} of ${count}, ${speaker}, ${time}`
                : t`Sentence ${number} of ${count}, ${time}`
            }
            onKeyDown={(event) => onSentenceKey(event, passage)}
            onClick={seek}
            className={clsx(
              "relative grid cursor-pointer gap-1 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ring)",
              lanes.length > 1 ? "auto-rows-[1.5rem]" : "auto-rows-[2.75rem]",
            )}
          >
            {lanes.map(({ voice, pieces }) => (
              <span key={voice} aria-hidden="true" className="relative block">
                <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-edge" />
                {pieces.map(({ sentence, start, end }) => (
                  <span
                    key={sentence}
                    style={{
                      insetInlineStart: percent(start / duration),
                      width: `max(2px, calc(${percent((end - start) / duration)} - 2px))`,
                    }}
                    className="absolute top-1/2 h-3.5 -translate-y-1/2 overflow-hidden rounded-[4px] bg-ink-faint"
                  >
                    <span
                      style={{ width: percent((heard - start) / (end - start)) }}
                      className="absolute inset-y-0 start-0 bg-(--form)"
                    />
                  </span>
                ))}
              </span>
            ))}
            {started && (
              <span
                aria-hidden="true"
                style={{ insetInlineStart: percent(passage.t / duration) }}
                className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 rounded-full bg-ink"
              />
            )}
          </div>
          <div
            className={clsx(
              "flex justify-between text-sm text-ink-muted tabular-nums",
              named && "col-start-2",
            )}
          >
            <span>{time}</span>
            <span>{passage.loaded ? clock(duration) : ""}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          <Control label={t`Sentence before`} onPress={passage.previous}>
            <SkipBack aria-hidden="true" className="size-4 fill-current" />
          </Control>
          <Control
            label={t`Back 5 seconds`}
            onPress={() => void passage.play(Math.max(0, passage.t - SKIP_SECONDS))}
          >
            <RotateCcw aria-hidden="true" className="size-4" strokeWidth={2.25} />
            <span aria-hidden="true">
              <Trans>5 s</Trans>
            </span>
          </Control>
          <Control label={t`Next sentence`} onPress={passage.next}>
            <SkipForward aria-hidden="true" className="size-4 fill-current" />
          </Control>
        </div>
        <Speed passage={passage} />
      </div>
    </div>
  );
}

function Control({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="inline-flex h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink tabular-nums transition-[background-color,scale] duration-150 edge-lift bg-plate active:scale-[0.96] hoverable:hover:bg-plate-hover"
    >
      <span className="sr-only">{label}</span>
      {children}
    </button>
  );
}

function Speed({ passage }: { passage: PassageControl }) {
  const { t, i18n } = useLingui();
  return (
    <fieldset className="m-0 flex min-w-0 gap-0.5 rounded-full border-0 bg-plate-nested p-0.5">
      <legend className="sr-only">{t`Speed`}</legend>
      {SPEEDS.map((speed) => (
        <button
          key={speed}
          type="button"
          aria-pressed={passage.rate === speed}
          onClick={() => passage.setRate(speed)}
          className={clsx(
            "h-10 min-w-12 cursor-pointer rounded-full px-3 text-sm font-medium tabular-nums transition-[background-color,color] duration-150",
            passage.rate === speed
              ? "bg-(--form-soft) text-(--form)"
              : "text-ink-secondary hoverable:hover:text-ink",
          )}
        >
          {new Intl.NumberFormat(i18n.locale).format(speed)}×
        </button>
      ))}
    </fieldset>
  );
}

export function ConversationText({
  passage,
  turns,
  names,
  missed,
}: ConversationProps & { missed?: ReadonlySet<number> | undefined }) {
  return (
    <ol className="m-0 grid list-none gap-3.5 p-0">
      {numberTurns(turns).map(({ voice, sentences, first }) => {
        const playing = passage.now >= first && passage.now < first + sentences.length;
        const name = names[voice];
        return (
          <li key={first} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
            <TurnButton
              name={name}
              playing={playing}
              onPress={() =>
                playing ? passage.toggle() : void passage.play(passage.timing.marks[first] ?? 0)
              }
            />
            <div className="grid min-w-0 content-start gap-0.5 pt-1.5">
              {name && <p className="text-sm font-medium text-ink-muted">{name}</p>}
              <p lang="et" className="max-w-[46ch] text-xl/[1.6] text-ink max-sm:text-lg/[1.6]">
                {sentences.map((sentence, i) => (
                  <Sentence
                    // oxlint-disable-next-line react/no-array-index-key -- a turn's sentences never reorder
                    key={i}
                    text={sentence}
                    index={first + i}
                    passage={passage}
                    glossed
                    missed={missed}
                  />
                ))}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function TurnButton({
  name,
  playing,
  onPress,
}: {
  name: string | undefined;
  playing: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={clsx(
        "relative grid size-9 shrink-0 cursor-pointer place-items-center rounded-full transition-[background-color,color,scale] duration-150 before:absolute before:-inset-1 before:content-[''] active:scale-[0.94]",
        playing
          ? "bg-(--form) text-plate"
          : "edge-lift bg-plate text-ink hoverable:hover:bg-plate-hover",
      )}
    >
      <span className="sr-only">
        {playing ? (
          <Trans>Pause</Trans>
        ) : name ? (
          <Trans>Play from {name}’s turn</Trans>
        ) : (
          <Trans>Play from here</Trans>
        )}
      </span>
      {playing ? (
        <Pause aria-hidden="true" className="size-3.5 fill-current" />
      ) : (
        <Play aria-hidden="true" className="size-3.5 fill-current" />
      )}
    </button>
  );
}

export function ExamPlayer({
  passage,
  exam,
  plays,
  onPlay,
}: {
  passage: PassageControl;
  exam: ExamPlays;
  plays: number;
  onPlay: () => void;
}) {
  const { t } = useLingui();
  const { duration } = passage.timing;
  const playing = exam.status === "playing";
  const over = exam.status === "ready" && exam.left === 0;
  const at = exam.status === "ready" ? 0 : passage.t;
  return (
    <div className="grid w-full max-w-xl gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={onPlay}
          aria-disabled={playing || over || undefined}
          className={clsx(
            "inline-flex h-14 items-center gap-3 rounded-full ps-2 pe-5 text-md font-medium transition-[background-color,scale] duration-150 edge-lift bg-plate text-ink",
            playing || over
              ? "cursor-default"
              : "cursor-pointer active:scale-[0.97] hoverable:hover:bg-plate-hover",
            over && "opacity-50",
          )}
        >
          <span
            className={clsx(
              "grid size-10 place-items-center rounded-full bg-(--form) text-plate transition-shadow duration-200",
              playing && "shadow-[0_0_0_4px_var(--form-faint)]",
            )}
          >
            {playing ? (
              <Playing />
            ) : (
              <Play aria-hidden="true" className="ms-0.5 size-4 fill-current" />
            )}
          </span>
          {playing
            ? t`Playing`
            : exam.status === "cut"
              ? t`Continue`
              : over || exam.left === plays
                ? t`Play`
                : t`Play again`}
        </button>
        <p aria-live="polite" className="text-sm font-medium text-ink-secondary tabular-nums">
          <Plural value={exam.left} _0="No plays left" one="# play left" other="# plays left" />
        </p>
      </div>
      <div aria-hidden="true" className="grid gap-1">
        <span className="relative block h-1.5 overflow-hidden rounded-full bg-edge">
          <span
            style={{ width: passage.loaded ? percent(at / duration) : "0%" }}
            className="absolute inset-y-0 start-0 rounded-full bg-(--form)"
          />
        </span>
        <span className="flex justify-between text-sm text-ink-muted tabular-nums">
          <span>{clock(at)}</span>
          <span>{passage.loaded ? clock(duration) : ""}</span>
        </span>
      </div>
    </div>
  );
}
