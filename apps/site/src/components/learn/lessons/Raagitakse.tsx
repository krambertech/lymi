import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useState } from "react";
import {
  clipId,
  clipUrl,
  IMPERSONAL_CUSTOMS,
  IMPERSONAL_GAPS,
  IMPERSONAL_KINDS,
  IMPERSONAL_OPTIONS,
  IMPERSONAL_USES,
  objectGapSaid,
} from "../../../lib/learn/clips";
import { shuffle, shuffledRun } from "../../../lib/learn/quiz";
import { Chips, Panel } from "../Explore";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { type PassageQuestion, Reading } from "../Passage";
import { type GapItem, GapRound, Quiz } from "../Quiz";
import { Word } from "../Word";

const SLUG = "raagitakse";
const src = (text: string) => clipUrl(SLUG, clipId(text));

type Kind = keyof typeof IMPERSONAL_KINDS;

function Et({ children }: { children: ReactNode }) {
  return <span lang="et">{children}</span>;
}

const MEANS: Record<string, MessageDescriptor> = {
  rääkima: msg`to speak`,
  lugema: msg`to read`,
  elama: msg`to live`,
  saama: msg`to get`,
  nägema: msg`to see`,
  tegema: msg`to do, to make`,
  sööma: msg`to eat`,
  minema: msg`to go`,
  tulema: msg`to come`,
};

const GLOSSARY: Glossary = {
  vanasti: { en: msg`in the old days` },
  jaanipäev: { en: msg`Midsummer Day`, note: msg`24 June, celebrated the evening before.` },
  lõke: { en: msg`bonfire`, note: msg`Lõket: the third form, as in tehakse lõket.` },
  verivorst: { en: msg`blood sausage` },
  hapukapsas: { en: msg`sauerkraut` },
  "eestis räägitakse eesti keelt.": { en: msg`In Estonia, people speak Estonian.` },
  "siin ei suitsetata.": { en: msg`No smoking here.` },
  "pood avatakse kell üheksa.": { en: msg`The shop opens at nine.` },
  "see maja ehitati 1920. aastal.": { en: msg`This house was built in 1920.` },
};

function KindTable() {
  const { t, i18n } = useLingui();
  const [kind, setKind] = useState<Kind>("regular");
  const tips: Record<Kind, ReactNode> = {
    regular: (
      <Trans>
        Swap <Et>-tud</Et> for <Et>-takse</Et> now and <Et>-ti</Et> in the past; <Et>-dud</Et> for{" "}
        <Et>-dakse</Et> and <Et>-di</Et>.
      </Trans>
    ),
    heart: (
      <Trans>
        The past still follows the rule: <Et>tehtud, tehti</Et>. The present you learn by heart.
      </Trans>
    ),
  };
  const kinds: { value: Kind; label: string }[] = [
    { value: "regular", label: t`By the rule` },
    { value: "heart", label: t`By heart` },
  ];
  const rows: ParadigmRow[] = IMPERSONAL_KINDS[kind].map((verb) => ({
    id: verb.verb,
    label: i18n._(MEANS[verb.verb] as MessageDescriptor),
    tip: tips[kind],
    cells: [
      { form: verb.done, src: src(verb.done) },
      { form: verb.now, src: src(verb.now) },
      { form: verb.past, src: src(verb.past) },
    ],
  }));
  return (
    <Panel className="gap-5">
      <Chips label={t`Verbs`} items={kinds} value={kind} onPick={setKind} />
      <Paradigm
        key={kind}
        label={t`Done form, impersonal now and impersonal past`}
        columns={[t`Done`, t`People do it`, t`People did it`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{ title: t`Tap a form`, tip: tips[kind] }}
      />
    </Panel>
  );
}

function SentenceList({ items }: { items: readonly string[] }) {
  return (
    <ul className="m-0 grid list-none gap-1 p-0">
      {items.map((said) => (
        <li key={said}>
          <Word w={said} />
        </li>
      ))}
    </ul>
  );
}

type GapRun = GapItem & { id: string; said: string };

function content(t: (descriptor: MessageDescriptor) => string) {
  const whys: Record<string, ReactNode> = {
    person: <Trans>A person does it, named before the gap: the usual form.</Trans>,
    now: (
      <Trans>
        Nobody is named, and it happens now or usually: <Et>-takse</Et>.
      </Trans>
    ),
    past: (
      <Trans>
        Nobody is named, and a time word puts it in the past: <Et>-ti</Et>.
      </Trans>
    ),
  };
  const gaps: GapRun[] = IMPERSONAL_GAPS.map((gap) => {
    const said = objectGapSaid(gap);
    return {
      id: gap.id,
      said,
      src: src(said),
      before: gap.before,
      after: gap.after,
      options: IMPERSONAL_OPTIONS[gap.verb],
      answer: gap.answer,
      explain: whys[gap.id.split("-").at(-1) as string],
    };
  });

  const customs: PassageQuestion[] = [
    {
      id: "midsummer",
      ask: t(msg`What do people eat at Midsummer?`),
      options: [
        { id: "fish", label: t(msg`Fish soup`) },
        { id: "grill", label: t(msg`Grilled sausages by the fire`) },
        { id: "blood", label: t(msg`Blood sausage`) },
      ],
      answer: "grill",
      line: 1,
    },
    {
      id: "sauna",
      ask: t(msg`What do people do after the sauna in winter?`),
      options: [
        { id: "snow", label: t(msg`Jump into the snow`) },
        { id: "tea", label: t(msg`Drink hot tea`) },
        { id: "sleep", label: t(msg`Go straight to bed`) },
      ],
      answer: "snow",
      line: 2,
    },
    {
      id: "country",
      ask: t(msg`Where did people live in the old days?`),
      options: [
        { id: "town", label: t(msg`In towns`) },
        { id: "sea", label: t(msg`By the sea, in small villages`) },
        { id: "country", label: t(msg`In the country`) },
      ],
      answer: "country",
      line: 4,
    },
  ];

  return { gaps, customs };
}

const gapRun = (items: readonly GapRun[], pinned?: GapRun): GapRun[] =>
  shuffledRun(items, pinned).map((item) =>
    item === pinned ? item : { ...item, options: shuffle([...item.options]) },
  );

export function RaagitakseLesson() {
  const { t, i18n } = useLingui();
  const lesson = content((descriptor) => i18n._(descriptor));

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          <Et>Eestis räägitakse eesti keelt</Et>: when it doesn’t matter who does it. The{" "}
          <Et>-takse</Et> form now, <Et>-ti</Et> in the past.
        </Trans>
      }
      facts={[
        <Trans key="m">12 minutes</Trans>,
        <Trans key="q">2 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["vanasti", "jaanipäev", "lõke", "verivorst", "hapukapsas"]}
      recap={[
        <Trans key="1">
          Nobody named: <b lang="et">-takse</b> or <b lang="et">-dakse</b> now, <b lang="et">-ti</b>{" "}
          or <b lang="et">-di</b> in the past. <b lang="et">Räägitakse, räägiti.</b>
        </Trans>,
        <Trans key="2">
          Build it from the done form: <b lang="et">räägitud</b>, <b lang="et">saadud</b>.
        </Trans>,
        <Trans key="3">
          No: <b lang="et">ei</b> with <b lang="et">-ta</b> now, <b lang="et">-tud</b> in the past.{" "}
          <b lang="et">Siin ei suitsetata.</b>
        </Trans>,
      ]}
      sections={[
        {
          id: "nobody",
          title: t`When nobody is named`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    English says people speak, they say, or it is built. Estonian has one form of
                    the verb for this, with no person at all: <Et>räägitakse</Et>, people speak. You
                    see it on signs, in news and when you talk about how things are done.
                  </Trans>
                </p>
              </Prose>
              <SentenceList items={IMPERSONAL_USES} />
              <Aside>
                <Trans>
                  A whole thing that is done is in its dictionary form: <Et>pood avatakse</Et>,{" "}
                  <Et>maja ehitati</Et>. The third form stays the third form:{" "}
                  <Et>räägitakse eesti keelt</Et>.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "build",
          title: t`Building it`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Start from the done form, the one in <Et>-tud</Et> or <Et>-dud</Et>:{" "}
                    <Et>räägitud</Et>, spoken; <Et>saadud</Et>, got. Swap <Et>-tud</Et> for{" "}
                    <Et>-takse</Et> and <Et>-dud</Et> for <Et>-dakse</Et>: <Et>räägitakse</Et>,{" "}
                    <Et>saadakse</Et>. For the past, <Et>-ti</Et> or <Et>-di</Et>: <Et>räägiti</Et>,{" "}
                    <Et>saadi</Et>.
                  </Trans>
                </p>
              </Prose>
              <KindTable />
              <Aside>
                <Trans>
                  To say no: <Et>ei</Et> with <Et>-ta</Et> or <Et>-da</Et> now,{" "}
                  <Et>siin ei suitsetata</Et>; and the done form in the past,{" "}
                  <Et>seda ei räägitud</Et>.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "quiz",
          title: t`Someone, or nobody?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Is a person named before the gap? Is there a time in the past? Pick the form,
                    then hear the sentence.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="who-does-it"
                title={<Trans>Which form?</Trans>}
                items={lesson.gaps}
                rounds={9}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All nine. You can tell who does it, or that nobody is named.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Look for a person before the gap.</Trans>
                  ) : (
                    <Trans>Read the first section once more, then try again.</Trans>
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
          id: "customs",
          title: t`How it’s done in Estonia`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Customs are told in the impersonal: what people do on <Word w="jaanipäev" />,
                    Midsummer, in the sauna and at Christmas. Read and answer.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="estonian-customs"
                title={<Trans>How it’s done in Estonia</Trans>}
                clip="p-customs"
                sentences={IMPERSONAL_CUSTOMS}
                questions={lesson.customs}
              />
            </>
          ),
        },
      ]}
    />
  );
}
