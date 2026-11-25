import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo } from "react";
import {
  clipId,
  clipUrl,
  EXAM_A2_ANSWERS,
  EXAM_A2_CONVERSATION,
  EXAM_A2_EMAIL,
  EXAM_A2_FIXES,
  EXAM_A2_MODEL,
  EXAM_A2_NOTICES,
  EXAM_A2_SIGN,
  EXAM_A2_VOICE,
  EXAM_A2_WRITE,
} from "../../../lib/learn/clips";
import { ExamTimer } from "../ExamTimer";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type GapItem, GapPassage } from "../GapPassage";
import type { Glossary } from "../lesson-context";
import { LessonView, Prose } from "../LessonView";
import { Listening, type PassageQuestion, Reading } from "../Passage";
import { Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Writing } from "../Writing";

const SLUG = "eksam-a2";
const src = (text: string) => clipUrl(SLUG, clipId(text));

const GLOSSARY: Glossary = {
  raamatukogu: { en: msg`library` },
  ajutine: { en: msg`temporary` },
  peatus: { en: msg`stop (bus or tram)` },
  sissepääs: { en: msg`entrance, admission` },
  tasuta: { en: msg`free of charge` },
  broneerida: { en: msg`to book, reserve` },
  rõdu: { en: msg`balcony` },
  merevaade: { en: msg`sea view` },
  hommikusöök: { en: msg`breakfast` },
  parkla: { en: msg`car park` },
  palavik: { en: msg`fever` },
  kutse: { en: msg`invitation` },
};

const A2_SPARE = ["rongis", "reede"] as const;

const WRITE_PROMPTS: Record<(typeof EXAM_A2_WRITE)[number], MessageDescriptor> = {
  "Ma käisin eile õhtul sõbraga kinos.": msg`I went to the cinema with a friend yesterday evening.`,
  "Kas sa saaksid mulle homme helistada?": msg`Could you call me tomorrow?`,
  "Ma pean selle raamatu reedeks läbi lugema.": msg`I have to read through this book by Friday.`,
  "Minu vend töötab Tartus arstina.": msg`My brother works in Tartu as a doctor.`,
  "Ma ei läinud eile tööle, sest mul oli palavik.": msg`I didn’t go to work yesterday because I had a fever.`,
  "Me kohtume laupäeval kell kolm kohviku ees.": msg`We are meeting on Saturday at three in front of the café.`,
};

const WRITE_WHY: Partial<Record<(typeof EXAM_A2_WRITE)[number], ReactNode>> = {
  "Ma käisin eile õhtul sõbraga kinos.": (
    <Trans>
      <b lang="et">Käima</b> usually takes the static place form: <b lang="et">kinos</b>.
    </Trans>
  ),
  "Kas sa saaksid mulle homme helistada?": (
    <Trans>
      Polite requests use <b lang="et">saaksid</b> + <b lang="et">-da</b>:{" "}
      <b lang="et">helistada</b>.
    </Trans>
  ),
  "Ma pean selle raamatu reedeks läbi lugema.": (
    <Trans>
      A deadline usually takes <b lang="et">-ks</b> (<b lang="et">reedeks</b>), and a finished
      object takes the genitive (<b lang="et">selle raamatu</b>).
    </Trans>
  ),
  "Minu vend töötab Tartus arstina.": (
    <Trans>
      A role or job usually uses <b lang="et">-na</b>: <b lang="et">arstina</b>.
    </Trans>
  ),
  "Ma ei läinud eile tööle, sest mul oli palavik.": (
    <Trans>
      Negative past uses <b lang="et">ei</b> + the <b lang="et">-nud</b> form:{" "}
      <b lang="et">ei läinud</b>.
    </Trans>
  ),
};

const FIX_PROMPTS: Partial<Record<(typeof EXAM_A2_FIXES)[number]["id"], MessageDescriptor>> = {
  poes: msg`I went to the shop yesterday.`,
  aega: msg`I have no time today.`,
  ujuda: msg`She can swim well.`,
  sind: msg`I am waiting for you at the station.`,
  soin: msg`Yesterday evening I ate fish.`,
  reedeks: msg`This work has to be ready by Friday.`,
};

const FIX_WHY: Record<(typeof EXAM_A2_FIXES)[number]["id"], ReactNode> = {
  poes: (
    <Trans>
      <b lang="et">Käima</b> usually takes the static place form: <b lang="et">poes</b>.
    </Trans>
  ),
  aega: (
    <Trans>
      After <b lang="et">ei ole</b>, what is missing usually takes the partitive:{" "}
      <b lang="et">aega</b>.
    </Trans>
  ),
  ujuda: (
    <Trans>
      <b lang="et">Oskama</b> takes the <b lang="et">-da</b> infinitive: <b lang="et">ujuda</b>.
    </Trans>
  ),
  sind: (
    <Trans>
      <b lang="et">Ootama</b> takes the partitive object: <b lang="et">sind</b>.
    </Trans>
  ),
  soin: (
    <Trans>
      <b lang="et">Eile õhtul</b> asks for the past tense: <b lang="et">sõin</b>.
    </Trans>
  ),
  reedeks: (
    <Trans>
      A deadline usually takes the translative <b lang="et">-ks</b>: <b lang="et">reedeks</b>.
    </Trans>
  ),
};

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const notices: PassageQuestion[] = [
      {
        id: "sat-hours",
        ask: t`When can you visit Tartu city library on Saturday?`,
        options: [
          { id: "ten", label: t`From ten in the morning until four in the afternoon` },
          { id: "nine", label: t`From nine until seven` },
          { id: "closed", label: t`Closed all weekend` },
        ],
        answer: "ten",
        line: 0,
      },
      {
        id: "sun-open",
        kind: "truefalse",
        ask: t`The city library is open on Sunday afternoon.`,
        answer: false,
        line: 1,
      },
      {
        id: "bus-stop",
        ask: t`Where does bus number seven stop today?`,
        options: [
          { id: "school", label: t`Directly outside the main school entrance` },
          { id: "park", label: t`Beside the park` },
          { id: "station", label: t`Only outside the central railway station` },
        ],
        answer: "park",
        line: 2,
      },
      {
        id: "sauna",
        ask: t`When does the sports centre sauna reopen on Wednesday?`,
        options: [
          { id: "morning", label: t`At nine` },
          { id: "noon", label: t`At twelve noon` },
          { id: "two", label: t`At two in the afternoon` },
        ],
        answer: "two",
        line: 3,
      },
      {
        id: "museum",
        kind: "truefalse",
        ask: t`Entry to the city museum is free on the first Friday of every month.`,
        answer: true,
        line: 4,
      },
      {
        id: "bags",
        ask: t`Where should visitors put large bags?`,
        options: [
          { id: "locker", label: t`In a first-floor locker` },
          { id: "desk", label: t`Behind the main ticket counter outside` },
          { id: "second", label: t`In the large cloakroom on the second floor` },
        ],
        answer: "locker",
        line: 5,
      },
    ];

    const email: PassageQuestion[] = [
      {
        id: "travel",
        ask: t`How is Mari travelling to Pärnu?`,
        options: [
          { id: "bus", label: t`By long-distance coach across the country` },
          { id: "train", label: t`By train` },
          { id: "car", label: t`By car with friends from work` },
        ],
        answer: "train",
        line: 2,
      },
      {
        id: "hotel",
        kind: "truefalse",
        ask: t`Mari’s hotel is in the town centre, about ten minutes from the beach.`,
        answer: true,
        line: 3,
      },
      {
        id: "cafe",
        ask: t`Where does Mari want to go at twelve on Saturday?`,
        options: [
          { id: "river", label: t`To a brand-new café right beside the river` },
          { id: "market", label: t`To the market` },
          { id: "harbour", label: t`To a small bar at the harbour` },
        ],
        answer: "river",
        line: 4,
      },
      {
        id: "jacket",
        ask: t`Why does Mari tell Peeter to bring a warm jacket?`,
        options: [
          { id: "rain", label: t`Heavy rain is expected across the whole coast all Saturday.` },
          { id: "museum", label: t`Museum halls stay cold.` },
          { id: "wind", label: t`It gets windy down by the sea.` },
        ],
        answer: "wind",
        line: 6,
      },
      {
        id: "stay",
        kind: "truefalse",
        ask: t`Mari plans to leave Pärnu on Saturday evening.`,
        answer: false,
        line: 2,
      },
      {
        id: "reply-by",
        kind: "short",
        ask: t`By which day should Peeter write back? Write one word from the email.`,
        answers: ["neljapäevaks", "neljapäev", "neljapäeval"],
        line: 7,
      },
    ];

    const gaps: GapItem[] = [
      {
        id: "g1",
        before: "Eile õhtul ma",
        after: "vanematega koos õhtust.",
        answer: "sõin",
        why: (
          <Trans>
            <b lang="et">Eile õhtul</b> usually asks for the past tense: <b lang="et">sõin</b>.
          </Trans>
        ),
      },
      {
        id: "g2",
        before: "Pärast sööki käisime",
        after: "jalutamas.",
        answer: "pargis",
        why: (
          <Trans>
            Walking inside the park takes <b lang="et">-s</b>: <b lang="et">pargis</b>.
          </Trans>
        ),
      },
      {
        id: "g3",
        before: "Homme hommikul sõidan ma",
        after: "Tartusse.",
        answer: "rongiga",
        why: (
          <Trans>
            Transport usually uses <b lang="et">-ga</b>: <b lang="et">rongiga</b>.
          </Trans>
        ),
      },
      {
        id: "g4",
        before: "Ma pean selle kirja",
        after: "ära saatma.",
        answer: "reedeks",
        why: (
          <Trans>
            A deadline usually uses <b lang="et">-ks</b>: <b lang="et">reedeks</b>.
          </Trans>
        ),
      },
      {
        id: "g5",
        before: "Kahjuks ei olnud mul täna",
        after: "poodi minna.",
        answer: "aega",
        why: (
          <Trans>
            After <b lang="et">ei olnud</b>, the missing thing usually takes the partitive:{" "}
            <b lang="et">aega</b>.
          </Trans>
        ),
      },
      {
        id: "g6",
        before: "Kas sa saaksid",
        after: "õhtul helistada?",
        answer: "mulle",
        why: (
          <Trans>
            <b lang="et">Helistama</b> takes the <b lang="et">-le</b> pronoun:{" "}
            <b lang="et">mulle</b>.
          </Trans>
        ),
      },
    ];

    const fixes: FixItem[] = EXAM_A2_FIXES.map((item) => ({
      kind: "fix",
      id: `a2-fix-${item.id}`,
      wrong: item.wrong,
      prompt: FIX_PROMPTS[item.id] ? i18n._(FIX_PROMPTS[item.id] as MessageDescriptor) : undefined,
      answers: [item.right],
      src: src(item.right),
      explain: FIX_WHY[item.id],
    }));

    const write: SentenceItem[] = EXAM_A2_WRITE.map((said) => ({
      kind: "translate",
      id: clipId(said),
      prompt: i18n._(WRITE_PROMPTS[said]),
      src: src(said),
      answers: EXAM_A2_ANSWERS[said],
      explain: WRITE_WHY[said],
    }));

    const voice: PassageQuestion[] = [
      {
        id: "start-time",
        ask: t`What time does Kati’s birthday party start?`,
        options: [
          { id: "five", label: t`At five o’clock` },
          { id: "six", label: t`At six o’clock` },
          { id: "seven", label: t`At seven o’clock` },
        ],
        answer: "six",
        line: 2,
      },
      {
        id: "floor",
        ask: t`Which floor is Kati’s flat on?`,
        options: [
          { id: "first", label: t`The first floor` },
          { id: "second", label: t`The second floor` },
          { id: "third", label: t`The third floor` },
        ],
        answer: "third",
        line: 3,
      },
      {
        id: "food",
        kind: "truefalse",
        ask: t`Kati asks Mart to bring a cake to the party.`,
        answer: false,
        line: 4,
      },
      {
        id: "parking",
        ask: t`Where can Mart park for free?`,
        options: [
          { id: "yard", label: t`In the courtyard behind the building` },
          { id: "street", label: t`Along the main road outside the park` },
          { id: "garage", label: t`In the underground shop car park` },
        ],
        answer: "yard",
        line: 5,
      },
      {
        id: "callback",
        kind: "truefalse",
        ask: t`Mart should call back if he cannot find the right door.`,
        answer: true,
        line: 6,
      },
      {
        id: "flat-num",
        kind: "short",
        ask: t`What is Kati’s flat number? Write the word as Kati says it.`,
        answers: ["seitse", "7", "number seitse"],
        line: 3,
      },
    ];

    const trip: PassageQuestion[] = [
      {
        id: "nights",
        ask: t`How many nights is Mart staying in Haapsalu?`,
        options: [
          { id: "one", label: t`Just a single night` },
          { id: "two", label: t`Two nights` },
          { id: "three", label: t`Three full nights` },
        ],
        answer: "two",
        line: 3,
      },
      {
        id: "room",
        ask: t`What comes with the room on the second floor?`,
        options: [
          { id: "sea", label: t`A view out over the sea and its own balcony` },
          { id: "sauna", label: t`A private sauna` },
          { id: "garden", label: t`A terrace facing the garden` },
        ],
        answer: "sea",
        line: 6,
      },
      {
        id: "price",
        ask: t`How much does one night cost?`,
        options: [
          { id: "sixty", label: t`Sixty` },
          { id: "seventy", label: t`Seventy euros per night` },
          { id: "eighty", label: t`Eighty euros` },
        ],
        answer: "eighty",
        line: 8,
      },
      {
        id: "breakfast",
        kind: "truefalse",
        ask: t`Breakfast is included in the room price.`,
        answer: true,
        line: 8,
      },
      {
        id: "park-fee",
        kind: "truefalse",
        ask: t`Hotel guests have to pay extra to park in the courtyard.`,
        answer: false,
        line: 10,
      },
      {
        id: "checkin",
        kind: "short",
        ask: t`From what time is the room ready on Friday? Write the word from the call.`,
        answers: ["kolmest", "kella kolmest", "alates kolmest", "kell kolm", "kolm", "3"],
        line: 12,
      },
      {
        id: "who",
        kind: "match",
        ask: t`Who asks or says each detail?`,
        options: [
          { id: "desk", label: t`Receptionist` },
          { id: "mart", label: t`Mart` },
        ],
        statements: [
          {
            id: "balcony-ask",
            label: t`Asks whether a room with a balcony is still free`,
            answer: "mart",
            line: 5,
          },
          {
            id: "bfast-hours",
            label: t`Says breakfast runs from seven until ten`,
            answer: "desk",
            line: 8,
          },
        ],
      },
    ];

    const checks = [
      { id: "greet", label: <Trans>Greet Mari and thank her for the invitation.</Trans> },
      { id: "accept", label: <Trans>Say clearly that you can come on Saturday.</Trans> },
      {
        id: "arrive",
        label: <Trans>Say how you will travel and what time you arrive.</Trans>,
      },
      { id: "question", label: <Trans>Ask one question about the plan or the weather.</Trans> },
      { id: "sign", label: <Trans>End warmly and sign your name.</Trans> },
    ];

    return { notices, email, gaps, fixes, write, voice, trip, checks };
  }, [t, i18n]);
}

export function EksamA2Lesson() {
  const { t } = useLingui();
  const content = useContent();
  const names = { third: t`Receptionist`, fourth: t`Mart` };

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          A full timed practice test modelled on Estonia’s official A2 exam: two readings, language
          structure, sentence fixes and translations, two listening parts played twice, and a short
          reply to a friend.
        </Trans>
      }
      facts={[
        <Trans key="m">60 minutes</Trans>,
        <Trans key="q">7 marked parts and a writing task</Trans>,
        <Trans key="l">Listening played twice, as in the exam</Trans>,
      ]}
      words={[]}
      recap={[
        <Trans key="1">
          In the real Harno A2 exam, reading (50 minutes), listening (30 minutes) and writing (30
          minutes) are separate timed tests, and each listening recording plays twice. This mock is
          a shorter version of all three.
        </Trans>,
        <Trans key="2">
          Read the questions before you press play on a listening part so you know which time, place
          or price to listen for.
        </Trans>,
        <Trans key="3">
          In the writing task, cover every bullet point in the prompt: greeting, answer, practical
          detail, one question and sign-off.
        </Trans>,
      ]}
      sections={[
        {
          id: "lugemine-1",
          title: t`Part 1: Reading everyday notices`,
          quiz: true,
          children: (
            <>
              <ExamTimer minutes={60} />
              <Prose>
                <p>
                  <Trans>
                    Start the 60-minute timer if you want exam conditions, or work through the test
                    at your own pace. Read six short public notices and answer the questions.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="a2-notices"
                title={<Trans>Reading 1: everyday notices</Trans>}
                sentences={EXAM_A2_NOTICES}
                questions={content.notices}
              />
            </>
          ),
        },
        {
          id: "lugemine-2",
          title: t`Part 2: Reading an email`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari writes to Peeter about a weekend trip to Pärnu. Read her email carefully
                    and answer all six questions.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="a2-email"
                title={<Trans>Reading 2: Mari’s email</Trans>}
                by={t`Mari writes`}
                sentences={EXAM_A2_EMAIL}
                questions={content.email}
              />
            </>
          ),
        },
        {
          id: "grammatika",
          title: t`Part 3: Language structure`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Fill each gap with the right A2 form from the word bank. Two words in the bank
                    are spare.
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="a2-gaps"
                title={<Trans>Fill the message</Trans>}
                mode="drag"
                gaps={content.gaps}
                spare={A2_SPARE}
              />
            </>
          ),
        },
        {
          id: "paranda",
          title: t`Part 4: Fix the mistake`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each A2 sentence has one wrong word. Tap the word that does not fit and type the
                    right form.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="a2-fix"
                title={<Trans>Fix one wrong word</Trans>}
                items={content.fixes}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six A2 errors found and fixed.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Close. Check the grammar note under each sentence you missed.</Trans>
                  ) : (
                    <Trans>Review the explanations below, then try once more.</Trans>
                  )
                }
                recall={fixRecall}
                round={(props) => <FixRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "kirjuta-laused",
          title: t`Part 5: Write in Estonian`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Write six everyday sentences in Estonian, mixing past tense, polite requests,
                    cases and time expressions.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="a2-write"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.write}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six sentences right — solid A2 command.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly there. Compare the forms in the sentences you missed.</Trans>
                  ) : (
                    <Trans>Read the notes under each answer, then try again.</Trans>
                  )
                }
                recall={sentenceRecall}
                round={(props) => <SentenceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "kuulamine-1",
          title: t`Part 6: Listening to a voice message`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kati leaves Mart a voice message about her birthday party. You can play the
                    recording twice, as in the A2 exam.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="a2-listen-1"
                title={<Trans>Listening 1: Kati’s voice message</Trans>}
                clip="p-a2-voice"
                sentences={EXAM_A2_VOICE}
                plays={2}
                questions={content.voice}
              />
            </>
          ),
        },
        {
          id: "kuulamine-2",
          title: t`Part 7: Listening to a phone booking`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mart phones a hotel in Haapsalu to book a room. Listen up to twice and answer
                    the seven questions.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="a2-listen-2"
                title={<Trans>Listening 2: booking a hotel room</Trans>}
                clip="c-a2-trip"
                turns={EXAM_A2_CONVERSATION.turns}
                names={names}
                plays={2}
                questions={content.trip}
              />
            </>
          ),
        },
        {
          id: "kirjutamine",
          title: t`Part 8: Writing a short reply`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Write a short email of about 40–60 words to a friend who invited you for the
                    weekend, then check it against the checklist and model.
                  </Trans>
                </p>
              </Prose>
              <Writing
                id="a2-writing"
                title={<Trans>Write back to Mari</Trans>}
                prompt={
                  <p>
                    <Trans>
                      Mari invited you to visit Pärnu on Saturday. Thank her for the invitation, say
                      that you are coming, tell her how and when you arrive, ask one question about
                      the plan or the weather, and sign your name.
                    </Trans>
                  </p>
                }
                model={EXAM_A2_MODEL}
                signOff={EXAM_A2_SIGN}
                checks={content.checks}
              />
            </>
          ),
        },
      ]}
    />
  );
}
