import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  PRONOUN_CASES,
  PRONOUN_PARTITIVE,
  PRONOUN_SHORT,
  PRONOUN_WAYS,
  PRONOUN_WITH,
  type PronounId,
  type PronounWay,
  pronounSentence,
  pronounShort,
  pronounWith,
} from "../../../lib/learn/clips";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Chips, ListenRows, Panel } from "../Explore";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import { type GapItem, GapPassage } from "../GapPassage";
import type { Glossary } from "../lesson-context";
import { LessonView, Prose } from "../LessonView";
import { Match, type MatchPair } from "../Match";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { Word } from "../Word";

const SLUG = "asesonad";
const src = (text: string) => clipUrl(SLUG, clipId(text));

type Person = (typeof PRONOUN_CASES)[number];
const MEANS: Record<string, MessageDescriptor> = {
  "Tule minuga!": msg`Come with me.`,
  "Ma räägin temaga.": msg`I’m talking with him or her.`,
  "Kas sa tuled meiega?": msg`Are you coming with us?`,
  "Ma ei tule sinuta.": msg`I’m not coming without you.`,
  "Helista mulle!": msg`Call me.`,
  "Mul on aega.": msg`I have time.`,
  "Ma küsin teilt.": msg`I’ll ask you. To more than one, or polite.`,
  "Jaan helistab mulle.": msg`Jaan is calling me.`,
  "Jaan helistab sulle.": msg`Jaan is calling you.`,
  "Jaan helistab talle.": msg`Jaan is calling him or her.`,
  "Jaan helistab meile.": msg`Jaan is calling us.`,
  "Jaan helistab teile.": msg`Jaan is calling you. To more than one, or polite.`,
  "Jaan helistab neile.": msg`Jaan is calling them.`,
  "Sul on aega.": msg`You have time.`,
  "Tal on aega.": msg`He or she has time.`,
  "Meil on aega.": msg`We have time.`,
  "Teil on aega.": msg`You have time. To more than one, or polite.`,
  "Neil on aega.": msg`They have time.`,
  "Jaan küsib mult.": msg`Jaan is asking me.`,
  "Jaan küsib sult.": msg`Jaan is asking you.`,
  "Jaan küsib talt.": msg`Jaan is asking him or her.`,
  "Jaan küsib meilt.": msg`Jaan is asking us.`,
  "Jaan küsib teilt.": msg`Jaan is asking you. To more than one, or polite.`,
  "Jaan küsib neilt.": msg`Jaan is asking them.`,
  "Ma armastan sind.": msg`I love you.`,
  "Oota mind!": msg`Wait for me.`,
  "Ma ootan teda.": msg`I’m waiting for him or her.`,
  "Me ootame teid.": msg`We’re waiting for you. To more than one, or polite.`,
  "Nad ootavad meid.": msg`They’re waiting for us.`,
  "Kas sa ootad neid?": msg`Are you waiting for them?`,
};

const GLOSSARY: Glossary = {
  mina: { en: msg`I`, note: msg`The short form is ma.` },
  minu: { en: msg`my`, note: msg`The genitive of mina. Short: mu.` },
  minuga: { en: msg`with me` },
  minuta: { en: msg`without me` },
  sinuta: { en: msg`without you` },
  temaga: { en: msg`with him or her` },
  nende: { en: msg`their`, note: msg`The genitive of nemad.` },
  nendega: { en: msg`with them`, note: msg`-ga on nende, the genitive of nemad.` },
  mulle: { en: msg`to me, for me`, note: msg`The short form of minule.` },
  minule: { en: msg`to me, for emphasis`, note: msg`The long form of mulle.` },
  mul: { en: msg`at me`, note: msg`The short form of minul. Mul on: I have.` },
  minul: { en: msg`at me, for emphasis`, note: msg`The long form of mul.` },
  mult: { en: msg`from me`, note: msg`The short form of minult.` },
  minult: { en: msg`from me, for emphasis`, note: msg`The long form of mult.` },
  ootan: { en: msg`I’m waiting`, note: msg`From ootama, to wait.` },
  "ma armastan sind": { en: msg`I love you.`, show: "Ma armastan sind" },
  mind: { en: msg`me`, note: msg`The partitive of mina.` },
  sind: {
    en: msg({ message: "you", context: "the partitive sind" }),
    note: msg`The partitive of sina.`,
  },
  teda: { en: msg`him or her`, note: msg`The partitive of tema.` },
  meid: { en: msg`us`, note: msg`The partitive of meie.` },
  teid: {
    en: msg({ message: "you, to more than one; polite you", context: "the partitive teid" }),
    note: msg`The partitive of teie.`,
  },
  neid: { en: msg`them`, note: msg`The partitive of nemad.` },
  "keda?": { en: msg`whom?`, show: "Keda?", note: msg`The partitive of kes, who.` },
  "kellega?": { en: msg`with whom?`, show: "Kellega?" },
  "kellele?": { en: msg`to whom?`, show: "Kellele?" },
  "ma räägin sinust": { en: msg`I’m talking about you.`, show: "Ma räägin sinust" },
};
const PERSON_NAMES: Record<PronounId, MessageDescriptor> = {
  mina: msg`I`,
  sina: msg`you`,
  tema: msg`he or she`,
  meie: msg`we`,
  teie: msg`you, to more than one; polite you`,
  nemad: msg`they`,
};
const WITH_MEANS: Record<PronounId, { ga: MessageDescriptor; ta: MessageDescriptor }> = {
  mina: { ga: msg`with me`, ta: msg`without me` },
  sina: { ga: msg`with you`, ta: msg`without you` },
  tema: { ga: msg`with him or her`, ta: msg`without him or her` },
  meie: { ga: msg`with us`, ta: msg`without us` },
  teie: {
    ga: msg`with you, to more than one; polite`,
    ta: msg`without you, to more than one; polite`,
  },
  nemad: { ga: msg`with them`, ta: msg`without them` },
};
const PARTITIVE_MEANS: Record<PronounId, MessageDescriptor> = {
  mina: msg`me`,
  sina: msg`you, one person`,
  tema: msg`him or her`,
  meie: msg`us`,
  teie: msg({ message: "you, to more than one; polite you", context: "the partitive teid" }),
  nemad: msg`them`,
};

const meaning = (said: string, i18n: I18n) => i18n._(MEANS[said] as MessageDescriptor);
const lit = (form: string, ending: string) =>
  `${form.slice(0, form.length - ending.length)}|${ending}`;
export const BUILD = PRONOUN_CASES.flatMap((person) =>
  (["ga", "ta"] as const).map((ending) => ({
    person,
    ending,
    form: pronounWith(person.genitive, ending),
    pair: [person.id, `${person.id}-${ending}`] as const,
  })),
);
export const HEARD = PRONOUN_CASES.flatMap((person) =>
  PRONOUN_WAYS.map((way) => ({
    way,
    said: pronounSentence(way, pronounShort(person, way)),
    pair: [way, `${person.id}-${way}`] as const,
  })),
);
export const shuffledWays = (): PronounWay[] => shuffle([...PRONOUN_WAYS]);

const QUESTIONS: Record<PronounWay, MessageDescriptor> = {
  le: msg`To someone`,
  l: msg`Someone has`,
  lt: msg`From someone`,
};

const wayOptions = (ways: readonly PronounWay[], i18n: I18n) =>
  ways.map((way) => ({
    id: way,
    label: <span lang={i18n.locale}>{i18n._(QUESTIONS[way])}</span>,
  }));

type HeardItem = ChoiceItem & { said: string; pair: readonly [string, string] };
type BuildItem = FormItem & { pair: readonly [string, string] };
const MESSAGE_GAPS: readonly GapItem[] = [
  {
    id: "minuga",
    before: "Tere, Mari! Kas sa tuled täna",
    after: "kohvikusse?",
    answer: "minuga",
    options: ["minuga", "mind", "mulle"],
  },
  {
    id: "meiega",
    before: "Jaan tuleb ka",
    after: ".",
    answer: "meiega",
    options: ["meile", "meiega", "meid"],
  },
  {
    id: "sind",
    before: "Ma ootan",
    after: "kell viis.",
    answer: "sind",
    options: ["sulle", "sinuga", "sind"],
  },
  {
    id: "sulle",
    before: "Mul on",
    after: "raamat.",
    answer: "sulle",
    options: ["sulle", "sind", "sinuga"],
  },
  {
    id: "mulle",
    before: "Helista",
    after: "!",
    answer: "mulle",
    options: ["minuga", "mulle", "mind"],
  },
];

function useGaps(): GapItem[] {
  const why: Record<string, ReactNode> = {
    minuga: (
      <Trans>
        Coming with someone: <span lang="et">-ga</span> on <span lang="et">minu</span>.
      </Trans>
    ),
    meiega: (
      <Trans>
        With us: <span lang="et">-ga</span> on <span lang="et">meie</span>.
      </Trans>
    ),
    sind: (
      <Trans>
        After <span lang="et">ootan</span>, the partitive: <span lang="et">sind</span>.
      </Trans>
    ),
    sulle: (
      <Trans>
        For you, the one it goes to: <span lang="et">sulle</span>.
      </Trans>
    ),
    mulle: (
      <Trans>
        <span lang="et">Helista</span>, call, takes the person with <span lang="et">-le</span>:{" "}
        <span lang="et">mulle</span>, to me.
      </Trans>
    ),
  };
  return MESSAGE_GAPS.map((gap) => ({ ...gap, why: why[gap.id] }));
}
function CaseTable() {
  const { t, i18n } = useLingui();
  const [id, setId] = useState<PronounId>("mina");
  const person = PRONOUN_CASES.find((each) => each.id === id) as Person;
  const cell = (form: string | null, ending: string) =>
    form ? { form: ending ? lit(form, ending) : form, src: src(form) } : null;
  const rows: ParadigmRow[] = [
    {
      id: "kes",
      label: t`who`,
      ask: "kes?",
      tip: t`The form a dictionary lists first.`,
      cells: [cell(person.id, ""), cell(person.short, "")],
    },
    {
      id: "kelle",
      label: t`whose`,
      ask: "kelle?",
      tip: t`The genitive. Most other forms grow from it.`,
      cells: [cell(person.genitive, ""), cell(person.shortGenitive, "")],
    },
    {
      id: "keda",
      label: t`whom`,
      ask: "keda?",
      tip: (
        <Trans>
          The partitive, after a verb such as <span lang="et">ootama</span>: a short word of its
          own.
        </Trans>
      ),
      cells: [cell(person.partitive, ""), null],
    },
    {
      id: "kellega",
      label: t`with whom`,
      ask: "kellega?",
      tip: (
        <Trans>
          <span lang="et">-ga</span> on the genitive.
        </Trans>
      ),
      cells: [cell(pronounWith(person.genitive, "ga"), "ga"), null],
    },
    {
      id: "kelleta",
      label: t`without whom`,
      ask: "kelleta?",
      tip: (
        <Trans>
          <span lang="et">-ta</span> on the genitive.
        </Trans>
      ),
      cells: [cell(pronounWith(person.genitive, "ta"), "ta"), null],
    },
    {
      id: "kellele",
      label: t`to whom`,
      ask: "kellele?",
      tip: (
        <Trans>
          <span lang="et">-le</span>, to. Speech uses the short form.
        </Trans>
      ),
      cells: [cell(person.le, "le"), cell(person.shortLe, "le")],
    },
    {
      id: "kellel",
      label: t`who has`,
      ask: "kellel?",
      tip: (
        <Trans>
          <span lang="et">-l</span>, as in <span lang="et">mul on</span>. Speech uses the short
          form.
        </Trans>
      ),
      cells: [cell(person.l, "l"), cell(person.shortL, "l")],
    },
    {
      id: "kellelt",
      label: t`from whom`,
      ask: "kellelt?",
      tip: (
        <Trans>
          <span lang="et">-lt</span>, from. Speech uses the short form.
        </Trans>
      ),
      cells: [cell(person.lt, "lt"), cell(person.shortLt, "lt")],
    },
    {
      id: "kellest",
      label: t`about whom`,
      ask: "kellest?",
      tip: (
        <Trans>
          <span lang="et">-st</span>, out of, also says what you talk about.
        </Trans>
      ),
      cells: [cell(person.st, "st"), cell(person.shortSt, "st")],
    },
  ];
  return (
    <Panel>
      <Chips
        label={t`Pronoun`}
        items={PRONOUN_CASES.map((each) => ({ label: each.id, value: each.id, lang: "et" }))}
        value={id}
        onPick={setId}
      />
      <Paradigm
        key={id}
        label={t`Forms of ${person.id}`}
        columns={[t`Long`, t`Short`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{ title: i18n._(PERSON_NAMES[id]), tip: t`Tap a form to hear it.` }}
      />
    </Panel>
  );
}

export function AsesonadLesson() {
  const { t, i18n } = useLingui();
  const gaps = useGaps();
  const genitive = lessonBySlug("omastav")?.n;
  const withLesson = lessonBySlug("sobraga-rahata")?.n;
  const have = lessonBySlug("mul-on")?.n;
  const onto = lessonBySlug("laual-lauale-laualt")?.n;
  const partitive = lessonBySlug("osastav")?.n;
  const into = lessonBySlug("majas-majja-majast")?.n;

  const heardItems = useMemo<HeardItem[]>(() => {
    const first = HEARD.find(({ said }) => said === "Jaan küsib mult.");
    const rest = HEARD.filter((each) => each !== first);
    return [...(first ? [first] : []), ...rest].map(({ said, way, pair }) => ({
      said,
      pair,
      src: src(said),
      answer: way,
      options: wayOptions(PRONOUN_WAYS, i18n),
      explain: (
        <>
          <span lang="et" className="font-medium text-ink">
            {said}
          </span>{" "}
          {meaning(said, i18n)}
        </>
      ),
    }));
  }, [i18n]);

  const heardRun = (items: readonly HeardItem[], pinned?: HeardItem): HeardItem[] =>
    eachPairFirst(items, pinned).map((item) =>
      item === pinned ? item : { ...item, options: wayOptions(shuffledWays(), i18n) },
    );

  const buildItems = useMemo<BuildItem[]>(
    () =>
      BUILD.map(({ person, ending, form, pair }) => ({
        base: person.id,
        gloss:
          person.id === "nemad" ? (
            <Trans>
              they; genitive <span lang="et">nende</span>
            </Trans>
          ) : (
            i18n._(PERSON_NAMES[person.id])
          ),
        cue: i18n._(WITH_MEANS[person.id][ending]),
        answers: [form],
        src: src(form),
        pair,
        explain: (
          <Trans>
            <span lang="et">-{ending}</span> on the genitive{" "}
            <span lang="et">{person.genitive}</span>.
          </Trans>
        ),
      })),
    [i18n],
  );

  const matchPairs: MatchPair[] = PRONOUN_CASES.map((person) => ({
    id: person.partitive,
    left: person.partitive,
    right: i18n._(PARTITIVE_MEANS[person.id]),
    src: src(person.partitive),
  }));

  const rows = (list: readonly string[]) =>
    list.map((said) => ({
      main: <span lang="et">{said}</span>,
      sub: meaning(said, i18n),
      src: src(said),
    }));

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          A pronoun takes the case endings a noun does. Most go on its genitive, so{" "}
          <span lang="et">minuga</span> is with me. To, at and from have short forms such as{" "}
          <span lang="et">mulle</span>, and the partitive is its own word:{" "}
          <span lang="et">mind</span>, <span lang="et">sind</span>, <span lang="et">teda</span>.
        </Trans>
      }
      facts={[
        <Trans key="m">12 minutes</Trans>,
        <Trans key="q">3 quizzes and a message to fill in</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "minuga",
        "sinuta",
        "nendega",
        "mulle",
        "mul",
        "mult",
        "mind",
        "sind",
        "teda",
        "keda?",
        "kellega?",
        "kellele?",
        "ma räägin sinust",
      ]}
      recap={[
        <Trans key="1">
          <b lang="et">-ga</b> and <b lang="et">-ta</b> go on the genitive: <b lang="et">minuga</b>,
          with me; <b lang="et">sinuta</b>, without you; <b lang="et">nendega</b>, with them.
        </Trans>,
        <Trans key="2">
          For to, at and from, speech uses the short forms: <b lang="et">mulle, mul, mult</b>;{" "}
          <b lang="et">talle, tal, talt</b>; <b lang="et">meile, meil, meilt</b>.
        </Trans>,
        <Trans key="3">
          The long forms <b lang="et">minule, minul, minult</b> mean the same and put weight on the
          person.
        </Trans>,
        <Trans key="4">
          The partitive is a word of its own: <b lang="et">mind, sind, teda, meid, teid, neid</b>.{" "}
          <b lang="et">Ma ootan sind</b> is I’m waiting for you.
        </Trans>,
        <Trans key="5">
          Each form answers the same form of <b lang="et">kes</b>: <b lang="et">kellega?</b>,{" "}
          <b lang="et">kellele?</b>, <b lang="et">keda?</b>
        </Trans>,
      ]}
      sections={[
        {
          id: "with-me",
          title: t`With me, without you`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Minu" /> is my, the genitive from lesson {genitive}. Put an ending from
                    lesson {withLesson} on it, and you have with me and without me:{" "}
                    <Word w="minuga" />, <Word w="minuta" />.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Every pronoun works this way: <Word w="sinuta" />, without you;{" "}
                    <Word w="temaga" />, with him or her. For they, the genitive is{" "}
                    <Word w="nende" />, so with them is <Word w="nendega" />. Tap a line to hear it.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rows(PRONOUN_WITH)} />
              <Panel>
                <Paradigm
                  label={t`Each pronoun’s genitive, with -ga and with -ta`}
                  columns={[
                    t`Whose`,
                    t({ message: "With", context: "with or without" }),
                    t({ message: "Without", context: "with or without" }),
                  ]}
                  rows={PRONOUN_CASES.map((person) => ({
                    id: person.id,
                    label: i18n._(PERSON_NAMES[person.id]),
                    et: person.id,
                    cells: [
                      { form: person.genitive, src: src(person.genitive) },
                      ...(["ga", "ta"] as const).map((ending) => {
                        const form = pronounWith(person.genitive, ending);
                        return {
                          form: lit(form, ending),
                          src: src(form),
                          note: i18n._(WITH_MEANS[person.id][ending]),
                        };
                      }),
                    ],
                  }))}
                  empty={{ title: t`Tap a form`, tip: t`You’ll hear it and see what it means.` }}
                />
              </Panel>
              <Prose>
                <p>
                  <Trans>
                    Now build the form: put <span lang="et">-ga</span> or <span lang="et">-ta</span>{" "}
                    on the pronoun’s genitive.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="build-with-me"
                title={<Trans>With or without</Trans>}
                items={buildItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All of them, each ending on its genitive.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>
                      Nearly. Find the genitive first, then add <span lang="et">-ga</span> or{" "}
                      <span lang="et">-ta</span>.
                    </Trans>
                  ) : (
                    <Trans>Tap the forms in the table once more, then try again.</Trans>
                  )
                }
                recall={formRecall}
                order={eachPairFirst}
                round={(props) => <FormRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "short-forms",
          title: t`Short forms for to, at and from`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    For to, at and from, speech uses a short form: <Word w="mulle" />, to me;{" "}
                    <Word w="mul" />, at me, as in <span lang="et">mul on</span> from lesson {have};{" "}
                    <Word w="mult" />, from me. These are the endings <span lang="et">-le</span>,{" "}
                    <span lang="et">-l</span> and <span lang="et">-lt</span> from lesson {onto}, on
                    a short stem.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The long forms <Word w="minule" />, <Word w="minul" /> and <Word w="minult" />{" "}
                    mean the same and put weight on the person. For we and you, say{" "}
                    <span lang="et">meile</span> and <span lang="et">teile</span>. Tap a line to
                    hear it.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rows(PRONOUN_SHORT)} />
              <Panel>
                <Paradigm
                  label={t`Each pronoun’s short forms for to, at and from`}
                  columns={[t`To`, t`At, has`, t`From`]}
                  rows={PRONOUN_CASES.map((person) => ({
                    id: person.id,
                    label: i18n._(PERSON_NAMES[person.id]),
                    et: person.id,
                    cells: PRONOUN_WAYS.map((way) => {
                      const form = pronounShort(person, way);
                      const said = pronounSentence(way, form);
                      return { form: lit(form, way), src: src(form), note: meaning(said, i18n) };
                    }),
                  }))}
                  empty={{
                    title: t`Tap a form`,
                    tip: t`You’ll hear it and see a sentence with it.`,
                  }}
                />
              </Panel>
              <Prose>
                <p>
                  <Trans>
                    Now hear a line and pick what the pronoun says. The ending tells you:{" "}
                    <span lang="et">-le</span>, <span lang="et">-l</span> or{" "}
                    <span lang="et">-lt</span>.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="to-at-or-from"
                title={<Trans>To, at or from?</Trans>}
                items={heardItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All of them. You heard each ending.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed and listen to the last sound.</Trans>
                  ) : (
                    <Trans>Tap the forms in the table once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: item.src })}
                order={heardRun}
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "partitive",
          title: t`The partitive: me, you, him or her`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    After a verb such as <Word w="ootan" />, I’m waiting, or{" "}
                    <span lang="et">armastan</span>, I love, the person takes the partitive from
                    lesson {partitive}. <Word w="Ma armastan sind" /> is I love you. A pronoun’s
                    partitive doesn’t grow from the genitive, so learn the six as they are.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    They are <Word w="mind" />, <Word w="sind" />, <Word w="teda" />,{" "}
                    <Word w="meid" />, <Word w="teid" /> and <Word w="neid" />. To ask whom, say{" "}
                    <Word w="keda?" /> Tap a line to hear it.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rows(PRONOUN_PARTITIVE)} />
              <Prose>
                <p>
                  <Trans>Match each form with the person it names.</Trans>
                </p>
              </Prose>
              <Match id="whom" title={<Trans>Who is it?</Trans>} pairs={matchPairs} />
            </>
          ),
        },
        {
          id: "every-case",
          title: t`The forms of a pronoun`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    The table shows one pronoun in each case of this lesson. Beside each form is the
                    question that asks for it, a form of <span lang="et">kes</span>, who:{" "}
                    <Word w="kellega?" />, with whom; <Word w="kellele?" />, to whom.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The ending <span lang="et">-st</span>, out of, from lesson {into}, also says
                    what you talk about: <Word w="Ma räägin sinust" /> is I’m talking about you.
                    Pick a pronoun, then tap a form to hear it.
                  </Trans>
                </p>
              </Prose>
              <CaseTable />
            </>
          ),
        },
        {
          id: "message",
          title: t`Kati’s message`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kati invites Mari for a coffee. Pick the form for each gap: the words around it
                    say which case fits.
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="kati-message"
                title={<Trans>Fill the gaps</Trans>}
                gaps={gaps}
                mode="pick"
                clip="p-message"
              />
            </>
          ),
        },
      ]}
    />
  );
}
