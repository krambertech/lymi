import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  FUTURE_BUILD,
  FUTURE_DIALOGUE,
  FUTURE_FIX,
  FUTURE_HAKKAMA,
  FUTURE_REWRITE,
  FUTURE_SORT,
  FUTURE_TALK,
  FUTURE_TIMELINE,
  FUTURE_WHEN,
} from "../../../lib/learn/clips";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { Keys, Panel } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { type OrderItem, OrderRound } from "../OrderRound";
import { Lit } from "../Paradigm";
import { Listening, type PassageQuestion } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Sort, type SortBin, type SortItem } from "../Sort";
import { Timeline, type TimelinePoint } from "../Timeline";
import { Word } from "../Word";

const SLUG = "tulevik";
const src = (text: string) => clipUrl(SLUG, clipId(text));

function End({ children }: { children: ReactNode }) {
  return (
    <span lang="et" className="whitespace-nowrap">
      -{children}
    </span>
  );
}

function Nowrap({ children }: { children: ReactNode }) {
  return <span className="whitespace-nowrap">{children}</span>;
}

function Et({ children }: { children: ReactNode }) {
  return <span lang="et">{children}</span>;
}

const GLOSSARY: Glossary = {
  tulevik: { en: msg`the future` },
  homme: { en: msg`tomorrow` },
  täna: { en: msg`today` },
  ülehomme: { en: msg`the day after tomorrow` },
  "järgmisel nädalal": {
    en: msg`next week`,
    note: msg`Järgmine nädal, next week, with the -l that says when.`,
  },
  "eelmisel nädalal": { en: msg`last week` },
  "homme lähen tartusse": {
    en: msg`Tomorrow I’m going to Tartu.`,
    show: "Homme lähen Tartusse.",
    note: msg`Also: Tomorrow I’ll go to Tartu.`,
  },
  "täna lähen tartusse": { en: msg`Today I’m going to Tartu.`, show: "Täna lähen Tartusse." },
  "homme saab olema külm": {
    en: msg`It will be cold tomorrow.`,
    show: "Homme saab olema külm.",
    note: msg`Saab, from saama, with the -ma infinitive of olema.`,
  },
  "homme on külm": { en: msg`It will be cold tomorrow.`, show: "Homme on külm." },
  hakkama: { en: msg`to start` },
  hakkan: {
    en: msg`I start; I’m going to`,
    note: msg`From hakkama, with the -ma infinitive after it.`,
  },
  "ma hakkan tartus elama": {
    en: msg`I’m going to live in Tartu.`,
    show: "Ma hakkan Tartus elama.",
    note: msg`Word for word: “I start to live in Tartu”.`,
  },
  "homme hakkab vihma sadama": {
    en: msg`Tomorrow it’s going to rain.`,
    show: "Homme hakkab vihma sadama.",
    note: msg`Word for word: “tomorrow rain starts to fall”. Vihma is the partitive of vihm, rain; sadama is to fall, of rain or snow.`,
  },
  kavatsema: { en: msg`to intend` },
  kavatsen: {
    en: msg`I intend, I’m planning`,
    note: msg`From kavatsema, with the -da infinitive after it.`,
  },
  plaanima: { en: msg`to plan` },
  plaanin: { en: msg`I plan`, note: msg`From plaanima, with the -da infinitive after it.` },
  "ma kavatsen järgmisel nädalal tallinnasse minna.": {
    en: msg`I’m planning to go to Tallinn next week.`,
    show: "Ma kavatsen järgmisel nädalal Tallinnasse minna.",
    note: msg`Minna is the -da infinitive of minema, to go.`,
  },
  "mida sa plaanid homme teha?": {
    en: msg`What are you planning to do tomorrow?`,
    show: "Mida sa plaanid homme teha?",
    note: msg`Teha is the -da infinitive of tegema, to do.`,
  },
};

const TIME_LABELS: Record<(typeof FUTURE_TIMELINE)[number]["id"], MessageDescriptor> = {
  yesterday: msg`Yesterday`,
  today: msg`Today`,
  tomorrow: msg`Tomorrow`,
  "next-week": msg`Next week`,
};

const LINE_MEANS: Record<string, MessageDescriptor> = {
  "Eile läksin Tartusse.": msg`Yesterday I went to Tartu.`,
  "Täna lähen Tartusse.": msg`Today I’m going to Tartu.`,
  "Homme lähen Tartusse.": msg`Tomorrow I’m going to Tartu.`,
  "Järgmisel nädalal lähen Tartusse.": msg`Next week I’m going to Tartu.`,
  "Järgmisel nädalal hakkan Tartus õppima.": msg`Next week I’m starting to study in Tartu.`,
};

const PIECE_NOTES: Record<string, MessageDescriptor> = {
  "läks|in": msg`the past, for I`,
  "lähe|n": msg`the present, for I`,
  "hakka|n": msg`I start: the present, for I`,
  "õppi|ma": msg`what will start: to study`,
};

const HAKKAMA_MEANS: Record<(typeof FUTURE_HAKKAMA)[number]["lead"], MessageDescriptor> = {
  hakkan: msg`I’m going to live in Tartu.`,
  hakkad: msg`Are you going to work at home?`,
  hakkab: msg`Tomorrow it’s going to rain.`,
  hakkame: msg`We’re going to speak Estonian.`,
  hakkate: msg`When are you going to eat?`,
  hakkavad: msg`The children are going to start playing.`,
};

function HakkamaTip({ lead }: { lead: (typeof FUTURE_HAKKAMA)[number]["lead"] }) {
  switch (lead) {
    case "hakkan":
      return (
        <Trans>
          <Et>Hakka-</Et> with <End>n</End> for I, and <Et>elama</Et>, to live, stays as it is.
        </Trans>
      );
    case "hakkad":
      return (
        <Trans>
          For you, <End>d</End>; <Et>töötama</Et>, to work, keeps its <End>ma</End>.
        </Trans>
      );
    case "hakkab":
      return (
        <Trans>
          For he, she or it, <End>b</End>, here the rain. <Et>Vihma</Et> is the partitive of{" "}
          <Et>vihm</Et>, rain, and <Et>sadama</Et> is to fall, of rain or snow.
        </Trans>
      );
    case "hakkame":
      return (
        <Trans>
          For we, <End>me</End>; <Et>rääkima</Et>, to speak, goes last.
        </Trans>
      );
    case "hakkate":
      return (
        <Trans>
          For you, to more than one or polite, <End>te</End>; <Et>sööma</Et> is to eat.
        </Trans>
      );
    case "hakkavad":
      return (
        <Trans>
          For they, <End>vad</End>; <Et>mängima</Et> is to play.
        </Trans>
      );
  }
}

const BUILD_MEANS: Record<(typeof FUTURE_BUILD)[number]["answers"][0], MessageDescriptor> = {
  "Ma hakkan palju lugema.": msg`I’m going to read a lot.`,
  "Järgmisel nädalal hakkame eesti keelt õppima.": msg`Next week we’re starting to learn Estonian.`,
  "Kati hakkab poes töötama.": msg`Kati is going to work in a shop.`,
};

type When = "past" | "now" | "later";
type WhenItem = ChoiceItem & { said: string; pair: readonly [string, string] };

const WHEN_LABELS: Record<When, MessageDescriptor> = {
  past: msg`In the past`,
  now: msg`Now`,
  later: msg`Later`,
};

const whenOptions = (whens: readonly When[], i18n: I18n) =>
  whens.map((when) => ({
    id: when,
    label: <span lang={i18n.locale}>{i18n._(WHEN_LABELS[when])}</span>,
  }));

const TURNS: readonly (readonly When[])[] = [
  ["past", "now", "later"],
  ["now", "later", "past"],
  ["later", "past", "now"],
];

const WHEN_MEANS: Record<string, MessageDescriptor> = {
  "Eile olin tööl.": msg`Yesterday I was at work.`,
  "Ma olen tööl.": msg`I’m at work.`,
  "Homme olen tööl.": msg`Tomorrow I’ll be at work.`,
  "Ta elas Tallinnas.": msg`He or she lived in Tallinn.`,
  "Ta elab Tallinnas.": msg`He or she lives in Tallinn.`,
  "Ta hakkab Tallinnas elama.": msg`He or she is going to live in Tallinn.`,
  "Me jõime kohvi.": msg`We drank coffee.`,
  "Me joome kohvi.": msg`We’re drinking coffee.`,
  "Ülehomme joome kohvi.": msg`The day after tomorrow we’re having coffee.`,
  "Nad lugesid raamatut.": msg`They were reading a book.`,
  "Nad loevad raamatut.": msg`They’re reading a book.`,
  "Nad hakkavad raamatut lugema.": msg`They’re going to start reading a book.`,
  "Eile sõime kodus.": msg`Yesterday we ate at home.`,
  "Me sööme kodus.": msg`We’re eating at home.`,
  "Järgmisel nädalal sööme kodus.": msg`Next week we’re eating at home.`,
  "Ta õppis eesti keelt.": msg`He or she studied Estonian.`,
  "Ta õpib eesti keelt.": msg`He or she is studying Estonian.`,
  "Homme õpib ta eesti keelt.": msg`Tomorrow he or she is studying Estonian.`,
  "Ma töötasin kodus.": msg`I worked at home.`,
  "Ma töötan kodus.": msg`I’m working at home.`,
  "Homme töötan kodus.": msg`Tomorrow I’m working at home.`,
};

export function whenItems(i18n: I18n): WhenItem[] {
  return FUTURE_WHEN.flatMap((each, i) =>
    (["later", "past", "now"] as const).map((when, k) => {
      const said = each[when];
      return {
        src: src(said),
        answer: when,
        said,
        pair: [each.verb, `${each.verb}-${when}`] as const,
        options: whenOptions(TURNS[(i + k) % 3] as readonly When[], i18n),
        explain: (
          <>
            <span lang="et" className="font-medium text-ink">
              {said}
            </span>{" "}
            {i18n._(WHEN_MEANS[said] as MessageDescriptor)}
          </>
        ),
      };
    }),
  );
}

export const whenRun =
  (i18n: I18n) =>
  (items: readonly WhenItem[], pinned?: WhenItem): WhenItem[] =>
    eachPairFirst(items, pinned).map((item) =>
      item === pinned
        ? item
        : { ...item, options: whenOptions(shuffle(["past", "now", "later"] as When[]), i18n) },
    );

const leadOf = (sentence: string) =>
  sentence.split(" ").find((word) => word.startsWith("hakka")) ?? "";

function BuildWhy({ lead, spare }: { lead: string; spare: string }) {
  return (
    <Trans>
      After <Et>{lead}</Et>, the <End>ma</End> infinitive, and it goes last. The present,{" "}
      <Et>{spare}</Et>, stays out.
    </Trans>
  );
}

export function buildItems(i18n: I18n): OrderItem[] {
  return FUTURE_BUILD.map((each) => ({
    answers: each.answers,
    spare: each.spare,
    ...("tiles" in each ? { tiles: each.tiles } : {}),
    src: src(each.answers[0]),
    meaning: i18n._(BUILD_MEANS[each.answers[0]]),
    explain: <BuildWhy lead={leadOf(each.answers[0])} spare={each.spare[0]} />,
  }));
}

const LONG: Record<string, string> = {
  Ma: "Mina",
  Sa: "Sina",
  Ta: "Tema",
  Me: "Meie",
  Te: "Teie",
  Nad: "Nemad",
};

const DROPS = new Set(["Ma", "Sa", "Me", "Te"]);

export function withPronouns(said: string): [string, ...string[]] {
  const [first, next, ...rest] = said.split(" ");
  const long = first && LONG[first];
  if (!long || !next) return [said];
  const dropped = DROPS.has(first)
    ? [[next.charAt(0).toUpperCase() + next.slice(1), ...rest].join(" ")]
    : [];
  return [said, [long, next, ...rest].join(" "), ...dropped];
}

export function rewriteItems(i18n: I18n): SentenceItem[] {
  return FUTURE_REWRITE.map(({ id, from, to }) => ({
    kind: "rewrite",
    id: `start-${id}`,
    from,
    cue: (
      <Trans>
        with <Et>hakkama</Et>
      </Trans>
    ),
    src: src(to),
    answers: withPronouns(to),
  }));
}

const FIX_WHY: Record<(typeof FUTURE_FIX)[number]["id"], ReactNode> = {
  tootada: (
    <Trans>
      After <Et>hakkan</Et>, the <End>ma</End> infinitive: <Et>töötama</Et>.
    </Trans>
  ),
  minema: (
    <Trans>
      After <Et>kavatsen</Et>, the <End>da</End> infinitive: <Et>minna</Et>.
    </Trans>
  ),
  laksin: (
    <Trans>
      <Et>Homme</Et> is tomorrow, so the present: <Et>lähen</Et>.
    </Trans>
  ),
  hakkab: (
    <Trans>
      <Et>Nad</Et> takes <End>vad</End>: <Et>nad hakkavad</Et>.
    </Trans>
  ),
  soome: (
    <Trans>
      Only <Et>hakkama</Et> takes the person ending; the second verb is the <End>ma</End>{" "}
      infinitive: <Et>sööma</Et>.
    </Trans>
  ),
  tulema: (
    <Trans>
      After <Et>plaanib</Et>, the <End>da</End> infinitive: <Et>tulla</Et>.
    </Trans>
  ),
};

export function fixItems(): FixItem[] {
  return FUTURE_FIX.map(({ id, wrong, right }) => ({
    kind: "fix",
    id: `fix-${id}`,
    wrong,
    answers: [right],
    src: src(right),
    explain: FIX_WHY[id],
  }));
}

function plansQuestions(i18n: I18n): PassageQuestion[] {
  const l = (text: MessageDescriptor) => i18n._(text);
  return [
    {
      id: "start",
      ask: l(msg`When does Jaan start work in Tallinn?`),
      options: [
        { id: "today", label: l(msg`Today`) },
        { id: "weeks", label: l(msg`In two weeks`) },
        { id: "monday", label: l(msg`On Monday`) },
      ],
      answer: "monday",
      line: 1,
    },
    {
      kind: "truefalse",
      id: "live",
      ask: l(msg`Jaan is also going to live in Tallinn.`),
      answer: true,
      line: 2,
    },
    {
      kind: "truefalse",
      id: "cat",
      ask: l(msg`Jaan’s cat is staying in Tartu.`),
      answer: false,
      line: 5,
    },
    {
      kind: "short",
      id: "day",
      ask: l(msg`On which day is Jaan planning to come to Tartu? Write it in Estonian.`),
      answers: ["reedel", "reede"],
      line: 10,
    },
    {
      id: "kati-saturday",
      ask: l(msg`Where is Kati going on Saturday?`),
      options: [
        { id: "mother", label: l(msg`To her mother in Tartu`) },
        { id: "market", label: l(msg`To the market`) },
        { id: "work", label: l(msg`To work in Tallinn`) },
      ],
      answer: "market",
      line: 12,
    },
    {
      kind: "short",
      id: "time",
      ask: l(msg`What time are they meeting? Write it in Estonian.`),
      answers: ["kell kümme", "kümme", "10", "kell 10", "10.00", "10:00"],
      line: 16,
    },
    {
      kind: "truefalse",
      id: "coffee",
      ask: l(msg`At eleven they’re going to have coffee at a café.`),
      answer: true,
      line: 17,
    },
    {
      id: "sunday",
      ask: l(msg`Where does Jaan have to be on Sunday?`),
      options: [
        { id: "tartu", label: l(msg`In Tartu`) },
        { id: "home", label: l(msg`At home`) },
        { id: "tallinn", label: l(msg`In Tallinn`) },
      ],
      answer: "tallinn",
      line: 18,
    },
  ];
}

function useContent() {
  const { i18n } = useLingui();
  return useMemo(() => {
    const points: TimelinePoint[] = FUTURE_TIMELINE.map((point) => ({
      id: point.id,
      label: i18n._(TIME_LABELS[point.id]),
      et: point.et,
      at: point.at,
      examples: point.sentences.map(([sentence, ...pieces]) => ({
        sentence,
        meaning: i18n._(LINE_MEANS[sentence] as MessageDescriptor),
        src: src(sentence),
        build: pieces.map((form) => ({
          form,
          note: i18n._(PIECE_NOTES[form] as MessageDescriptor),
        })),
      })),
    }));

    const keys = FUTURE_HAKKAMA.map((each) => ({
      label: each.lead,
      sub: <Lit form={each.form} />,
      src: src(each.said),
      detail: {
        title: (
          <>
            <span lang="et">{each.said}</span>{" "}
            <small className="ms-1 text-md font-normal text-ink-secondary">
              {i18n._(HAKKAMA_MEANS[each.lead])}
            </small>
          </>
        ),
        tip: <HakkamaTip lead={each.lead} />,
      },
    }));

    const bins: SortBin[] = [
      {
        id: "ma",
        label: "-ma",
        lang: "et",
        rule: (
          <Trans>
            <Et>Hakkan, pean, lähen</Et> and <Et>jään</Et> take the <End>ma</End> infinitive.
          </Trans>
        ),
      },
      {
        id: "da",
        label: "-da",
        lang: "et",
        rule: (
          <Trans>
            <Et>Kavatsen, plaanin, tahan</Et> and <Et>oskan</Et> take the <End>da</End> infinitive.
          </Trans>
        ),
      },
    ];
    const sort: SortItem[] = FUTURE_SORT.map((each) => ({
      w: each.lead,
      bin: each.takes,
      src: src(each.lead),
    }));

    const said = (clip: keyof typeof FUTURE_DIALOGUE) => {
      const line = FUTURE_DIALOGUE[clip];
      return typeof line === "string" ? line : line.text;
    };
    const talk: DialogueTurn[] = [
      { who: "them", clip: "d-kati-1", line: said("d-kati-1") },
      {
        who: "you",
        clip: "d-sina-1",
        replies: [
          { line: said("d-sina-1"), right: true },
          {
            line: "Täna lähen Tallinnasse.",
            why: (
              <Trans>
                <Et>Täna</Et> is today. Kati asked about tomorrow.
              </Trans>
            ),
          },
          {
            line: "Eile läksin Tallinnasse.",
            why: (
              <Trans>
                <Et>Eile läksin</Et> is yesterday I went. Kati asked about tomorrow.
              </Trans>
            ),
          },
        ],
      },
      { who: "them", clip: "d-kati-2", line: said("d-kati-2") },
      {
        who: "you",
        clip: "d-sina-2",
        replies: [
          {
            line: "Ma töötasin Tallinnas.",
            why: (
              <Trans>
                <Et>Töötasin</Et> is the past. The job in Tallinn hasn’t started yet.
              </Trans>
            ),
          },
          {
            line: "Ma hakkan Tallinnas töötada.",
            why: (
              <Trans>
                After <Et>hakkan</Et> comes the <End>ma</End> infinitive: <Et>töötama</Et>.
              </Trans>
            ),
          },
          { line: said("d-sina-2"), right: true },
        ],
      },
      { who: "them", clip: "d-kati-3", line: said("d-kati-3") },
      {
        who: "you",
        clip: "d-sina-3",
        replies: [
          {
            line: "Ma kavatsen järgmisel nädalal tulema.",
            why: (
              <Trans>
                After <Et>kavatsen</Et> comes the <End>da</End> infinitive: <Et>tulla</Et>.
              </Trans>
            ),
          },
          { line: said("d-sina-3"), right: true },
          {
            line: "Eelmisel nädalal tulin.",
            why: (
              <Trans>
                <Et>Eelmisel nädalal tulin</Et> is last week I came. Kati asked when you’re coming.
              </Trans>
            ),
          },
        ],
      },
    ];

    return {
      points,
      keys,
      bins,
      sort,
      built: buildItems(i18n),
      when: whenItems(i18n),
      whenRun: whenRun(i18n),
      talk,
      rewrite: rewriteItems(i18n),
      fix: fixItems(),
      plans: plansQuestions(i18n),
    };
  }, [i18n]);
}

export function TulevikLesson() {
  const { t } = useLingui();
  const content = useContent();
  const days = lessonBySlug("paevad")?.n;
  const infinitives = lessonBySlug("tegevusnimed")?.n;
  const past = lessonBySlug("lihtminevik")?.n;

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          An Estonian verb has no future form. The present with a time word says what will happen,
          and <Et>hakkama</Et> with the <End>ma</End> infinitive says that something will start.
        </Trans>
      }
      facts={[
        <Trans key="m">15 minutes</Trans>,
        <Trans key="q">5 quizzes, a conversation and a recording you can play twice</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "homme",
        "ülehomme",
        "järgmisel nädalal",
        "hakkama",
        "hakkan",
        "kavatsema",
        "kavatsen",
        "plaanima",
        "plaanin",
        "homme hakkab vihma sadama",
        "homme saab olema külm",
      ]}
      recap={[
        <Trans key="1">
          An Estonian verb has no future form. The present with a time word says what will happen:{" "}
          <b lang="et">Homme lähen Tartusse.</b>
        </Trans>,
        <Trans key="2">
          <b lang="et">Hakkama</b> with the <End>ma</End> infinitive says that something will start
          and go on: <b lang="et">Ma hakkan Tartus elama.</b> Only <Et>hakkama</Et> takes the person
          ending.
        </Trans>,
        <Trans key="3">
          For a plan, <b lang="et">kavatsen</b> and <b lang="et">plaanin</b> take the <End>da</End>{" "}
          infinitive: <b lang="et">Ma kavatsen Tallinnasse minna.</b>
        </Trans>,
        <Trans key="4">
          <b lang="et">Saab olema</b> means will be. You’ll hear it, and the present usually says
          the same: <b lang="et">Homme on külm.</b>
        </Trans>,
      ]}
      sections={[
        {
          id: "present",
          title: t`The present for the future`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    An Estonian verb has no future form. You use the present and add a time word,
                    such as <Word w="homme" />, tomorrow:{" "}
                    <Nowrap>
                      <Word w="Homme lähen Tartusse" />.
                    </Nowrap>
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The verb is the one you’d use today:{" "}
                    <Nowrap>
                      <Word w="Täna lähen Tartusse" />.
                    </Nowrap>{" "}
                    The time word alone moves the sentence to tomorrow. Once the talk is already
                    about tomorrow, you can leave the time word out.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Lesson {days} gave you <Word w="ülehomme" />, the day after tomorrow. Next week
                    is <Word w="järgmisel nädalal" />, built like <Word w="eelmisel nädalal" />,
                    last week, from lesson {past}. Tap a time on the line to hear a sentence and see
                    its verb.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Timeline
                  label={t`Yesterday, today, tomorrow and next week`}
                  points={content.points}
                  empty={{
                    title: t`Tap a time`,
                    tip: t`You’ll hear a sentence and see how its verb is built.`,
                  }}
                />
              </Panel>
              <Aside>
                <Trans>
                  For will be, you’ll also hear <Et>saab</Et> with the <End>ma</End> infinitive:{" "}
                  <Nowrap>
                    <Word w="Homme saab olema külm" />.
                  </Nowrap>{" "}
                  It came into written Estonian on the German model. The Estonian Language
                  Institute’s handbook advises the present wherever it does the job:{" "}
                  <Nowrap>
                    <Word w="Homme on külm" />.
                  </Nowrap>{" "}
                  Don’t mix up <Et>saab olema</Et> with <Et>saan</Et> and the <End>da</End>{" "}
                  infinitive, I can, from lesson {infinitives}.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "hakkama",
          title: t`When something will start`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In lesson {infinitives} you met <Word w="hakkan" />, I start, with the{" "}
                    <End>ma</End> infinitive after it. <Word w="Hakkan" /> also talks about the
                    future, when the point is that something will start and go on:{" "}
                    <Nowrap>
                      <Word w="Ma hakkan Tartus elama" />.
                    </Nowrap>
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The present with a time word works for any future. <Word w="Hakkama" /> adds the
                    start: a new job, a new habit, rain.{" "}
                    <Nowrap>
                      <Word w="Homme hakkab vihma sadama" />.
                    </Nowrap>
                  </Trans>
                </p>
                <p>
                  <Trans>
                    <Et>Hakkama</Et> takes the person ending, as any verb does in the present. The
                    second verb keeps its <End>ma</End> and usually goes last:{" "}
                    <b lang="et">Me hakkame eesti keelt rääkima.</b> Tap a form to hear it in a
                    sentence.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Keys
                  label={t`The verb to start, for each person`}
                  columns={3}
                  phoneColumns={2}
                  empty={{
                    title: <Trans>Tap a form</Trans>,
                    tip: <Trans>You’ll hear it in a sentence about the future.</Trans>,
                  }}
                  items={content.keys}
                />
              </Panel>
            </>
          ),
        },
        {
          id: "build",
          title: t`Build a sentence`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Build each sentence from what it means. One tile is the present of the second
                    verb and stays out.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="build-future"
                title={<Trans>Build the sentence</Trans>}
                items={content.built}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>
                      All three. Each second verb took its <End>ma</End> infinitive and went last.
                    </Trans>
                  ) : (
                    <Trans>
                      After <Et>hakkama</Et>, the second verb takes its <End>ma</End> infinitive and
                      goes last. Try again.
                    </Trans>
                  )
                }
                recall={(item) => ({ label: item.answers[0] ?? "", src: item.src })}
                round={(props) => <OrderRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "plans",
          title: t`Saying what you plan`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    For a plan, say{" "}
                    <Nowrap>
                      <Word w="kavatsen" />,
                    </Nowrap>{" "}
                    I intend, or{" "}
                    <Nowrap>
                      <Word w="plaanin" />,
                    </Nowrap>{" "}
                    I plan. Both take the <End>da</End> infinitive, as <Et>tahan</Et> does:{" "}
                    <Word w="Ma kavatsen järgmisel nädalal Tallinnasse minna." />{" "}
                    <Word w="Mida sa plaanid homme teha?" />
                  </Trans>
                </p>
                <p>
                  <Trans>
                    So the first verb decides the second verb’s form, as in lesson {infinitives}:{" "}
                    <Et>hakkan</Et> takes the <End>ma</End> infinitive, <Et>kavatsen</Et> and{" "}
                    <Et>plaanin</Et> the <End>da</End> infinitive. Put each verb with the infinitive
                    that follows it. Tap a verb to hear it.
                  </Trans>
                </p>
              </Prose>
              <Sort
                id="sort-future"
                title={<Trans>Which infinitive follows?</Trans>}
                bins={content.bins}
                items={content.sort}
              />
            </>
          ),
        },
        {
          id: "when",
          title: t`Past, now or later`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Hear a sentence and pick when it happens. Listen for a time word, a past form,
                    or a verb such as <Et>hakkab</Et> before a second one. With none of them, these
                    sentences are about now.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="past-now-later"
                title={<Trans>Past, now or later?</Trans>}
                items={content.when}
                rounds={7}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All seven. You told the past, now and later apart every time.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Tap the times on the line above once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: item.src })}
                order={content.whenRun}
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "say-start",
          title: t`Say that it will start`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each sentence says what someone does now. Write that it will start: put{" "}
                    <Et>hakkama</Et> in the person’s form, and the verb in its <End>ma</End>{" "}
                    infinitive at the end.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="say-it-will-start"
                title={
                  <Trans>
                    Write it with <Et>hakkama</Et>
                  </Trans>
                }
                items={content.rewrite}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>
                      All six, each with <Et>hakkama</Et> and the <End>ma</End> infinitive.
                    </Trans>
                  ) : share >= 0.7 ? (
                    <Trans>
                      Most of them. Check the ones you missed against the forms of <Et>hakkama</Et>{" "}
                      above.
                    </Trans>
                  ) : (
                    <Trans>
                      Go back to the forms of <Et>hakkama</Et> above, then try again.
                    </Trans>
                  )
                }
                recall={sentenceRecall}
                round={(props) => <SentenceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "fix",
          title: t`Fix the sentence`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each sentence has one wrong word: the wrong infinitive after the first verb, a
                    wrong or misplaced person ending, or the past for tomorrow. Tap it, then write
                    it right.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-future"
                title={<Trans>Find and fix the mistake</Trans>}
                items={content.fix}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six found and fixed.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Look again at the ones you missed.</Trans>
                  ) : (
                    <Trans>Go back to the sort above, then try again.</Trans>
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
          title: t`Talking about plans`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Your friend Kati asks about your plans. A wrong reply shows why it’s wrong, then
                    you hear the right one.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="plans-talk"
                title={<Trans>Talk: plans with Kati</Trans>}
                part={
                  <Trans>
                    You live in Tartu. Tomorrow you go to Tallinn to start a new job, and you plan
                    to come back next week. Kati speaks first; pick what you say back.
                  </Trans>
                }
                them={t`Kati`}
                turns={content.talk}
              />
            </>
          ),
        },
        {
          id: "listen",
          title: t`Listen: plans for next week`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kati and Jaan talk about next week. Read the questions first. You can play the
                    recording twice, as in the A2 exam.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="next-week"
                title={<Trans>Listen: Kati and Jaan’s plans</Trans>}
                clip="c-plans"
                turns={FUTURE_TALK.turns}
                names={{ third: "Kati", main: "Jaan" }}
                questions={content.plans}
                plays={2}
              />
            </>
          ),
        },
      ]}
    />
  );
}
