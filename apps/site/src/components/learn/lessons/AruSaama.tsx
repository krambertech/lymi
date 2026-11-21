import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  objectGapSaid,
  PARTICLE_DIALOGUE,
  PARTICLE_GAPS,
  PARTICLE_OPTIONS,
  PARTICLE_VERBS,
} from "../../../lib/learn/clips";
import { shuffle, shuffledRun } from "../../../lib/learn/quiz";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { Panel } from "../Explore";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Match, type MatchPair } from "../Match";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { type GapItem, GapRound, Quiz } from "../Quiz";
import { Word } from "../Word";

const SLUG = "aru-saama";
const src = (text: string) => clipUrl(SLUG, clipId(text));

type Particle = (typeof PARTICLE_OPTIONS)[number];

function Et({ children }: { children: ReactNode }) {
  return <span lang="et">{children}</span>;
}

const MEANS: Record<string, MessageDescriptor> = {
  "aru saama": msg`to understand`,
  "läbi saama": msg`to get along`,
  "välja nägema": msg`to look, to look like`,
  "kokku leppima": msg`to agree, to arrange`,
  "vastu võtma": msg`to accept, to receive`,
  "maha jääma": msg`to miss, to fall behind`,
};

const GLOSSARY: Glossary = {
  aru: { en: msg`sense, understanding`, note: msg`Mostly met in aru saama, to understand.` },
  läbi: { en: msg`through` },
  välja: { en: msg`out` },
  kokku: { en: msg`together` },
  vastu: { en: msg`against, towards` },
  maha: { en: msg`down` },
};

function VerbTable() {
  const { t, i18n } = useLingui();
  const tips: Record<Particle, ReactNode> = {
    aru: (
      <Trans>
        <Et>Saama</Et> is to get. With <Et>aru</Et> it means to understand, and the person or thing
        takes <Et>-st</Et>: <Et>sinust aru</Et>.
      </Trans>
    ),
    läbi: (
      <Trans>
        <Et>Läbi</Et> is through: to get through together, to get along. The person takes{" "}
        <Et>-ga</Et>: <Et>Katiga</Et>.
      </Trans>
    ),
    välja: (
      <Trans>
        <Et>Nägema</Et> is to see and <Et>välja</Et> is out. Together they mean to look:{" "}
        <Et>sa näed hea välja</Et>, you look good.
      </Trans>
    ),
    kokku: (
      <Trans>
        <Et>Kokku</Et> is together. <Et>Kokku leppima</Et> is to agree on a plan or a time.
      </Trans>
    ),
    vastu: (
      <Trans>
        <Et>Võtma</Et> is to take and <Et>vastu</Et> is towards: to take something you are offered,
        to accept it.
      </Trans>
    ),
    maha: (
      <Trans>
        <Et>Jääma</Et> is to stay and <Et>maha</Et> is down: to stay behind. The bus takes{" "}
        <Et>-st</Et>: <Et>bussist maha</Et>.
      </Trans>
    ),
  };
  const rows: ParadigmRow[] = PARTICLE_VERBS.map((verb) => {
    const particle = verb.verb.split(" ")[0] as Particle;
    return {
      id: particle,
      label: i18n._(MEANS[verb.verb] as MessageDescriptor),
      tip: tips[particle],
      cells: [
        { form: verb.verb, src: src(verb.verb) },
        { form: verb.said, src: src(verb.said) },
      ],
    };
  });
  return (
    <Panel className="gap-5">
      <Paradigm
        label={t`Particle verbs and what they mean`}
        columns={[t`Verb`, t`Example`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{
          title: t`Tap a form`,
          tip: <Trans>Each verb’s meaning is more than its two parts.</Trans>,
        }}
      />
    </Panel>
  );
}

type GapRun = GapItem & { id: string; said: string };

function content() {
  const whys: Record<Particle, ReactNode> = {
    aru: (
      <Trans>
        Understanding is <Et>aru saama</Et>, and what you understand takes <Et>-st</Et>.
      </Trans>
    ),
    läbi: (
      <Trans>
        Getting along is <Et>läbi saama</Et>, with <Et>-ga</Et> or <Et>omavahel</Et>, with each
        other.
      </Trans>
    ),
    välja: (
      <Trans>
        How someone looks is <Et>välja nägema</Et>: <Et>hea välja</Et>.
      </Trans>
    ),
    maha: (
      <Trans>
        Missing a bus is <Et>maha jääma</Et>, staying behind: <Et>bussist maha</Et>.
      </Trans>
    ),
    kokku: (
      <Trans>
        Agreeing on a plan is <Et>kokku leppima</Et>: <Et>lepime kokku</Et>.
      </Trans>
    ),
    vastu: (
      <Trans>
        Accepting what you are offered is <Et>vastu võtma</Et>: <Et>võtan vastu</Et>.
      </Trans>
    ),
  };
  const gaps: GapRun[] = PARTICLE_GAPS.map((gap) => {
    const said = objectGapSaid(gap);
    return {
      id: gap.id,
      said,
      src: src(said),
      before: gap.before,
      after: gap.after,
      options: PARTICLE_OPTIONS,
      answer: gap.answer,
      explain: whys[gap.answer],
    };
  });

  const said = (clip: keyof typeof PARTICLE_DIALOGUE) => {
    const line = PARTICLE_DIALOGUE[clip];
    return typeof line === "string" ? line : line.text;
  };
  const talk: DialogueTurn[] = [
    { who: "them", clip: "d-mari-1", line: said("d-mari-1") },
    {
      who: "you",
      clip: "d-sina-1",
      replies: [
        {
          line: "Jah, ma sain kõike aru.",
          why: (
            <Trans>
              What you understand takes <Et>-st</Et>: <Et>kõigest aru</Et>. You may hear{" "}
              <Et>kõike aru</Et> in speech, but say and write <Et>kõigest</Et>.
            </Trans>
          ),
        },
        { line: said("d-sina-1"), right: true },
        {
          line: "Jah, ma aru sain kõikidest.",
          why: (
            <Trans>
              The verb comes second and <Et>aru</Et> goes to the end: <Et>ma sain kõigest aru</Et>.
            </Trans>
          ),
        },
      ],
    },
    { who: "them", clip: "d-mari-2", line: said("d-mari-2") },
    {
      who: "you",
      clip: "d-sina-2",
      replies: [
        {
          line: "Ma jäin bussile maha.",
          why: (
            <Trans>
              The bus leaves you behind, so it takes <Et>-st</Et>: <Et>bussist maha</Et>.
            </Trans>
          ),
        },
        {
          line: "Ma maha jäin bussile.",
          why: (
            <Trans>
              The verb comes second and <Et>maha</Et> goes to the end, and the bus takes{" "}
              <Et>-st</Et>: <Et>ma jäin bussist maha</Et>.
            </Trans>
          ),
        },
        { line: said("d-sina-2"), right: true },
      ],
    },
    { who: "them", clip: "d-mari-3", line: said("d-mari-3") },
    {
      who: "you",
      clip: "d-sina-3",
      replies: [
        { line: said("d-sina-3"), right: true },
        {
          line: "Jah, lepime nii vastu!",
          why: (
            <Trans>
              <Et>Vastu</Et> is towards. Agreeing is <Et>kokku leppima</Et>:{" "}
              <Et>lepime nii kokku</Et>.
            </Trans>
          ),
        },
        {
          line: "Jah, vastu lepime nii!",
          why: (
            <Trans>
              The particle goes to the end, and agreeing takes <Et>kokku</Et>:{" "}
              <Et>lepime nii kokku</Et>.
            </Trans>
          ),
        },
      ],
    },
  ];

  return { gaps, talk };
}

const gapRun = (items: readonly GapRun[], pinned?: GapRun): GapRun[] =>
  shuffledRun(items, pinned).map((item) =>
    item === pinned ? item : { ...item, options: shuffle([...item.options]) },
  );

export function AruSaamaLesson() {
  const { t, i18n } = useLingui();
  const lesson = content();
  const government = lessonBySlug("ootan-sind")?.n;
  const pairs: MatchPair[] = PARTICLE_VERBS.map((verb) => ({
    id: verb.verb.split(" ")[0] as string,
    left: verb.verb,
    right: i18n._(MEANS[verb.verb] as MessageDescriptor),
    src: src(verb.verb),
  }));

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          <Et>Aru saama</Et>, <Et>välja nägema</Et>, <Et>maha jääma</Et>: a small word changes what
          the verb means, and it goes to the end of the sentence.
        </Trans>
      }
      facts={[
        <Trans key="m">12 minutes</Trans>,
        <Trans key="q">3 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["aru", "läbi", "välja", "kokku", "vastu", "maha"]}
      recap={[
        <Trans key="1">
          A particle verb is one verb in two words. Learn it whole: <b lang="et">aru saama</b>, to
          understand; <b lang="et">välja nägema</b>, to look.
        </Trans>,
        <Trans key="2">
          In a simple sentence the particle usually goes to the end of the clause:{" "}
          <b lang="et">Ma saan sinust aru.</b>
        </Trans>,
        <Trans key="3">
          With a second verb, the particle stands just before it:{" "}
          <b lang="et">Ma tahan sinust aru saada.</b>
        </Trans>,
        <Trans key="4">
          Its dictionary form puts the particle first: <b lang="et">aru saama</b>. Look for that
          whole form, or for it inside the entry for <b lang="et">saama</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "verbs",
          title: t`One verb in two words`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    You met <Et>aru saama</Et> in lesson {government}. It is <Et>saama</Et>, to get,
                    with the small word <Word w="aru" />, and together they mean to understand.
                    English does the same with give up or look after: the meaning isn’t the sum of
                    the parts. Learn these verbs whole.
                  </Trans>
                </p>
              </Prose>
              <VerbTable />
            </>
          ),
        },
        {
          id: "order",
          title: t`The particle goes to the end`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    The verb still comes second, and the particle usually waits at the end of the
                    clause: <Et>Ma saan sinust hästi aru.</Et> It stays at the end with <Et>ei</Et>{" "}
                    too: <Et>Ma ei saa sinust aru.</Et>
                  </Trans>
                </p>
              </Prose>
              <Aside>
                <Trans>
                  With a second verb, the particle sits right before it, as in the dictionary:{" "}
                  <Et>Ma tahan sinust aru saada.</Et> <Et>Me peame kokku leppima.</Et>
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "match",
          title: t`What does it mean?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Match each verb with its meaning. Tap a verb to hear it.</Trans>
                </p>
              </Prose>
              <Match id="particle-meanings" title={<Trans>Which meaning?</Trans>} pairs={pairs} />
            </>
          ),
        },
        {
          id: "quiz",
          title: t`Which particle?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each sentence ends with the particle. Pick the one that gives the meaning, then
                    hear the sentence.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="which-particle"
                title={<Trans>Which particle?</Trans>}
                items={lesson.gaps}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight. You know these verbs whole.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Say each verb with its particle until it sticks.</Trans>
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
          title: t`A chat with Mari`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari asks about your week. Pick what you say back. If you pick a wrong reply,
                    you see why, then hear the right one.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="chat-with-mari"
                title={<Trans>Talk: a chat with Mari</Trans>}
                part={
                  <Trans>
                    You understood yesterday’s class, you were late because you missed the bus, and
                    Friday at six suits you.
                  </Trans>
                }
                them={t`Mari`}
                turns={lesson.talk}
              />
            </>
          ),
        },
      ]}
    />
  );
}
