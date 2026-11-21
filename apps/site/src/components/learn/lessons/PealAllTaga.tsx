import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { useMemo } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  PLACE_WORD_SENTENCES,
  PLACE_WORDS,
  type PlaceDirection,
  type PlaceWordId,
  placeWordSentence,
} from "../../../lib/learn/clips";
import { eachPairFirst } from "../../../lib/learn/quiz";
import { ListenRows, Panel } from "../Explore";
import { type GapItem, GapPassage } from "../GapPassage";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Match, type MatchPair } from "../Match";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { Quiz } from "../Quiz";
import { Scene, type SceneItem, SceneRound } from "../Scene";
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
    kust: msg`The cat comes off the box.`,
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
    after: "!",
    answer: "seest",
    options: ["seest", "sees", "sisse"],
  },
  {
    id: "peale",
    before: "Ta hüppab laua",
    after: ".",
    answer: "peale",
    options: ["pealt", "peale", "peal"],
  },
  {
    id: "pealt",
    before: "Ta hüppab laua",
    after: ".",
    answer: "pealt",
    options: ["peal", "pealt", "peale"],
  },
  {
    id: "korvale",
    before: "Ta tuleb minu",
    after: ".",
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

export function PealAllTagaLesson() {
  const { t, i18n } = useLingui();
  const genitive = lessonBySlug("omastav")?.n;
  const onto = lessonBySlug("laual-lauale-laualt")?.n;

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
        <Trans key="m">12 minutes</Trans>,
        <Trans key="q">4 quizzes</Trans>,
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
        "sisse",
        "pealt",
        "alt",
        "tagant",
        "eest",
        "seest",
        "juures",
      ]}
      recap={[
        <Trans key="1">
          On, under, behind, in front of, next to and inside are words that come after the thing:{" "}
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
          <b lang="et">Laua peal</b> and <b lang="et">laual</b> say the same, and so do{" "}
          <b lang="et">kasti sees</b> and <b lang="et">kastis</b>.
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
                    English does this with one word, ago: a week ago. The six words for where in
                    this lesson work the same way. Tap a word to move the cat and hear the sentence.
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
          title: t`The thing before it is in the genitive`,
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
                  The genitive is also the form <b lang="et">-l</b> and <b lang="et">-s</b> go on,
                  so <Word w="Raamat on laual." /> and <Word w="Raamat on laua peal." /> say the
                  same. <Word w="Kass on kastis." /> is <b lang="et">kasti sees</b>.
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
          title: t`Where is Miisu?`,
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
      ]}
    />
  );
}
