import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  FAMILY_JOBS_PASSAGE,
  objectGapSaid,
  VERB_NOUN_GAPS,
  VERB_NOUNS,
} from "../../../lib/learn/clips";
import { shuffle, shuffledRun } from "../../../lib/learn/quiz";
import { Panel } from "../Explore";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { type PassageQuestion, Reading } from "../Passage";
import { type GapItem, GapRound, Quiz } from "../Quiz";
import { Word } from "../Word";

const SLUG = "opetaja-lugemine";
const src = (text: string) => clipUrl(SLUG, clipId(text));

function Et({ children }: { children: ReactNode }) {
  return <span lang="et">{children}</span>;
}

const MEANS: Record<string, MessageDescriptor> = {
  õpetama: msg`to teach`,
  lugema: msg`to read`,
  laulma: msg`to sing`,
  ujuma: msg`to swim`,
  müüma: msg`to sell`,
  jooksma: msg`to run`,
};

const GLOSSARY: Glossary = {
  hobi: { en: msg`hobby` },
  tervislik: { en: msg`healthy, good for you` },
  koor: { en: msg`choir`, note: msg`Kooris, in a choir.` },
  lemmiksport: { en: msg`favourite sport` },
};

function NounTable() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = VERB_NOUNS.map((item) => {
    const stem = item.verb.slice(0, -2);
    return {
      id: item.verb,
      label: i18n._(MEANS[item.verb] as MessageDescriptor),
      tip: (
        <Trans>
          Drop <Et>-ma</Et> from <Et>{item.verb}</Et> and keep <Et>{stem}</Et>:{" "}
          <Et>{item.person}</Et>, <Et>{item.doing}</Et>.
        </Trans>
      ),
      cells: [
        { form: item.verb, src: src(item.verb) },
        { form: item.person, src: src(item.person) },
        { form: item.doing, src: src(item.doing) },
      ],
    };
  });
  return (
    <Panel className="gap-5">
      <Paradigm
        label={t`Verbs and the words made from them`}
        columns={[t`Verb`, t`Who does it`, t`Doing it`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{
          title: t`Tap a form`,
          tip: <Trans>The same stem gives the person and the activity.</Trans>,
        }}
      />
    </Panel>
  );
}

const NOUN_POOL = [...new Set(VERB_NOUN_GAPS.flatMap((gap) => gap.options))];

const oppositeOf = (answer: string, pair: readonly string[]) =>
  NOUN_POOL.filter((word) => !pair.includes(word) && word.endsWith("ja") !== answer.endsWith("ja"));

function firstOptions(pair: readonly string[], answer: string, index: number): string[] {
  const other = pair.find((word) => word !== answer) as string;
  const third = oppositeOf(answer, pair).at(index % 4) as string;
  const order = [answer, other, third];
  const turn = (index % 3) + 1;
  return [...order.slice(turn), ...order.slice(0, turn)];
}

type GapRun = GapItem & { id: string; said: string; pair: readonly string[] };

function content(t: (descriptor: MessageDescriptor) => string) {
  const why = (kind: string, answer: string): ReactNode =>
    kind === "ja" ? (
      <Trans>
        The sentence needs a person, so it takes <Et>-ja</Et>, and the meaning gives{" "}
        <Et>{answer}</Et>.
      </Trans>
    ) : (
      <Trans>
        The sentence needs the activity, so it takes <Et>-mine</Et>, and the meaning gives{" "}
        <Et>{answer}</Et>.
      </Trans>
    );
  const gaps: GapRun[] = VERB_NOUN_GAPS.map((gap, index) => {
    const said = objectGapSaid(gap);
    return {
      id: gap.id,
      said,
      src: src(said),
      before: gap.before,
      after: gap.after,
      pair: gap.options,
      options: firstOptions(gap.options, gap.answer, index),
      answer: gap.answer,
      explain: why(gap.id.split("-")[0] as string, gap.answer),
    };
  });

  const family: PassageQuestion[] = [
    {
      id: "father",
      ask: t(msg`What does Kati’s father do?`),
      options: [
        { id: "sells", label: t(msg`He sells things`) },
        { id: "teaches", label: t(msg`He teaches at a school`) },
        { id: "sings", label: t(msg`He sings in a choir`) },
      ],
      answer: "sells",
      line: 0,
    },
    {
      id: "choir",
      ask: t(msg`Who sings in a choir?`),
      options: [
        { id: "mother", label: t(msg`Her mother`) },
        { id: "brother", label: t(msg`Her brother`) },
        { id: "grandmother", label: t(msg`Her grandmother`) },
      ],
      answer: "brother",
      line: 1,
    },
    {
      id: "likes",
      ask: t(msg`What does Kati like most?`),
      options: [
        { id: "swim", label: t(msg`Swimming`) },
        { id: "run", label: t(msg`Singing`) },
        { id: "read", label: t(msg`Reading books`) },
      ],
      answer: "read",
      line: 3,
    },
  ];

  return { gaps, family };
}

const withThird = (item: GapRun): GapRun => {
  const third = shuffle(oppositeOf(item.answer, item.pair))[0] as string;
  return { ...item, options: shuffle([...item.pair, third]) };
};

const gapRun = (items: readonly GapRun[], pinned?: GapRun): GapRun[] =>
  shuffledRun(items, pinned).map((item) => (item === pinned ? item : withThird(item)));

export function OpetajaLugemineLesson() {
  const { t, i18n } = useLingui();
  const lesson = content((descriptor) => i18n._(descriptor));
  const maForm = lessonBySlug("tegevusnimed")?.n;

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          From one verb, two nouns: <Et>õpetama</Et> gives <Et>õpetaja</Et>, a teacher, and{" "}
          <Et>õpetamine</Et>, teaching.
        </Trans>
      }
      facts={[
        <Trans key="m">10 minutes</Trans>,
        <Trans key="q">2 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["hobi", "tervislik", "koor", "lemmiksport"]}
      recap={[
        <Trans key="1">
          Take the <Et>-ma</Et> form and drop <Et>-ma</Et>: <b lang="et">luge-ma</b> gives the stem{" "}
          <b lang="et">luge-</b>.
        </Trans>,
        <Trans key="2">
          Add <Et>-ja</Et>, usually for the person who does it: <b lang="et">lugeja</b>, a reader;{" "}
          <b lang="et">müüja</b>, a seller.
        </Trans>,
        <Trans key="3">
          Add <Et>-mine</Et> for the activity: <b lang="et">lugemine</b>, reading;{" "}
          <b lang="et">ujumine</b>, swimming.
        </Trans>,
        <Trans key="4">
          A <Et>-mine</Et> word changes like <b lang="et">inimene</b>:{" "}
          <b lang="et">ma armastan lugemist</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "stem",
          title: t`One stem, two nouns`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    You know the <Et>-ma</Et> form from lesson {maForm}. Drop <Et>-ma</Et> and you
                    have the stem. Add <Et>-ja</Et> and you get the person who does it, like English
                    -er: <Et>õpetaja</Et>, teacher. Add <Et>-mine</Et> and you get the activity,
                    like English -ing: <Et>õpetamine</Et>, teaching.
                  </Trans>
                </p>
              </Prose>
              <NounTable />
              <Aside>
                <Trans>
                  A <Et>-mine</Et> word changes like <Et>inimene</Et>, <Et>inimese</Et>,{" "}
                  <Et>inimest</Et>: <Et>lugemine</Et>, <Et>lugemise</Et>, <Et>lugemist</Et>. So you
                  say <Et>mulle meeldib lugemine</Et> but <Et>ma armastan lugemist</Et>:{" "}
                  <Et>meeldima</Et> takes the first form, <Et>armastama</Et> the third.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "quiz",
          title: t`Person or activity?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Does the sentence need the person or the activity? Pick the word, then hear the
                    sentence.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="ja-or-mine"
                title={
                  <Trans>
                    <Et>-ja</Et> or <Et>-mine</Et>?
                  </Trans>
                }
                items={lesson.gaps}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>
                      All eight. Here the person ends in <Et>-ja</Et> and the activity in{" "}
                      <Et>-mine</Et>.
                    </Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Ask: is it someone, or something you do?</Trans>
                  ) : (
                    <Trans>Look through the table once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: item.src })}
                order={gapRun}
                round={(props) => <GapRound {...props} listen="after" />}
              />
            </>
          ),
        },
        {
          id: "family",
          title: t`Kati’s family`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kati writes about what her family does. Look for the <Et>-ja</Et> and{" "}
                    <Et>-mine</Et> words, and the <Word w="hobi" /> she likes most.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="kati-family"
                title={<Trans>What does Kati write?</Trans>}
                by={t`Kati writes`}
                clip="p-kati"
                sentences={FAMILY_JOBS_PASSAGE}
                questions={lesson.family}
              />
            </>
          ),
        },
      ]}
    />
  );
}
