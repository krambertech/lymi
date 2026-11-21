import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import { WEEKEND_DIALOGUE, WEEKEND_PASSAGES } from "../../../lib/learn/clips";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { type GapItem, GapPassage } from "../GapPassage";
import type { Glossary } from "../lesson-context";
import { LessonView, Prose } from "../LessonView";
import { Listening, type PassageQuestion, Reading } from "../Passage";
import { Word } from "../Word";

const SLUG = "nadalavahetusel";

function Et({ children }: { children: ReactNode }) {
  return <span lang="et">{children}</span>;
}

const GLOSSARY: Glossary = {
  nädalavahetus: { en: msg`weekend` },
  nädalavahetusel: {
    en: msg`at the weekend`,
    note: msg`Nädalavahetus with -l, the ending for “when”.`,
  },
  "eelmisel laupäeval": { en: msg`last Saturday` },
  "järgmisel nädalal": { en: msg`next week` },
  käisime: {
    en: msg`we went, we visited`,
    note: msg`The past of käima: käisin, käisid, käis, käisime.`,
  },
  sõime: { en: msg`we ate`, note: msg`The past of sööma: sõin, sõid, sõi, sõime.` },
  sest: { en: msg`because` },
  tund: { en: msg`lesson, class; also hour` },
  kinno: { en: msg`to the cinema` },
  kinos: { en: msg`at the cinema` },
};

const PLAN_GAPS: GapItem[] = [
  { id: "olin", before: "Eelmisel laupäeval", after: "ma kodus.", answer: "olin" },
  { id: "lainud", before: "Ma ei", after: "kinno.", answer: "läinud" },
  { id: "lahen", before: "Järgmisel laupäeval", after: "ma Tartusse.", answer: "lähen" },
  { id: "tootama", before: "Esmaspäeval hakkan ma", after: ".", answer: "töötama" },
];

function useContent() {
  const { t } = useLingui();
  const said = (clip: keyof typeof WEEKEND_DIALOGUE) => {
    const line = WEEKEND_DIALOGUE[clip];
    return typeof line === "string" ? line : line.text;
  };

  const message: PassageQuestion[] = [
    {
      id: "saturday",
      ask: t`Where did they go on Saturday?`,
      options: [
        { id: "parnu", label: t`To Pärnu` },
        { id: "tartu", label: t`To Tartu` },
        { id: "lake", label: t`To a lake near Tallinn` },
      ],
      answer: "tartu",
      line: 1,
    },
    {
      id: "sunday",
      ask: t`What did Mari do on Sunday?`,
      options: [
        { id: "read", label: t`She read a book at home` },
        { id: "market", label: t`She went to the market` },
        { id: "work", label: t`She worked all day` },
      ],
      answer: "read",
      line: 3,
    },
    {
      id: "jaan",
      ask: t`Why didn’t Jaan come?`,
      options: [
        { id: "ill", label: t`He was ill` },
        { id: "tartu", label: t`He was already in Tartu` },
        { id: "work", label: t`He was working` },
      ],
      answer: "work",
      line: 4,
    },
  ];

  const voice: PassageQuestion[] = [
    {
      id: "start",
      ask: t`What is Jaan going to start next week?`,
      options: [
        { id: "estonian", label: t`Learning Estonian` },
        { id: "swim", label: t`Learning to swim at the pool` },
        { id: "job", label: t`A new job in Tartu` },
      ],
      answer: "estonian",
      line: 1,
    },
    {
      id: "when",
      ask: t`When are his lessons?`,
      options: [
        { id: "tue-thu", label: t`On Tuesday and Thursday` },
        { id: "every", label: t`Every day after work, at six` },
        { id: "mon-wed", label: t`On Monday and Wednesday` },
      ],
      answer: "mon-wed",
      line: 2,
    },
    {
      id: "ask",
      ask: t`What does Jaan ask Mari?`,
      options: [
        { id: "tartu", label: t`To go to Tartu on Friday` },
        { id: "cinema", label: t`To go to the cinema on Friday` },
        { id: "lesson", label: t`To come to his lesson` },
      ],
      answer: "cinema",
      line: 4,
    },
  ];

  const talk: DialogueTurn[] = [
    { who: "them", clip: "d-kati-1", line: said("d-kati-1") },
    {
      who: "you",
      clip: "d-sina-1",
      replies: [
        {
          line: "Ma lähen Tartusse.",
          why: (
            <Trans>
              That’s now or later. Kati asked about the past, <Et>tegid</Et>, so it’s{" "}
              <Et>käisin</Et>.
            </Trans>
          ),
        },
        { line: said("d-sina-1"), right: true },
        {
          line: "Ma käisin sõbraga Tartusse.",
          why: (
            <Trans>
              With <Et>käima</Et> the place takes -s: <Et>Tartus</Et>. The -sse ending goes with{" "}
              <Et>minema</Et>.
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
        { line: said("d-sina-2"), right: true },
        {
          line: "Ei, ma ei käisin.",
          why: (
            <Trans>
              After <Et>ei</Et> in the past comes the -nud form, the same for everyone:{" "}
              <Et>ma ei käinud</Et>.
            </Trans>
          ),
        },
        {
          line: "Ei, ma käisin.",
          why: (
            <Trans>
              <Et>Ma käisin</Et> says you went. To say you didn’t: <Et>ma ei käinud</Et>.
            </Trans>
          ),
        },
      ],
    },
    { who: "them", clip: "d-kati-3", line: said("d-kati-3") },
    {
      who: "you",
      clip: "d-sina-3",
      replies: [
        {
          line: "Ma töötasin kodus.",
          why: (
            <Trans>
              <Et>Töötasin</Et> is the past. For next weekend, the present: <Et>ma töötan</Et>.
            </Trans>
          ),
        },
        {
          line: "Ma ei töötanud kodus.",
          why: (
            <Trans>
              That says you didn’t work, in the past. Kati asks about next weekend:{" "}
              <Et>ma töötan</Et>.
            </Trans>
          ),
        },
        { line: said("d-sina-3"), right: true },
      ],
    },
  ];

  return { message, voice, talk };
}

export function NadalavahetuselLesson() {
  const { t } = useLingui();
  const content = useContent();
  const past = lessonBySlug("lihtminevik")?.n;
  const pastNo = lessonBySlug("ma-ei-lainud")?.n;
  const future = lessonBySlug("tulevik")?.n;

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Read about a friend’s weekend, follow a voice message about next week, fill in what
          someone did, didn’t do and will do, and tell a friend about your own weekend.
        </Trans>
      }
      facts={[
        <Trans key="m">12 minutes</Trans>,
        <Trans key="q">4 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "nädalavahetus",
        "nädalavahetusel",
        "eelmisel laupäeval",
        "järgmisel nädalal",
        "sest",
        "tund",
        "kinno",
        "kinos",
      ]}
      recap={[
        <Trans key="1">
          The past adds -si- or -i- and the ending that says who: <b lang="et">lugesin</b>,{" "}
          <b lang="et">käisime</b>, <b lang="et">sõime</b>; with <b lang="et">ta</b>, just -s:{" "}
          <b lang="et">ta töötas</b>.
        </Trans>,
        <Trans key="2">
          “Didn’t” is <b lang="et">ei</b> with the -nud form, the same for everyone:{" "}
          <b lang="et">ma ei läinud, Jaan ei tulnud</b>.
        </Trans>,
        <Trans key="3">
          For the future, the present with a time word, <b lang="et">reedel ma ei tööta</b>, or{" "}
          <b lang="et">hakkama</b> with a <b lang="et">-ma</b> form:{" "}
          <b lang="et">ma hakkan õppima</b>.
        </Trans>,
        <Trans key="4">
          Days, weeks and the weekend take -l for “when”:{" "}
          <b lang="et">eelmisel laupäeval, järgmisel nädalal, nädalavahetusel</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "message",
          title: t`Mari’s weekend`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari writes about her <Word w="nädalavahetus" />, her weekend. Read it and
                    answer. The past comes from lesson {past} and “didn’t” from lesson {pastNo}.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="mari-weekend"
                title={<Trans>What does Mari write?</Trans>}
                by={t`Mari writes`}
                clip="p-mari"
                sentences={WEEKEND_PASSAGES.mari}
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
                    Now Jaan talks about <Word w="järgmisel nädalal" />, next week. Listen for what
                    he is going to start, with the <Et>hakkama</Et> of lesson {future}, and for days
                    with a present-tense verb that point to the future.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="jaan-next-week"
                title={<Trans>Listen: Jaan’s next week</Trans>}
                clip="p-jaan"
                sentences={WEEKEND_PASSAGES.jaan}
                questions={content.voice}
              />
            </>
          ),
        },
        {
          id: "then-and-next",
          title: t`Last Saturday, next Saturday`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kati writes what she did, what she didn’t do and what she will do. The time
                    words tell you which: <Word w="eelmisel laupäeval" /> is past,{" "}
                    <Et>järgmisel laupäeval</Et> is future.
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="kati-saturdays"
                title={<Trans>Fill the gaps</Trans>}
                gaps={PLAN_GAPS}
                mode="drag"
                spare={["olen", "läksin", "töötada"]}
                clip="p-kati"
              />
            </>
          ),
        },
        {
          id: "talk",
          title: t`Talk about your weekend`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kati asks about your weekend. Pick what you say back. If you pick a wrong reply,
                    you see why, then hear the right one.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="weekend-talk"
                title={<Trans>Talk: your weekend</Trans>}
                part={
                  <Trans>
                    Last weekend you went to Tartu with a friend and didn’t go to the cinema. Next
                    weekend you work at home.
                  </Trans>
                }
                them="Kati"
                turns={content.talk}
              />
            </>
          ),
        },
      ]}
    />
  );
}
