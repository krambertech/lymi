import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  DIRECTIONS_PASSAGE,
  objectGapSaid,
  PREPOSITION_GAPS,
  PREPOSITIONS,
} from "../../../lib/learn/clips";
import { shuffle, shuffledRun } from "../../../lib/learn/quiz";
import { Panel } from "../Explore";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { Listening, type PassageQuestion } from "../Passage";
import { type GapItem, GapRound, Quiz } from "../Quiz";
import { Word } from "../Word";

const SLUG = "labi-metsa";
const src = (text: string) => clipUrl(SLUG, clipId(text));

function Et({ children }: { children: ReactNode }) {
  return <span lang="et">{children}</span>;
}

const MEANS: Record<string, MessageDescriptor> = {
  läbi: msg`through`,
  üle: msg`over, across`,
  ümber: msg`around`,
  mööda: msg`along`,
};

const GLOSSARY: Glossary = {
  läbi: { en: msg`through` },
  üle: { en: msg`over, across` },
  ümber: { en: msg`around` },
  mööda: {
    en: msg`along`,
    note: msg`It also means past: ma läksin poest mööda, I walked past the shop.`,
  },
  park: { en: msg`park`, note: msg`Second form pargi, third form parki.` },
  sild: { en: msg`bridge`, note: msg`Second form silla, third form silda.` },
  tänav: { en: msg`street`, note: msg`Second form tänava, third form tänavat.` },
  jõgi: { en: msg`river`, note: msg`Second form jõe, third form jõge.` },
};

function PrepositionTable() {
  const { t, i18n } = useLingui();
  const tips: Record<string, ReactNode> = {
    läbi: (
      <Trans>
        <Et>Läbi</Et> takes the second form: <Et>läbi pargi</Et>, in one side and out the other.
      </Trans>
    ),
    üle: (
      <Trans>
        <Et>Üle</Et> takes the second form: <Et>üle tee</Et>, from one side to the other.
      </Trans>
    ),
    ümber: (
      <Trans>
        <Et>Ümber</Et> takes the second form: <Et>ümber maja</Et>, all the way around.
      </Trans>
    ),
    mööda: (
      <Trans>
        <Et>Mööda</Et> is the odd one: it takes the third form, <Et>mööda teed</Et>.
      </Trans>
    ),
  };
  const rows: ParadigmRow[] = PREPOSITIONS.map((item) => ({
    id: item.word,
    label: i18n._(MEANS[item.word] as MessageDescriptor),
    tip: tips[item.word],
    cells: [
      { form: item.phrase, src: src(item.phrase) },
      { form: item.said, src: src(item.said) },
    ],
  }));
  return (
    <Panel className="gap-5">
      <Paradigm
        label={t`Words before a noun`}
        columns={[t`Phrase`, t`Example`]}
        rows={rows}
        highlight={{ column: 0 }}
        empty={{
          title: t`Tap a form`,
          tip: <Trans>Three take the second form, and mööda takes the third.</Trans>,
        }}
      />
    </Panel>
  );
}

type GapRun = GapItem & { id: string; said: string };

function content(t: (descriptor: MessageDescriptor) => string) {
  const whys: Record<string, ReactNode> = {
    labi: (
      <Trans>
        <Et>Läbi</Et> takes the second form: <Et>pargi</Et>.
      </Trans>
    ),
    ule: (
      <Trans>
        <Et>Üle</Et> takes the second form, the one that ends like <Et>silla</Et> or <Et>tänava</Et>
        .
      </Trans>
    ),
    umber: (
      <Trans>
        <Et>Ümber</Et> takes the second form: <Et>pargi</Et>.
      </Trans>
    ),
    mooda: (
      <Trans>
        <Et>Mööda</Et> takes the third form, the one in <Et>parki</Et>, <Et>silda</Et>,{" "}
        <Et>tänavat</Et>.
      </Trans>
    ),
  };
  const gaps: GapRun[] = PREPOSITION_GAPS.map((gap) => {
    const said = objectGapSaid(gap);
    return {
      id: gap.id,
      said,
      src: src(said),
      before: gap.before,
      after: gap.after,
      options: gap.options,
      answer: gap.answer,
      explain: whys[gap.id.split("-")[0] as string],
    };
  });

  const directions: PassageQuestion[] = [
    {
      id: "first",
      ask: t(msg`What do you do first?`),
      options: [
        { id: "road", label: t(msg`Cross the road at the bus stop`) },
        { id: "river", label: t(msg`Walk along the river`) },
        { id: "park", label: t(msg`Go through the park`) },
      ],
      answer: "road",
      line: 1,
    },
    {
      id: "river",
      ask: t(msg`How do you get across the river?`),
      options: [
        { id: "boat", label: t(msg`By boat`) },
        { id: "bridge", label: t(msg`Over the bridge`) },
        { id: "around", label: t(msg`Around the whole lake`) },
      ],
      answer: "bridge",
      line: 3,
    },
    {
      id: "house",
      ask: t(msg`Where is Jaan’s house?`),
      options: [
        { id: "stop", label: t(msg`Next to the bus stop`) },
        { id: "behind", label: t(msg`Behind the park`) },
        { id: "bridge", label: t(msg`In front of the bridge`) },
      ],
      answer: "behind",
      line: 4,
    },
  ];

  return { gaps, directions };
}

const gapRun = (items: readonly GapRun[], pinned?: GapRun): GapRun[] =>
  shuffledRun(items, pinned).map((item) =>
    item === pinned ? item : { ...item, options: shuffle([...item.options]) },
  );

export function LabiMetsaLesson() {
  const { t, i18n } = useLingui();
  const lesson = content((descriptor) => i18n._(descriptor));
  const genitive = lessonBySlug("omastav")?.n;
  const partitive = lessonBySlug("osastav")?.n;
  const behind = lessonBySlug("peal-all-taga")?.n;

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          <Et>Läbi pargi</Et>, <Et>üle tee</Et>, <Et>mööda jõge</Et>: four small words that come
          before the noun, and the one form each of them wants.
        </Trans>
      }
      facts={[
        <Trans key="m">10 minutes</Trans>,
        <Trans key="q">2 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["läbi", "üle", "ümber", "mööda", "park", "sild", "tänav", "jõgi"]}
      recap={[
        <Trans key="1">
          <b lang="et">Läbi</b>, <b lang="et">üle</b> and <b lang="et">ümber</b> come before the
          noun and take the second form: <b lang="et">läbi pargi, üle tee, ümber maja</b>.
        </Trans>,
        <Trans key="2">
          <b lang="et">Mööda</b> takes the third form: <b lang="et">mööda teed, mööda jõge</b>.
        </Trans>,
        <Trans key="3">
          Most such words come after the noun, like <b lang="et">pargi taga</b>. These four are the
          common ones that come before it.
        </Trans>,
      ]}
      sections={[
        {
          id: "before",
          title: t`Before the noun`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In lesson {behind} the place word came after the noun: <Et>pargi taga</Et>,
                    behind the park. A few words come before it, as in English. Three of them,{" "}
                    <Word w="läbi" />, <Word w="üle" /> and <Word w="ümber" />, take the second form
                    of lesson {genitive}. <Word w="mööda" /> takes the third form of lesson{" "}
                    {partitive}.
                  </Trans>
                </p>
              </Prose>
              <PrepositionTable />
              <Aside>
                <Trans>
                  <Et>Läbi</Et> and <Et>üle</Et> can also come after a noun with <Et>-st</Et>:{" "}
                  <Et>ma läksin pargist läbi</Et>. It means the same, and you will hear both.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "quiz",
          title: t`Second or third form?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each gap is a noun after <Et>läbi</Et>, <Et>üle</Et>, <Et>ümber</Et> or{" "}
                    <Et>mööda</Et>. Look at the word before the gap, pick the form, then hear the
                    sentence.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="which-form"
                title={<Trans>Which form?</Trans>}
                items={lesson.gaps}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight. Mööda is the only one that wants the third form.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>
                      Most of them. Remember the odd one out: <Et>mööda teed</Et>.
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
          id: "directions",
          title: t`The way to Jaan’s house`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Jaan sends you a voice message with directions. Listen for <Et>üle</Et>,{" "}
                    <Et>mööda</Et> and <Et>läbi</Et>, then answer.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="jaan-directions"
                title={<Trans>Listen: the way to Jaan’s</Trans>}
                clip="p-jaan"
                sentences={DIRECTIONS_PASSAGE}
                questions={lesson.directions}
              />
            </>
          ),
        },
      ]}
    />
  );
}
