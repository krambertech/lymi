import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import { TALLINN_DIALOGUE, TALLINN_PASSAGES } from "../../../lib/learn/clips";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { type GapItem, GapPassage } from "../GapPassage";
import { LessonView, Prose } from "../LessonView";
import type { Glossary } from "../lesson-context";
import { OpeningHours } from "../OpeningHours";
import { Listening, type PassageQuestion, PassageQuestions, Reading } from "../Passage";
import { Word } from "../Word";

const SLUG = "paev-tallinnas";

const GLOSSARY: Glossary = {
  kohvik: { en: msg`café` },
  avatud: { en: msg`open`, note: msg`On a door or a sign.` },
  suletud: { en: msg`closed`, note: msg`On a door or a sign.` },
  kohvikus: { en: msg`in a café` },
  turul: { en: msg`at the market`, note: msg`Turg, market, takes -l by habit.` },
  tööl: { en: msg`at work` },
  linnas: { en: msg`in town` },
  kodus: { en: msg`at home` },
  täna: { en: msg`today` },
  homme: { en: msg`tomorrow` },
  reede: { en: msg`Friday` },
  laupäev: { en: msg`Saturday` },
  pühapäev: { en: msg`Sunday` },
  pühapäeval: {
    en: msg`on Sunday`,
    note: msg`Pühapäev with the ending that says when, as in esmaspäeval.`,
  },
  kell: { en: msg`clock, watch; o’clock`, note: msg`Kell on kümme: it’s ten. Kell kümme: at ten.` },
  kümme: { en: msg`ten` },
  kaksteist: { en: msg`twelve` },
  üksteist: { en: msg`eleven` },
  pool: { en: msg`half`, note: msg`Pool neli: halfway to four, 3:30.` },
  "pool üksteist": {
    en: msg`half past ten, 10:30`,
    note: msg`Pool looks ahead: halfway to eleven.`,
  },
  maksab: { en: msg`costs`, note: msg`From maksma, to cost; also to pay.` },
  eurot: { en: msg`euros`, note: msg`After a number from two up, euro becomes eurot.` },
  buss: { en: msg`bus` },
  ootan: { en: msg`I wait, I’m waiting`, note: msg`From ootama, to wait.` },
  sind: {
    en: msg`you`,
    note: msg`Sina as the one something is done to: Ma ootan sind, I’m waiting for you.`,
  },
  istu: { en: msg`sit down`, note: msg`A command, from istuma, to sit.` },
  aga: { en: msg`but` },
  olema: { en: msg`to be`, note: msg`Ma olen, sa oled, ta on.` },
  ei: { en: msg`no; not` },
  sõbrad: { en: msg`friends`, note: msg`The plural of sõber.` },
  "kuidas läheb?": { en: msg`How are you?`, show: "Kuidas läheb?" },
};

/** Mari’s line in the café talk, as recorded. */
const said = (clip: keyof typeof TALLINN_DIALOGUE) => {
  const line = TALLINN_DIALOGUE[clip];
  return typeof line === "string" ? line : line.text;
};

/** The café’s door: shut on Monday, and open later at the weekend. */
const CAFE_HOURS = [
  ["E", "suletud"],
  ["T–R", "9–18"],
  ["L–P", "10–16"],
] as const;

/** The passage with gaps, cut from `TALLINN_PASSAGES.saturday` at each gap. */
const SATURDAY_GAPS: readonly GapItem[] = [
  { id: "ei", before: "Täna on laupäev. Ma", after: "tööta.", answer: "ei" },
  { id: "olen", before: "Ma", after: "Tallinnas.", answer: "olen" },
  { id: "on", before: "Mari ja Jaan", after: "minu sõbrad.", answer: "on" },
  { id: "joome", before: "Me", after: "kell kümme kohvikus kohvi.", answer: "joome" },
  { id: "eurot", before: "Kohv maksab kolm", after: "", answer: "eurot" },
];

function useContent() {
  const { t } = useLingui();
  // Questions keep their answers in a fixed order, so each right answer sits in its own place.
  const sign: PassageQuestion[] = [
    {
      id: "monday",
      ask: t`Can you have a coffee there on Monday?`,
      options: [
        { id: "nine", label: t`Yes, from 9:00 to 18:00` },
        { id: "closed", label: t`No, it’s closed` },
        { id: "ten", label: t`Yes, from 10:00 to 16:00` },
      ],
      answer: "closed",
      line: 0,
    },
    {
      id: "saturday",
      ask: t`When does it open on Saturday?`,
      options: [
        { id: "nine", label: t`At 9:00` },
        { id: "four", label: t`At 16:00` },
        { id: "ten", label: t`At 10:00` },
      ],
      answer: "ten",
      line: 2,
    },
    {
      id: "thursday",
      ask: t`When does it close on Thursday?`,
      options: [
        { id: "six", label: t`At 18:00` },
        { id: "four", label: t`At 16:00` },
        { id: "nine", label: t`At 9:00` },
      ],
      answer: "six",
      line: 1,
    },
  ];
  const message: PassageQuestion[] = [
    {
      id: "tomorrow",
      ask: t`What day is it tomorrow?`,
      options: [
        { id: "friday", label: t`Friday` },
        { id: "saturday", label: t`Saturday` },
        { id: "sunday", label: t`Sunday` },
      ],
      answer: "saturday",
      line: 2,
    },
    {
      id: "coffee",
      ask: t`When does Mari have coffee tomorrow?`,
      options: [
        { id: "ten", label: t`At ten` },
        { id: "twelve", label: t`At twelve` },
        { id: "three", label: t`At three` },
      ],
      answer: "ten",
      line: 3,
    },
    {
      id: "price",
      ask: t`How much is a coffee?`,
      options: [
        { id: "two", label: t`€2` },
        { id: "thirteen", label: t`€13` },
        { id: "three", label: t`€3` },
      ],
      answer: "three",
      line: 4,
    },
    {
      id: "noon",
      ask: t`Where is Mari at twelve tomorrow?`,
      options: [
        { id: "cafe", label: t`In a café` },
        { id: "market", label: t`At the market` },
        { id: "work", label: t`At work` },
      ],
      answer: "market",
      line: 5,
    },
  ];
  const voice: PassageQuestion[] = [
    {
      id: "today",
      ask: t`Where is Jaan today?`,
      options: [
        { id: "tallinn", label: t`In Tallinn` },
        { id: "parnu", label: t`In Pärnu` },
        { id: "tartu", label: t`In Tartu` },
      ],
      answer: "tartu",
      line: 1,
    },
    {
      id: "bus",
      ask: t`When does his bus get to Tallinn?`,
      options: [
        { id: "eleven-thirty", label: t`At 11:30` },
        { id: "ten-thirty", label: t`At 10:30` },
        { id: "eleven", label: t`At 11:00` },
      ],
      answer: "ten-thirty",
      line: 2,
    },
    {
      id: "wait",
      ask: t`Where will he wait for you?`,
      options: [
        { id: "cafe", label: t`In a café` },
        { id: "market", label: t`At the market` },
        { id: "home", label: t`At home` },
      ],
      answer: "cafe",
      line: 3,
    },
    {
      id: "sunday",
      ask: t`Where is Jaan on Sunday?`,
      options: [
        { id: "tallinn", label: t`In Tallinn` },
        { id: "work", label: t`At work` },
        { id: "home", label: t`At home` },
      ],
      answer: "home",
      line: 4,
    },
  ];
  // The right reply moves between first, second and third place from turn to turn.
  const cafe: DialogueTurn[] = [
    { who: "them", clip: "d-mari-1", line: said("d-mari-1") },
    {
      who: "you",
      clip: "d-sina-1",
      replies: [
        { line: said("d-sina-1"), right: true },
        { line: "Ma elan Tallinnas.", why: t`That says where you live. Mari asked how you are.` },
        { line: "Kell on kümme.", why: t`That’s the time. Mari asked how you are.` },
      ],
    },
    { who: "them", clip: "d-mari-2", line: said("d-mari-2") },
    {
      who: "you",
      clip: "d-sina-2",
      replies: [
        { line: "Jah, ma joob kohvi.", why: t`With ma, the verb ends in -n: ma joon.` },
        { line: "Ei, ma ei joon kohvi.", why: t`After ei, the verb drops its ending: ei joo.` },
        { line: said("d-sina-2"), right: true },
      ],
    },
    { who: "them", clip: "d-mari-3", line: said("d-mari-3") },
    {
      who: "you",
      clip: "d-sina-3",
      replies: [
        { line: "Kell on pool kümme.", why: t`Pool looks ahead: pool kümme is 9:30.` },
        { line: said("d-sina-3"), right: true },
        { line: "Kell on üksteist.", why: t`Üksteist is 11:00, and it’s half past ten.` },
      ],
    },
    { who: "them", clip: "d-mari-4", line: said("d-mari-4") },
    {
      who: "you",
      clip: "d-sina-4",
      replies: [
        { line: "Jah, homme on esmaspäev.", why: t`Today is Saturday, so tomorrow is Sunday.` },
        { line: said("d-sina-4"), right: true },
        { line: "Ei, ma ei töötan.", why: t`After ei, the verb drops its ending: ei tööta.` },
      ],
    },
  ];
  return { sign, message, voice, cafe };
}

export function PaevTallinnasLesson() {
  const { t } = useLingui();
  const content = useContent();
  const days = lessonBySlug("paevad")?.n;

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Read a café sign and a text message, follow a voice message, fill in a plan for Saturday
          and answer a friend at a café: numbers, times and days in sentences you know.
        </Trans>
      }
      facts={[
        <Trans key="m">12 minutes</Trans>,
        <Trans key="q">5 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "kohvik",
        "avatud",
        "suletud",
        "kell",
        "pool üksteist",
        "maksab",
        "eurot",
        "homme",
        "pühapäeval",
        "turul",
        "buss",
        "istu",
      ]}
      recap={[
        <Trans key="1">
          Read opening hours: <b lang="et">E–R 9–18</b> is Monday to Friday, 9:00 to 18:00, and{" "}
          <b lang="et">suletud</b> is closed.
        </Trans>,
        <Trans key="2">
          Say when with <b lang="et">kell</b> and a number:{" "}
          <b lang="et">Ma joon kell kümme kohvi</b>, I drink coffee at ten. Pool looks ahead, so{" "}
          <b lang="et">pool üksteist</b> is 10:30.
        </Trans>,
        <Trans key="3">
          Say a price with <b lang="et">maksab</b>: <b lang="et">Kohv maksab kolm eurot</b>, coffee
          costs three euros.
        </Trans>,
        <Trans key="4">
          Say where with{" "}
          <b lang="et" className="whitespace-nowrap">
            -s
          </b>{" "}
          or{" "}
          <b lang="et" className="whitespace-nowrap">
            -l
          </b>
          , and when with <b lang="et">täna</b>, <b lang="et">homme</b> or a day’s name with{" "}
          <b lang="et" className="whitespace-nowrap">
            -l
          </b>
          : <b lang="et">Pühapäeval olen kodus</b>, on Sunday I’m at home.
        </Trans>,
        <Trans key="5">
          Answer no with <b lang="et">ei</b> and the verb without its ending:{" "}
          <b lang="et">Ei, ma ei tööta</b>, no, I don’t work.
        </Trans>,
      ]}
      sections={[
        {
          id: "sign",
          title: t`Opening hours on a door`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    A sign shortens each day to its first letter, as in lesson {days}. Hours use the
                    24-hour clock. <b lang="et">E–R 9–18</b> is Monday to Friday, 9:00 to 18:00.{" "}
                    <Word w="Suletud" /> is closed.
                  </Trans>
                </p>
                <p>
                  <Trans>Read the sign on a café in Tallinn, then answer.</Trans>
                </p>
              </Prose>
              <PassageQuestions
                id="cafe-sign"
                title={<Trans>When is the café open?</Trans>}
                questions={content.sign}
                top={
                  <OpeningHours
                    name="kohvik"
                    rows={CAFE_HOURS}
                    caption={t`A café’s opening hours`}
                  />
                }
              />
            </>
          ),
        },
        {
          id: "message",
          title: t`A message from Mari`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Your friend Mari sends you a message. Read it and answer the questions. Once
                    you’ve answered, tap a word to see what it means.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="mari-message"
                title={<Trans>What does Mari write?</Trans>}
                by={t`Mari writes`}
                clip="p-mari"
                sentences={TALLINN_PASSAGES.mari}
                questions={content.message}
              />
            </>
          ),
        },
        {
          id: "voice",
          title: t`A voice message from Jaan`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Jaan, another friend, leaves you a voice message. Listen for where he is and
                    when.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="jaan-voice"
                title={<Trans>Listen: Jaan’s plans</Trans>}
                clip="p-jaan"
                sentences={TALLINN_PASSAGES.jaan}
                questions={content.voice}
              />
            </>
          ),
        },
        {
          id: "saturday",
          title: t`Your Saturday`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Now it’s Saturday, and this is your plan. Put a word in each gap: a form of{" "}
                    <Word w="olema" />, a verb with the right ending, <Word w="ei" />, or the form a
                    word takes after a number.
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="my-saturday"
                title={<Trans>Fill the gaps</Trans>}
                gaps={SATURDAY_GAPS}
                mode="drag"
                spare={["oled", "joob", "euro"]}
                clip="p-saturday"
              />
            </>
          ),
        },
        {
          id: "cafe",
          title: t`At the café`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    You meet Mari at the café and answer her in Estonian. If you pick a wrong reply,
                    you see why, then hear the right one.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="at-the-cafe"
                title={<Trans>Talk: coffee with Mari</Trans>}
                part={
                  <Trans>
                    It’s Saturday, half past ten, and you don’t work on Sundays. Mari speaks first;
                    pick what you say back.
                  </Trans>
                }
                them={t`Mari`}
                turns={content.cafe}
              />
            </>
          ),
        },
      ]}
    />
  );
}
