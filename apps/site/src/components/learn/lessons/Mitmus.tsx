import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { ArrowRight } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { LESSONS, lessonBySlug } from "../../../lib/learn/catalogue";
import {
  capital,
  clipId,
  clipUrl,
  dictionaryPair,
  MITMUS_ADJECTIVES,
  MITMUS_CHANGED,
  MITMUS_SAME,
  MITMUS_SENTENCES,
  type PluralNoun,
  type PluralSentence,
  pluralSentence,
} from "../../../lib/learn/clips";
import { playSound, usePlaying } from "../../../lib/learn/player";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Chips, Panel } from "../Explore";
import { type GapItem, GapPassage } from "../GapPassage";
import { Aside, LessonView, Prose } from "../LessonView";
import type { Glossary } from "../lesson-context";
import { type ChoiceItem, ChoiceRound, Quiz, type TypedItem, TypedRound } from "../Quiz";
import { PlayButton, Playing } from "../Sound";
import { Word } from "../Word";

const SLUG = "mitmus";
/** A clip by what it says. */
const src = (text: string) => clipUrl(SLUG, clipId(text));

/** What each noun means, one and many. */
const NOUN_MEANS: Record<PluralNoun["one"], readonly [MessageDescriptor, MessageDescriptor]> = {
  maja: [msg`house`, msg`houses`],
  auto: [msg`car`, msg`cars`],
  kass: [msg`cat`, msg`cats`],
  kool: [msg`school`, msg`schools`],
  linn: [msg`town, city`, msg`towns, cities`],
  raamat: [msg`book`, msg`books`],
  pood: [msg`shop`, msg`shops`],
  tuba: [msg`room`, msg`rooms`],
  jõgi: [msg`river`, msg`rivers`],
  laps: [msg`child`, msg`children`],
  uks: [msg`door`, msg`doors`],
  mees: [msg`man`, msg`men`],
  naine: [msg`woman`, msg`women`],
  sõber: [msg`friend`, msg`friends`],
};

/** What each sentence and phrase means, by what it says. */
const MEANS: Record<string, MessageDescriptor> = {
  "Laps loeb.": msg`The child is reading.`,
  "Lapsed loevad.": msg`The children are reading.`,
  "Õpetaja räägib.": msg`The teacher is speaking.`,
  "Õpetajad räägivad.": msg`The teachers are speaking.`,
  "Sõber ootab.": msg`A friend is waiting.`,
  "Sõbrad ootavad.": msg`Friends are waiting.`,
  "Mees töötab.": msg`The man is working.`,
  "Mehed töötavad.": msg`The men are working.`,
  "Naine joob kohvi.": msg`The woman is drinking coffee.`,
  "Naised joovad kohvi.": msg`The women are drinking coffee.`,
  "Kass on kodus.": msg`The cat is at home.`,
  "Kassid on kodus.": msg`The cats are at home.`,
  "suur maja": msg`a big house`,
  "suured majad": msg`big houses`,
  "väike kass": msg`a small cat`,
  "väikesed kassid": msg`small cats`,
  "uus raamat": msg`a new book`,
  "uued raamatud": msg`new books`,
  "vana linn": msg`an old town`,
  "vanad linnad": msg`old towns`,
  "hea sõber": msg`a good friend`,
  "head sõbrad": msg`good friends`,
  "ilus tuba": msg`a beautiful room`,
  "ilusad toad": msg`beautiful rooms`,
  "Maja on suur.": msg`The house is big.`,
  "Majad on suured.": msg`The houses are big.`,
};

const NOUNS: readonly PluralNoun[] = [...MITMUS_SAME, ...MITMUS_CHANGED];

const GLOSSARY: Glossary = {
  ...Object.fromEntries(
    NOUNS.flatMap(({ one, many }) => [
      [one, { en: NOUN_MEANS[one][0] }],
      [many, { en: NOUN_MEANS[one][1] }],
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(MEANS).map(([said, en]) => [said.toLowerCase(), { en, show: said }]),
  ),
  kassi: { en: msg`the second form of kass`, note: msg`Kass, kassi: a vowel appears at the end.` },
  poe: { en: msg`the second form of pood`, note: msg`As in poes, in the shop.` },
  suur: { en: msg`big` },
  suure: { en: msg`the second form of suur` },
  suured: { en: msg`big, of more than one` },
  nad: { en: msg`they` },
  on: { en: msg`is, are`, note: msg`The same for ta and nad.`, clip: false },
  "kaks kassi": { en: msg`two cats`, note: msg`After a number from two up, the partitive.` },
  magama: { en: msg`to sleep`, note: msg`Nad magavad: they sleep.` },
};

/** A stretch of a line, lit in the stage’s hue when it is what changed. */
type Piece = readonly [text: string, lit: boolean];

/** A word or phrase with the -d at the end of each word lit: “suure|d maja|d”. */
export function litPlural(text: string): Piece[] {
  return text
    .split(/(d)(?=\s|$)/)
    .filter(Boolean)
    .map((part) => [part, part === "d"] as const);
}

/** A sentence with its endings lit: -b or -vad on the verb, and the noun’s -d. */
export function litSentence(row: PluralSentence, more: boolean): Piece[] {
  const [stem, ta, nad] = row.verb;
  const noun = capital(more ? row.many : row.one);
  const head: Piece[] = more
    ? [
        [noun.slice(0, -1), false],
        ["d", true],
      ]
    : [[noun, false]];
  const ending = more ? nad : ta;
  return [...head, [` ${stem}`, false], [ending, ending !== ""], [`${row.tail}.`, false]];
}

/** One line to tap. Its lit pieces swap in when the switch flips. */
function FlipLine({
  pieces,
  said,
  mode,
}: {
  pieces: readonly Piece[];
  said: string;
  mode: string;
}) {
  const clip = src(said);
  const playing = usePlaying(clip);
  return (
    <button
      type="button"
      data-playing={playing ? "" : undefined}
      onClick={() => void playSound(clip)}
      className="learn-key flex min-h-13 cursor-pointer items-center justify-between gap-3 rounded-tile bg-plate py-2 ps-4 pe-3 text-start hoverable:hover:bg-plate-hover"
    >
      <span
        key={mode}
        lang="et"
        className="learn-swap text-xl font-medium tracking-tight max-sm:text-lg"
      >
        <span className="inline-block">
          {pieces.map(([text, lit], i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: a line’s pieces never reorder
            <span key={i} className={clsx(lit && "text-(--form)")}>
              {text}
            </span>
          ))}
        </span>
      </span>
      <span className="grid size-5 shrink-0 place-items-center text-(--form)">
        {playing && <Playing className="h-3" />}
      </span>
    </button>
  );
}

/** The line under a switch: what the switch changed. */
function FlipNote({ mode, title, tip }: { mode: string; title: ReactNode; tip: ReactNode }) {
  return (
    <div aria-live="polite" className="min-h-13">
      <p key={mode} className="learn-swap grid gap-0.5">
        <span className="text-xl font-medium">{title}</span>
        <span className="text-md text-ink-secondary">{tip}</span>
      </p>
    </div>
  );
}

interface FlipRow {
  key: string;
  one: { said: string; pieces: readonly Piece[] };
  many: { said: string; pieces: readonly Piece[] };
}

/** Lines switched together between one and many, with a note for each side. */
function OneManyFlip({
  rows,
  notes,
}: {
  rows: readonly FlipRow[];
  notes: Record<"one" | "many", { title: ReactNode; tip: ReactNode }>;
}) {
  const { t } = useLingui();
  const [mode, setMode] = useState<"one" | "many">("one");
  return (
    <Panel>
      <Chips
        label={t`One or many`}
        items={[
          { label: t({ message: "One", context: "plural" }), value: "one" },
          { label: t({ message: "Many", context: "plural" }), value: "many" },
        ]}
        value={mode}
        onPick={(value) => setMode(value)}
      />
      <div
        className={clsx(
          "grid gap-1.5 sm:grid-flow-col sm:grid-cols-2",
          rows.length > 6 ? "sm:grid-rows-4" : "sm:grid-rows-3",
        )}
      >
        {rows.map((row) => {
          const side = row[mode];
          return <FlipLine key={row.key} pieces={side.pieces} said={side.said} mode={mode} />;
        })}
      </div>
      <FlipNote mode={mode} title={notes[mode].title} tip={notes[mode].tip} />
    </Panel>
  );
}

/** One form of a noun to tap, with what it plays. */
function FormWord({ said, children }: { said: string; children: ReactNode }) {
  const clip = src(said);
  const playing = usePlaying(clip);
  return (
    <button
      type="button"
      onClick={() => void playSound(clip)}
      className={clsx(
        "flex cursor-pointer items-center gap-2 rounded-xs px-2 py-1 text-start text-xl font-semibold tracking-tight transition-colors duration-150 hoverable:hover:bg-plate-hover max-sm:text-lg",
        playing && "bg-plate-hover",
      )}
    >
      <span lang="et" className="whitespace-nowrap">
        {children}
      </span>
      {playing && <Playing className="h-3 text-(--form)" />}
    </button>
  );
}

/** First form, second form and plural, each to tap, with the plural’s -d lit. */
function StemRow({ one, second, many }: PluralNoun) {
  const { i18n } = useLingui();
  return (
    <div className="grid gap-1 rounded-tile bg-plate px-2 pt-1.5 pb-2.5 shadow-[0_0_0_1px_var(--edge)]">
      <div className="flex flex-wrap items-center gap-x-0.5">
        <FormWord said={one}>
          <span className="text-ink-secondary">{one}</span>
        </FormWord>
        <ArrowRight aria-hidden="true" className="size-4 text-ink-muted rtl:-scale-x-100" />
        <FormWord said={second}>{second}</FormWord>
        <ArrowRight aria-hidden="true" className="size-4 text-ink-muted rtl:-scale-x-100" />
        <FormWord said={many}>
          {second}
          <span className="text-(--form)">d</span>
        </FormWord>
      </div>
      <p className="ps-2 text-sm text-ink-muted">
        {i18n._(NOUN_MEANS[one][0])}, {i18n._(NOUN_MEANS[one][1])}
      </p>
    </div>
  );
}

/** The nouns of “Type the plural”, keyed by how the second form differs from the first. */
export const TYPED: readonly (PluralNoun & { pair: readonly [string, string] })[] = [
  ...(["kass", "kool", "linn", "raamat", "laps", "uks"] as const).map((one) => ({
    ...(NOUNS.find((noun) => noun.one === one) as PluralNoun),
    pair: ["vowel", one] as const,
  })),
  ...(["pood", "tuba", "mees", "naine"] as const).map((one) => ({
    ...(NOUNS.find((noun) => noun.one === one) as PluralNoun),
    pair: ["inside", one] as const,
  })),
];

/** “One or many?”: each sentence of the verbs switch, heard for one and for many, keyed by its noun. */
export const HEARD = MITMUS_SENTENCES.flatMap((row) =>
  [false, true].map((more) => ({
    row,
    more,
    said: pluralSentence(row, more),
    pair: [row.one, `${row.one}-${more ? "many" : "one"}`] as const,
  })),
);

/** Another row’s sentence, said for one or many at random. */
const otherSentence = (row: PluralSentence): string => {
  const others = MITMUS_SENTENCES.filter((each) => each !== row);
  const other = shuffle(others)[0] as PluralSentence;
  return pluralSentence(other, Math.random() < 0.5);
};

/** The heard noun for one and for many, and one more sentence, in random order. */
export function threeSentences(row: PluralSentence): string[] {
  return shuffle([pluralSentence(row, false), pluralSentence(row, true), otherSentence(row)]);
}

/** The first round’s options, fixed so the page renders the same on the server. */
export function firstSentences(i: number): string[] {
  const row = MITMUS_SENTENCES[Math.floor(i / 2)] as PluralSentence;
  const next = MITMUS_SENTENCES[
    (Math.floor(i / 2) + 1) % MITMUS_SENTENCES.length
  ] as PluralSentence;
  const three = [pluralSentence(row, false), pluralSentence(row, true), pluralSentence(next, true)];
  const turn = i % 3;
  return [...three.slice(turn), ...three.slice(0, turn)];
}

type HeardItem = ChoiceItem & {
  said: string;
  row: PluralSentence;
  pair: readonly [string, string];
};

const sentenceOptions = (options: readonly string[], i18n: I18n) =>
  options.map((option) => ({
    id: option,
    label: <span lang={i18n.locale}>{i18n._(MEANS[option] as MessageDescriptor)}</span>,
  }));

/** The sentence and its meaning, after an answer. */
function Explain({ said }: { said: string }) {
  const { i18n } = useLingui();
  return (
    <>
      <span lang="et" className="font-medium text-ink">
        {said}
      </span>{" "}
      {i18n._(MEANS[said] as MessageDescriptor)}
    </>
  );
}

/** The passage “At home”, cut at each gap; the answers sit in every place. */
function gapsOf(): GapItem[] {
  return [
    {
      id: "toad",
      before: "Me elame Tartus. Meie kodu on väike, aga",
      after: "on suured.",
      answer: "toad",
      options: ["toad", "tuba"],
      why: (
        <Trans>
          <span lang="et">Suured</span> ends in <span lang="et">-d</span>, so there is more than one
          room: <span lang="et">toad</span>.
        </Trans>
      ),
    },
    {
      id: "tootavad",
      before: "Ema ja isa",
      after: "Tallinnas.",
      answer: "töötavad",
      options: ["töötab", "töötavad"],
      why: (
        <Trans>
          <span lang="et">Ema ja isa</span> are two people, like <span lang="et">nad</span>, so the
          verb ends in <span lang="et">-vad</span>.
        </Trans>
      ),
    },
    {
      id: "opivad",
      before: "Lapsed",
      after: "koolis.",
      answer: "õpivad",
      options: ["õpib", "õpime", "õpivad"],
      why: (
        <Trans>
          <span lang="et">Lapsed</span> is plural, so the verb takes the form of{" "}
          <span lang="et">nad</span>: <span lang="et">õpivad</span>.
        </Trans>
      ),
    },
    {
      id: "kassid",
      before: "Meie",
      after: "magavad kodus.",
      answer: "kassid",
      options: ["kass", "kassid"],
      why: (
        <Trans>
          <span lang="et">Magavad</span> is the form of <span lang="et">nad</span>, so there is more
          than one cat: <span lang="et">kassid</span>.
        </Trans>
      ),
    },
    {
      id: "vaikesed",
      before: "Nad on",
      after: "ja ilusad.",
      answer: "väikesed",
      options: ["väikesed", "väike"],
      why: (
        <Trans>
          After <span lang="et">nad on</span>, the adjective takes <span lang="et">-d</span>, like{" "}
          <span lang="et">ilusad</span>.
        </Trans>
      ),
    },
  ];
}

export function MitmusLesson() {
  const { t, i18n } = useLingui();
  const present = lessonBySlug("olevik")?.n;
  const stems = LESSONS.find((lesson) => lesson.et === "Pood, poe")?.n;
  const forms = LESSONS.find((lesson) => lesson.et === "Kolm põhivormi")?.n;
  const genitive = LESSONS.find((lesson) => lesson.et === "Minu raamat")?.n;
  const partitive = LESSONS.find((lesson) => lesson.et === "Kaks kassi")?.n;
  const gaps = gapsOf();

  const typedItems = useMemo<(TypedItem & { many: string; pair: readonly [string, string] })[]>(
    () =>
      TYPED.map((noun) => ({
        src: src(dictionaryPair(noun)),
        answers: [noun.many],
        many: noun.many,
        pair: noun.pair,
        inputMode: "text",
        prompt: t`Type the plural`,
        listen: <span lang="et">{dictionaryPair(noun)}</span>,
        said: (
          <span className="flex items-center gap-3">
            <span>
              {dictionaryPair(noun)} <ArrowRight aria-hidden="true" className="inline size-4" />{" "}
              <b className="font-semibold text-ink">
                {noun.second}
                <span className="text-(--form)">d</span>
              </b>
            </span>
            <PlayButton src={src(noun.many)} label={t`Play ${noun.many}`} />
          </span>
        ),
      })),
    [t],
  );

  const heardItems = useMemo<HeardItem[]>(
    () =>
      HEARD.map(({ row, said, pair }, i) => ({
        said,
        row,
        pair,
        src: src(said),
        answer: said,
        options: sentenceOptions(firstSentences(i), i18n),
        explain: <Explain said={said} />,
      })),
    [i18n],
  );

  // Every round but the first draws its third sentence afresh, so no set of options names the answer.
  const heardRun = (items: readonly HeardItem[], pinned?: HeardItem): HeardItem[] =>
    eachPairFirst(items, pinned).map((item) =>
      item === pinned
        ? item
        : { ...item, options: sentenceOptions(threeSentences(item.row), i18n) },
    );

  const nounRows: FlipRow[] = MITMUS_SAME.map(({ one, second, many }) => ({
    key: one,
    one: { said: one, pieces: [[one, false]] },
    many: {
      said: many,
      pieces: [
        [second, false],
        ["d", true],
      ],
    },
  }));

  const sentenceRows: FlipRow[] = MITMUS_SENTENCES.map((row) => ({
    key: row.one,
    one: { said: pluralSentence(row, false), pieces: litSentence(row, false) },
    many: { said: pluralSentence(row, true), pieces: litSentence(row, true) },
  }));

  const adjectiveRows: FlipRow[] = MITMUS_ADJECTIVES.map(({ one, many }) => ({
    key: one,
    one: { said: one, pieces: [[one, false]] },
    many: { said: many, pieces: litPlural(many) },
  }));

  const ending = (text: string) => (
    <b lang="et" className="whitespace-nowrap">
      {text}
    </b>
  );

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          To say more than one, add <span lang="et">-d</span> to a noun’s second form:{" "}
          <span lang="et">kass, kassi</span> gives <span lang="et">kassid</span>, cats. An adjective
          takes <span lang="et">-d</span> too, and the verb takes the form of{" "}
          <span lang="et">nad</span>: <span lang="et">Suured kassid söövad.</span> The big cats are
          eating.
        </Trans>
      }
      facts={[
        <Trans key="m">12 minutes</Trans>,
        <Trans key="q">2 quizzes and a passage with gaps</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "kassid",
        "majad",
        "raamatud",
        "poed",
        "toad",
        "lapsed",
        "mehed",
        "naised",
        "sõbrad",
        "suured majad",
        "lapsed loevad.",
        "kassid on kodus.",
      ]}
      recap={[
        <Trans key="1">
          The plural is the second form plus {ending("-d")}: <b lang="et">kass, kassi → kassid</b>;{" "}
          <b lang="et">maja, maja → majad</b>.
        </Trans>,
        <Trans key="2">
          The plural keeps the stem change of the second form:{" "}
          <b lang="et">pood, poe → poed; tuba, toa → toad</b>.
        </Trans>,
        <Trans key="3">
          A plural noun takes the verb form of <b lang="et">nad</b>: <b lang="et">Lapsed loevad.</b>{" "}
          <b lang="et">On</b> stays <b lang="et">on</b>.
        </Trans>,
        <Trans key="4">
          An adjective takes {ending("-d")} too, before the noun or after <b lang="et">on</b>:{" "}
          <b lang="et">suured majad; Majad on suured.</b>
        </Trans>,
        <Trans key="5">
          After a number, the noun stays singular: <b lang="et">kaks kassi</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "plural-d",
          title: t`The second form and -d`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    A dictionary gives a noun in three forms, as lesson {forms} shows. The second
                    form is the genitive from lesson {genitive}. To say more than one, add{" "}
                    {ending("-d")} to it: <Word w="kass" />, <Word w="kassi" />, so{" "}
                    <Word w="kassid" />, cats.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    When the second form is the same as the first, only the {ending("-d")} is new:{" "}
                    <Word w="maja" /> gives <Word w="majad" />. Switch between One and Many, and tap
                    a word to hear it.
                  </Trans>
                </p>
              </Prose>
              <OneManyFlip
                rows={nounRows}
                notes={{
                  one: {
                    title: <Trans>The first form</Trans>,
                    tip: <Trans>The form a dictionary lists first.</Trans>,
                  },
                  many: {
                    title: (
                      <Trans>
                        The second form and <span lang="et">-d</span>
                      </Trans>
                    ),
                    tip: (
                      <Trans>
                        <span lang="et">kassi</span> + <span lang="et">d</span> ={" "}
                        <span lang="et">kassid</span>
                      </Trans>
                    ),
                  },
                }}
              />
              <Aside>
                <Trans>
                  After a number from two up, Estonian keeps the noun singular, in the partitive
                  from lesson {partitive}: <Word w="kaks kassi" />, two cats, not{" "}
                  <span lang="et">kaks kassid</span>.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "stem",
          title: t`The plural keeps the stem change`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Lesson {stems} showed nouns whose stem changes before an ending:{" "}
                    <Word w="pood" /> becomes <Word w="poe" />. The plural is built on that second
                    form, so the change shows again: <Word w="poed" />, shops.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Add the {ending("-d")} to the second form, <b lang="et">poe</b>, not to{" "}
                    <b lang="et">pood</b>: <b lang="et">poed</b>. Tap each form to hear it.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {MITMUS_CHANGED.map((noun) => (
                    <StemRow key={noun.one} {...noun} />
                  ))}
                </div>
              </Panel>
            </>
          ),
        },
        {
          id: "make-plural",
          title: t`Making the plural`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Hear a noun’s first and second forms, then type its plural. Build it on the
                    second form.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="make-plural"
                title={<Trans>Type the plural</Trans>}
                items={typedItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six plurals right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. For the ones you missed, start from the second form.</Trans>
                  ) : (
                    <Trans>Tap the rows above once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.many, src: src(item.many) })}
                order={eachPairFirst}
                round={(props) => <TypedRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "verbs",
          title: t`The verb with a plural noun`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    A plural noun takes the same verb form as <Word w="nad" />, they, from lesson{" "}
                    {present}. One child reading is <Word w="Laps loeb." />, with the {ending("-b")}{" "}
                    of <span lang="et">ta</span>. Children reading is <Word w="Lapsed loevad." />,
                    with the {ending("-vad")} of <span lang="et">nad</span>.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    <Word w="On" /> is the same for one and many, so with it only the noun changes:{" "}
                    <Word w="Kass on kodus." /> <Word w="Kassid on kodus." /> Switch between One and
                    Many, and tap a sentence to hear it.
                  </Trans>
                </p>
              </Prose>
              <OneManyFlip
                rows={sentenceRows}
                notes={{
                  one: {
                    title: (
                      <Trans>
                        One: the verb form of <span lang="et">ta</span>
                      </Trans>
                    ),
                    tip: (
                      <Trans>
                        The verb ends in <span lang="et">-b</span>, or is <span lang="et">on</span>.
                      </Trans>
                    ),
                  },
                  many: {
                    title: (
                      <Trans>
                        Many: the verb form of <span lang="et">nad</span>
                      </Trans>
                    ),
                    tip: (
                      <Trans>
                        The noun takes <span lang="et">-d</span>, the verb{" "}
                        <span lang="et">-vad</span>. <span lang="et">On</span> stays.
                      </Trans>
                    ),
                  },
                }}
              />
            </>
          ),
        },
        {
          id: "one-or-many",
          title: t`Hearing one or many`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Hear a sentence and pick what it says. Listen to the end of the noun and of the
                    verb.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="one-or-many"
                title={<Trans>One or many?</Trans>}
                items={heardItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six right: you told one from many every time.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Tap the One and Many sentences above once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: item.src })}
                both={(item) => [
                  src(pluralSentence(item.row, false)),
                  src(pluralSentence(item.row, true)),
                ]}
                order={heardRun}
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "adjectives",
          title: t`Adjectives take -d too`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    An adjective before a plural noun is plural too, built the same way:{" "}
                    <Word w="suur" />, <Word w="suure" />, <Word w="suured" />. A big house is{" "}
                    <Word w="suur maja" />, and big houses are <Word w="suured majad" />.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    After <span lang="et">on</span> it’s the same: <Word w="Maja on suur." />{" "}
                    <Word w="Majad on suured." /> Switch between One and Many, and tap a line to
                    hear it.
                  </Trans>
                </p>
              </Prose>
              <OneManyFlip
                rows={adjectiveRows}
                notes={{
                  one: {
                    title: t({ message: "One", context: "plural" }),
                    tip: <Trans>Adjective and noun in the first form.</Trans>,
                  },
                  many: {
                    title: (
                      <Trans>
                        Both take <span lang="et">-d</span>
                      </Trans>
                    ),
                    tip: (
                      <Trans>
                        Each word is its second form plus <span lang="et">-d</span>.
                      </Trans>
                    ),
                  },
                }}
              />
            </>
          ),
        },
        {
          id: "home",
          title: t`At home`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    A family writes about its home in Tartu. Pick the word that fits each gap: the
                    words around it say whether it’s one or many. One verb is new:{" "}
                    <Word w="magama" />, to sleep.
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="at-home"
                title={<Trans>Fill the gaps</Trans>}
                gaps={gaps}
                mode="pick"
                clip="p-home"
              />
            </>
          ),
        },
      ]}
    />
  );
}
