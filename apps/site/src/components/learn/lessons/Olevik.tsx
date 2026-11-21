import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { ArrowRight } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { LESSONS, lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  PRESENT_ENDINGS,
  PRESENT_SENTENCES,
  PRESENT_VERBS,
  presentWithPronoun,
} from "../../../lib/learn/clips";
import { playSound, usePlaying } from "../../../lib/learn/player";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Chips, Keys, ListenRows, Panel } from "../Explore";
import { Aside, LessonView, Prose } from "../LessonView";
import type { Glossary } from "../lesson-context";
import { type ChoiceItem, ChoiceRound, type GapItem, GapRound, Quiz } from "../Quiz";
import { Playing } from "../Sound";
import { Word } from "../Word";

const SLUG = "olevik";
const wordSrc = (word: string) => clipUrl(SLUG, clipId(word));
const sentenceSrc = (id: keyof typeof PRESENT_SENTENCES) => clipUrl(SLUG, id);

type Verb = (typeof PRESENT_VERBS)[number];
type Person = (typeof PRESENT_ENDINGS)[number];
type Ending = Person["ending"];

const said = (person: Person, verb: Verb) =>
  presentWithPronoun(person.pronoun, verb.stem, person.ending);
const saidSrc = (person: Person, verb: Verb) => wordSrc(said(person, verb));

/** What each verb means, in the order of `PRESENT_VERBS`. */
const MEANS: Record<Verb["verb"], MessageDescriptor> = {
  elama: msg`to live`,
  õppima: msg`to learn, to study`,
  lugema: msg`to read`,
  tegema: msg`to do, to make`,
  rääkima: msg`to speak, to talk`,
  töötama: msg`to work`,
  ootama: msg`to wait`,
  armastama: msg`to love`,
  sööma: msg`to eat`,
  jooma: msg`to drink`,
};

/** Each ending's line under the keys, and elama with it. */
const ENDING_TIPS: Record<Ending, { tip: MessageDescriptor; elama: MessageDescriptor }> = {
  n: { tip: msg`The ending for ma, I.`, elama: msg`I live` },
  d: { tip: msg`The ending for sa, you.`, elama: msg`you live` },
  b: { tip: msg`The ending for ta, he or she. Olema has on here.`, elama: msg`he or she lives` },
  me: { tip: msg`The ending for me, we.`, elama: msg`we live` },
  te: {
    tip: msg`The ending for te: you, to more than one; polite you.`,
    elama: msg`you live, to more than one; polite you live`,
  },
  vad: { tip: msg`The ending for nad, they. Olema has on here too.`, elama: msg`they live` },
};

/** The first round's two wrong endings, the same on the server and in the browser. */
const NEAR: Record<Ending, readonly [Ending, Ending]> = {
  n: ["d", "me"],
  d: ["n", "te"],
  b: ["d", "vad"],
  me: ["n", "te"],
  te: ["d", "me"],
  vad: ["b", "me"],
};

const ENDINGS = PRESENT_ENDINGS.map((each) => each.ending);

/** The answer and two other endings at random, in random order, so the buttons never give it away. */
export function threeEndings(answer: Ending): Ending[] {
  return shuffle([answer, ...shuffle(ENDINGS.filter((each) => each !== answer)).slice(0, 2)]);
}

/** Each ending once before any comes back. Every round but the first draws its endings afresh. */
function freshRun<T extends { pair: readonly [string, string]; answer: string }>(
  withEndings: (item: T, endings: Ending[]) => T,
) {
  return (items: readonly T[], pinned?: T): T[] =>
    eachPairFirst(items, pinned).map((item) =>
      item === pinned ? item : withEndings(item, threeEndings(item.answer as Ending)),
    );
}

type GapQuizItem = GapItem & { said: string; pair: readonly [string, string] };
type HeardItem = ChoiceItem & {
  said: string;
  form: string;
  stem: string;
  pair: readonly [string, string];
};

const endingOptions = (stem: string, endings: readonly Ending[]) =>
  endings.map((ending) => ({ id: ending, label: <Form stem={stem} ending={ending} /> }));

const gapRun = freshRun<GapQuizItem>((item, endings) => ({ ...item, options: endings }));
const heardRun = freshRun<HeardItem>((item, endings) => ({
  ...item,
  options: endingOptions(item.stem, endings),
}));

/** Keyed by the ending, so a run hears all six, and a sentence never meets its pronoun-less twin. */
export const heardPair = (sentence: Sentence) => [sentence.ending, sentence.id] as const;

/** The first round's options: the answer and its two near misses, in the endings' order. */
const nearEndings = (answer: Ending) =>
  ENDINGS.filter((each) => each === answer || NEAR[answer].includes(each));

/** Longer than this, a gap's sentence no longer fits a phone at the gap's size. */
const GAP_FITS = 12;

const verbOf = (name: Verb["verb"]) => PRESENT_VERBS.find((each) => each.verb === name) as Verb;

interface Sentence {
  id: keyof typeof PRESENT_SENTENCES;
  verb: Verb["verb"];
  ending: Ending;
  en: MessageDescriptor;
  /** Shown in the list of sentences; the rest are heard in the quiz and in the prose. */
  listed: boolean;
}

/** Sentences to hear, with the verb in each and who does it. */
export const SENTENCES: readonly Sentence[] = [
  {
    id: "s-elan-tallinnas",
    verb: "elama",
    ending: "n",
    en: msg`I live in Tallinn.`,
    listed: true,
  },
  {
    id: "s-opin-eesti",
    verb: "õppima",
    ending: "n",
    en: msg`I’m learning Estonian.`,
    listed: true,
  },
  { id: "s-mida-teed", verb: "tegema", ending: "d", en: msg`What are you doing?`, listed: true },
  {
    id: "s-loen-raamatut",
    verb: "lugema",
    ending: "n",
    en: msg`I’m reading a book.`,
    listed: true,
  },
  {
    id: "s-raagib-eesti",
    verb: "rääkima",
    ending: "b",
    en: msg`He or she speaks Estonian.`,
    listed: true,
  },
  {
    id: "s-ootame-bussi",
    verb: "ootama",
    ending: "me",
    en: msg`We’re waiting for the bus.`,
    listed: true,
  },
  {
    id: "s-tootab-kodus",
    verb: "töötama",
    ending: "b",
    en: msg`He or she works from home.`,
    listed: true,
  },
  {
    id: "s-joovad-kohvi",
    verb: "jooma",
    ending: "vad",
    en: msg`They’re drinking coffee.`,
    listed: true,
  },
  {
    id: "s-armastan-sind",
    verb: "armastama",
    ending: "n",
    en: msg`I love you.`,
    listed: true,
  },
  {
    id: "s-raagite-hasti",
    verb: "rääkima",
    ending: "te",
    en: msg`You speak very well.`,
    listed: true,
  },
  {
    id: "s-soovad-kodus",
    verb: "sööma",
    ending: "vad",
    en: msg`They eat at home.`,
    listed: true,
  },
  {
    id: "c-elan-tallinnas",
    verb: "elama",
    ending: "n",
    en: msg`I live in Tallinn.`,
    listed: false,
  },
  {
    id: "c-opin-eesti",
    verb: "õppima",
    ending: "n",
    en: msg`I’m learning Estonian.`,
    listed: false,
  },
];

const GLOSSARY: Glossary = {
  ...Object.fromEntries(
    PRESENT_VERBS.map((each) => {
      const stem = each.stem;
      const form = `${each.stem}n`;
      return [each.verb, { en: MEANS[each.verb], note: msg`Stem ${stem}-: ma ${form}.` }];
    }),
  ),
  ...Object.fromEntries(
    PRESENT_ENDINGS.map(({ ending }) => [`ela${ending}`, { en: ENDING_TIPS[ending].elama }]),
  ),
  olema: { en: msg`to be` },
  olen: { en: msg`I am` },
  oled: { en: msg`you are` },
  oleme: { en: msg`we are` },
  olete: { en: msg`you are, to more than one; polite you are` },
  on: { en: msg`he or she is; they are` },
  "ma loen": {
    en: msg`I read; I’m reading`,
    show: "Ma loen",
    note: msg`One present tense for both.`,
  },
  "elan tallinnas": {
    en: msg`I live in Tallinn.`,
    note: msg`No ma: the ending -n already says I.`,
    show: "Elan Tallinnas.",
    clip: "c-elan-tallinnas",
  },
  "mina joon kohvi, tema joob vett": {
    en: msg`I drink coffee, he or she drinks water.`,
    note: msg`Long forms, because the two people are set side by side.`,
    show: "Mina joon kohvi, tema joob vett.",
    clip: "c-mina-joon",
  },
};

/** A verb form with its ending in the stage's hue. */
function Form({ stem, ending }: { stem: string; ending: string }) {
  return (
    <>
      {stem}
      <span className="text-(--form)">{ending}</span>
    </>
  );
}

/** One row of the verb's table: the pronoun and the form; a tap plays both. */
function FormKey({ person, verb }: { person: Person; verb: Verb }) {
  const { t } = useLingui();
  const src = saidSrc(person, verb);
  const playing = usePlaying(src);
  const text = said(person, verb);
  return (
    <button
      type="button"
      aria-label={t`Play ${text}`}
      data-playing={playing ? "" : undefined}
      onClick={() => void playSound(src)}
      className="learn-key relative grid cursor-pointer items-baseline gap-x-2 rounded-tile bg-plate px-3.5 py-2.5 text-start hoverable:hover:bg-plate-hover max-sm:px-3 max-sm:py-2 sm:grid-cols-[2.25rem_minmax(0,1fr)]"
    >
      <span lang="et" className="text-md text-ink-muted max-sm:text-sm">
        {person.pronoun}
      </span>
      <b
        lang="et"
        className="min-w-0 text-2xl/tight font-semibold tracking-tight whitespace-nowrap max-sm:text-xl/tight"
      >
        <Form stem={verb.stem} ending={person.ending} />
      </b>
      {playing && <Playing className="absolute end-3 top-3 h-3 text-(--form)" />}
    </button>
  );
}

/** Pick a verb, see its stem, and hear it with each pronoun in a two-column table. */
function Conjugator() {
  const { t, i18n } = useLingui();
  const [name, setName] = useState<Verb["verb"]>("lugema");
  const verb = verbOf(name);
  const column = (people: readonly Person[], title: ReactNode) => (
    <div className="grid content-start gap-1.5">
      <h3 className="ps-1 text-sm text-ink-secondary">{title}</h3>
      {people.map((person) => (
        <FormKey key={person.ending} person={person} verb={verb} />
      ))}
    </div>
  );
  return (
    <Panel className="gap-5">
      <Chips
        label={t`Verbs`}
        items={PRESENT_VERBS.map((each) => ({ label: each.verb, value: each.verb, lang: "et" }))}
        value={name}
        onPick={(value) => {
          setName(value);
          void playSound(wordSrc(value));
        }}
      />
      <div key={name} className="learn-swap grid gap-0.5">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-3xl font-semibold tracking-tight">
          <span lang="et">{verb.verb}</span>
          <span className="inline-flex items-center gap-x-3">
            <ArrowRight aria-hidden="true" className="size-6 text-ink-muted rtl:-scale-x-100" />
            <span lang="et" className="text-(--form)">
              {verb.stem}-
            </span>
          </span>
        </p>
        <p className="text-md text-ink-secondary">{i18n._(MEANS[name])}</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5 max-sm:gap-1.5">
        {column(PRESENT_ENDINGS.slice(0, 3), <Trans>One person</Trans>)}
        {column(PRESENT_ENDINGS.slice(3), <Trans>More than one</Trans>)}
      </div>
    </Panel>
  );
}

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function OlevikLesson() {
  const { t, i18n } = useLingui();
  const at = (et: string) => LESSONS.find((lesson) => lesson.et === et)?.n;
  const pronouns = at("Mina, sina, tema");
  const gradation = at("Jalg, jala");
  const where = at("Tallinnas, Tartus");
  const partitive = at("Kaks kassi");
  const verbForms = lessonBySlug("verbi-pohivormid")?.n;

  const endings = useMemo(
    () =>
      PRESENT_ENDINGS.map(({ ending }) => {
        const form = `ela${ending}`;
        return {
          label: `-${ending}`,
          sub: <Form stem="ela" ending={ending} />,
          src: wordSrc(form),
          accent: ending === "b" || ending === "vad",
          label2: `-${ending}, ${form}`,
          detail: {
            title: (
              <>
                <span lang="et">
                  <Form stem="ela" ending={ending} />
                </span>{" "}
                <small className="ms-1 text-md font-normal text-ink-secondary">
                  {i18n._(ENDING_TIPS[ending].elama)}
                </small>
              </>
            ),
            tip: i18n._(ENDING_TIPS[ending].tip),
          },
        };
      }),
    [i18n],
  );

  const gapItems = useMemo<GapQuizItem[]>(
    () =>
      PRESENT_VERBS.flatMap((verb) =>
        PRESENT_ENDINGS.map((person) => ({ verb, person })).filter(
          ({ verb, person }) =>
            person.pronoun.length + 1 + verb.stem.length + person.ending.length <= GAP_FITS,
        ),
      ).map(({ verb, person }) => {
        const text = said(person, verb);
        return {
          src: saidSrc(person, verb),
          before: `${capital(person.pronoun)} ${verb.stem}`,
          after: "",
          options: nearEndings(person.ending),
          answer: person.ending,
          said: text,
          pair: [person.ending, verb.verb] as const,
          explain: (
            <>
              <span lang="et" className="font-medium text-ink">
                {text}.
              </span>{" "}
              {i18n._(ENDING_TIPS[person.ending].tip)}
            </>
          ),
        };
      }),
    [i18n],
  );

  const heardItems = useMemo<HeardItem[]>(
    () =>
      SENTENCES.map((each) => {
        const verb = verbOf(each.verb);
        return {
          src: sentenceSrc(each.id),
          answer: each.ending,
          options: endingOptions(verb.stem, nearEndings(each.ending)),
          stem: verb.stem,
          said: PRESENT_SENTENCES[each.id],
          form: `${verb.stem}${each.ending}`,
          pair: heardPair(each),
          explain: (
            <>
              <span lang="et" className="font-medium text-ink">
                {PRESENT_SENTENCES[each.id]}
              </span>{" "}
              {i18n._(each.en)}
            </>
          ),
        };
      }),
    [i18n],
  );

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Ten everyday verbs, the stem each one builds on, and six endings that say who does it.
        </Trans>
      }
      facts={[
        <Trans key="m">10 minutes</Trans>,
        <Trans key="q">2 quizzes</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={PRESENT_VERBS.map((each) => each.verb)}
      recap={[
        <Trans key="1">
          A dictionary lists a verb in its -ma form: <b lang="et">elama</b>, to live. The endings go
          on its stem, <b lang="et">ela-</b>.
        </Trans>,
        <Trans key="2">
          Each pronoun has its ending:{" "}
          <b lang="et">ma -n, sa -d, ta -b, me -me, te -te, nad -vad</b>, so{" "}
          <b lang="et">elan, elad, elab, elame, elate, elavad</b>.
        </Trans>,
        <Trans key="3">
          Some stems change: <b lang="et">lugema, loen</b>. Learn each verb with its I form.
        </Trans>,
        <Trans key="4">
          One present tense: <b lang="et">ma loen</b> is both I read and I’m reading.
        </Trans>,
        <Trans key="5">
          The ending says who, so ma, sa, me and te can go: <b lang="et">Elan Tallinnas.</b>
        </Trans>,
      ]}
      sections={[
        {
          id: "endings",
          title: t`Six endings`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In lesson {pronouns} you met <Word w="olema" />, to be: <Word w="olen" />,{" "}
                    <Word w="oled" />, <Word w="oleme" />, <Word w="olete" />. Most verbs take the
                    same endings. Where olema says <Word w="on" />, they have two of their own:{" "}
                    <em>-b</em> for he or she and <em>-vad</em> for they.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Here they are on <Word w="elama" />, to live. The two new ones are in colour.
                    Tap an ending.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Keys
                  label={t`Endings of elama`}
                  columns={6}
                  phoneColumns={3}
                  empty={{
                    title: t`Tap an ending`,
                    tip: t`You’ll hear elama with it and who it’s for.`,
                  }}
                  items={endings}
                />
              </Panel>
            </>
          ),
        },
        {
          id: "stem",
          title: t`Stem and ending`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    A dictionary lists a verb in its -ma form: <Word w="elama" />, to live. Take off
                    -ma and you have the stem, <b lang="et">ela-</b>. The ending goes on the stem:{" "}
                    <Word w="elan" />, I live.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    In some verbs the stem changes: <Word w="lugema" />, to read, has the stem{" "}
                    <b lang="et">loe-</b>, so I read is <Word w="ma loen" />. You don’t need the
                    rule for that yet. Learn each verb with its I form:{" "}
                    <b lang="et">lugema, loen</b>. Take off -n and the rest is the stem. In lesson{" "}
                    {verbForms} you’ll add a third form, <b lang="et">lugeda</b>.
                  </Trans>
                </p>
              </Prose>
              <Conjugator />
              <Aside>
                <Trans>
                  Stems such as <b lang="et">loe-</b> and <b lang="et">räägi-</b> lose or change a
                  consonant inside the word. Lesson {gradation} explains the rule, called consonant
                  gradation.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "fill",
          title: t`Fill the ending`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Pick the ending that goes with the pronoun, then hear the sentence.</Trans>
                </p>
              </Prose>
              <Quiz
                id="present-endings"
                title={<Trans>Which ending?</Trans>}
                items={gapItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six. You matched every pronoun with its ending.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Tap the endings above once more.</Trans>
                  ) : (
                    <Trans>Go back to the endings above, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: item.src })}
                order={gapRun}
                round={(props) => <GapRound {...props} listen="after" />}
              />
            </>
          ),
        },
        {
          id: "now",
          title: t`I read, I’m reading`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Estonian has one present tense. <Word w="Ma loen" /> means both I read and I’m
                    reading, and the rest of the sentence tells you which. Tap a sentence to hear
                    it.
                  </Trans>
                </p>
              </Prose>
              <ListenRows
                items={SENTENCES.filter((each) => each.listed).map((each) => ({
                  main: PRESENT_SENTENCES[each.id],
                  sub: i18n._(each.en),
                  src: sentenceSrc(each.id),
                }))}
              />
              <Prose>
                <p>
                  <Trans>
                    As with olema, the ending already says who, so ma, sa, me and te often go:{" "}
                    <Word w="Elan Tallinnas" />. To set two people side by side, use the long
                    pronouns from lesson {pronouns}: <Word w="Mina joon kohvi, tema joob vett" />.
                  </Trans>
                </p>
              </Prose>
              <Aside>
                <Trans>
                  Tallinnas ends in -s, which means in; lesson {where} explains that ending. Keelt
                  and raamatut are in the partitive, a form an object often takes, which lesson{" "}
                  {partitive} explains. For now, learn them as phrases.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "hear",
          title: t`Which form did you hear?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Hear a sentence and pick the verb in it. The answers differ only in the ending,
                    so listen to the end of the verb.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="present-heard"
                title={<Trans>Which form did you hear?</Trans>}
                items={heardItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All of them. You hear who does it.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Listen to the very end of the verb, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.form, src: item.src })}
                order={heardRun}
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
      ]}
    />
  );
}
