import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { ArrowRight } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  commandTo,
  KASKIV_CLASS,
  KASKIV_DIALOGUE,
  KASKIV_EVERYDAY,
  KASKIV_FLIP,
  KASKIV_HEARD,
  KASKIV_MORE,
  KASKIV_STEMS,
  KASKIV_TURNED,
  notSentence,
} from "../../../lib/learn/clips";
import { playSound, usePlaying } from "../../../lib/learn/player";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { Chips, ListenRows, Panel } from "../Explore";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Listening, type PassageQuestion } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { type SortBin, type SortItem, Sort } from "../Sort";
import { Playing } from "../Sound";
import { Word } from "../Word";

const SLUG = "kaskiv";
/** A clip by what it says. */
const src = (text: string) => clipUrl(SLUG, clipId(text));

/** What each command and sentence means, by what it says. */
const MEANS: Record<string, MessageDescriptor> = {
  "Istu!": msg`Sit down.`,
  "Tule siia!": msg`Come here.`,
  "Oota!": msg`Wait.`,
  "Kuula!": msg`Listen.`,
  "Vaata!": msg`Look.`,
  "Räägi aeglasemalt, palun.": msg`Speak more slowly, please.`,
  "Loe!": msg`Read.`,
  "Räägi!": msg`Speak.`,
  "Söö!": msg`Eat.`,
  "Joo!": msg`Drink.`,
  "Õpi!": msg`Study.`,
  "Ära istu!": msg`Don’t sit down.`,
  "Ära oota!": msg`Don’t wait.`,
  "Ära räägi!": msg`Don’t speak.`,
  "Ära loe!": msg`Don’t read.`,
  "Ära söö!": msg`Don’t eat.`,
  "Ära joo!": msg`Don’t drink.`,
  "Ma ei istu.": msg`I’m not sitting down.`,
  "Ma ei oota.": msg`I’m not waiting.`,
  "Ma ei loe.": msg`I’m not reading.`,
  "Ma ei joo.": msg`I’m not drinking.`,
  "Istuge!": msg`Sit down. To more than one, or polite.`,
  "Oodake!": msg`Wait. To more than one, or polite.`,
  "Lugege!": msg`Read. To more than one, or polite.`,
  "Ärge lugege!": msg`Don’t read. To more than one, or polite.`,
  "Ärge oodake!": msg`Don’t wait. To more than one, or polite.`,
  "Rääkige aeglasemalt, palun.": msg`Speak more slowly, please. To more than one, or polite.`,
  "Ma lähen.": msg`I’m going.`,
  "Mine!": msg`Go.`,
};

/** What each verb of the stem pairs means. */
const VERB_MEANS: Record<(typeof KASKIV_STEMS)[number]["verb"], MessageDescriptor> = {
  lugema: msg`to read`,
  rääkima: msg`to speak`,
  ootama: msg`to wait`,
  sööma: msg`to eat`,
  jooma: msg`to drink`,
  õppima: msg`to learn, to study`,
};

const GLOSSARY: Glossary = {
  ...Object.fromEntries(
    Object.entries(MEANS).map(([said, en]) => [said.toLowerCase(), { en, show: said }]),
  ),
  palun: { en: msg`please` },
  ei: { en: msg`not; no`, clip: false },
  ära: { en: msg`don’t`, note: msg`Before the stem, to tell one person not to do something.` },
  ärge: { en: msg`don’t, to more than one or polite`, clip: false },
  "ma loen": { en: msg`I read`, show: "Ma loen" },
  "ma ei loe": { en: msg`I don’t read`, show: "ma ei loe" },
  "ma lähen": { en: msg`I’m going`, show: "Ma lähen" },
  "ma ei istu": { en: msg`I’m not sitting down`, show: "ma ei istu" },
  siia: { en: msg`here, to this place`, note: msg`Where someone goes: tule siia, come here.` },
  istun: { en: msg`I sit down`, note: msg`From istuma, to sit.`, clip: false },
  tulen: { en: msg`I come`, note: msg`From tulema, to come.`, clip: false },
  minema: { en: msg`to go`, clip: false },
  sa: { en: msg`you, to one person`, clip: false },
  te: { en: msg`you, to more than one; polite you`, clip: false },
};

/** A stretch of a line, lit in the stage’s hue when it is what changed. */
type Piece = readonly [text: string, lit: boolean];

/** A command to more than one, with each -ge or -ke lit: “Ärge lugege!” */
export function litEndings(text: string): Piece[] {
  return text
    .split(/(ge|ke)(?=[\s!.,])/)
    .filter(Boolean)
    .map((part) => [part, part === "ge" || part === "ke"] as const);
}

/** A command with ära lit: “Ära istu!” */
const litAra = (text: string): Piece[] =>
  text.startsWith("Ära ")
    ? [
        ["Ära", true],
        [text.slice(3), false],
      ]
    : [[text, false]];

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
            // oxlint-disable-next-line react/no-array-index-key -- a line’s pieces never reorder
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

/** The ma form with its -n lit, and the command it gives, each to tap. */
function StemPair({ verb, ma, stem }: (typeof KASKIV_STEMS)[number]) {
  const { i18n } = useLingui();
  return (
    <div className="grid gap-1 rounded-tile bg-plate px-2 pt-1.5 pb-2.5 shadow-[0_0_0_1px_var(--edge)]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1">
        <PairWord src={src(`Ma ${ma}.`)}>
          Ma {ma.slice(0, -1)}
          <span className="text-(--form)">n</span>
        </PairWord>
        <ArrowRight aria-hidden="true" className="size-4 text-ink-muted rtl:-scale-x-100" />
        <PairWord src={src(commandTo(stem))}>{commandTo(stem)}</PairWord>
      </div>
      <p className="ps-2 text-sm text-ink-muted">
        <span lang="et">{verb}</span>, {i18n._(VERB_MEANS[verb])}
      </p>
    </div>
  );
}

function PairWord({ src, children }: { src: string; children: ReactNode }) {
  const playing = usePlaying(src);
  return (
    <button
      type="button"
      onClick={() => void playSound(src)}
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

/** Six commands, switched together between do and don’t. */
function AraFlip() {
  const { t } = useLingui();
  const [no, setNo] = useState(false);
  const mode = no ? "no" : "yes";
  return (
    <Panel>
      <Chips
        label={t`Do or don’t`}
        items={[
          { label: t({ message: "Do", context: "command" }), value: "yes" },
          { label: t({ message: "Don’t", context: "command" }), value: "no" },
        ]}
        value={mode}
        onPick={(value) => setNo(value === "no")}
      />
      <div className="grid gap-1.5 sm:grid-flow-col sm:grid-cols-2 sm:grid-rows-3">
        {KASKIV_FLIP.map((stem) => {
          const said = commandTo(stem, no);
          return <FlipLine key={stem} pieces={litAra(said)} said={said} mode={mode} />;
        })}
      </div>
      {no ? (
        <FlipNote
          mode={mode}
          title={
            <Trans>
              <span lang="et">Ära</span> before the stem
            </Trans>
          }
          tip={
            <Trans>
              The stem doesn’t change: <span lang="et">istu</span>, <span lang="et">ära istu</span>.
            </Trans>
          }
        />
      ) : (
        <FlipNote
          mode={mode}
          title={<Trans>The stem alone</Trans>}
          tip={<Trans>Nothing before it and no ending after it.</Trans>}
        />
      )}
    </Panel>
  );
}

/** Commands switched together between one person and more than one. */
function MoreFlip() {
  const { t } = useLingui();
  const [more, setMore] = useState(false);
  const mode = more ? "more" : "one";
  return (
    <Panel>
      <Chips
        label={t`One person or more`}
        items={[
          { label: t`One person`, value: "one" },
          { label: t`More than one`, value: "more" },
        ]}
        value={mode}
        onPick={(value) => setMore(value === "more")}
      />
      <div className="grid gap-1.5 sm:grid-flow-col sm:grid-cols-2 sm:grid-rows-4">
        {KASKIV_MORE.map((row) => {
          const said = more ? row.more : row.one;
          return (
            <FlipLine
              key={row.one}
              pieces={more ? litEndings(said) : [[said, false]]}
              said={said}
              mode={mode}
            />
          );
        })}
      </div>
      {more ? (
        <FlipNote
          mode={mode}
          title={
            <Trans>
              <span lang="et" className="whitespace-nowrap">
                -ge
              </span>{" "}
              or{" "}
              <span lang="et" className="whitespace-nowrap">
                -ke
              </span>{" "}
              on the end
            </Trans>
          }
          tip={<Trans>To more than one person, or politely to one.</Trans>}
        />
      ) : (
        <FlipNote
          mode={mode}
          title={<Trans>To one person</Trans>}
          tip={
            <Trans>
              Someone you’d call <span lang="et">sa</span>.
            </Trans>
          }
        />
      )}
    </Panel>
  );
}

/** The commands of “What to do?”: the everyday six and three from the stem pairs. */
export const ASKED: readonly string[] = [
  ...KASKIV_EVERYDAY.map(({ one }) => one),
  "Loe!",
  "Joo!",
  "Söö!",
];

/** The answer and two other commands at random, in random order. */
export function threeCommands(answer: string): string[] {
  const others = ASKED.filter((each) => each !== answer);
  return shuffle([answer, ...shuffle(others).slice(0, 2)]);
}

/** The first round’s options, fixed so the page renders the same on the server. */
const firstOptions = (i: number): string[] => {
  const three = [0, 3, 5].map((step) => ASKED[(i + step) % ASKED.length] as string);
  const turn = i % 3;
  return [...three.slice(turn), ...three.slice(0, turn)];
};

type Kind = "do" | "dont" | "not";
const KINDS: readonly Kind[] = ["do", "dont", "not"];

/** What a stem says as a command, a don’t, or a statement with ei. */
export const heardAs = (stem: string, kind: Kind) =>
  kind === "do" ? commandTo(stem) : kind === "dont" ? commandTo(stem, true) : notSentence(stem);

/** “Do, don’t or not?”: each stem heard three ways, keyed by the way. */
export const HEARD = KASKIV_HEARD.flatMap((stem) =>
  KINDS.map((kind) => ({
    stem,
    kind,
    said: heardAs(stem, kind),
    pair: [kind, `${stem}-${kind}`] as const,
  })),
);

/** The three ways in a turned order, so the first round’s answer isn’t always in one place. */
const turned = (i: number): Kind[] => {
  const turn = i % 3;
  return [...KINDS.slice(turn), ...KINDS.slice(0, turn)];
};

type AskedItem = ChoiceItem & { said: string; pair: readonly [string, string] };
type HeardItem = ChoiceItem & { said: string; stem: string; pair: readonly [string, string] };

const askedOptions = (options: readonly string[], i18n: I18n) =>
  options.map((option) => ({
    id: option,
    label: <span lang={i18n.locale}>{i18n._(MEANS[option] as MessageDescriptor)}</span>,
  }));

const heardOptions = (stem: string, kinds: readonly Kind[], i18n: I18n) =>
  kinds.map((kind) => ({
    id: kind,
    label: (
      <span lang={i18n.locale}>{i18n._(MEANS[heardAs(stem, kind)] as MessageDescriptor)}</span>
    ),
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

const TYPED: readonly { verb: string; ma: string; stem: string; said: string }[] = [
  ...KASKIV_STEMS.filter(({ verb }) => verb !== "lugema").map(({ verb, ma, stem }) => ({
    verb,
    ma,
    stem,
    said: commandTo(stem),
  })),
  { verb: "kuulama", ma: "kuulan", stem: "kuula", said: "Kuula!" },
  { verb: "vaatama", ma: "vaatan", stem: "vaata", said: "Vaata!" },
];

const COMMAND_VERB_MEANS: Record<string, MessageDescriptor> = {
  lugema: msg`to read`,
  rääkima: msg`to speak`,
  ootama: msg`to wait`,
  sööma: msg`to eat`,
  jooma: msg`to drink`,
  õppima: msg`to learn, to study`,
  istuma: msg`to sit down`,
  kuulama: msg`to listen`,
  vaatama: msg`to look`,
};

const ONE_OR_MORE = [
  "Istu!",
  "Oodake!",
  "Kuula!",
  "Lugege!",
  "Oota!",
  "Istuge!",
  "Loe!",
  "Ärge oodake!",
] as const;

export function KaskivLesson() {
  const { t, i18n } = useLingui();
  const pronouns = lessonBySlug("mina-sina-tema")?.n;
  const present = lessonBySlug("olevik")?.n;
  const negation = lessonBySlug("eitus")?.n;
  const verbForms = lessonBySlug("verbi-pohivormid")?.n;

  const askedItems = useMemo<AskedItem[]>(
    () =>
      ASKED.map((said, i) => ({
        said,
        src: src(said),
        answer: said,
        pair: [said, said] as const,
        options: askedOptions(firstOptions(i), i18n),
        explain: <Explain said={said} />,
      })),
    [i18n],
  );

  // Every round but the first draws its wrong commands afresh, so no set of options names the answer.
  const askedRun = (items: readonly AskedItem[], pinned?: AskedItem): AskedItem[] =>
    eachPairFirst(items, pinned).map((item) =>
      item === pinned ? item : { ...item, options: askedOptions(threeCommands(item.answer), i18n) },
    );

  const heardItems = useMemo<HeardItem[]>(
    () =>
      HEARD.map(({ stem, kind, said, pair }, i) => ({
        said,
        stem,
        pair,
        src: src(said),
        answer: kind,
        options: heardOptions(stem, turned(i), i18n),
        explain: <Explain said={said} />,
      })),
    [i18n],
  );

  // The three ways are the same for each stem, so only their order changes between rounds.
  const heardRun = (items: readonly HeardItem[], pinned?: HeardItem): HeardItem[] =>
    eachPairFirst(items, pinned).map((item) =>
      item === pinned ? item : { ...item, options: heardOptions(item.stem, shuffle(KINDS), i18n) },
    );

  const line = (id: keyof typeof KASKIV_DIALOGUE) => {
    const clip = KASKIV_DIALOGUE[id];
    return typeof clip === "string" ? clip : clip.text;
  };

  const dialogue: DialogueTurn[] = [
    { who: "them", clip: "d-mari-1", line: line("d-mari-1") },
    {
      who: "you",
      clip: "d-sina-1",
      replies: [
        { line: "Tere! Ära istu.", why: t`Ära istu tells her not to sit down.` },
        { line: line("d-sina-1"), right: true },
        {
          line: "Tere! Ma istun, palun.",
          why: t`Ma istun says that you’re sitting down. To ask her, use the stem: istu.`,
        },
      ],
    },
    { who: "them", clip: "d-mari-2", line: line("d-mari-2") },
    {
      who: "you",
      clip: "d-sina-2",
      replies: [
        {
          line: "Natuke. Ma räägin aeglasemalt.",
          why: t`That says you speak more slowly. To ask her, use the stem: räägi.`,
        },
        { line: "Natuke. Ära räägi, palun.", why: t`That asks her not to speak at all.` },
        { line: line("d-sina-2"), right: true },
      ],
    },
    { who: "them", clip: "d-mari-3", line: line("d-mari-3") },
    {
      who: "you",
      clip: "d-sina-3",
      replies: [
        { line: line("d-sina-3"), right: true },
        {
          line: "Joo kohvi!",
          why: t`That tells Mari to drink coffee. She asked what you’d like.`,
        },
        {
          line: "Ära joo vett!",
          why: t`That tells Mari not to drink water. She asked what you’d like.`,
        },
      ],
    },
    { who: "them", clip: "d-mari-4", line: line("d-mari-4") },
    {
      who: "you",
      clip: "d-sina-4",
      replies: [
        {
          line: "Jaan, tuleb siia!",
          why: t`Tuleb says that he’s coming. To call him over, use the stem: tule.`,
        },
        { line: line("d-sina-4"), right: true },
        { line: "Jaan, ära tule siia!", why: t`That tells Jaan not to come.` },
      ],
    },
  ];

  const typedItems = useMemo<(FormItem & { pair: readonly [string, string] })[]>(
    () =>
      TYPED.map(({ verb, ma, stem, said }) => ({
        base: verb,
        gloss: (
          <Trans>
            {i18n._(COMMAND_VERB_MEANS[verb] as MessageDescriptor)}, <span lang="et">ma {ma}</span>
          </Trans>
        ),
        cue: t`to one person`,
        answers: [stem, `${stem}!`],
        src: src(said),
        pair: [`${verb.slice(0, -2)}` === stem ? "same" : "changed", verb] as const,
      })),
    [t, i18n],
  );

  const sortBins = useMemo<SortBin[]>(
    () => [
      {
        id: "one",
        label: t`To one person`,
        lang: i18n.locale,
        rule: <Trans>The stem alone: one person.</Trans>,
      },
      {
        id: "more",
        label: t`To more than one, or polite`,
        lang: i18n.locale,
        rule: (
          <Trans>
            <span lang="et">-ge</span> or <span lang="et">-ke</span> on the end: more than one, or
            polite.
          </Trans>
        ),
      },
    ],
    [t, i18n],
  );
  const sortItems = useMemo<SortItem[]>(
    () =>
      ONE_OR_MORE.map((w) => ({
        w,
        bin: w.endsWith("ge!") || w.endsWith("ke!") ? "more" : "one",
        src: src(w),
      })),
    [],
  );

  const turnedItems = useMemo<(SentenceItem & { pair: readonly [string, string] })[]>(
    () =>
      KASKIV_TURNED.map(({ from, to, kind }) => ({
        kind: "rewrite" as const,
        id: `turn-${clipId(to)}`,
        from,
        cue: kind === "dont" ? t`don’t` : t`to more than one`,
        src: src(to),
        answers: [to],
        pair: [kind, to] as const,
      })),
    [t],
  );

  const classQuestions = useMemo<PassageQuestion[]>(
    () => [
      {
        id: "first",
        ask: t`What should everyone do first?`,
        options: [
          { id: "listen", label: t({ message: "Listen", context: "in class" }) },
          { id: "sit", label: t`Sit down` },
          { id: "look", label: t({ message: "Look here", context: "in class" }) },
        ],
        answer: "sit",
        line: 1,
      },
      { id: "jaan", kind: "truefalse", ask: t`Jaan should talk.`, answer: false, line: 3 },
      {
        id: "read",
        ask: t`Who should read?`,
        options: [
          { id: "jaan", label: t`Jaan` },
          { id: "kati", label: t`Kati` },
          { id: "mari", label: t`Mari` },
        ],
        answer: "mari",
        line: 4,
      },
      {
        id: "wait",
        ask: t`Who should wait?`,
        options: [
          { id: "kati", label: t`Kati` },
          { id: "mari", label: t`Mari` },
          { id: "all", label: t`Everyone` },
        ],
        answer: "kati",
        line: 5,
      },
      { id: "look", kind: "truefalse", ask: t`Everyone should look here.`, answer: true, line: 6 },
    ],
    [t],
  );

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          To tell someone what to do, say the verb’s stem: <span lang="et">Istu!</span> is sit down.
          To tell them not to, put <span lang="et">ära</span> before it:{" "}
          <span lang="et">Ära istu!</span>
        </Trans>
      }
      facts={[
        <Trans key="m">15 minutes</Trans>,
        <Trans key="q">4 quizzes, a sort, a conversation and a passage</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "istu!",
        "tule siia!",
        "oota!",
        "kuula!",
        "vaata!",
        "räägi aeglasemalt, palun.",
        "palun",
        "siia",
        "ära",
        "ära istu!",
        "istuge!",
        "mine!",
      ]}
      recap={[
        <Trans key="1">
          To tell one person what to do, say the verb’s stem: <b lang="et">Loe! Istu!</b>
        </Trans>,
        <Trans key="2">
          The stem is the ma form without its <b lang="et">-n</b>: <b lang="et">istun</b>,{" "}
          <b lang="et">istu</b>. It’s the form that follows <b lang="et">ei</b>.
        </Trans>,
        <Trans key="3">
          To say don’t, put <b lang="et">ära</b> before the stem: <b lang="et">Ära istu!</b>
        </Trans>,
        <Trans key="4">
          <b lang="et">Ei</b> says what someone doesn’t do; <b lang="et">ära</b> tells them not to:{" "}
          <b lang="et">Ma ei istu. Ära istu!</b>
        </Trans>,
        <Trans key="5">
          To more than one person, or politely, the command ends in{" "}
          <b lang="et" className="whitespace-nowrap">
            -ge
          </b>{" "}
          or{" "}
          <b lang="et" className="whitespace-nowrap">
            -ke
          </b>
          : <b lang="et">Istuge! Oodake! Ärge lugege!</b>
        </Trans>,
      ]}
      sections={[
        {
          id: "stem",
          title: t`The stem is the command`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    To tell one person what to do, Estonian uses the verb’s stem with nothing after
                    it. Take the ma form from lesson {present} and drop the{" "}
                    <span lang="et">-n</span>. <Word w="Ma loen" /> is I read, and <Word w="Loe!" />{" "}
                    tells one person to read.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    It’s the form that follows <span lang="et">ei</span> in lesson {negation}:{" "}
                    <Word w="ma ei loe" />, I don’t read. Tap either side of a pair to hear it.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {KASKIV_STEMS.map((verb) => (
                    <StemPair key={verb.stem} {...verb} />
                  ))}
                </div>
              </Panel>
              <Aside>
                <Trans>
                  One common verb breaks the pattern: <Word w="minema" />, to go.{" "}
                  <Word w="Ma lähen" /> is I’m going, but the command is <Word w="Mine!" />
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "everyday",
          title: t`Everyday commands`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each of these six everyday commands starts with a verb’s stem. Tap one to hear
                    it.
                  </Trans>
                </p>
              </Prose>
              <ListenRows
                items={KASKIV_EVERYDAY.map(({ one }) => {
                  const means = i18n._(MEANS[one] as MessageDescriptor);
                  return { main: one, sub: means, src: src(one) };
                })}
              />
              <Prose>
                <p>
                  <Trans>
                    The stem is the ma form without its <span lang="et">-n</span>.{" "}
                    <Word w="Istun" /> gives <Word w="Istu!" /> <Word w="Tulen" /> gives{" "}
                    <Word w="Tule siia!" /> <Word w="Siia" /> means here, to this place.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    <Word w="Palun" />, please, makes a command polite. When Estonian comes too
                    fast, say <Word w="Räägi aeglasemalt, palun." />
                  </Trans>
                </p>
              </Prose>
            </>
          ),
        },
        {
          id: "what-to-do",
          title: t`Hearing a command`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Hear a command and pick what it asks you to do.</Trans>
                </p>
              </Prose>
              <Quiz
                id="what-to-do"
                title={<Trans>What to do?</Trans>}
                items={askedItems}
                rounds={9}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All of them. You understood every command.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Tap the commands above once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: item.src })}
                order={askedRun}
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "ara",
          title: t`Ära means don’t`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    To tell someone not to do something, put <Word w="ära" /> before the stem.{" "}
                    <Word w="Istu!" /> is sit down, and <Word w="Ära istu!" /> is don’t sit down.
                    The stem stays as it is.
                  </Trans>
                </p>
                <p>
                  <Trans>Switch between Do and Don’t, and tap a line to hear it.</Trans>
                </p>
              </Prose>
              <AraFlip />
              <Aside>
                <Trans>
                  <Word w="Ei" /> and <Word w="ära" /> both mean not, but they do different jobs.{" "}
                  <span lang="et">Ei</span> says what someone doesn’t do: <Word w="ma ei istu" />,
                  I’m not sitting down. <span lang="et">Ära</span> tells someone not to do it:{" "}
                  <Word w="Ära istu!" /> A command never starts with <span lang="et">ei</span>.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "do-or-dont",
          title: t`Hearing ära and ei`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Hear a sentence and pick what it says. Listen to how it starts: with the verb,
                    with <span lang="et">ära</span>, or with <span lang="et">ma ei</span>.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="do-or-dont"
                title={<Trans>Do, don’t or not?</Trans>}
                items={heardItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>
                      All of them. You told <span lang="et">ära</span> from{" "}
                      <span lang="et">ei</span> every time.
                    </Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Listen to the first word of the ones you missed.</Trans>
                  ) : (
                    <Trans>Tap the Do and Don’t lines above once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: item.src })}
                order={heardRun}
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "more",
          title: t`To more than one person`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    So far every command speaks to one person, someone you’d call <Word w="sa" />.
                    To more than one, or politely to one, the command ends in{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -ge
                    </b>{" "}
                    or{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -ke
                    </b>
                    : <Word w="Istuge!" /> <Word w="Oodake!" /> It’s the same split as{" "}
                    <span lang="et">sa</span> and <Word w="te" /> in lesson {pronouns}.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The stem often changes before the ending: <Word w="Loe!" /> becomes{" "}
                    <Word w="Lugege!" /> Learn these as whole words for now. Lesson {verbForms}, on
                    a verb’s three forms, shows where they come from.
                  </Trans>
                </p>
              </Prose>
              <MoreFlip />
              <Prose>
                <p>
                  <Trans>
                    <Word w="Ära" /> becomes <Word w="ärge" />, and the verb takes its{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -ge
                    </b>{" "}
                    or{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -ke
                    </b>{" "}
                    form: <Word w="Ärge lugege!" /> <Word w="Ärge oodake!" /> Said politely to one
                    person, the sentence to keep is <Word w="Rääkige aeglasemalt, palun." />
                  </Trans>
                </p>
              </Prose>
            </>
          ),
        },
        {
          id: "cafe",
          title: t`At a café`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each reply is a command or a short answer. Pick the one that fits what Mari
                    says.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="at-a-cafe"
                title={<Trans>Talk: at a café</Trans>}
                part={
                  <Trans>
                    You’re at a café, and Mari comes in. She speaks first; pick what you say back.
                  </Trans>
                }
                them={t`Mari`}
                turns={dialogue}
              />
            </>
          ),
        },
        {
          id: "type",
          title: t`Type the command`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each round gives a verb and its ma form. Type the command to one person: the ma
                    form without its <span lang="et">-n</span>.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="type-command"
                title={<Trans>Type the command</Trans>}
                items={typedItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>
                      All six, each the ma form without its <span lang="et">-n</span>.
                    </Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the stem in the ones you missed.</Trans>
                  ) : (
                    <Trans>Go back to the stems at the top, then try again.</Trans>
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
          id: "one-or-more",
          title: t`One person or more?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    A command to one person is the stem alone. To more than one, or politely, it
                    ends in <span lang="et">-ge</span> or <span lang="et">-ke</span>. Sort the
                    commands; tap one to hear it.
                  </Trans>
                </p>
              </Prose>
              <Sort
                id="sort-one-more"
                title={<Trans>Who is it said to?</Trans>}
                bins={sortBins}
                items={sortItems}
              />
            </>
          ),
        },
        {
          id: "rewrite",
          title: t`Change the command`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Rewrite each command as the cue says: with <span lang="et">ära</span> for don’t,
                    or for more than one.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="rewrite-command"
                title={<Trans>Rewrite the command</Trans>}
                items={turnedItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six commands right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the cue in the ones you missed.</Trans>
                  ) : (
                    <Trans>Go back to the two switches above, then try again.</Trans>
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
          title: t`Listening: in class`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>A teacher starts the class. Listen to who is told to do what.</Trans>
                </p>
              </Prose>
              <Listening
                id="in-class"
                title={<Trans>Listen: in class</Trans>}
                clip="p-class"
                sentences={KASKIV_CLASS}
                questions={classQuestions}
              />
            </>
          ),
        },
      ]}
    />
  );
}
