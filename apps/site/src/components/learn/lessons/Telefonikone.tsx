import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  PHONE_AGAIN,
  PHONE_ANSWERS,
  PHONE_ASK,
  PHONE_DIALOGUE,
  PHONE_FIX,
  PHONE_HEARD,
  PHONE_MESSAGE,
  PHONE_NOTE,
  PHONE_SAY,
  PHONE_TALK,
} from "../../../lib/learn/clips";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { ListenRows, type RowItem } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Match, type MatchPair } from "../Match";
import { Listening, type PassageQuestion, Reading } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Word } from "../Word";

const SLUG = "telefonikone";
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

function Plain({ children }: { children: ReactNode }) {
  const { i18n } = useLingui();
  return (
    <span lang={i18n.locale} className="text-lg font-medium tracking-normal">
      {children}
    </span>
  );
}

const MEANS: Record<string, MessageDescriptor> = {
  "Halloo!": msg`Hello! (answering the phone)`,
  "Mari kuuleb.": msg`Mari speaking.`,
  "Kas Mart on seal?": msg`Is Mart there?`,
  "Kas ma saaksin rääkida Mardiga?": msg`Could I speak with Mart?`,
  "Hetk, palun.": msg`One moment, please.`,
  "Kas te saaksite korrata?": msg`Could you repeat that?`,
  "Palun rääkige aeglasemalt.": msg`Please speak more slowly.`,
  "Ühendus on halb.": msg`The connection is bad.`,
  "Ma ei kuule teid hästi.": msg`I can’t hear you well.`,
  "Kas ma võin sõnumi jätta?": msg`Can I leave a message?`,
  "Palun helistage mulle tagasi.": msg`Please call me back.`,
  "Ma helistasin sulle eile.": msg`I phoned you yesterday.`,
  "Ma helistan sulle homme.": msg`I’ll phone you tomorrow.`,
};

const GLOSSARY: Glossary = {
  ...Object.fromEntries(
    Object.entries(MEANS).map(([text, en]) => [text.toLowerCase(), { en, show: text }]),
  ),
  "mari kuuleb.": {
    en: msg`Mari speaking.`,
    show: "Mari kuuleb.",
    note: msg`Word for word: “Mari hears.”`,
  },
  halloo: { en: msg`hello (on the phone)` },
  hetk: { en: msg`a moment` },
  korrata: { en: msg`to repeat`, note: msg`The -da infinitive of korrama.` },
  tagasi: { en: msg`back`, note: msg`Helistama tagasi is to call back.` },
  sõnum: { en: msg`message`, note: msg`A short message, such as a text or a voicemail.` },
  ühendus: { en: msg`connection`, note: msg`The line between two phones.` },
  rääkima: { en: msg`to talk, to speak`, clip: false },
  helistama: { en: msg`to phone`, clip: false },
  homme: { en: msg`tomorrow`, clip: false },
};

const HEARD_EXPLAIN: Record<(typeof PHONE_HEARD)[number]["when"], ReactNode> = {
  past: (
    <Trans>
      A past form: <b lang="et">helistasin</b>, <b lang="et">helistas</b> or <b lang="et">jätsin</b>
      .
    </Trans>
  ),
  future: (
    <Trans>
      A present form with a time word such as <b lang="et">homme</b>, <b lang="et">varsti</b> or{" "}
      <b lang="et">hiljem</b> usually says what will happen.
    </Trans>
  ),
};

const SAY_PROMPTS: Record<(typeof PHONE_SAY)[number]["id"], MessageDescriptor> = {
  seal: msg`Is Mart there?`,
  arst: msg`Could I speak with the doctor?`,
  kuule: msg`I can’t hear you well. (To a stranger.)`,
  sonum: msg`Can I leave a message?`,
  tagasi: msg`Please call me back. (To a stranger.)`,
  kolm: msg`I’ll call you back at three. (To a stranger.)`,
};

const FIX_WHY: Record<(typeof PHONE_FIX)[number]["id"], ReactNode> = {
  mart: (
    <Trans>
      <Et>Rääkima</Et> asks <Et>kellega?</Et>, so the name takes <End>ga</End>: <Et>Mardiga</Et>.
    </Trans>
  ),
  mind: (
    <Trans>
      <Et>Helistama</Et> asks <Et>kellele?</Et>: <Et>mulle</Et>.
    </Trans>
  ),
  aeglasem: (
    <Trans>
      A command says how to speak with an adverb: <Et>aeglasemalt</Et>, more slowly.
    </Trans>
  ),
  saaksin: (
    <Trans>
      With <Et>te</Et>, the conditional ends in <End>ksite</End>: <Et>saaksite</Et>.
    </Trans>
  ),
  eile: (
    <Trans>
      <Et>Eile</Et>, yesterday, needs the past: <Et>helistasin</Et>.
    </Trans>
  ),
  homme: (
    <Trans>
      <Et>Homme</Et>, tomorrow, takes the present: <Et>helistan</Et>.
    </Trans>
  ),
  kuulen: (
    <Trans>
      After <Et>ei</Et> the verb loses its ending: <Et>kuule</Et>.
    </Trans>
  ),
};

export function sayItems(i18n: I18n): SentenceItem[] {
  return PHONE_SAY.map(({ id, said }) => ({
    kind: "translate",
    id: `say-${id}`,
    prompt: i18n._(SAY_PROMPTS[id]),
    src: src(said),
    answers: PHONE_ANSWERS[said] ?? [said],
  }));
}

export function fixItems(): FixItem[] {
  return PHONE_FIX.map(({ id, wrong, right }) => ({
    kind: "fix",
    id: `fix-${id}`,
    wrong,
    answers: [right],
    src: src(right),
    explain: FIX_WHY[id],
  }));
}

type HeardItem = ChoiceItem & { said: string; pair: readonly [string, string] };

export const heardRun = (items: readonly HeardItem[], pinned?: HeardItem): HeardItem[] =>
  eachPairFirst(items, pinned).map((item) =>
    item === pinned ? item : { ...item, options: shuffle(item.options) },
  );

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const heard: HeardItem[] = PHONE_HEARD.map(({ said, when }) => ({
      said,
      src: src(said),
      answer: when,
      options: [
        { id: "past", label: <Plain>{t`It already happened`}</Plain> },
        { id: "future", label: <Plain>{t`It will happen`}</Plain> },
      ],
      pair: [when, said] as const,
      explain: HEARD_EXPLAIN[when],
    }));

    const pairs: MatchPair[] = [
      { id: "kuuleb", left: "Mari kuuleb.", right: t`Mari speaking.`, src: src("Mari kuuleb.") },
      { id: "hetk", left: "Hetk, palun.", right: t`One moment, please.`, src: src("Hetk, palun.") },
      {
        id: "korrata",
        left: "Kas te saaksite korrata?",
        right: t`Could you repeat that?`,
        src: src("Kas te saaksite korrata?"),
      },
      {
        id: "aeglasemalt",
        left: "Palun rääkige aeglasemalt.",
        right: t`Please speak more slowly.`,
        src: src("Palun rääkige aeglasemalt."),
      },
      {
        id: "halb",
        left: "Ühendus on halb.",
        right: t`The connection is bad.`,
        src: src("Ühendus on halb."),
      },
      {
        id: "tagasi",
        left: "Palun helistage mulle tagasi.",
        right: t`Please call me back.`,
        src: src("Palun helistage mulle tagasi."),
      },
    ];

    const line = (clip: keyof typeof PHONE_DIALOGUE) => {
      const said = PHONE_DIALOGUE[clip];
      return typeof said === "string" ? said : said.text;
    };
    const talk: DialogueTurn[] = [
      { who: "them", clip: "d-kati-1", line: line("d-kati-1") },
      {
        who: "you",
        clip: "d-sina-1",
        replies: [
          {
            line: "Tere! Kas ma saaksin rääkida Mart?",
            why: (
              <Trans>
                <Et>Rääkima</Et> asks <Et>kellega?</Et>, so the name takes <End>ga</End>:{" "}
                <Et>Mardiga</Et>.
              </Trans>
            ),
          },
          { line: line("d-sina-1"), right: true },
          {
            line: "Tere! Kas ma saaksin palun rääkida Mardist?",
            why: (
              <Trans>
                <Et>Mardist</Et> is about Mart. To speak with him, use <Et>Mardiga</Et>.
              </Trans>
            ),
          },
        ],
      },
      { who: "them", clip: "d-kati-2", line: line("d-kati-2") },
      {
        who: "you",
        clip: "d-sina-2",
        replies: [
          {
            line: "Jah, palun. Palun helistage mind tagasi.",
            why: (
              <Trans>
                <Et>Helistama</Et> asks <Et>kellele?</Et>: <Et>mulle</Et>.
              </Trans>
            ),
          },
          {
            line: "Jah, palun. Ma helistan hiljem teile tagasi.",
            why: <Trans>That says you will call later. You want Mart to call you.</Trans>,
          },
          { line: line("d-sina-2"), right: true },
        ],
      },
      { who: "them", clip: "d-kati-3", line: line("d-kati-3") },
      {
        who: "you",
        clip: "d-sina-3",
        replies: [
          {
            line: "Teie number on viis kaks üks neli kolm.",
            why: (
              <Trans>
                <Et>Teie</Et> is Kati’s word for your. You give your own number: <Et>minu</Et>.
              </Trans>
            ),
          },
          { line: line("d-sina-3"), right: true },
          {
            line: "Teie nimi on Anna.",
            why: (
              <Trans>
                That gives a name, and <Et>teie</Et> is Kati’s word for your. She asked for your
                number: <Et>minu number</Et>.
              </Trans>
            ),
          },
        ],
      },
      { who: "them", clip: "d-kati-4", line: line("d-kati-4") },
      {
        who: "you",
        clip: "d-sina-4",
        replies: [
          {
            line: "Tere! Aitäh!",
            why: (
              <Trans>
                <Et>Tere</Et> is hello. The call is ending, so say <Et>head aega</Et>.
              </Trans>
            ),
          },
          { line: line("d-sina-4"), right: true },
          {
            line: "Palun! Aitäh ja head aega!",
            why: (
              <Trans>
                <Et>Palun</Et> answers a thank you, and Kati has not thanked you. Say <Et>aitäh</Et>
                .
              </Trans>
            ),
          },
        ],
      },
    ];

    const note: PassageQuestion[] = [
      {
        id: "second-call",
        ask: t`Who did Liis phone after Mari did not answer?`,
        options: [
          { id: "jaan", label: t`Jaan` },
          { id: "kati", label: t`Kati, her neighbour` },
          { id: "mother", label: t`Her mother` },
        ],
        answer: "jaan",
        line: 2,
      },
      {
        kind: "truefalse",
        id: "heard-well",
        ask: t`Liis heard Jaan well in the evening.`,
        answer: false,
        line: 3,
      },
      {
        kind: "short",
        id: "wrote",
        ask: t`What did Liis write to Jaan? Write it in Estonian.`,
        answers: ["sõnumi", "sõnum"],
        line: 5,
      },
      {
        id: "morning",
        ask: t`What happened this morning?`,
        options: [
          { id: "jaan-phoned", label: t`Jaan phoned Liis back` },
          { id: "liis-phoned", label: t`Liis phoned Jaan again` },
          { id: "mari-phoned", label: t`Mari phoned Liis` },
        ],
        answer: "jaan-phoned",
        line: 7,
      },
      {
        kind: "truefalse",
        id: "good-line",
        ask: t`The connection was good this morning.`,
        answer: true,
        line: 8,
      },
      {
        id: "where",
        ask: t`Where does Jaan want to meet Mari?`,
        options: [
          { id: "cafe", label: t`In a café in town` },
          { id: "work", label: t`At Liis’s work` },
          { id: "home", label: t`At his home` },
        ],
        answer: "cafe",
        line: 9,
      },
      {
        kind: "truefalse",
        id: "liis-comes",
        ask: t`Liis can go to the meeting.`,
        answer: false,
        line: 10,
      },
      {
        kind: "short",
        id: "ask-do",
        ask: t`What does Liis ask Mari to do for Jaan? Write one word in Estonian.`,
        answers: ["helistada"],
        line: 11,
      },
    ];

    const office: PassageQuestion[] = [
      {
        id: "who",
        ask: t`Who does Mari want to speak with?`,
        options: [
          { id: "kati", label: t`Kati` },
          { id: "peeter", label: t`Peeter` },
          { id: "mart", label: t`Mart` },
        ],
        answer: "kati",
        line: 3,
      },
      {
        kind: "truefalse",
        id: "hears",
        ask: t`Peeter hears Mari well at first.`,
        answer: false,
        line: 4,
      },
      {
        kind: "truefalse",
        id: "yesterday",
        ask: t`Mari phoned yesterday and someone answered.`,
        answer: false,
        line: 7,
      },
      {
        id: "back",
        ask: t`When does Kati come back?`,
        options: [
          { id: "tomorrow", label: t`Tomorrow morning` },
          { id: "tonight", label: t`This evening` },
          { id: "friday", label: t`On Friday` },
        ],
        answer: "tomorrow",
        line: 13,
      },
      {
        kind: "truefalse",
        id: "slower",
        ask: t`Mari asks Peeter to speak more slowly.`,
        answer: true,
        line: 15,
      },
      {
        kind: "short",
        id: "time",
        ask: t`At what time will Mari come to the office? Write it in Estonian.`,
        answers: ["kell kümme", "kümme", "10", "kell 10"],
        line: 18,
      },
      {
        kind: "truefalse",
        id: "ten-fine",
        ask: t`Peeter says ten o’clock is a good time.`,
        answer: true,
        line: 20,
      },
      {
        kind: "truefalse",
        id: "wrong-number",
        ask: t`Peeter first says Mari’s number wrongly.`,
        answer: true,
        line: 28,
      },
      {
        id: "ask-kati",
        ask: t`What does Mari ask Kati to do?`,
        options: [
          { id: "phone", label: t`Phone her back` },
          { id: "write", label: t`Write her a message` },
          { id: "wait", label: t`Wait for her at the office` },
        ],
        answer: "phone",
        line: 30,
      },
    ];

    return { heard, pairs, talk, note, office };
  }, [t]);
}

export function TelefonikoneLesson() {
  const { t, i18n } = useLingui();
  const content = useContent();
  const government = lessonBySlug("ootan-sind")?.n;
  const conditional = lessonBySlug("laheksin")?.n;
  const past = lessonBySlug("lihtminevik")?.n;
  const pronouns = lessonBySlug("asesonad")?.n;
  const names = { third: t`Mari`, fourth: t`Peeter` };
  const rowsOf = (texts: readonly string[]): RowItem[] =>
    texts.map((text) => ({
      main: text,
      sub: MEANS[text] ? i18n._(MEANS[text]) : "",
      src: src(text),
    }));

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Answer a call, ask for someone, ask them to repeat, leave a message and give your number.
          It uses <Et>rääkima</Et> with <End>ga</End>, <Et>helistama</Et> with <End>le</End>, the
          polite <Et>saaksite</Et> and the past tense.
        </Trans>
      }
      facts={[
        <Trans key="m">25 minutes</Trans>,
        <Trans key="q">
          4 quizzes, a conversation, a reading and a recording you can play twice
        </Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["halloo", "hetk", "korrata", "tagasi", "sõnum", "ühendus"]}
      recap={[
        <Trans key="1">
          Answer with <b lang="et">Halloo!</b> or your name: <b lang="et">Mari kuuleb.</b> Ask for
          someone with <b lang="et">Kas Mart on seal?</b>
        </Trans>,
        <Trans key="2">
          <b lang="et">Rääkima</b> asks <b lang="et">kellega?</b>, so the name takes <End>ga</End>:{" "}
          <b lang="et">Kas ma saaksin rääkida Mardiga?</b>
        </Trans>,
        <Trans key="3">
          <b lang="et">Helistama</b> asks <b lang="et">kellele?</b>: <b lang="et">mulle</b>,{" "}
          <b lang="et">sulle</b>, <b lang="et">teile</b>. The past is <b lang="et">helistasin</b>,
          and the present with a time word usually says the future: <b lang="et">helistan homme</b>.
        </Trans>,
        <Trans key="4">
          To a stranger, use <b lang="et">te</b>: <b lang="et">Kas te saaksite korrata?</b> The
          command usually ends in <End>ge</End>: <b lang="et">rääkige</b>,{" "}
          <b lang="et">helistage</b>.
        </Trans>,
        <Trans key="5">
          Say what is wrong with <b lang="et">Ühendus on halb.</b> or{" "}
          <b lang="et">Ma ei kuule teid hästi.</b> Ask for a message with{" "}
          <b lang="et">Kas ma võin sõnumi jätta?</b>
        </Trans>,
      ]}
      sections={[
        {
          id: "ask",
          title: t`Answering and asking for someone`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    An Estonian answers the phone with <Word w="Halloo" /> or with their own name:{" "}
                    <Word w="Mari kuuleb." />, which English says as “Mari speaking”. To ask whether
                    someone is there, say <Word w="Kas Mart on seal?" />
                  </Trans>
                </p>
                <p>
                  <Trans>
                    To ask to speak with someone, say <Word w="Kas ma saaksin rääkida Mardiga?" />{" "}
                    <Word w="Rääkima" /> asks <Et>kellega?</Et>, with whom, so the name takes{" "}
                    <End>ga</End>: Mart becomes <Et>Mardiga</Et>. Lesson {government} explains how
                    verbs choose a case, and lesson {conditional} the polite <Et>saaksin</Et>.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rowsOf(PHONE_ASK)} />
              <Prose>
                <p>
                  <Trans>Write what you would say.</Trans>
                </p>
              </Prose>
              <Quiz
                id="say-phone"
                title={<Trans>Write it in Estonian</Trans>}
                items={sayItems(i18n)}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six written right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Read the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Play the phrases above once more, then try again.</Trans>
                  )
                }
                recall={sentenceRecall}
                round={(props) => <SentenceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "message",
          title: t`Leaving a message`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    To leave a message, ask <Word w="Kas ma võin sõnumi jätta?" /> To ask for a
                    call, use the polite command <Word w="Palun helistage mulle tagasi." />
                  </Trans>
                </p>
                <p>
                  <Trans>
                    <Word w="Helistama" /> asks <Et>kellele?</Et>, so you phone to someone:{" "}
                    <Et>mulle</Et>, <Et>sulle</Et>, <Et>teile</Et>. For what already happened, use
                    the past: <Et>helistasin</Et>, as in lesson {past}. For what will happen, the
                    present with a time word such as <Word w="homme" /> is usually enough:{" "}
                    <Et>helistan</Et> <Et>homme</Et>.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rowsOf(PHONE_MESSAGE)} />
              <Prose>
                <p>
                  <Trans>
                    Hear a sentence, then say whether the call already happened or will happen.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="when-call"
                title={<Trans>Past or future?</Trans>}
                items={content.heard}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight: the verb and the time word told you each time.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Play the sentences above once more, then try again.</Trans>
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
          id: "again",
          title: t`Asking someone to repeat`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    When the line is bad, say <Word w="Ühendus on halb." /> or{" "}
                    <Word w="Ma ei kuule teid hästi." /> Then ask{" "}
                    <Word w="Kas te saaksite korrata?" /> and add{" "}
                    <Word w="Palun rääkige aeglasemalt." /> To ask someone to wait, say{" "}
                    <Word w="Hetk, palun." />
                  </Trans>
                </p>
                <p>
                  <Trans>
                    <Et>Te</Et> is you to one person you don’t know well, as in lesson {pronouns}.
                    The command for <Et>te</Et> usually ends in <End>ge</End>: <Et>rääkige</Et>,{" "}
                    <Et>helistage</Et>.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rowsOf(PHONE_AGAIN)} />
              <Aside>
                <Trans>
                  To a friend, use <Et>sa</Et> instead: <Et>Kas sa saaksid korrata?</Et> and{" "}
                  <Et>räägi aeglasemalt</Et>.
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>Match each phrase with its meaning.</Trans>
                </p>
              </Prose>
              <Match
                id="phone-phrases"
                title={<Trans>Which meaning?</Trans>}
                pairs={content.pairs}
                columns={[<Trans key="e">Estonian</Trans>, <Trans key="m">Meaning</Trans>]}
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
                    Each sentence has one word in the wrong form. Tap it, then write the right form.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-phone"
                title={<Trans>Find and fix the mistake</Trans>}
                items={fixItems()}
                rounds={7}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All seven found and fixed.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Read the reason under each one you missed.</Trans>
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
          id: "call",
          title: t`Phoning Mart’s office`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    You phone Mart’s office. Kati answers, and you hear her lines as sound only; tap
                    one to read it. Pick what you say back. A wrong reply says why, then you hear
                    the right one.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="mart-office"
                title={<Trans>Talk: asking for Mart</Trans>}
                part={
                  <Trans>
                    You are Anna. You want to speak with Mart, and your number is 5 2 1 4 3.
                  </Trans>
                }
                them={t`Kati`}
                turns={content.talk}
                text="sound"
              />
            </>
          ),
        },
        {
          id: "note",
          title: t`Liis’s message`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Liis writes to Mari about a day of calls. Read her message, then answer the
                    questions. Once you check your answers, tap a word in the message to open its
                    card.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="liis-message"
                title={<Trans>Liis’s message to Mari</Trans>}
                by={t`Liis writes`}
                clip="p-note"
                sentences={PHONE_NOTE}
                questions={content.note}
              />
            </>
          ),
        },
        {
          id: "listen",
          title: t`Listen: Mari phones an office`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari phones an office and the line is bad. Read the questions first. You can
                    play the recording twice, as in the A2 exam.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="office-call"
                title={<Trans>Listen: Mari and Peeter</Trans>}
                clip="c-office"
                turns={PHONE_TALK.turns}
                names={names}
                questions={content.office}
                plays={2}
              />
            </>
          ),
        },
      ]}
    />
  );
}
