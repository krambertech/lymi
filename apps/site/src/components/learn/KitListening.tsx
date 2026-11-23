import { Trans, useLingui } from "@lingui/react/macro";
import type { ComponentType, ReactNode } from "react";
import { KIT_CONVERSATION } from "../../lib/learn/clips";
import type { PassageQuestion } from "../../lib/learn/questions";
import { Listening } from "./Passage";

function useQuestions() {
  const { t } = useLingui();
  const speakers = [
    { id: "jaan", label: t`Jaan` },
    { id: "mari", label: t`Mari` },
  ];
  const open: PassageQuestion[] = [
    {
      id: "friend",
      ask: t`Who is Mari?`,
      options: [
        { id: "sister", label: t`Jaan’s sister` },
        { id: "doctor", label: t`Jaan’s doctor` },
        { id: "friend", label: t`Jaan’s friend` },
      ],
      answer: "friend",
      line: 3,
    },
    { id: "jaan-tartu", kind: "truefalse", ask: t`Jaan lives in Tartu.`, answer: true, line: 1 },
    {
      id: "mari-doctor",
      kind: "truefalse",
      ask: t`Mari is a doctor.`,
      answer: false,
      line: 7,
    },
    {
      id: "brother",
      kind: "short",
      ask: t`What is the name of Mari’s brother?`,
      answers: ["Peeter"],
      line: 10,
    },
    {
      id: "town",
      kind: "short",
      ask: t`Which town does Mari live in? Write it as she says it.`,
      answers: ["Tallinnas", "Tallinn"],
      line: 8,
    },
    {
      id: "who",
      kind: "match",
      ask: t`Who says it?`,
      options: speakers,
      statements: [
        { id: "reads-a-lot", label: t`I read a lot.`, answer: "mari", line: 9 },
        { id: "doctor", label: t`I’m a doctor.`, answer: "jaan", line: 2 },
        { id: "book", label: t`I’m reading a book.`, answer: "jaan", line: 13 },
        {
          id: "brother-music",
          label: t`My brother listens to music.`,
          answer: "mari",
          line: 11,
        },
      ],
    },
  ];
  const exam: PassageQuestion[] = [
    { id: "jaan-job", kind: "truefalse", ask: t`Jaan is a teacher.`, answer: false, line: 2 },
    {
      id: "estonian",
      kind: "truefalse",
      ask: t`Jaan and Mari speak Estonian to each other.`,
      answer: true,
      line: 5,
    },
    {
      id: "listens",
      kind: "short",
      ask: t`What does Peeter listen to?`,
      answers: ["muusikat", "muusika"],
      line: 11,
    },
    {
      id: "where",
      kind: "match",
      ask: t`Who lives where?`,
      options: [
        { id: "tallinn", label: t`In Tallinn` },
        { id: "parnu", label: t`In Pärnu` },
        { id: "tartu", label: t`In Tartu` },
      ],
      statements: [
        { id: "jaan", label: t`Jaan`, answer: "tartu", line: 1 },
        { id: "mari", label: t`Mari`, answer: "tallinn", line: 8 },
      ],
    },
  ];
  return { open, exam };
}

export function KitListening({
  Part,
}: {
  Part: ComponentType<{ id: string; title: string; use: ReactNode; children: ReactNode }>;
}) {
  const { t } = useLingui();
  const questions = useQuestions();
  const names = { main: t`Jaan`, second: t`Mari` };
  return (
    <>
      <Part
        id="long-listening"
        title={t`A longer conversation`}
        use={
          <Trans>
            Listening with a conversation: who speaks when, sentence by sentence, five seconds back
            and a slower speed. Its questions are pick of three, true or false, one or two words,
            and matching.
          </Trans>
        }
      >
        <Listening
          id="kit-conversation"
          title={t`Listen: Jaan and Mari`}
          clip="c-jaan-mari"
          turns={KIT_CONVERSATION.turns}
          names={names}
          questions={questions.open}
        />
      </Part>
      <Part
        id="exam-listening"
        title={t`Listening, exam mode`}
        use={
          <Trans>
            The same recording as an exam plays it: twice, with no pausing or going back, and the
            questions to read first. No text after Check.
          </Trans>
        }
      >
        <Listening
          id="kit-exam"
          title={t`Listen: Jaan and Mari`}
          clip="c-jaan-mari"
          turns={KIT_CONVERSATION.turns}
          names={names}
          questions={questions.exam}
          plays={2}
        />
      </Part>
    </>
  );
}
