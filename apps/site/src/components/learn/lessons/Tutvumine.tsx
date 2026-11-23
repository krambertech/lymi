import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  type Clip,
  clipId,
  clipUrl,
  TUTVUMINE_ANSWERING,
  TUTVUMINE_ASKED,
  TUTVUMINE_ASKING,
  TUTVUMINE_MESSAGE,
  TUTVUMINE_PASSAGES,
  TUTVUMINE_TALK,
  TUTVUMINE_TRANSLATED,
} from "../../../lib/learn/clips";
import { eachPairFirst } from "../../../lib/learn/quiz";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { type GapItem, GapPassage } from "../GapPassage";
import type { Glossary } from "../lesson-context";
import { LessonView, Prose } from "../LessonView";
import { Listening, type PassageQuestion } from "../Passage";
import { Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { type SortBin, type SortItem, Sort } from "../Sort";
import { Word } from "../Word";
import { Writing } from "../Writing";

const SLUG = "tutvumine";

/** What a dialogue clip says. */
const said = (clip: Clip) => (typeof clip === "string" ? clip : "text" in clip ? clip.text : "");
const answering = (id: keyof typeof TUTVUMINE_ANSWERING) => said(TUTVUMINE_ANSWERING[id]);
const asking = (id: keyof typeof TUTVUMINE_ASKING) => said(TUTVUMINE_ASKING[id]);

const GLOSSARY: Glossary = {
  nimi: { en: msg`name` },
  kas: { en: msg`usually turns a sentence into a yes-or-no question` },
  kus: { en: msg`where` },
  kes: { en: msg`who` },
  elan: { en: msg`I live`, note: msg`From elama, to live.` },
  elab: { en: msg`he or she lives` },
  pärnus: { en: msg`in Pärnu`, show: "Pärnus" },
  tallinnas: { en: msg`in Tallinn`, show: "Tallinnas" },
  ei: { en: msg`not; no` },
  tööta: {
    en: msg({ message: "work", context: "the verb, after ei" }),
    note: msg`After ei the verb usually has no ending: ei tööta, doesn’t work.`,
  },
  töötan: { en: msg`I work` },
  kontoris: { en: msg`at the office` },
  kohvikus: { en: msg`in a café` },
  sõber: { en: msg`friend` },
  õpib: { en: msg`he or she studies`, note: msg`From õppima, to learn, to study.` },
  joob: { en: msg`he or she drinks`, note: msg`From jooma, to drink.` },
  palju: { en: msg`a lot` },
  kohvi: { en: msg`coffee`, note: msg`Joob kohvi: drinks coffee. Learn it as a phrase for now.` },
  "mis su nimi on?": { en: msg`What’s your name?`, show: "Mis su nimi on?" },
  "väga meeldiv": {
    en: msg`Nice to meet you`,
    note: msg`Word for word: “very pleasant”.`,
    show: "Väga meeldiv!",
  },
  "kust sa pärit oled?": { en: msg`Where are you from?`, show: "Kust sa pärit oled?" },
  "kus sa elad?": { en: msg`Where do you live?`, show: "Kus sa elad?" },
  "kus sa töötad?": { en: msg`Where do you work?`, show: "Kus sa töötad?" },
  "kas sa räägid eesti keelt?": {
    en: msg`Do you speak Estonian?`,
    show: "Kas sa räägid eesti keelt?",
  },
  natuke: { en: msg`a little` },
  "kuidas läheb?": {
    en: msg`How are you?`,
    note: msg`Word for word: “how goes?”`,
    show: "Kuidas läheb?",
  },
  "hästi, aitäh. aga sul?": {
    en: msg`Fine, thanks. And you?`,
    show: "Hästi, aitäh. Aga sul?",
  },
  miks: { en: msg`why` },
  sest: { en: msg`because` },
  "head aega": { en: msg`Goodbye`, note: msg`Word for word: “good time”.`, show: "Head aega!" },
};

/**
 * Kati's note, gap by gap. Only one gap takes a place, so a place in the wrong gap never makes a
 * sentence that is also right. tutvumine.test.ts checks that the filled gaps spell the recording.
 */
export const KATI_GAPS: readonly GapItem[] = [
  { id: "olen", before: "Tere! Mina", after: "Kati.", answer: "olen" },
  { id: "toota", before: "Ma elan Tallinnas. Ma ei", after: ", ma õpin.", answer: "tööta" },
  { id: "tootab", before: "Minu sõber Jaan", after: "kohvikus.", answer: "töötab" },
  { id: "tool", before: "Ta ei ole kodus, ta on", after: ".", answer: "tööl" },
  { id: "raagime", before: "Me", after: "eesti keelt.", answer: "räägime" },
  { id: "kus", before: "Aga sina?", after: "sina elad?", answer: "Kus" },
];

/** Words in the bank that fill no gap, each a slip one gap invites. */
export const KATI_SPARE = ["oled", "töötan", "Kes"] as const;

function useContent() {
  const { t } = useLingui();

  const answers: DialogueTurn[] = [
    { who: "them", clip: "a-mari-1", line: answering("a-mari-1") },
    {
      who: "you",
      clip: "a-sina-1",
      replies: [
        {
          line: "Tere! Sinu nimi on Andres.",
          why: (
            <Trans>
              <b lang="et">Sinu</b> is your: this says “Your name is Andres.”
            </Trans>
          ),
        },
        { line: answering("a-sina-1"), right: true },
        {
          line: "Tere! Mina on Andres.",
          why: (
            <Trans>
              <b lang="et">Mina</b> takes <b lang="et">olen</b>: <b lang="et">Mina olen Andres</b>.
            </Trans>
          ),
        },
      ],
    },
    { who: "them", clip: "a-mari-2", line: answering("a-mari-2") },
    {
      who: "you",
      clip: "a-sina-2",
      replies: [
        { line: answering("a-sina-2"), right: true },
        {
          line: "Ma elan Tartus.",
          why: (
            <Trans>
              <b lang="et">Kust</b> asks where you’re from, not where you live.
            </Trans>
          ),
        },
        {
          line: "Sa oled pärit Ukrainast.",
          why: (
            <Trans>
              <b lang="et">Sa oled</b> is you are: this tells Mari she’s from Ukraine.
            </Trans>
          ),
        },
      ],
    },
    { who: "them", clip: "a-mari-3", line: answering("a-mari-3") },
    {
      who: "you",
      clip: "a-sina-3",
      replies: [
        {
          line: "Ma elan Tartul.",
          why: (
            <Trans>
              Tartu takes{" "}
              <b lang="et" className="whitespace-nowrap">
                -s
              </b>
              : <b lang="et">Tartus</b>.
            </Trans>
          ),
        },
        {
          line: "Ma elad Tartus.",
          why: (
            <Trans>
              <b lang="et">Ma</b> takes{" "}
              <b lang="et" className="whitespace-nowrap">
                -n
              </b>
              : <b lang="et">elan</b>.
            </Trans>
          ),
        },
        { line: answering("a-sina-3"), right: true },
      ],
    },
    { who: "them", clip: "a-mari-4", line: answering("a-mari-4") },
    {
      who: "you",
      clip: "a-sina-4",
      replies: [
        {
          line: "Jah, ma olen. Ma töötan koolis.",
          why: <Trans>You’re not a teacher: you work in an office.</Trans>,
        },
        { line: answering("a-sina-4"), right: true },
        {
          line: "Ei, ma ei olen. Ma töötan kontoris.",
          why: (
            <Trans>
              After <b lang="et">ei</b>, <b lang="et">olema</b> usually loses its ending:{" "}
              <b lang="et">ei ole</b>.
            </Trans>
          ),
        },
      ],
    },
    { who: "them", clip: "a-mari-5", line: answering("a-mari-5") },
    {
      who: "you",
      clip: "a-sina-5",
      replies: [
        { line: answering("a-sina-5"), right: true },
        {
          line: "Natuke. Ma õpid eesti keelt.",
          why: (
            <Trans>
              <b lang="et">Ma</b> takes{" "}
              <b lang="et" className="whitespace-nowrap">
                -n
              </b>
              : <b lang="et">õpin</b>.
            </Trans>
          ),
        },
        {
          line: "Ei. Ma ei õpi eesti keelt.",
          why: <Trans>You’re learning Estonian, and you’re speaking it now.</Trans>,
        },
      ],
    },
    { who: "them", clip: "a-mari-6", line: answering("a-mari-6") },
    {
      who: "you",
      clip: "a-sina-6",
      replies: [
        {
          line: "Tere! Kuidas läheb?",
          why: (
            <Trans>
              <b lang="et">Tere</b> is hello, and Mari is leaving.
            </Trans>
          ),
        },
        {
          line: "Aitäh! Mis su nimi on?",
          why: <Trans>Mari told you her name at the start.</Trans>,
        },
        { line: answering("a-sina-6"), right: true },
      ],
    },
  ];

  const questions: DialogueTurn[] = [
    { who: "them", clip: "k-mari-1", line: asking("k-mari-1") },
    {
      who: "you",
      clip: "k-sina-1",
      replies: [
        {
          line: "Minu nimi on Andres.",
          why: (
            <Trans>
              Mari knows your name. <b lang="et">Kuidas läheb?</b> asks how you are.
            </Trans>
          ),
        },
        {
          line: "Ma ei tea.",
          why: (
            <Trans>
              <b lang="et">Ma ei tea</b> is I don’t know. <b lang="et">Kuidas läheb?</b> asks how
              you are.
            </Trans>
          ),
        },
        { line: asking("k-sina-1"), right: true },
      ],
    },
    { who: "them", clip: "k-mari-2", line: asking("k-mari-2") },
    {
      who: "you",
      clip: "k-sina-2",
      replies: [
        { line: asking("k-sina-2"), right: true },
        {
          line: "Miks sa on väsinud?",
          why: (
            <Trans>
              <b lang="et">Sa</b> takes <b lang="et">oled</b>, not <b lang="et">on</b>.
            </Trans>
          ),
        },
        {
          line: "Kas sa oled väsinud?",
          why: (
            <Trans>
              Mari just said she’s tired. Ask why with <b lang="et">miks</b>.
            </Trans>
          ),
        },
      ],
    },
    { who: "them", clip: "k-mari-3", line: asking("k-mari-3") },
    {
      who: "you",
      clip: "k-sina-3",
      replies: [
        {
          line: "Kus sa töötab?",
          why: (
            <Trans>
              <b lang="et">Sa</b> takes{" "}
              <b lang="et" className="whitespace-nowrap">
                -d
              </b>
              : <b lang="et">töötad</b>.
            </Trans>
          ),
        },
        { line: asking("k-sina-3"), right: true },
        {
          line: "Kas sa töötad?",
          why: (
            <Trans>
              Mari just said she works a lot. Ask where with <b lang="et">kus</b>.
            </Trans>
          ),
        },
      ],
    },
    { who: "them", clip: "k-mari-4", line: asking("k-mari-4") },
    {
      who: "you",
      clip: "k-sina-4",
      replies: [
        {
          line: "Kas sa elad Pärnul?",
          why: (
            <Trans>
              Pärnu takes{" "}
              <b lang="et" className="whitespace-nowrap">
                -s
              </b>
              : <b lang="et">Pärnus</b>.
            </Trans>
          ),
        },
        {
          line: "Kas sa ela Pärnus?",
          why: (
            <Trans>
              The verb usually drops its ending after <b lang="et">ei</b>, not after{" "}
              <b lang="et">kas</b>: <b lang="et">elad</b>.
            </Trans>
          ),
        },
        { line: asking("k-sina-4"), right: true },
      ],
    },
    { who: "them", clip: "k-mari-5", line: asking("k-mari-5") },
  ];

  const listening: PassageQuestion[] = [
    {
      id: "jaan-works",
      ask: t`Where does Jaan work?`,
      options: [
        { id: "office", label: t`In an office` },
        { id: "cafe", label: t`In a café` },
        { id: "school", label: t`At a school` },
      ],
      answer: "cafe",
      line: 2,
    },
    {
      id: "kati-lives",
      ask: t`Where does Kati live?`,
      options: [
        { id: "parnu", label: t`In Pärnu` },
        { id: "tartu", label: t`In Tartu` },
        { id: "tallinn", label: t`In Tallinn` },
      ],
      answer: "tallinn",
      line: 3,
    },
    {
      id: "kati-does",
      ask: t`What does Kati do?`,
      options: [
        { id: "studies", label: t`She studies` },
        { id: "cafe", label: t`She works in a café` },
        { id: "teacher", label: t`She’s a teacher` },
      ],
      answer: "studies",
      line: 4,
    },
    {
      id: "kati-drinks",
      ask: t`What does Kati drink a lot of?`,
      options: [
        { id: "water", label: t`Water` },
        { id: "coffee", label: t`Coffee` },
        { id: "tea", label: t`Tea` },
      ],
      answer: "coffee",
      line: 5,
    },
  ];

  return { answers, questions, listening };
}

const TRANSLATED_MEANS = [
  msg`We don’t work, we study.`,
  msg`I’m not at home.`,
  msg`We live in Tallinn.`,
  msg`They’re at work.`,
  msg`Do you live in Tallinn?`,
  msg`Where does he work?`,
] as const;

const SORTED: readonly { w: string; bin: string }[] = [
  { w: "Jah, ma elan Tartus.", bin: "kas" },
  { w: "Tartus.", bin: "kus" },
  { w: "Mari.", bin: "kes" },
  { w: "Ei, ma ei ole.", bin: "kas" },
  { w: "Kontoris.", bin: "kus" },
  { w: "Minu sõber Jaan.", bin: "kes" },
  { w: "Jah, natuke.", bin: "kas" },
  { w: "Haiglas, Pärnus.", bin: "kus" },
];

export function TutvumineLesson() {
  const { t, i18n } = useLingui();
  const content = useContent();
  const src = (text: string) => clipUrl(SLUG, clipId(text));

  const sortBins: SortBin[] = [
    {
      id: "kas",
      label: "Kas …?",
      hint: t`yes or no`,
      rule: (
        <Trans>
          <b lang="et">Kas</b> usually asks yes or no; the answer often starts with{" "}
          <b lang="et">jah</b> or <b lang="et">ei</b>.
        </Trans>
      ),
    },
    {
      id: "kus",
      label: "Kus …?",
      hint: t`where`,
      rule: (
        <Trans>
          <b lang="et">Kus</b> asks where, so a place answers it.
        </Trans>
      ),
    },
    {
      id: "kes",
      label: "Kes …?",
      hint: t`who`,
      rule: (
        <Trans>
          <b lang="et">Kes</b> asks who, so a person answers it.
        </Trans>
      ),
    },
  ];
  const sortItems: SortItem[] = SORTED.map(({ w, bin }) => ({ w, bin }));

  const askedItems: (SentenceItem & { pair: readonly [string, string] })[] = TUTVUMINE_ASKED.map(
    ({ kind, reply, answers }) => ({
      kind: "ask" as const,
      id: `ask-${clipId(reply)}`,
      reply,
      src: src(answers[0]),
      answers,
      pair: [kind, reply] as const,
    }),
  );

  const translatedItems: (SentenceItem & { pair: readonly [string, string] })[] =
    TUTVUMINE_TRANSLATED.map((each, i) => ({
      kind: "translate" as const,
      id: `translate-${clipId(each.answers[0])}`,
      prompt: i18n._(TRANSLATED_MEANS[i] as (typeof TRANSLATED_MEANS)[number]),
      src: src(each.answers[0]),
      answers: each.answers,
      ...("confusable" in each ? { confusable: each.confusable } : {}),
      pair: [each.kind, each.answers[0]] as const,
    }));

  const talkQuestions: PassageQuestion[] = [
    {
      id: "peeter-lives",
      ask: t`Where does Peeter live?`,
      options: [
        { id: "tallinn", label: t`In Tallinn` },
        { id: "parnu", label: t`In Pärnu` },
        { id: "tartu", label: t`In Tartu` },
      ],
      answer: "tartu",
      line: 5,
    },
    {
      id: "peeter-works",
      ask: t`Where does Peeter work?`,
      options: [
        { id: "tartu", label: t`In Tartu` },
        { id: "tallinn", label: t`In Tallinn` },
        { id: "parnu", label: t`In Pärnu` },
      ],
      answer: "tallinn",
      line: 5,
    },
    {
      id: "estonian",
      kind: "truefalse",
      ask: t`Peeter speaks a little Estonian.`,
      answer: true,
      line: 7,
    },
    {
      id: "liis-studies",
      kind: "truefalse",
      ask: t`Liis works in Tartu.`,
      answer: false,
      line: 9,
    },
    {
      id: "liis-lives",
      ask: t`Where does Liis live?`,
      options: [
        { id: "parnu", label: t`In Pärnu` },
        { id: "tartu", label: t`In Tartu` },
        { id: "tallinn", label: t`In Tallinn` },
      ],
      answer: "parnu",
      line: 12,
    },
  ];
  const first = lessonBySlug("haaldus")?.n;
  const last = lessonBySlug("kohad")?.n;

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Meet someone in Estonian: say who you are, where you live and work, answer their questions
          and ask your own.
        </Trans>
      }
      facts={[
        <Trans key="m">20 minutes</Trans>,
        <Trans key="p">
          Practice for lessons {first} to {last}
        </Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "mis su nimi on?",
        "väga meeldiv",
        "kust sa pärit oled?",
        "kus sa elad?",
        "kus sa töötad?",
        "kas sa räägid eesti keelt?",
        "natuke",
        "kuidas läheb?",
        "hästi, aitäh. aga sul?",
        "miks",
        "sest",
        "head aega",
      ]}
      recap={[
        <Trans key="1">
          Say who you are: <b lang="et">Mina olen Andres</b> or <b lang="et">Minu nimi on Andres</b>
          .
        </Trans>,
        <Trans key="2">
          Say where you live and work, with{" "}
          <b lang="et" className="whitespace-nowrap">
            -s
          </b>{" "}
          or{" "}
          <b lang="et" className="whitespace-nowrap">
            -l
          </b>{" "}
          on the place: <b lang="et">Ma elan Tartus. Ma töötan kontoris. Ta on tööl.</b>
        </Trans>,
        <Trans key="3">
          Say no with <b lang="et">ei</b> and the verb, usually without its ending:{" "}
          <b lang="et">Ma ei tööta. Ei, ma ei ole.</b>
        </Trans>,
        <Trans key="4">
          A yes-or-no question usually starts with <b lang="et">kas</b>, and any other with a
          question word: <b lang="et">Kas sa räägid eesti keelt? Kus sa töötad? Miks?</b>
        </Trans>,
        <Trans key="5">
          Answer, then ask back: <b lang="et">Hästi, aitäh. Aga sul?</b>
        </Trans>,
      ]}
      sections={[
        {
          id: "answering",
          title: t`Answering Mari`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari starts a conversation. Pick each of your replies; a wrong one says why.
                    Everything in it comes from lessons {first} to {last}, plus two phrases:{" "}
                    <Word w="Väga meeldiv" />, nice to meet you, and <Word w="Head aega" />,
                    goodbye.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="answering-mari"
                title={t`Talk: meeting Mari`}
                part={t`You are Andres, from Ukraine. You live in Tartu, work in an office and are learning Estonian.`}
                them={t`Mari`}
                turns={content.answers}
              />
            </>
          ),
        },
        {
          id: "asking",
          title: t`Asking Mari`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Now you ask. Pick the question that fits what Mari just said. Ask why with{" "}
                    <Word w="miks" />, and the answer usually starts with <Word w="sest" />,
                    because.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    This time Mari’s lines are sound only. Tap a line to hear it again, or tap Show
                    what Mari said to read it.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="asking-mari"
                title={t`Talk: asking Mari`}
                part={t`You are Andres. This time you ask Mari about herself.`}
                them={t`Mari`}
                turns={content.questions}
                text="sound"
              />
            </>
          ),
        },
        {
          id: "listening",
          title: t`Listening: Jaan and Kati`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Jaan talks about himself and his friend Kati. Listen for <Word w="ei" />: Jaan
                    says what isn’t so, then what is.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="jaan-and-kati"
                title={t`Listen: Jaan and Kati`}
                clip="p-jaan"
                sentences={TUTVUMINE_PASSAGES.jaan}
                questions={content.listening}
              />
            </>
          ),
        },
        {
          id: "gaps",
          title: t`A note from Kati`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kati writes about herself. Each gap needs one thing you’ve practised: a form of{" "}
                    <b lang="et">olema</b>, a verb ending, the verb after <b lang="et">ei</b>, a
                    place with{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -l
                    </b>
                    , or a question word.
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="kati-gaps"
                title={t`Fill the gaps`}
                gaps={KATI_GAPS}
                mode="drag"
                spare={KATI_SPARE}
                clip="p-kati"
              />
            </>
          ),
        },
        {
          id: "which-question",
          title: t`Which question does it answer?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    A <Word w="kas" /> question usually wants yes or no, a <Word w="kus" /> question
                    a place, and a <Word w="kes" /> question a person. Put each answer under the
                    question it fits.
                  </Trans>
                </p>
              </Prose>
              <Sort
                id="sort-answers"
                title={<Trans>Which question does it answer?</Trans>}
                bins={sortBins}
                items={sortItems}
              />
            </>
          ),
        },
        {
          id: "ask",
          title: t`Ask the question`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each round gives an answer. Write the question it answers. When the answer says{" "}
                    <span lang="et">ma</span> or <span lang="et">minu</span>, ask with{" "}
                    <span lang="et">sa</span> or <span lang="et">su</span>, or polite{" "}
                    <span lang="et">te</span>.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="ask-question"
                title={<Trans>Write the question it answers</Trans>}
                items={askedItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six, each with the right question word and verb ending.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the question word and the verb’s ending.</Trans>
                  ) : (
                    <Trans>Go through Asking Mari once more, then try again.</Trans>
                  )
                }
                recall={sentenceRecall}
                order={eachPairFirst}
                round={(props) => <SentenceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "translate",
          title: t`Write it in Estonian`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each sentence needs one thing from lessons {first} to {last}: the verb after{" "}
                    <span lang="et">ei</span>, a place with its ending, or a question.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="translate-meeting"
                title={<Trans>Write it in Estonian</Trans>}
                items={translatedItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six, every sentence right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the verb and the place in the ones you missed.</Trans>
                  ) : (
                    <Trans>Fill Kati’s note above once more, then try again.</Trans>
                  )
                }
                recall={sentenceRecall}
                order={eachPairFirst}
                round={(props) => <SentenceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "talk",
          title: t`Listening: Liis meets Peeter`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Liis and Peeter meet. They ask each other where they live and say what they do.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="liis-meets-peeter"
                title={<Trans>Listen: Liis meets Peeter</Trans>}
                clip="d-kati"
                turns={TUTVUMINE_TALK.turns}
                names={{ second: t`Liis`, main: t`Peeter` }}
                questions={talkQuestions}
              />
            </>
          ),
        },
        {
          id: "write",
          title: t`Write to Mari`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Write Mari a short message about yourself, then compare it with a model and tick
                    what yours does. Nothing is marked for you here.
                  </Trans>
                </p>
              </Prose>
              <Writing
                id="write-to-mari"
                title={<Trans>Write to Mari</Trans>}
                prompt={
                  <Trans>
                    Four to six sentences: who you are, where you live, what you do, something you
                    don’t do, and a question for Mari.
                  </Trans>
                }
                model={TUTVUMINE_MESSAGE}
                src={clipUrl(SLUG, "p-message")}
                checks={[
                  { id: "who", label: <Trans>Says who you are.</Trans> },
                  {
                    id: "where",
                    label: (
                      <Trans>
                        Says where you live, with <span lang="et">-s</span> or{" "}
                        <span lang="et">-l</span> on the place.
                      </Trans>
                    ),
                  },
                  { id: "do", label: <Trans>Says what you do.</Trans> },
                  {
                    id: "no",
                    label: (
                      <Trans>
                        Has a sentence with <span lang="et">ei</span> and the verb without its
                        ending for the person.
                      </Trans>
                    ),
                  },
                  { id: "ask", label: <Trans>Asks Mari a question.</Trans> },
                ]}
              />
            </>
          ),
        },
      ]}
    />
  );
}
