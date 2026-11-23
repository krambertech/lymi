import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { useMemo } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  PLACE_WORD_FIX,
  PLACE_WORD_SAY,
  PLACE_WORD_SENTENCES,
  PLACE_WORD_TALK,
  PLACE_WORD_TYPED,
  PLACE_WORDS,
  type PlaceDirection,
  type PlaceWordId,
  placeWordSentence,
} from "../../../lib/learn/clips";
import { eachPairFirst } from "../../../lib/learn/quiz";
import { ListenRows, Panel } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import { type GapItem, GapPassage } from "../GapPassage";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Match, type MatchPair } from "../Match";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { Listening, type PassageQuestion } from "../Passage";
import { Quiz } from "../Quiz";
import { Scene, type SceneItem, SceneRound } from "../Scene";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Sort } from "../Sort";
import { Word } from "../Word";

const SLUG = "peal-all-taga";
type Id = keyof typeof PLACE_WORD_SENTENCES;
type PlaceWord = (typeof PLACE_WORDS)[number];

export const DIRECTIONS: readonly PlaceDirection[] = ["kus", "kuhu", "kust"];

const sceneId = (word: PlaceWord, direction: PlaceDirection) => `s-${word.id}-${direction}`;
const src = (id: string) => clipUrl(SLUG, id);
const wordSrc = (word: string) => clipUrl(SLUG, clipId(word));
const wordOf = (id: PlaceWordId) => PLACE_WORDS.find((each) => each.id === id) as PlaceWord;

const MEANS: Record<PlaceWordId, Record<PlaceDirection, MessageDescriptor>> = {
  peal: {
    kus: msg`on, on top of`,
    kuhu: msg`onto`,
    kust: msg({ message: "off, from on top of", context: "pealt" }),
  },
  all: {
    kus: msg`under`,
    kuhu: msg({ message: "under", context: "alla, moving under" }),
    kust: msg`from under`,
  },
  taga: {
    kus: msg`behind`,
    kuhu: msg({ message: "behind", context: "taha, moving behind" }),
    kust: msg`from behind`,
  },
  ees: {
    kus: msg`in front of`,
    kuhu: msg({ message: "in front of", context: "ette, moving in front" }),
    kust: msg`from in front of`,
  },
  korval: {
    kus: msg`next to`,
    kuhu: msg({ message: "next to", context: "kõrvale, moving next to" }),
    kust: msg`from beside`,
  },
  sees: {
    kus: msg`inside`,
    kuhu: msg`into`,
    kust: msg`out of`,
  },
};

const SENTENCE_MEANS: Record<PlaceWordId, Record<PlaceDirection, MessageDescriptor>> = {
  peal: {
    kus: msg`The cat is on the box.`,
    kuhu: msg`The cat jumps onto the box.`,
    kust: msg`The cat comes down off the box.`,
  },
  all: {
    kus: msg`The cat is under the box.`,
    kuhu: msg`The cat goes under the box.`,
    kust: msg`The cat comes out from under the box.`,
  },
  taga: {
    kus: msg`The cat is behind the box.`,
    kuhu: msg`The cat goes behind the box.`,
    kust: msg`The cat comes out from behind the box.`,
  },
  ees: {
    kus: msg`The cat is in front of the box.`,
    kuhu: msg`The cat goes in front of the box.`,
    kust: msg`The cat moves away from in front of the box.`,
  },
  korval: {
    kus: msg`The cat is next to the box.`,
    kuhu: msg`The cat goes next to the box.`,
    kust: msg`The cat moves away from beside the box.`,
  },
  sees: {
    kus: msg`The cat is in the box.`,
    kuhu: msg`The cat goes into the box.`,
    kust: msg`The cat comes out of the box.`,
  },
};

const LINE_MEANS: Record<Id, MessageDescriptor> = {
  "e-laua-peal": msg`The book is on the table.`,
  "e-laua-all": msg`The cat is under the table.`,
  "e-maja-taga": msg`The car is behind the house.`,
  "e-poe-ees": msg`I’m waiting in front of the shop.`,
  "e-kooli-korval": msg`The café is next to the school.`,
  "e-raamatu-sees": msg`The money is inside the book.`,
  "e-laual": msg`The book is on the table.`,
  "e-kastis": msg`The cat is in the box.`,
  "j-juures": msg`I’m at Mum’s.`,
  "j-juurde": msg`I’m going to Mum’s.`,
  "j-juurest": msg`I’m coming from Mum’s.`,
};

const SCENE_ORDER: readonly PlaceWordId[] = ["peal", "all", "taga", "ees", "korval", "sees"];

const QUIZ_PLACES: readonly PlaceWordId[] = ["peal", "taga", "ees", "korval", "sees"];

export const SORT_ITEMS: readonly { w: string; bin: PlaceDirection }[] = [
  { w: "peale", bin: "kuhu" },
  { w: "all", bin: "kus" },
  { w: "tagant", bin: "kust" },
  { w: "ette", bin: "kuhu" },
  { w: "kõrval", bin: "kus" },
  { w: "seest", bin: "kust" },
  { w: "sisse", bin: "kuhu" },
  { w: "taga", bin: "kus" },
  { w: "alt", bin: "kust" },
];

const GENITIVE_LINES: readonly Id[] = [
  "e-laua-peal",
  "e-laua-all",
  "e-maja-taga",
  "e-poe-ees",
  "e-kooli-korval",
  "e-raamatu-sees",
];

const GLOSSARY: Glossary = {
  kast: { en: msg`box`, note: msg`Kasti is its genitive: kasti peal, on the box.` },
  kasti: { en: msg`of the box`, note: msg`The genitive of kast, box.` },
  kass: { en: msg({ message: "cat", context: "kass, the cat on the table" }) },
  välja: { en: msg`out` },
  ära: { en: msg`away` },
  maha: { en: msg`down, off` },
  põrandalt: { en: msg`from the floor` },
  istuma: { en: msg`to sit` },
  kus: { en: msg`where` },
  kuhu: { en: msg`where to` },
  kust: { en: msg`where from` },
  laud: { en: msg`table` },
  laua: { en: msg`of the table`, note: msg`The genitive of laud, table.` },
  laual: { en: msg`on the table` },
  kastis: { en: msg`in the box` },
  juures: { en: msg`at someone’s place, by`, note: msg`Ema juures: at Mum’s.` },
  juurde: { en: msg`to someone’s place` },
  juurest: { en: msg`from someone’s place` },
  miisu: { en: msg`Miisu, a cat’s name`, show: "Miisu" },
  ...Object.fromEntries(
    PLACE_WORDS.flatMap((word) =>
      DIRECTIONS.map((direction) => [word[direction], { en: MEANS[word.id][direction] }]),
    ),
  ),
  ...Object.fromEntries(
    PLACE_WORDS.flatMap((word) =>
      DIRECTIONS.map((direction) => [
        placeWordSentence(word, direction).toLowerCase(),
        {
          en: SENTENCE_MEANS[word.id][direction],
          show: placeWordSentence(word, direction),
          clip: sceneId(word, direction),
        },
      ]),
    ),
  ),
  ...Object.fromEntries(
    (Object.keys(PLACE_WORD_SENTENCES) as Id[]).map((id) => [
      PLACE_WORD_SENTENCES[id].toLowerCase(),
      { en: LINE_MEANS[id], show: PLACE_WORD_SENTENCES[id], clip: id },
    ]),
  ),
};

const lit = (word: PlaceWord, direction: PlaceDirection) => {
  const form: string = word[direction];
  if (word.id !== "peal" && word.id !== "korval") return form;
  const stem = word.kus.slice(0, -1);
  return `${stem}|${form.slice(stem.length)}`;
};

export const MIISU_GAPS: readonly GapItem[] = [
  {
    id: "peal",
    before: "Kus on Miisu? Miisu ei ole laua",
    after: ".",
    answer: "peal",
    options: ["peale", "peal", "pealt"],
  },
  {
    id: "all",
    before: "Ta ei ole ka laua",
    after: ".",
    answer: "all",
    options: ["alla", "alt", "all"],
  },
  {
    id: "seest",
    before: "Ta tuleb kasti",
    after: "välja!",
    answer: "seest",
    options: ["seest", "sees", "sisse"],
  },
  {
    id: "peale",
    before: "Ta hüppab põrandalt laua",
    after: ".",
    answer: "peale",
    options: ["pealt", "peale", "peal"],
  },
  {
    id: "pealt",
    before: "Ta hüppab laua",
    after: "maha.",
    answer: "pealt",
    options: ["peal", "pealt", "peale"],
  },
  {
    id: "korvale",
    before: "Ta tuleb minu",
    after: "istuma.",
    answer: "kõrvale",
    options: ["kõrval", "kõrvalt", "kõrvale"],
  },
];

const scenePlaces = (i18n: I18n, direction: PlaceDirection, ids: readonly PlaceWordId[]) =>
  ids.map((id) => {
    const word = wordOf(id);
    return {
      id,
      word: word[direction],
      meaning: i18n._(MEANS[id][direction]),
      sentence: placeWordSentence(word, direction),
      gloss: i18n._(SENTENCE_MEANS[id][direction]),
      src: src(sceneId(word, direction)),
    };
  });

type SceneQuizItem = SceneItem & { pair: readonly [string, string] };

export function typedItems(i18n: I18n): FormItem[] {
  return PLACE_WORD_TYPED.map(({ id, way }) => {
    const word = wordOf(id);
    return {
      base: word.kus,
      gloss: i18n._(MEANS[id].kus),
      cue: `${way}?`,
      cueLang: "et",
      answers: [word[way]],
      src: src(sceneId(word, way)),
      said: placeWordSentence(word, way),
      explain: i18n._(SENTENCE_MEANS[id][way]),
    };
  });
}

const SAY_MEANS: Record<(typeof PLACE_WORD_SAY)[number]["id"], MessageDescriptor> = {
  all: msg`The cat is under the table.`,
  taga: msg`The car is behind the house.`,
  ees: msg`I’m waiting in front of the shop.`,
  korval: msg`The café is next to the school.`,
  sisse: msg`The cat goes into the box.`,
  juurde: msg`I’m going to Mum’s.`,
};

export function sayItems(i18n: I18n): SentenceItem[] {
  return PLACE_WORD_SAY.map(({ id, said, also }) => ({
    kind: "translate",
    id: `say-${id}`,
    prompt: i18n._(SAY_MEANS[id]),
    src: wordSrc(said),
    answers: [said, ...also],
  }));
}

const FIX_MEANS: Record<(typeof PLACE_WORD_FIX)[number]["id"], MessageDescriptor> = {
  laua: msg`The book is on the table.`,
  peale: msg`The cat jumps onto the box.`,
  seest: msg`The cat comes out of the box.`,
  taga: msg`The car is behind the house.`,
  poe: msg`I’m waiting in front of the shop.`,
  juures: msg`I’m at Mum’s.`,
};

function FixWhy({ id }: { id: (typeof PLACE_WORD_FIX)[number]["id"] }) {
  switch (id) {
    case "laua":
      return (
        <Trans>
          The thing before a place word is in the genitive: <b lang="et">laua peal</b>.
        </Trans>
      );
    case "peale":
      return (
        <Trans>
          Jumping onto it answers <b lang="et">kuhu</b>: <b lang="et">peale</b>.
        </Trans>
      );
    case "seest":
      return (
        <Trans>
          Coming out answers <b lang="et">kust</b>: <b lang="et">seest</b>.
        </Trans>
      );
    case "taga":
      return (
        <Trans>
          Where the car is answers <b lang="et">kus</b>: <b lang="et">taga</b>.
        </Trans>
      );
    case "poe":
      return (
        <Trans>
          The thing before a place word is in the genitive: <b lang="et">pood, poe</b>,{" "}
          <b lang="et">poe ees</b>.
        </Trans>
      );
    case "juures":
      return (
        <Trans>
          Being at someone’s place answers <b lang="et">kus</b>: <b lang="et">juures</b>.
        </Trans>
      );
  }
}

export function fixItems(i18n: I18n): FixItem[] {
  return PLACE_WORD_FIX.map(({ id, wrong, right }) => ({
    kind: "fix",
    id: `fix-${id}`,
    wrong,
    prompt: i18n._(FIX_MEANS[id]),
    answers: [right],
    src: wordSrc(right),
    explain: <FixWhy id={id} />,
  }));
}

function useTalkQuestions(): PassageQuestion[] {
  const { t } = useLingui();
  return [
    {
      kind: "short",
      id: "coffee",
      ask: t`Where is the coffee? Write it in Estonian.`,
      answers: ["laua peal", "laual"],
      line: 2,
    },
    {
      id: "under",
      ask: t`What is under the table?`,
      options: [
        { id: "book", label: t`The book` },
        { id: "money", label: t`The money` },
        { id: "miisu", label: t`Miisu` },
      ],
      answer: "miisu",
      line: 4,
    },
    {
      kind: "short",
      id: "box",
      ask: t`What is in the box? Write it in Estonian.`,
      answers: ["raha"],
      line: 6,
    },
    {
      id: "book",
      ask: t`Where is Jaan’s book?`,
      options: [
        { id: "table", label: t`On the table` },
        { id: "mari", label: t`Mari has it` },
        { id: "box", label: t`In the box` },
      ],
      answer: "mari",
      line: 10,
    },
    {
      kind: "truefalse",
      id: "on-table",
      ask: t`The book is on the table.`,
      answer: false,
      line: 2,
    },
    {
      kind: "truefalse",
      id: "coming",
      ask: t`Jaan is coming over to Mari.`,
      answer: true,
      line: 12,
    },
  ];
}

export function PealAllTagaLesson() {
  const { t, i18n } = useLingui();
  const genitive = lessonBySlug("omastav")?.n;
  const onto = lessonBySlug("laual-lauale-laualt")?.n;
  const talkQuestions = useTalkQuestions();

  const sceneItems = useMemo<SceneQuizItem[]>(
    () =>
      QUIZ_PLACES.map((id) => ({
        scene: "box" as const,
        label: i18n._(msg`A cat and a box`),
        places: scenePlaces(i18n, "kus", QUIZ_PLACES),
        answer: id,
        pair: [id, id] as const,
      })),
    [i18n],
  );

  const rows: ParadigmRow[] = SCENE_ORDER.map((id) => {
    const word = wordOf(id);
    return {
      id,
      label: i18n._(MEANS[id].kus),
      cells: DIRECTIONS.map((direction) => ({
        form: lit(word, direction),
        src: src(sceneId(word, direction)),
        note: `${placeWordSentence(word, direction)} ${i18n._(SENTENCE_MEANS[id][direction])}`,
      })),
    };
  });

  const pairs: MatchPair[] = SCENE_ORDER.map((id) => ({
    id,
    left: wordOf(id).kus,
    right: i18n._(MEANS[id].kus),
    src: wordSrc(wordOf(id).kus),
  }));

  const gaps: GapItem[] = MIISU_GAPS.map((gap) => {
    const word = PLACE_WORDS.find((each) => DIRECTIONS.some((d) => each[d] === gap.answer));
    const direction = DIRECTIONS.find((d) => word?.[d] === gap.answer) as PlaceDirection;
    const why =
      direction === "kus" ? (
        <Trans>
          Where Miisu is, so the <b lang="et">kus</b> form: <b lang="et">{gap.answer}</b>.
        </Trans>
      ) : direction === "kuhu" ? (
        <Trans>
          Where Miisu goes, so the <b lang="et">kuhu</b> form: <b lang="et">{gap.answer}</b>.
        </Trans>
      ) : (
        <Trans>
          Where Miisu comes from, so the <b lang="et">kust</b> form: <b lang="et">{gap.answer}</b>.
        </Trans>
      );
    return { ...gap, why };
  });

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Estonian says on, under and behind with a word after the thing:{" "}
          <b lang="et">kasti peal</b>, on the box. The thing takes its genitive, and the place word
          has a form for each of <b lang="et">kus</b>, <b lang="et">kuhu</b> and{" "}
          <b lang="et">kust</b>.
        </Trans>
      }
      facts={[
        <Trans key="m">22 minutes</Trans>,
        <Trans key="q">8 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "kast",
        "peal",
        "all",
        "taga",
        "ees",
        "kõrval",
        "sees",
        "peale",
        "alla",
        "taha",
        "ette",
        "kõrvale",
        "sisse",
        "pealt",
        "alt",
        "tagant",
        "kõrvalt",
        "eest",
        "seest",
        "juures",
      ]}
      recap={[
        <Trans key="1">
          The words for on, under, behind, in front of, next to and inside come after the thing:{" "}
          <b lang="et">kasti peal, laua all, maja taga</b>.
        </Trans>,
        <Trans key="2">
          The thing before them is in the genitive: <b lang="et">laud</b> becomes{" "}
          <b lang="et">laua all</b>, <b lang="et">pood</b> becomes <b lang="et">poe ees</b>.
        </Trans>,
        <Trans key="3">
          Each word has a form for <b lang="et">kus</b>, <b lang="et">kuhu</b> and{" "}
          <b lang="et">kust</b>: <b lang="et">peal, peale, pealt</b>;{" "}
          <b lang="et">taga, taha, tagant</b>; <b lang="et">sees, sisse, seest</b>.
        </Trans>,
        <Trans key="4">
          <b lang="et">Laua peal</b> and <b lang="et">laual</b> both mean on the table, and{" "}
          <b lang="et">kasti sees</b> and <b lang="et">kastis</b> both mean in the box.
        </Trans>,
      ]}
      sections={[
        {
          id: "where",
          title: t`On, under, behind`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    English puts on or under before the thing. Estonian puts its word after it:{" "}
                    <Word w="Kass on kasti peal." /> Word for word: “cat is box’s on top”.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    English does this with ago: a week ago. The six place words in this lesson work
                    the same way. Tap a word to move the cat and hear the sentence.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Scene
                  scene="box"
                  label={t`A cat and a box`}
                  keysLabel={t`Where the cat is`}
                  places={scenePlaces(i18n, "kus", SCENE_ORDER)}
                />
              </Panel>
              <Prose>
                <p>
                  <Trans>Hear a sentence and tap where the cat is.</Trans>
                </p>
              </Prose>
              <Quiz
                id="where-is-the-cat"
                title={<Trans>Where is the cat?</Trans>}
                items={sceneItems}
                rounds={QUIZ_PLACES.length}
                order={eachPairFirst}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All five places right.</Trans>
                  ) : (
                    <Trans>Tap the words above the box once more, then try again.</Trans>
                  )
                }
                recall={(item) => {
                  const place = item.places.find((each) => each.id === item.answer);
                  return { label: place?.word ?? "", src: place?.src ?? "" };
                }}
                round={(props) => <SceneRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "genitive",
          title: t`The genitive before a place word`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Kast" /> became <Word w="kasti" /> before <Word w="peal" />. That’s the
                    genitive, the form lesson {genitive} taught for whose: <b lang="et">kasti</b>,
                    the box’s. Each place word takes it: <Word w="laud" /> becomes{" "}
                    <b lang="et">laua all</b>.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    You know these genitives already: <b lang="et">poe</b> from{" "}
                    <b lang="et">pood</b>, <b lang="et">kooli</b> from <b lang="et">kool</b>.{" "}
                    <b lang="et">Maja</b> stays <b lang="et">maja</b>. Tap a sentence to hear it.
                  </Trans>
                </p>
              </Prose>
              <ListenRows
                items={GENITIVE_LINES.map((id) => ({
                  main: PLACE_WORD_SENTENCES[id],
                  sub: i18n._(LINE_MEANS[id]),
                  src: src(id),
                }))}
              />
              <Aside>
                <Trans>
                  The <b lang="et">-l</b> and <b lang="et">-s</b> endings go on the genitive too:{" "}
                  <b lang="et">laua</b> gives <b lang="et">laual</b>, <b lang="et">kasti</b> gives{" "}
                  <b lang="et">kastis</b>. These two say the same about a book on a table:{" "}
                  <Word w="Raamat on laual." /> <Word w="Raamat on laua peal." /> And{" "}
                  <b lang="et">kastis</b> means the same as <b lang="et">kasti sees</b>:{" "}
                  <Word w="Kass on kastis." />
                </Trans>
              </Aside>
              <Match
                id="match-places"
                title={<Trans>Which word means what?</Trans>}
                pairs={pairs}
                columns={[<Trans key="w">Word</Trans>, <Trans key="m">Meaning</Trans>]}
              />
            </>
          ),
        },
        {
          id: "to-and-from",
          title: t`Where to and where from`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Lesson {onto} gave <b lang="et">laud</b> three forms: <b lang="et">laual</b>,{" "}
                    <b lang="et">lauale</b>, <b lang="et">laualt</b>. These words have three too,
                    one for <Word w="kus" />, one for <Word w="kuhu" /> and one for{" "}
                    <Word w="kust" />. <Word w="Peal" /> and <Word w="kõrval" /> take the same{" "}
                    <b lang="et">-l</b>, <b lang="et">-le</b> and <b lang="et">-lt</b>.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The other four change more, so learn each as three:{" "}
                    <b lang="et">all, alla, alt</b>; <b lang="et">taga, taha, tagant</b>;{" "}
                    <b lang="et">ees, ette, eest</b>; <b lang="et">sees, sisse, seest</b>. Tap a
                    form to hear its sentence.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Paradigm
                  label={t`Six place words, each with a form for kus, kuhu and kust`}
                  columns={[t`Where?`, t`Where to?`, t`Where from?`]}
                  rows={rows}
                  empty={{
                    title: t`Tap a form`,
                    tip: t`You’ll hear it in a sentence about the cat.`,
                  }}
                />
              </Panel>
              <Prose>
                <p>
                  <Trans>Put each form under the question it answers.</Trans>
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
                        Where something is: <b lang="et">peal, all, taga, ees, kõrval, sees</b>.
                      </Trans>
                    ),
                  },
                  {
                    id: "kuhu",
                    label: "kuhu?",
                    hint: t`where to`,
                    rule: (
                      <Trans>
                        Where something goes:{" "}
                        <b lang="et">peale, alla, taha, ette, kõrvale, sisse</b>.
                      </Trans>
                    ),
                  },
                  {
                    id: "kust",
                    label: "kust?",
                    hint: t`where from`,
                    rule: (
                      <Trans>
                        Where something comes from:{" "}
                        <b lang="et">pealt, alt, tagant, eest, kõrvalt, seest</b>.
                      </Trans>
                    ),
                  },
                ]}
                items={SORT_ITEMS.map(({ w, bin }) => ({ w, bin, src: wordSrc(w) }))}
              />
              <Aside>
                <Trans>
                  For a person’s place, Estonian says <Word w="juures" />:{" "}
                  <Word w="Ma olen ema juures." /> It has three forms too:{" "}
                  <Word w="Ma lähen ema juurde." /> <Word w="Ma tulen ema juurest." />
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "miisu",
          title: t`Looking for Miisu`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari is looking for her cat, <Word w="Miisu" />. Pick the form for each gap: is
                    Miisu somewhere, going somewhere or coming from somewhere?
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="where-is-miisu"
                title={<Trans>Fill the gaps</Trans>}
                gaps={gaps}
                mode="pick"
                clip="p-miisu"
              />
            </>
          ),
        },
        {
          id: "make-form",
          title: t`Making the form`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each round gives a place word and a question. Type the form that answers it,
                    then hear it in a sentence about the cat.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="type-place-word"
                title={<Trans>Type the form</Trans>}
                items={typedItems(i18n)}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight typed right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Read the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Tap through the table of forms above once more, then try again.</Trans>
                  )
                }
                recall={formRecall}
                round={(props) => <FormRound {...props} />}
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
                    Write each sentence in Estonian. Put the thing in the genitive, then the place
                    word.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="say-place-word"
                title={<Trans>Write it in Estonian</Trans>}
                items={sayItems(i18n)}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six written right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Read the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Go through the sections above once more, then try again.</Trans>
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
                    Each sentence has one word in the wrong form: the thing, or the place word. Tap
                    it, then write the right form.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-place-word"
                title={<Trans>Find and fix the mistake</Trans>}
                items={fixItems(i18n)}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six found and fixed.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Look again at the ones you missed.</Trans>
                  ) : (
                    <Trans>Go through the sections above once more, then try again.</Trans>
                  )
                }
                recall={fixRecall}
                round={(props) => <FixRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "listen",
          title: t`Listen: a lost book`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Jaan can’t find his book. Read the questions, then listen.</Trans>
                </p>
              </Prose>
              <Listening
                id="lost-book"
                title={<Trans>Listen: Jaan looks for his book</Trans>}
                clip="c-book"
                turns={PLACE_WORD_TALK.turns}
                names={{ third: "Mari", fourth: "Jaan" }}
                questions={talkQuestions}
              />
            </>
          ),
        },
      ]}
    />
  );
}
