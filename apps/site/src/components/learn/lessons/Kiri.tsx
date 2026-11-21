import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import { LETTER_DIALOGUE, LETTER_PASSAGES } from "../../../lib/learn/clips";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { type GapItem, GapPassage } from "../GapPassage";
import type { Glossary } from "../lesson-context";
import { LessonView, Prose } from "../LessonView";
import { Listening, type PassageQuestion, Reading } from "../Passage";
import { Word } from "../Word";

const SLUG = "kiri";

function Et({ children }: { children: ReactNode }) {
  return <span lang="et">{children}</span>;
}

const GLOSSARY: Glossary = {
  kiri: { en: msg`letter, message` },
  üürileandja: { en: msg`landlord`, note: msg`Literally “the one who gives rent”.` },
  kraan: { en: msg`tap, faucet` },
  katki: {
    en: msg`broken`,
    note: msg`Katki minema is to break: kraan on katki läinud, the tap has broken.`,
  },
  meister: { en: msg`repair person, craftsman` },
  parandama: { en: msg`to repair, to fix` },
  tilkuma: { en: msg`to drip`, note: msg`Vesi tilgub, the water drips.` },
  pigem: { en: msg`rather, instead` },
};

const FRIEND_GAPS: GapItem[] = [
  { id: "lainud", before: "Meie köögis on kraan katki", after: ".", answer: "läinud" },
  { id: "mulle", before: "Proua Tamm vastas", after: "kohe.", answer: "mulle" },
  { id: "tuleb", before: "Homme", after: "meister kell kümme.", answer: "tuleb" },
  {
    id: "voiksin",
    before: "Ma",
    after: "uue kraani ise osta, aga see on kallis.",
    answer: "võiksin",
  },
];

function content(t: (descriptor: MessageDescriptor) => string) {
  const said = (clip: keyof typeof LETTER_DIALOGUE) => {
    const line = LETTER_DIALOGUE[clip];
    return typeof line === "string" ? line : line.text;
  };

  const message: PassageQuestion[] = [
    {
      id: "broken",
      ask: t(msg`What has broken?`),
      options: [
        { id: "tap", label: t(msg`The kitchen tap`) },
        { id: "light", label: t(msg`The light in the bathroom`) },
        { id: "lock", label: t(msg`The door lock`) },
      ],
      answer: "tap",
      line: 1,
    },
    {
      id: "ask",
      ask: t(msg`What does Kati ask for?`),
      options: [
        { id: "send", label: t(msg`Someone to come and fix it tomorrow`) },
        { id: "money", label: t(msg`Money for a new tap`) },
        { id: "call", label: t(msg`A phone number for a plumber`) },
      ],
      answer: "send",
      line: 3,
    },
    {
      id: "home",
      ask: t(msg`When is Kati at home?`),
      options: [
        { id: "evening", label: t(msg`Tomorrow after five`) },
        { id: "day", label: t(msg`All day tomorrow`) },
        { id: "weekend", label: t(msg`Only at the weekend`) },
      ],
      answer: "day",
      line: 4,
    },
  ];

  const voice: PassageQuestion[] = [
    {
      id: "when",
      ask: t(msg`When does the repair person come?`),
      options: [
        { id: "ten", label: t(msg`Tomorrow at ten o’clock`) },
        { id: "fri-ten", label: t(msg`On Friday at ten`) },
        { id: "fri-five", label: t(msg`On Friday at five`) },
      ],
      answer: "ten",
      line: 2,
    },
    {
      id: "taps",
      ask: t(msg`What does Mrs Tamm say about taps like this?`),
      options: [
        { id: "cost", label: t(msg`They cost a lot`) },
        { id: "quick", label: t(msg`They are quick to repair`) },
        { id: "winter", label: t(msg`They often break in winter`) },
      ],
      answer: "quick",
      line: 3,
    },
    {
      id: "cannot",
      ask: t(msg`What will Mrs Tamm do if the repair person can’t come?`),
      options: [
        { id: "self", label: t(msg`Come and fix it herself`) },
        { id: "another", label: t(msg`Send another repair person`) },
        { id: "phone", label: t(msg`Phone Kati`) },
      ],
      answer: "phone",
      line: 4,
    },
  ];

  const talk: DialogueTurn[] = [
    { who: "them", clip: "d-meister-1", line: said("d-meister-1") },
    {
      who: "you",
      clip: "d-sina-1",
      replies: [
        {
          line: "Köögis on kraan katki läheb.",
          why: (
            <Trans>
              After <Et>on</Et> comes the -nud form: <Et>on katki läinud</Et>, has broken.
            </Trans>
          ),
        },
        { line: said("d-sina-1"), right: true },
        {
          line: "Köögis olen kraan katki läheb.",
          why: (
            <Trans>
              <Et>Olen</Et> is for <Et>ma</Et>. The tap is <Et>see</Et>, so it’s <Et>on</Et>, and
              after it the -nud form: <Et>läinud</Et>.
            </Trans>
          ),
        },
      ],
    },
    { who: "them", clip: "d-meister-2", line: said("d-meister-2") },
    {
      who: "you",
      clip: "d-sina-2",
      replies: [
        {
          line: "Ei, ma ei ole see parandanud.",
          why: (
            <Trans>
              After <Et>ei</Et>, the object always takes the third form: <Et>seda</Et>.
            </Trans>
          ),
        },
        {
          line: "Ei, ma ei ole see parandama.",
          why: (
            <Trans>
              After <Et>ei</Et>, the object takes the third form, <Et>seda</Et>. After{" "}
              <Et>ei ole</Et>, the verb takes the -nud form: <Et>parandanud</Et>.
            </Trans>
          ),
        },
        { line: said("d-sina-2"), right: true },
      ],
    },
    { who: "them", clip: "d-meister-3", line: said("d-meister-3") },
    {
      who: "you",
      clip: "d-sina-3",
      replies: [
        { line: said("d-sina-3"), right: true },
        {
          line: "Kas te saaksime pigem õhtul tulla?",
          why: (
            <Trans>
              <Et>Saaksime</Et> is the ending for <Et>me</Et>. With <Et>te</Et>, it’s{" "}
              <Et>saaksite</Et>.
            </Trans>
          ),
        },
        {
          line: "Kas te saaksite pigem õhtul tulema?",
          why: (
            <Trans>
              <Et>Saama</Et>, can, takes the -da form: <Et>tulla</Et>.
            </Trans>
          ),
        },
      ],
    },
    { who: "them", clip: "d-meister-4", line: said("d-meister-4") },
    {
      who: "you",
      clip: "d-sina-4",
      replies: [
        {
          line: "Aitäh, ma ootan teile.",
          why: (
            <Trans>
              <Et>Ootama</Et> takes the third form, not <Et>-le</Et>: <Et>ootan teid</Et>.
            </Trans>
          ),
        },
        { line: said("d-sina-4"), right: true },
        {
          line: "Aitäh, ma ootan teie.",
          why: (
            <Trans>
              <Et>Teie</Et> is the long first form of <Et>te</Et>. <Et>Ootama</Et> takes the third form:{" "}
              <Et>ootan teid</Et>.
            </Trans>
          ),
        },
      ],
    },
  ];

  return { message, voice, talk };
}

export function KiriLesson() {
  const { t, i18n } = useLingui();
  const lesson = content((descriptor) => i18n._(descriptor));
  const perfect = lessonBySlug("olen-lugenud")?.n;
  const conditional = lessonBySlug("laheksin")?.n;
  const impersonal = lessonBySlug("raagitakse")?.n;
  const government = lessonBySlug("ootan-sind")?.n;

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Read a message to a landlord about a broken tap, follow the landlord’s reply, fill in a
          note to a friend, and talk to the repair person who comes.
        </Trans>
      }
      facts={[
        <Trans key="m">12 minutes</Trans>,
        <Trans key="q">4 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["kiri", "üürileandja", "kraan", "katki", "meister", "parandama", "tilkuma", "pigem"]}
      recap={[
        <Trans key="1">
          <b lang="et">On</b> with the -nud form says something has happened and still matters:{" "}
          <b lang="et">kraan on katki läinud</b>.
        </Trans>,
        <Trans key="2">
          A polite request uses the would form: <b lang="et">Kas te saaksite…?</b>,{" "}
          <b lang="et">Kas ma võiksin…?</b>
        </Trans>,
        <Trans key="3">
          The impersonal says what is done without saying who:{" "}
          <b lang="et">kraane parandatakse kiiresti</b>.
        </Trans>,
        <Trans key="4">
          Each verb keeps its case: <b lang="et">helistan teile</b>, <b lang="et">ootan teid</b>,{" "}
          <b lang="et">vastas mulle</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "message",
          title: t`Kati writes to the landlord`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kati’s <Word w="kraan" />, her tap, is broken. She writes a <Word w="kiri" /> to
                    her <Word w="üürileandja" />, Mrs Tamm. Read it and answer. Look for the -nud
                    form of lesson {perfect} and the polite would form of lesson {conditional}.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="kati-letter"
                title={<Trans>What does Kati write?</Trans>}
                by={t`Kati writes`}
                clip="p-kati"
                sentences={LETTER_PASSAGES.kati}
                questions={lesson.message}
              />
            </>
          ),
        },
        {
          id: "voice",
          title: t`Mrs Tamm replies`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mrs Tamm answers with a voice message. Listen for the time, and for a sentence
                    that says what is done without saying who, the impersonal of lesson {impersonal}
                    .
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="tamm-reply"
                title={<Trans>Listen: the landlord’s reply</Trans>}
                clip="p-tamm"
                sentences={LETTER_PASSAGES.tamm}
                questions={lesson.voice}
              />
            </>
          ),
        },
        {
          id: "friend",
          title: t`Tell a friend`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kati tells a friend what happened. Each gap needs a different kind of form: the
                    -nud form, the case a verb takes from lesson {government}, the present for
                    tomorrow and the would form.
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="kati-friend"
                title={<Trans>Fill the gaps</Trans>}
                gaps={FRIEND_GAPS}
                mode="drag"
                spare={["mind", "tulnud", "võib"]}
                clip="p-friend"
              />
            </>
          ),
        },
        {
          id: "talk",
          title: t`Talk to the repair person`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    The <Word w="meister" /> phones you. Pick what you say back. If you pick a wrong
                    reply, you see why, then hear the right one.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="repair-talk"
                title={<Trans>Talk: the repair person</Trans>}
                part={
                  <Trans>
                    You are Kati. You haven’t tried to fix the tap yourself. The day after tomorrow
                    you work in the morning, so the evening suits you better.
                  </Trans>
                }
                them={t`Repair person`}
                turns={lesson.talk}
              />
            </>
          ),
        },
      ]}
    />
  );
}
