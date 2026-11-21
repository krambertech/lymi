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
  INNER_DIALOGUE,
  INNER_PLACES,
  INNER_SENTENCES,
} from "../../../lib/learn/clips";
import { playSound, usePlaying } from "../../../lib/learn/player";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { type KeyItem, Keys, Panel } from "../Explore";
import { Aside, LessonView, Prose } from "../LessonView";
import type { Glossary } from "../lesson-context";
import { Paradigm } from "../Paradigm";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { Scene } from "../Scene";
import { Sort } from "../Sort";
import { PlayMark } from "../Sound";
import { Word } from "../Word";

const SLUG = "majas-majja-majast";
type Id = keyof typeof INNER_SENTENCES;
type Place = (typeof INNER_PLACES)[number];
export type Direction = "kus" | "kuhu" | "kust";

const said = (id: Id) => INNER_SENTENCES[id];
const src = (id: Id) => clipUrl(SLUG, id);
const wordSrc = (word: string) => clipUrl(SLUG, clipId(word));
const placeOf = (name: Place["place"]) => INNER_PLACES.find((each) => each.place === name) as Place;

/** What each place and each of its forms means. */
const FORM_MEANS: Record<string, MessageDescriptor> = {
  Tallinn: msg`Tallinn, the capital`,
  Tallinnas: msg`in Tallinn`,
  Tallinnasse: msg`to Tallinn`,
  Tallinnast: msg`from Tallinn`,
  Tartu: msg`Tartu, a university town`,
  Tartus: msg`in Tartu`,
  Tartusse: msg`to Tartu`,
  Tartust: msg`from Tartu`,
  Pärnu: msg`Pärnu, a town by the sea`,
  Pärnus: msg`in Pärnu`,
  Pärnusse: msg`to Pärnu`,
  Pärnust: msg`from Pärnu`,
  haigla: msg`hospital`,
  haiglas: msg`in a hospital`,
  haiglasse: msg`to the hospital`,
  haiglast: msg`from the hospital`,
  kontoris: msg`at the office`,
  kontorisse: msg`to the office`,
  kontorist: msg`from the office`,
  kohvik: msg`café`,
  kohvikus: msg`in a café`,
  kohvikusse: msg`to the café`,
  kohvikust: msg`from the café`,
  kool: msg`school`,
  koolis: msg`at school, in a school`,
  kooli: msg`to school`,
  koolisse: msg`to school`,
  koolist: msg`from school`,
  pood: msg`shop`,
  poes: msg`in the shop`,
  poodi: msg`to the shop`,
  poesse: msg`to the shop`,
  poest: msg`from the shop`,
  linn: msg`town, city`,
  linnas: msg`in town`,
  linna: msg`to town`,
  linnasse: msg`to town`,
  linnast: msg`from town`,
  maja: msg`house`,
  majas: msg`in the house`,
  majja: msg`into the house`,
  majasse: msg`into the house`,
  majast: msg`out of the house`,
  kodu: msg`home`,
  kodus: msg`at home`,
  koju: msg`home, to home`,
  kodust: msg`from home`,
  Eestist: msg`from Estonia`,
  Soomest: msg`from Finland`,
  Ukrainast: msg`from Ukraine`,
};

/** Each table place's name, short, as a row label. */
const PLACE_NAMES: Record<string, MessageDescriptor> = {
  Tartu: msg`Tartu`,
  Pärnu: msg`Pärnu`,
  haigla: msg`hospital`,
  kohvik: msg`café`,
};

/** What each sentence means, in the reader's language. */
const MEANS: Record<Id, MessageDescriptor> = {
  "s-majas": msg`The cat is in the house.`,
  "s-majja": msg`The cat goes into the house.`,
  "s-majast": msg`The cat comes out of the house.`,
  "q-tuled": msg`Where are you coming from?`,
  "a-tulen-koolist": msg`I’m coming from school.`,
  "a-tulen-poest": msg`I’m coming from the shop.`,
  "q-parit": msg`Where are you from?`,
  "p-eestist": msg`I’m from Estonia.`,
  "p-soomest": msg`I’m from Finland.`,
  "p-ukrainast": msg`I’m from Ukraine.`,
  "p-tallinnast": msg`I’m from Tallinn.`,
  "q-lahed": msg`Where are you going?`,
  "a-lahen-tartusse": msg`I’m going to Tartu.`,
  "a-lahen-haiglasse": msg`I’m going to the hospital.`,
  "k-kooli": msg`I’m going to school.`,
  "k-poodi": msg`I’m going to the shop.`,
  "k-linna": msg`We’re going to town.`,
  "k-koju": msg`Come home!`,
  "k-kodus": msg`I’m at home.`,
  "k-kodust": msg`I’m coming from home.`,
};

/** The places of the forms table: the lesson teaches -sse as kuhu for each of them. */
const TABLE_PLACES: readonly Place["place"][] = ["Tartu", "Pärnu", "haigla", "kohvik"];

export const DIRECTIONS: readonly Direction[] = ["kus", "kuhu", "kust"];

/**
 * “Kus, kuhu or kust?”: a place form heard on its own, so only its ending says which question it
 * answers. The table's four places, each three ways.
 */
export const HEARD: readonly { form: string; direction: Direction }[] = TABLE_PLACES.flatMap(
  (name) => DIRECTIONS.map((direction) => ({ form: placeOf(name)[direction], direction })),
);

/** Six rounds as two cycles: each question once, then each question once more. */
export function twoCycles<T extends { pair: readonly [string, string] }>(
  items: readonly T[],
  pinned?: T,
): T[] {
  const first = eachPairFirst(items, pinned).slice(0, DIRECTIONS.length);
  return [...first, ...eachPairFirst(items.filter((item) => !first.includes(item)))];
}

/** The house scene: the cat goes in, sits inside and comes out, each with its sentence. */
const HOUSE: readonly { id: "majja" | "majas" | "majast"; sentence: Id }[] = [
  { id: "majja", sentence: "s-majja" },
  { id: "majas", sentence: "s-majas" },
  { id: "majast", sentence: "s-majast" },
];

/** The sort: one place in each pair three ways, a name, a short form and kodu. */
const SORT_ITEMS: readonly { w: string; bin: Direction }[] = [
  { w: "Tartusse", bin: "kuhu" },
  { w: "kodus", bin: "kus" },
  { w: "poest", bin: "kust" },
  { w: "koju", bin: "kuhu" },
  { w: "Tartus", bin: "kus" },
  { w: "kodust", bin: "kust" },
  { w: "poodi", bin: "kuhu" },
  { w: "poes", bin: "kus" },
  { w: "Tartust", bin: "kust" },
];

/** The everyday words with a short kuhu form, each said in a sentence. */
const SHORT_KEYS: readonly { place: Place["place"]; id: Id }[] = [
  { place: "kool", id: "k-kooli" },
  { place: "pood", id: "k-poodi" },
  { place: "linn", id: "k-linna" },
  { place: "maja", id: "s-majja" },
  { place: "kodu", id: "k-koju" },
];

const GLOSSARY: Glossary = {
  kus: { en: msg`where` },
  kuhu: { en: msg`where to`, note: msg`Asks where someone or something is going.` },
  kust: { en: msg`where from`, note: msg`Kus with a t on the end.` },
  kass: { en: msg`cat` },
  tööl: { en: msg`at work` },
  pärit: { en: msg`from, by birth`, note: msg`Ma olen pärit… is I’m from…` },
  ...Object.fromEntries(
    INNER_PLACES.flatMap((each) =>
      [each.place, each.kus, each.kuhu, each.kust, ...("long" in each ? [each.long] : [])].map(
        (form: string) => [
          form.toLowerCase(),
          { en: FORM_MEANS[form] as MessageDescriptor, show: form },
        ],
      ),
    ),
  ),
  ...Object.fromEntries(
    ["Eestist", "Soomest", "Ukrainast"].map((form) => [
      form.toLowerCase(),
      { en: FORM_MEANS[form] as MessageDescriptor, show: form },
    ]),
  ),
  // Every sentence the lesson says, so a sentence in the prose opens its card and plays.
  ...Object.fromEntries(
    (Object.keys(INNER_SENTENCES) as Id[]).map((id) => [
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

/** Questions on a plate, each with the answers that fit it under it. */
function Exchanges({ items }: { items: readonly { q: Id; a: readonly Id[] }[] }) {
  return (
    <ul className="m-0 list-none overflow-hidden rounded-lg bg-plate p-0 ring-1 ring-edge">
      {items.map((item) => (
        <li key={item.q} className="border-b border-edge pb-1 last:border-b-0">
          {item.a.length === 0 ? (
            <Line id={item.q} reply />
          ) : (
            <>
              <Line id={item.q} />
              {item.a.map((answer) => (
                <Line key={answer} id={answer} reply />
              ))}
            </>
          )}
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

export function MajasMajjaMajastLesson() {
  const { t, i18n } = useLingui();
  const places = lessonBySlug("kohad")?.n;
  const questions = lessonBySlug("kusimused")?.n;
  const threeForms = LESSONS.find((lesson) => lesson.et === "Kolm põhivormi")?.n;
  const onto = LESSONS.find((lesson) => lesson.et === "Laual, lauale, laualt")?.n;

  const keyOf = (label: string, sub: React.ReactNode, id: Id, tip?: React.ReactNode): KeyItem => ({
    label,
    sub,
    src: src(id),
    detail: {
      title: <span lang="et">{said(id)}</span>,
      tip: tip ?? i18n._(MEANS[id]),
    },
  });

  // Every round but the first shuffles its three questions, so the answer moves around.
  const heardRun = (items: readonly HeardItem[], pinned?: HeardItem): HeardItem[] =>
    twoCycles(items, pinned).map((item) =>
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

  const line = (id: keyof typeof INNER_DIALOGUE) => {
    const clip = INNER_DIALOGUE[id];
    return typeof clip === "string" ? clip : clip.text;
  };

  const dialogue: DialogueTurn[] = [
    { who: "them", clip: "d-mari-1", line: line("d-mari-1") },
    {
      who: "you",
      clip: "d-sina-1",
      replies: [
        {
          line: "Tere! Ma lähen poes.",
          why: (
            <Trans>
              <b lang="et">Poes</b> says where you are. After <b lang="et">lähen</b>, say where to:{" "}
              <b lang="et">poodi</b>.
            </Trans>
          ),
        },
        { line: line("d-sina-1"), right: true },
        {
          line: "Tere! Ma olen poes.",
          why: (
            <Trans>
              <b lang="et">Poes</b> says you’re in the shop. She asked where you’re going.
            </Trans>
          ),
        },
      ],
    },
    { who: "them", clip: "d-mari-2", line: line("d-mari-2") },
    {
      who: "you",
      clip: "d-sina-2",
      replies: [
        { line: line("d-sina-2"), right: true },
        {
          line: "Ma tulen kooli.",
          why: (
            <Trans>
              <b lang="et">Kooli</b> says where to: you’d be coming to school. She asked where from.
            </Trans>
          ),
        },
        {
          line: "Ma tulen koolis.",
          why: (
            <Trans>
              <b lang="et">Koolis</b> says where you are. To say where from, use{" "}
              <b lang="et">-st</b>: <b lang="et">koolist</b>.
            </Trans>
          ),
        },
      ],
    },
    { who: "them", clip: "d-mari-3", line: line("d-mari-3") },
    {
      who: "you",
      clip: "d-sina-3",
      replies: [
        {
          line: "Ei, ma lähen homme Tartus.",
          why: (
            <Trans>
              After <b lang="et">lähen</b>, say where to: <b lang="et">Tartusse</b>.{" "}
              <b lang="et">Tartus</b> is where you are.
            </Trans>
          ),
        },
        {
          line: "Ei, ma tulen homme Tartus.",
          why: (
            <Trans>
              <b lang="et">Tartus</b> says where you are. After <b lang="et">tulen</b> too, say
              where to: <b lang="et">Tartusse</b>.
            </Trans>
          ),
        },
        { line: line("d-sina-3"), right: true },
      ],
    },
    { who: "them", clip: "d-mari-4", line: line("d-mari-4") },
    {
      who: "you",
      clip: "d-sina-4",
      replies: [
        {
          line: "Ei, ma olen pärit Pärnusse.",
          why: (
            <Trans>
              <b lang="et">Pärnusse</b> says to Pärnu. <b lang="et">Pärit</b> takes the form for
              where from: <b lang="et">Pärnust</b>.
            </Trans>
          ),
        },
        { line: line("d-sina-4"), right: true },
        {
          line: "Ei, ma olen pärit Pärnus.",
          why: (
            <Trans>
              <b lang="et">Pärnus</b> says in Pärnu. <b lang="et">Pärit</b> takes the form for where
              from: <b lang="et">Pärnust</b>.
            </Trans>
          ),
        },
      ],
    },
    { who: "them", clip: "d-mari-5", line: line("d-mari-5") },
  ];

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Estonian asks three questions about a place, <b lang="et">kus</b>, <b lang="et">kuhu</b>{" "}
          and <b lang="et">kust</b>, and answers each with its own ending:{" "}
          <b lang="et">majas, majja, majast</b>.
        </Trans>
      }
      facts={[
        <Trans key="m">10 minutes</Trans>,
        <Trans key="q">2 quizzes and a conversation</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "kus",
        "kuhu",
        "kust",
        "majas",
        "majja",
        "majast",
        "tartusse",
        "tartust",
        "kooli",
        "koolist",
        "poodi",
        "poest",
        "koju",
        "kodust",
        "pärit",
        "kuhu sa lähed?",
        "kust sa tuled?",
      ]}
      recap={[
        <Trans key="1">
          Three questions, three endings: <b lang="et">kus?</b>{" "}
          <b lang="et" className="whitespace-nowrap">
            -s
          </b>{" "}
          for in, <b lang="et">kuhu?</b>{" "}
          <b lang="et" className="whitespace-nowrap">
            -sse
          </b>{" "}
          for into, <b lang="et">kust?</b>{" "}
          <b lang="et" className="whitespace-nowrap">
            -st
          </b>{" "}
          for out of: <b lang="et">Tartus, Tartusse, Tartust</b>.
        </Trans>,
        <Trans key="2">
          All three go on the same stem: <b lang="et">haiglas, haiglasse, haiglast</b>.
        </Trans>,
        <Trans key="3">
          Some everyday words have a short form for where to:{" "}
          <b lang="et">kooli, poodi, linna, majja, koju</b>.
        </Trans>,
        <Trans key="4">
          When you don’t know a short form, use{" "}
          <b lang="et" className="whitespace-nowrap">
            -sse
          </b>
          : it is right for every place in this lesson.
        </Trans>,
        <Trans key="5">
          Where you’re from takes{" "}
          <b lang="et" className="whitespace-nowrap">
            -st
          </b>
          : <b lang="et">Ma olen pärit Ukrainast.</b>
        </Trans>,
      ]}
      sections={[
        {
          id: "three",
          title: t`Three questions about a place`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Lesson {places} taught <Word w="kus" />, where, and its{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -s
                    </b>
                    : <Word w="Kass on majas." /> Estonian asks two more questions about a place.{" "}
                    <Word w="Kuhu" /> asks where to: <Word w="Kass läheb majja." />{" "}
                    <Word w="Kust" /> asks where from: <Word w="Kass tuleb majast." />
                  </Trans>
                </p>
                <p>
                  <Trans>
                    English puts in, into or out of before the place. Estonian changes the end of
                    the place instead. Tap a form to watch the cat move and hear the sentence.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Scene
                  scene="house"
                  label={t`A cat and a house`}
                  keysLabel={t`Where the cat is and goes`}
                  places={HOUSE.map(({ id, sentence }) => ({
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
          id: "out-of",
          title: t`-st means out of or from`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    To say out of or from, swap the{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -s
                    </b>{" "}
                    for{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -st
                    </b>
                    : <Word w="koolis" />, <Word w="koolist" />. The rest of the word stays as it
                    was: <Word w="poes" />, <Word w="poest" />.
                  </Trans>
                </p>
              </Prose>
              <Exchanges items={[{ q: "q-tuled", a: ["a-tulen-koolist", "a-tulen-poest"] }]} />
              <Prose>
                <p>
                  <Trans>
                    You met <Word w="Kust sa pärit oled?" /> in lesson {questions}. After{" "}
                    <Word w="pärit" />, the country or town takes{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -st
                    </b>
                    . Tap a place to hear the answer.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Keys
                  label={t`Where you’re from`}
                  items={[
                    keyOf("Eestist", "Eesti", "p-eestist"),
                    keyOf("Soomest", "Soome", "p-soomest"),
                    keyOf("Ukrainast", "Ukraina", "p-ukrainast"),
                    keyOf("Tallinnast", "Tallinn", "p-tallinnast"),
                  ]}
                  columns={4}
                  phoneColumns={2}
                  empty={{
                    title: <span lang="et">{said("q-parit")}</span>,
                    tip: t`Tap a place to hear the answer.`,
                  }}
                />
              </Panel>
            </>
          ),
        },
        {
          id: "into",
          title: t`-sse means into or to`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    To say into or to, put{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -sse
                    </b>{" "}
                    where the{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -s
                    </b>{" "}
                    was: <Word w="Tartus" />, <Word w="Tartusse" />; <Word w="haiglas" />,{" "}
                    <Word w="haiglasse" />. Ask with <Word w="kuhu" />.
                  </Trans>
                </p>
              </Prose>
              <Exchanges items={[{ q: "q-lahed", a: ["a-lahen-tartusse", "a-lahen-haiglasse"] }]} />
              <Prose>
                <p>
                  <Trans>
                    So a place has a form for each question, all three on the same stem. Tap a form
                    to hear it.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Paradigm
                  label={t`Four places, each with a form for kus, kuhu and kust`}
                  columns={[t`Where?`, t`Where to?`, t`Where from?`]}
                  rows={TABLE_PLACES.map((name) => {
                    const each = placeOf(name);
                    const stem = each.kus.slice(0, -1);
                    return {
                      id: name,
                      label: i18n._(PLACE_NAMES[name] as MessageDescriptor),
                      et: name,
                      cells: DIRECTIONS.map((direction) => ({
                        form: `${stem}|${each[direction].slice(stem.length)}`,
                        src: wordSrc(each[direction]),
                        note: i18n._(FORM_MEANS[each[direction]] as MessageDescriptor),
                      })),
                    };
                  })}
                  empty={{
                    title: t`Tap a form`,
                    tip: t`You’ll hear it and see what it means.`,
                  }}
                />
              </Panel>
              <Aside>
                <Trans>
                  Places that take{" "}
                  <b lang="et" className="whitespace-nowrap">
                    -l
                  </b>
                  , such as <Word w="tööl" />, have three forms of their own. Lesson {onto} teaches
                  them.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "hearing",
          title: t`Which question the place answers`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Hear a place on its own and pick the question it answers. Only its ending tells
                    you:{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -s
                    </b>
                    ,{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -sse
                    </b>{" "}
                    or{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -st
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
                    <Trans>
                      All of them. You told{" "}
                      <b lang="et" className="whitespace-nowrap">
                        -s
                      </b>
                      ,{" "}
                      <b lang="et" className="whitespace-nowrap">
                        -sse
                      </b>{" "}
                      and{" "}
                      <b lang="et" className="whitespace-nowrap">
                        -st
                      </b>{" "}
                      apart every time.
                    </Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Tap the forms in the table above once more, then try again.</Trans>
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
          id: "short",
          title: t`Short forms of everyday words`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Some everyday words also have a short form for where to, with no{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -sse
                    </b>
                    : <Word w="Ma lähen kooli." /> <Word w="Ma lähen poodi." />
                  </Trans>
                </p>
                <p>
                  <Trans>
                    For <Word w="kool" />, <Word w="pood" /> and <Word w="linn" />, the short form
                    is the third form a dictionary gives, as lesson {threeForms} shows:{" "}
                    <b lang="et">pood, poe, poodi</b>. Two words have a short form of their own:{" "}
                    <Word w="majja" /> for <Word w="maja" />, <Word w="koju" /> for{" "}
                    <Word w="kodu" />.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Keys
                  label={t`Short forms for where to`}
                  items={SHORT_KEYS.map(({ place, id }) => {
                    const each = placeOf(place);
                    return keyOf(
                      each.kuhu,
                      "third" in each ? (
                        <span lang="et">{each.third}</span>
                      ) : (
                        <span lang="et">{each.place}</span>
                      ),
                      id,
                    );
                  })}
                  columns={5}
                  phoneColumns={3}
                  empty={{
                    title: <span lang="et">{said("q-lahed")}</span>,
                    tip: t`Tap a form to hear the answer.`,
                  }}
                />
              </Panel>
              <Prose>
                <p>
                  <Trans>
                    The{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -sse
                    </b>{" "}
                    forms are right too: <Word w="koolisse" />, <Word w="poesse" />,{" "}
                    <Word w="linnasse" />, <Word w="majasse" />. <Word w="Tartu" />,{" "}
                    <Word w="Pärnu" />, <Word w="haigla" />, <Word w="kontor" /> and{" "}
                    <Word w="kohvik" /> have only the{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -sse
                    </b>{" "}
                    form: <Word w="Tartusse" />, <Word w="kohvikusse" />. So when you don’t know a
                    short form,{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -sse
                    </b>{" "}
                    is the safe choice.
                  </Trans>
                </p>
              </Prose>
              <Aside>
                <Trans>
                  Home, <Word w="kodu" />, has a short form of its own: <Word w="koju" /> when you
                  go there. Then <Word w="kodus" /> when you’re there, <Word w="kodust" /> when you
                  leave.
                </Trans>
              </Aside>
              <Exchanges
                items={[
                  { q: "k-koju", a: [] },
                  { q: "k-kodus", a: [] },
                  { q: "k-kodust", a: [] },
                ]}
              />
            </>
          ),
        },
        {
          id: "sort",
          title: t`Sort by question`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Put each form under the question it answers. The short forms count too:{" "}
                    <Word w="koju" /> and <Word w="poodi" /> answer <Word w="kuhu" />.
                  </Trans>
                </p>
              </Prose>
              <Sort
                id="sort-by-question"
                title={<Trans>Sort the forms</Trans>}
                bins={[
                  {
                    id: "kus",
                    label: "kus?",
                    hint: t`where`,
                    rule: (
                      <Trans>
                        Where something is takes <b lang="et">-s</b>: <b lang="et">kodus</b>.
                      </Trans>
                    ),
                  },
                  {
                    id: "kuhu",
                    label: "kuhu?",
                    hint: t`where to`,
                    rule: (
                      <Trans>
                        Where something goes takes <b lang="et">-sse</b> or a short form:{" "}
                        <b lang="et">Tartusse, koju</b>.
                      </Trans>
                    ),
                  },
                  {
                    id: "kust",
                    label: "kust?",
                    hint: t`where from`,
                    rule: (
                      <Trans>
                        Where something comes from takes <b lang="et">-st</b>:{" "}
                        <b lang="et">kodust</b>.
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
          id: "street",
          title: t`Talk: in the street`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari asks <Word w="kuhu" />, <Word w="kust" /> and <Word w="kus" />. Answer each
                    with the form that fits its question.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="in-the-street"
                title={<Trans>Talk: in the street</Trans>}
                part={
                  <Trans>
                    You meet Mari on your way from school to the shop. You’re from Pärnu, and
                    tomorrow you’re going to Tartu.
                  </Trans>
                }
                them={t`Mari`}
                turns={dialogue}
              />
            </>
          ),
        },
      ]}
    />
  );
}
