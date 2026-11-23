import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  WHEN_AROUND,
  WHEN_COMBINED,
  WHEN_EVERY,
  WHEN_FIX,
  WHEN_FROM,
  WHEN_HEARD,
  WHEN_L,
  WHEN_S,
  WHEN_SORT,
  WHEN_SPANS,
  WHEN_TALK,
  WHEN_TRANSLATE,
} from "../../../lib/learn/clips";
import type { PassageQuestion } from "../../../lib/learn/questions";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { ListenRows, Panel } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import { type GapItem, GapPassage } from "../GapPassage";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Paradigm } from "../Paradigm";
import { Listening } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Sort, type SortBin, type SortItem } from "../Sort";
import { Word } from "../Word";

const SLUG = "millal";
const src = (text: string) => clipUrl(SLUG, clipId(text));

const MEANS: Record<string, MessageDescriptor> = {
  "Ma joon hommikul kohvi.": msg`I drink coffee in the morning.`,
  "Jaan töötab päeval.": msg`Jaan works in the daytime.`,
  "Me oleme õhtul kodus.": msg`We’re at home in the evening.`,
  "Kass magab öösel.": msg`The cat sleeps at night.`,
  "Mari tuleb kevadel.": msg`Mari is coming in spring.`,
  "Me ujume suvel jões.": msg`We swim in the river in summer.`,
  "Kati läheb sügisel kooli.": msg`Kati starts school in autumn.`,
  "Ta elab talvel Tartus.": msg`In winter he or she lives in Tartu.`,
  "Ma olen jaanuaris Tallinnas.": msg`I’m in Tallinn in January.`,
  "Mari sünnipäev on mais.": msg`Mari’s birthday is in May.`,
  "Me oleme juulis Pärnus.": msg`We’re in Pärnu in July.`,
  "Jaan tuleb detsembris.": msg`Jaan is coming in December.`,
  "Me läheme laupäeva õhtul kohvikusse.": msg`We’re going to a café on Saturday evening.`,
  "Ma töötan esmaspäeva hommikul.": msg`I work on Monday morning.`,
  "Ma joon hommikuti kohvi.": msg`I drink coffee in the mornings.`,
  "Jaan töötab õhtuti.": msg`Jaan works evenings.`,
  "Me ujume laupäeviti.": msg`We swim on Saturdays.`,
  "Ma tulen nädala pärast.": msg`I’ll come in a week.`,
  "Ma olin Tartus nädal tagasi.": msg`I was in Tartu a week ago.`,
  "Mari tuleb kahe päeva pärast.": msg`Mari is coming in two days.`,
  "Jaan helistas kaks päeva tagasi.": msg`Jaan called two days ago.`,
  "Me läheme Pärnusse aasta pärast.": msg`We’re going to Pärnu in a year.`,
  "Kati elas siin aasta tagasi.": msg`Kati lived here a year ago.`,
  "Ma tulen pärast tööd.": msg`I’ll come after work.`,
  "Ma joon enne tööd kohvi.": msg`I drink coffee before work.`,
  "Mari läheb pärast kooli koju.": msg`Mari goes home after school.`,
  "Helista mulle enne kella viit!": msg`Call me before five o’clock.`,
  "Pood on avatud esmaspäevast reedeni.": msg`The shop is open from Monday to Friday.`,
  "Ma töötan kella kaheksast kella viieni.": msg`I work from eight to five.`,
  "Me oleme Pärnus juunist augustini.": msg`We’re in Pärnu from June to August.`,
};

const GLOSSARY: Glossary = {
  millal: { en: msg`when`, show: "Millal?" },
  hommikul: { en: msg`in the morning`, note: msg`From hommik, morning.` },
  õhtul: { en: msg`in the evening`, note: msg`From õhtu, evening.` },
  öösel: { en: msg`at night`, note: msg`From öö, night: it takes -sel, not -l.` },
  suvel: { en: msg`in summer`, note: msg`From suvi, summer.` },
  talvel: { en: msg`in winter`, note: msg`From talv, winter.` },
  esmaspäeval: { en: msg`on Monday` },
  mais: { en: msg`in May`, note: msg`From mai, May.` },
  juulis: { en: msg`in July`, note: msg`From juuli, July.` },
  "laupäeva õhtul": { en: msg`on Saturday evening` },
  hommikuti: { en: msg`in the mornings, every morning` },
  õhtuti: { en: msg`in the evenings, every evening` },
  "nädala pärast": { en: msg`in a week`, note: msg`Nädala is the genitive of nädal, week.` },
  "nädal tagasi": { en: msg`a week ago` },
  "kahe päeva pärast": { en: msg`in two days`, note: msg`Kahe päeva: two days, in the genitive.` },
  "kaks päeva tagasi": { en: msg`two days ago` },
  "pärast tööd": { en: msg`after work`, note: msg`Tööd is the partitive of töö, work.` },
  "enne tööd": { en: msg`before work` },
  "kella kaheksast": { en: msg`from eight o’clock` },
  "kella viieni": { en: msg`until five o’clock` },
  "esmaspäevast reedeni": { en: msg`from Monday to Friday` },
};

const SPAN_MEANS: Record<
  (typeof WHEN_SPANS)[number]["id"],
  { ago: MessageDescriptor; in: MessageDescriptor }
> = {
  paev: { ago: msg`a day ago`, in: msg`in a day` },
  nadal: { ago: msg`a week ago`, in: msg`in a week` },
  aasta: { ago: msg`a year ago`, in: msg`in a year` },
  "kaks-paeva": { ago: msg`two days ago`, in: msg`in two days` },
  "kolm-nadalat": { ago: msg`three weeks ago`, in: msg`in three weeks` },
};

const SPAN_GLOSS: Record<(typeof WHEN_SPANS)[number]["id"], MessageDescriptor> = {
  paev: msg`day`,
  nadal: msg`week`,
  aasta: msg`year`,
  "kaks-paeva": msg`two days`,
  "kolm-nadalat": msg`three weeks`,
};

const HEARD_MEANS: Record<(typeof WHEN_HEARD)[number]["said"], MessageDescriptor> = {
  "Ma tulen nädala pärast.": msg`In a week`,
  "Ma olin Tartus nädal tagasi.": msg`A week ago`,
  "Ma tulen pärast tööd.": msg`After work`,
  "Mari tuleb kahe päeva pärast.": msg`In two days`,
  "Jaan helistas kaks päeva tagasi.": msg`Two days ago`,
  "Mari läheb pärast kooli koju.": msg`After school`,
};

const TRANSLATE_PROMPTS: Record<(typeof WHEN_TRANSLATE)[number]["id"], MessageDescriptor> = {
  hommikul: msg`I work in the morning.`,
  juulis: msg`We’re in Pärnu in July.`,
  "nadala-parast": msg`I’ll come in a week.`,
  "kaks-paeva-tagasi": msg`Jaan was here two days ago.`,
  "parast-tood": msg`After work I go home.`,
  esmaspaevast: msg`The shop is open from Monday to Friday.`,
};

const meaning = (said: string, i18n: I18n) => i18n._(MEANS[said] as MessageDescriptor);

type SpanItem = FormItem & { pair: readonly [string, string] };
type HeardItem = ChoiceItem & { said: string; pair: readonly [string, string] };

const HEARD_SAID = WHEN_HEARD.map(({ said }) => said);

const heardLabel = (said: string, i18n: I18n) => (
  <span lang={i18n.locale}>{i18n._(HEARD_MEANS[said as keyof typeof HEARD_MEANS])}</span>
);

export function heardOptions(said: string): string[] {
  return shuffle([said, ...shuffle(HEARD_SAID.filter((each) => each !== said)).slice(0, 2)]);
}

const SHOP_GAPS: readonly GapItem[] = [
  {
    id: "esmaspaevast",
    before: "Tere! Meie pood on avatud",
    after: "reedeni.",
    answer: "esmaspäevast",
    options: ["esmaspäeval", "esmaspäevast", "esmaspäevani"],
  },
  {
    id: "kuueni",
    before: "Me töötame kella üheksast kella",
    after: ".",
    answer: "kuueni",
    options: ["kuueni", "kuuest", "kuuel"],
  },
  {
    id: "kumnest",
    before: "Laupäeval oleme avatud kella",
    after: "kella kolmeni.",
    answer: "kümnest",
    options: ["kümneni", "kümnel", "kümnest"],
  },
  {
    id: "puhapaeval",
    before: "",
    after: "on pood suletud.",
    answer: "Pühapäeval",
    options: ["Pühapäevast", "Pühapäeval", "Pühapäevani"],
  },
  {
    id: "juulis",
    before: "",
    after: "on pood suletud.",
    answer: "Juulis",
    options: ["Juulis", "Juulil", "Juulini"],
  },
];

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const why: Record<string, ReactNode> = {
      esmaspaevast: (
        <Trans>
          From one day to another: <span lang="et">-st</span>, then <span lang="et">-ni</span>.
        </Trans>
      ),
      kuueni: (
        <Trans>
          Until six: <span lang="et">-ni</span> on <span lang="et">kuue</span>, the genitive of{" "}
          <span lang="et">kuus</span>.
        </Trans>
      ),
      kumnest: (
        <Trans>
          From ten: <span lang="et">-st</span> on <span lang="et">kümne</span>, the genitive of{" "}
          <span lang="et">kümme</span>.
        </Trans>
      ),
      puhapaeval: (
        <Trans>
          On a day: <span lang="et">-l</span>.
        </Trans>
      ),
      juulis: (
        <Trans>
          In a month: <span lang="et">-s</span>.
        </Trans>
      ),
    };
    const gaps = SHOP_GAPS.map((gap) => ({ ...gap, why: why[gap.id] }));

    const translateWhy: Record<(typeof WHEN_TRANSLATE)[number]["id"], ReactNode> = {
      hommikul: (
        <Trans>
          A part of the day takes <span lang="et">-l</span>: <span lang="et">hommikul</span>.
        </Trans>
      ),
      juulis: (
        <Trans>
          A month takes <span lang="et">-s</span>: <span lang="et">juulis</span>.
        </Trans>
      ),
      "nadala-parast": (
        <Trans>
          In a week: the genitive before <span lang="et">pärast</span>,{" "}
          <span lang="et">nädala pärast</span>.
        </Trans>
      ),
      "kaks-paeva-tagasi": (
        <Trans>
          Ago: the time as it is counted, then <span lang="et">tagasi</span>:{" "}
          <span lang="et">kaks päeva tagasi</span>.
        </Trans>
      ),
      "parast-tood": (
        <Trans>
          After work: <span lang="et">pärast</span> before the partitive,{" "}
          <span lang="et">pärast tööd</span>.
        </Trans>
      ),
      esmaspaevast: (
        <Trans>
          From and until: <span lang="et">-st</span> and <span lang="et">-ni</span>.
        </Trans>
      ),
    };
    const sentences: SentenceItem[] = WHEN_TRANSLATE.map(({ id, answers }) => ({
      kind: "translate",
      id,
      prompt: i18n._(TRANSLATE_PROMPTS[id]),
      answers,
      src: src(answers[0]),
      explain: translateWhy[id],
    }));

    const fixWhy: Record<(typeof WHEN_FIX)[number]["id"], ReactNode> = {
      "fix-nadala": (
        <Trans>
          In a week: the genitive <span lang="et">nädala</span> before <span lang="et">pärast</span>
          .
        </Trans>
      ),
      "fix-nadal": (
        <Trans>
          A week ago: <span lang="et">nädal</span> as it is, then <span lang="et">tagasi</span>.
        </Trans>
      ),
      "fix-suvel": (
        <Trans>
          A season takes <span lang="et">-l</span>: <span lang="et">suvel</span>.
        </Trans>
      ),
      "fix-mais": (
        <Trans>
          In a month is <span lang="et">-s</span>: <span lang="et">mais</span>.{" "}
          <span lang="et">Mail</span> says on a day of May, as in{" "}
          <span lang="et">viiendal mail</span>.
        </Trans>
      ),
      "fix-tood": (
        <Trans>
          <span lang="et">Pärast</span> before a noun takes the partitive:{" "}
          <span lang="et">pärast tööd</span>.
        </Trans>
      ),
      "fix-kaheksast": (
        <Trans>
          From eight: <span lang="et">kella kaheksast</span>, with <span lang="et">-st</span>.
        </Trans>
      ),
    };
    const fix: FixItem[] = WHEN_FIX.map(({ id, wrong, answers }) => ({
      kind: "fix",
      id,
      wrong,
      answers,
      src: src(answers[0]),
      explain: fixWhy[id],
    }));

    const talk: PassageQuestion[] = [
      { id: "where", kind: "truefalse", ask: t`Jaan is in Tallinn now.`, answer: false, line: 3 },
      {
        id: "coming",
        ask: t`When is Jaan coming to Tallinn?`,
        options: [
          { id: "two-weeks", label: t`In two weeks` },
          { id: "week", label: t`In a week` },
          { id: "two-days", label: t`In two days` },
        ],
        answer: "week",
        line: 4,
      },
      {
        id: "last",
        ask: t`When was Jaan last in Tallinn?`,
        options: [
          { id: "three-weeks", label: t`Three weeks ago` },
          { id: "two-weeks", label: t`Two weeks ago` },
          { id: "two-days", label: t`Two days ago` },
        ],
        answer: "three-weeks",
        line: 7,
      },
      {
        id: "hours",
        ask: t`What hours does Jaan work?`,
        options: [
          { id: "8-12", label: t`From eight to twelve` },
          { id: "9-12", label: t`From nine to twelve` },
          { id: "8-4", label: t`From eight to four` },
        ],
        answer: "8-4",
        line: 10,
      },
      {
        id: "cafe",
        kind: "truefalse",
        ask: t`Kati is going to a café with Mari on Monday evening.`,
        answer: true,
        line: 13,
      },
      {
        id: "mari-came",
        ask: t`When did Mari come to Tallinn?`,
        options: [
          { id: "two-days-ago", label: t`Two days ago` },
          { id: "in-two-days", label: t`In two days` },
          { id: "two-weeks-ago", label: t`Two weeks ago` },
        ],
        answer: "two-days-ago",
        line: 17,
      },
      {
        id: "saturday",
        kind: "truefalse",
        ask: t`Mari works on Saturdays.`,
        answer: false,
        line: 21,
      },
      {
        id: "month",
        kind: "short",
        ask: t`In which month is Jaan in Pärnu? Write it as he says it.`,
        answers: ["juulis", "juuli"],
        line: 22,
      },
      {
        id: "island",
        ask: t`How long is Kati going to Saaremaa?`,
        options: [
          { id: "month", label: t`For a month` },
          { id: "two-weeks", label: t`For two weeks` },
          { id: "two-days", label: t`For two days` },
        ],
        answer: "two-weeks",
        line: 28,
      },
    ];

    return { gaps, sentences, fix, talk };
  }, [t, i18n]);
}

export function MillalLesson() {
  const { t, i18n } = useLingui();
  const content = useContent();
  const days = lessonBySlug("paevad")?.n;
  const clock = lessonBySlug("kell")?.n;
  const ordinals = lessonBySlug("jargarvud")?.n;
  const partitive = lessonBySlug("osastav")?.n;
  const until = lessonBySlug("sobraga-rahata")?.n;
  const genitive = lessonBySlug("omastav")?.n;
  const places = lessonBySlug("kohad")?.n;

  const rows = (list: readonly string[]) =>
    list.map((said) => ({
      main: <span lang="et">{said}</span>,
      sub: meaning(said, i18n),
      src: src(said),
    }));

  const bins: SortBin[] = [
    {
      id: "s",
      label: t`In a month: -s`,
      lang: i18n.locale,
      rule: (
        <Trans>
          Months take <span lang="et">-s</span>: <span lang="et">mais</span>, in May.
        </Trans>
      ),
    },
    {
      id: "l",
      label: t`Days, times of day, seasons: -l`,
      lang: i18n.locale,
      rule: (
        <Trans>
          Days, parts of the day and seasons take <span lang="et">-l</span>:{" "}
          <span lang="et">suvel</span>, in summer.
        </Trans>
      ),
    },
  ];
  const sorted: SortItem[] = WHEN_SORT.map(({ w, bin }) => ({ w, bin, src: src(w) }));

  const spanItems = useMemo<SpanItem[]>(
    () =>
      WHEN_SPANS.flatMap((span) =>
        (["ago", "in"] as const).map((way) => ({
          base: span.one,
          gloss: i18n._(SPAN_GLOSS[span.id]),
          cue: i18n._(SPAN_MEANS[span.id][way]),
          answers: [span[way]],
          src: src(span[way]),
          pair: [way, `${span.id}-${way}`] as const,
          explain:
            way === "in" ? (
              <Trans>
                In: the genitive, then <span lang="et">pärast</span>.
              </Trans>
            ) : (
              <Trans>
                Ago: the time as it is counted, then <span lang="et">tagasi</span>.
              </Trans>
            ),
        })),
      ),
    [i18n],
  );

  const labelOf = (said: string) => heardLabel(said, i18n);
  const heardItems = useMemo<HeardItem[]>(
    () =>
      WHEN_HEARD.map(({ said, kind }, i) => {
        const others = HEARD_SAID.filter((each) => each !== said);
        const three = [
          said,
          others[i % others.length] as string,
          others[(i + 2) % others.length] as string,
        ];
        const turn = i === 0 ? 1 : i % 3;
        return {
          said,
          pair: [kind, said] as const,
          src: src(said),
          answer: said,
          options: [...three.slice(turn), ...three.slice(0, turn)].map((id) => ({
            id,
            label: heardLabel(id, i18n),
          })),
          explain: (
            <>
              <span lang="et" className="font-medium text-ink">
                {said}
              </span>{" "}
              {meaning(said, i18n)}
            </>
          ),
        };
      }),
    [i18n],
  );
  const heardRun = (items: readonly HeardItem[], pinned?: HeardItem): HeardItem[] =>
    eachPairFirst(items, pinned).map((item) =>
      item === pinned
        ? item
        : { ...item, options: heardOptions(item.said).map((id) => ({ id, label: labelOf(id) })) },
    );

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          A day, a part of the day or a season takes <span lang="et">-l</span>, as in{" "}
          <span lang="et">suvel</span>; a month takes <span lang="et">-s</span>, as in{" "}
          <span lang="et">mais</span>. In a week is <span lang="et">nädala pärast</span>, and a week
          ago is <span lang="et">nädal tagasi</span>.
        </Trans>
      }
      facts={[
        <Trans key="m">18 minutes</Trans>,
        <Trans key="q">6 exercises, 3 of them typed, and a conversation</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "millal",
        "hommikul",
        "õhtul",
        "öösel",
        "suvel",
        "talvel",
        "mais",
        "hommikuti",
        "nädala pärast",
        "nädal tagasi",
        "pärast tööd",
        "enne tööd",
        "esmaspäevast reedeni",
      ]}
      recap={[
        <Trans key="1">
          A day, a part of the day or a season takes <b lang="et">-l</b>:{" "}
          <b lang="et">esmaspäeval, hommikul, suvel</b>. <b lang="et">Öö</b> gives{" "}
          <b lang="et">öösel</b>.
        </Trans>,
        <Trans key="2">
          A month takes <b lang="et">-s</b>: <b lang="et">mais, juulis</b>. Every morning is{" "}
          <b lang="et">hommikuti</b>, with <b lang="et">-ti</b>.
        </Trans>,
        <Trans key="3">
          In a week, in two days: the genitive before <b lang="et">pärast</b>,{" "}
          <b lang="et">nädala pärast</b>. Ago: the time as it is counted before{" "}
          <b lang="et">tagasi</b>, <b lang="et">kaks päeva tagasi</b>.
        </Trans>,
        <Trans key="4">
          Before or after something: <b lang="et">enne</b> or <b lang="et">pärast</b> before its
          partitive, <b lang="et">pärast tööd</b>.
        </Trans>,
        <Trans key="5">
          From and until: <b lang="et">-st</b> and <b lang="et">-ni</b>,{" "}
          <b lang="et">kella kaheksast kella viieni</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "parts",
          title: t`In the morning, in summer: -l`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In lesson {days}, on Monday was <Word w="esmaspäeval" />, with{" "}
                    <span lang="et">-l</span>. Parts of the day and seasons take the same ending:{" "}
                    <Word w="hommikul" />, in the morning; <Word w="õhtul" />, in the evening;{" "}
                    <Word w="suvel" />, in summer; <Word w="talvel" />, in winter.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Night is the one to learn apart: <span lang="et">öö</span> gives{" "}
                    <Word w="öösel" />. Put a day in the genitive before a part of it:{" "}
                    <Word w="laupäeva õhtul" />, on Saturday evening. Tap a line to hear it.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rows([...WHEN_L.map(({ said }) => said), ...WHEN_COMBINED])} />
            </>
          ),
        },
        {
          id: "months",
          title: t`In May: -s`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    A month takes <span lang="et">-s</span>, the ending for “in” from lesson{" "}
                    {places}: <Word w="mais" />, in May; <Word w="juulis" />, in July. The months
                    keep their small letter.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    On a date it is <span lang="et">-l</span> again, as in lesson {ordinals}:{" "}
                    <span lang="et">viiendal mail</span>, on the fifth of May. Tap a line to hear
                    it.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rows(WHEN_S.map(({ said }) => said))} />
              <Prose>
                <p>
                  <Trans>Sort the words: which take -s, and which take -l?</Trans>
                </p>
              </Prose>
              <Sort id="s-or-l" title={<Trans>-s or -l?</Trans>} bins={bins} items={sorted} />
            </>
          ),
        },
        {
          id: "every",
          title: t`Every morning: -ti`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    For something that happens again and again, put <span lang="et">-ti</span> on
                    the genitive: <span lang="et">hommiku</span>, so <Word w="hommikuti" />, in the
                    mornings; <Word w="õhtuti" />, in the evenings. At night is{" "}
                    <span lang="et">öösiti</span>. Days ending in <span lang="et">päev</span> take{" "}
                    <span lang="et">-iti</span>: <span lang="et">laupäeviti</span>, on Saturdays.
                    Tap a line to hear it.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rows(WHEN_EVERY)} />
            </>
          ),
        },
        {
          id: "ago-in",
          title: t`In a week, a week ago`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In a week is <Word w="nädala pärast" />: the genitive from lesson {genitive},
                    then <span lang="et">pärast</span>. A week ago is <Word w="nädal tagasi" />: the
                    time as you count it, then <span lang="et">tagasi</span>.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    With a number the difference shows most. Two days ago is{" "}
                    <Word w="kaks päeva tagasi" />, the partitive after a number as in lesson{" "}
                    {partitive}; in two days is <Word w="kahe päeva pärast" />, both words in the
                    genitive. Tap a form to hear it.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Paradigm
                  label={t`Ago and in`}
                  columns={[t`Ago`, t`In`]}
                  rows={WHEN_SPANS.map((span) => ({
                    id: span.id,
                    label: i18n._(SPAN_GLOSS[span.id]),
                    et: span.one,
                    cells: (["ago", "in"] as const).map((way) => {
                      const form = span[way];
                      const cut = form.lastIndexOf(" ");
                      return {
                        form: `${form.slice(0, cut)} |${form.slice(cut + 1)}`,
                        src: src(form),
                        note: i18n._(SPAN_MEANS[span.id][way]),
                      };
                    }),
                  }))}
                  highlight={{ column: 1 }}
                  empty={{ title: t`Tap a form`, tip: t`You’ll hear it and see what it means.` }}
                />
              </Panel>
              <Aside>
                <Trans>
                  You will also hear <span lang="et">kahe päeva eest</span>, two days ago: the
                  genitive, then <span lang="et">eest</span>. It means the same as{" "}
                  <span lang="et">kaks päeva tagasi</span>.
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>Now type each one: ago or in, as the cue says.</Trans>
                </p>
              </Prose>
              <Quiz
                id="ago-or-in"
                title={<Trans>Ago or in</Trans>}
                items={spanItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All of them: the genitive before pärast, the count before tagasi.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check which word goes into the genitive.</Trans>
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
          id: "before-after",
          title: t`Before work, after work`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <span lang="et">Pärast</span> also comes before a noun, and then it means after:{" "}
                    <Word w="pärast tööd" />, after work. <span lang="et">Enne</span> works the same
                    way: <Word w="enne tööd" />, before work. The noun takes its partitive.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    So the place of <span lang="et">pärast</span> tells you which it is.{" "}
                    <span lang="et">Nädala pärast</span> is in a week;{" "}
                    <span lang="et">pärast tööd</span> is after work. Tap a line to hear it.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rows(WHEN_AROUND)} />
              <Prose>
                <p>
                  <Trans>Hear a sentence and pick when it happens.</Trans>
                </p>
              </Prose>
              <Quiz
                id="in-ago-or-after"
                title={<Trans>When does it happen?</Trans>}
                items={heardItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>
                      All six: in, ago and after, told apart by where pärast stands and by tagasi.
                    </Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Listen for where pärast stands and for tagasi.</Trans>
                  ) : (
                    <Trans>Tap the lines above once more, then try again.</Trans>
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
          id: "from-until",
          title: t`From Monday to Friday`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    From is <span lang="et">-st</span>, and until is <span lang="et">-ni</span> from
                    lesson {until}: <Word w="esmaspäevast reedeni" />, from Monday to Friday. Both
                    go on the genitive.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    With the clock from lesson {clock}, the hour takes them, and{" "}
                    <span lang="et">kella</span> comes before it: <Word w="kella kaheksast" />,{" "}
                    <Word w="kella viieni" />. Tap a line to hear it.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rows(WHEN_FROM)} />
              <Prose>
                <p>
                  <Trans>
                    A shop leaves a message about its hours. Pick the word for each gap.
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="shop-hours"
                title={<Trans>Fill the gaps</Trans>}
                gaps={content.gaps}
                mode="pick"
                clip="p-shop"
              />
            </>
          ),
        },
        {
          id: "write",
          title: t`Write the time`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Write each sentence in Estonian. The time word can go after the verb, as in the
                    lines above.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="write-when"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.sentences}
                rounds={content.sentences.length}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six sentences, every time word in its form.</Trans>
                  ) : share >= 0.6 ? (
                    <Trans>Most of them. Read the reason under each one you missed.</Trans>
                  ) : (
                    <Trans>Go back through the lines above, then try again.</Trans>
                  )
                }
                recall={sentenceRecall}
                round={(props) => <SentenceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "mistakes",
          title: t`Six mistakes to catch`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In each sentence, one word that says when is wrong. Tap it, then type it right.
                  </Trans>
                </p>
              </Prose>
              <Aside>
                <Trans>
                  <span lang="et">Mail</span> is a real word: on a day of May, as in{" "}
                  <span lang="et">viiendal mail</span>. In May, with no day, is{" "}
                  <span lang="et">mais</span>.
                </Trans>
              </Aside>
              <Quiz
                id="fix-when"
                title={<Trans>Fix the sentence</Trans>}
                items={content.fix}
                rounds={content.fix.length}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six found and fixed.</Trans>
                  ) : share >= 0.6 ? (
                    <Trans>Most of them. Read the reason under each one you missed.</Trans>
                  ) : (
                    <Trans>Read What to remember at the end, then try again.</Trans>
                  )
                }
                recall={fixRecall}
                round={(props) => <FixRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "talk",
          title: t`When are you coming?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Kati and Jaan plan when to meet, and talk about their year.</Trans>
                </p>
              </Prose>
              <Listening
                id="kati-and-jaan"
                title={<Trans>Listen: Kati and Jaan</Trans>}
                clip="c-talk"
                turns={WHEN_TALK.turns}
                names={{ main: t`Jaan`, second: t`Kati` }}
                questions={content.talk}
                plays={2}
              />
            </>
          ),
        },
      ]}
    />
  );
}
