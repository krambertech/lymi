import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Minus, Plus } from "lucide-react";
import { type ReactNode, useMemo, useRef, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  capital,
  clipId,
  clipUrl,
  JARGARVUD_CHAINS,
  JARGARVUD_DATES,
  JARGARVUD_FIX,
  JARGARVUD_HEARD,
  JARGARVUD_MAKE,
  JARGARVUD_MESSAGE,
  JARGARVUD_ON,
  JARGARVUD_ON_SENTENCES,
  JARGARVUD_TALK,
  JARGARVUD_TRANSLATE,
  JARGARVUD_WHICH,
  MONTH_DAYS,
  ordinalClip,
  ordinalOnClip,
} from "../../../lib/learn/clips";
import { numberWords } from "../../../lib/learn/estonian-numbers";
import {
  dateMatches,
  MONTHS,
  ordinalOn,
  ordinalParts,
  ordinalWords,
  writtenDate,
} from "../../../lib/learn/estonian-ordinals";
import { playSound } from "../../../lib/learn/player";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Chips, Keys, ListenRows, Panel } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Match, type MatchPair } from "../Match";
import { Morph, type MorphChain } from "../Morph";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { Listening, type PassageQuestion } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz, type TypedItem, TypedRound } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { PlayButton } from "../Sound";
import { Word } from "../Word";

const SLUG = "jargarvud";
const src = (text: string) => clipUrl(SLUG, clipId(text));
const ordinalSrc = (n: number) => clipUrl(SLUG, ordinalClip(n));

function End({ children }: { children: ReactNode }) {
  return (
    <span lang="et" className="whitespace-nowrap">
      -{children}
    </span>
  );
}

function Nowrap({ children }: { children: ReactNode }) {
  return <span className="whitespace-nowrap">{children}</span>;
}

const NUMBER_MEANS: Record<number, MessageDescriptor> = {
  3: msg`three`,
  4: msg`four`,
  5: msg`five`,
  6: msg`six`,
  7: msg`seven`,
  8: msg`eight`,
  9: msg`nine`,
  10: msg`ten`,
  11: msg`eleven`,
  20: msg`twenty`,
};

const ORDINAL_MEANS: Record<number, MessageDescriptor> = {
  1: msg`first`,
  2: msg`second`,
  3: msg`third`,
  4: msg`fourth`,
  5: msg`fifth`,
  6: msg`sixth`,
  7: msg`seventh`,
  8: msg`eighth`,
  9: msg`ninth`,
  10: msg`tenth`,
};

const MONTH_MEANS: readonly MessageDescriptor[] = [
  msg`January`,
  msg`February`,
  msg`March`,
  msg`April`,
  msg`May`,
  msg`June`,
  msg`July`,
  msg`August`,
  msg`September`,
  msg`October`,
  msg`November`,
  msg`December`,
];

const GLOSSARY: Glossary = {
  esimene: { en: msg`first`, clip: ordinalClip(1) },
  teine: { en: msg`second`, note: msg`Also “other”.`, clip: ordinalClip(2) },
  kolmas: { en: msg`third`, clip: ordinalClip(3) },
  neljas: { en: msg`fourth`, clip: ordinalClip(4) },
  seitsmes: { en: msg`seventh`, clip: ordinalClip(7) },
  kümnes: { en: msg`tenth`, clip: ordinalClip(10) },
  üheteistkümnes: { en: msg`eleventh`, clip: ordinalClip(11) },
  kahekümnes: { en: msg`twentieth`, clip: ordinalClip(20) },
  "kahekümne esimene": { en: msg`twenty-first`, clip: ordinalClip(21) },
  kolm: { en: msg`three` },
  kolme: { en: msg`of three`, note: msg`The genitive of kolm.` },
  neli: { en: msg`four` },
  nelja: { en: msg`of four`, note: msg`The genitive of neli.` },
  seitse: { en: msg`seven` },
  seitsme: { en: msg`of seven`, note: msg`The genitive of seitse.` },
  üksteist: { en: msg`eleven` },
  üheteistkümne: { en: msg`of eleven`, note: msg`The genitive of üksteist.` },
  kakskümmend: { en: msg`twenty` },
  kahekümne: { en: msg`of twenty`, note: msg`The genitive of kakskümmend.` },
  mitu: { en: msg`how many?` },
  mitmes: { en: msg`which one in order?` },
  mitmendal: {
    en: msg`on which one?`,
    note: msg`Mitmes with its -s turned into -ndal, as in kolmandal.`,
  },
  esmaspäev: { en: msg`Monday`, note: msg`The first day of the week.` },
  kuupäev: { en: msg`date`, note: msg`Kuu, month, and päev, day.` },
  "mis kuupäev täna on?": {
    en: msg`What’s the date today?`,
    show: "Mis kuupäev täna on?",
  },
  "mitmes täna on?": {
    en: msg`What’s the date today?`,
    note: msg`Word for word: “which one is it today?”`,
    show: "Mitmes täna on?",
  },
  "täna on kahekümne esimene november": {
    en: msg`Today is 21 November.`,
    show: "Täna on kahekümne esimene november.",
  },
  jaanuar: { en: msg`January` },
  juuni: { en: msg`June` },
  juuli: { en: msg`July` },
  november: { en: msg`November` },
  mai: { en: msg`May` },
  "viiendal mail": { en: msg`on the fifth of May` },
  viiendal: { en: msg`on the fifth`, clip: ordinalOnClip(5) },
  kolmandal: { en: msg`on the third`, clip: ordinalOnClip(3) },
  korrus: { en: msg`floor, storey` },
  "ma elan kolmandal korrusel": {
    en: msg`I live on the third floor.`,
    show: "Ma elan kolmandal korrusel.",
  },
  "mitmendal korrusel sa elad?": {
    en: msg`Which floor do you live on?`,
    show: "Mitmendal korrusel sa elad?",
  },
  sünnipäev: { en: msg`birthday`, note: msg`Sünd, birth, and päev, day.` },
  "aastal 2026": { en: msg`in 2026`, clip: "c-aastal" },
};

function Spoken({ n }: { n: number }) {
  return (
    <>
      {ordinalParts(n).map((part) =>
        part.ending ? (
          <span key={part.text} className="text-(--form)">
            {part.text}
          </span>
        ) : (
          <span key={part.text}>{part.text}</span>
        ),
      )}
    </>
  );
}

function HowItsBuilt({ n }: { n: number }) {
  const b = "font-medium text-(--form)";
  const [first] = ordinalParts(n);
  const stem = capital(first?.text.trim() ?? "");
  const tens = Math.floor(n / 10) * 10;
  const ones = n % 10;
  if (n <= 2) return <Trans>A word of its own.</Trans>;
  if (n === 3)
    return (
      <Trans>
        <b lang="et" className={b}>
          Kolm
        </b>{" "}
        with <End>as</End>.
      </Trans>
    );
  const number = numberWords(n);
  if (stem.toLowerCase() === number)
    return (
      <Trans>
        The genitive of <span lang="et">{number}</span> is the same word, so only <End>s</End> is
        new.
      </Trans>
    );
  if (n <= 20 || ones === 0)
    return (
      <Trans>
        <b lang="et" className={b}>
          {stem}
        </b>
        , the genitive of <span lang="et">{number}</span>, with <End>s</End>.
      </Trans>
    );
  const tensWord = numberWords(tens);
  const last = ordinalWords(ones);
  return (
    <Trans>
      <b lang="et" className={b}>
        {stem}
      </b>
      , the genitive of <span lang="et">{tensWord}</span>, then{" "}
      <b lang="et" className={b}>
        {last}
      </b>
      .
    </Trans>
  );
}

function DayBuilder() {
  const { t } = useLingui();
  const [n, setN] = useState(21);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const set = (next: number, say: boolean) => {
    const value = Math.max(1, Math.min(31, next));
    setN(value);
    clearTimeout(timer.current);
    if (say) timer.current = setTimeout(() => void playSound(ordinalSrc(value)), 180);
  };
  const stepper =
    "edge-lift grid size-10 cursor-pointer place-items-center rounded-full bg-plate text-ink transition-[background-color,scale] duration-150 active:scale-[0.94] hoverable:hover:bg-plate-hover";
  return (
    <Panel className="gap-4.5 p-5.5">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4.5 max-sm:grid-cols-[minmax(0,1fr)_auto]">
        <output
          aria-live="polite"
          className="min-w-[2.6ch] text-end text-[clamp(3.5rem,11vw,5.5rem)] leading-[0.9] font-semibold tracking-[-0.04em] tabular-nums max-sm:col-span-full max-sm:text-start"
        >
          {n}.
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
        <PlayButton src={ordinalSrc(n)} label={t`Play ${ordinalWords(n)}`} />
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
          min={1}
          max={31}
          value={n}
          aria-label={t`Day of the month`}
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
        items={[1, 2, 3, 11, 12, 20, 21, 23, 31].map((value) => ({
          label: `${value}.`,
          value,
        }))}
        value={n}
        onPick={(value) => set(value, true)}
      />
    </Panel>
  );
}

const FAMILIES: readonly (readonly number[])[] = [
  [1, 11, 21, 31],
  [2, 12, 22, 20],
  [3, 13, 23, 30],
  [4, 14, 24],
  [5, 15, 25],
  [7, 17, 27],
];

type DayItem = ChoiceItem & {
  n: number;
  family: readonly number[];
  pair: readonly [string, string];
};

const dayOption = (n: number) => ({ id: String(n), label: `${n}.` });

const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)] as T;

export function dayOptions(n: number, family: readonly number[]): number[] {
  const sibling = pick(family.filter((each) => each !== n));
  const other = pick(MONTH_DAYS.filter((each) => each !== n && each !== sibling));
  return shuffle([n, sibling, other]);
}

const FIRST_DAY = { n: 14, options: [24, 14, 4] } as const;

export function dayItems(explain: (n: number) => ReactNode): DayItem[] {
  const items = FAMILIES.flatMap((family, f) =>
    family.map((n, i): DayItem => {
      const siblings = family.filter((each) => each !== n);
      const three = [n, siblings[0] as number, siblings[1] as number];
      const turned =
        n === FIRST_DAY.n ? FIRST_DAY.options : [...three.slice(i % 3), ...three.slice(0, i % 3)];
      return {
        n,
        family,
        src: ordinalSrc(n),
        answer: String(n),
        options: turned.map(dayOption),
        pair: [String(f), String(n)] as const,
        explain: explain(n),
      };
    }),
  );
  return [
    ...items.filter((item) => item.n === FIRST_DAY.n),
    ...items.filter((item) => item.n !== FIRST_DAY.n),
  ];
}

export const dayRun = (items: readonly DayItem[], pinned?: DayItem): DayItem[] =>
  eachPairFirst(items, pinned).map((item) =>
    item === pinned ? item : { ...item, options: dayOptions(item.n, item.family).map(dayOption) },
  );

const HEARD_MEANS: Record<(typeof JARGARVUD_HEARD)[number]["said"], MessageDescriptor> = {
  "Täna on teine veebruar.": msg`Today is 2 February.`,
  "Homme on kolmeteistkümnes märts.": msg`Tomorrow is 13 March.`,
  "Jaan tuleb esimesel septembril.": msg`Jaan is coming on 1 September.`,
  "Pood on suletud kahekümne viiendal detsembril.": msg`The shop is closed on 25 December.`,
  "Ema sünnipäev on kaheteistkümnendal aprillil.": msg`Mum’s birthday is on 12 April.`,
  "Täna on kolmekümne esimene oktoober.": msg`Today is 31 October.`,
  "Eesti sünnipäev on kahekümne neljandal veebruaril.": msg`Estonia’s birthday, Independence Day, is on 24 February.`,
  "Ma lähen Tartusse kaheksandal juunil.": msg`I’m going to Tartu on 8 June.`,
  "Homme on kahekümnes juuli.": msg`Tomorrow is 20 July.`,
};

const DATE_MEANS: Record<(typeof JARGARVUD_DATES)[number], MessageDescriptor> = {
  "Mis kuupäev täna on?": msg`What’s the date today?`,
  "Mitmes täna on?": msg`The same question. Word for word: “which one is it today?”`,
  "Täna on kahekümne esimene november.": msg`Today is 21 November.`,
  "Homme on kahekümne teine november.": msg`Tomorrow is 22 November.`,
  "Täna on esimene jaanuar.": msg`Today is 1 January.`,
};
const DATE_LEADS: Record<(typeof JARGARVUD_DATES)[number], string> = {
  "Mis kuupäev täna on?": "?",
  "Mitmes täna on?": "?",
  "Täna on kahekümne esimene november.": "21.11",
  "Homme on kahekümne teine november.": "22.11",
  "Täna on esimene jaanuar.": "1.01",
};

const ON_MEANS: Record<(typeof JARGARVUD_ON_SENTENCES)[number], MessageDescriptor> = {
  "Minu sünnipäev on viiendal mail.": msg`My birthday is on the fifth of May.`,
  "Millal sinu sünnipäev on?": msg`When is your birthday?`,
  "Ma elan kolmandal korrusel.": msg`I live on the third floor.`,
  "Mitmendal korrusel sa elad?": msg`Which floor do you live on?`,
};

const WHICH_MEANS: Record<(typeof JARGARVUD_WHICH)[number]["said"], MessageDescriptor> = {
  "Täna on viies mai.": msg`Today is 5 May.`,
  "Minu sünnipäev on viiendal mail.": msg`My birthday is on 5 May.`,
  "Mul on kolm kassi.": msg`I have three cats.`,
  "Ma elan kolmandal korrusel.": msg`I live on the third floor.`,
  "Homme on esimene september.": msg`Tomorrow is 1 September.`,
  "Jaan tuleb esimesel septembril.": msg`Jaan is coming on 1 September.`,
  "Mul on kaks last.": msg`I have two children.`,
  "Täna on teine aprill.": msg`Today is 2 April.`,
  "Raamat maksab kümme eurot.": msg`The book costs ten euros.`,
};

const TRANSLATE_PROMPTS: Record<(typeof JARGARVUD_TRANSLATE)[number]["id"], MessageDescriptor> = {
  "teine-mai": msg`Today is 2 May.`,
  kumnes: msg`Tomorrow is the tenth.`,
  "kolmandal-juunil": msg`My birthday is on 3 June.`,
  "neljandal-korrusel": msg`I live on the fourth floor.`,
  "esimesel-martsil": msg`Jaan is coming on 1 March.`,
  "mis-kuupaev": msg`What’s the date today?`,
};

type WhichItem = FormItem & {
  pair: readonly [string, string];
  options: readonly string[];
};

export const whichRun = (items: readonly WhichItem[], pinned?: WhichItem): WhichItem[] =>
  eachPairFirst(items, pinned).map((item) =>
    item === pinned ? item : { ...item, options: shuffle([...item.options]) },
  );

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const keys = MONTH_DAYS.slice(0, 10).map((n) => ({
      label: `${n}.`,
      sub: <Spoken n={n} />,
      src: ordinalSrc(n),
      label2: `${n}., ${ordinalWords(n)}`,
      detail: {
        title: (
          <>
            <span lang="et">{ordinalWords(n)}</span>{" "}
            <small className="ms-1 text-md font-normal text-ink-secondary">
              {i18n._(ORDINAL_MEANS[n] as MessageDescriptor)}
            </small>
          </>
        ),
        tip: keyTip(n, i18n),
      },
    }));

    const chains: MorphChain[] = JARGARVUD_CHAINS.map(({ n, genitive }) => {
      const number = numberWords(n);
      const steps = [
        { word: number, label: i18n._(NUMBER_MEANS[n] as MessageDescriptor), src: src(number) },
        ...(genitive === number
          ? []
          : [
              {
                word: genitive,
                label: t`the genitive`,
                src: src(genitive),
                note: (
                  <Trans>
                    The genitive, the form for “of”: <b lang="et">{genitive}</b>.
                  </Trans>
                ),
              },
            ]),
        {
          word: ordinalWords(n),
          label: i18n._(ORDINAL_MEANS[n] as MessageDescriptor),
          src: ordinalSrc(n),
          note:
            n === 3 ? (
              <Trans>
                Not <b lang="et">kolmes</b>: third has an a where the genitive has an e.
              </Trans>
            ) : genitive === number ? (
              <Trans>
                The genitive of <b lang="et">{number}</b> is the same word, so only <End>s</End> is
                new.
              </Trans>
            ) : (
              <Trans>
                The genitive with <End>s</End>.
              </Trans>
            ),
        },
      ];
      return { id: number, steps };
    });

    const make: FormItem[] = JARGARVUD_MAKE.map((n) => {
      const number = numberWords(n);
      const ordinal = ordinalWords(n);
      const stem = capital(ordinalParts(n)[0]?.text ?? "");
      return {
        base: number,
        gloss: i18n._(NUMBER_MEANS[n] as MessageDescriptor),
        cue: t`Which one in order?`,
        answers: [ordinal],
        src: ordinalSrc(n),
        explain:
          n === 3 ? (
            <Trans>
              <span lang="et">Kolm</span> is the exception: <b lang="et">kolmas</b>, with{" "}
              <End>as</End>.
            </Trans>
          ) : stem.toLowerCase() === number ? (
            <Trans>
              The genitive of <span lang="et">{number}</span> is the same word, so only <End>s</End>{" "}
              is new.
            </Trans>
          ) : (
            <Trans>
              <b lang="et">{stem}</b>, the genitive of <span lang="et">{number}</span>, with{" "}
              <End>s</End>.
            </Trans>
          ),
      };
    });

    const days = dayItems((n) => (
      <>
        <span lang="et" className="font-medium text-ink">
          <Spoken n={n} />
        </span>{" "}
        {n}.
      </>
    ));

    const onRows: ParadigmRow[] = JARGARVUD_ON.map((n) => {
      const word = ordinalWords(n);
      const on = ordinalOn(n);
      const special = word.endsWith("esimene") || word.endsWith("teine");
      const cut = special ? word.length - 2 : word.length - 1;
      const onCut = special ? on.length - 3 : on.length - 4;
      return {
        id: String(n),
        label: `${n}.`,
        tip:
          n > 20 ? (
            <Trans>Only the last word changes; the tens stay as they are.</Trans>
          ) : special ? (
            <Trans>
              The final <End>ne</End> turns into <End>sel</End>.
            </Trans>
          ) : (
            <Trans>
              The final <End>s</End> turns into <End>ndal</End>.
            </Trans>
          ),
        cells: [
          { form: `${word.slice(0, cut)}|${word.slice(cut)}`, src: ordinalSrc(n) },
          {
            form: `${on.slice(0, onCut)}|${on.slice(onCut)}`,
            src: clipUrl(SLUG, ordinalOnClip(n)),
          },
        ],
      };
    });

    const pairs: MatchPair[] = [
      { id: "kolm", left: "kolm", right: t`three`, src: src("kolm") },
      { id: "kolmas", left: "kolmas", right: t`third`, src: ordinalSrc(3) },
      {
        id: "kolmandal",
        left: "kolmandal",
        right: t({ message: "on the third", context: "date" }),
        src: clipUrl(SLUG, ordinalOnClip(3)),
      },
      { id: "mitu", left: "mitu?", right: t`how many?`, src: src("mitu") },
      { id: "mitmes", left: "mitmes?", right: t`which one in order?`, src: src("mitmes") },
      { id: "mitmendal", left: "mitmendal?", right: t`on which one?`, src: src("mitmendal") },
    ];

    const heard: TypedItem[] = JARGARVUD_HEARD.map(({ said, day, month }) => ({
      src: src(said),
      answers: [writtenDate(day, month)],
      matches: (typed: string) => dateMatches(typed, day, month),
      prompt: t`Type the date`,
      said: (
        <>
          {said}
          <span lang={i18n.locale} className="block text-md text-ink-muted">
            {i18n._(HEARD_MEANS[said])}
          </span>
        </>
      ),
    }));

    const message: PassageQuestion[] = [
      {
        id: "kati",
        ask: t`When is Liisa’s birthday?`,
        options: [
          { id: "13-march", label: t`On 13 March` },
          { id: "13-may", label: t`On 13 May` },
          { id: "23-march", label: t`On 23 March` },
        ],
        answer: "23-march",
        line: 0,
      },
      {
        id: "floor",
        ask: t`Which floor is Liisa’s flat on?`,
        options: [
          { id: "fourth", label: t`The fourth` },
          { id: "fifth", label: t`The fifth` },
          { id: "eleventh", label: t`The eleventh` },
        ],
        answer: "fourth",
        line: 2,
      },
      {
        id: "mari",
        ask: t`When is Peeter coming?`,
        options: [
          { id: "half-six", label: t`At half past six` },
          { id: "seven", label: t`At seven` },
          { id: "sunday", label: t`On Sunday` },
        ],
        answer: "seven",
        line: 3,
      },
      {
        id: "mari-birthday",
        ask: t`When is Peeter’s birthday?`,
        options: [
          { id: "13-may", label: t`On 13 May` },
          { id: "31-march", label: t`On 31 March` },
          { id: "30-may", label: t`On 30 May` },
        ],
        answer: "31-march",
        line: 4,
      },
    ];

    const whichWhy = {
      count: (
        <Trans>
          No full stop: a plain number that answers <b lang="et">mitu?</b>, how many.
        </Trans>
      ),
      which: (
        <Trans>
          The full stop makes it an ordinal, and after <b lang="et">on</b>, is, the date has no
          ending.
        </Trans>
      ),
      on: (
        <Trans>
          On a day or a floor: the ordinal ends in <End>l</End>, as the word after it does.
        </Trans>
      ),
    };
    const which: WhichItem[] = JARGARVUD_WHICH.map(
      ({ id, way, base, cue, answer, said, options }, i) => {
        const turn = i === 0 ? 2 : i % 3;
        return {
          base,
          cue,
          cueLang: "et",
          answers: [answer],
          options: [...options.slice(turn), ...options.slice(0, turn)],
          src: src(said),
          said: (
            <>
              <span lang="et">{said}</span> {i18n._(WHICH_MEANS[said])}
            </>
          ),
          pair: [way, id] as const,
          explain: whichWhy[way],
        };
      },
    );

    const translateWhy: Record<(typeof JARGARVUD_TRANSLATE)[number]["id"], ReactNode> = {
      "teine-mai": (
        <Trans>
          After <b lang="et">on</b>, is, the date has no ending.
        </Trans>
      ),
      kumnes: (
        <Trans>
          The tenth is <b lang="et">kümnes</b>, the genitive <b lang="et">kümne</b> with{" "}
          <End>s</End>.
        </Trans>
      ),
      "kolmandal-juunil": (
        <Trans>
          On a date, both words end in <End>l</End>: <b lang="et">kolmandal juunil</b>.
        </Trans>
      ),
      "neljandal-korrusel": (
        <Trans>
          On a floor, both words end in <End>l</End>: <b lang="et">neljandal korrusel</b>.
        </Trans>
      ),
      "esimesel-martsil": (
        <Trans>
          <b lang="et">Esimene</b> swaps <End>ne</End> for <End>sel</End>, and{" "}
          <b lang="et">märts</b> becomes <b lang="et">märtsil</b>: <b lang="et">esimesel märtsil</b>
          .
        </Trans>
      ),
      "mis-kuupaev": (
        <Trans>
          <b lang="et">Mitmes täna on?</b> asks the same.
        </Trans>
      ),
    };
    const sentences: SentenceItem[] = JARGARVUD_TRANSLATE.map(({ id, answers }) => ({
      kind: "translate",
      id,
      prompt: i18n._(TRANSLATE_PROMPTS[id]),
      answers,
      src: src(answers[0]),
      explain: translateWhy[id],
    }));

    const fixWhy: Record<(typeof JARGARVUD_FIX)[number]["id"], ReactNode> = {
      "fix-viies": (
        <Trans>
          A date is an ordinal: <b lang="et">viies mai</b>, not the number <b lang="et">viis</b>.
        </Trans>
      ),
      "fix-viiendal": (
        <Trans>
          The month has <End>l</End>, so the ordinal takes it too: <b lang="et">viiendal mail</b>.
        </Trans>
      ),
      "fix-kolmas": (
        <Trans>
          Third is <b lang="et">kolmas</b>, with an a, though the genitive of three is{" "}
          <b lang="et">kolme</b>.
        </Trans>
      ),
      "fix-esimesel": (
        <Trans>
          On the first: <b lang="et">esimesel</b>, with <End>l</End> like the month.
        </Trans>
      ),
      "fix-kahekumne": (
        <Trans>
          Only the last word is an ordinal. The tens stay in the genitive:{" "}
          <b lang="et">kahekümne</b>.
        </Trans>
      ),
      "fix-korrusel": (
        <Trans>
          Both words take <End>l</End>: <b lang="et">neljandal korrusel</b>.
        </Trans>
      ),
    };
    const fix: FixItem[] = JARGARVUD_FIX.map(({ id, wrong, answers }) => ({
      kind: "fix",
      id,
      wrong,
      answers,
      src: src(answers[0]),
      explain: fixWhy[id],
    }));

    const talk: PassageQuestion[] = [
      {
        id: "today",
        kind: "short",
        ask: t`What is the date today? Write the day as Jaan says it.`,
        answers: ["kahekümne kolmas", "23."],
        line: 3,
      },
      {
        id: "kati",
        kind: "truefalse",
        ask: t`Kati’s birthday is tomorrow.`,
        answer: true,
        line: 5,
      },
      {
        id: "cafe",
        kind: "truefalse",
        ask: t`On Saturday they are going to a café with Kati.`,
        answer: true,
        line: 8,
      },
      {
        id: "floor",
        ask: t`Which floor is the café on?`,
        options: [
          { id: "fourth", label: t`The fourth` },
          { id: "fifth", label: t`The fifth` },
          { id: "second", label: t`The second` },
        ],
        answer: "second",
        line: 9,
      },
      {
        id: "time",
        ask: t`What time are they meeting?`,
        options: [
          { id: "six", label: t`At six` },
          { id: "five", label: t`At five` },
          { id: "two", label: t`At two` },
        ],
        answer: "six",
        line: 12,
      },
      {
        id: "peeter",
        ask: t`When is Peeter coming to Tallinn?`,
        options: [
          { id: "11-february", label: t`On 11 February` },
          { id: "11-december", label: t`On 11 December` },
          { id: "1-december", label: t`On 1 December` },
        ],
        answer: "1-december",
        line: 17,
      },
      {
        id: "mari",
        ask: t`When is Mari’s birthday?`,
        options: [
          { id: "12-january", label: t`On 12 January` },
          { id: "21-january", label: t`On 21 January` },
          { id: "21-july", label: t`On 21 July` },
        ],
        answer: "12-january",
        line: 24,
      },
      {
        id: "mother",
        kind: "truefalse",
        ask: t`Mari’s mother has her birthday on the same day as Mari.`,
        answer: false,
        line: 25,
      },
      {
        id: "home",
        kind: "short",
        ask: t`Which floor does Jaan live on? Write it as he says it.`,
        answers: ["seitsmendal", "seitsmes"],
        line: 29,
      },
    ];

    return { keys, chains, make, days, onRows, pairs, heard, message, which, sentences, fix, talk };
  }, [t, i18n]);
}

function keyTip(n: number, i18n: I18n): ReactNode {
  if (n === 1)
    return (
      <Trans>
        A word of its own, not built from <span lang="et">üks</span>.
      </Trans>
    );
  if (n === 2)
    return (
      <Trans>
        A word of its own, not built from <span lang="et">kaks</span>. It also means “other”.
      </Trans>
    );
  const number = numberWords(n);
  const means = i18n._(NUMBER_MEANS[n] as MessageDescriptor);
  return (
    <Trans>
      From <span lang="et">{number}</span>, {means}.
    </Trans>
  );
}

export function JargarvudLesson() {
  const { t, i18n } = useLingui();
  const content = useContent();
  const numbers = lessonBySlug("numbrid")?.n;
  const days = lessonBySlug("paevad")?.n;
  const genitive = lessonBySlug("omastav")?.n;
  const partitive = lessonBySlug("osastav")?.n;
  const when = lessonBySlug("millal")?.n;

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          From four on, an ordinal is the number’s genitive with <End>s</End>. A date is an ordinal
          and a month, and to say on which day, both words end in <End>l</End>:{" "}
          <span lang="et">viiendal mail</span>.
        </Trans>
      }
      facts={[
        <Trans key="m">20 minutes</Trans>,
        <Trans key="q">8 exercises, 4 of them typed, and a conversation</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "esimene",
        "teine",
        "kolmas",
        "neljas",
        "kümnes",
        "kahekümne esimene",
        "mitmes",
        "kuupäev",
        "jaanuar",
        "mai",
        "november",
        "viiendal mail",
        "korrus",
        "sünnipäev",
      ]}
      recap={[
        <Trans key="1">
          <b lang="et">Esimene</b> and <b lang="et">teine</b> are words of their own, and{" "}
          <b lang="et">kolmas</b> is <b lang="et">kolm</b> with <End>as</End>. From four on, an
          ordinal is the number’s genitive with <End>s</End>: <b lang="et">neli, nelja, neljas</b>.
        </Trans>,
        <Trans key="2">
          In a number of two words only the last is an ordinal, and the tens stay in the genitive:{" "}
          <b lang="et">kahekümne esimene</b>.
        </Trans>,
        <Trans key="3">
          A date is an ordinal and a month, and the month takes a small letter. The full stop after
          the numeral makes it an ordinal: <b lang="et">21. november</b>, said{" "}
          <b lang="et">kahekümne esimene november</b>.
        </Trans>,
        <Trans key="4">
          To say on which day or on which floor, both words end in <End>l</End>. The ordinal’s{" "}
          <End>s</End> turns into <End>ndal</End>, or <End>ne</End> into <End>sel</End> for{" "}
          <b lang="et">esimene</b> and <b lang="et">teine</b>, and the month or{" "}
          <b lang="et">korrus</b> adds <End>l</End>, <End>il</End> or <End>el</End>:{" "}
          <b lang="et">viiendal mail</b>, <b lang="et">esimesel märtsil</b>,{" "}
          <b lang="et">kolmandal korrusel</b>.
        </Trans>,
        <Trans key="5">
          <b lang="et">Mitu?</b> asks how many; <b lang="et">mitmes?</b> asks which one in order.
        </Trans>,
      ]}
      sections={[
        {
          id: "first",
          title: t`First, second, third`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In lesson {days}, <Word w="esmaspäev" />, Monday, the first day, sounds like{" "}
                    <Word w="esimene" />, first, and <b lang="et">teisipäev</b>, Tuesday, the second
                    day, like <Word w="teine" />, second. Words like these are ordinals. They say
                    which one in order, where the numbers from lesson {numbers} say how many.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Written in digits, an ordinal takes a full stop: 1. is first, 2. is second. Tap
                    a number to hear its ordinal.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Keys
                  label={t`First to tenth`}
                  columns={10}
                  phoneColumns={5}
                  items={content.keys}
                  empty={{
                    title: t`Tap a number`,
                    tip: t`You’ll hear its ordinal and see where it comes from.`,
                  }}
                />
              </Panel>
            </>
          ),
        },
        {
          id: "genitive",
          title: t`From four on: the genitive and -s`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    From four on, an ordinal is built on the genitive, the form lesson {genitive}{" "}
                    uses for “of”. Take <Word w="neli" />, four. Its genitive is <Word w="nelja" />,
                    and with <End>s</End> it becomes{" "}
                    <Nowrap>
                      <Word w="neljas" />,
                    </Nowrap>{" "}
                    fourth. In the same way <Word w="seitse" /> goes to <Word w="seitsme" /> and{" "}
                    <Nowrap>
                      <Word w="seitsmes" />.
                    </Nowrap>
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Three is built differently. <Word w="Kolm" /> has the genitive{" "}
                    <Word w="kolme" />, but third is <Word w="kolmas" />, with an a. Pick a number
                    and tap its forms to see what changes.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Morph label={t`Numbers`} chains={content.chains} />
              </Panel>
              <Prose>
                <p>
                  <Trans>Type the ordinal of each number.</Trans>
                </p>
              </Prose>
              <Quiz
                id="make-the-ordinal"
                title={<Trans>Number to ordinal</Trans>}
                items={content.make}
                rounds={JARGARVUD_MAKE.length}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six ordinals.</Trans>
                  ) : share >= 0.6 ? (
                    <Trans>Most of them. Tap the numbers above once more.</Trans>
                  ) : (
                    <Trans>Go back to the numbers above, then try again.</Trans>
                  )
                }
                recall={formRecall}
                round={(props) => <FormRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "bigger",
          title: t`Eleventh to thirty-first`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Bigger numbers follow the same rule. The genitive of <Word w="üksteist" /> is{" "}
                    <Word w="üheteistkümne" />, so eleventh is{" "}
                    <Nowrap>
                      <Word w="üheteistkümnes" />.
                    </Nowrap>{" "}
                    The genitive of <Word w="kakskümmend" /> is <Word w="kahekümne" />, so twentieth
                    is{" "}
                    <Nowrap>
                      <Word w="kahekümnes" />.
                    </Nowrap>
                  </Trans>
                </p>
                <p>
                  <Trans>
                    In a number of two words, only the last becomes an ordinal. The tens before it
                    go into the genitive:{" "}
                    <Nowrap>
                      <Word w="kahekümne esimene" />,
                    </Nowrap>{" "}
                    twenty-first. Slide to a day, or tap − and +, to hear it.
                  </Trans>
                </p>
              </Prose>
              <DayBuilder />
              <Prose>
                <p>
                  <Trans>
                    <b lang="et">Neljas</b>, <b lang="et">neljateistkümnes</b> and{" "}
                    <b lang="et">kahekümne neljas</b> all start from <b lang="et">nelja</b>. Listen
                    for <End>teistkümnes</End>, <b lang="et">kahekümne</b> or{" "}
                    <b lang="et">kolmekümne</b>, then pick the day.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="which-day"
                title={<Trans>Which day did you hear?</Trans>}
                items={content.days}
                rounds={FAMILIES.length}
                both={(item) => item.options.map((option) => ordinalSrc(Number(option.id)))}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six, by ear.</Trans>
                  ) : share >= 0.6 ? (
                    <Trans>Most of them. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Slide through the days above once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: `${item.answer}.`, src: item.src })}
                order={dayRun}
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "months",
          title: t`The months`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Estonian writes the months with a small letter, as it writes the days:{" "}
                    <Word w="jaanuar" />, <Word w="mai" />,{" "}
                    <Nowrap>
                      <Word w="november" />.
                    </Nowrap>{" "}
                    <Word w="Juuni" /> and <Word w="juuli" /> differ in one sound,{" "}
                    <b lang="et">n</b> or <b lang="et">l</b>.
                  </Trans>
                </p>
                <p>
                  <Trans>Tap a month to hear it. Its number is its place in the year.</Trans>
                </p>
              </Prose>
              <Panel>
                <Keys
                  label={t`The months`}
                  columns={6}
                  phoneColumns={4}
                  items={MONTHS.map(({ name }, i) => ({
                    label: String(i + 1),
                    sub: name,
                    src: src(name),
                    label2: `${i + 1}, ${name}, ${i18n._(MONTH_MEANS[i] as MessageDescriptor)}`,
                  }))}
                />
              </Panel>
            </>
          ),
        },
        {
          id: "date",
          title: t`Today’s date`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    To ask the date, say <Word w="Mis kuupäev täna on?" /> <Word w="Kuupäev" />{" "}
                    means date. The answer is an ordinal and a month:{" "}
                    <Nowrap>
                      <Word w="Täna on kahekümne esimene november" />.
                    </Nowrap>
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Written, the day is a numeral with a full stop: <b lang="et">21. november</b>.
                    The full stop makes the number an ordinal, so you read it as{" "}
                    <b lang="et">kahekümne esimene</b>. In digits the date is 21.11.
                  </Trans>
                </p>
              </Prose>
              <ListenRows
                lead="56px"
                items={JARGARVUD_DATES.map((said) => ({
                  lead: DATE_LEADS[said],
                  main: said,
                  sub: i18n._(DATE_MEANS[said]),
                  src: src(said),
                }))}
              />
              <Prose>
                <p>
                  <Trans>
                    <Word w="Mitmes" /> asks which one in order, and its answer is an ordinal.{" "}
                    <Word w="Mitu" />, from lesson {partitive}, asks how many, and its answer is a
                    plain number. <b lang="et">Mitmes</b> is built like <b lang="et">neljas</b>:{" "}
                    <b lang="et">mitu, mitme, mitmes</b>.
                  </Trans>
                </p>
              </Prose>
              <Aside>
                <Trans>
                  After <b lang="et">aastal</b>, the year is a plain number:{" "}
                  <Word w="aastal 2026" />, in 2026, is said{" "}
                  <b lang="et">aastal kaks tuhat kakskümmend kuus</b>. Before{" "}
                  <b lang="et">aastal</b> it takes a full stop and is an ordinal:{" "}
                  <b lang="et">2026. aastal</b>, said{" "}
                  <b lang="et">kahe tuhande kahekümne kuuendal aastal</b>.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "on-a-date",
          title: t`On the fifth of May`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    To say on which day, both words end in <End>l</End>:{" "}
                    <Nowrap>
                      <Word w="viiendal mail" />,
                    </Nowrap>{" "}
                    on the fifth of May. In the ordinal, the final <End>s</End> turns into{" "}
                    <End>ndal</End>: <b lang="et">viies</b>, <Word w="viiendal" />;{" "}
                    <b lang="et">kolmas</b>,{" "}
                    <Nowrap>
                      <Word w="kolmandal" />.
                    </Nowrap>{" "}
                    <b lang="et">Esimene</b> and <b lang="et">teine</b> swap <End>ne</End> for{" "}
                    <End>sel</End>: <b lang="et">esimesel, teisel</b>.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The same <End>l</End> says on which floor, and <b lang="et">korrus</b> becomes{" "}
                    <b lang="et">korrusel</b>:{" "}
                    <Nowrap>
                      <Word w="Ma elan kolmandal korrusel" />.
                    </Nowrap>{" "}
                    To ask, use <Word w="mitmendal" />: <Word w="Mitmendal korrusel sa elad?" />{" "}
                    <Word w="Korrus" /> is a floor, and <Word w="sünnipäev" /> a birthday.
                  </Trans>
                </p>
              </Prose>
              <Aside>
                <Trans>
                  <b lang="et">Mai</b>, <b lang="et">juuni</b> and <b lang="et">juuli</b> end in a
                  vowel and add <End>l</End>: <b lang="et">mail</b>. The other months add{" "}
                  <End>il</End>: <b lang="et">märtsil</b>, <b lang="et">aprillil</b>. September to
                  December drop their e first: <b lang="et">septembril</b>,{" "}
                  <b lang="et">novembril</b>.
                </Trans>
              </Aside>
              <Panel>
                <Paradigm
                  label={t`Ordinals without and with -l`}
                  columns={[t`Which one`, t`On which one`]}
                  rows={content.onRows}
                  highlight={{ column: 1 }}
                  empty={{
                    title: t`Tap a form`,
                    tip: t`You’ll hear it and see what changes.`,
                  }}
                />
              </Panel>
              <ListenRows
                items={JARGARVUD_ON_SENTENCES.map((said) => ({
                  main: said,
                  sub: i18n._(ON_MEANS[said]),
                  src: src(said),
                }))}
              />
              <Prose>
                <p>
                  <Trans>Match each word with its meaning.</Trans>
                </p>
              </Prose>
              <Match
                id="how-many-which"
                title={<Trans>How many, which one, on which one</Trans>}
                pairs={content.pairs}
              />
            </>
          ),
        },
        {
          id: "which-form",
          title: t`Five, fifth, on the fifth`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    A number in a sentence can be said three ways. Without a full stop, a number
                    says how many: <b lang="et">Mul on 3 kassi</b> is said{" "}
                    <b lang="et">kolm kassi</b>, I have three cats. With a full stop it is an
                    ordinal: <b lang="et">Täna on 5. mai</b> is said <b lang="et">viies mai</b>.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    To say on which day or floor, the month or <b lang="et">korrus</b> ends in{" "}
                    <End>l</End>, and so does the ordinal: <b lang="et">5. mail</b> is said{" "}
                    <b lang="et">viiendal mail</b>.
                  </Trans>
                </p>
              </Prose>
              <Prose>
                <p>
                  <Trans>Pick how to say the number in each sentence.</Trans>
                </p>
              </Prose>
              <Quiz
                id="five-fifth-on-the-fifth"
                title={<Trans>How do you say it?</Trans>}
                items={content.which}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All of them: how many, which one and on which one.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>
                      Nearly. Look for the full stop first, then for <End>l</End> on the word after
                      the gap.
                    </Trans>
                  ) : (
                    <Trans>Tap the forms in the table above once more, then try again.</Trans>
                  )
                }
                recall={formRecall}
                order={whichRun}
                round={(props) => <FormRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "dates-heard",
          title: t`Dates by ear`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each sentence has a date in it, in its plain form or with <End>l</End>. Type the
                    date you hear. You can type digits, 5.5 for the fifth of May, or the month in
                    words, as in <b lang="et">5. mai</b> or 5 May.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="type-the-date"
                title={<Trans>Type the date you hear</Trans>}
                items={content.heard}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six dates, inside sentences.</Trans>
                  ) : share >= 0.6 ? (
                    <Trans>Most of them. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Play each sentence twice before you type.</Trans>
                  )
                }
                recall={(item) => ({ label: item.answers[0] ?? "", src: item.src })}
                round={(props) => <TypedRound {...props} />}
              />
              {when && (
                <Aside>
                  <Trans>
                    To say in May, or from one date to another, Estonian uses other endings; lesson{" "}
                    {when} teaches them.
                  </Trans>
                </Aside>
              )}
            </>
          ),
        },
        {
          id: "write-dates",
          title: t`Write the date`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Now write each sentence in Estonian, with the numbers in words. Ask yourself
                    first whether it says which day or on which day.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="write-the-date"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.sentences}
                rounds={content.sentences.length}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six sentences, every ordinal in the right form.</Trans>
                  ) : share >= 0.6 ? (
                    <Trans>
                      Most of them. Check which sentences say on which day: those need <End>l</End>.
                    </Trans>
                  ) : (
                    <Trans>Read “On the fifth of May” above once more, then try again.</Trans>
                  )
                }
                recall={sentenceRecall}
                round={(props) => <SentenceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "mistakes",
          title: t`Six mistakes to catch`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each sentence has one wrong word in a date, a number or a floor. Tap it, then
                    type it right.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-the-date"
                title={<Trans>Fix the sentence</Trans>}
                items={content.fix}
                rounds={content.fix.length}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six found and fixed.</Trans>
                  ) : share >= 0.6 ? (
                    <Trans>Most of them. Read why each one you missed is wrong.</Trans>
                  ) : (
                    <Trans>Go back to “Five, fifth, on the fifth” above, then try again.</Trans>
                  )
                }
                recall={fixRecall}
                round={(props) => <FixRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "message",
          title: t`Liisa’s birthday`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Your friend Liisa leaves you a voice message about her birthday. Listen, then
                    answer.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="kati-birthday"
                title={<Trans>Listen: when and where?</Trans>}
                clip="p-message"
                sentences={JARGARVUD_MESSAGE}
                questions={content.message}
              />
            </>
          ),
        },
        {
          id: "talk",
          title: t`Birthdays and floors`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari and Jaan talk about birthdays and where they live. Read the questions, then
                    listen. As in the exam, the conversation plays twice and doesn’t stop.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="birthdays-and-floors"
                title={<Trans>Listen: Mari and Jaan</Trans>}
                clip="c-talk"
                turns={JARGARVUD_TALK.turns}
                names={{ main: t`Jaan`, second: t`Mari` }}
                questions={content.talk}
                plays={2}
              />
            </>
          ),
        },
      ]}
    />
  );
}
