import { Trans, useLingui } from "@lingui/react/macro";
import { captureAnalytics } from "@lymi/client/analytics";
import { clsx } from "clsx";
import { ArrowRight, Check, Ear, MessageCircle, RotateCcw, X } from "lucide-react";
import {
  type ReactNode,
  type Ref,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { clipUrl } from "../../lib/learn/clips";
import {
  type DialogueState,
  pickReply,
  replyResults,
  sayReply,
  startDialogue,
} from "../../lib/learn/passage";
import { playInTurn, playSound, stopSound, usePlaying } from "../../lib/learn/player";
import { Button } from "../Button";
import { SectionContext, useLesson } from "./lesson-context";
import { Feedback, QuizCard, ResultDots } from "./Quiz";
import { PlayMark } from "./Sound";

export interface DialogueReply {
  /** What the learner says, in Estonian. */
  line: string;
  right?: boolean;
  /** Why a wrong reply is wrong, shown when it is picked. */
  why?: ReactNode;
}

/** A turn: the other speaker's line, or the learner's reply picked from a few. */
export type DialogueTurn =
  | { who: "them"; clip: string; line: string }
  | { who: "you"; clip: string; replies: readonly DialogueReply[] };

interface DialogueProps {
  /** For analytics: lowercase letters, digits and hyphens. */
  id: string;
  title: ReactNode;
  /** Who the learner plays, in a line: “You are Jaan, a doctor from Tartu.” */
  part: ReactNode;
  /** The other speaker's name in the reader's language, shown by their lines: “Mari”, “Марі”. */
  them: string;
  turns: readonly DialogueTurn[];
  /**
   * `shown`: the other speaker's lines arrive written and spoken. `sound`: they arrive as sound only,
   * each to read on request, for a harder dialogue later in the course.
   */
  text?: "shown" | "sound";
}

type Event =
  | { type: "start" }
  | { type: "pick"; reply: number }
  | { type: "say" }
  | { type: "restart" };

/**
 * Practise a conversation: the other speaker talks in their own voice, and at each of the
 * learner's turns they pick what to say back. A wrong pick says why; the right reply is then said
 * and the conversation runs on. No translations: the replies are the lesson's Estonian.
 */
export function Dialogue({ id, title, part, them, turns, text = "shown" }: DialogueProps) {
  const { t } = useLingui();
  const { slug, finishSection } = useLesson();
  const section = useContext(SectionContext);
  const [state, dispatch] = useReducer(
    (now: DialogueState | null, event: Event): DialogueState | null => {
      if (event.type === "restart") return null;
      if (event.type === "start") return startDialogue(turns);
      if (!now) return now;
      return event.type === "pick" ? pickReply(now, event.reply) : sayReply(turns, now);
    },
    null,
  );
  const src = (clip: string) => clipUrl(slug, clip);
  // Keyed by the dialogue too, so two dialogues with the same lines don't light up together.
  const key = (clip: string) => `dialogue:${slug}:${id}:${clip}`;
  const rightLine = (turn: Extract<DialogueTurn, { who: "you" }>) =>
    turn.replies.find((reply) => reply.right)?.line ?? "";
  const yours = turns.filter((turn) => turn.who === "you").length;
  const results = state ? replyResults(turns, state) : [];
  const finished = state !== null && state.shown >= turns.length;
  const right = results.filter((result) => result === true).length;
  const current = state && !finished ? turns[state.shown] : undefined;
  const picked = state && current ? state.picks[state.shown] : undefined;
  const replyRef = useRef<HTMLButtonElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const restarted = useRef(false);
  const endRef = useRef<HTMLParagraphElement>(null);

  /** The other speaker's lines from `from` up to the learner's next turn, played in order. */
  const theirLines = (from: number) => {
    const lines = [];
    for (let i = from; i < turns.length; i++) {
      const turn = turns[i];
      if (!turn || turn.who === "you") break;
      lines.push({ src: src(turn.clip), key: key(turn.clip) });
    }
    return lines;
  };

  // oxlint-disable react-hooks/exhaustive-deps -- reported once each time it ends
  useEffect(() => {
    if (!finished) return;
    endRef.current?.focus({ preventScroll: true });
    captureAnalytics("learn_quiz_finished", { lesson: slug, quiz: id, right, total: yours });
    if (section) finishSection(section);
  }, [finished]);
  // oxlint-enable react-hooks/exhaustive-deps
  // A new turn of the learner's takes the focus, so a keyboard answers straight on.
  const shown = state?.shown;
  // Try again takes its own button off the page, so focus goes back to Start.
  useEffect(() => {
    if (state === null && restarted.current) startRef.current?.focus({ preventScroll: true });
    restarted.current = false;
  }, [state]);
  useEffect(() => {
    if (shown !== undefined && shown > 0) replyRef.current?.focus({ preventScroll: true });
  }, [shown]);

  const say = () => {
    if (!state || !current || current.who !== "you") return;
    const at = state.shown;
    dispatch({ type: "say" });
    void playInTurn([{ src: src(current.clip), key: key(current.clip) }, ...theirLines(at + 1)]);
  };
  // A right reply is said by itself after a moment; a wrong one waits for Say it, so its reason can be read.
  const pickedRight =
    current?.who === "you" && picked !== undefined && current.replies[picked]?.right;
  // oxlint-disable react-hooks/exhaustive-deps -- runs once per right pick
  useEffect(() => {
    if (!pickedRight) return;
    const timer = setTimeout(say, 650);
    return () => clearTimeout(timer);
  }, [pickedRight, shown]);
  // oxlint-enable react-hooks/exhaustive-deps

  // What a screen reader hears: the other speaker's newest line, or the mark on a reply.
  const lastShown = state
    ? [...turns.slice(0, state.shown)].reverse().find((turn) => turn.who === "them")
    : undefined;
  const lastLine = lastShown?.who === "them" ? lastShown.line : "";
  const announcement =
    picked !== undefined && current?.who === "you"
      ? current.replies[picked]?.right
        ? t`Right.`
        : t`Not this one.`
      : !lastShown
        ? ""
        : text === "shown"
          ? `${them}: ${lastLine}`
          : t`${them} spoke.`;

  return (
    <QuizCard
      title={title}
      aside={
        state ? (
          <ResultDots
            results={results}
            now={finished ? -1 : results.indexOf(undefined)}
            total={yours}
          />
        ) : undefined
      }
    >
      <p className="flex items-start gap-2.5 text-md text-ink-secondary">
        <MessageCircle aria-hidden="true" className="mt-0.5 size-4.5 shrink-0 text-(--form)" />
        <span>{part}</span>
      </p>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {!state ? (
        <Button
          ref={startRef}
          variant="primary"
          onClick={() => {
            dispatch({ type: "start" });
            void playInTurn(theirLines(0));
          }}
        >
          <Trans>Start the conversation</Trans>
        </Button>
      ) : (
        <>
          <ol className="m-0 grid w-full list-none gap-3 p-0">
            {turns.slice(0, state.shown).map((turn, i) =>
              turn.who === "them" ? (
                // oxlint-disable-next-line react/no-array-index-key -- a dialogue's turns never reorder
                <li key={i}>
                  <TheirLine
                    name={them}
                    line={turn.line}
                    src={src(turn.clip)}
                    playKey={key(turn.clip)}
                    hidden={text === "sound"}
                  />
                </li>
              ) : (
                // oxlint-disable-next-line react/no-array-index-key -- a dialogue's turns never reorder
                <li key={i} className="grid">
                  <YourLine line={rightLine(turn)} src={src(turn.clip)} playKey={key(turn.clip)} />
                </li>
              ),
            )}
          </ol>
          {current?.who === "you" && (
            <div className="grid w-full gap-2.5 border-t border-edge pt-4">
              <fieldset className="m-0 grid min-w-0 gap-2 border-0 p-0">
                <legend className="mb-2.5 text-sm font-medium text-ink-muted">{t`Your reply`}</legend>
                {current.replies.map((reply, i) => (
                  <ReplyButton
                    // oxlint-disable-next-line react/no-array-index-key -- a turn's replies never reorder
                    key={i}
                    ref={i === 0 ? replyRef : undefined}
                    line={reply.line}
                    mark={
                      picked === undefined
                        ? undefined
                        : reply.right
                          ? "right"
                          : i === picked
                            ? "wrong"
                            : "out"
                    }
                    onPick={() => dispatch({ type: "pick", reply: i })}
                  />
                ))}
              </fieldset>
              {picked !== undefined && (
                <Feedback right={!!current.replies[picked]?.right}>
                  {current.replies[picked]?.why}
                </Feedback>
              )}
              {picked !== undefined && !current.replies[picked]?.right && (
                <div className="flex justify-end">
                  <Button variant="primary" onClick={say}>
                    <Trans context="dialogue: say the right reply and go on">Say it</Trans>
                    <ArrowRight aria-hidden="true" data-icon="inline-end" />
                  </Button>
                </div>
              )}
            </div>
          )}
          {finished && (
            <div className="grid w-full gap-3 border-t border-edge pt-4">
              <p ref={endRef} tabIndex={-1} className="text-xl font-semibold outline-none">
                <Trans>
                  {right} of {yours} replies right the first time
                </Trans>
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() =>
                    void playInTurn(
                      turns.map((turn) => ({ src: src(turn.clip), key: key(turn.clip) })),
                    )
                  }
                >
                  <Ear aria-hidden="true" data-icon="inline-start" />
                  <Trans>Hear the whole conversation</Trans>
                </Button>
                <Button
                  onClick={() => {
                    stopSound();
                    restarted.current = true;
                    dispatch({ type: "restart" });
                  }}
                >
                  <RotateCcw aria-hidden="true" data-icon="inline-start" />
                  <Trans>Try again</Trans>
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </QuizCard>
  );
}

function TheirLine({
  name,
  line,
  src,
  playKey,
  hidden,
}: {
  name: string;
  line: string;
  src: string;
  playKey: string;
  hidden: boolean;
}) {
  const { t } = useLingui();
  const playing = usePlaying(playKey);
  const [shown, setShown] = useState(!hidden);
  return (
    <div className="flex max-w-[88%] items-start gap-2.5">
      <span
        aria-hidden="true"
        className="mt-1.5 grid size-8 shrink-0 place-items-center rounded-full bg-(--tray) text-sm font-semibold text-(--form)"
      >
        {name.slice(0, 1)}
      </span>
      <div className="grid min-w-0 gap-1">
        <button
          type="button"
          aria-label={shown ? t`Play ${name}: ${line}` : t`Play what ${name} said`}
          onClick={() => void playSound(src, playKey)}
          className="flex cursor-pointer items-center gap-3 rounded-2xl rounded-ss-sm bg-plate-nested py-2 ps-2 pe-4 text-start"
        >
          <PlayMark playing={playing} />
          {shown ? (
            <span lang="et" className="text-lg font-medium">
              {line}
            </span>
          ) : (
            <SoundOnly seed={line.length} />
          )}
        </button>
        {!shown && (
          <button
            type="button"
            onClick={() => setShown(true)}
            className="cursor-pointer justify-self-start rounded-xs ps-1 text-sm font-medium text-(--form) underline-offset-2 hoverable:hover:underline"
          >
            {t`Show what ${name} said`}
          </button>
        )}
      </div>
    </div>
  );
}

/** Bars in place of words, as long as the line, for a line heard and not read. */
function SoundOnly({ seed }: { seed: number }) {
  const count = Math.min(28, Math.max(8, Math.round(seed / 1.6)));
  return (
    <span aria-hidden="true" className="flex h-6 items-center gap-[3px]">
      {Array.from({ length: count }, (_, i) => (
        <i
          // oxlint-disable-next-line react/no-array-index-key -- decorative bars
          key={i}
          className="block w-[3px] rounded-full bg-ink-faint"
          style={{ height: `${30 + ((i * 37 + seed * 11) % 70)}%` }}
        />
      ))}
    </span>
  );
}

function YourLine({ line, src, playKey }: { line: string; src: string; playKey: string }) {
  const { t } = useLingui();
  const playing = usePlaying(playKey);
  return (
    <button
      type="button"
      lang="et"
      aria-label={t`Play your line: ${line}`}
      onClick={() => void playSound(src, playKey)}
      className={clsx(
        "max-w-[80%] cursor-pointer justify-self-end rounded-2xl rounded-se-sm bg-(--form-soft) px-4 py-2.5 text-start text-lg font-medium transition-shadow duration-150",
        playing && "ring-2 ring-(--form)",
      )}
    >
      {line}
    </button>
  );
}

function ReplyButton({
  ref,
  line,
  mark,
  onPick,
}: {
  ref?: Ref<HTMLButtonElement> | undefined;
  line: string;
  mark: "right" | "wrong" | "out" | undefined;
  onPick: () => void;
}) {
  const { t } = useLingui();
  return (
    <button
      ref={ref}
      type="button"
      lang="et"
      onClick={() => mark === undefined && onPick()}
      aria-disabled={mark !== undefined || undefined}
      data-mark={mark === "right" || mark === "wrong" ? mark : undefined}
      className={clsx(
        "learn-answer relative flex min-h-12 w-full items-center rounded-tile border border-edge-strong bg-plate py-2.5 ps-4 pe-10 text-start text-lg font-medium transition-[background-color,border-color,opacity,scale] duration-150",
        mark === undefined
          ? "cursor-pointer active:scale-[0.99] hoverable:hover:bg-plate-hover"
          : "cursor-default",
        mark === "out" && "opacity-50",
      )}
    >
      {line}
      {(mark === "right" || mark === "wrong") && (
        <span
          role="img"
          aria-label={mark === "right" ? t`Right answer` : t`Your answer`}
          className={clsx(
            "absolute end-2.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full text-plate",
            mark === "right" ? "bg-success" : "bg-danger",
          )}
        >
          {mark === "right" ? (
            <Check aria-hidden="true" className="size-3" strokeWidth={3.2} />
          ) : (
            <X aria-hidden="true" className="size-3" strokeWidth={3.2} />
          )}
        </span>
      )}
    </button>
  );
}
