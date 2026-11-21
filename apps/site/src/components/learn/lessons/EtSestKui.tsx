import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  CONJUNCTION_GAPS,
  CONJUNCTIONS,
  objectGapSaid,
  WHY_ESTONIAN_PASSAGE,
} from "../../../lib/learn/clips";
import { shuffle, shuffledRun } from "../../../lib/learn/quiz";
import { Panel } from "../Explore";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { type PassageQuestion, Reading } from "../Passage";
import { type GapItem, GapRound, Quiz } from "../Quiz";
import { Word } from "../Word";

const SLUG = "et-sest-kui";
const src = (text: string) => clipUrl(SLUG, clipId(text));

type Kind = (typeof CONJUNCTIONS)[number]["id"];

function Et({ children }: { children: ReactNode }) {
  return <span lang="et">{children}</span>;
}

const MEANS: Record<Kind, MessageDescriptor> = {
  et: msg`that`,
  sest: msg`because`,
  "kui-if": msg`if`,
  "kui-when": msg`when`,
  "kui-than": msg`than`,
  aga: msg`but`,
};

const GLOSSARY: Glossary = {
  kolima: { en: msg`to move house`, note: msg`Me kolisime, we moved.` },
  uuesti: { en: msg`again` },
  päris: { en: msg`quite, fairly` },
};

function ConjunctionTable() {
  const { t, i18n } = useLingui();
  const tips: Record<Kind, ReactNode> = {
    et: (
      <Trans>
        <Et>Et</Et> brings in what someone thinks, says or hopes, like English “that”.
      </Trans>
    ),
    sest: (
      <Trans>
        <Et>Sest</Et> gives the reason, like English “because”.
      </Trans>
    ),
    "kui-if": (
      <Trans>
        <Et>Kui</Et> as “if”: the clause comes first, so the verb <Et>jään</Et> comes straight after
        the comma.
      </Trans>
    ),
    "kui-when": (
      <Trans>
        <Et>Kui</Et> as “when”: the same word, and the same verb straight after the comma.
      </Trans>
    ),
    "kui-than": (
      <Trans>
        <Et>Kui</Et> as “than”, after a word like <Et>suurem</Et>, bigger. No comma here.
      </Trans>
    ),
    aga: (
      <Trans>
        <Et>Aga</Et> means “but”, with a comma before it.
      </Trans>
    ),
  };
  const rows: ParadigmRow[] = CONJUNCTIONS.map((item) => ({
    id: item.id,
    label: i18n._(MEANS[item.id]),
    tip: tips[item.id],
    cells: [
      { form: item.word, src: src(item.word) },
      { form: item.example, src: src(item.example) },
    ],
  }));
  return (
    <Panel className="gap-5">
      <Paradigm
        label={t`Words that join two sentences`}
        columns={[t`Word`, t`Example`]}
        rows={rows}
        empty={{
          title: t`Tap a word or a sentence`,
          tip: <Trans>Each word joins two sentences into one.</Trans>,
        }}
      />
    </Panel>
  );
}

const OPTIONS = ["et", "sest", "kui"] as const;

type GapRun = GapItem & { id: string; said: string };

function content(t: (descriptor: MessageDescriptor) => string) {
  const whys: Record<string, ReactNode> = {
    et: (
      <Trans>
        It says what someone thinks, says or hopes, so it takes <Et>et</Et>.
      </Trans>
    ),
    sest: (
      <Trans>
        The second part is the reason, so it takes <Et>sest</Et>.
      </Trans>
    ),
    kui: (
      <Trans>
        It means if, when or than, so it takes <Et>kui</Et>.
      </Trans>
    ),
  };
  const gaps: GapRun[] = CONJUNCTION_GAPS.map((gap, index) => {
    const said = objectGapSaid(gap);
    const turn = index % 3;
    return {
      id: gap.id,
      said,
      src: src(said),
      before: gap.before,
      after: gap.after,
      options: [...OPTIONS.slice(turn), ...OPTIONS.slice(0, turn)],
      answer: gap.answer,
      explain: whys[gap.answer],
    };
  });

  const why: PassageQuestion[] = [
    {
      id: "reason",
      ask: t(msg`Why is Kati learning Estonian?`),
      options: [
        { id: "work", label: t(msg`For a new job`) },
        { id: "moved", label: t(msg`Her family moved to Tartu`) },
        { id: "friend", label: t(msg`Her best friend is Estonian`) },
      ],
      answer: "moved",
      line: 0,
    },
    {
      id: "teacher",
      ask: t(msg`What does her teacher say?`),
      options: [
        { id: "well", label: t(msg`She already speaks quite well`) },
        { id: "more", label: t(msg`She must practise more`) },
        { id: "read", label: t(msg`She should read more`) },
      ],
      answer: "well",
      line: 1,
    },
    {
      id: "ask",
      ask: t(msg`What does she do when she doesn’t understand?`),
      options: [
        { id: "dictionary", label: t(msg`She looks the word up`) },
        { id: "quiet", label: t(msg`She stays quiet`) },
        { id: "again", label: t(msg`She asks again`) },
      ],
      answer: "again",
      line: 2,
    },
  ];

  return { gaps, why };
}

const gapRun = (items: readonly GapRun[], pinned?: GapRun): GapRun[] =>
  shuffledRun(items, pinned).map((item) =>
    item === pinned ? item : { ...item, options: shuffle([...OPTIONS]) },
  );

export function EtSestKuiLesson() {
  const { t, i18n } = useLingui();
  const lesson = content((descriptor) => i18n._(descriptor));
  const would = lessonBySlug("laheksin")?.n;

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          <Et>Ma arvan, et…</Et>, I think that… <Et>Sest</Et>, because. <Et>Kui</Et>, if, when or
          than. The small words that turn two short sentences into one.
        </Trans>
      }
      facts={[
        <Trans key="m">10 minutes</Trans>,
        <Trans key="q">2 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["kolima", "uuesti", "päris"]}
      recap={[
        <Trans key="1">
          <b lang="et">et</b>, that: <b lang="et">ma arvan, et…</b> <b lang="et">sest</b>, because.{" "}
          <b lang="et">aga</b>, but.
        </Trans>,
        <Trans key="2">
          <b lang="et">kui</b> is if, when and than: <b lang="et">kui sajab</b>,{" "}
          <b lang="et">kui ma koju jõuan</b>, <b lang="et">suurem kui Tartu</b>.
        </Trans>,
        <Trans key="3">
          A comma goes before <b lang="et">et</b>, <b lang="et">sest</b>, <b lang="et">aga</b> and
          the <b lang="et">kui</b> of if or when, but not before the <b lang="et">kui</b> of than.
        </Trans>,
        <Trans key="4">
          After a <b lang="et">kui</b> clause at the start, the verb usually comes next:{" "}
          <b lang="et">Kui sajab, jään ma koju.</b>
        </Trans>,
      ]}
      sections={[
        {
          id: "words",
          title: t`Joining two sentences`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Four short words do most of the work. <Et>Et</Et> is that, <Et>sest</Et> is
                    because and <Et>aga</Et> is but. <Et>Kui</Et> has three jobs: if, when, and
                    than. You don’t need to tell if from when: <Et>kui sajab</Et> is both “if it
                    rains” and “when it rains”. For a real “if” about something unlikely, use the
                    would form from lesson {would}: <Et>kui mul oleks raha</Et>.
                  </Trans>
                </p>
              </Prose>
              <ConjunctionTable />
              <Aside>
                <Trans>
                  In a plain sentence the verb likes to be second: <Et>Täna lähen ma tööle</Et>, not
                  “today I go”. A whole <Et>kui</Et> clause at the start counts as the first part,
                  so the verb comes straight after the comma: <Et>Kui sajab, jään ma koju</Et>. In
                  speech you will also hear <Et>täna ma lähen</Et>, so this is a habit to pick up,
                  not a strict rule.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "quiz",
          title: t`That, because, or if?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Read the two halves and pick the word that joins them, then hear the sentence.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="et-sest-kui"
                title={
                  <Trans>
                    <Et>Et</Et>, <Et>sest</Et> or <Et>kui</Et>?
                  </Trans>
                }
                items={lesson.gaps}
                rounds={9}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All nine. You can join two sentences into one.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>
                      Most of them. Ask: is it what someone says, the reason, or if, when or than?
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
          id: "why",
          title: t`Why Kati learns Estonian`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kati writes why she learns Estonian. Look for <Et>et</Et>, <Et>sest</Et>,{" "}
                    <Et>kui</Et> and <Et>aga</Et>, and for <Word w="kolima" />, to move house.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="kati-why"
                title={<Trans>What does Kati write?</Trans>}
                by={t`Kati writes`}
                clip="p-kati"
                sentences={WHY_ESTONIAN_PASSAGE}
                questions={lesson.why}
              />
            </>
          ),
        },
      ]}
    />
  );
}
