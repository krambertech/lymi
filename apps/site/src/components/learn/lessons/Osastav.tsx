import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { useMemo } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  counted,
  OSASTAV_AMOUNTS,
  OSASTAV_COUNT,
  OSASTAV_COUNTED,
  OSASTAV_EXCHANGES,
  OSASTAV_FIX,
  OSASTAV_FOOD_QUIZ,
  OSASTAV_NO,
  OSASTAV_PASSAGES,
  OSASTAV_POLE_QUIZ,
  OSASTAV_SAY,
  OSASTAV_SOME,
  OSASTAV_TALK,
  PARTITIVE_NOUNS,
  type PartitiveNoun,
} from "../../../lib/learn/clips";
import { shuffle } from "../../../lib/learn/quiz";
import { type KeyItem, Keys, ListenRows, Panel, type RowItem } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import { GapPassage, type GapItem as PassageGap } from "../GapPassage";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { Listening, type PassageQuestion } from "../Passage";
import { type GapItem, GapRound, Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Word } from "../Word";

const SLUG = "osastav";
/** A clip of this lesson by what it says. */
const src = (text: string) => clipUrl(SLUG, clipId(text));

const NOUN_MEANS: Record<PartitiveNoun, MessageDescriptor> = {
  kass: msg`cat`,
  raamat: msg`book`,
  laps: msg`child`,
  auto: msg`car`,
  maja: msg`house`,
  euro: msg`euro`,
  kool: msg`school`,
  laud: msg`table`,
  kohv: msg`coffee`,
  vesi: msg`water`,
  juust: msg`cheese`,
  leib: msg`bread`,
  piim: msg`milk`,
  raha: msg`money`,
  aeg: msg`time`,
  kohvik: msg`café`,
};

/** What each phrase and sentence means, by what it says. */
const MEANS: Record<string, MessageDescriptor> = {
  "üks kass": msg`one cat`,
  "kaks kassi": msg`two cats`,
  "kolm kassi": msg`three cats`,
  "viis kassi": msg`five cats`,
  "üks raamat": msg`one book`,
  "kaks raamatut": msg`two books`,
  "viis raamatut": msg`five books`,
  "üks laps": msg`one child`,
  "kaks last": msg`two children`,
  "kolm last": msg`three children`,
  "viis last": msg`five children`,
  "üks auto": msg`one car`,
  "kaks autot": msg`two cars`,
  "viis autot": msg`five cars`,
  "üks maja": msg`one house`,
  "kaks maja": msg`two houses`,
  "viis maja": msg`five houses`,
  "üks euro": msg`one euro`,
  "kaks eurot": msg`two euros`,
  "viis eurot": msg`five euros`,
  "kümme eurot": msg`ten euros`,
  "üks kool": msg`one school`,
  "neli kooli": msg`four schools`,
  "üks laud": msg`one table`,
  "viis lauda": msg`five tables`,
  "Mitu last sul on?": msg`How many children do you have?`,
  "Mul on kaks last.": msg`I have two children.`,
  "Mitu kassi teil on?": msg`How many cats do you have?`,
  "Meil on üks kass.": msg`We have one cat.`,
  "Kui palju see maksab?": msg`How much does it cost?`,
  "Viis eurot.": msg`Five euros.`,
  "tass kohvi": msg`a cup of coffee`,
  "klaas vett": msg`a glass of water`,
  "kilo juustu": msg`a kilo of cheese`,
  "natuke piima": msg`a little milk`,
  "palju raha": msg`a lot of money`,
  "vähe aega": msg`not much time`,
  "Mul on kass.": msg`I have a cat.`,
  "Mul pole kassi.": msg`I don’t have a cat.`,
  "Sul on auto.": msg`You have a car.`,
  "Sul pole autot.": msg`You don’t have a car.`,
  "Tal on laps.": msg`He or she has a child.`,
  "Tal pole last.": msg`He or she doesn’t have a child.`,
  "Neil on maja.": msg`They have a house.`,
  "Neil pole maja.": msg`They don’t have a house.`,
  "Laual on leib.": msg`There’s a loaf of bread on the table.`,
  "Laual pole leiba.": msg`There’s no bread on the table.`,
  "Toas on laud.": msg`There’s a table in the room.`,
  "Toas pole lauda.": msg`There’s no table in the room.`,
  "Ma joon kohvi.": msg`I drink coffee.`,
  "Ta joob vett.": msg`He or she drinks water.`,
  "Me sööme leiba.": msg`We eat bread.`,
  "Nad söövad juustu.": msg`They eat cheese.`,
  "Ma tahan piima.": msg`I want some milk.`,
  "Kohvi, palun.": msg`Coffee, please.`,
  "Mul ei ole kassi.": msg`I don’t have a cat.`,
  "Üks kohv, palun.": msg`One coffee, please.`,
  "Ma loen raamatut.": msg`I’m reading a book.`,
  "Kass on laual.": msg`The cat is on the table.`,
  "Leib pole laual.": msg`The bread isn’t on the table.`,
  "Auto pole Tallinnas.": msg`The car isn’t in Tallinn.`,
  "Laud pole toas.": msg`The table isn’t in the room.`,
  "Piim maksab kaks eurot.": msg`The milk costs two euros.`,
  "Leib on laual.": msg`The bread is on the table.`,
  "Kass pole laual.": msg`The cat isn’t on the table.`,
};

const means = (text: string, i18n: I18n) => {
  const found = MEANS[text];
  return found ? i18n._(found) : "";
};

/** A word or sentence the prose says, keyed as `Word` looks it up, playing its own clip. */
const said = (text: string): Glossary => {
  const en = MEANS[text];
  if (!en) throw new Error(`No meaning for ${text}`);
  const key = text.toLowerCase();
  // A sentence keeps its capital wherever it appears; a phrase shows as the prose writes it.
  return { [key]: key === text ? { en } : { en, show: text } };
};

const GLOSSARY: Glossary = {
  ...Object.fromEntries(
    (Object.keys(MEANS) as string[]).flatMap((text) => Object.entries(said(text))),
  ),
  kass: { en: msg`cat`, note: msg`Kass, kassi, kassi.` },
  kassi: { en: msg`cat`, note: msg`The partitive of kass.` },
  raamat: { en: msg`book`, note: msg`Raamat, raamatu, raamatut.` },
  laps: { en: msg`child`, note: msg`Laps, lapse, last.` },
  last: { en: msg`child`, note: msg`The partitive of laps.` },
  maja: { en: msg`house`, note: msg`Maja, maja, maja: all three forms look alike.` },
  kohv: { en: msg`coffee`, note: msg`Kohv, kohvi, kohvi.` },
  kohvi: { en: msg`coffee`, note: msg`The partitive of kohv.` },
  vesi: { en: msg`water`, note: msg`Vesi, vee, vett.` },
  vett: { en: msg`water`, note: msg`The partitive of vesi.` },
  juust: { en: msg`cheese`, note: msg`Juust, juustu, juustu.` },
  juustu: { en: msg`cheese`, note: msg`The partitive of juust.` },
  leib: { en: msg`bread`, note: msg`Leib, leiva, leiba.` },
  leiba: { en: msg`bread`, note: msg`The partitive of leib.` },
  piim: { en: msg`milk`, note: msg`Piim, piima, piima.` },
  piima: { en: msg`milk`, note: msg`The partitive of piim.` },
  aeg: { en: msg`time`, note: msg`Aeg, aja, aega.` },
  aega: { en: msg`time`, note: msg`The partitive of aeg.` },
  mitu: { en: msg`how many` },
  tass: { en: msg`cup` },
  klaas: { en: msg`glass` },
  kilo: { en: msg`kilo` },
  palju: { en: msg`a lot, much, many` },
  natuke: { en: msg`a little` },
  vähe: { en: msg`little, not much` },
  pole: { en: msg`isn’t, aren’t`, note: msg`The short form of ei ole.` },
  tahan: { en: msg`I want`, note: msg`From tahtma, to want.` },
};

/**
 * A phrase or sentence as Paradigm writes it, without its full stop and with `|` before what the
 * partitive adds to the first: “kaks kass|i”, “Tal pole la|st”. A form like its first lights nothing.
 */
export function litForm(text: string, base: string, form: string): string {
  const bare = text.replace(/[.?!]$/, "");
  const at = bare.lastIndexOf(form);
  if (at < 0 || base === form) return bare;
  let same = 0;
  while (same < base.length && base[same] === form[same]) same++;
  return `${bare.slice(0, at + same)}|${bare.slice(at + same)}`;
}

/** Six nouns after üks, kaks and viis, the partitive's new letters lit. */
function CountTable() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = OSASTAV_COUNT.nouns.map((noun) => ({
    id: noun,
    label: i18n._(NOUN_MEANS[noun]),
    et: noun,
    cells: OSASTAV_COUNT.numbers.map((number) => {
      const text = counted(number, noun);
      const form = number === "üks" ? noun : PARTITIVE_NOUNS[noun];
      return {
        form: litForm(form, noun, form),
        src: src(text),
        note:
          noun === "maja" && number !== "üks" ? (
            <Trans>
              <b lang="et">{text}</b>, {means(text, i18n)}; its partitive is <b lang="et">maja</b>{" "}
              too, so it looks the same.
            </Trans>
          ) : (
            <Trans>
              <b lang="et">{text}</b>, {means(text, i18n)}
            </Trans>
          ),
      };
    }),
  }));
  return (
    <Panel>
      <Paradigm
        label={t`Six nouns after one, two and five`}
        columns={[t`One`, t`Two`, t`Five`]}
        rows={rows}
        empty={{
          title: t`Tap a form`,
          tip: (
            <Trans>
              After <b lang="et">üks</b> on its own, a noun keeps its nominative. From two up, it
              takes the partitive.
            </Trans>
          ),
        }}
      />
    </Panel>
  );
}

/** Seven sentences with on and with pole: what isn't there takes its partitive, unless it comes first. */
function NoTable() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = OSASTAV_NO.map((row) => ({
    id: clipId(row.no),
    label: "first" in row ? t`cat, said first` : i18n._(NOUN_MEANS[row.noun]),
    et: row.noun,
    cells: [
      { form: litForm(row.yes, row.noun, row.noun), src: src(row.yes), note: means(row.yes, i18n) },
      {
        form:
          "first" in row
            ? litForm(row.no, row.noun, row.noun)
            : litForm(row.no, row.noun, PARTITIVE_NOUNS[row.noun]),
        src: src(row.no),
        note:
          "first" in row ? (
            <Trans>
              {means(row.no, i18n)} The sentence starts with the cat, so <b lang="et">kass</b> keeps
              its nominative, even with <b lang="et">pole</b>.
            </Trans>
          ) : (
            means(row.no, i18n)
          ),
      },
    ],
  }));
  return (
    <Panel>
      <Paradigm
        label={t`Sentences that say something is there, and that it isn’t`}
        columns={[t`Is there`, t`Isn’t there`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{
          title: t`Tap a sentence`,
          tip: t`Compare each row’s two sentences. The last row starts with the cat.`,
        }}
      />
    </Panel>
  );
}

type CountItem = GapItem & {
  text: string;
  noun: PartitiveNoun;
  /** Whether the number is üks, so the noun keeps its nominative. */
  one: boolean;
  pair: readonly [string, string];
};

/** A count's two forms in a random order, so neither sits in one place. */
const twoForms = (noun: PartitiveNoun) => shuffle([noun, PARTITIVE_NOUNS[noun]]);

/** Each noun with üks and with a number from two up; options in the server's fixed order. */
export const COUNT_ITEMS: readonly { noun: PartitiveNoun; number: string; one: boolean }[] =
  OSASTAV_COUNTED.flatMap(({ noun, number }) => [
    { noun, number, one: false },
    { noun, number: "üks", one: true },
  ]);

/**
 * A run of six: every noun once, three of them with üks and three with a bigger number, in a random
 * order. The pinned first round counts as its noun's turn and its kind's.
 */
export function countRun<
  T extends { noun: PartitiveNoun; one: boolean; options: readonly string[] },
>(items: readonly T[], pinned?: T): T[] {
  const nouns = shuffle(
    [...new Set(items.map((item) => item.noun))].filter((noun) => noun !== pinned?.noun),
  );
  const ones = 3 - (pinned?.one ? 1 : 0);
  const picked = nouns.map(
    (noun, i) => items.find((item) => item.noun === noun && item.one === i < ones) as T,
  );
  return [
    ...(pinned ? [pinned] : []),
    ...shuffle(picked).map((item) => ({ ...item, options: twoForms(item.noun) })),
  ];
}

type PoleItem = FormItem & {
  noun: PartitiveNoun;
  /** Whether the noun comes first, so it keeps its nominative after pole. */
  first: boolean;
  pair: readonly [string, string];
  options: readonly string[];
};

/**
 * A run of four: every noun once, two said first and two after pole, in a random order, each
 * round's two forms in a new order. The pinned first round counts as its noun's turn and its kind's.
 */
export function poleRun<
  T extends { noun: PartitiveNoun; first: boolean; options: readonly string[] },
>(items: readonly T[], pinned?: T): T[] {
  const nouns = shuffle(
    [...new Set(items.map((item) => item.noun))].filter((noun) => noun !== pinned?.noun),
  );
  const firsts = 2 - (pinned?.first ? 1 : 0);
  const picked = nouns.map(
    (noun, i) => items.find((item) => item.noun === noun && item.first === i < firsts) as T,
  );
  return [
    ...(pinned ? [pinned] : []),
    ...shuffle(picked).map((item) => ({ ...item, options: shuffle(item.options) })),
  ];
}

function useContent() {
  const { t } = useLingui();
  const gaps: PassageGap[] = [
    {
      id: "juustu",
      before: "Täna on laupäev ja Mari on turul. Tal on vaja kilo",
      after: "",
      answer: "juustu",
      options: ["juust", "juustu"],
      why: (
        <Trans>
          After an amount, the partitive: <b lang="et">kilo juustu</b>.
        </Trans>
      ),
    },
    {
      id: "leib",
      before: "ja üks",
      after: ".",
      answer: "leib",
      options: ["leiba", "leib"],
      why: (
        <Trans>
          After <b lang="et">üks</b> on its own, the nominative: <b lang="et">üks leib</b>.
        </Trans>
      ),
    },
    {
      id: "eurot",
      before: "Juust maksab seitse",
      after: ".",
      answer: "eurot",
      options: ["euro", "eurot"],
      why: (
        <Trans>
          After a number from two up, the partitive: <b lang="et">seitse eurot</b>.
        </Trans>
      ),
    },
    {
      id: "leiba",
      before: "Aga turul pole täna",
      after: ".",
      answer: "leiba",
      options: ["leiba", "leib"],
      why: (
        <Trans>
          After <b lang="et">pole</b>, what there is none of in a place takes the partitive:{" "}
          <b lang="et">pole leiba</b>.
        </Trans>
      ),
    },
    {
      id: "kohvik",
      before: "Turul on",
      after: ".",
      answer: "kohvik",
      options: ["kohvik", "kohvikut"],
      why: (
        <Trans>
          A counted thing that is there keeps its nominative: <b lang="et">Turul on kohvik</b>.
        </Trans>
      ),
    },
    {
      id: "kohvi",
      before: "Mari joob kohvikus",
      after: ".",
      answer: "kohvi",
      options: ["kohvi", "kohv"],
      why: (
        <Trans>
          She drinks some coffee, not a counted cup: <b lang="et">joob kohvi</b>.
        </Trans>
      ),
    },
    {
      id: "kass",
      before: "Kohvikus on üks",
      after: ".",
      answer: "kass",
      options: ["kassi", "kass"],
      why: (
        <Trans>
          After <b lang="et">üks</b> on its own, the nominative: <b lang="et">üks kass</b>.
        </Trans>
      ),
    },
  ];
  // Answers keep a fixed order, so each right answer sits in its own place.
  const voice: PassageQuestion[] = [
    {
      id: "cheese",
      ask: t`How much is a kilo of cheese?`,
      options: [
        { id: "eighteen", label: t`€18` },
        { id: "eight", label: t`€8` },
        { id: "seven", label: t`€7` },
      ],
      answer: "eight",
      line: 2,
    },
    {
      id: "bread",
      ask: t`How much is the bread?`,
      options: [
        { id: "two", label: t`€2` },
        { id: "twelve", label: t`€12` },
        { id: "ten", label: t`€10` },
      ],
      answer: "two",
      line: 3,
    },
    {
      id: "none",
      ask: t`What isn’t there today?`,
      options: [
        { id: "water", label: t`Water` },
        { id: "tea", label: t`Tea` },
        { id: "milk", label: t`Milk` },
      ],
      answer: "milk",
      line: 4,
    },
    {
      id: "ask",
      ask: t`What does Jaan ask you?`,
      options: [
        { id: "where", label: t`Where you are` },
        { id: "coffee", label: t`If you want coffee` },
        { id: "money", label: t`If you have money` },
      ],
      answer: "coffee",
      line: 5,
    },
  ];
  return { gaps, voice };
}

const SAY_MEANS: Record<(typeof OSASTAV_SAY)[number]["id"], MessageDescriptor> = {
  kassi: msg`I have two cats.`,
  tass: msg`A cup of coffee, please.`,
  leiba: msg`There’s no bread on the table.`,
  last: msg`How many children do you have?`,
  vett: msg`He or she drinks water.`,
  eurot: msg`Bread costs three euros.`,
};

export function sayItems(i18n: I18n): SentenceItem[] {
  return OSASTAV_SAY.map(({ id, said, also }) => ({
    kind: "translate",
    id: `say-${id}`,
    prompt: i18n._(SAY_MEANS[id]),
    src: src(said),
    answers: [said, ...also],
  }));
}

function FixWhy({ id }: { id: (typeof OSASTAV_FIX)[number]["id"] }) {
  switch (id) {
    case "kassi":
      return (
        <Trans>
          After a number from two up, the partitive: <b lang="et">kaks kassi</b>.
        </Trans>
      );
    case "kohvi":
      return (
        <Trans>
          Someone drinks some of it, so the partitive: <b lang="et">kohvi</b>.
        </Trans>
      );
    case "leiba":
      return (
        <Trans>
          After <b lang="et">pole</b>, what isn’t there takes the partitive: <b lang="et">leiba</b>.
        </Trans>
      );
    case "tass":
      return (
        <Trans>
          After an amount, the partitive: <b lang="et">tass kohvi</b>.
        </Trans>
      );
    case "kass":
      return (
        <Trans>
          After <b lang="et">üks</b> on its own, the nominative: <b lang="et">üks kass</b>.
        </Trans>
      );
    case "last":
      return (
        <Trans>
          After <b lang="et">mitu</b>, the partitive: <b lang="et">mitu last</b>.
        </Trans>
      );
  }
}

const FIX_MEANS: Record<(typeof OSASTAV_FIX)[number]["id"], MessageDescriptor> = {
  kassi: msg`I have two cats.`,
  kohvi: msg`I drink coffee.`,
  leiba: msg`There’s no bread on the table.`,
  tass: msg`A cup of coffee, please.`,
  kass: msg`We have one cat.`,
  last: msg`How many children do you have?`,
};

export function fixItems(i18n: I18n): FixItem[] {
  return OSASTAV_FIX.map(({ id, wrong, right }) => ({
    kind: "fix",
    id: `fix-${id}`,
    wrong,
    prompt: i18n._(FIX_MEANS[id]),
    answers: [right],
    src: src(right),
    explain: <FixWhy id={id} />,
  }));
}

function useTalkQuestions(): PassageQuestion[] {
  const { t } = useLingui();
  return [
    { kind: "truefalse", id: "milk", ask: t`There’s milk at home.`, answer: false, line: 1 },
    {
      id: "home",
      ask: t`What is there at home?`,
      options: [
        { id: "bread", label: t`Bread` },
        { id: "water", label: t`Water` },
        { id: "milk", label: t`Milk` },
      ],
      answer: "water",
      line: 2,
    },
    {
      kind: "short",
      id: "cheese",
      ask: t`How much cheese is there? Write it in Estonian.`,
      answers: ["natuke", "natuke juustu"],
      line: 5,
    },
    {
      id: "going",
      ask: t`Where is Mari going?`,
      options: [
        { id: "work", label: t`To work` },
        { id: "market", label: t`To the market` },
        { id: "shop", label: t`To the shop` },
      ],
      answer: "shop",
      line: 7,
    },
    {
      kind: "short",
      id: "coffee",
      ask: t`How much coffee does Jaan need? Write it in Estonian.`,
      answers: ["kilo", "kilo kohvi", "üks kilo"],
      line: 10,
    },
    { kind: "truefalse", id: "money", ask: t`Jaan has ten euros.`, answer: true, line: 14 },
  ];
}

export function OsastavLesson() {
  const { t, i18n } = useLingui();
  const content = useContent();
  const talkQuestions = useTalkQuestions();
  const numbers = lessonBySlug("numbrid")?.n;
  const negation = lessonBySlug("eitus")?.n;
  const questions = lessonBySlug("kusimused")?.n;
  const present = lessonBySlug("olevik")?.n;
  const forms = lessonBySlug("pohivormid")?.n;
  const have = lessonBySlug("mul-on")?.n;
  const object = lessonBySlug("raamatut-voi-raamatu")?.n;

  const countItems = useMemo<CountItem[]>(
    () =>
      COUNT_ITEMS.map(({ noun, number, one }) => {
        const text = counted(number, noun);
        return {
          text,
          noun,
          one,
          src: src(text),
          before: `${number}\u00a0`,
          after: "",
          answer: one ? noun : PARTITIVE_NOUNS[noun],
          options: [noun, PARTITIVE_NOUNS[noun]],
          pair: [noun, text] as const,
          explain: (
            <>
              <span lang="et" className="font-medium text-ink">
                {text}
              </span>{" "}
              {means(text, i18n)}
            </>
          ),
        };
      }),
    [i18n],
  );

  const amountItems = useMemo<FormItem[]>(
    () =>
      OSASTAV_AMOUNTS.map(({ phrase, noun }) => ({
        base: noun,
        gloss: i18n._(NOUN_MEANS[noun]),
        cue: `${phrase.split(" ")[0]} …`,
        cueLang: "et",
        answers: [PARTITIVE_NOUNS[noun]],
        src: src(phrase),
        said: phrase,
        explain: means(phrase, i18n),
      })),
    [i18n],
  );

  // The server's first round has the answer second, the next first, and so on.
  const poleItems = useMemo<PoleItem[]>(
    () =>
      OSASTAV_POLE_QUIZ.map((row, i) => {
        const third = PARTITIVE_NOUNS[row.noun];
        return {
          base: row.noun,
          gloss: i18n._(NOUN_MEANS[row.noun]),
          cue: row.cue,
          cueLang: "et",
          answers: ["first" in row ? row.noun : third],
          options: i % 2 ? [row.noun, third] : [third, row.noun],
          src: src(row.said),
          said: row.said,
          noun: row.noun,
          first: "first" in row,
          pair: [row.noun, row.said] as const,
          explain:
            "first" in row ? (
              <Trans>The sentence starts with it, so it keeps its nominative.</Trans>
            ) : (
              <Trans>
                After <b lang="et">pole</b>, what isn’t there takes the partitive.
              </Trans>
            ),
        };
      }),
    [i18n],
  );

  const foodItems = useMemo<FormItem[]>(
    () =>
      OSASTAV_FOOD_QUIZ.map((row) => ({
        base: row.noun,
        gloss: i18n._(NOUN_MEANS[row.noun]),
        cue: row.cue,
        cueLang: "et",
        answers: ["first" in row ? row.noun : PARTITIVE_NOUNS[row.noun]],
        src: src(row.said),
        said: row.said,
        explain:
          "first" in row ? (
            <Trans>
              Nobody eats, drinks or wants it here: the sentence starts with it, so the nominative.
            </Trans>
          ) : (
            <Trans>Someone eats, drinks or wants some of it, uncounted, so the partitive.</Trans>
          ),
      })),
    [i18n],
  );

  const rowsOf = (texts: readonly string[]): RowItem[] =>
    texts.map((text) => ({ main: text, sub: means(text, i18n), src: src(text) }));

  const amountKeys: KeyItem[] = OSASTAV_AMOUNTS.map(({ phrase, noun }) => ({
    label: phrase,
    sub: noun,
    src: src(phrase),
    detail: {
      title: (
        <span lang="et">
          {noun} → {PARTITIVE_NOUNS[noun]}
        </span>
      ),
      tip: `${means(phrase, i18n)} · ${i18n._(NOUN_MEANS[noun])}`,
    },
  }));

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          When Estonian uses a noun’s partitive: after a number from two up, after an amount, after{" "}
          <b lang="et">pole</b>, and for some of the food and drink someone eats, drinks or wants.
        </Trans>
      }
      facts={[
        <Trans key="m">22 minutes</Trans>,
        <Trans key="q">9 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "kaks kassi",
        "mitu",
        "tass kohvi",
        "kilo juustu",
        "natuke piima",
        "palju raha",
        "vähe aega",
        "mul pole kassi.",
        "ma joon kohvi.",
        "kohvi, palun.",
        "vesi",
        "leib",
        "juust",
        "piim",
        "pole",
      ]}
      recap={[
        <Trans key="1">
          After a number from two up, a noun takes its partitive and stays singular:{" "}
          <b lang="et">kaks kassi, viis eurot</b>. After <b lang="et">üks</b> on its own, it keeps
          its nominative: <b lang="et">üks kass</b>.
        </Trans>,
        <Trans key="2">
          Ask how many with <b lang="et">mitu</b> and the partitive:{" "}
          <b lang="et">Mitu last sul on?</b>
        </Trans>,
        <Trans key="3">
          After an amount, what it measures takes the partitive:{" "}
          <b lang="et">tass kohvi, palju raha</b>.
        </Trans>,
        <Trans key="4">
          After <b lang="et">pole</b>, what someone hasn’t got, or what there is none of in a place,
          takes the partitive: <b lang="et">Mul pole kassi, Laual pole leiba</b>. When the sentence
          starts with the thing, it keeps its nominative: <b lang="et">Kass pole laual</b>.
        </Trans>,
        <Trans key="5">
          What you eat, drink or want, when you don’t count it, takes the partitive too:{" "}
          <b lang="et">Ma joon kohvi</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "numbers",
          title: t`After a number from two up`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Üks kass" /> is one cat; <Word w="kaks kassi" /> is two cats. After a
                    number from two up, a noun takes the partitive and stays singular:{" "}
                    <Word w="kassi" /> has no plural ending.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The partitive is the last of the three a dictionary gives, as lesson {forms}{" "}
                    shows: <b lang="et">raamat, raamatu, raamatut</b>. You’ve heard it in prices
                    since lesson {numbers}: <Word w="viis eurot" />. Tap a form to hear it with its
                    number.
                  </Trans>
                </p>
              </Prose>
              <CountTable />
              <Aside>
                <Trans>
                  Some partitives change more than an ending: <Word w="laps" /> becomes{" "}
                  <Word w="last" />, and <Word w="vesi" /> becomes <Word w="vett" />. So learn each
                  noun with its partitive, as the dictionary lists it.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "mitu",
          title: t`Asking how many`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Mitu" /> asks how many, and the noun after it takes its partitive too.
                    For a price, ask with <b lang="et">kui palju</b>, how much, from lesson{" "}
                    {questions}.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rowsOf(OSASTAV_EXCHANGES.flatMap(({ q, a }) => [q, a]))} />
              <Prose>
                <p>
                  <Trans>
                    An answer with <b lang="et">üks</b> keeps the nominative:{" "}
                    <Word w="Meil on üks kass." />
                  </Trans>
                </p>
              </Prose>
            </>
          ),
        },
        {
          id: "one-or-more",
          title: t`The form after a number`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each round shows a number. Pick the form of the noun that follows it, then hear
                    the two together.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="one-or-more"
                title={<Trans>Which form follows the number?</Trans>}
                items={countItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six. You picked the right form after every number.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Tap the forms in the table above once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.text, src: item.src })}
                order={countRun}
                round={(props) => <GapRound {...props} listen="after" />}
              />
            </>
          ),
        },
        {
          id: "amounts",
          title: t`After an amount`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Tass kohvi" /> is a cup of coffee. The amount comes first, and what it
                    measures follows in its partitive: <Word w="kohv" /> becomes <Word w="kohvi" />.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    <Word w="Palju" />, a lot, <Word w="natuke" />, a little, and <Word w="vähe" />,
                    not much, work the same way. The same rule is behind{" "}
                    <b lang="et">Kui palju kohvi sa jood?</b> from lesson {questions}.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Keys
                  label={t`Amounts`}
                  items={amountKeys}
                  columns={3}
                  phoneColumns={2}
                  empty={{
                    title: t`Tap an amount`,
                    tip: t`Under each one is the word as a dictionary gives it.`,
                  }}
                />
              </Panel>
              <Prose>
                <p>
                  <Trans>
                    Now make the form yourself. Each round shows the word as a dictionary gives it
                    and the amount before it. Type its partitive.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="amount-form"
                title={<Trans>Type the form after the amount</Trans>}
                items={amountItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six, typed in full.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Tap the amounts above for the ones you missed.</Trans>
                  ) : (
                    <Trans>Tap the amounts above once more, then try again.</Trans>
                  )
                }
                recall={formRecall}
                round={(props) => <FormRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "no",
          title: t`Saying something isn’t there`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Mul on kass." /> I have a cat. To say you don’t, use <Word w="pole" />{" "}
                    from lesson {negation}, and the cat takes its partitive:{" "}
                    <Word w="Mul pole kassi." /> (Lesson {have} teaches <b lang="et">Mul on</b>.)
                  </Trans>
                </p>
                <p>
                  <Trans>
                    It works the same for a place: <Word w="Laual pole leiba." /> Tap the sentences
                    in each column.
                  </Trans>
                </p>
              </Prose>
              <NoTable />
              <Aside>
                <Trans>
                  You can also say <Word w="Mul ei ole kassi." /> It means the same:{" "}
                  <b lang="et">pole</b> is the short form of <b lang="et">ei ole</b>. A sentence
                  that starts with the thing keeps its nominative: <Word w="Kass pole laual." />
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>
                    Each round shows a sentence with a gap. Pick the form that fills it. Is the gap
                    after <b lang="et">pole</b>, or at the start of the sentence?
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="pole-form"
                title={<Trans>Which form fills the gap?</Trans>}
                items={poleItems}
                rounds={4}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>
                      All four. You told a gap after <b lang="et">pole</b> from a gap at the start.
                    </Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Compare the last row of the table once more.</Trans>
                  ) : (
                    <Trans>Tap both columns of the table once more, then try again.</Trans>
                  )
                }
                recall={formRecall}
                order={poleRun}
                round={(props) => <FormRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "food",
          title: t`Food and drink`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Since lesson {present} you’ve said <Word w="Ma joon kohvi." /> You drink some
                    coffee, not a counted cup, so <b lang="et">kohvi</b> is in the partitive.
                    Anything you eat, drink or want some of works the same way. Tap a sentence to
                    hear it.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rowsOf(OSASTAV_SOME)} />
              <Aside>
                <Trans>
                  In a café you’ll also hear <Word w="Üks kohv, palun." /> That’s one coffee,
                  counted, so it keeps its nominative. Lesson {object} explains why the partitive
                  appears here too: <Word w="Ma loen raamatut." />
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>
                    Type the form each sentence needs. Two of the sentences start with the food
                    itself.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="food-form"
                title={<Trans>Type the form the sentence needs</Trans>}
                items={foodItems}
                rounds={7}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All seven, typed in full.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the sentences above for the ones you missed.</Trans>
                  ) : (
                    <Trans>Hear the sentences above once more, then try again.</Trans>
                  )
                }
                recall={formRecall}
                round={(props) => <FormRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "market",
          title: t`At the market`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari goes to the market on Saturday. Pick the nominative or partitive for each
                    gap. The partitive follows a number from two up, an amount or{" "}
                    <b lang="et">pole</b>, and marks food or drink someone eats, drinks or wants.
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="market-day"
                title={<Trans>Mari’s Saturday</Trans>}
                gaps={content.gaps}
                mode="pick"
                clip="p-market"
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
                    Write each sentence in Estonian. After a number from two up, an amount,{" "}
                    <b lang="et">mitu</b> or <b lang="et">pole</b>, and for food or drink someone
                    eats, drinks or wants, the partitive.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="say-partitive"
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
                    Each sentence has one noun in the wrong form. Tap it, then write the right form.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-partitive"
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
          id: "voice",
          title: t`A voice message from the market`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Jaan leaves you a voice message from the market. Listen for the prices and for
                    what there isn’t.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="jaan-market"
                title={<Trans>Listen: Jaan at the market</Trans>}
                clip="p-jaan"
                sentences={OSASTAV_PASSAGES.jaan}
                questions={content.voice}
              />
            </>
          ),
        },
        {
          id: "shopping",
          title: t`Listen: a shopping list`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari and Jaan check what they have at home. With <b lang="et">on</b>, food or
                    drink you have some of, uncounted, takes the partitive too:{" "}
                    <b lang="et">meil on vett</b>. Read the questions, then listen.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="what-we-need"
                title={<Trans>Listen: Mari and Jaan at home</Trans>}
                clip="c-shopping"
                turns={OSASTAV_TALK.turns}
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
