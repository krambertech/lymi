import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  GOVERNMENT_DIALOGUE,
  GOVERNMENT_GAPS,
  GOVERNMENT_KINDS,
  GOVERNMENT_OPTIONS,
  objectGapSaid,
} from "../../../lib/learn/clips";
import { shuffle, shuffledRun } from "../../../lib/learn/quiz";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { Chips, Panel } from "../Explore";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { type GapItem, GapRound, Quiz } from "../Quiz";
import { Word } from "../Word";

const SLUG = "ootan-sind";
const src = (text: string) => clipUrl(SLUG, clipId(text));

type Kind = keyof typeof GOVERNMENT_KINDS;

function Et({ children }: { children: ReactNode }) {
  return <span lang="et">{children}</span>;
}

const MEANS: Record<string, MessageDescriptor> = {
  ootama: msg`to wait for`,
  armastama: msg`to love`,
  aitama: msg`to help`,
  otsima: msg`to look for`,
  rääkima: msg`to talk`,
  "aru saama": msg`to understand`,
  hoolima: msg`to care about`,
  helistama: msg`to phone`,
  ütlema: msg`to tell, to say`,
  vastama: msg`to answer`,
  kohtuma: msg`to meet`,
};

const GLOSSARY: Glossary = {
  keda: { en: msg`whom`, note: msg`The question for the third form: keda sa ootad?` },
  kellest: { en: msg`about whom, from whom` },
  kellele: { en: msg`to whom` },
  kellega: { en: msg`with whom` },
};

function KindTable() {
  const { t, i18n } = useLingui();
  const [kind, setKind] = useState<Kind>("part");
  const tips: Record<Kind, ReactNode> = {
    part: (
      <Trans>
        These verbs take the third form, whatever happens: <Et>ma ootan sind</Et>. Question:{" "}
        <Et>keda?</Et>
      </Trans>
    ),
    from: (
      <Trans>
        These take <Et>-st</Et>, about or from: <Et>ma räägin sinust</Et>. Question:{" "}
        <Et>kellest?</Et>
      </Trans>
    ),
    to: (
      <Trans>
        These take <Et>-le</Et>, to: <Et>ma helistan sulle</Et>. Question: <Et>kellele?</Et>
      </Trans>
    ),
    with: (
      <Trans>
        These take <Et>-ga</Et>, with: <Et>ma kohtun sinuga</Et>. Question: <Et>kellega?</Et>
      </Trans>
    ),
  };
  const kinds: { value: Kind; label: string; lang?: string }[] = [
    { value: "part", label: "keda?", lang: "et" },
    { value: "from", label: "kellest?", lang: "et" },
    { value: "to", label: "kellele?", lang: "et" },
    { value: "with", label: "kellega?", lang: "et" },
  ];
  const rows: ParadigmRow[] = GOVERNMENT_KINDS[kind].map((verb) => ({
    id: `${verb.verb}-${kind}`,
    label: i18n._(MEANS[verb.verb] as MessageDescriptor),
    tip: tips[kind],
    cells: [
      { form: verb.verb, src: src(verb.verb) },
      { form: verb.said, src: src(verb.said) },
    ],
  }));
  return (
    <Panel className="gap-5">
      <Chips label={t`Question`} items={kinds} value={kind} onPick={setKind} />
      <Paradigm
        key={kind}
        label={t`Verbs and the case they take`}
        columns={[t`Verb`, t`With you`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{ title: t`Tap a form`, tip: tips[kind] }}
      />
    </Panel>
  );
}

type GapRun = GapItem & { id: string; said: string };

function content() {
  const whys: Record<string, ReactNode> = {
    part: (
      <Trans>
        <Et>Ootama</Et> and <Et>aitama</Et> take the third form: <Et>sind</Et>.
      </Trans>
    ),
    from: (
      <Trans>
        <Et>Rääkima</Et>, about, and <Et>aru saama</Et> take <Et>-st</Et>: <Et>sinust</Et>.
      </Trans>
    ),
    to: (
      <Trans>
        <Et>Helistama</Et> and <Et>kirjutama</Et> go to someone: <Et>sulle</Et>.
      </Trans>
    ),
    with: (
      <Trans>
        <Et>Kohtuma</Et>, and <Et>rääkima</Et> with someone, take <Et>-ga</Et>: <Et>sinuga</Et>.
      </Trans>
    ),
  };
  const gaps: GapRun[] = GOVERNMENT_GAPS.map((gap) => {
    const said = objectGapSaid(gap);
    return {
      id: gap.id,
      said,
      src: src(said),
      before: gap.before,
      after: gap.after,
      options: GOVERNMENT_OPTIONS,
      answer: gap.answer,
      explain: whys[gap.id.split("-").at(-1) as string],
    };
  });

  const said = (clip: keyof typeof GOVERNMENT_DIALOGUE) => {
    const line = GOVERNMENT_DIALOGUE[clip];
    return typeof line === "string" ? line : line.text;
  };
  const talk: DialogueTurn[] = [
    { who: "them", clip: "d-jaan-1", line: said("d-jaan-1") },
    {
      who: "you",
      clip: "d-sina-1",
      replies: [
        {
          line: "Jah, aitäh! Ma vastan sind õhtul.",
          why: (
            <Trans>
              <Et>Vastama</Et> answers to someone: <Et>sulle</Et>.
            </Trans>
          ),
        },
        { line: said("d-sina-1"), right: true },
        {
          line: "Jah, aitäh! Ma vastan sinust õhtul.",
          why: (
            <Trans>
              <Et>Sinust</Et> is about you. <Et>Vastama</Et> answers to someone: <Et>sulle</Et>.
            </Trans>
          ),
        },
      ],
    },
    { who: "them", clip: "d-jaan-2", line: said("d-jaan-2") },
    {
      who: "you",
      clip: "d-sina-2",
      replies: [
        { line: said("d-sina-2"), right: true },
        {
          line: "Jah, ma kohtun sind hea meelega.",
          why: (
            <Trans>
              <Et>Kohtuma</Et> takes <Et>-ga</Et>: you meet with someone, <Et>sinuga</Et>.
            </Trans>
          ),
        },
        {
          line: "Jah, ma kohtun sulle hea meelega.",
          why: (
            <Trans>
              <Et>Kohtuma</Et> takes <Et>-ga</Et>, not <Et>-le</Et>: <Et>sinuga</Et>.
            </Trans>
          ),
        },
      ],
    },
    { who: "them", clip: "d-jaan-3", line: said("d-jaan-3") },
    {
      who: "you",
      clip: "d-sina-3",
      replies: [
        {
          line: "Ma ootan selle väga!",
          why: (
            <Trans>
              <Et>Ootama</Et> always takes the third form: <Et>seda</Et>.
            </Trans>
          ),
        },
        {
          line: "Ma ootan sellest väga!",
          why: (
            <Trans>
              <Et>Sellest</Et> is about it. <Et>Ootama</Et> takes the third form: <Et>seda</Et>.
            </Trans>
          ),
        },
        { line: said("d-sina-3"), right: true },
      ],
    },
  ];

  return { gaps, talk };
}

const gapRun = (items: readonly GapRun[], pinned?: GapRun): GapRun[] =>
  shuffledRun(items, pinned).map((item) =>
    item === pinned ? item : { ...item, options: shuffle([...item.options]) },
  );

export function OotanSindLesson() {
  const { t } = useLingui();
  const lesson = content();
  const partitive = lessonBySlug("osastav")?.n;
  const object = lessonBySlug("raamatut-voi-raamatu")?.n;

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          <Et>Ootan sind</Et>, <Et>räägin sinust</Et>, <Et>helistan sulle</Et>: each verb asks for
          its own case, and the dictionary tells you which.
        </Trans>
      }
      facts={[
        <Trans key="m">12 minutes</Trans>,
        <Trans key="q">2 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["keda", "kellest", "kellele", "kellega"]}
      recap={[
        <Trans key="1">
          Learn a verb with its question: <b lang="et">ootama keda?</b>,{" "}
          <b lang="et">rääkima kellest?</b>, <b lang="et">helistama kellele?</b>,{" "}
          <b lang="et">kohtuma kellega?</b>
        </Trans>,
        <Trans key="2">
          <b lang="et">Ootama, aitama, armastama, otsima</b> always take the third form.
        </Trans>,
        <Trans key="3">
          The same verb can change its meaning with the case: <b lang="et">räägin sinust</b>, about
          you; <b lang="et">räägin sinuga</b>, with you.
        </Trans>,
      ]}
      sections={[
        {
          id: "question",
          title: t`Each verb has its case`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In English, a little word after the verb does the job: wait for, talk about,
                    call someone. In Estonian, the verb asks for a case. A dictionary shows it with
                    a question word: <Word w="keda" /> for the third form, <Word w="kellest" /> for{" "}
                    <Et>-st</Et>, <Word w="kellele" /> for <Et>-le</Et>, <Word w="kellega" /> for{" "}
                    <Et>-ga</Et>. Learn the verb and its question together.
                  </Trans>
                </p>
              </Prose>
              <KindTable />
              <Aside>
                <Trans>
                  Verbs such as <Et>ootama</Et> take the third form from lesson {partitive} always,
                  even when the waiting is over. The whole or part choice of lesson {object} doesn’t
                  apply to them.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "quiz",
          title: t`Which form of you?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each gap is a form of <Et>sina</Et>, you. The verb decides which one. Pick it,
                    then hear the sentence.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="which-case"
                title={<Trans>Which form of sina?</Trans>}
                items={lesson.gaps}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight. You hear what each verb asks for.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>
                      Most of them. Ask the verb its question: <Et>keda, kellest, kellele?</Et>
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
          id: "talk",
          title: t`Plans with Jaan`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Jaan has written to you. Pick what you say back. If you pick a wrong reply, you
                    see why, then hear the right one.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="plans-with-jaan"
                title={<Trans>Talk: see you tomorrow</Trans>}
                part={
                  <Trans>
                    You’ll answer Jaan’s letter tonight, you’d like to meet him, and you want to
                    hear about his new job.
                  </Trans>
                }
                them={t`Jaan`}
                turns={lesson.talk}
              />
            </>
          ),
        },
      ]}
    />
  );
}
