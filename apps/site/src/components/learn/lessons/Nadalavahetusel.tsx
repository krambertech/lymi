import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  WEEKEND_DIALOGUE,
  WEEKEND_FIX,
  WEEKEND_PASSAGES,
  WEEKEND_SAY,
  WEEKEND_SORT,
  WEEKEND_TALK,
} from "../../../lib/learn/clips";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type GapItem, GapPassage } from "../GapPassage";
import type { Glossary } from "../lesson-context";
import { LessonView, Prose } from "../LessonView";
import { Listening, type PassageQuestion, Reading } from "../Passage";
import { Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Sort, type SortBin, type SortItem } from "../Sort";
import { Word } from "../Word";

const SLUG = "nadalavahetusel";
const src = (text: string) => clipUrl(SLUG, clipId(text));

function End({ children }: { children: ReactNode }) {
  return (
    <span lang="et" className="whitespace-nowrap">
      -{children}
    </span>
  );
}

function Et({ children }: { children: ReactNode }) {
  return <span lang="et">{children}</span>;
}

function Nowrap({ children }: { children: ReactNode }) {
  return <span className="whitespace-nowrap">{children}</span>;
}

const GLOSSARY: Glossary = {
  nädalavahetus: { en: msg`weekend` },
  nädalavahetusel: {
    en: msg`at the weekend`,
    note: msg`Nädalavahetus with the -l that says when.`,
  },
  "eelmisel nädalavahetusel": { en: msg`last weekend` },
  "järgmisel nädalavahetusel": { en: msg`next weekend` },
  "eelmisel nädalal": { en: msg`last week` },
  "järgmisel nädalal": { en: msg`next week` },
  "hea meelega": { en: msg`gladly` },
};

function useReplyGaps(): GapItem[] {
  const [hi, home, read, yesterday, learn, come, market] = WEEKEND_PASSAGES.mari;
  const cut = (sentence: string, word: string) => {
    const at = sentence.indexOf(word);
    return { before: sentence.slice(0, at).trim(), after: sentence.slice(at + word.length).trim() };
  };
  return [
    {
      id: "lainud",
      ...cut(`${hi} ${home}`, "läinud"),
      answer: "läinud",
      why: (
        <Trans>
          No in the past: <Et>ei</Et> and the <End>nud</End> form, <Et>ei läinud</Et>.
        </Trans>
      ),
    },
    {
      id: "lugesin",
      ...cut(read, "lugesin"),
      answer: "lugesin",
      why: (
        <Trans>
          Yes in the past, no <Et>ei</Et>, so the person ending: <Et>lugesin</Et>.
        </Trans>
      ),
    },
    {
      id: "olnud",
      ...cut(yesterday, "olnud"),
      answer: "olnud",
      why: (
        <Trans>
          After <Et>ei</Et>, the <End>nud</End> form: <Et>ei olnud</Et>.
        </Trans>
      ),
    },
    {
      id: "hakkan",
      ...cut(learn, "hakkan"),
      answer: "hakkan",
      why: (
        <Trans>
          For I, <Et>hakkan</Et>, then the <End>ma</End> infinitive: <Et>hakkan õppima</Et>.
        </Trans>
      ),
    },
    {
      id: "tallinnasse",
      ...cut(come, "Tallinnasse"),
      answer: "Tallinnasse",
      why: (
        <Trans>
          Where to, so <End>sse</End>: <Et>Tallinnasse</Et>.
        </Trans>
      ),
    },
    {
      id: "minna",
      ...cut(market, "minna"),
      answer: "minna",
      why: (
        <Trans>
          After <Et>kavatsen</Et>, the <End>da</End> infinitive: <Et>minna</Et>.
        </Trans>
      ),
    },
  ];
}

const SAY_PROMPTS: Record<(typeof WEEKEND_SAY)[number]["id"], MessageDescriptor> = {
  tartus: msg`Last weekend I was in Tartu.`,
  toole: msg`I didn’t go to work.`,
  tallinnasse: msg`Next week I’m going to Tallinn.`,
  oppima: msg`I’m going to start learning Estonian.`,
  kodus: msg`Yesterday we ate at home.`,
  raamatut: msg`He or she didn’t read the book.`,
};

const SAY_ALSO: Record<(typeof WEEKEND_SAY)[number]["id"], readonly string[]> = {
  tartus: [
    "Eelmisel nädalavahetusel olin Tartus.",
    "Ma olin eelmisel nädalavahetusel Tartus.",
    "Eelmisel nädalavahetusel ma olin Tartus.",
    "Eelmisel nädalavahetusel olin mina Tartus.",
  ],
  toole: ["Mina ei läinud tööle.", "Ma ei käinud tööl."],
  tallinnasse: [
    "Järgmisel nädalal lähen Tallinnasse.",
    "Ma lähen järgmisel nädalal Tallinnasse.",
    "Järgmisel nädalal ma lähen Tallinnasse.",
    "Järgmisel nädalal lähen ma Tallinna.",
    "Järgmisel nädalal lähen Tallinna.",
    "Järgmisel nädalal ma lähen Tallinna.",
    "Ma lähen Tallinnasse järgmisel nädalal.",
    "Ma lähen Tallinna järgmisel nädalal.",
    "Ma lähen järgmisel nädalal Tallinna.",
  ],
  oppima: ["Mina hakkan eesti keelt õppima.", "Hakkan eesti keelt õppima."],
  kodus: ["Eile me sõime kodus.", "Me sõime eile kodus.", "Eile sõime me kodus."],
  raamatut: ["Tema ei lugenud raamatut."],
};

export function sayItems(i18n: I18n): SentenceItem[] {
  return WEEKEND_SAY.map(({ id, said }) => ({
    kind: "translate",
    id: `say-${id}`,
    prompt: i18n._(SAY_PROMPTS[id]),
    src: src(said),
    answers: [said, ...SAY_ALSO[id]],
  }));
}

const FIX_WHY: Record<(typeof WEEKEND_FIX)[number]["id"], ReactNode> = {
  kaisin: (
    <Trans>
      After <Et>ei</Et>, the <End>nud</End> form for every person: <Et>ei käinud</Et>.
    </Trans>
  ),
  olin: (
    <Trans>
      <Et>Homme</Et> is tomorrow, so the present: <Et>olen</Et>.
    </Trans>
  ),
  lahen: (
    <Trans>
      <Et>Eile</Et> is yesterday, so the past: <Et>läksin</Et>.
    </Trans>
  ),
  tootada: (
    <Trans>
      After <Et>hakkan</Et>, the <End>ma</End> infinitive: <Et>töötama</Et>.
    </Trans>
  ),
  olid: (
    <Trans>
      After <Et>ei</Et>, the <End>nud</End> form: <Et>ei olnud</Et>.
    </Trans>
  ),
  soime: (
    <Trans>
      After <Et>ei</Et>, the <End>nud</End> form: <Et>ei söönud</Et>.
    </Trans>
  ),
};

export function fixItems(): FixItem[] {
  return WEEKEND_FIX.map(({ id, wrong, right }) => ({
    kind: "fix",
    id: `fix-${id}`,
    wrong,
    answers: [right],
    src: src(right),
    explain: FIX_WHY[id],
  }));
}

function useContent() {
  const { t } = useLingui();
  return useMemo(() => {
    const message: PassageQuestion[] = [
      {
        id: "where",
        ask: t`Where was Kati last weekend?`,
        options: [
          { id: "tallinn", label: t`In Tallinn` },
          { id: "tartu", label: t`In Tartu, where her mother lives` },
          { id: "parnu", label: t`In Pärnu` },
        ],
        answer: "tartu",
        line: 1,
      },
      {
        kind: "truefalse",
        id: "market",
        ask: t`On Saturday Kati bought cheese and bread at the market.`,
        answer: true,
        line: 3,
      },
      {
        kind: "truefalse",
        id: "sunday",
        ask: t`On Sunday Kati went into town.`,
        answer: false,
        line: 5,
      },
      {
        kind: "short",
        id: "city",
        ask: t`In which city is Kati going to work? Write it in Estonian.`,
        answers: ["Tallinnas", "Tallinn"],
        line: 7,
      },
      {
        id: "ask",
        ask: t`What does Kati ask Mari?`,
        options: [
          { id: "come", label: t`To come to Tallinn next weekend` },
          { id: "tartu", label: t`To go to Tartu` },
          { id: "cafe", label: t`To meet at a café on Monday` },
        ],
        answer: "come",
        line: 10,
      },
    ];

    const talk: PassageQuestion[] = [
      {
        id: "saturday",
        ask: t`What did Jaan do on Saturday?`,
        options: [
          { id: "market", label: t`He went to the market.` },
          { id: "swim", label: t`He went swimming.` },
          { id: "home", label: t`He stayed at home.` },
        ],
        answer: "swim",
        line: 2,
      },
      {
        kind: "truefalse",
        id: "jaan-market",
        ask: t`Jaan went to the market at the weekend.`,
        answer: false,
        line: 6,
      },
      {
        kind: "short",
        id: "bought",
        ask: t`What did Liis buy with the bread? Write one word in Estonian.`,
        answers: ["juustu", "juust"],
        line: 9,
      },
      {
        id: "start",
        ask: t`What is Liis going to start next week?`,
        options: [
          { id: "work", label: t`Working in Tallinn` },
          { id: "estonian", label: t`Learning Estonian` },
          { id: "swim", label: t`Swimming` },
        ],
        answer: "estonian",
        line: 13,
      },
      {
        kind: "truefalse",
        id: "days",
        ask: t`Liis has her lessons on Monday and Wednesday.`,
        answer: false,
        line: 14,
      },
      {
        kind: "short",
        id: "tallinn-day",
        ask: t`On which day is Jaan going to Tallinn? Write it in Estonian.`,
        answers: ["esmaspäeval", "esmaspäev"],
        line: 16,
      },
      {
        id: "come-back",
        ask: t`When is Jaan planning to come to Tartu?`,
        options: [
          { id: "today", label: t`Today` },
          { id: "friday", label: t`On Friday` },
          { id: "tomorrow", label: t`Tomorrow` },
        ],
        answer: "friday",
        line: 18,
      },
      {
        kind: "truefalse",
        id: "invite",
        ask: t`Liis asks Jaan to come to her place on Saturday.`,
        answer: true,
        line: 21,
      },
    ];

    const line = (clip: keyof typeof WEEKEND_DIALOGUE) => {
      const said = WEEKEND_DIALOGUE[clip];
      return typeof said === "string" ? said : said.text;
    };
    const dialogue: DialogueTurn[] = [
      { who: "them", clip: "d-mari-1", line: line("d-mari-1") },
      {
        who: "you",
        clip: "d-sina-1",
        replies: [
          {
            line: "Ma olen Tartus.",
            why: <Trans>That is now. Mari asked about the weekend that has passed.</Trans>,
          },
          { line: line("d-sina-1"), right: true },
          {
            line: "Ma lähen homme Tartusse.",
            why: <Trans>That is tomorrow. Mari asked what you did.</Trans>,
          },
        ],
      },
      { who: "them", clip: "d-mari-2", line: line("d-mari-2") },
      {
        who: "you",
        clip: "d-sina-2",
        replies: [
          {
            line: "Ei, ma ei käi.",
            why: (
              <Trans>
                <Et>Ei käi</Et> is no in the present. Mari asked about the weekend.
              </Trans>
            ),
          },
          {
            line: "Jah, ma käin seal iga päev.",
            why: <Trans>You didn’t go, and that is about now.</Trans>,
          },
          { line: line("d-sina-2"), right: true },
        ],
      },
      { who: "them", clip: "d-mari-3", line: line("d-mari-3") },
      {
        who: "you",
        clip: "d-sina-3",
        replies: [
          { line: line("d-sina-3"), right: true },
          {
            line: "Ma hakkan järgmisel nädalal Tallinnas töötada.",
            why: (
              <Trans>
                After <Et>hakkan</Et>, the <End>ma</End> infinitive: <Et>töötama</Et>.
              </Trans>
            ),
          },
          {
            line: "Järgmisel nädalal töötasin ma Tallinnas.",
            why: (
              <Trans>
                <Et>Töötasin</Et> is the past, and next week hasn’t happened yet.
              </Trans>
            ),
          },
        ],
      },
    ];

    return { message, talk, dialogue };
  }, [t]);
}

export function NadalavahetuselLesson() {
  const { t, i18n } = useLingui();
  const content = useContent();
  const gaps = useReplyGaps();
  const past = lessonBySlug("lihtminevik")?.n;
  const pastNo = lessonBySlug("mineviku-eitus")?.n;
  const future = lessonBySlug("tulevik")?.n;

  const bins: SortBin[] = [
    {
      id: "past",
      label: t`Last weekend`,
      lang: i18n.locale,
      rule: (
        <Trans>
          The past, with yes or no: <Et>olin kodus</Et>, <Et>ma ei läinud</Et>.
        </Trans>
      ),
    },
    {
      id: "later",
      label: t`Later`,
      lang: i18n.locale,
      rule: (
        <Trans>
          The present with a time word, <Et>hakkama</Et> or <Et>kavatsema</Et>: <Et>homme lähen</Et>
          , <Et>hakkan õppima</Et>.
        </Trans>
      ),
    },
  ];
  const sort: SortItem[] = WEEKEND_SORT.map(({ w, bin }) => ({ w, bin, src: src(w) }));

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Read a friend’s message about her weekend, fill the gaps in the reply, and write what you
          did, didn’t do and will do next week. It practises the past with yes and no, and the
          future with a time word, <Et>hakkama</Et> and <Et>kavatsema</Et>.
        </Trans>
      }
      facts={[
        <Trans key="m">15 minutes</Trans>,
        <Trans key="q">5 quizzes, a conversation and a recording you can play twice</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "nädalavahetus",
        "nädalavahetusel",
        "eelmisel nädalavahetusel",
        "järgmisel nädalavahetusel",
        "eelmisel nädalal",
        "järgmisel nädalal",
        "hea meelega",
      ]}
      recap={[
        <Trans key="1">
          Yes in the past takes the person ending: <b lang="et">olin, käisin, lugesin</b>.
        </Trans>,
        <Trans key="2">
          No in the past is <b lang="et">ei</b> and the <End>nud</End> form for every person:{" "}
          <b lang="et">ma ei läinud, ta ei olnud</b>.
        </Trans>,
        <Trans key="3">
          The future is the present with a time word, <b lang="et">hakkama</b> with the{" "}
          <End>ma</End> infinitive, or <b lang="et">kavatsema</b> with the <End>da</End> infinitive:{" "}
          <b lang="et">homme lähen, hakkan õppima, kavatsen tulla</b>.
        </Trans>,
        <Trans key="4">
          <b lang="et">Nädalavahetusel</b> is at the weekend: <b lang="et">eelmisel</b> for the last
          one, <b lang="et">järgmisel</b> for the next.
        </Trans>,
      ]}
      sections={[
        {
          id: "message",
          title: t`Kati’s message`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kati writes to Mari about her{" "}
                    <Nowrap>
                      <Word w="nädalavahetus" />,
                    </Nowrap>{" "}
                    the weekend, and about next week. Read it, then answer the questions. Once you
                    check your answers, tap a word in the message to open its card.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="kati-message"
                title={<Trans>Kati’s message to Mari</Trans>}
                by={t`Kati writes`}
                clip="p-kati"
                sentences={WEEKEND_PASSAGES.kati}
                questions={content.message}
              />
            </>
          ),
        },
        {
          id: "reply",
          title: t`Mari answers`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Drag a word from below Mari’s answer into each gap, or tap a word to put it in
                    the open gap. Some words are spare. The gaps test the past with yes and no, the
                    future, where to, and the infinitive after <Et>kavatsen</Et>.
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="mari-answer"
                title={<Trans>Fill the gaps: Mari’s answer</Trans>}
                gaps={gaps}
                mode="drag"
                spare={["läksin", "lugema", "olin", "hakkama", "Tallinnas", "minema"]}
                clip="p-mari"
              />
            </>
          ),
        },
        {
          id: "when-sort",
          title: t`Last weekend or next week`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Lessons {past} and {pastNo} show how to say what happened and what didn’t, and
                    lesson {future} what will happen. Put each phrase in its group. Tap a phrase to
                    hear it.
                  </Trans>
                </p>
              </Prose>
              <Sort
                id="weekend-or-next"
                title={<Trans>Last weekend or next week?</Trans>}
                bins={bins}
                items={sort}
              />
            </>
          ),
        },
        {
          id: "say-it",
          title: t`Write it in Estonian`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Write each sentence in Estonian: what happened, what didn’t, and what will.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="say-weekend"
                title={<Trans>Write it in Estonian</Trans>}
                items={sayItems(i18n)}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six written right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Read the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Read Kati’s message once more, then try again.</Trans>
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
                    Each sentence has one verb in the wrong form: a past ending kept after{" "}
                    <Et>ei</Et>, a tense that doesn’t fit the time word, or the wrong infinitive.
                    Tap it, then write the right form.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-weekend"
                title={<Trans>Find and fix the mistake</Trans>}
                items={fixItems()}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six found and fixed.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Look again at the ones you missed.</Trans>
                  ) : (
                    <Trans>Read What to remember below, then try again.</Trans>
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
          title: t`Talking about the weekend`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari asks about your weekend and next week. A wrong reply shows why it’s wrong,
                    then you hear the right one.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="weekend-talk"
                title={<Trans>Talk: Mari asks about your weekend</Trans>}
                part={
                  <Trans>
                    You were in Tartu at the weekend and didn’t go to the market. Next week you
                    start a job in Tallinn. Mari speaks first; pick what you say back.
                  </Trans>
                }
                them={t`Mari`}
                turns={content.dialogue}
              />
            </>
          ),
        },
        {
          id: "listen",
          title: t`Listen: the weekend and next week`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Liis and Jaan talk about last weekend and next week. Read the questions first.
                    You can play the recording twice, as in the A2 exam.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="liis-jaan"
                title={<Trans>Listen: Liis and Jaan</Trans>}
                clip="c-weekend"
                turns={WEEKEND_TALK.turns}
                names={{ third: "Liis", main: "Jaan" }}
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
