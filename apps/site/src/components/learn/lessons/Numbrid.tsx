import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Minus, Plus } from "lucide-react";
import { type ReactNode, useMemo, useRef, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipUrl,
  NUMBER_ALIKE,
  NUMBER_PASSAGE,
  NUMBER_SENTENCES,
  NUMBER_WRITTEN,
  numberClip,
} from "../../../lib/learn/clips";
import { DIGIT_WORDS, numberParts, numberWords } from "../../../lib/learn/estonian-numbers";
import { playSound } from "../../../lib/learn/player";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Chips, Keys, ListenRows, Panel } from "../Explore";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import type { Glossary } from "../lesson-context";
import { LessonView, Prose } from "../LessonView";
import { Listening, type PassageQuestion } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz, type TypedItem, TypedRound } from "../Quiz";
import { PlayButton } from "../Sound";
import { Word } from "../Word";

const SLUG = "numbrid";
const numberSrc = (n: number) => clipUrl(SLUG, numberClip(n));
const sentenceSrc = (id: keyof typeof NUMBER_SENTENCES) => clipUrl(SLUG, id);

const DIGIT_MEANINGS = [
  msg`zero`,
  msg`one`,
  msg`two`,
  msg`three`,
  msg`four`,
  msg`five`,
  msg`six`,
  msg`seven`,
  msg`eight`,
  msg`nine`,
  msg`ten`,
];

const GLOSSARY: Glossary = {
  ...Object.fromEntries(
    DIGIT_WORDS.map((word, n) => [
      word,
      { en: DIGIT_MEANINGS[n] as (typeof DIGIT_MEANINGS)[number], clip: numberClip(n) },
    ]),
  ),
  üksteist: { en: msg`eleven`, clip: numberClip(11) },
  kaksteist: { en: msg`twelve`, clip: numberClip(12) },
  kolmteist: { en: msg`thirteen`, clip: numberClip(13) },
  kakskümmend: { en: msg`twenty`, clip: numberClip(20) },
  "kakskümmend üks": { en: msg`twenty-one`, clip: numberClip(21) },
  sada: { en: msg`a hundred`, clip: numberClip(100) },
  kakssada: {
    en: msg`two hundred`,
    note: msg`Hundreds join into one word.`,
    clip: numberClip(200),
  },
  tuhat: { en: msg`a thousand`, clip: numberClip(1000) },
  "kaks tuhat": { en: msg`two thousand`, note: msg`Thousands stay a separate word.`, clip: false },
  "kolm kassi": {
    en: msg`three cats`,
    note: msg`Kassi is the partitive of kass, cat.`,
    clip: "c-kassid",
  },
  "kaksteist eurot": {
    en: msg`twelve euros`,
    note: msg`Eurot is the partitive of euro.`,
    clip: false,
  },
};

const SENTENCES: readonly {
  id: keyof typeof NUMBER_SENTENCES;
  answers: readonly string[];
  en: ReturnType<typeof msg>;
}[] = [
  { id: "c-kassid", answers: ["3"], en: msg`I have three cats.` },
  { id: "c-hind", answers: ["12"], en: msg`This costs twelve euros.` },
  { id: "c-vanus", answers: ["34"], en: msg`I’m 34 years old.` },
  { id: "c-korter", answers: ["16"], en: msg`My flat is number 16.` },
  { id: "c-aasta", answers: ["365"], en: msg`A year has 365 days.` },
  { id: "c-tund", answers: ["60"], en: msg`An hour has 60 minutes.` },
  { id: "c-klass", answers: ["22"], en: msg`There are 22 pupils in the class.` },
  { id: "c-telefon", answers: ["52094"], en: msg`My number is 5 2 0 9 4.` },
  { id: "c-kohv", answers: ["3.50", "3,50"], en: msg`Coffee costs €3.50.` },
];

type AlikeItem = ChoiceItem & { pair: readonly [string, string] };

export const alikeRun = (items: readonly AlikeItem[], pinned?: AlikeItem): AlikeItem[] =>
  eachPairFirst(items, pinned).map((item) =>
    item === pinned ? item : { ...item, options: shuffle(item.options) },
  );

const kindOf = (n: number) => (n < 20 ? "teen" : n % 10 === 0 ? "tens" : "both");

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);
const LEVELS = [
  { id: "ten", label: msg`0 to 10`, numbers: range(0, 10) },
  { id: "teens", label: msg`11 to 19`, numbers: range(11, 19) },
  {
    id: "tens",
    label: msg`20 to 100`,
    numbers: [20, 23, 30, 38, 40, 45, 50, 56, 60, 67, 70, 72, 80, 81, 90, 94, 99, 100],
  },
  {
    id: "big",
    label: msg`Big numbers`,
    numbers: [150, 200, 365, 999, 1000, 1918, 2026, 4500, 12000],
  },
] as const;

/** A number's words with -teist, -kümmend, sada and tuhat in the stage's hue. */
function Spoken({ n }: { n: number }) {
  return (
    <>
      {numberParts(n).map((part, i) =>
        part.ending ? (
          // oxlint-disable-next-line react/no-array-index-key -- a number's parts never reorder
          <span key={i} className="text-(--form)">
            {part.text}
          </span>
        ) : (
          // oxlint-disable-next-line react/no-array-index-key -- a number's parts never reorder
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

/** The digit's word over its ending, so the ending lines up key after key. */
function Stacked({ base, ending }: { base: string; ending: string }) {
  return (
    <span className="grid leading-tight">
      <span>{base}</span>
      <span className="text-(--form)">{ending}</span>
    </span>
  );
}

function HowItsBuilt({ n }: { n: number }) {
  const ones = DIGIT_WORDS[n % 10] ?? "";
  const tensWord = DIGIT_WORDS[Math.floor(n / 10)] ?? "";
  const digit = n - 10;
  const tens = Math.floor(n / 10);
  const teen = DIGIT_WORDS[digit] ?? "";
  const b = "font-medium text-(--form)";
  if (n <= 10) return <Trans>One of the eleven base words.</Trans>;
  if (n < 20)
    return (
      <Trans>
        Built from <b className={b}>{teen}</b> and -teist: {digit} in the second ten.
      </Trans>
    );
  if (n === 100) return <Trans>Sada alone, with no “one” in front.</Trans>;
  if (n % 10 === 0)
    return (
      <Trans>
        Built from <b className={b}>{tensWord}</b> and -kümmend: {tens} tens.
      </Trans>
    );
  return (
    <Trans>
      Built from <b className={b}>{tensWord}</b> and -kümmend: {tens} tens, then{" "}
      <b className={b}>{ones}</b> as a word of its own.
    </Trans>
  );
}

function Builder() {
  const { t } = useLingui();
  const [n, setN] = useState(47);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const set = (next: number, say: boolean) => {
    const value = Math.max(0, Math.min(100, next));
    setN(value);
    clearTimeout(timer.current);
    if (say) timer.current = setTimeout(() => void playSound(numberSrc(value)), 180);
  };
  const stepper =
    "edge-lift grid size-10 cursor-pointer place-items-center rounded-full bg-plate text-ink transition-[background-color,scale] duration-150 active:scale-[0.94] hoverable:hover:bg-plate-hover";
  return (
    <Panel className="gap-4.5 p-5.5">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4.5 max-sm:grid-cols-[minmax(0,1fr)_auto]">
        <output
          aria-live="polite"
          className="min-w-[2.2ch] text-end text-[clamp(3.5rem,11vw,5.5rem)] leading-[0.9] font-semibold tracking-[-0.04em] tabular-nums max-sm:col-span-full max-sm:text-start"
        >
          {n}
        </output>
        <div className="min-w-0">
          <p
            lang="et"
            className="text-[clamp(1.5rem,4vw,2rem)] leading-tight font-semibold tracking-tight wrap-anywhere"
          >
            <Spoken n={n} />
          </p>
          <p className="mt-1 text-md text-ink-secondary">
            <HowItsBuilt n={n} />
          </p>
        </div>
        <PlayButton src={numberSrc(n)} label={t`Play ${n}`} />
      </div>
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <button
          type="button"
          aria-label={t`One less`}
          className={stepper}
          onClick={() => set(n - 1, true)}
        >
          <Minus aria-hidden="true" className="size-4.5" />
        </button>
        <input
          type="range"
          min={0}
          max={100}
          value={n}
          aria-label={t`Number`}
          onChange={(event) => set(Number(event.target.value), false)}
          onPointerUp={(event) => set(Number(event.currentTarget.value), true)}
          onKeyUp={(event) => {
            if (/^(Arrow|Home|End|Page)/.test(event.key))
              set(Number(event.currentTarget.value), true);
          }}
          className="h-7 w-full cursor-pointer accent-(--form)"
        />
        <button
          type="button"
          aria-label={t`One more`}
          className={stepper}
          onClick={() => set(n + 1, true)}
        >
          <Plus aria-hidden="true" className="size-4.5" />
        </button>
      </div>
      <Chips
        label={t`Try`}
        items={[7, 12, 17, 20, 21, 47, 70, 99, 100].map((value) => ({
          label: String(value),
          value,
        }))}
        value={n}
        onPick={(value) => set(value, true)}
      />
    </Panel>
  );
}

export function NumbridLesson() {
  const { t, i18n } = useLingui();
  const partitive = lessonBySlug("osastav")?.n;
  const [level, setLevel] = useState(0);

  const teistItems = useMemo<ChoiceItem[]>(
    () =>
      range(2, 9).flatMap((d) => {
        const options = [10 + d, d * 10].map((v) => ({
          id: String(v),
          label: String(v),
          sub: numberWords(v),
        }));
        return options.map((option) => ({
          src: numberSrc(Number(option.id)),
          answer: option.id,
          options,
        }));
      }),
    [],
  );
  const alikeItems = useMemo<AlikeItem[]>(
    () =>
      NUMBER_ALIKE.flatMap((pair, i) =>
        pair.map((n, j) => {
          const options = pair.map((v) => ({
            id: String(v),
            label: String(v),
            sub: numberWords(v),
          }));
          return {
            src: numberSrc(n),
            answer: String(n),
            pair: [pair.join("-"), String(n)] as const,
            options: (i + j) % 2 ? [...options].reverse() : options,
          };
        }),
      ),
    [],
  );

  const writtenItems = useMemo<(FormItem & { pair: readonly [string, string] })[]>(
    () =>
      NUMBER_WRITTEN.map((n) => ({
        base: String(n),
        cue: t`in words`,
        answers: [numberWords(n)],
        src: numberSrc(n),
        pair: [kindOf(n), String(n)] as const,
      })),
    [t],
  );

  const passageQuestions = useMemo<PassageQuestion[]>(
    () => [
      {
        id: "age",
        ask: t`How old is Jaan?`,
        options: [
          { id: "22", label: "22" },
          { id: "32", label: "32" },
          { id: "42", label: "42" },
        ],
        answer: "32",
        line: 1,
      },
      {
        id: "flat",
        ask: t`What is his flat number?`,
        options: [
          { id: "8", label: "8" },
          { id: "80", label: "80" },
          { id: "18", label: "18" },
        ],
        answer: "18",
        line: 2,
      },
      {
        id: "phone",
        ask: t`What is his phone number?`,
        options: [
          { id: "56209", label: "5 6 2 0 9" },
          { id: "52609", label: "5 2 6 0 9" },
          { id: "56290", label: "5 6 2 9 0" },
        ],
        answer: "56209",
        line: 3,
      },
      {
        id: "cats",
        kind: "truefalse",
        ask: t`Jaan has six cats.`,
        answer: false,
        line: 4,
      },
      {
        id: "coffee",
        ask: t`What does the coffee cost?`,
        options: [
          { id: "250", label: "€2.50" },
          { id: "215", label: "€2.15" },
          { id: "1250", label: "€12.50" },
        ],
        answer: "250",
        line: 5,
      },
    ],
    [t],
  );

  const levelItems = useMemo(
    () =>
      LEVELS.map((each) =>
        each.numbers.map((n): TypedItem => ({
          src: numberSrc(n),
          answers: [String(n)],
          said: numberWords(n),
        })),
      ),
    [],
  );
  const wildItems = useMemo<TypedItem[]>(
    () =>
      SENTENCES.map((sentence) => ({
        src: sentenceSrc(sentence.id),
        answers: sentence.answers,
        said: (
          <>
            {NUMBER_SENTENCES[sentence.id]}
            <span lang={i18n.locale} className="block text-md text-ink-muted">
              {i18n._(sentence.en)}
            </span>
          </>
        ),
      })),
    [i18n],
  );
  const bigs = [100, 150, 200, 365, 999, 1000, 1918, 2026, 4500, 12000];
  const typedVerdict = (share: number): ReactNode =>
    share === 1 ? (
      <Trans>All of them, by ear.</Trans>
    ) : share >= 0.7 ? (
      <Trans>Most of them. Play the ones you missed once more.</Trans>
    ) : (
      <Trans>Play each number twice before you type.</Trans>
    );

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={<Trans>Numbers by ear. Eleven words and two endings take you to ninety-nine.</Trans>}
      facts={[
        <Trans key="m">15 minutes</Trans>,
        <Trans key="q">5 quizzes and a passage</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "null",
        "üks",
        "kaks",
        "kolm",
        "neli",
        "viis",
        "kuus",
        "seitse",
        "kaheksa",
        "üheksa",
        "kümme",
        "kaksteist",
        "kakskümmend",
        "sada",
        "tuhat",
      ]}
      recap={[
        <Trans key="1">
          Learn eleven words, <b lang="et">null</b> to <b lang="et">kümme</b>. Every number up to 99
          is built from them.
        </Trans>,
        <Trans key="2">
          The ending <b lang="et">-teist</b> makes eleven to nineteen, and <b lang="et">-kümmend</b>{" "}
          makes the tens.
        </Trans>,
        <Trans key="3">
          Tens and ones are separate words: <b lang="et">kakskümmend üks</b>.
        </Trans>,
        <Trans key="4">
          <b lang="et">Sada</b> and <b lang="et">tuhat</b> need no “one”. Hundreds join up;
          thousands stay separate.
        </Trans>,
      ]}
      sections={[
        {
          id: "ten",
          title: t`Zero to ten`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    These eleven words build every number up to 99. Tap each one. Two pairs sound
                    alike: <Word w="kaks" /> and <Word w="kuus" />, <Word w="kaheksa" /> and{" "}
                    <Word w="üheksa" />.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Keys
                  label={t`Zero to ten`}
                  columns={11}
                  phoneColumns={6}
                  items={DIGIT_WORDS.map((word, n) => ({
                    label: String(n),
                    sub: word,
                    src: numberSrc(n),
                    label2: `${n}, ${word}`,
                  }))}
                />
              </Panel>
            </>
          ),
        },
        {
          id: "teens",
          title: t`Eleven to nineteen: -teist`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Add <em>-teist</em> to a digit and you have eleven to nineteen:{" "}
                    <Word w="üksteist" />, <Word w="kaksteist" />, <Word w="kolmteist" />. Word for
                    word, üksteist is “one of the second ten”.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Keys
                  label={t`Eleven to nineteen`}
                  columns={9}
                  phoneColumns={5}
                  items={range(11, 19).map((n) => ({
                    label: String(n),
                    sub: <Stacked base={DIGIT_WORDS[n - 10] ?? ""} ending="teist" />,
                    src: numberSrc(n),
                    label2: `${n}, ${numberWords(n)}`,
                  }))}
                />
              </Panel>
            </>
          ),
        },
        {
          id: "tens",
          title: t`The tens: -kümmend`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    For the tens, add <em>-kümmend</em> to the digit: <Word w="kakskümmend" /> is
                    two tens, twenty.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Keys
                  label={t`The tens`}
                  columns={8}
                  phoneColumns={4}
                  items={range(2, 9).map((d) => ({
                    label: String(d * 10),
                    sub: <Stacked base={DIGIT_WORDS[d] ?? ""} ending="kümmend" />,
                    src: numberSrc(d * 10),
                    label2: `${d * 10}, ${numberWords(d * 10)}`,
                  }))}
                />
              </Panel>
            </>
          ),
        },
        {
          id: "build",
          title: t`Put them together`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    A digit after the tens is a word of its own: <Word w="kakskümmend üks" />,
                    twenty-one. Slide to any number and hear how it’s built.
                  </Trans>
                </p>
              </Prose>
              <Builder />
            </>
          ),
        },
        {
          id: "teist",
          title: t`-teist or -kümmend?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Kaksteist" /> is twelve and <Word w="kakskümmend" /> is twenty. Both
                    start with kaks, so listen to how the word ends.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="teist-kummend"
                title={<Trans>Which number did you hear?</Trans>}
                items={teistItems}
                rounds={8}
                both={(item) => item.options.map((option) => numberSrc(Number(option.id)))}
                recall={(item) => ({ label: item.answer, src: item.src })}
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "big",
          title: t`Hundreds and thousands`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Sada" /> is a hundred and <Word w="tuhat" /> a thousand, with no “one”
                    in front of either. Hundreds join into one word, <Word w="kakssada" />, but
                    thousands stay separate: <Word w="kaks tuhat" />.
                  </Trans>
                </p>
              </Prose>
              <ListenRows
                lead="96px"
                items={bigs.map((n) => ({
                  lead: n >= 10000 ? n.toLocaleString("et") : String(n),
                  main: <Spoken n={n} />,
                  src: numberSrc(n),
                }))}
              />
            </>
          ),
        },
        {
          id: "type",
          title: t`Type what you hear`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Pick a range, listen, and type the number in digits.</Trans>
                </p>
              </Prose>
              <Chips
                label={t`Range`}
                items={LEVELS.map((each, i) => ({ label: i18n._(each.label), value: i }))}
                value={level}
                onPick={setLevel}
              />
              <Quiz
                key={level}
                id={`typed-${LEVELS[level]?.id}`}
                title={<Trans>Type the number you hear</Trans>}
                items={levelItems[level] ?? []}
                rounds={6}
                verdict={typedVerdict}
                recall={(item) => ({ label: item.answers[0] ?? "", src: item.src })}
                round={(props) => <TypedRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "wild",
          title: t`Numbers in the wild`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Here each number comes inside a sentence: a price, an age, a phone number. Type
                    the number you hear.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The word after the number changes too: <Word w="kolm kassi" />,{" "}
                    <Word w="kaksteist eurot" />. That form is the partitive, which lesson{" "}
                    {partitive} explains. For now, listen for the number.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="sentences"
                title={<Trans>What number was in it?</Trans>}
                items={wildItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All of them, inside real sentences.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Play each sentence twice before you type.</Trans>
                  )
                }
                recall={(item) => ({ label: item.answers[0] ?? "", src: item.src })}
                round={(props) => <TypedRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "alike",
          title: t`Numbers that sound alike`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Kaks" /> has a short a and a k before the s; <Word w="kuus" /> has a
                    long uu. <Word w="Kaheksa" /> starts with ka, <Word w="üheksa" /> with ü. The
                    numbers built from them differ the same way. Listen, then pick.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="sound-alike"
                title={<Trans>Which number did you hear?</Trans>}
                items={alikeItems}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All of them, every pair told apart.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Tap zero to ten at the top once more, then try again.</Trans>
                  )
                }
                both={(item) => item.options.map((option) => numberSrc(Number(option.id)))}
                recall={(item) => ({ label: item.answer, src: item.src })}
                order={alikeRun}
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "words",
          title: t`Write the number in words`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Now the other way round: each round shows digits, and you type the words. Tens
                    and ones are two words: <Word w="kakskümmend üks" />.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="number-words"
                title={<Trans>Type it in words</Trans>}
                items={writtenItems}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All of them, every word spelled right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check -teist and -kümmend in the ones you missed.</Trans>
                  ) : (
                    <Trans>Move the slider in Put them together once more, then try again.</Trans>
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
          id: "listen",
          title: t`Listening: Jaan’s numbers`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Jaan says how old he is, his flat and phone numbers, how many cats he has and
                    what his coffee costs. Listen for each number.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="jaan-numbers"
                title={<Trans>Listen: Jaan’s numbers</Trans>}
                clip="p-jaan"
                sentences={NUMBER_PASSAGE}
                questions={passageQuestions}
              />
            </>
          ),
        },
      ]}
    />
  );
}
