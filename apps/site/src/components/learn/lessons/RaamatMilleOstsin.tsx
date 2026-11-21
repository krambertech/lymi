import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { ReactNode } from "react";
import {
  clipId,
  clipUrl,
  NEIGHBOURHOOD_PASSAGE,
  objectGapSaid,
  RELATIVE_FORMS,
  RELATIVE_GAPS,
} from "../../../lib/learn/clips";
import { shuffle, shuffledRun } from "../../../lib/learn/quiz";
import { Panel } from "../Explore";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { type PassageQuestion, Reading } from "../Passage";
import { type GapItem, GapRound, Quiz } from "../Quiz";
import { Word } from "../Word";

const SLUG = "raamat-mille-ostsin";
const src = (text: string) => clipUrl(SLUG, clipId(text));

type Role = (typeof RELATIVE_FORMS)[number]["id"];

function Et({ children }: { children: ReactNode }) {
  return <span lang="et">{children}</span>;
}

const ROLES: Record<Role, MessageDescriptor> = {
  subject: msg`The one who does it`,
  partitive: msg`The object (part)`,
  with: msg`With someone or something`,
  to: msg`To someone or something`,
  in: msg`In something`,
};

const GLOSSARY: Glossary = {
  asuma: {
    en: msg`to be located`,
    note: msg`Kool asub pargi kõrval, the school is next to the park.`,
  },
  kunagi: { en: msg`once, at one time` },
  meremees: { en: msg`sailor` },
};

function RelativeTable() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = RELATIVE_FORMS.map((row) => ({
    id: row.id,
    label: i18n._(ROLES[row.id]),
    tip: (
      <Trans>
        Where you would say <Et>{row.ta}</Et>, say <Et>{row.person}</Et> for a person and{" "}
        <Et>{row.thing}</Et> for a thing.
      </Trans>
    ),
    cells: [
      { form: row.ta, src: src(row.ta) },
      { form: row.person, src: src(row.person) },
      { form: row.thing, src: src(row.thing) },
    ],
  }));
  return (
    <Panel className="gap-5">
      <Paradigm
        label={t`Who and which in each case`}
        columns={[t`He or she`, t`For a person`, t`For a thing`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{
          title: t`Tap a form`,
          tip: <Trans>Each row below the first has the same ending three times.</Trans>,
        }}
      />
    </Panel>
  );
}

const isPerson = (word: string) => word.startsWith("ke");

const crossOf = (answer: string) =>
  RELATIVE_FORMS.filter((row) => row.person !== answer && row.thing !== answer).map((row) =>
    isPerson(answer) ? row.thing : row.person,
  );

function firstOptions(pair: readonly string[], answer: string, index: number): string[] {
  const other = pair.find((word) => word !== answer) as string;
  const third = crossOf(answer).at(index % 4) as string;
  const order = [answer, other, third];
  const turn = (index % 3) + 1;
  return [...order.slice(turn), ...order.slice(0, turn)];
}

type GapRun = GapItem & {
  id: string;
  said: string;
  pair: readonly string[];
};

function content(t: (descriptor: MessageDescriptor) => string) {
  const why = (answer: string): ReactNode =>
    isPerson(answer) ? (
      <Trans>
        It is about a person, so it starts with <Et>ke-</Et>, and the clause needs <Et>{answer}</Et>
        .
      </Trans>
    ) : (
      <Trans>
        It is about a thing, so it starts with <Et>mi-</Et>, and the clause needs <Et>{answer}</Et>.
      </Trans>
    );
  const gaps: GapRun[] = RELATIVE_GAPS.map((gap, index) => {
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
      explain: why(gap.answer),
    };
  });

  const street: PassageQuestion[] = [
    {
      id: "house",
      ask: t(msg`Where is Kati’s house?`),
      options: [
        { id: "sea", label: t(msg`By the sea, far from town`) },
        { id: "old", label: t(msg`Near the old town`) },
        { id: "centre", label: t(msg`Next to the bus station`) },
      ],
      answer: "old",
      line: 0,
    },
    {
      id: "neighbour",
      ask: t(msg`Who is her neighbour?`),
      options: [
        { id: "sailor", label: t(msg`An old man who was once a sailor`) },
        { id: "teacher", label: t(msg`A young teacher who lives upstairs`) },
        { id: "cook", label: t(msg`A woman who works in a café`) },
      ],
      answer: "sailor",
      line: 1,
    },
    {
      id: "cafe",
      ask: t(msg`Who works at the café they often go to?`),
      options: [
        { id: "sister", label: t(msg`Kati’s sister`) },
        { id: "neighbour", label: t(msg`The neighbour’s grandson`) },
        { id: "school", label: t(msg`A girl Kati went to school with`) },
      ],
      answer: "school",
      line: 3,
    },
  ];

  return { gaps, street };
}

const withThird = (item: GapRun): GapRun => {
  const third = shuffle(crossOf(item.answer))[0] as string;
  return { ...item, options: shuffle([...item.pair, third]) };
};

const gapRun = (items: readonly GapRun[], pinned?: GapRun): GapRun[] =>
  shuffledRun(items, pinned).map((item) => (item === pinned ? item : withThird(item)));

export function RaamatMilleOstsinLesson() {
  const { t, i18n } = useLingui();
  const lesson = content((descriptor) => i18n._(descriptor));

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          <Et>Mees, kes seal seisab</Et>, the man who is standing there.{" "}
          <Et>Film, mida me vaatasime</Et>, the film we watched. Who and which, in the case the
          clause needs.
        </Trans>
      }
      facts={[
        <Trans key="m">10 minutes</Trans>,
        <Trans key="q">2 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["asuma", "kunagi", "meremees"]}
      recap={[
        <Trans key="1">
          <b lang="et">kes</b> for people, <b lang="et">mis</b> for things, with a comma before:{" "}
          <b lang="et">mees, kes seal seisab</b>.
        </Trans>,
        <Trans key="2">
          They take the case the clause needs, with the same ending as <b lang="et">tema</b>:{" "}
          <b lang="et">teda, keda; temaga, kellega</b>.
        </Trans>,
        <Trans key="3">
          For a place you can use <b lang="et">kus</b>: <b lang="et">kohvik, kus me käime</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "forms",
          title: t`Who and which`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    English picks who or which. Estonian picks <Et>kes</Et> for a person and{" "}
                    <Et>mis</Et> for a thing, then gives it the ending the clause needs. The trick:
                    ask which form of <Et>tema</Et> you would use. <Et>Ma nägin teda</Et>, so{" "}
                    <Et>naine, keda ma nägin</Et>. <Et>Ma töötan temaga</Et>, so{" "}
                    <Et>sõber, kellega ma töötan</Et>.
                  </Trans>
                </p>
              </Prose>
              <RelativeTable />
              <Aside>
                <Trans>
                  Always put a comma before <Et>kes</Et> and <Et>mis</Et>, and another after it if
                  the sentence goes on: <Et>Film, mida me vaatasime, oli hea</Et>. For a place you
                  can also use <Et>kus</Et>, where: <Et>linn, kus ma elan</Et>. When the object is a
                  finished whole, use <Et>kelle</Et> or <Et>mille</Et>, like <Et>selle</Et>:{" "}
                  <Et>raamat, mille ma ostsin, on paks</Et>. <Et>Kes</Et> and <Et>mis</Et> stay the
                  same for many: <Et>inimesed, kes seal seisavad</Et>. In speech you will hear{" "}
                  <Et>mis</Et> for people too; in writing use <Et>kes</Et>.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "quiz",
          title: t`Which form fits?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Is it a person or a thing, and which ending does the clause need? Pick the word,
                    then hear the sentence.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="kes-or-mis"
                title={
                  <Trans>
                    A form of <Et>kes</Et> or <Et>mis</Et>?
                  </Trans>
                }
                items={lesson.gaps}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight. You can say who and which in the cases you need most.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>
                      Most of them. Ask: person or thing, and which form of <Et>tema</Et>?
                    </Trans>
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
          id: "street",
          title: t`Kati’s street`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kati writes about where she lives. Look for <Et>kes</Et>, <Et>mis</Et>,{" "}
                    <Et>kus</Et> and <Et>kellega</Et>, and for <Word w="asuma" />, to be located.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="kati-street"
                title={<Trans>What does Kati write?</Trans>}
                by={t`Kati writes`}
                clip="p-kati"
                sentences={NEIGHBOURHOOD_PASSAGE}
                questions={lesson.street}
              />
            </>
          ),
        },
      ]}
    />
  );
}
