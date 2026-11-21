import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  DES_MATA_GAPS,
  DES_MATA_VERBS,
  MORNING_PASSAGE,
  objectGapSaid,
} from "../../../lib/learn/clips";
import { shuffle, shuffledRun } from "../../../lib/learn/quiz";
import { Panel } from "../Explore";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { type PassageQuestion, Reading } from "../Passage";
import { type GapItem, GapRound, Quiz } from "../Quiz";
import { Word } from "../Word";

const SLUG = "lugedes-lugemata";
const src = (text: string) => clipUrl(SLUG, clipId(text));

function Et({ children }: { children: ReactNode }) {
  return <span lang="et">{children}</span>;
}

const MEANS: Record<string, MessageDescriptor> = {
  lugema: msg`to read`,
  tulema: msg`to come`,
  tegema: msg`to do, to make`,
  sööma: msg`to eat`,
  minema: msg`to go`,
  ütlema: msg`to say`,
};

const GLOSSARY: Glossary = {
  jõudma: { en: msg`to arrive, to get to`, note: msg`Tööle jõudes, on getting to work.` },
  pahane: { en: msg`cross, annoyed` },
};

function FormTable() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = DES_MATA_VERBS.map((verb) => ({
    id: verb.ma,
    label: i18n._(MEANS[verb.ma] as MessageDescriptor),
    tip: (
      <Trans>
        <Et>{verb.da}</Et> gives <Et>{verb.des}</Et>, and <Et>{verb.ma}</Et> gives{" "}
        <Et>{verb.mata}</Et>.
      </Trans>
    ),
    cells: [
      { form: verb.da, src: src(verb.da) },
      { form: verb.des, src: src(verb.des) },
      { form: verb.ma, src: src(verb.ma) },
      { form: verb.mata, src: src(verb.mata) },
    ],
  }));
  return (
    <Panel className="gap-5">
      <Paradigm
        label={t`Verbs with their -des and -mata forms`}
        columns={[t`-da form`, t`While doing`, t`-ma form`, t`Without doing`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{
          title: t`Tap a form`,
          tip: (
            <Trans>
              <Et>-des</Et> comes from the <Et>-da</Et> form, and <Et>-mata</Et> from the{" "}
              <Et>-ma</Et> form.
            </Trans>
          ),
        }}
      />
    </Panel>
  );
}

const FORM_POOL = [...new Set(DES_MATA_GAPS.flatMap((gap) => gap.options))];

const oppositeOf = (answer: string, pair: readonly string[]) =>
  FORM_POOL.filter(
    (word) => !pair.includes(word) && word.endsWith("mata") !== answer.endsWith("mata"),
  );

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
    kind === "des" ? (
      <Trans>
        The two things happen at once, so it takes <Et>-des</Et>: <Et>{answer}</Et>.
      </Trans>
    ) : (
      <Trans>
        It didn’t happen, so it takes <Et>-mata</Et>, without: <Et>{answer}</Et>.
      </Trans>
    );
  const gaps: GapRun[] = DES_MATA_GAPS.map((gap, index) => {
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

  const morning: PassageQuestion[] = [
    {
      id: "breakfast",
      ask: t(msg`Did Kati have breakfast?`),
      options: [
        { id: "no", label: t(msg`No, she went to work without eating`) },
        { id: "home", label: t(msg`Yes, at home`) },
        { id: "bus", label: t(msg`Yes, on the bus`) },
      ],
      answer: "no",
      line: 0,
    },
    {
      id: "bus",
      ask: t(msg`What did she do on the bus?`),
      options: [
        { id: "slept", label: t(msg`Slept`) },
        { id: "news", label: t(msg`Read the news`) },
        { id: "called", label: t(msg`Called a friend on the phone`) },
      ],
      answer: "news",
      line: 1,
    },
    {
      id: "shop",
      ask: t(msg`What did she buy in the evening?`),
      options: [
        { id: "coffee", label: t(msg`Coffee and a cake`) },
        { id: "paper", label: t(msg`A newspaper and some flowers`) },
        { id: "bread", label: t(msg`Bread and cheese`) },
      ],
      answer: "bread",
      line: 3,
    },
  ];

  return { gaps, morning };
}

const withThird = (item: GapRun): GapRun => {
  const third = shuffle(oppositeOf(item.answer, item.pair))[0] as string;
  return { ...item, options: shuffle([...item.pair, third]) };
};

const gapRun = (items: readonly GapRun[], pinned?: GapRun): GapRun[] =>
  shuffledRun(items, pinned).map((item) => (item === pinned ? item : withThird(item)));

export function LugedesLugemataLesson() {
  const { t, i18n } = useLingui();
  const lesson = content((descriptor) => i18n._(descriptor));
  const forms = lessonBySlug("tegevusnimed")?.n;

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          <Et>Raamatut lugedes</Et>, while reading a book. <Et>Midagi ütlemata</Et>, without saying
          anything. Two forms that save you a whole sentence.
        </Trans>
      }
      facts={[
        <Trans key="m">10 minutes</Trans>,
        <Trans key="q">2 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["jõudma", "pahane"]}
      recap={[
        <Trans key="1">
          <b lang="et">-des</b>: take the <b lang="et">-da</b> form and change its last{" "}
          <b lang="et">a</b> to <b lang="et">es</b>: <b lang="et">lugeda, lugedes; tulla, tulles</b>
          .
        </Trans>,
        <Trans key="2">
          It means while or by doing, and the doer is the same as in the rest of the sentence:{" "}
          <b lang="et">Raamatut lugedes jäin ma magama.</b>
        </Trans>,
        <Trans key="3">
          <b lang="et">-mata</b>: take the <b lang="et">-ma</b> form and add <b lang="et">ta</b>:{" "}
          <b lang="et">söömata</b>, without eating.
        </Trans>,
      ]}
      sections={[
        {
          id: "forms",
          title: t`While doing, without doing`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Both forms come from the two verb forms of lesson {forms}. The <Et>-des</Et>{" "}
                    form says what else you are doing at the same time, like English “while
                    reading”. The <Et>-mata</Et> form says what you didn’t do, like “without
                    reading”.
                  </Trans>
                </p>
              </Prose>
              <FormTable />
              <Aside>
                <Trans>
                  <Et>-mata</Et> also says something is still not done: <Et>kiri on lugemata</Et>,
                  the letter is unread. Use <Et>-des</Et> only when the doer is the same:{" "}
                  <Et>kodust tulles ostsin ma leiba</Et>, I bought bread on my way from home.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "quiz",
          title: t`At the same time, or not at all?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Does it happen at the same time, or not at all? Pick the form, then hear the
                    sentence.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="des-or-mata"
                title={
                  <Trans>
                    <Et>-des</Et> or <Et>-mata</Et>?
                  </Trans>
                }
                items={lesson.gaps}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight. You can say while and without in one word.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Ask: is it happening too, or not happening?</Trans>
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
          id: "morning",
          title: t`Kati’s busy day`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kati writes about her day. Look for <Et>-des</Et> and <Et>-mata</Et>, and for{" "}
                    <Word w="jõudma" />, to get somewhere.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="kati-day"
                title={<Trans>What does Kati write?</Trans>}
                by={t`Kati writes`}
                clip="p-kati"
                sentences={MORNING_PASSAGE}
                questions={lesson.morning}
              />
            </>
          ),
        },
      ]}
    />
  );
}
