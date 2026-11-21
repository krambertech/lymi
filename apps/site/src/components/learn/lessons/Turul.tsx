import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { LESSONS, lessonBySlug } from "../../../lib/learn/catalogue";
import { MARKET_DIALOGUE, MARKET_PASSAGES } from "../../../lib/learn/clips";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { type GapItem, GapPassage } from "../GapPassage";
import type { Glossary } from "../lesson-context";
import { LessonView, Prose } from "../LessonView";
import { Listening, type PassageQuestion, Reading } from "../Passage";
import { Word } from "../Word";

const SLUG = "turul";

function Et({ children }: { children: ReactNode }) {
  return <span lang="et">{children}</span>;
}

const GLOSSARY: Glossary = {
  turg: { en: msg`market`, note: msg`Turul, at the market; turule, to the market.` },
  turul: { en: msg`at the market` },
  turule: { en: msg`to the market` },
  "turu ees": { en: msg`in front of the market`, note: msg`Turu, the genitive of turg, then ees.` },
  õun: { en: msg`apple` },
  õunad: { en: msg`apples` },
  müüja: { en: msg`seller` },
  soovite: {
    en: msg`you’d like, polite`,
    note: msg`From soovima, to wish: Mida te soovite? What would you like?`,
  },
  "midagi veel": { en: msg`anything else` },
  kokku: { en: msg`in total` },
  joomas: {
    en: msg`away drinking`,
    note: msg`The -mas form of jooma: kohvi joomas, out having coffee.`,
  },
  "kilo juustu": { en: msg`a kilo of cheese` },
};

const STALL_GAPS: GapItem[] = [
  { id: "kilo", before: "Tere! Mul on vaja", after: "juustu.", answer: "kilo" },
  { id: "see", before: "Kui palju", after: "maksab?", answer: "see" },
  { id: "eurot", before: "Kilo maksab kaheksa", after: ".", answer: "eurot" },
  { id: "tahan", before: "Ma", after: "ka leiba.", answer: "tahan" },
  { id: "meeldivad", before: "Mulle", after: "teie õunad.", answer: "meeldivad" },
];

function useContent() {
  const { t } = useLingui();
  const said = (clip: keyof typeof MARKET_DIALOGUE) => {
    const line = MARKET_DIALOGUE[clip];
    return typeof line === "string" ? line : line.text;
  };

  const message: PassageQuestion[] = [
    {
      id: "where",
      ask: t`Where is Mari going today?`,
      options: [
        { id: "cafe", label: t`To a café` },
        { id: "market", label: t`To the market` },
        { id: "shop", label: t`To the shop` },
      ],
      answer: "market",
      line: 0,
    },
    {
      id: "need",
      ask: t`What does she need?`,
      options: [
        { id: "cheese", label: t`Cheese and bread` },
        { id: "apples", label: t`Apples` },
        { id: "milk", label: t`Milk, coffee and sugar` },
      ],
      answer: "cheese",
      line: 1,
    },
    {
      id: "likes",
      ask: t`What does Mari like at the market?`,
      options: [
        { id: "cheese", label: t`The cheese` },
        { id: "coffee", label: t`The coffee at the café` },
        { id: "apples", label: t`The apples` },
      ],
      answer: "apples",
      line: 2,
    },
    {
      id: "meet",
      ask: t`Where will she be at ten?`,
      options: [
        { id: "behind", label: t`Behind the market` },
        { id: "front", label: t`In front of the market` },
        { id: "home", label: t`At home` },
      ],
      answer: "front",
      line: 4,
    },
  ];

  const voice: PassageQuestion[] = [
    {
      id: "mari",
      ask: t`What is Mari doing?`,
      options: [
        { id: "coffee", label: t`Having coffee at the café` },
        { id: "buying", label: t`Buying apples for Jaan` },
        { id: "home", label: t`Going home` },
      ],
      answer: "coffee",
      line: 1,
    },
    {
      id: "apples",
      ask: t`Where are the apples?`,
      options: [
        { id: "under", label: t`Under the table` },
        { id: "on", label: t`On the table` },
        { id: "box", label: t`In the box` },
      ],
      answer: "on",
      line: 2,
    },
    {
      id: "home",
      ask: t`When is Jaan coming home?`,
      options: [
        { id: "ten", label: t`At ten` },
        { id: "twelve", label: t`At twelve` },
        { id: "eleven", label: t`At eleven` },
      ],
      answer: "eleven",
      line: 3,
    },
  ];

  const talk: DialogueTurn[] = [
    { who: "them", clip: "d-muuja-1", line: said("d-muuja-1") },
    {
      who: "you",
      clip: "d-sina-1",
      replies: [
        {
          line: "Ma tahan kilo juust.",
          why: (
            <Trans>
              After <Et>kilo</Et>, the third form: <Et>kilo juustu</Et>.
            </Trans>
          ),
        },
        { line: said("d-sina-1"), right: true },
        {
          line: "Mul on kilo juust.",
          why: (
            <Trans>
              That says you have a kilo, and after <Et>kilo</Et> comes <Et>juustu</Et>.
            </Trans>
          ),
        },
      ],
    },
    { who: "them", clip: "d-muuja-2", line: said("d-muuja-2") },
    {
      who: "you",
      clip: "d-sina-2",
      replies: [
        {
          line: "Jah, palun, ma tahad ka leib.",
          why: (
            <Trans>
              With <Et>ma</Et> it’s <Et>tahan</Et>, and what you want takes the third form:{" "}
              <Et>leiba</Et>.
            </Trans>
          ),
        },
        { line: said("d-sina-2"), right: true },
        {
          line: "Jah, ma tahan ka leib.",
          why: (
            <Trans>
              What you want takes the third form: <Et>ma tahan leiba</Et>.
            </Trans>
          ),
        },
      ],
    },
    { who: "them", clip: "d-muuja-3", line: said("d-muuja-3") },
    {
      who: "you",
      clip: "d-sina-3",
      replies: [
        { line: said("d-sina-3"), right: true },
        {
          line: "Palun, kaheksa eurot.",
          why: t`The seller said üheksa, nine. Kaheksa is eight.`,
        },
        {
          line: "Palun, üheksa euro, aitäh.",
          why: (
            <Trans>
              After a number from two up, the third form: <Et>üheksa eurot</Et>.
            </Trans>
          ),
        },
      ],
    },
  ];

  return { message, voice, talk };
}

export function TurulLesson() {
  const { t } = useLingui();
  const content = useContent();
  const partitive = lessonBySlug("osastav")?.n;
  const placeWords = LESSONS.find((lesson) => lesson.et === "Kass ja kast")?.n;
  const going = lessonBySlug("ujuma-ujumas-ujumast")?.n;
  const liking = lessonBySlug("meeldima")?.n;

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Read a friend’s message, follow a voice message, fill in what you say at a stall and buy
          cheese and bread: places, amounts, prices and likes in sentences you know.
        </Trans>
      }
      facts={[
        <Trans key="m">12 minutes</Trans>,
        <Trans key="q">4 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["turg", "turul", "turule", "õun", "õunad", "müüja", "midagi veel", "kokku"]}
      recap={[
        <Trans key="1">
          Say where with the place cases: <b lang="et">turule</b>, to the market;{" "}
          <b lang="et">turul</b>, at the market; <b lang="et">turult</b>, from the market.
        </Trans>,
        <Trans key="2">
          After an amount or a number from two up, the third form:{" "}
          <b lang="et">kilo juustu, kaheksa eurot</b>.
        </Trans>,
        <Trans key="3">
          What you want takes the third form too: <b lang="et">Ma tahan leiba</b>.
        </Trans>,
        <Trans key="4">
          More than one thing you like takes <b lang="et">meeldivad</b>:{" "}
          <b lang="et">Mulle meeldivad õunad</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "message",
          title: t`A message from Mari`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari is going to the <Word w="turg" />, the market. Read her message and answer.
                    The amounts come from lesson {partitive} and the likes from lesson {liking}.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="mari-market"
                title={<Trans>What does Mari write?</Trans>}
                by={t`Mari writes`}
                clip="p-mari"
                sentences={MARKET_PASSAGES.mari}
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
                    Jaan is at the market already. Listen for where things are, with the place words
                    of lesson {placeWords}, and for what Mari is out doing, with the -mas form,{" "}
                    <Word w="joomas" />, from lesson {going}.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="jaan-market"
                title={<Trans>Listen: Jaan at the market</Trans>}
                clip="p-jaan"
                sentences={MARKET_PASSAGES.jaan}
                questions={content.voice}
              />
            </>
          ),
        },
        {
          id: "stall",
          title: t`At the cheese stall`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    This is what you say at a stall. Put a word in each gap: an amount, a price, the
                    word <Et>see</Et>, a verb with the right ending, or the verb that goes with{" "}
                    <Word w="õunad" />.
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="at-the-stall"
                title={<Trans>Fill the gaps</Trans>}
                gaps={STALL_GAPS}
                mode="drag"
                spare={["euro", "tahad", "meeldib"]}
                clip="p-stall"
              />
            </>
          ),
        },
        {
          id: "seller",
          title: t`Buying cheese and bread`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    The <Word w="müüja" />, the seller, speaks first. Pick what you say back. If you
                    pick a wrong reply, you see why, then hear the right one.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="at-the-market"
                title={<Trans>Talk: at the market</Trans>}
                part={
                  <Trans>
                    You want a kilo of cheese and some bread. The seller asks <Word w="soovite" />,
                    what you’d like, then <Word w="midagi veel" />, anything else, and says the
                    price <Word w="kokku" />, in total.
                  </Trans>
                }
                them={t`Seller`}
                turns={content.talk}
              />
            </>
          ),
        },
      ]}
    />
  );
}
