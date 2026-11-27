import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { CornerDownRight } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  KUSIMUSED_ASKED,
  KUSIMUSED_SENTENCES,
  KUSIMUSED_TALK,
  KUSIMUSED_TRANSLATED,
} from "../../../lib/learn/clips";
import { playSound, toggleSound, usePlaying } from "../../../lib/learn/player";
import { eachPairFirst } from "../../../lib/learn/quiz";
import { Chips, Panel } from "../Explore";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Match, type MatchPair } from "../Match";
import { Listening, type PassageQuestion } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { PlayButton, PlayMark } from "../Sound";
import { Word } from "../Word";

const SLUG = "kusimused";
type Id = keyof typeof KUSIMUSED_SENTENCES;
const said = (id: Id) => KUSIMUSED_SENTENCES[id];
const src = (id: Id) => clipUrl(SLUG, id);

/** What each sentence means, in the reader's language. */
const MEANS: Record<Id, MessageDescriptor> = {
  "s-elad": msg`You live in Tallinn.`,
  "q-elad": msg`Do you live in Tallinn?`,
  "s-raagid": msg`You speak Estonian.`,
  "q-raagid": msg`Do you speak Estonian?`,
  "s-kodus": msg`He or she is at home.`,
  "q-kodus": msg`Is he or she at home?`,
  "s-kohv": msg`You drink coffee.`,
  "q-kohv": msg`Do you drink coffee?`,
  "s-tootavad": msg`They’re working today.`,
  "q-tootavad": msg`Are they working today?`,
  "c-voi": msg`You live in Tallinn, don’t you?`,
  "a-jah": msg`Yes.`,
  "a-ei": msg`No.`,
  "a-ei-ole": msg`No, he or she isn’t.`,
  "a-ei-tea": msg`I don’t know.`,
  "q-kes": msg`Who is that?`,
  "a-kes": msg`That’s Jaan.`,
  "q-mis": msg`What is that?`,
  "a-mis": msg`That’s a book.`,
  "q-kus": msg`Where do you live?`,
  "a-kus": msg`In Tallinn.`,
  "q-millal": msg`When are you working?`,
  "a-millal": msg`Tomorrow.`,
  "q-miks": msg`Why are you learning Estonian?`,
  "a-miks": msg`Because I live in Tallinn.`,
  "q-kuidas": msg`How are you learning Estonian?`,
  "a-kuidas": msg`I read a lot.`,
  "q-kui-palju": msg`How much coffee do you drink?`,
  "a-kui-palju": msg`A little.`,
  "q-nimi": msg`What’s your name?`,
  "a-nimi": msg`My name is Mari.`,
  "q-laheb": msg`How’s it going?`,
  "a-laheb": msg`Fine, thanks. And you?`,
  "q-parit": msg`Where are you from?`,
  "a-parit": msg`I’m from Ukraine.`,
  "w-kes-tartus": msg`Who lives in Tartu?`,
  "w-kes-raagib": msg`Who speaks Estonian?`,
  "w-mis-teed": msg`What are you doing?`,
  "w-mis-loed": msg`What are you reading?`,
  "w-kus-tootab": msg`Where does he or she work?`,
  "w-kus-elate": msg`Where do you all live?`,
  "w-millal-sood": msg`When do you eat?`,
  "w-millal-loed": msg`When do you read?`,
  "w-miks-ootad": msg`Why are you waiting?`,
  "w-miks-opib": msg`Why is he or she learning Estonian?`,
  "w-kuidas-elad": msg`How are you getting on?`,
  "w-kuidas-raagib": msg`How does he or she speak Estonian?`,
  "w-palju-tootad": msg`How much do you work?`,
  "w-palju-vett": msg`How much water do you drink?`,
};

type QuestionWord = "kes" | "mis" | "kus" | "millal" | "miks" | "kuidas" | "kui palju";

/** The question words, what each asks about, and a question with its answer. */
const QUESTION_WORDS: readonly {
  word: QuestionWord;
  means: MessageDescriptor;
  asks: MessageDescriptor;
  q: Id;
  a: Id;
}[] = [
  { word: "kes", means: msg`who`, asks: msg`Usually asks about a person.`, q: "q-kes", a: "a-kes" },
  { word: "mis", means: msg`what`, asks: msg`Usually asks about a thing.`, q: "q-mis", a: "a-mis" },
  { word: "kus", means: msg`where`, asks: msg`Asks about a place.`, q: "q-kus", a: "a-kus" },
  { word: "millal", means: msg`when`, asks: msg`Asks about a time.`, q: "q-millal", a: "a-millal" },
  { word: "miks", means: msg`why`, asks: msg`Asks for a reason.`, q: "q-miks", a: "a-miks" },
  {
    word: "kuidas",
    means: msg`how`,
    asks: msg`Asks how, or how things are.`,
    q: "q-kuidas",
    a: "a-kuidas",
  },
  {
    word: "kui palju",
    means: msg`how much, how many`,
    asks: msg`Asks about an amount.`,
    q: "q-kui-palju",
    a: "a-kui-palju",
  },
];

/** A run's questions for “what does it ask?”, two to each word. */
const ASKS: readonly { id: Id; word: QuestionWord; dictated?: false }[] = [
  { id: "w-kes-tartus", word: "kes" },
  { id: "w-kes-raagib", word: "kes" },
  { id: "w-mis-teed", word: "mis" },
  { id: "w-mis-loed", word: "mis" },
  { id: "w-kus-tootab", word: "kus", dictated: false },
  { id: "w-kus-elate", word: "kus" },
  { id: "w-millal-sood", word: "millal" },
  { id: "w-millal-loed", word: "millal" },
  { id: "w-miks-ootad", word: "miks" },
  { id: "w-miks-opib", word: "miks" },
  { id: "w-kuidas-elad", word: "kuidas" },
  { id: "w-kuidas-raagib", word: "kuidas" },
  { id: "w-palju-tootad", word: "kui palju" },
  { id: "w-palju-vett", word: "kui palju" },
];

/** The three words each round offers: the answer and the two most like it, in a fixed order. */
const CHOICES: Record<QuestionWord, readonly QuestionWord[]> = {
  kes: ["kes", "kus", "mis"],
  mis: ["miks", "mis", "kes"],
  kus: ["kes", "kuidas", "kus"],
  millal: ["millal", "miks", "mis"],
  miks: ["mis", "millal", "miks"],
  kuidas: ["kuidas", "kus", "kui palju"],
  "kui palju": ["kuidas", "kui palju", "millal"],
};

/**
 * “Which answer fits?”: a question, its answer, and two answers that fit another question. The
 * options are in a fixed order, so the page renders the same on the server.
 */
const FITS: readonly { q: Id; a: Id; options: readonly Id[] }[] = [
  { q: "q-kus", a: "a-kus", options: ["a-millal", "a-kus", "a-kui-palju"] },
  { q: "q-millal", a: "a-millal", options: ["a-millal", "a-kus", "a-kui-palju"] },
  { q: "q-kes", a: "a-kes", options: ["a-mis", "a-jah", "a-kes"] },
  { q: "q-mis", a: "a-mis", options: ["a-kes", "a-mis", "a-millal"] },
  { q: "q-miks", a: "a-miks", options: ["a-kuidas", "a-kus", "a-miks"] },
  { q: "q-kuidas", a: "a-kuidas", options: ["a-kuidas", "a-miks", "a-millal"] },
  { q: "q-kui-palju", a: "a-kui-palju", options: ["a-millal", "a-kes", "a-kui-palju"] },
  { q: "q-raagid", a: "a-jah", options: ["a-mis", "a-jah", "a-nimi"] },
  { q: "q-kodus", a: "a-ei-ole", options: ["a-ei-ole", "a-mis", "a-kui-palju"] },
  { q: "q-tootavad", a: "a-ei-tea", options: ["a-nimi", "a-mis", "a-ei-tea"] },
  { q: "q-nimi", a: "a-nimi", options: ["a-laheb", "a-nimi", "a-millal"] },
  { q: "q-laheb", a: "a-laheb", options: ["a-laheb", "a-nimi", "a-kus"] },
  { q: "q-parit", a: "a-parit", options: ["a-millal", "a-nimi", "a-parit"] },
];

/** The statements that take kas: the rest of the sentence, lower case, and its two meanings. */
const KAS: readonly { s: Id; q: Id; rest: string }[] = [
  { s: "s-elad", q: "q-elad", rest: "sa elad Tallinnas" },
  { s: "s-raagid", q: "q-raagid", rest: "sa räägid eesti keelt" },
  { s: "s-kodus", q: "q-kodus", rest: "ta on kodus" },
  { s: "s-kohv", q: "q-kohv", rest: "sa jood kohvi" },
  { s: "s-tootavad", q: "q-tootavad", rest: "nad töötavad täna" },
];

const TRANSLATED_MEANS: readonly MessageDescriptor[] = [
  msg`Do you all live in Tartu?`,
  msg`Where do you work?`,
  msg`Does he speak Estonian?`,
  msg`Who speaks Estonian?`,
  msg`Do you work at home?`,
  msg`Where is he?`,
  msg`Do they drink coffee?`,
  msg`What are you reading?`,
];

const MATCHED: readonly { word: QuestionWord; about: MessageDescriptor }[] = [
  { word: "kes", about: msg`a person` },
  { word: "mis", about: msg`a thing` },
  { word: "kus", about: msg`a place` },
  { word: "millal", about: msg`a time` },
  { word: "miks", about: msg`a reason` },
  { word: "kuidas", about: msg`how, or how things are` },
];

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const GLOSSARY: Glossary = {
  kas: {
    en: msg`turns a sentence into a yes-or-no question`,
    note: msg`At the start of a question it has no meaning of its own, like a spoken question mark.`,
  },
  kes: { en: msg`who` },
  mis: { en: msg`what` },
  kus: { en: msg`where` },
  millal: { en: msg`when` },
  miks: { en: msg`why` },
  kuidas: { en: msg`how` },
  "kui palju": { en: msg`how much, how many` },
  kust: { en: msg`where from`, note: msg`Kus with its -s swapped for -st, “out of”.` },
  jah: { en: msg`yes` },
  ei: { en: msg`no; not` },
  "ei ole": {
    en: msg`no, when the question has olema`,
    clip: "a-ei-ole",
  },
  "ma ei tea": { en: msg`I don’t know`, clip: "a-ei-tea" },
  täna: { en: msg`today` },
  homme: { en: msg`tomorrow` },
  kodus: { en: msg`at home` },
  sest: { en: msg`because` },
  natuke: { en: msg`a little` },
  hästi: { en: msg`well, fine` },
  pärit: { en: msg`from, by birth`, note: msg`Ma olen pärit… is I’m from…` },
  tallinnas: { en: msg`in Tallinn`, show: "Tallinnas" },
  tartus: { en: msg`in Tartu`, show: "Tartus" },
  või: { en: msg`or; at the end of a sentence, a bit like “right?”` },
  su: { en: msg`your`, note: msg`Short for sinu.` },
  sinu: { en: msg`your` },
  // Every sentence the lesson says, so a sentence in the prose opens its card and plays.
  ...Object.fromEntries(
    (Object.keys(KUSIMUSED_SENTENCES) as Id[]).map((id) => [
      said(id).toLowerCase(),
      { en: MEANS[id], show: said(id), clip: id },
    ]),
  ),
};

/** A sentence that plays when tapped, with its meaning under it. */
function Line(props: {
  id: Id;
  text?: ReactNode;
  means?: MessageDescriptor | undefined;
  reply?: boolean;
}) {
  const { id, text, means, reply } = props;
  const { i18n } = useLingui();
  const clip = src(id);
  const playing = usePlaying(clip);
  // No aria-label: the sentence and its meaning are the button's name.
  return (
    <button
      type="button"
      onClick={() => void toggleSound(clip)}
      className={clsx(
        "grid w-full cursor-pointer items-center gap-x-3.5 py-2.5 pe-3 text-start transition-colors duration-150 hoverable:hover:bg-plate-hover",
        reply ? "grid-cols-[auto_minmax(0,1fr)_auto] ps-5" : "grid-cols-[minmax(0,1fr)_auto] ps-4",
      )}
    >
      {reply && (
        <CornerDownRight aria-hidden="true" className="size-4 text-ink-faint rtl:-scale-x-100" />
      )}
      <span
        lang="et"
        className={clsx(
          "min-w-0 tracking-tight max-sm:text-lg",
          reply ? "text-lg" : "text-xl font-medium",
        )}
      >
        {text ?? said(id)}
        <span
          lang={i18n.locale}
          className="block text-sm font-normal tracking-normal text-ink-muted"
        >
          {i18n._(means ?? MEANS[id])}
        </span>
      </span>
      <PlayMark playing={playing} />
    </button>
  );
}

/** Questions on a plate, each with the answers that fit it under it. */
function Exchanges({ items }: { items: readonly { q: Id; a: readonly Id[] }[] }) {
  return (
    <ul className="m-0 list-none overflow-hidden rounded-lg bg-plate p-0 ring-1 ring-edge">
      {items.map((item) => (
        <li key={item.q} className="border-b border-edge pb-1 last:border-b-0">
          <Line id={item.q} />
          {item.a.map((answer) => (
            <Line key={answer} id={answer} reply />
          ))}
        </li>
      ))}
    </ul>
  );
}

/** Five statements that turn into questions together: kas comes in front and nothing moves. */
function KasSwitch() {
  const { t } = useLingui();
  const [asking, setAsking] = useState(false);
  return (
    <Panel>
      <Chips
        label={t`Statement or question`}
        items={[
          { label: t`Statement`, value: "s" },
          { label: t`Question`, value: "q" },
        ]}
        value={asking ? "q" : "s"}
        onPick={(value) => setAsking(value === "q")}
      />
      <ul className="m-0 list-none overflow-hidden rounded-lg bg-plate p-0 ring-1 ring-edge">
        {KAS.map((each) => {
          const id = asking ? each.q : each.s;
          return (
            <li key={each.s} className="border-b border-edge last:border-b-0">
              <Line
                id={id}
                means={MEANS[id]}
                text={
                  asking ? (
                    <>
                      <span key="kas" className="learn-swap inline-block text-(--form)">
                        Kas
                      </span>{" "}
                      {each.rest}?
                    </>
                  ) : (
                    `${capital(each.rest)}.`
                  )
                }
              />
            </li>
          );
        })}
      </ul>
      <p aria-live="polite" className="text-md text-ink-secondary">
        {asking
          ? t`Kas in front, a question mark at the end. Here every other word stays put.`
          : t`Five sentences. Switch to Question and watch what changes.`}
      </p>
    </Panel>
  );
}

function WordKey(props: { word: string; means: string; pressed: boolean; onPress: () => void }) {
  const { word, means, pressed, onPress } = props;
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onPress}
      className="learn-key grid grow basis-[5.5rem] cursor-pointer justify-items-center gap-0.5 rounded-tile bg-plate px-3 pt-2.5 pb-2 hoverable:hover:bg-plate-hover"
    >
      <b lang="et" className="text-2xl/none font-semibold tracking-tight whitespace-nowrap">
        {word}
      </b>
      <small className="text-xs leading-tight text-ink-muted">{means}</small>
    </button>
  );
}

/** The question words: a tap plays a question with it, and shows an answer to hear. */
function AskWords() {
  const { t, i18n } = useLingui();
  const [picked, setPicked] = useState<number | null>(null);
  const each = picked === null ? undefined : QUESTION_WORDS[picked];
  const question = each ? said(each.q) : "";
  const lead = each ? capital(each.word) : "";
  return (
    <Panel className="gap-5">
      <fieldset className="m-0 flex min-w-0 flex-wrap gap-1.5 border-0 p-0">
        <legend className="sr-only">{t`Question words`}</legend>
        {QUESTION_WORDS.map((word, i) => (
          <WordKey
            key={word.word}
            word={word.word}
            means={i18n._(word.means)}
            pressed={picked === i}
            onPress={() => {
              setPicked(i);
              void playSound(src(word.q));
            }}
          />
        ))}
      </fieldset>
      <div aria-live="polite" className="min-h-36">
        {each ? (
          <div key={each.word} className="learn-swap grid gap-3">
            <div className="flex items-start gap-3">
              <PlayButton src={src(each.q)} label={t`Play ${question}`} />
              <p className="grid min-w-0 gap-0.5">
                <span lang="et" className="text-2xl/tight font-semibold tracking-tight">
                  <span className="text-(--form)">{lead}</span>
                  {question.slice(lead.length)}
                </span>
                <span className="text-md text-ink-secondary">
                  {i18n._(MEANS[each.q])} {i18n._(each.asks)}
                </span>
              </p>
            </div>
            <div className="flex items-start gap-3 ps-6">
              <PlayButton src={src(each.a)} label={t`Play ${said(each.a)}`} />
              <p className="grid min-w-0 gap-0.5">
                <span lang="et" className="text-xl/tight font-medium">
                  {said(each.a)}
                </span>
                <span className="text-md text-ink-secondary">{i18n._(MEANS[each.a])}</span>
              </p>
            </div>
          </div>
        ) : (
          <p className="grid gap-0.5">
            <span className="text-xl font-medium">
              <Trans>Tap a question word</Trans>
            </span>
            <span className="text-md text-ink-secondary">
              <Trans>You’ll hear a question with it, and an answer.</Trans>
            </span>
          </p>
        )}
      </div>
    </Panel>
  );
}

type AskItem = ChoiceItem & { pair: readonly [string, string]; id: Id };
type FitItem = ChoiceItem & { q: Id; a: Id };

export function KusimusedLesson() {
  const { t, i18n } = useLingui();
  const negation = lessonBySlug("eitus")?.n;
  const genitive = lessonBySlug("omastav")?.n;

  const askItems = useMemo<AskItem[]>(
    () =>
      ASKS.map(({ id, word }) => {
        const means = (choice: QuestionWord) =>
          i18n._(QUESTION_WORDS.find((each) => each.word === choice)?.means as MessageDescriptor);
        return {
          id,
          src: src(id),
          answer: word,
          pair: [word, id] as const,
          options: CHOICES[word].map((choice) => ({
            id: choice,
            label: choice,
            sub: means(choice),
          })),
          explain: (
            <>
              <span lang="et" className="font-medium text-ink">
                {said(id)}
              </span>{" "}
              {i18n._(MEANS[id])}
            </>
          ),
        };
      }),
    [i18n],
  );

  const fitItems = useMemo<FitItem[]>(
    () =>
      FITS.map(({ q, a, options }) => ({
        q,
        a,
        src: src(q),
        answer: a,
        options: options.map((option) => ({
          id: option,
          label: said(option),
          sub: i18n._(MEANS[option]),
        })),
        explain: (
          <>
            <span lang="et" className="font-medium text-ink">
              {said(q)}
            </span>{" "}
            {i18n._(MEANS[q])}
          </>
        ),
      })),
    [i18n],
  );

  const matchPairs = useMemo<MatchPair[]>(
    () =>
      MATCHED.map(({ word, about }) => ({
        id: word,
        left: word,
        right: i18n._(about),
        src: clipUrl(SLUG, clipId(word)),
      })),
    [i18n],
  );

  const writtenItems = useMemo<(SentenceItem & { pair: readonly [string, string] })[]>(
    () =>
      ASKS.filter(({ dictated }) => dictated !== false).map(({ id, word }) => ({
        kind: "dictation" as const,
        id: `write-${id.slice(2)}`,
        src: src(id),
        answers: [said(id)],
        pair: [word, id] as const,
      })),
    [],
  );

  const askedItems = useMemo<(SentenceItem & { pair: readonly [string, string] })[]>(
    () =>
      KUSIMUSED_ASKED.map(({ word, reply, answers }) => ({
        kind: "ask" as const,
        id: `ask-${clipId(word)}`,
        reply,
        src: clipUrl(SLUG, clipId(answers[0])),
        answers,
        pair: [word, reply] as const,
      })),
    [],
  );

  const translatedItems = useMemo<(SentenceItem & { pair: readonly [string, string] })[]>(
    () =>
      KUSIMUSED_TRANSLATED.map(({ kind, answers }, i) => ({
        kind: "translate" as const,
        id: `translate-${clipId(answers[0])}`,
        prompt: i18n._(TRANSLATED_MEANS[i] as MessageDescriptor),
        src: clipUrl(SLUG, clipId(answers[0])),
        answers,
        pair: [kind, answers[0]] as const,
      })),
    [i18n],
  );

  const talkQuestions = useMemo<PassageQuestion[]>(
    () => [
      {
        id: "first",
        ask: t`What does Kati ask first?`,
        options: [
          { id: "from", label: t`Where he is from` },
          { id: "name", label: t`His name` },
          { id: "lives", label: t`Where he lives` },
        ],
        answer: "name",
        line: 1,
      },
      {
        id: "lives",
        ask: t`Where does Jaan live?`,
        options: [
          { id: "tallinn", label: t`In Tallinn` },
          { id: "tartu", label: t`In Tartu` },
          { id: "narva", label: t`In Narva` },
        ],
        answer: "tartu",
        line: 8,
      },
      {
        id: "why",
        ask: t`Why is Jaan learning Estonian?`,
        options: [
          { id: "fun", label: t`For fun` },
          { id: "work", label: t`For work` },
          { id: "school", label: t`For his family` },
        ],
        answer: "work",
        line: 10,
      },
    ],
    [t],
  );

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          How to ask in Estonian: kas for yes or no, seven question words for the rest, and three
          everyday questions to learn whole.
        </Trans>
      }
      facts={[
        <Trans key="m">15 minutes</Trans>,
        <Trans key="q">5 quizzes, a matching game and a conversation</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "kas",
        "kes",
        "mis",
        "kus",
        "millal",
        "miks",
        "kuidas",
        "kui palju",
        "kust",
        "jah",
        "ei",
        "ei ole",
        "ma ei tea",
        "mis su nimi on?",
        "kuidas läheb?",
        "kust sa pärit oled?",
      ]}
      recap={[
        <Trans key="1">
          Put <b lang="et">kas</b> in front of a sentence to ask yes or no. Usually nothing else
          moves: <b lang="et">Kas sa elad Tallinnas?</b>
        </Trans>,
        <Trans key="2">
          Answer <b lang="et">jah</b> or <b lang="et">ei</b>. When the question has olema, the no is{" "}
          <b lang="et">ei ole</b> or <b lang="et">pole</b>. If you don’t know, say{" "}
          <b lang="et">Ma ei tea.</b>
        </Trans>,
        <Trans key="3">
          A question word usually goes first, and the part you ask about drops out:{" "}
          <b lang="et">Kus sa elad?</b>
        </Trans>,
        <Trans key="4">
          <b lang="et">Kes</b> usually asks about people, <b lang="et">mis</b> about things.
        </Trans>,
        <Trans key="5">
          Learn three questions whole: <b lang="et">Mis su nimi on? Kuidas läheb?</b> and{" "}
          <b lang="et">Kust sa pärit oled?</b>
        </Trans>,
      ]}
      sections={[
        {
          id: "kas",
          title: t`Kas makes a question`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Sa elad Tallinnas." /> You live in Tallinn.{" "}
                    <Word w="Kas sa elad Tallinnas?" /> Do you live in Tallinn? To ask a yes-or-no
                    question, put <Word w="kas" /> in front of the sentence.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    English adds do or swaps words round. Estonian adds kas and usually leaves every
                    other word where it was. Try it on five sentences.
                  </Trans>
                </p>
              </Prose>
              <KasSwitch />
              <Aside>
                <Trans>
                  In a kas question your voice usually falls at the end, as in a statement: kas
                  already says it’s a question. In speech you’ll also hear <Word w="või" /> at the
                  end instead, a bit like “right?”: <Word w="Sa elad Tallinnas või?" />
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "answers",
          title: t`Jah, ei, ei ole`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Jah" /> is yes and <Word w="ei" /> is no. When the question asks with
                    olema, to be, the usual no is <Word w="ei ole" />: he or she isn’t, I’m not.
                    When you don’t know, say <Word w="ma ei tea" />.
                  </Trans>
                </p>
              </Prose>
              <Exchanges
                items={[
                  {
                    q: "q-kodus",
                    a: ["a-jah", "a-ei-ole"],
                  },
                  {
                    q: "q-raagid",
                    a: ["a-jah", "a-ei"],
                  },
                  { q: "q-tootavad", a: ["a-ei-tea"] },
                ]}
              />
              <Aside>
                <Trans>
                  <Word w="Ei ole" /> repeats the verb from the question, and any verb can answer
                  this way: <i lang="et">Kas sa loed? Ei loe.</i> Lesson {negation} covers saying
                  no.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "words",
          title: t`Who, what, where`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    To ask for more than yes or no, start with a question word instead of kas, and
                    leave out the part you ask about. <Word w="Sa elad Tallinnas." /> You live in
                    Tallinn. <Word w="Kus sa elad?" /> Where do you live?
                  </Trans>
                </p>
                <p>
                  <Trans>There are seven to start with. Tap one to hear it in a question.</Trans>
                </p>
              </Prose>
              <AskWords />
              <Aside>
                <Trans>
                  <Word w="Kes" /> usually asks about people and <Word w="mis" /> about things:{" "}
                  <Word w="Kes see on?" /> Who is that? <Word w="Mis see on?" /> What is that?
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "which-word",
          title: t`What does it ask?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Hear a question and pick its question word. In these questions it comes first,
                    so listen to the start.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="question-word"
                title={<Trans>Which question word?</Trans>}
                items={askItems}
                rounds={7}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All of them. You can hear what a question asks.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Tap the question words above once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: said(item.id), src: item.src })}
                order={eachPairFirst}
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "match",
          title: t`What each word asks about`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Match each question word with what it asks about.</Trans>
                </p>
              </Prose>
              <Match
                id="match-question-words"
                title={<Trans>Match the question words</Trans>}
                pairs={matchPairs}
              />
            </>
          ),
        },
        {
          id: "write",
          title: t`Write the question you hear`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Hear a question and write it. <Word w="Kes" /> and <Word w="kus" /> differ by
                    one vowel, and <Word w="mis" /> and <Word w="miks" /> by one k, so listen
                    closely to the first word.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="write-questions"
                title={<Trans>Write the question</Trans>}
                items={writtenItems}
                rounds={7}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All seven, each question word right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>
                      Nearly. Hear the ones you missed below, then try again with Slower.
                    </Trans>
                  ) : (
                    <Trans>Tap the question words above once more, then try again.</Trans>
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
          id: "phrases",
          title: t`Three questions to know by heart`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    People ask these three when they meet you. Learn them whole, each with an
                    answer, and don’t take them apart yet.
                  </Trans>
                </p>
              </Prose>
              <Exchanges
                items={[
                  { q: "q-nimi", a: ["a-nimi"] },
                  { q: "q-laheb", a: ["a-laheb"] },
                  { q: "q-parit", a: ["a-parit"] },
                ]}
              />
              <Aside>
                <Trans>
                  <Word w="Su" /> is your, short for <Word w="sinu" />; lesson {genitive} explains
                  the form. <Word w="Kust" /> swaps the -s of kus for -st, out of: where from.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "fits",
          title: t`Which answer fits?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Hear a question, then pick the answer that fits. A kas question takes yes, no or
                    I don’t know; a question word wants what it asks about, such as a place for kus
                    or a time for millal.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="which-answer"
                title={<Trans>Which answer fits?</Trans>}
                items={fitItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All of them. You matched every answer to its question.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>
                      Listen to the first word. Kas wants yes or no; a question word wants what it
                      asks about.
                    </Trans>
                  )
                }
                recall={(item) => ({ label: said(item.q), src: item.src })}
                both={(item) => [src(item.q), src(item.a)]}
                round={(props) => <ChoiceRound {...props} />}
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
                    Each round gives an answer. Write the question it answers: start with the
                    question word, and when the answer says <span lang="et">ma</span>, ask with{" "}
                    <span lang="et">sa</span> (or <span lang="et">te</span> to be polite).
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="ask-question"
                title={<Trans>Write the question it answers</Trans>}
                items={askedItems}
                rounds={7}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All seven questions, each with the right word.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the question word and the verb’s ending.</Trans>
                  ) : (
                    <Trans>Tap the question words above once more, then try again.</Trans>
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
          id: "kas-or-word",
          title: t`Kas or a question word`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    A question answered with yes or no usually starts with <Word w="kas" />. A
                    question that wants a place, a person or a thing starts with its question word
                    instead, not with both. Write each question in Estonian.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="kas-or-word"
                title={<Trans>Write it in Estonian</Trans>}
                items={translatedItems}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>
                      All eight, each with <span lang="et">kas</span> or its question word.
                    </Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check whether each one asks for yes or no.</Trans>
                  ) : (
                    <Trans>
                      Go back to the <span lang="et">kas</span> switch at the top, then try again.
                    </Trans>
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
          id: "listen",
          title: t`Listening: Kati meets Jaan`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kati and Jaan meet for the first time and ask each other questions. Listen for
                    the question words.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="kati-meets-jaan"
                title={<Trans>Listen: Kati meets Jaan</Trans>}
                clip="d-kati"
                turns={KUSIMUSED_TALK.turns}
                names={{ second: t`Kati`, main: t`Jaan` }}
                questions={talkQuestions}
              />
            </>
          ),
        },
      ]}
    />
  );
}
