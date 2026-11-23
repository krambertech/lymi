import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { CornerDownRight } from "lucide-react";
import { useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  KOHAD_ASKED,
  KOHAD_MESSAGE,
  KOHAD_PLACES,
  KOHAD_SENTENCES,
  KOHAD_TYPED,
  KOHAD_WRITTEN,
} from "../../../lib/learn/clips";
import { playSound, usePlaying } from "../../../lib/learn/player";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Chips, type KeyItem, Keys, Panel } from "../Explore";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Listening, type PassageQuestion } from "../Passage";
import { type ChoiceItem, ChoiceRound, type GapItem, GapRound, Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { PlayMark } from "../Sound";
import { Word } from "../Word";

const SLUG = "kohad";
type Id = keyof typeof KOHAD_SENTENCES;
type Place = (typeof KOHAD_PLACES)[number];
type Where = Place["where"];
const said = (id: Id) => KOHAD_SENTENCES[id];
const src = (id: Id) => clipUrl(SLUG, id);
const wordSrc = (word: string) => clipUrl(SLUG, clipId(word));
const placeOf = (where: Where) => KOHAD_PLACES.find((each) => each.where === where) as Place;

/** What each place means, as a learner meets it and in the form that says where. */
const PLACE_MEANS: Record<Place["place"] | Where, MessageDescriptor> = {
  Eesti: msg`Estonia`,
  Eestis: msg`in Estonia`,
  Soome: msg`Finland`,
  Soomes: msg`in Finland`,
  Ukraina: msg`Ukraine`,
  Ukrainas: msg`in Ukraine`,
  Tallinn: msg`Tallinn, the capital`,
  Tallinnas: msg`in Tallinn`,
  Tartu: msg`Tartu, a university town`,
  Tartus: msg`in Tartu`,
  Pärnu: msg`Pärnu, a town by the sea`,
  Pärnus: msg`in Pärnu`,
  kodu: msg`home`,
  kodus: msg`at home`,
  kool: msg`school`,
  koolis: msg`at school, in a school`,
  kontor: msg`office`,
  kontoris: msg`at the office`,
  haigla: msg`hospital`,
  haiglas: msg`in a hospital`,
  kohvik: msg`café`,
  kohvikus: msg`in a café`,
  linn: msg`town, city`,
  linnas: msg`in town`,
  laud: msg`table`,
  laual: msg`on the table`,
  sein: msg`wall`,
  seinal: msg`on the wall`,
  töö: msg`work`,
  tööl: msg`at work`,
  turg: msg`market`,
  turul: msg`at the market`,
  Saaremaa: msg`Saaremaa, Estonia’s largest island`,
  Saaremaal: msg`on Saaremaa`,
  Saksamaa: msg`Germany`,
  Saksamaal: msg`in Germany`,
  Otepää: msg`Otepää, a small town in the south`,
  Otepääl: msg`in Otepää`,
  Lasnamäe: msg`Lasnamäe, a district of Tallinn`,
  Lasnamäel: msg`in Lasnamäe`,
};

const WRITTEN: readonly { means: MessageDescriptor; also: readonly string[] }[] = [
  { means: msg`I live in Tartu.`, also: ["Mina elan Tartus.", "Elan Tartus."] },
  { means: msg`Mum is at the market.`, also: [] },
  { means: msg`We live in Estonia.`, also: ["Meie elame Eestis.", "Elame Eestis."] },
  { means: msg`I’m at work.`, also: ["Mina olen tööl.", "Olen tööl."] },
  { means: msg`The book is on the table.`, also: [] },
  { means: msg`He’s studying at school.`, also: ["Tema õpib koolis."] },
];

const endingKey = (sentence: string) => (/l\.$/.test(sentence) ? "l" : "s");

/** What each sentence means, in the reader's language. */
const MEANS: Record<Id, MessageDescriptor> = {
  "s-elan-tallinnas": msg`I live in Tallinn.`,
  "q-elad": msg`Where do you live?`,
  "a-elan-tartus": msg`I live in Tartu.`,
  "a-tartus": msg`In Tartu.`,
  "q-tootad": msg`Where do you work?`,
  "a-tootan-koolis": msg`I work at a school.`,
  "q-on": msg`Where is he or she?`,
  "a-on-kodus": msg`He or she is at home.`,
  "w-kodus": msg`I work at home.`,
  "w-kontoris": msg`I work in an office.`,
  "w-haiglas": msg`I work in a hospital.`,
  "w-kohvikus": msg`I work in a café.`,
  "w-linnas": msg`I work in town.`,
  "l-laual": msg`The book is on the table.`,
  "l-seinal": msg`The picture is on the wall.`,
  "l-tool": msg`I’m at work.`,
  "l-turul": msg`Mum is at the market.`,
  "l-saaremaal": msg`We live on Saaremaa.`,
  "l-saksamaal": msg`They live in Germany.`,
  "h-haiglas": msg`Mari works in a hospital.`,
  "h-parnus": msg`Jaan lives in Pärnu.`,
  "h-kodus": msg`We’re at home.`,
  "h-tartus": msg`They study in Tartu.`,
  "h-kohvikus": msg`He or she is having coffee in a café.`,
  "h-kontoris": msg`You all work in an office.`,
  "h-soomes": msg`I live in Finland.`,
  "h-koolis": msg`He or she studies at school.`,
  "h-eestis": msg`We live in Estonia.`,
  "h-linnas": msg`They eat in town.`,
  "g-eestis": msg`I live in Estonia.`,
  "g-soomes": msg`He or she lives in Finland.`,
  "g-tartus": msg`We study in Tartu.`,
  "g-tallinnas": msg`I work in Tallinn.`,
  "g-koolis": msg`He or she is at school.`,
  "g-kontoris": msg`They work in an office.`,
};

/** The places of the -s switch: countries and towns. */
const IN_PLACES: readonly Where[] = [
  "Eestis",
  "Soomes",
  "Ukrainas",
  "Tallinnas",
  "Tartus",
  "Pärnus",
];

/** The answers to “Kus sa töötad?”, each with its sentence. */
const WORK_KEYS: readonly { where: Where; id: Id }[] = [
  { where: "koolis", id: "a-tootan-koolis" },
  { where: "kodus", id: "w-kodus" },
  { where: "kontoris", id: "w-kontoris" },
  { where: "haiglas", id: "w-haiglas" },
  { where: "kohvikus", id: "w-kohvikus" },
  { where: "linnas", id: "w-linnas" },
];

/** The -l places, each with a sentence. */
const ON_KEYS: readonly { where: Where; id: Id }[] = [
  { where: "laual", id: "l-laual" },
  { where: "seinal", id: "l-seinal" },
  { where: "tööl", id: "l-tool" },
  { where: "turul", id: "l-turul" },
];

/** The -maa places, too long for a key on a phone, as sentences to hear. */
const MAA_LINES: readonly { q: Id; a: readonly Id[] }[] = [
  { q: "l-saaremaal", a: [] },
  { q: "l-saksamaal", a: [] },
];

/**
 * “Where are they?”: a sentence, its place, and the first round's two other places, in a fixed
 * order so the page renders the same on the server. Later rounds draw theirs at random.
 */
export const HEARD: readonly { id: Id; where: Where; options: readonly Where[] }[] = [
  { id: "h-haiglas", where: "haiglas", options: ["haiglas", "kohvikus", "koolis"] },
  { id: "h-parnus", where: "Pärnus", options: ["Tartus", "Pärnus", "Tallinnas"] },
  { id: "h-kodus", where: "kodus", options: ["kodus", "koolis", "linnas"] },
  { id: "h-tartus", where: "Tartus", options: ["Tallinnas", "Pärnus", "Tartus"] },
  { id: "h-kohvikus", where: "kohvikus", options: ["kontoris", "kohvikus", "kodus"] },
  { id: "h-kontoris", where: "kontoris", options: ["koolis", "kohvikus", "kontoris"] },
  { id: "h-soomes", where: "Soomes", options: ["Soomes", "Eestis", "Ukrainas"] },
  { id: "h-koolis", where: "koolis", options: ["kodus", "koolis", "haiglas"] },
  { id: "h-eestis", where: "Eestis", options: ["Ukrainas", "Soomes", "Eestis"] },
  { id: "h-linnas", where: "linnas", options: ["linnas", "kodus", "kontoris"] },
];

const isTown = (where: Where) => /^[A-ZÄÖÜÕ]/.test(where);

/** Keyed by town or country against building, so a run hears both kinds early. */
export const heardPair = (where: Where) => [isTown(where) ? "town" : "building", where] as const;

/** The answer and two other places of its kind at random, in random order. */
export function threePlaces(answer: Where): Where[] {
  const kind = HEARD.map((each) => each.where).filter(
    (each) => each !== answer && isTown(each) === isTown(answer),
  );
  return shuffle([answer, ...shuffle(kind).slice(0, 2)]);
}

/** “-s or -l?”: the place as it stands before the ending, the ending, and its sentence. */
export const ENDINGS: readonly { before: string; ending: "s" | "l"; where: Where; id: Id }[] = [
  { before: "Eesti", ending: "s", where: "Eestis", id: "g-eestis" },
  { before: "Soome", ending: "s", where: "Soomes", id: "g-soomes" },
  { before: "Tartu", ending: "s", where: "Tartus", id: "g-tartus" },
  { before: "Tallinna", ending: "s", where: "Tallinnas", id: "g-tallinnas" },
  { before: "kooli", ending: "s", where: "koolis", id: "g-koolis" },
  { before: "kontori", ending: "s", where: "kontoris", id: "g-kontoris" },
  { before: "töö", ending: "l", where: "tööl", id: "l-tool" },
  { before: "turu", ending: "l", where: "turul", id: "l-turul" },
  { before: "Saaremaa", ending: "l", where: "Saaremaal", id: "l-saaremaal" },
  { before: "Saksamaa", ending: "l", where: "Saksamaal", id: "l-saksamaal" },
];

const GLOSSARY: Glossary = {
  kus: { en: msg`where` },
  ...Object.fromEntries(
    KOHAD_PLACES.flatMap(({ place, where }) => [
      [place.toLowerCase(), { en: PLACE_MEANS[place], show: place }],
      [where.toLowerCase(), { en: PLACE_MEANS[where], show: where }],
    ]),
  ),
  // Every sentence the lesson says, so a sentence in the prose opens its card and plays.
  ...Object.fromEntries(
    (Object.keys(KOHAD_SENTENCES) as Id[]).map((id) => [
      said(id).toLowerCase(),
      { en: MEANS[id], show: said(id), clip: id },
    ]),
  ),
};

/** A place in its where form, with its last letter, the ending, lit. */
function Ending({ where }: { where: string }) {
  return (
    <>
      {where.slice(0, -1)}
      <span className="text-(--form)">{where.slice(-1)}</span>
    </>
  );
}

/** A sentence that plays when tapped, with its meaning under it. */
function Line({ id, reply }: { id: Id; reply?: boolean }) {
  const { i18n } = useLingui();
  const clip = src(id);
  const playing = usePlaying(clip);
  // No aria-label: the sentence and its meaning are the button's name.
  return (
    <button
      type="button"
      onClick={() => void playSound(clip)}
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
        {said(id)}
        <span
          lang={i18n.locale}
          className="block text-sm font-normal tracking-normal text-ink-muted"
        >
          {i18n._(MEANS[id])}
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

/** Countries and towns, switched together between the name and the name with -s. */
function InSwitch() {
  const { t, i18n } = useLingui();
  const [inside, setInside] = useState(false);
  return (
    <Panel>
      <Chips
        label={t`The place or in the place`}
        items={[
          { label: t`The place`, value: "place" },
          { label: t`In the place`, value: "in" },
        ]}
        value={inside ? "in" : "place"}
        onPick={(value) => setInside(value === "in")}
      />
      <ul className="m-0 grid list-none grid-cols-2 overflow-hidden rounded-lg bg-plate p-0 ring-1 ring-edge sm:grid-cols-3">
        {IN_PLACES.map((where) => {
          const { place } = placeOf(where);
          const word = inside ? where : place;
          return (
            <li key={where} className="border-b border-edge">
              <PlaceButton
                src={wordSrc(word)}
                word={inside ? <Ending where={where} /> : place}
                means={i18n._(inside ? PLACE_MEANS[where] : PLACE_MEANS[place])}
                swap={word}
              />
            </li>
          );
        })}
      </ul>
      <p aria-live="polite" className="text-md text-ink-secondary">
        {inside
          ? t`Each name took -s, and the -s says in. Tallinn took an extra a before it.`
          : t`Switch to In the place and watch the last letters change.`}
      </p>
    </Panel>
  );
}

function PlaceButton(props: { src: string; word: React.ReactNode; means: string; swap: string }) {
  const playing = usePlaying(props.src);
  return (
    <button
      type="button"
      onClick={() => void playSound(props.src)}
      className="grid h-full w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 py-3 ps-4 pe-3 text-start transition-colors duration-150 hoverable:hover:bg-plate-hover"
    >
      <span className="grid min-w-0">
        <span
          key={props.swap}
          lang="et"
          className="learn-swap text-xl font-semibold tracking-tight"
        >
          {props.word}
        </span>
        <span className="text-sm text-ink-muted">{props.means}</span>
      </span>
      <PlayMark playing={playing} />
    </button>
  );
}

const placeOptions = (options: readonly Where[], i18n: I18n) =>
  options.map((option) => ({
    id: option,
    label: <span lang="et">{option}</span>,
    sub: i18n._(PLACE_MEANS[option]),
  }));

type HeardItem = ChoiceItem & { id: Id; pair: readonly [string, string] };
type EndingItem = GapItem & { id: Id; where: Where; pair: readonly [string, string] };

export function KohadLesson() {
  const { t, i18n } = useLingui();
  const questions = lessonBySlug("kusimused")?.n;
  const stems = lessonBySlug("pood-poe")?.n;
  const into = lessonBySlug("majas-majja-majast")?.n;

  const keysOf = (list: readonly { where: Where; id: Id }[]): KeyItem[] =>
    list.map(({ where, id }) => ({
      label: where,
      sub: placeOf(where).place,
      src: src(id),
      detail: {
        title: <span lang="et">{said(id)}</span>,
        tip: i18n._(MEANS[id]),
      },
    }));

  // Every round but the first draws its wrong places afresh, so no set of options names the answer.
  const heardRun = (items: readonly HeardItem[], pinned?: HeardItem): HeardItem[] =>
    eachPairFirst(items, pinned).map((item) =>
      item === pinned
        ? item
        : { ...item, options: placeOptions(threePlaces(item.answer as Where), i18n) },
    );

  const heardItems = useMemo<HeardItem[]>(
    () =>
      HEARD.map(({ id, where, options }) => ({
        id,
        src: src(id),
        answer: where,
        pair: heardPair(where),
        options: placeOptions(options, i18n),
        explain: (
          <>
            <span lang="et" className="font-medium text-ink">
              {said(id)}
            </span>{" "}
            {i18n._(MEANS[id])}
          </>
        ),
      })),
    [i18n],
  );

  const endingItems = useMemo<EndingItem[]>(
    () =>
      ENDINGS.map(({ before, ending, where, id }) => ({
        id,
        where,
        src: src(id),
        before,
        after: "",
        answer: ending,
        options: ["s", "l"],
        pair: [ending, id] as const,
        explain: (
          <>
            <span lang="et" className="font-medium text-ink">
              {said(id)}
            </span>{" "}
            {i18n._(MEANS[id])}
          </>
        ),
      })),
    [i18n],
  );

  const typedItems = useMemo<(FormItem & { pair: readonly [string, string] })[]>(
    () =>
      KOHAD_TYPED.map((place) => {
        const { where } = KOHAD_PLACES.find((each) => each.place === place) as Place;
        return {
          base: place,
          gloss: i18n._(PLACE_MEANS[place]),
          cue: "kus?",
          cueLang: "et",
          answers: [where],
          src: wordSrc(where),
          explain: i18n._(PLACE_MEANS[where]),
          pair: [where.slice(-1), place] as const,
        };
      }),
    [i18n],
  );

  const writtenItems = useMemo<(SentenceItem & { pair: readonly [string, string] })[]>(
    () =>
      KOHAD_WRITTEN.slice(4).map((sentence) => ({
        kind: "dictation" as const,
        id: `write-${clipId(sentence)}`,
        src: wordSrc(sentence),
        answers: [sentence],
        pair: [endingKey(sentence), sentence] as const,
      })),
    [],
  );

  const askedItems = useMemo<(SentenceItem & { pair: readonly [string, string] })[]>(
    () =>
      KOHAD_ASKED.map(({ reply, answers }) => ({
        kind: "ask" as const,
        id: `ask-${clipId(reply)}`,
        reply,
        src: wordSrc(answers[0]),
        answers,
        pair: [reply, reply] as const,
      })),
    [],
  );

  const translatedItems = useMemo<(SentenceItem & { pair: readonly [string, string] })[]>(
    () =>
      WRITTEN.map(({ means, also }, i) => {
        const sentence = KOHAD_WRITTEN[i] as string;
        return {
          kind: "translate" as const,
          id: `translate-${clipId(sentence)}`,
          prompt: i18n._(means),
          src: wordSrc(sentence),
          answers: [sentence, ...also],
          pair: [endingKey(sentence), sentence] as const,
        };
      }),
    [i18n],
  );

  const messageQuestions = useMemo<PassageQuestion[]>(
    () => [
      {
        id: "work",
        kind: "truefalse",
        ask: t`Mari is at work today.`,
        answer: true,
        line: 1,
      },
      {
        id: "job",
        ask: t`Where does Mari work?`,
        options: [
          { id: "cafe", label: t`In a café` },
          { id: "hospital", label: t`In a hospital` },
          { id: "canteen", label: t`In a school canteen` },
        ],
        answer: "hospital",
        line: 2,
      },
      {
        id: "jaan-where",
        ask: t`Where is Jaan?`,
        options: [
          { id: "home", label: t`At home` },
          { id: "market", label: t`At the market` },
          { id: "work", label: t`At work` },
        ],
        answer: "home",
        line: 3,
      },
      {
        id: "market",
        ask: t`Who is at the market?`,
        options: [
          { id: "kati", label: t`Kati’s mum` },
          { id: "mum", label: t`Mari’s mum` },
          { id: "jaan", label: t`Jaan` },
        ],
        answer: "mum",
        line: 4,
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
          How to say where you are in Estonian:{" "}
          <b lang="et" className="whitespace-nowrap">
            -s
          </b>{" "}
          for in,{" "}
          <b lang="et" className="whitespace-nowrap">
            -l
          </b>{" "}
          for on and at, and how to answer <b lang="et">kus</b>, where.
        </Trans>
      }
      facts={[
        <Trans key="m">15 minutes</Trans>,
        <Trans key="q">6 quizzes and a voice message</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "kus",
        "eestis",
        "tallinnas",
        "tartus",
        "kodus",
        "koolis",
        "kontoris",
        "haiglas",
        "kohvikus",
        "linnas",
        "laual",
        "seinal",
        "tööl",
        "turul",
        "saaremaal",
        "saksamaal",
        "kus sa elad?",
        "kus sa töötad?",
      ]}
      recap={[
        <Trans key="1">
          The ending{" "}
          <b lang="et" className="whitespace-nowrap">
            -s
          </b>{" "}
          says in: <b lang="et">Eestis, Tallinnas, koolis</b>.
        </Trans>,
        <Trans key="2">
          The ending{" "}
          <b lang="et" className="whitespace-nowrap">
            -l
          </b>{" "}
          says on a surface or at an activity: <b lang="et">laual, tööl</b>.
        </Trans>,
        <Trans key="3">
          Some places take{" "}
          <b lang="et" className="whitespace-nowrap">
            -l
          </b>{" "}
          by habit, such as <b lang="et">turul</b> and names ending in{" "}
          <b lang="et" className="whitespace-nowrap">
            -maa
          </b>
          : <b lang="et">Saaremaal, Saksamaal</b>.
        </Trans>,
        <Trans key="4">
          Learn each place together with its ending: <b lang="et">Tallinn, Tallinnas</b>.
        </Trans>,
        <Trans key="5">
          Ask with <b lang="et">kus</b>, and answer with a sentence or the place alone:{" "}
          <b lang="et">Kus sa elad? Tartus.</b>
        </Trans>,
      ]}
      sections={[
        {
          id: "in",
          title: t`The ending -s means in`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Tallinn" /> is the town; <Word w="Tallinnas" /> is in Tallinn. Estonian
                    says in with an ending, not a word in front: it puts{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -s
                    </b>{" "}
                    on the end of the name. I live in Tallinn is <Word w="Ma elan Tallinnas." />
                  </Trans>
                </p>
                <p>
                  <Trans>
                    It works the same for towns, buildings and most countries. Try it on three
                    countries and three towns.
                  </Trans>
                </p>
              </Prose>
              <InSwitch />
              <Aside>
                <Trans>
                  Many words gain a vowel before the{" "}
                  <b lang="et" className="whitespace-nowrap">
                    -s
                  </b>
                  , as Tallinn does, and which vowel is hard to guess for now. So learn each place
                  together with its{" "}
                  <b lang="et" className="whitespace-nowrap">
                    -s
                  </b>{" "}
                  form: <Word w="kool" />, <Word w="koolis" />; <Word w="linn" />,{" "}
                  <Word w="linnas" />. Lesson {stems} shows where the vowel comes from.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "kus",
          title: t`Answering where with a place`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    You met <Word w="kus" />, where, in lesson {questions}. Answer with a sentence
                    or, in speech, with the place alone.
                  </Trans>
                </p>
              </Prose>
              <Exchanges
                items={[
                  { q: "q-elad", a: ["a-elan-tartus", "a-tartus"] },
                  { q: "q-tootad", a: ["a-tootan-koolis"] },
                  { q: "q-on", a: ["a-on-kodus"] },
                ]}
              />
              <Prose>
                <p>
                  <Trans>
                    <Word w="Kodus" /> is at home. Now answer <Word w="Kus sa töötad?" /> six ways:
                    tap a place.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Keys
                  label={t`Places to work`}
                  items={keysOf(WORK_KEYS)}
                  columns={3}
                  phoneColumns={2}
                  empty={{
                    title: <span lang="et">{said("q-tootad")}</span>,
                    tip: t`Tap a place to hear the answer.`,
                  }}
                />
              </Panel>
            </>
          ),
        },
        {
          id: "where-are-they",
          title: t`Hearing the place`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Hear a sentence and pick the place. Listen for the word that ends in{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -s
                    </b>
                    .
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="which-place"
                title={<Trans>Which place?</Trans>}
                items={heardItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All of them. You picked the place in every sentence.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Tap the places above once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.answer, src: wordSrc(item.answer) })}
                order={heardRun}
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "on",
          title: t`The ending -l means on or at`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    The other ending is{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -l
                    </b>
                    . It says on a surface: <Word w="laual" />, on the table. And it says at an
                    activity, where you’re doing something rather than inside a building:{" "}
                    <Word w="tööl" />, at work.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Keys
                  label={t`Places with -l`}
                  items={keysOf(ON_KEYS)}
                  columns={4}
                  phoneColumns={2}
                  empty={{
                    title: t`Tap a place`,
                    tip: t`You’ll hear it in a sentence.`,
                  }}
                />
              </Panel>
              <Prose>
                <p>
                  <Trans>
                    A market takes{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -l
                    </b>{" "}
                    by habit: <Word w="turul" />, at the market. So do names ending in{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -maa
                    </b>
                    : <Word w="Saaremaal" />, on Saaremaa, and <Word w="Saksamaal" />, in Germany,
                    though English says in there. A few towns and districts take{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -l
                    </b>{" "}
                    as well, such as <Word w="Otepääl" /> and <Word w="Lasnamäel" />.
                  </Trans>
                </p>
              </Prose>
              <Exchanges items={MAA_LINES} />
              <Aside>
                <Trans>
                  English says at work and at school alike. Estonian says <Word w="tööl" /> but{" "}
                  <Word w="koolis" />, so learn each place with its ending. Lesson {into} teaches
                  the endings for going into a place and coming out of it.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "s-or-l",
          title: t`-s or -l?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each round shows a place. Pick its ending, then hear it in a sentence. Most
                    towns, buildings and countries take{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -s
                    </b>
                    ; work, the market and names ending in{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -maa
                    </b>{" "}
                    take{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -l
                    </b>
                    .
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="s-or-l"
                title={<Trans>-s or -l?</Trans>}
                items={endingItems}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All of them. You picked the right ending every time.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Read both endings above once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.where, src: wordSrc(item.where) })}
                order={eachPairFirst}
                round={(props) => <GapRound {...props} listen="after" />}
              />
            </>
          ),
        },
        {
          id: "type",
          title: t`Type the place`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each round gives a place and asks <Word w="kus" />, where. Type the place with{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -s
                    </b>{" "}
                    or{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -l
                    </b>
                    . Each of these takes its ending with no other change.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="type-place"
                title={<Trans>Type the place</Trans>}
                items={typedItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six, each with the right ending.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check which ending each place takes.</Trans>
                  ) : (
                    <Trans>Read both endings above once more, then try again.</Trans>
                  )
                }
                recall={formRecall}
                order={eachPairFirst}
                round={(props) => <FormRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "write",
          title: t`Write what you hear`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Hear a sentence and write it. Listen for the last sound of the place:{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -s
                    </b>{" "}
                    or{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -l
                    </b>
                    .
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="write-places"
                title={<Trans>Write the sentence</Trans>}
                items={writtenItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six, every word in place.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed slower.</Trans>
                  ) : (
                    <Trans>Play each sentence slower, then try again.</Trans>
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
          id: "ask",
          title: t`Ask where`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each round gives an answer. Write the question it answers, starting with{" "}
                    <Word w="kus" />. Leave out the place: that is what you ask about.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="ask-where"
                title={<Trans>Write the question</Trans>}
                items={askedItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>
                      All six questions, each with <span lang="et">kus</span> and the right verb.
                    </Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the verb’s ending in the ones you missed.</Trans>
                  ) : (
                    <Trans>Hear the questions and answers above once more, then try again.</Trans>
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
                    Write each sentence in Estonian. The place takes{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -s
                    </b>{" "}
                    for in, and{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -l
                    </b>{" "}
                    for on, at work and at the market.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="translate-places"
                title={<Trans>Write it in Estonian</Trans>}
                items={translatedItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six, each place with its ending.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the place’s ending in the ones you missed.</Trans>
                  ) : (
                    <Trans>Read both endings above once more, then try again.</Trans>
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
          title: t`Listening: a message from Mari`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari leaves Kati a voice message about where everyone is today. Listen for each
                    place and its ending.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="mari-message"
                title={<Trans>Listen: a message from Mari</Trans>}
                clip="p-mari"
                sentences={KOHAD_MESSAGE}
                questions={messageQuestions}
              />
            </>
          ),
        },
      ]}
    />
  );
}
