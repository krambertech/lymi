import { Trans, useLingui } from "@lingui/react/macro";
import { ArrowRight } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { answerWords, type MarkedAnswer, markAnswer } from "../../lib/learn/answers";
import { playSound } from "../../lib/learn/player";
import { realForms } from "../../lib/learn/sentences";
import { Button } from "../Button";
import {
  AlsoRight,
  OtherForm,
  PlaySentence,
  RightSentence,
  SentenceVerdict,
  SpokenDifferences,
  TypedSentence,
} from "./AnswerMarks";
import { LetterKeys, useLetters } from "./LetterKeys";
import { type Recall, type RoundProps, useAutoplay, useNudge } from "./Quiz";
import { SentenceField } from "./SentenceField";
import { Listen, ListenSlowly } from "./Sound";

interface Written {
  id: string;
  answers: readonly string[];
  confusable?: readonly string[];
  explain?: ReactNode;
}

export type SentenceItem =
  | (Written & { kind: "dictation"; src: string; word?: boolean })
  | (Written & { kind: "translate"; prompt: ReactNode; src?: string })
  | (Written & { kind: "rewrite"; from: string; cue: ReactNode; src?: string })
  | (Written & { kind: "ask"; reply: string; src?: string })
  | (Written & { kind: "build"; words: readonly string[]; cue?: ReactNode; src?: string });

export const markSentence = (item: SentenceItem, typed: string): MarkedAnswer =>
  markAnswer(typed, item.answers, realForms(item));

export const sentenceRecall = (item: SentenceItem): Recall => ({
  label: item.answers[0] ?? "",
  src: item.src,
});

function Cue({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <ArrowRight aria-hidden="true" className="size-4 text-ink-muted" strokeWidth={2.25} />
      <span className="rounded-full border border-edge-strong px-3 py-1 text-md font-medium">
        {children}
      </span>
    </span>
  );
}

function Task({ children }: { children: ReactNode }) {
  return <p className="text-sm text-ink-muted">{children}</p>;
}

const GIVEN = "min-w-0 text-2xl font-semibold tracking-tight";

function Prompt({ item, heard }: { item: SentenceItem; heard: () => void }) {
  switch (item.kind) {
    case "dictation":
      return (
        <>
          <Task>
            {item.word ? (
              <Trans>Write the word you hear.</Trans>
            ) : (
              <Trans>Write the sentence you hear.</Trans>
            )}
          </Task>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <Listen src={item.src} onPlay={heard} />
            <ListenSlowly src={item.src} onPlay={heard} />
          </div>
        </>
      );
    case "translate":
      return (
        <>
          <Task>
            <Trans>Write it in Estonian.</Trans>
          </Task>
          <p className={GIVEN}>{item.prompt}</p>
        </>
      );
    case "rewrite":
      return (
        <>
          <Task>
            <Trans>Rewrite the sentence.</Trans>
          </Task>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p lang="et" className={GIVEN}>
              {item.from}
            </p>
            <Cue>{item.cue}</Cue>
          </div>
        </>
      );
    case "ask":
      return (
        <>
          <Task>
            <Trans>Write the question this answers.</Trans>
          </Task>
          <p lang="et" className={GIVEN}>
            {item.reply}
          </p>
        </>
      );
    case "build":
      return (
        <>
          <Task>
            <Trans>Make a sentence from these words.</Trans>
          </Task>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p lang="et" className={GIVEN}>
              {item.words.join(" · ")}
            </p>
            {item.cue && <Cue>{item.cue}</Cue>}
          </div>
        </>
      );
  }
}

export function SentenceRound({ item, state, heard, answer, autoplay }: RoundProps<SentenceItem>) {
  const { t } = useLingui();
  const promptId = useId();
  const { nudge, note } = useNudge();
  const [value, setValue] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);
  const round = state.status === "asking" || state.status === "answered" ? state.round : -1;
  const dictation = item.kind === "dictation";
  useAutoplay(item.src ?? "", autoplay && dictation, round);
  // oxlint-disable react-hooks/exhaustive-deps -- each round, including a restart, opens once
  useEffect(() => {
    if (!dictation) heard();
    if (autoplay) field.current?.focus();
  }, [round, dictation]);
  // oxlint-enable react-hooks/exhaustive-deps
  const type = useLetters(field, value, setValue);
  const unheard = state.status === "asking" && !state.heard;
  const done = state.status === "answered";

  const submit = () => {
    if (done) return;
    if (answerWords(value).length === 0) return field.current?.focus();
    if (unheard) return nudge();
    const { verdict } = markSentence(item, value);
    answer(value, verdict !== "wrong", verdict === "almost");
    if (item.src) void playSound(item.src);
  };

  return (
    <>
      <div id={promptId} className="grid grid-cols-1 gap-1.5">
        <Prompt item={item} heard={heard} />
      </div>
      {unheard && note}
      {done ? (
        <SentenceResult item={item} typed={state.picked} />
      ) : (
        <form
          className="grid w-full grid-cols-1 gap-2.5"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <SentenceField
            ref={field}
            value={value}
            label={
              item.kind === "ask"
                ? t`Type the question`
                : item.kind === "dictation" && item.word
                  ? t`Type the word`
                  : t`Type the sentence`
            }
            describedBy={promptId}
            onChange={setValue}
            onEnter={submit}
          />
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <LetterKeys onLetter={type} />
            <Button type="submit" variant="primary" size="lg" className="ms-auto">
              <Trans>Check</Trans>
            </Button>
          </div>
        </form>
      )}
      <div aria-live="polite" className="sr-only">
        {done && <SpokenDifferences marked={markSentence(item, state.picked)} />}
      </div>
    </>
  );
}

export function SentenceResult({ item, typed }: { item: SentenceItem; typed: string }) {
  const marked = markSentence(item, typed);
  const src = item.kind === "dictation" ? undefined : item.src;
  const shownSrc = marked.accepted === item.answers[0] ? src : undefined;
  const word = item.kind === "dictation" && item.word === true;
  return (
    <div className="grid w-full grid-cols-1 gap-3">
      <div className="flex items-center gap-3">
        <span className="sr-only">
          <Trans>You wrote:</Trans>
        </span>
        <TypedSentence marked={marked} />
        {marked.verdict === "right" && shownSrc && (
          <PlaySentence src={shownSrc} sentence={marked.accepted} />
        )}
      </div>
      <SentenceVerdict marked={marked} word={word} />
      {marked.verdict !== "right" && <RightSentence marked={marked} src={shownSrc} word={word} />}
      <OtherForm marked={marked} />
      {item.explain && <p className="text-md text-ink-secondary">{item.explain}</p>}
      <AlsoRight marked={marked} accepted={item.answers} src={shownSrc ? undefined : src} />
    </div>
  );
}
