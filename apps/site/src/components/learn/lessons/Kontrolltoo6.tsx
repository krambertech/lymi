import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo } from "react";
import {
  clipId,
  clipUrl,
  EXAM_B1_ANSWERS,
  EXAM_B1_ARTICLE,
  EXAM_B1_CONVERSATION,
  EXAM_B1_FIXES,
  EXAM_B1_MODEL,
  EXAM_B1_NOTICE,
  EXAM_B1_RADIO,
  EXAM_B1_SIGN,
  EXAM_B1_WRITE,
} from "../../../lib/learn/clips";
import { Checkpoint } from "../Checkpoint";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type GapItem, GapPassage } from "../GapPassage";
import type { Glossary } from "../lesson-context";
import { LessonView, Prose } from "../LessonView";
import { Listening, type PassageQuestion, Reading } from "../Passage";
import { Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Writing } from "../Writing";

const SLUG = "kontrolltoo-6";
const src = (text: string) => clipUrl(SLUG, clipId(text));

const GLOSSARY: Glossary = {
  jalgrattatee: { en: msg`cycle path` },
  elamurajoon: { en: msg`residential district` },
  hädavajalik: { en: msg`essential, urgently needed` },
  kõnnitee: { en: msg`pavement, sidewalk` },
  tipptund: { en: msg`rush hour` },
  küttesüsteem: { en: msg`heating system` },
  ligipääs: { en: msg`access` },
  haldur: { en: msg`building manager` },
  sõiduplaan: { en: msg`timetable, schedule` },
  teetööd: { en: msg`roadworks` },
  paindlik: { en: msg`flexible` },
};

const B1_SPARE = ["avatud", "kes"] as const;

const WRITE_PROMPTS: Record<(typeof EXAM_B1_WRITE)[number], MessageDescriptor> = {
  "Ma sain sinu kirjast aru, et koosolek jääb ära.": msg`I understood from your letter that the meeting is cancelled.`,
  "Kas sa tead, millal see kauplus avatakse?": msg`Do you know when this shop is opened?`,
  "Raamat, mille ma eile ostsin, on väga põnev.": msg`The book that I bought yesterday is very exciting.`,
  "Koju jalutades kuulasin ma raadiot.": msg`While walking home, I listened to the radio.`,
  "Ta olevat kolinud eelmisel kuul Pärnusse.": msg`Apparently she moved to Pärnu last month.`,
  "Me peame enne reisi kõik dokumendid üle vaatama.": msg`We have to look over all the documents before the trip.`,
};

const WRITE_WHY: Partial<Record<(typeof EXAM_B1_WRITE)[number], ReactNode>> = {
  "Ma sain sinu kirjast aru, et koosolek jääb ära.": (
    <Trans>
      <b lang="et">Aru saama</b> takes <b lang="et">-st</b> (<b lang="et">sinu kirjast</b>), and{" "}
      <b lang="et">ära jääma</b> means to be cancelled.
    </Trans>
  ),
  "Kas sa tead, millal see kauplus avatakse?": (
    <Trans>
      When no subject is named, Estonian usually uses the impersonal: <b lang="et">avatakse</b>.
    </Trans>
  ),
  "Raamat, mille ma eile ostsin, on väga põnev.": (
    <Trans>
      A completed object in a relative clause usually uses <b lang="et">mille</b> for things.
    </Trans>
  ),
  "Koju jalutades kuulasin ma raadiot.": (
    <Trans>
      Doing two things at once usually takes <b lang="et">-des</b>: <b lang="et">koju jalutades</b>.
    </Trans>
  ),
  "Ta olevat kolinud eelmisel kuul Pärnusse.": (
    <Trans>
      Reported speech uses <b lang="et">olevat</b> + the <b lang="et">-nud</b> participle for a past
      event.
    </Trans>
  ),
};

const FIX_PROMPTS: Partial<Record<(typeof EXAM_B1_FIXES)[number]["id"], MessageDescriptor>> = {
  mis: msg`The book that is on the table is mine.`,
  sest: msg`I stayed home because I was ill.`,
  soomata: msg`He went out in the morning without eating.`,
  kellega: msg`The woman with whom I spoke lives in Tartu.`,
  kasutatud: msg`I bought a used car yesterday.`,
  raagitakse: msg`Two foreign languages are spoken in this school.`,
};

const FIX_ANSWERS: Partial<
  Record<(typeof EXAM_B1_FIXES)[number]["id"], readonly [string, ...string[]]>
> = {
  sest: ["Ma jäin koju, sest ma olin haige.", "Ma jäin koju, kuna ma olin haige."],
};

const FIX_WHY: Record<(typeof EXAM_B1_FIXES)[number]["id"], ReactNode> = {
  mis: (
    <Trans>
      Things usually take <b lang="et">mis</b> and people <b lang="et">kes</b>.
    </Trans>
  ),
  sest: (
    <Trans>
      A reason needs <b lang="et">sest</b> or <b lang="et">kuna</b>, not <b lang="et">kuigi</b>{" "}
      (although).
    </Trans>
  ),
  soomata: (
    <Trans>
      Without doing something usually takes <b lang="et">-mata</b>: <b lang="et">söömata</b>.
    </Trans>
  ),
  kellega: (
    <Trans>
      Speaking with someone takes <b lang="et">-ga</b>: <b lang="et">kellega</b>.
    </Trans>
  ),
  kasutatud: (
    <Trans>
      Something that has been used usually takes the passive participle <b lang="et">-tud</b>:{" "}
      <b lang="et">kasutatud</b>.
    </Trans>
  ),
  raagitakse: (
    <Trans>
      With no named speaker, Estonian usually uses the impersonal: <b lang="et">räägitakse</b>.
    </Trans>
  ),
};

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const article: PassageQuestion[] = [
      {
        id: "why-needed",
        ask: t`Why did the city representative say the new path was essential?`,
        options: [
          {
            id: "more-cyclists",
            label: t`The number of cyclists has grown sharply over the last three years.`,
          },
          { id: "old-bridge", label: t`An old river bridge closed.` },
          { id: "buses-stopped", label: t`Two suburban bus routes stopped running.` },
        ],
        answer: "more-cyclists",
        line: 1,
      },
      {
        id: "lit",
        kind: "truefalse",
        ask: t`Only half of the new cycle path has street lighting.`,
        answer: false,
        line: 3,
      },
      {
        id: "students",
        ask: t`What changes for university students from September?`,
        options: [
          { id: "bikes", label: t`Borrowing town bikes requires no deposit anymore.` },
          { id: "buses", label: t`Free weekend city buses.` },
          { id: "parking", label: t`Campus garages charge no fee near lecture halls.` },
        ],
        answer: "buses",
        line: 5,
      },
      {
        id: "drivers",
        ask: t`Why are some car drivers unhappy?`,
        options: [
          {
            id: "speed",
            label: t`The city lowered the speed limit across every single main street.`,
          },
          { id: "tolls", label: t`Entry tolls are coming.` },
          { id: "spaces", label: t`Dozens of street parking spaces vanished.` },
        ],
        answer: "spaces",
        line: 6,
      },
      {
        id: "meeting",
        kind: "truefalse",
        ask: t`Residents can ask questions and suggest ideas at Thursday’s meeting.`,
        answer: true,
        line: 7,
      },
      {
        id: "benches",
        kind: "short",
        ask: t`How many new benches were installed along the path? Write the number word from the article.`,
        answers: ["kakskümmend", "20"],
        line: 4,
      },
    ];

    const notice: PassageQuestion[] = [
      {
        id: "hours",
        ask: t`When does the heating inspection take place?`,
        options: [
          { id: "monday", label: t`Monday morning` },
          { id: "tuesday", label: t`Next Tuesday from nine until one` },
          { id: "wednesday", label: t`Next Wednesday from ten in the morning until two` },
        ],
        answer: "tuesday",
        line: 1,
      },
      {
        id: "cold-water",
        kind: "truefalse",
        ask: t`Both hot and cold water will be turned off during the work.`,
        answer: false,
        line: 2,
      },
      {
        id: "away",
        ask: t`What should residents do if they cannot stay at home?`,
        options: [
          { id: "neighbour", label: t`Leave a key with a trusted neighbour or arrange a new time` },
          { id: "postbox", label: t`Use the postbox` },
          { id: "skip", label: t`Wait until next year’s inspection` },
        ],
        answer: "neighbour",
        line: 4,
      },
      {
        id: "cold-rad",
        ask: t`How should you report a radiator that stays cold afterwards?`,
        options: [
          { id: "phone", label: t`By calling the city’s twenty-four-hour emergency line` },
          { id: "office", label: t`By visiting the management office in person` },
          { id: "email", label: t`By email straight away` },
        ],
        answer: "email",
        line: 5,
      },
      {
        id: "access",
        kind: "truefalse",
        ask: t`The technician needs access to the radiators inside each flat.`,
        answer: true,
        line: 3,
      },
      {
        id: "who-sent",
        kind: "short",
        ask: t`Who issued the notice? Write two words from the end of the text.`,
        answers: ["korteriühistu juhatus", "korteriühistu", "juhatus"],
        line: 6,
      },
    ];

    const gaps: GapItem[] = [
      {
        id: "b1g1",
        before: "Uus kultuurikeskus",
        after: "sel reedel kell viis.",
        answer: "avatakse",
        why: (
          <Trans>
            News announcements without a named subject usually use the impersonal:{" "}
            <b lang="et">avatakse</b>.
          </Trans>
        ),
      },
      {
        id: "b1g2",
        before: "Jäime koju,",
        after: "väljas sadas tugevat vihma.",
        answer: "kuna",
        why: (
          <Trans>
            A reason takes <b lang="et">kuna</b> or <b lang="et">sest</b>.
          </Trans>
        ),
      },
      {
        id: "b1g3",
        before: "See on raamat,",
        after: "kõik minu sõbrad soovitavad.",
        answer: "mida",
        why: (
          <Trans>
            <b lang="et">Soovitama</b> usually takes the partitive relative pronoun:{" "}
            <b lang="et">mida</b>.
          </Trans>
        ),
      },
      {
        id: "b1g4",
        before: "Bussi",
        after: "lugesin ma ajalehte.",
        answer: "oodates",
        why: (
          <Trans>
            While doing something takes <b lang="et">-des</b>: <b lang="et">oodates</b>.
          </Trans>
        ),
      },
      {
        id: "b1g5",
        before: "Tee läheb otse",
        after: "pargi jõe äärde.",
        answer: "läbi",
        why: (
          <Trans>
            Through a place takes the preposition <b lang="et">läbi</b> + genitive.
          </Trans>
        ),
      },
      {
        id: "b1g6",
        before: "Naaber",
        after: "juba eelmisel nädalal ära sõitnud.",
        answer: "olevat",
        why: (
          <Trans>
            Reported speech for a past event uses <b lang="et">olevat</b> + <b lang="et">-nud</b>.
          </Trans>
        ),
      },
    ];

    const fixes: FixItem[] = EXAM_B1_FIXES.map((item) => ({
      kind: "fix",
      id: `b1-fix-${item.id}`,
      wrong: item.wrong,
      prompt: FIX_PROMPTS[item.id] ? i18n._(FIX_PROMPTS[item.id] as MessageDescriptor) : undefined,
      answers: FIX_ANSWERS[item.id] ?? [item.right],
      src: src(item.right),
      explain: FIX_WHY[item.id],
    }));

    const write: SentenceItem[] = EXAM_B1_WRITE.map((said) => ({
      kind: "translate",
      id: clipId(said),
      prompt: i18n._(WRITE_PROMPTS[said]),
      src: src(said),
      answers: EXAM_B1_ANSWERS[said],
      explain: WRITE_WHY[said],
    }));

    const radio: PassageQuestion[] = [
      {
        id: "trains",
        ask: t`What does the new Tallinn–Tartu timetable add on weekdays?`,
        options: [
          { id: "two", label: t`Two extra express trains on weekdays` },
          { id: "night", label: t`A sleeper train` },
          { id: "cheap", label: t`Half-price morning fares` },
        ],
        answer: "two",
        line: 1,
      },
      {
        id: "roadworks",
        ask: t`How much extra time are drivers on Pärnu Road advised to allow?`,
        options: [
          { id: "five", label: t`Five minutes` },
          { id: "fifteen", label: t`At least fifteen minutes` },
          { id: "thirty", label: t`Half an hour or even longer` },
        ],
        answer: "fifteen",
        line: 3,
      },
      {
        id: "rain",
        kind: "truefalse",
        ask: t`Western Estonia may see patches of rain this morning.`,
        answer: true,
        line: 4,
      },
      {
        id: "evening",
        ask: t`How does the weather change in the afternoon?`,
        options: [
          { id: "storm", label: t`Stronger wind and much heavier evening showers arrive.` },
          { id: "fog", label: t`Thick fog spreads across the inland towns.` },
          { id: "clears", label: t`It clears and calms down.` },
        ],
        answer: "clears",
        line: 5,
      },
      {
        id: "tomorrow",
        kind: "truefalse",
        ask: t`Tomorrow will be rainy across most of Estonia.`,
        answer: false,
        line: 6,
      },
      {
        id: "temp",
        kind: "short",
        ask: t`What is the highest temperature mentioned for today? Write the word from the forecast.`,
        answers: ["seitseteist", "17", "seitseteist kraadi"],
        line: 5,
      },
    ];

    const interview: PassageQuestion[] = [
      {
        id: "when-switched",
        ask: t`How long ago did Kadri’s company switch to flexible hours?`,
        options: [
          { id: "half-year", label: t`Six months ago` },
          { id: "two-years", label: t`More than two years ago` },
          { id: "month", label: t`Just at the start of last month` },
        ],
        answer: "half-year",
        line: 0,
      },
      {
        id: "core-hours",
        ask: t`When must everyone in Kadri’s team be reachable?`,
        options: [
          { id: "eight-twelve", label: t`Eight to twelve` },
          { id: "ten-two", label: t`From ten until two` },
          { id: "twelve-four", label: t`From twelve noon until four in the afternoon` },
        ],
        answer: "ten-two",
        line: 3,
      },
      {
        id: "office-days",
        kind: "truefalse",
        ask: t`Most colleagues come to the office two or three times a week.`,
        answer: true,
        line: 5,
      },
      {
        id: "downside",
        ask: t`How does the team help new employees settle in?`,
        options: [
          { id: "manual", label: t`They hand out a short guide.` },
          { id: "shorter", label: t`They shorten the first work week.` },
          {
            id: "office",
            label: t`They agree on extra shared office days during the first month.`,
          },
        ],
        answer: "office",
        line: 7,
      },
      {
        id: "commute",
        kind: "truefalse",
        ask: t`More people now drive to work because of the flexible start times.`,
        answer: false,
        line: 9,
      },
      {
        id: "earliest",
        kind: "short",
        ask: t`What is the earliest hour staff can start work? Write the word from the interview.`,
        answers: ["seitse", "7", "kell seitse"],
        line: 3,
      },
      {
        id: "who",
        kind: "match",
        ask: t`Who raises or states each point?`,
        options: [
          { id: "host", label: t`Host` },
          { id: "kadri", label: t`Kadri` },
        ],
        statements: [
          {
            id: "asked-downside",
            label: t`Asks whether flexible hours have had any drawbacks`,
            answer: "host",
            line: 6,
          },
          {
            id: "face-to-face",
            label: t`Says shared discussions are easier face to face`,
            answer: "kadri",
            line: 5,
          },
        ],
      },
    ];

    const checks = [
      { id: "greet", label: <Trans>Open formally to the transport office or town council.</Trans> },
      {
        id: "problem",
        label: <Trans>Describe the local traffic or street problem clearly.</Trans>,
      },
      {
        id: "reason",
        label: (
          <Trans>
            Explain why it matters with <b lang="et">kuna</b> or <b lang="et">sest</b>.
          </Trans>
        ),
      },
      {
        id: "propose",
        label: (
          <Trans>
            Make one or two concrete proposals using the would form (<b lang="et">võiks</b>,{" "}
            <b lang="et">muudaks</b>).
          </Trans>
        ),
      },
      { id: "sign", label: <Trans>Close formally and sign with your full name.</Trans> },
    ];

    return { article, notice, gaps, fixes, write, radio, interview, checks };
  }, [t, i18n]);
}

export function Kontrolltoo6Lesson() {
  const { t } = useLingui();
  const content = useContent();
  const names = { third: t`Host`, fourth: t`Kadri` };

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Everything Stage 6 taught, put together: mixed questions, a news report and a notice to
          read, a text to fill, sentences to fix and write, radio news, an interview and a formal
          letter of your own. It asks about as much as a B1 exam does, at your own pace.
        </Trans>
      }
      facts={[
        <Trans key="t">Final challenge</Trans>,
        <Trans key="m">85 minutes</Trans>,
        <Trans key="q">8 marked parts and a formal letter</Trans>,
      ]}
      words={[]}
      recap={[
        <Trans key="1">
          Your score for each rule links back to its lesson: go back to the ones you missed and try
          a new set of mixed questions.
        </Trans>,
        <Trans key="2">
          Watch for links and forms that change meaning: <b lang="et">kuigi</b> vs{" "}
          <b lang="et">kuna</b>, <b lang="et">-des</b> vs <b lang="et">-mata</b>, impersonal verbs
          and reported <b lang="et">olevat</b>.
        </Trans>,
        <Trans key="3">
          In a formal letter, state the problem, give a clear reason, propose a solution with the
          would form and close with <b lang="et">Lugupidamisega</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "test",
          title: t`Mixed questions`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Twenty mixed questions from Stage 6. At the end you see your score for each rule
                    with a link back to the lesson that teaches it.
                  </Trans>
                </p>
              </Prose>
              <Checkpoint stageIndex={5} count={20} />
            </>
          ),
        },
        {
          id: "lugemine-1",
          title: t`Reading a news report`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Read the local news report from Tartu and answer six questions.</Trans>
                </p>
              </Prose>
              <Reading
                id="b1-article"
                title={<Trans>Reading 1: Tartu’s new cycle path</Trans>}
                sentences={EXAM_B1_ARTICLE}
                questions={content.article}
              />
            </>
          ),
        },
        {
          id: "lugemine-2",
          title: t`Reading an official notice`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Read the notice from a housing association board about a building inspection and
                    answer six questions.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="b1-notice"
                title={<Trans>Reading 2: heating system inspection</Trans>}
                sentences={EXAM_B1_NOTICE}
                questions={content.notice}
              />
            </>
          ),
        },
        {
          id: "grammatika",
          title: t`Fill the gaps`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Fill each gap with the right form from the word bank. Two words in the bank are
                    spare.
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="b1-gaps"
                title={<Trans>Fill the sentences</Trans>}
                mode="drag"
                gaps={content.gaps}
                spare={B1_SPARE}
              />
            </>
          ),
        },
        {
          id: "paranda",
          title: t`Fix the mistake`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Each sentence has one wrong word. Tap it and type the right form.</Trans>
                </p>
              </Prose>
              <Quiz
                id="b1-fix"
                title={<Trans>Fix one wrong word</Trans>}
                items={content.fixes}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six mistakes found and fixed.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Close. Read the note under each sentence you missed.</Trans>
                  ) : (
                    <Trans>Check the explanations below, then try once more.</Trans>
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
          title: t`Write in Estonian`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Write six sentences in Estonian using relative clauses, impersonal verbs,{" "}
                    <b lang="et">-des</b> and reported speech.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="b1-write"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.write}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six sentences right.</Trans>
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
          title: t`Listening to radio news`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Listen to a short morning news and weather bulletin. You can play the recording
                    twice.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="b1-listen-1"
                title={<Trans>Listening 1: morning radio news</Trans>}
                clip="p-b1-radio"
                sentences={EXAM_B1_RADIO}
                plays={2}
                questions={content.radio}
              />
            </>
          ),
        },
        {
          id: "kuulamine-2",
          title: t`Listening to a studio interview`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    A radio host talks to Kadri about flexible working hours at her company. Listen
                    up to twice and answer all seven questions.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="b1-listen-2"
                title={<Trans>Listening 2: flexible working hours</Trans>}
                clip="c-b1-interview"
                turns={EXAM_B1_CONVERSATION.turns}
                names={names}
                plays={2}
                questions={content.interview}
              />
            </>
          ),
        },
        {
          id: "kirjutamine",
          title: t`Writing a formal letter`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Write a formal letter of about 90–120 words to the town transport office about a
                    busy junction near a school, then check it against the checklist and model.
                  </Trans>
                </p>
              </Prose>
              <Writing
                id="b1-writing"
                title={<Trans>Write to the transport office</Trans>}
                prompt={
                  <p>
                    <Trans>
                      Write to the local transport office about a busy junction near a school.
                      Describe the problem, explain why parents are worried, propose two concrete
                      improvements using the would form and close formally.
                    </Trans>
                  </p>
                }
                model={EXAM_B1_MODEL}
                signOff={EXAM_B1_SIGN}
                checks={content.checks}
              />
            </>
          ),
        },
      ]}
    />
  );
}
