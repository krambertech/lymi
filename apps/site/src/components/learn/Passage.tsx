import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useReducer, useState } from "react";
import type { ConversationTurn } from "../../lib/learn/clips";
import {
  examReducer,
  type SpeakerNames,
  speakersOf,
  startExam,
} from "../../lib/learn/conversation";
import { stopSound } from "../../lib/learn/player";
import type { PassageQuestion } from "../../lib/learn/questions";
import { ConversationPlayer, ConversationText, ExamPlayer } from "./ConversationPlayer";
import { type PassageControl, PassagePlayer, PassageText, usePassage } from "./PassagePlayer";
import { PassageQuestions } from "./PassageQuestions";

export type { PassageQuestion } from "../../lib/learn/questions";
export { PassageQuestions } from "./PassageQuestions";

interface PartProps {
  id: string;
  title: ReactNode;
  clip: string;
  questions: readonly PassageQuestion[];
}

interface PassagePartProps extends PartProps {
  sentences: readonly string[];
}

interface ConversationPartProps extends PartProps {
  turns: readonly ConversationTurn[];
  names?: SpeakerNames;
}

type ListeningProps = (PassagePartProps | ConversationPartProps) & { plays?: number };

export function Listening(props: ListeningProps) {
  const sentences = "turns" in props ? speakersOf(props.turns).length : props.sentences.length;
  const passage = usePassage(props.clip, sentences);
  return props.plays === undefined ? (
    <OpenListening {...props} passage={passage} />
  ) : (
    <ExamListening {...props} passage={passage} plays={props.plays} />
  );
}

function OpenListening({ passage, ...props }: ListeningProps & { passage: PassageControl }) {
  const { t } = useLingui();
  const { id, title, questions } = props;
  return (
    <PassageQuestions
      id={id}
      title={title}
      questions={questions}
      wait={passage.heard ? null : t`Listen first.`}
      top={
        <>
          <p className="text-md text-ink-secondary">
            <Trans>Listen as many times as you like, then answer.</Trans>
          </p>
          {"turns" in props ? (
            <ConversationPlayer
              passage={passage}
              turns={props.turns}
              names={props.names ?? {}}
              label={t`The conversation`}
            />
          ) : (
            <PassagePlayer passage={passage} label={t`The passage`} />
          )}
        </>
      }
      after={(missed) => (
        <div className="grid w-full gap-2 border-t border-edge pt-4">
          <p className="text-sm font-medium text-ink-muted">
            {missed.size > 0 ? (
              <Trans>What you heard. The sentences that held a missed answer are underlined.</Trans>
            ) : (
              <Trans>What you heard</Trans>
            )}
          </p>
          {"turns" in props ? (
            <ConversationText
              passage={passage}
              turns={props.turns}
              names={props.names ?? {}}
              missed={missed}
            />
          ) : (
            <PassageText sentences={props.sentences} passage={passage} glossed missed={missed} />
          )}
        </div>
      )}
    />
  );
}

function ExamListening({
  id,
  title,
  questions,
  plays,
  passage,
}: PartProps & { plays: number; passage: PassageControl }) {
  const { t } = useLingui();
  const [exam, send] = useReducer(examReducer, plays, startExam);
  const [checked, setChecked] = useState(false);
  const play = async () => {
    if (exam.status === "playing" || (exam.status === "ready" && exam.left === 0)) return;
    send({ type: "started" });
    const { end, at } = await passage.play(exam.status === "cut" ? exam.at : 0);
    send(end === "ended" ? { type: "ended" } : { type: "cut", at });
  };
  return (
    <PassageQuestions
      id={id}
      title={title}
      questions={questions}
      wait={passage.heard ? null : t`Listen first.`}
      top={
        checked ? undefined : (
          <>
            <p className="text-md text-ink-secondary">
              <Plural
                value={plays}
                one="Read the questions first. You can play the recording once, without pausing or going back."
                other="Read the questions first. You can play the recording # times, without pausing or going back."
              />
            </p>
            <ExamPlayer passage={passage} exam={exam} plays={plays} onPlay={() => void play()} />
          </>
        )
      }
      onChecked={(now) => {
        setChecked(now);
        if (now) stopSound();
        else send({ type: "restarted", plays });
      }}
    />
  );
}

export function Reading({
  id,
  title,
  clip,
  sentences,
  questions,
  by,
}: Omit<PassagePartProps, "clip"> & {
  clip?: string;
  by?: ReactNode;
}) {
  const [checked, setChecked] = useState(false);
  return (
    <div className="grid gap-5">
      <div className="grid gap-3">
        {by && <p className="text-sm font-medium text-ink-muted">{by}</p>}
        {clip ? (
          <ReadingText clip={clip} sentences={sentences} glossed={checked} />
        ) : (
          <PassageText sentences={sentences} glossed={checked} big />
        )}
        <p className="text-sm text-ink-muted">
          {checked ? (
            <Trans>Words in colour open their meaning.</Trans>
          ) : (
            <Trans>Word meanings open once you have answered.</Trans>
          )}
        </p>
      </div>
      <PassageQuestions id={id} title={title} questions={questions} onChecked={setChecked} />
    </div>
  );
}

function ReadingText({
  clip,
  sentences,
  glossed,
}: {
  clip: string;
  sentences: readonly string[];
  glossed: boolean;
}) {
  const { t } = useLingui();
  const passage = usePassage(clip, sentences.length);
  return (
    <>
      <PassageText sentences={sentences} passage={passage} glossed={glossed} big />
      <div className="pt-1">
        <PassagePlayer passage={passage} label={t`Hear it read`} />
      </div>
    </>
  );
}
