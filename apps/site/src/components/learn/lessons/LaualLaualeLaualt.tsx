import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { CornerDownRight } from "lucide-react";
import { useMemo } from "react";
import { LESSONS, lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  OUTER_INNER_PLACES,
  OUTER_PLACES,
  OUTER_SENTENCES,
} from "../../../lib/learn/clips";
import { playSound, usePlaying } from "../../../lib/learn/player";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Panel } from "../Explore";
import { type GapItem, GapPassage } from "../GapPassage";
import { Aside, LessonView, Prose } from "../LessonView";
import type { Glossary } from "../lesson-context";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { Scene } from "../Scene";
import { Sort } from "../Sort";
import { PlayMark } from "../Sound";
import { Word } from "../Word";

const SLUG = "laual-lauale-laualt";
type Id = keyof typeof OUTER_SENTENCES;
type Place = (typeof OUTER_PLACES)[number];
export type Direction = "kus" | "kuhu" | "kust";

const said = (id: Id) => OUTER_SENTENCES[id];
const src = (id: Id) => clipUrl(SLUG, id);
const wordSrc = (word: string) => clipUrl(SLUG, clipId(word));

/** What each place and each of its forms means. */
const FORM_MEANS: Record<string, MessageDescriptor> = {
  laud: msg`table`,
  laual: msg`on the table`,
  lauale: msg`onto the table`,
  laualt: msg`off the table`,
  töö: msg`work, job`,
  tööl: msg`at work`,
  tööle: msg({ message: "to work", context: "the place: going to work" }),
  töölt: msg`from work`,
  turg: msg`market`,
  turul: msg`at the market`,
  turule: msg`to the market`,
  turult: msg`from the market`,
  Saaremaa: msg`Saaremaa, Estonia’s largest island`,
  Saaremaal: msg({ message: "on Saaremaa", context: "the island, where" }),
  Saaremaale: msg({ message: "to Saaremaa", context: "the island, where to" }),
  Saaremaalt: msg`from Saaremaa`,
  kool: msg`school`,
  koolis: msg`at school, in a school`,
  kooli: msg`to school`,
  pood: msg`shop`,
  poes: msg`in the shop`,
  poodi: msg`to the shop`,
  Tartu: msg`Tartu, a university town`,
  Tartus: msg`in Tartu`,
  Tartusse: msg`to Tartu`,
  haigla: msg`hospital`,
  haiglas: msg`in a hospital`,
  haiglasse: msg`to the hospital`,
};

/** What each sentence means, in the reader's language. */
const MEANS: Record<Id, MessageDescriptor> = {
  "s-lauale": msg`The cat jumps onto the table.`,
  "s-laual": msg`The cat is on the table.`,
  "s-laualt": msg`The cat jumps off the table onto the floor.`,
  "q-lahed": msg`Where are you going?`,
  "a-lahen-toole": msg`I’m going to work.`,
  "a-lahen-turule": msg`I’m going to the market.`,
  "q-tuled": msg`Where are you coming from?`,
  "a-tulen-toolt": msg`I’m coming from work.`,
  "a-tulen-turult": msg`I’m coming from the market.`,
  "c-toole-kooli": msg`I’m going to work, but Mari is going to school.`,
  "c-turult-poest": msg`Mum is coming from the market, but Dad is coming from the shop.`,
  "p-emal-on": msg`Mum has a cat.`,
  "p-helistan-emale": msg`I’m calling Mum.`,
  "p-helistan-sobrale": msg`I’m calling a friend.`,
  "p-kusin-emalt": msg`I’ll ask Mum.`,
  "p-kusin-isalt": msg`I’ll ask Dad.`,
};

/** The places in the table of forms: Saaremaa’s long forms don’t fit a phone’s column. */
const TABLE_PLACES = OUTER_PLACES.filter((place) => place.place !== "Saaremaa");

/** The ending each question puts on a place, lit in its forms. */
const ENDING: Record<Direction, string> = { kus: "l", kuhu: "le", kust: "lt" };

export const DIRECTIONS: readonly Direction[] = ["kus", "kuhu", "kust"];

/** The table scene: the cat jumps up, sits on it and jumps down, each with its sentence. */
const TABLE: readonly { id: "lauale" | "laual" | "laualt"; sentence: Id }[] = [
  { id: "lauale", sentence: "s-lauale" },
  { id: "laual", sentence: "s-laual" },
  { id: "laualt", sentence: "s-laualt" },
];

/**
 * “Kus, kuhu or kust?”: each form heard on its own, so no verb around it tells the answer; only its
 * ending does.
 */
export const HEARD: readonly { form: string; direction: Direction }[] = OUTER_PLACES.flatMap(
  (place) => DIRECTIONS.map((direction) => ({ form: place[direction], direction })),
);

/** The sort: four places that take -l and four that take -s, in their dictionary form. */
export const SORT_ITEMS: readonly { w: string; bin: "le" | "sse" }[] = [
  { w: "töö", bin: "le" },
  { w: "kool", bin: "sse" },
  { w: "turg", bin: "le" },
  { w: "pood", bin: "sse" },
  { w: "laud", bin: "le" },
  { w: "Tartu", bin: "sse" },
  { w: "Saaremaa", bin: "le" },
  { w: "haigla", bin: "sse" },
];

const GLOSSARY: Glossary = {
  kus: { en: msg`where` },
  kuhu: { en: msg`where to`, note: msg`Asks where someone or something is going.` },
  kust: { en: msg`where from`, note: msg`Kus with a t on the end.` },
  kass: { en: msg({ message: "cat", context: "kass, the cat on the table" }) },
  hüppab: { en: msg`jumps`, note: msg`Hüppama with the ta ending.` },
  põrandale: { en: msg`onto the floor`, note: msg`Põrand, floor, with -le.` },
  helistan: { en: msg`I call, I phone`, note: msg`Helistama takes -le: helistan emale.` },
  küsin: { en: msg`I ask`, note: msg`Küsima takes -lt: küsin emalt.` },
  emale: { en: msg`to Mum` },
  emalt: { en: msg`from Mum` },
  sõbrale: { en: msg`to a friend`, note: msg`Sõber, friend: -le goes on its stem sõbra-.` },
  ...Object.fromEntries(
    [
      ...OUTER_PLACES.flatMap((each) => [each.place, each.kus, each.kuhu, each.kust]),
      ...OUTER_INNER_PLACES.flatMap((each) => [each.place, each.kus, each.kuhu]),
    ].map((form: string) => [
      form.toLowerCase(),
      { en: FORM_MEANS[form] as MessageDescriptor, show: form },
    ]),
  ),
  // Every sentence the lesson says, so a sentence in the prose opens its card and plays.
  ...Object.fromEntries(
    (Object.keys(OUTER_SENTENCES) as Id[]).map((id) => [
      said(id).toLowerCase(),
      { en: MEANS[id], show: said(id), clip: id },
    ]),
  ),
};

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

/** Questions on a plate with the answers under them, or sentences on their own. */
function Exchanges({ items }: { items: readonly { q: Id; a: readonly Id[] }[] }) {
  return (
    <ul className="m-0 list-none overflow-hidden rounded-lg bg-plate p-0 ring-1 ring-edge">
      {items.map((item) => (
        <li key={item.q} className="border-b border-edge pb-1 last:border-b-0">
          <Line id={item.q} reply={item.a.length === 0} />
          {item.a.map((answer) => (
            <Line key={answer} id={answer} reply />
          ))}
        </li>
      ))}
    </ul>
  );
}

const directionOptions = (options: readonly Direction[], i18n: I18n) => {
  const means: Record<Direction, MessageDescriptor> = {
    kus: msg`where`,
    kuhu: msg`where to`,
    kust: msg`where from`,
  };
  return options.map((option) => ({
    id: option,
    label: <span lang="et">{option}?</span>,
    sub: i18n._(means[option]),
  }));
};

/** The three questions in a random order, so the answer's place says nothing. */
export const shuffledDirections = (): Direction[] => shuffle([...DIRECTIONS]);

type HeardItem = ChoiceItem & { form: string; pair: readonly [string, string] };

/** The Saturday passage, gap by gap. Each gap offers the answer and one other form. */
function useSaturday(): GapItem[] {
  return [
    {
      id: "toole",
      before: "Täna on laupäev ja Mari ei lähe",
      answer: "tööle",
      after: ".",
      options: ["tööle", "töösse"],
      why: (
        <Trans>
          Work takes <b lang="et">-l</b>, so going there takes <b lang="et">-le</b>:{" "}
          <b lang="et">tööle</b>.
        </Trans>
      ),
    },
    {
      id: "turule",
      before: "Ta läheb",
      answer: "turule",
      after: ".",
      options: ["turult", "turule"],
      why: (
        <Trans>
          After <b lang="et">läheb</b>, goes, the place answers <b lang="et">kuhu</b>, so the market
          takes <b lang="et">-le</b>: <b lang="et">turule</b>.
        </Trans>
      ),
    },
    {
      id: "emale",
      before: "Ta helistab",
      answer: "emale",
      after: ".",
      options: ["emale", "emalt"],
      why: (
        <Trans>
          The person you call takes <b lang="et">-le</b>: <b lang="et">emale</b>.
        </Trans>
      ),
    },
    {
      id: "poes",
      before: "Isa on",
      answer: "poes",
      after: ".",
      options: ["poel", "poes"],
      why: (
        <Trans>
          A shop takes <b lang="et">-s</b>, not <b lang="et">-l</b>: <b lang="et">poes</b>, in the
          shop.
        </Trans>
      ),
    },
    {
      id: "turult",
      before: "Mari tuleb",
      answer: "turult",
      after: "koju.",
      options: ["turult", "turule"],
      why: (
        <Trans>
          She comes home from the market, so <b lang="et">-lt</b>: <b lang="et">turult</b>.
        </Trans>
      ),
    },
    {
      id: "poest",
      before: "Isa tuleb ka",
      answer: "poest",
      after: "koju.",
      options: ["poodi", "poest"],
      why: (
        <Trans>
          A shop takes <b lang="et">-s</b>, so from it takes <b lang="et">-st</b>:{" "}
          <b lang="et">poest</b>.
        </Trans>
      ),
    },
  ];
}

export function LaualLaualeLaualtLesson() {
  const { t, i18n } = useLingui();
  const places = lessonBySlug("kohad")?.n;
  const inner = LESSONS.find((lesson) => lesson.et === "Majas, majja, majast")?.n;
  const stems = LESSONS.find((lesson) => lesson.et === "Pood, poe")?.n;
  const have = LESSONS.find((lesson) => lesson.et === "Mul on")?.n;
  const pronouns = LESSONS.find((lesson) => lesson.et === "Mind, mulle, minuga")?.n;
  const saturday = useSaturday();

  const means: Record<Direction, string> = {
    kus: t({ message: "on, at", context: "a place's form that answers kus" }),
    kuhu: t({ message: "onto, to", context: "a place's form that answers kuhu" }),
    kust: t({ message: "off, from", context: "a place's form that answers kust" }),
  };
  const tips: Record<Direction, React.ReactNode> = {
    kus: (
      <Trans>
        Where something is: <b lang="et">-l</b> says on it or at it.
      </Trans>
    ),
    kuhu: (
      <Trans>
        Where something goes: <b lang="et">-le</b> says onto it or to it.
      </Trans>
    ),
    kust: (
      <Trans>
        Where something comes from: <b lang="et">-lt</b> says off it or from it.
      </Trans>
    ),
  };
  const columns: Record<Place["place"], string> = {
    laud: t`table`,
    töö: t`work`,
    turg: t`market`,
    Saaremaa: t`Saaremaa`,
  };
  const paradigm: ParadigmRow[] = DIRECTIONS.map((direction) => ({
    id: direction,
    label: means[direction],
    ask: `${direction}?`,
    tip: tips[direction],
    cells: TABLE_PLACES.map((place) => {
      const form = place[direction];
      const ending = ENDING[direction];
      return {
        form: `${form.slice(0, -ending.length)}|${ending}`,
        src: wordSrc(form),
      };
    }),
  }));

  // Every round but the first shuffles its three questions, so the answer moves around.
  const heardRun = (items: readonly HeardItem[], pinned?: HeardItem): HeardItem[] =>
    eachPairFirst(items, pinned).map((item) =>
      item === pinned ? item : { ...item, options: directionOptions(shuffledDirections(), i18n) },
    );

  const heardItems = useMemo<HeardItem[]>(
    () =>
      HEARD.map(({ form, direction }) => ({
        form,
        src: wordSrc(form),
        answer: direction,
        pair: [direction, form] as const,
        options: directionOptions(DIRECTIONS, i18n),
        explain: (
          <>
            <span lang="et" className="font-medium text-ink">
              {form}
            </span>{" "}
            {i18n._(FORM_MEANS[form] as MessageDescriptor)}
          </>
        ),
      })),
    [i18n],
  );

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Places that take{" "}
          <b lang="et" className="whitespace-nowrap">
            -l
          </b>{" "}
          answer <b lang="et">kus</b>, <b lang="et">kuhu</b> and <b lang="et">kust</b> with{" "}
          <b lang="et" className="whitespace-nowrap">
            -l
          </b>
          ,{" "}
          <b lang="et" className="whitespace-nowrap">
            -le
          </b>{" "}
          and{" "}
          <b lang="et" className="whitespace-nowrap">
            -lt
          </b>
          : <b lang="et">laual, lauale, laualt</b>.
        </Trans>
      }
      facts={[
        <Trans key="m">10 minutes</Trans>,
        <Trans key="q">2 quizzes and a story to fill in</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "kuhu",
        "kust",
        "laual",
        "lauale",
        "laualt",
        "tööle",
        "töölt",
        "turule",
        "turult",
        "emale",
        "emalt",
        "helistan",
        "küsin",
        "hüppab",
        "kuhu sa lähed?",
        "kust sa tuled?",
      ]}
      recap={[
        <Trans key="1">
          Three questions, three endings: <b lang="et">kus?</b>{" "}
          <b lang="et" className="whitespace-nowrap">
            -l
          </b>{" "}
          for on and at, <b lang="et">kuhu?</b>{" "}
          <b lang="et" className="whitespace-nowrap">
            -le
          </b>{" "}
          for onto and to, <b lang="et">kust?</b>{" "}
          <b lang="et" className="whitespace-nowrap">
            -lt
          </b>{" "}
          for off and from: <b lang="et">laual, lauale, laualt</b>.
        </Trans>,
        <Trans key="2">
          All three endings go on the same stem: <b lang="et">turul, turule, turult</b>.
        </Trans>,
        <Trans key="3">
          A place that takes{" "}
          <b lang="et" className="whitespace-nowrap">
            -l
          </b>{" "}
          takes{" "}
          <b lang="et" className="whitespace-nowrap">
            -le
          </b>{" "}
          for where to; one that takes{" "}
          <b lang="et" className="whitespace-nowrap">
            -s
          </b>{" "}
          takes{" "}
          <b lang="et" className="whitespace-nowrap">
            -sse
          </b>{" "}
          or a short form: <b lang="et">tööle</b> but <b lang="et">kooli</b>. Every place in this
          lesson works this way.
        </Trans>,
        <Trans key="4">
          On a person,{" "}
          <b lang="et" className="whitespace-nowrap">
            -le
          </b>{" "}
          is to and{" "}
          <b lang="et" className="whitespace-nowrap">
            -lt
          </b>{" "}
          is from: <b lang="et">Ma helistan emale. Ma küsin emalt</b>, word for word “I ask from
          Mum”.
        </Trans>,
      ]}
      sections={[
        {
          id: "table",
          title: t`On, onto and off the table`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Lesson {places} taught{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -l
                    </b>{" "}
                    for on and at: <Word w="Kass on laual." /> Lesson {inner} paired{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -s
                    </b>{" "}
                    with{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -sse
                    </b>{" "}
                    and{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -st
                    </b>
                    , for “where to” and “where from”.{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -l
                    </b>{" "}
                    has a pair of its own:{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -le
                    </b>{" "}
                    and{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -lt
                    </b>
                    .
                  </Trans>
                </p>
                <p>
                  <Trans>
                    For the table, the answer to <Word w="kuhu" /> ends in{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -le
                    </b>
                    : <Word w="Kass hüppab lauale." /> The answer to <Word w="kust" /> ends in{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -lt
                    </b>
                    : <Word w="Kass hüppab laualt põrandale." /> The cat lands on the floor, so{" "}
                    <Word w="põrandale" /> takes{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -le
                    </b>
                    .
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The verb is the same both ways, so only the ending says which way the cat goes.
                    Tap a form to watch it and hear the sentence.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Scene
                  scene="table"
                  label={t`A cat and a table`}
                  keysLabel={t`Where the cat is and goes`}
                  places={TABLE.map(({ id, sentence }) => ({
                    id,
                    word: id,
                    meaning: i18n._(FORM_MEANS[id] as MessageDescriptor),
                    sentence: said(sentence),
                    gloss: i18n._(MEANS[sentence]),
                    src: src(sentence),
                  }))}
                />
              </Panel>
            </>
          ),
        },
        {
          id: "endings",
          title: t`-le means onto or to, -lt off or from`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Put{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -le
                    </b>{" "}
                    or{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -lt
                    </b>{" "}
                    where the{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -l
                    </b>{" "}
                    was: <Word w="tööl" />, <Word w="tööle" />, <Word w="töölt" />. Ask with{" "}
                    <Word w="kuhu" /> and <Word w="kust" />, as you do for places with{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -s
                    </b>
                    .
                  </Trans>
                </p>
              </Prose>
              <Exchanges
                items={[
                  { q: "q-lahed", a: ["a-lahen-toole", "a-lahen-turule"] },
                  { q: "q-tuled", a: ["a-tulen-toolt", "a-tulen-turult"] },
                ]}
              />
              <Prose>
                <p>
                  <Trans>
                    All three endings go on the same stem: <Word w="turul" />, <Word w="turule" />,{" "}
                    <Word w="turult" />. Tap a form in the table to hear it.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Paradigm
                  label={t`Three places, each in three forms`}
                  columns={TABLE_PLACES.map((place) => columns[place.place])}
                  rows={paradigm}
                  empty={{
                    title: (
                      <Trans>
                        <span lang="et">Kus</span>, <span lang="et">kuhu</span> or{" "}
                        <span lang="et">kust</span>
                      </Trans>
                    ),
                    tip: t`Tap a form to hear it and see what its ending says.`,
                  }}
                />
              </Panel>
              <Aside>
                <Trans>
                  <Word w="Saaremaa" /> takes{" "}
                  <b lang="et" className="whitespace-nowrap">
                    -l
                  </b>
                  , as lesson {places} showed for names ending in{" "}
                  <b lang="et" className="whitespace-nowrap">
                    -maa
                  </b>
                  . So it takes{" "}
                  <b lang="et" className="whitespace-nowrap">
                    -le
                  </b>{" "}
                  and{" "}
                  <b lang="et" className="whitespace-nowrap">
                    -lt
                  </b>{" "}
                  too: <Word w="Saaremaale" />, <Word w="Saaremaalt" />.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "hearing",
          title: t`Which question the form answers`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Hear a form on its own and pick the question it answers. Listen to its last
                    sounds:{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -l
                    </b>
                    ,{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -le
                    </b>{" "}
                    or{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -lt
                    </b>
                    .
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="which-question"
                title={
                  <Trans>
                    <span lang="et">Kus</span>, <span lang="et">kuhu</span> or{" "}
                    <span lang="et">kust</span>?
                  </Trans>
                }
                items={heardItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All of them. You heard the ending of every form.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Tap the forms in the table once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.form, src: item.src })}
                order={heardRun}
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "le-or-sse",
          title: t`-le or -sse`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    The ending for “where to” follows the ending for “where”. A place with{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -l
                    </b>{" "}
                    takes{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -le
                    </b>
                    : <Word w="tööl" />, <Word w="tööle" />. A place with{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -s
                    </b>{" "}
                    takes{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -sse
                    </b>{" "}
                    or a short form, as lesson {inner} showed: <Word w="koolis" />,{" "}
                    <Word w="kooli" />. Every place in this lesson works this way.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    So one English “to” can be{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -le
                    </b>{" "}
                    or a short form, even in one sentence. Tap a sentence to hear it.
                  </Trans>
                </p>
              </Prose>
              <Exchanges
                items={[
                  { q: "c-toole-kooli", a: [] },
                  { q: "c-turult-poest", a: [] },
                ]}
              />
              <Prose>
                <p>
                  <Trans>
                    Put each place under the ending it takes for where to. Think of where first:{" "}
                    <Word w="tööl" />, so <Word w="tööle" />.
                  </Trans>
                </p>
              </Prose>
              <Sort
                id="le-or-sse"
                title={
                  <Trans>
                    Where to: <span lang="et">-le</span> or <span lang="et">-sse</span>?
                  </Trans>
                }
                bins={[
                  {
                    id: "le",
                    label: "-le",
                    hint: t`places with -l`,
                    rule: (
                      <Trans>
                        Work, the market, the table and names ending in <b lang="et">-maa</b> take{" "}
                        <b lang="et">-l</b>, so <b lang="et">-le</b>: <b lang="et">turule</b>.
                      </Trans>
                    ),
                  },
                  {
                    id: "sse",
                    label: "-sse",
                    hint: t`or a short form`,
                    rule: (
                      <Trans>
                        Tartu, the hospital, the school and the shop take <b lang="et">-s</b>, so{" "}
                        <b lang="et">-sse</b> or a short form: <b lang="et">Tartusse, kooli</b>.
                      </Trans>
                    ),
                  },
                ]}
                items={SORT_ITEMS.map(({ w, bin }) => ({ w, bin, src: wordSrc(w) }))}
              />
            </>
          ),
        },
        {
          id: "people",
          title: t`To and from a person`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Lesson {have} put{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -l
                    </b>{" "}
                    on a person to say who has something: <Word w="Emal on kass." /> On a person,{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -le
                    </b>{" "}
                    says to and{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -lt
                    </b>{" "}
                    says from.
                  </Trans>
                </p>
              </Prose>
              <Exchanges
                items={[
                  { q: "p-helistan-emale", a: [] },
                  { q: "p-helistan-sobrale", a: [] },
                  { q: "p-kusin-emalt", a: [] },
                  { q: "p-kusin-isalt", a: [] },
                ]}
              />
              <Prose>
                <p>
                  <Trans>
                    The person you call takes{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -le
                    </b>{" "}
                    after <Word w="helistan" />; the person you ask takes{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -lt
                    </b>{" "}
                    after <Word w="küsin" />. A word whose stem changes, as in lesson {stems}, takes
                    the ending on its stem: <Word w="sõbrale" />.
                  </Trans>
                </p>
              </Prose>
              <Aside>
                <Trans>
                  I, you and the other pronouns have their own forms for to and from. Lesson{" "}
                  {pronouns} teaches them.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "saturday",
          title: t`Mari’s Saturday`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Fill each gap with the form that fits. Some places take{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -l
                    </b>
                    , some{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -s
                    </b>
                    , and one gap is a person. Hear the whole story at the end.
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="saturday"
                title={<Trans>Fill the gaps</Trans>}
                gaps={saturday}
                mode="pick"
                clip="p-saturday"
              />
            </>
          ),
        },
      ]}
    />
  );
}
