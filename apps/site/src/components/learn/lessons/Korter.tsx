import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  FLAT_DIALOGUE,
  FLAT_FIX,
  FLAT_MESSAGE,
  FLAT_PASSAGES,
  FLAT_SAY,
  FLAT_SORT,
  FLAT_TALK,
  clipId,
  clipUrl,
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
import { Writing } from "../Writing";

const SLUG = "korter";
const src = (text: string) => clipUrl(SLUG, clipId(text));

function Et({ children }: { children: ReactNode }) {
  return <span lang="et">{children}</span>;
}

const GLOSSARY: Glossary = {
  korter: { en: msg`a flat, an apartment` },
  kuulutus: { en: msg`an advert` },
  kuulutust: { en: msg`advert`, note: msg`Kuulutus as the object of nägin.` },
  kahetoaline: { en: msg`two-room`, note: msg`Kaks tuba: two rooms.` },
  kesklinnas: { en: msg`in the city centre` },
  lift: { en: msg`a lift` },
  lifti: { en: msg`a lift`, note: msg`Lift after ei ole.` },
  akent: { en: msg`windows`, note: msg`Aken, a window; after kaks or a higher number, akent.` },
  rõdu: { en: msg`a balcony` },
  rõdult: { en: msg`from the balcony` },
  magamistuba: { en: msg`a bedroom` },
  köök: { en: msg`a kitchen` },
  pesumasin: { en: msg`a washing machine` },
  vannituba: { en: msg`a bathroom` },
  üür: { en: msg`rent` },
  kuus: { en: msg`a month; six`, note: msg`In an advert, eurot kuus is euros a month.` },
  bussipeatus: { en: msg`a bus stop` },
  rongijaama: { en: msg`to the railway station` },
  sobib: { en: msg`suits` },
  pliit: { en: msg`a cooker` },
  kumb: { en: msg`which of the two` },
  "minu jaoks": { en: msg`for me` },
  liiga: { en: msg`too` },
  jõge: { en: msg`river`, note: msg`Jõgi, a river; here the object of näeb.` },
  kaugel: { en: msg`far` },
  vaikne: { en: msg`quiet` },
  alles: { en: msg`only, not until` },
  omanikule: { en: msg`to the owner` },
  kasti: { en: msg`boxes`, note: msg`Kast, a box; after kaks or a higher number, kasti.` },
  voodi: { en: msg`a bed` },
  appi: { en: msg`to someone’s aid, to help` },
};

function useReplyGaps(): GapItem[] {
  const lines = FLAT_PASSAGES.reply;
  const cut = (sentence: string, word: string) => {
    const at = sentence.indexOf(word);
    return { before: sentence.slice(0, at).trim(), after: sentence.slice(at + word.length).trim() };
  };
  return [
    {
      id: "opetajana",
      ...cut(`${lines[0]} ${lines[1]} ${lines[2]} ${lines[3]}`, "õpetajana"),
      answer: "õpetajana",
      why: (
        <Trans>
          Working as usually takes <Et>-na</Et>: <Et>õpetajana</Et>.
        </Trans>
      ),
    },
    {
      id: "kassi",
      ...cut(lines[4], "kassi"),
      answer: "kassi",
      why: (
        <Trans>
          When you don’t have something, <Et>ei ole</Et> takes the partitive: <Et>kassi</Et>.
        </Trans>
      ),
    },
    {
      id: "vaatama",
      ...cut(lines[5], "vaatama"),
      answer: "vaatama",
      why: (
        <Trans>
          Coming to do something takes the <Et>-ma</Et> infinitive: <Et>vaatama tulla</Et>.
        </Trans>
      ),
    },
    {
      id: "sisse",
      ...cut(lines[6], "sisse"),
      answer: "sisse",
      why: (
        <Trans>
          Moving in is <Et>sisse kolima</Et>; <Et>välja</Et> would be moving out.
        </Trans>
      ),
    },
    {
      id: "koogis",
      ...cut(`${lines[7]} ${lines[8]}`, "köögis"),
      answer: "köögis",
      why: (
        <Trans>
          Where something is usually takes <Et>-s</Et>: <Et>köögis</Et>.
        </Trans>
      ),
    },
  ];
}

const SAY_PROMPTS: Record<(typeof FLAT_SAY)[number]["id"], MessageDescriptor> = {
  korrusel: msg`The flat is on the third floor.`,
  lift: msg`Is there a lift in the building?`,
  uur: msg`How much is the rent?`,
  kolida: msg`I want to move in on Friday.`,
  kook: msg`The kitchen is small but new.`,
  vaatama: msg`Can I come and see the flat tomorrow?`,
};

const FIX_PROMPTS: Record<(typeof FLAT_FIX)[number]["id"], MessageDescriptor> = {
  kolmandal: msg`The flat is on the third floor.`,
  lifti: msg`There is no lift in the building.`,
  kolida: msg`I want to move in.`,
  vaiksem: msg`The kitchen is smaller than the room.`,
  esimesest: msg`The flat is free from the first of December.`,
  korterisse: msg`I’m going into the flat.`,
};

const FIX_WHY: Record<(typeof FLAT_FIX)[number]["id"], ReactNode> = {
  kolmandal: (
    <Trans>
      On a floor takes <Et>-l</Et>, and the number usually takes it too: <Et>kolmandal korrusel</Et>
      .
    </Trans>
  ),
  lifti: (
    <Trans>
      When something isn’t there, <Et>ei ole</Et> takes the partitive: <Et>lifti</Et>.
    </Trans>
  ),
  kolida: (
    <Trans>
      After <Et>tahan</Et>, the <Et>-da</Et> infinitive: <Et>kolida</Et>.
    </Trans>
  ),
  vaiksem: (
    <Trans>
      Smaller is <Et>väiksem</Et> or <Et>väikesem</Et>, from <Et>väike</Et>.
    </Trans>
  ),
  esimesest: (
    <Trans>
      From a date usually takes <Et>-st</Et> on both words: <Et>esimesest detsembrist</Et>.
    </Trans>
  ),
  korterisse: (
    <Trans>
      Going into usually takes <Et>-sse</Et>: <Et>korterisse</Et>.
    </Trans>
  ),
};

function sayItems(i18n: I18n): SentenceItem[] {
  return FLAT_SAY.map(({ id, answers }) => ({
    kind: "translate",
    id: `say-${id}`,
    prompt: i18n._(SAY_PROMPTS[id]),
    src: src(answers[0]),
    answers,
  }));
}

function fixItems(i18n: I18n): FixItem[] {
  return FLAT_FIX.map(({ id, wrong, answers }) => ({
    kind: "fix",
    id: `fix-${id}`,
    wrong,
    answers,
    prompt: i18n._(FIX_PROMPTS[id]),
    src: src(answers[0]),
    explain: FIX_WHY[id],
  }));
}

function useContent() {
  const { t } = useLingui();
  return useMemo(() => {
    const advert: PassageQuestion[] = [
      {
        id: "rooms",
        ask: t`How many rooms does the flat have?`,
        options: [
          { id: "one", label: t`One` },
          { id: "two", label: t`Two` },
          { id: "three", label: t`Three` },
        ],
        answer: "two",
        line: 0,
      },
      {
        id: "floor",
        kind: "short",
        ask: t`Which floor is the flat on? Write it as the advert does.`,
        answers: ["kolmandal", "kolmandal korrusel"],
        line: 1,
      },
      {
        id: "new",
        kind: "truefalse",
        ask: t`The flat is new.`,
        answer: true,
        line: 2,
      },
      {
        id: "rent",
        ask: t`How much is the rent?`,
        options: [
          { id: "400", label: t`400 euros a month` },
          { id: "450", label: t`450 euros a month` },
          { id: "500", label: t`500 euros a month` },
        ],
        answer: "450",
        line: 8,
      },
      {
        id: "cat",
        kind: "truefalse",
        ask: t`You can keep a cat in the flat.`,
        answer: false,
        line: 12,
      },
      {
        id: "call",
        ask: t`When should you call?`,
        options: [
          { id: "morning", label: t`In the morning` },
          { id: "evening", label: t`In the evening, after six` },
          { id: "any", label: t`Any time` },
        ],
        answer: "evening",
        line: 14,
      },
    ];

    const talk: PassageQuestion[] = [
      {
        id: "how-many",
        kind: "truefalse",
        ask: t`Jaan saw two flats today.`,
        answer: true,
        line: 3,
      },
      {
        id: "bigger",
        ask: t`Which flat is bigger?`,
        options: [
          { id: "centre", label: t`The one in the city centre` },
          { id: "annelinn", label: t`The one in Annelinn` },
          { id: "same", label: t`They’re the same size` },
        ],
        answer: "centre",
        line: 7,
      },
      {
        id: "price",
        ask: t`How much is the flat in the centre?`,
        options: [
          { id: "400", label: t`400 euros` },
          { id: "450", label: t`450 euros` },
          { id: "600", label: t`600 euros` },
        ],
        answer: "600",
        line: 11,
      },
      {
        id: "view",
        ask: t`What can you see from its balcony?`,
        options: [
          { id: "river", label: t`A river` },
          { id: "park", label: t`A park` },
          { id: "station", label: t`The station` },
        ],
        answer: "river",
        line: 14,
      },
      {
        id: "bus",
        kind: "short",
        ask: t`How many minutes is the small flat from the centre by bus? Write the number in Estonian.`,
        answers: ["kakskümmend", "20", "kakskümmend minutit", "20 minutit"],
        line: 21,
      },
      {
        id: "quiet",
        kind: "truefalse",
        ask: t`It is noisy in Annelinn.`,
        answer: false,
        line: 25,
      },
      {
        id: "floor",
        kind: "short",
        ask: t`Which floor is the small flat on? Write it as Jaan says it.`,
        answers: ["viiendal", "viiendal korrusel"],
        line: 28,
      },
      {
        id: "free",
        ask: t`When is the small flat free?`,
        options: [
          { id: "dec", label: t`From the first of December` },
          { id: "jan", label: t`From January` },
          { id: "now", label: t`Now` },
        ],
        answer: "dec",
        line: 30,
      },
      {
        id: "call",
        ask: t`Who will Jaan call tomorrow?`,
        options: [
          { id: "owner", label: t`The owner` },
          { id: "liis", label: t`Liis` },
          { id: "brother", label: t`His brother` },
        ],
        answer: "owner",
        line: 36,
      },
    ];

    const line = (clip: keyof typeof FLAT_DIALOGUE) => {
      const said = FLAT_DIALOGUE[clip];
      return typeof said === "string" ? said : said.text;
    };
    const viewing: DialogueTurn[] = [
      { who: "them", clip: "d-mari-1", line: line("d-mari-1") },
      {
        who: "you",
        clip: "d-sina-1",
        replies: [
          { line: line("d-sina-1"), right: true },
          {
            line: "Tere! Ma tulen välja.",
            why: (
              <Trans>
                She asks you in, so you go <Et>sisse</Et>, not out.
              </Trans>
            ),
          },
          {
            line: "Head aega, Mari!",
            why: <Trans>That says goodbye, and you have only just come.</Trans>,
          },
        ],
      },
      { who: "them", clip: "d-mari-2", line: line("d-mari-2") },
      {
        who: "you",
        clip: "d-sina-2",
        replies: [
          {
            line: "Tuba on väike. Kus on kööki?",
            why: (
              <Trans>
                The thing you ask about stays in its basic form: <Et>Kus on köök?</Et> And the room
                is big.
              </Trans>
            ),
          },
          {
            line: "Tuba on väga ilus. Kus on kööki?",
            why: (
              <Trans>
                <Et>Kööki</Et> is where you go; where something is, ask <Et>Kus on köök?</Et>
              </Trans>
            ),
          },
          { line: line("d-sina-2"), right: true },
        ],
      },
      { who: "them", clip: "d-mari-3", line: line("d-mari-3") },
      {
        who: "you",
        clip: "d-sina-3",
        replies: [
          {
            line: "Ei, mul ei ole kass.",
            why: (
              <Trans>
                When you don’t have something, <Et>ei ole</Et> takes the partitive: <Et>kassi</Et>.
              </Trans>
            ),
          },
          { line: line("d-sina-3"), right: true },
          {
            line: "Mul on kaks kass.",
            why: (
              <Trans>
                After <Et>kaks</Et>, the partitive: <Et>kaks kassi</Et>. And the advert says no
                cats.
              </Trans>
            ),
          },
        ],
      },
      { who: "them", clip: "d-mari-4", line: line("d-mari-4") },
      {
        who: "you",
        clip: "d-sina-4",
        replies: [
          {
            line: "Esimene detsember.",
            why: (
              <Trans>
                On a date takes <Et>-l</Et>: <Et>esimesel detsembril</Et>.
              </Trans>
            ),
          },
          {
            line: "Esimesel detsembril välja.",
            why: <Trans>She asks when you move in, not out.</Trans>,
          },
          { line: line("d-sina-4"), right: true },
        ],
      },
    ];
    return { advert, talk, viewing };
  }, [t]);
}

export function KorterLesson() {
  const { t, i18n } = useLingui();
  const content = useContent();
  const gaps = useReplyGaps();
  const places = lessonBySlug("majas-majja-majast")?.n;
  const particles = lessonBySlug("ules-valja-ara")?.n;

  const bins: SortBin[] = [
    {
      id: "kus",
      label: "kus?",
      hint: <Trans>where</Trans>,
      rule: (
        <Trans>
          Where something is: usually <Et>-s</Et>, or <Et>-l</Et> on a balcony: <Et>köögis</Et>,{" "}
          <Et>rõdul</Et>.
        </Trans>
      ),
    },
    {
      id: "kuhu",
      label: "kuhu?",
      hint: <Trans>where to</Trans>,
      rule: (
        <Trans>
          Where to: usually <Et>-sse</Et> or a short form, or <Et>-le</Et> onto a balcony:{" "}
          <Et>korterisse</Et>, <Et>kööki</Et>, <Et>rõdule</Et>.
        </Trans>
      ),
    },
  ];
  const sorted: SortItem[] = FLAT_SORT.map(({ w, bin }) => ({ w, bin, src: src(w) }));

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Read a flat advert, write to the owner, look round the flat, and follow a call about two
          flats. Then write a short message of your own.
        </Trans>
      }
      facts={[
        <Trans key="m">20 minutes</Trans>,
        <Trans key="q">6 exercises, 3 of them typed, a conversation and a message</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["korter", "tuba", "köök", "rõdu", "üür", "lift", "kesklinnas", "sisse kolima"]}
      recap={[
        <Trans key="1">
          On a floor: <b lang="et">kolmandal korrusel</b>, usually both words with{" "}
          <b lang="et">-l</b>.
        </Trans>,
        <Trans key="2">
          When something isn’t there or you don’t have it, <b lang="et">ei ole</b> takes the
          partitive: <b lang="et">Majas ei ole lifti</b>.
        </Trans>,
        <Trans key="3">
          Where something is, <b lang="et">köögis</b>; where it goes, <b lang="et">kööki</b> or{" "}
          <b lang="et">korterisse</b>.
        </Trans>,
        <Trans key="4">
          Moving in is <b lang="et">sisse kolima</b>, moving out <b lang="et">välja kolima</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "advert",
          title: t`A flat advert`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Jaan is looking for a <Word w="korter" />, a flat, in Tartu. Read the advert,
                    then answer the questions. Once you check your answers, tap a word to open its
                    card.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="flat-advert"
                title={<Trans>An advert for a flat</Trans>}
                by={t`Mari Tamm writes`}
                clip="p-advert"
                sentences={FLAT_PASSAGES.advert}
                questions={content.advert}
              />
            </>
          ),
        },
        {
          id: "reply",
          title: t`Jaan writes to the owner`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Drag a word into each gap, or tap a word to put it in the open gap. Some words
                    are spare. The gaps test <Et>-na</Et> for working as, the partitive after{" "}
                    <Et>ei ole</Et>, the <Et>-ma</Et> infinitive, <Et>sisse</Et> from lesson{" "}
                    {particles} and where something is.
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="jaan-message"
                title={<Trans>Fill the gaps: Jaan’s message</Trans>}
                gaps={gaps}
                mode="drag"
                spare={["õpetajat", "kass", "vaadata", "välja", "kööki"]}
                clip="p-reply"
              />
            </>
          ),
        },
        {
          id: "where",
          title: t`Where, or where to`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    As in lesson {places}, where something is and where it goes take different
                    endings. Put each word in its group. Tap a word to hear it.
                  </Trans>
                </p>
              </Prose>
              <Sort
                id="flat-where"
                title={<Trans>Where, or where to?</Trans>}
                bins={bins}
                items={sorted}
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
                  <Trans>Write what you’d say about a flat.</Trans>
                </p>
              </Prose>
              <Quiz
                id="say-flat"
                title={<Trans>Write it in Estonian</Trans>}
                items={sayItems(i18n)}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six written right.</Trans>
                  ) : share >= 0.6 ? (
                    <Trans>Most of them. Read the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Read the advert once more, then try again.</Trans>
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
                    Each sentence should say what the line above it says, and one word is wrong. Tap
                    it, then type it right.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-flat"
                title={<Trans>Fix the sentence</Trans>}
                items={fixItems(i18n)}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six found and fixed.</Trans>
                  ) : share >= 0.6 ? (
                    <Trans>Most of them. Read the reason under each one you missed.</Trans>
                  ) : (
                    <Trans>Read What to remember at the end, then try again.</Trans>
                  )
                }
                recall={fixRecall}
                round={(props) => <FixRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "viewing",
          title: t`Looking round the flat`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Jaan comes to see the flat, and Mari, the owner, shows him round. If you pick a
                    wrong reply, you see why, then hear the right one.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="at-the-flat"
                title={<Trans>Talk: looking round the flat</Trans>}
                part={
                  <Trans>
                    You are Jaan. You have no pets and want to move in on the first of December.
                  </Trans>
                }
                them={t`Mari`}
                turns={content.viewing}
              />
            </>
          ),
        },
        {
          id: "listen",
          title: t`Listen: two flats`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Jaan has seen two flats, and his friend Liis calls him. Read the questions
                    first. You can play the recording twice, as in the A2 exam.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="two-flats"
                title={<Trans>Listen: Jaan and Liis</Trans>}
                clip="c-talk"
                turns={FLAT_TALK.turns}
                names={{ main: t`Jaan`, second: t`Liis` }}
                questions={content.talk}
                plays={2}
              />
            </>
          ),
        },
        {
          id: "write",
          title: t`Write to the owner`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Now write your own message to Mari, about 30 words. Then compare it with the
                    model and tick what yours does.
                  </Trans>
                </p>
              </Prose>
              <Writing
                id="flat-message"
                title={<Trans>Write to Mari</Trans>}
                prompt={
                  <Trans>
                    Greet Mari, say who you are, ask to come and see the flat on a day you name, ask
                    one question about the flat, and thank her.
                  </Trans>
                }
                model={FLAT_MESSAGE}
                src={src("p-message")}
                checks={[
                  { id: "greet", label: <Trans>Greets Mari.</Trans> },
                  { id: "who", label: <Trans>Says who you are.</Trans> },
                  { id: "visit", label: <Trans>Asks to come and see the flat, with a day.</Trans> },
                  { id: "question", label: <Trans>Asks one question about the flat.</Trans> },
                  { id: "thanks", label: <Trans>Thanks her and signs.</Trans> },
                ]}
              />
            </>
          ),
        },
      ]}
    />
  );
}
