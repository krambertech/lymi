import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { ArrowRight } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  endingOf,
  FLIP_STEMS,
  NEGATION_FIXES,
  NEGATION_TALK,
  NEGATION_TURNED,
  NEGATION_VERBS,
  NO_ANSWERS,
  NO_QUIZ,
  OLEMA_ROWS,
  type OlemaMode,
  olemaSentence,
  PERSON_ENDINGS,
  type Person,
  verbSentence,
} from "../../../lib/learn/clips";
import { playSound, usePlaying } from "../../../lib/learn/player";
import { eachPairFirst } from "../../../lib/learn/quiz";
import { Chips, Panel } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Listening, type PassageQuestion } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { PlayButton, Playing } from "../Sound";
import { Word } from "../Word";

const SLUG = "eitus";
/** A clip by what it says. */
const src = (text: string) => clipUrl(SLUG, clipId(text));
const bare = (sentence: string) => sentence.replace(/[.?]$/, "");

/** What each verb means, by its stem. */
const MEANS: Record<string, MessageDescriptor> = {
  loe: msg`to read`,
  räägi: msg`to speak`,
  tööta: msg`to work`,
  söö: msg`to eat`,
  ela: msg`to live`,
  õpi: msg`to learn, to study`,
  tee: msg`to do, to make`,
  oota: msg`to wait`,
  armasta: msg`to love`,
  joo: msg`to drink`,
};

/** What each question in the answering quiz asks. */
const ASKS: Record<(typeof NO_ANSWERS)[number]["ask"], MessageDescriptor> = {
  "Kas sa loed?": msg`Are you reading?`,
  "Kas sa töötad?": msg`Do you work?`,
  "Kas te sööte?": msg`Are you all eating?`,
  "Kas ta räägib eesti keelt?": msg`Does he or she speak Estonian?`,
  "Kas sa oled väsinud?": msg`Are you tired?`,
  "Kas ta on kodus?": msg`Is he or she at home?`,
  "Kas nad joovad?": msg`Are they drinking?`,
  "Kas te ootate?": msg`Are you all waiting?`,
  "Kas sa õpid?": msg`Do you study?`,
};

const GLOSSARY: Glossary = {
  ei: { en: msg`not; no`, note: msg`The same for every person.` },
  jah: { en: msg`yes` },
  "ei ole": { en: msg`am not, is not, are not`, note: msg`The no of olema, to be.` },
  pole: { en: msg`am not, is not, are not`, note: msg`Ei ole in one word.` },
  olema: { en: msg`to be`, clip: false },
  lugema: { en: msg`to read`, note: msg`Its ma form is loen.`, clip: false },
  kas: {
    en: msg`turns a sentence into a yes-or-no question`,
    clip: false,
  },
  loen: { en: msg`I read`, note: msg`From lugema, to read.`, clip: clipId("Ma loen.") },
  räägin: { en: msg`I speak`, note: msg`From rääkima, to speak.`, clip: clipId("Ma räägin.") },
  "ma loen": { en: msg`I read`, show: "Ma loen" },
  "ma ei loe": { en: msg`I don’t read`, show: "Ma ei loe" },
  "ei loe": { en: msg`don’t read, doesn’t read` },
  "ei räägi": { en: msg`don’t speak, doesn’t speak` },
  "ei tööta": { en: msg`don’t work, doesn’t work` },
  "ei söö": { en: msg`don’t eat, doesn’t eat` },
  "ei joo": { en: msg`don’t drink, doesn’t drink` },
  "ma olen väsinud": { en: msg`I’m tired`, show: "Ma olen väsinud" },
  "ma ei ole väsinud": { en: msg`I’m not tired`, show: "Ma ei ole väsinud" },
  "kas sa loed?": { en: msg`Are you reading?`, show: "Kas sa loed?" },
  "ma ei tea": { en: msg`I don’t know`, show: "Ma ei tea" },
  "ma ei räägi eesti keelt": {
    en: msg`I don’t speak Estonian`,
    show: "Ma ei räägi eesti keelt",
  },
};

/** A sentence in three parts; the middle one is what changes, lit in the stage's hue. */
type Parts = readonly [string, string, string];

interface FlipRow {
  id: string;
  parts: Parts;
  src: string;
}

/** One sentence to tap. Its changing part is lit, and it swaps in when the switch flips. */
function FlipLine({ row, mode }: { row: FlipRow; mode: string }) {
  const { t } = useLingui();
  const playing = usePlaying(row.src);
  const [before, lit, after] = row.parts;
  const said = `${before}${lit}${after}`;
  return (
    <button
      type="button"
      aria-label={t`Play ${said}`}
      data-playing={playing ? "" : undefined}
      onClick={() => void playSound(row.src)}
      className="learn-key flex min-h-13 cursor-pointer items-center justify-between gap-3 rounded-tile bg-plate py-2 ps-4 pe-3 text-start hoverable:hover:bg-plate-hover"
    >
      <span lang="et" className="text-xl font-medium tracking-tight max-sm:text-lg">
        {before}
        <span key={mode} className="learn-swap">
          <span className="inline-block text-(--form)">{lit}</span>
        </span>
        {after}
      </span>
      <span className="grid size-5 shrink-0 place-items-center text-(--form)">
        {playing && <Playing className="h-3" />}
      </span>
    </button>
  );
}

/** The line under a flip: what the switch changed. */
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

const yesParts = (person: Person, stem: string): Parts => [
  `${person} ${stem}`,
  endingOf(person),
  "",
];
const noParts = (person: Person, stem: string): Parts => [`${person} `, "ei", ` ${stem}`];

/** Six people with one verb, and a switch that turns all six from yes to no at once. */
function PersonFlip() {
  const { t } = useLingui();
  const [no, setNo] = useState(false);
  const [stem, setStem] = useState<(typeof FLIP_STEMS)[number]>("loe");
  const rows = PERSON_ENDINGS.map(([person]) => ({
    id: person,
    parts: no ? noParts(person, stem) : yesParts(person, stem),
    src: src(verbSentence(person, stem, no)),
  }));
  const mode = `${no}-${stem}`;
  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Chips
          label={t`Yes or no`}
          items={[
            { label: "jah", value: "yes", lang: "et" },
            { label: "ei", value: "no", lang: "et" },
          ]}
          value={no ? "no" : "yes"}
          onPick={(value) => setNo(value === "no")}
        />
        <Chips
          label={t`Verb`}
          items={FLIP_STEMS.map((each) => ({
            label: NEGATION_VERBS.find((verb) => verb.stem === each)?.inf ?? each,
            value: each,
            lang: "et",
          }))}
          value={stem}
          onPick={setStem}
        />
      </div>
      <div className="grid gap-1.5 sm:grid-flow-col sm:grid-cols-2 sm:grid-rows-3">
        {rows.map((row) => (
          <FlipLine key={row.id} row={row} mode={mode} />
        ))}
      </div>
      {no ? (
        <FlipNote
          mode={mode}
          title={<Trans>One form for all six</Trans>}
          tip={
            <Trans>
              <span lang="et">Ei</span> before the verb, and the ending is gone:{" "}
              <span lang="et">ei {stem}</span>.
            </Trans>
          }
        />
      ) : (
        <FlipNote
          mode={mode}
          title={<Trans>Six endings</Trans>}
          tip={<Trans>Each person has its own: -n, -d, -b, -me, -te, -vad.</Trans>}
        />
      )}
    </Panel>
  );
}

/** One verb as a pair: the ma form with its -n lit, and its no, each to tap. */
function StemPair({ stem, inf }: { stem: string; inf: string }) {
  const { t, i18n } = useLingui();
  const yes = verbSentence("ma", stem, false);
  const no = verbSentence("ma", stem, true);
  const meaning = MEANS[stem];
  return (
    <div className="grid gap-1 rounded-tile bg-plate px-2 pt-1.5 pb-2.5 shadow-[0_0_0_1px_var(--edge)]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1">
        <PairWord src={src(yes)} label={t`Play ${bare(yes)}`}>
          {stem}
          <span className="text-(--form)">n</span>
        </PairWord>
        <ArrowRight aria-hidden="true" className="size-4 text-ink-muted rtl:-scale-x-100" />
        <PairWord src={src(no)} label={t`Play ${bare(no)}`}>
          <span className="text-(--form)">ei</span> {stem}
        </PairWord>
      </div>
      <p className="ps-2 text-sm text-ink-muted">
        <span lang="et">{inf}</span>
        {meaning && <>, {i18n._(meaning)}</>}
      </p>
    </div>
  );
}

function PairWord({ src, label, children }: { src: string; label: string; children: ReactNode }) {
  const playing = usePlaying(src);
  return (
    <button
      type="button"
      aria-label={label}
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

const OLEMA_MODES: readonly OlemaMode[] = ["yes", "ei ole", "pole"];

/** Four sentences with olema, said with yes, with ei ole, or with pole. */
function OlemaFlip() {
  const { t } = useLingui();
  const [mode, setMode] = useState<OlemaMode>("yes");
  const rows = OLEMA_ROWS.map((row) => ({
    id: row.who,
    parts: [`${row.who} `, mode === "yes" ? row.verb : mode, ` ${row.rest}`] as const,
    src: src(olemaSentence(row, mode)),
  }));
  return (
    <Panel>
      <Chips
        label={t`Yes or no`}
        items={[
          { label: "olen, on", value: "yes", lang: "et" },
          { label: "ei ole", value: "ei ole", lang: "et" },
          { label: "pole", value: "pole", lang: "et" },
        ]}
        value={mode}
        onPick={setMode}
      />
      <div className="grid gap-1.5 sm:grid-cols-2">
        {rows.map((row) => (
          <FlipLine key={row.id} row={row} mode={mode} />
        ))}
      </div>
      {mode === "yes" ? (
        <FlipNote
          mode={mode}
          title={<Trans>The form says who</Trans>}
          tip={
            <Trans>
              <span lang="et">Olen</span> for I, <span lang="et">oled</span> for you,{" "}
              <span lang="et">on</span> for he or she and for they.
            </Trans>
          }
        />
      ) : mode === "ei ole" ? (
        <FlipNote
          mode={mode}
          title={<Trans>One form for everyone</Trans>}
          tip={
            <Trans>
              Every form of <span lang="et">olema</span> becomes <span lang="et">ei ole</span>.
            </Trans>
          }
        />
      ) : (
        <FlipNote
          mode={mode}
          title={
            <Trans>
              <span lang="et">Ei ole</span> in one word
            </Trans>
          }
          tip={
            <Trans>
              <span lang="et">Pole</span> means the same as <span lang="et">ei ole</span>. You’ll
              hear both.
            </Trans>
          }
        />
      )}
    </Panel>
  );
}

/** A question to hear, and the ways to answer it with no. */
function Exchange({
  ask,
  en,
  answers,
}: {
  ask: string;
  en: ReactNode;
  answers: readonly { say: string; en: ReactNode }[];
}) {
  const { t } = useLingui();
  return (
    <div className="grid gap-2.5">
      <p className="flex items-center gap-3">
        <PlayButton src={src(ask)} label={t`Play ${ask}`} />
        <span className="grid">
          <span lang="et" className="text-xl font-medium tracking-tight">
            {ask}
          </span>
          <span className="text-sm text-ink-secondary">{en}</span>
        </span>
      </p>
      <div className="grid grid-cols-3 gap-1.5 max-sm:grid-cols-1">
        {answers.map((answer) => (
          <AnswerKey key={answer.say} say={answer.say} en={answer.en} />
        ))}
      </div>
    </div>
  );
}

function AnswerKey({ say, en }: { say: string; en: ReactNode }) {
  const clip = src(say);
  const playing = usePlaying(clip);
  return (
    <button
      type="button"
      data-playing={playing ? "" : undefined}
      onClick={() => void playSound(clip)}
      className="learn-key grid cursor-pointer content-start gap-0.5 rounded-tile bg-plate px-3.5 pt-2.5 pb-2.5 text-start hoverable:hover:bg-plate-hover"
    >
      <b lang="et" className="text-xl/tight font-semibold tracking-tight">
        {say}
      </b>
      <span className="flex min-h-4 items-center text-sm text-ink-muted">
        {playing ? <Playing className="h-3 text-(--form)" /> : en}
      </span>
    </button>
  );
}

/** The three answers in an order of their own, so the right one isn't always first. */
function placed<T>(list: readonly T[], i: number): T[] {
  const turn = i % list.length;
  return [...list.slice(turn), ...list.slice(0, turn)];
}

export const AFTER_EI: readonly (readonly [(typeof FLIP_STEMS)[number], Person])[] = [
  ["loe", "nad"],
  ["söö", "nad"],
  ["räägi", "sa"],
  ["tööta", "sa"],
  ["tööta", "ta"],
  ["räägi", "ta"],
  ["söö", "me"],
  ["loe", "me"],
  ["loe", "te"],
  ["tööta", "te"],
  ["räägi", "ma"],
  ["söö", "ma"],
];

const YES_OR_NO: readonly {
  stem: string;
  person: Person;
  long: string;
  yes: MessageDescriptor;
  no: MessageDescriptor;
}[] = [
  { stem: "oota", person: "sa", long: "Sina", yes: msg`You wait.`, no: msg`You don’t wait.` },
  { stem: "joo", person: "ta", long: "Tema", yes: msg`She drinks.`, no: msg`She doesn’t drink.` },
  { stem: "õpi", person: "ma", long: "Mina", yes: msg`I study.`, no: msg`I don’t study.` },
];

interface PairedItem extends ChoiceItem {
  said: string;
  /** The sound of the right answer, played after the question under “Hear both”. */
  reply: string;
}

export function EitusLesson() {
  const { t, i18n } = useLingui();
  const present = lessonBySlug("olevik")?.n;
  const questions = lessonBySlug("kusimused")?.n;

  const makeNo = useMemo<PairedItem[]>(
    () =>
      NO_QUIZ.map(([stem, person], i) => {
        const yes = verbSentence(person, stem, false);
        const no = verbSentence(person, stem, true);
        const right = bare(no);
        // Three misses: the ending kept, another verb, and both, so a pick takes the rule and
        // the verb heard together.
        const [otherStem] = NO_QUIZ[(i + 1) % NO_QUIZ.length] ?? [stem];
        const other = bare(verbSentence(person, otherStem, true));
        const options = [
          right,
          `${right}${endingOf(person)}`,
          other,
          `${other}${endingOf(person)}`,
        ];
        return {
          src: src(yes),
          answer: right,
          said: right,
          reply: src(no),
          options: placed(
            options.map((option) => ({ id: option, label: option })),
            i,
          ),
          explain: (
            <>
              <span lang="et" className="font-medium text-ink">
                {bare(yes)} → {no}
              </span>{" "}
              <Trans>
                <span lang="et">Ei</span>, and the verb without its ending.
              </Trans>
            </>
          ),
        };
      }),
    [],
  );

  const answerNo = useMemo<PairedItem[]>(
    () =>
      NO_ANSWERS.map(({ ask, answer, wrong }, i) => ({
        src: src(ask),
        answer: bare(answer),
        said: bare(answer),
        reply: src(answer),
        options: placed(
          [answer, ...wrong].map((option) => ({ id: bare(option), label: bare(option) })),
          i,
        ),
        explain: (
          <>
            <span lang="et" className="font-medium text-ink">
              {ask} {answer}
            </span>{" "}
            {i18n._(ASKS[ask])}
          </>
        ),
      })),
    [i18n],
  );

  const formItems = useMemo<(FormItem & { pair: readonly [string, string] })[]>(
    () =>
      AFTER_EI.map(([stem, person]) => ({
        base: `${stem}${endingOf(person)}`,
        gloss: i18n._(MEANS[stem] as MessageDescriptor),
        cue: "ei …",
        cueLang: "et",
        answers: [stem, `ei ${stem}`],
        src: src(verbSentence(person, stem, true)),
        said: verbSentence(person, stem, true),
        pair: [person, `${stem}-${person}`] as const,
        explain: (
          <>
            <span lang="et" className="font-medium text-ink">
              {bare(verbSentence(person, stem, false))} → {verbSentence(person, stem, true)}
            </span>
          </>
        ),
      })),
    [i18n],
  );

  const turnedItems = useMemo<(SentenceItem & { pair: readonly [string, string] })[]>(
    () =>
      NEGATION_TURNED.slice(0, 6).map(({ yes, no, person }) => ({
        kind: "rewrite" as const,
        id: `no-${clipId(no)}`,
        from: yes,
        cue: t`make it no`,
        src: src(no),
        answers: [no],
        pair: [person, no] as const,
      })),
    [t],
  );

  const fixItems = useMemo<(FixItem & { pair: readonly [string, string] })[]>(
    () =>
      NEGATION_FIXES.map(({ wrong, said, kind }) => ({
        kind: "fix" as const,
        id: `fix-${clipId(wrong)}`,
        wrong,
        answers: [said],
        src: src(said),
        pair: [kind, wrong] as const,
        explain:
          kind === "verb" ? (
            <Trans>
              After <span lang="et">ei</span>, the verb drops its ending.
            </Trans>
          ) : (
            <Trans>
              After <span lang="et">ei</span>, <span lang="et">olema</span> is always{" "}
              <span lang="et">ole</span>.
            </Trans>
          ),
      })),
    [],
  );

  const yesNoItems = useMemo<(SentenceItem & { pair: readonly [string, string] })[]>(
    () =>
      YES_OR_NO.flatMap(({ stem, person, long, yes, no }) => {
        const said = (mode: boolean) => verbSentence(person, stem, mode);
        const rest = (text: string) => text.slice(text.indexOf(" "));
        const dropped = (text: string) =>
          person === "ta" || person === "nad"
            ? []
            : [`${rest(text).trim().charAt(0).toUpperCase()}${rest(text).trim().slice(1)}`];
        return [false, true].map((mode) => {
          const text = said(mode);
          return {
            kind: "translate" as const,
            id: `${mode ? "no" : "yes"}-${stem}-${person}`,
            prompt: i18n._(mode ? no : yes),
            src: src(text),
            answers: [
              text,
              `${long}${rest(text)}`,
              ...(mode ? [] : dropped(text)),
              ...(person === "sa"
                ? mode
                  ? ["Te ei oota.", "Teie ei oota."]
                  : ["Te ootate.", "Teie ootate.", "Ootate."]
                : []),
            ] as [string, ...string[]],
            pair: [mode ? "no" : "yes", text] as const,
          };
        });
      }),
    [i18n],
  );

  const talkQuestions = useMemo<PassageQuestion[]>(
    () => [
      {
        id: "reading",
        kind: "truefalse",
        ask: t`Jaan is reading.`,
        answer: false,
        line: 1,
      },
      {
        id: "why",
        ask: t`What does Jaan say about himself?`,
        options: [
          { id: "busy", label: t`He’s busy.` },
          { id: "tired", label: t`He’s tired.` },
          { id: "teacher", label: t`He’s a teacher.` },
        ],
        answer: "tired",
        line: 2,
      },
      {
        id: "drink",
        ask: t`What does Jaan drink?`,
        options: [
          { id: "coffee", label: t`Coffee` },
          { id: "tea", label: t`Tea` },
          { id: "water", label: t`Water` },
        ],
        answer: "water",
        line: 5,
      },
      {
        id: "home",
        kind: "truefalse",
        ask: t`Peeter is at home.`,
        answer: false,
        line: 7,
      },
      {
        id: "working",
        kind: "truefalse",
        ask: t`Peeter is working.`,
        answer: true,
        line: 8,
      },
    ],
    [t],
  );

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          In the present tense, put <span lang="et">ei</span> before the verb and drop its ending.
          It’s the same for every person, so no is easier than yes.
        </Trans>
      }
      facts={[
        <Trans key="m">15 minutes</Trans>,
        <Trans key="q">6 quizzes and a conversation</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "ei",
        "jah",
        "ei ole",
        "pole",
        "ma ei tea",
        "ei loe",
        "ei räägi",
        "ei tööta",
        "ei söö",
        "ei joo",
        "ma ei räägi eesti keelt",
      ]}
      recap={[
        <Trans key="1">
          Put <b lang="et">ei</b> before the verb: <b lang="et">ma ei loe</b>, I don’t read.
        </Trans>,
        <Trans key="2">
          After <b lang="et">ei</b> comes the ma form without its -n: <b lang="et">loen</b>,{" "}
          <b lang="et">ei loe</b>.
        </Trans>,
        <Trans key="3">
          The no is the same for every person: <b lang="et">ma ei loe</b>,{" "}
          <b lang="et">nad ei loe</b>.
        </Trans>,
        <Trans key="4">
          Olema gives <b lang="et">ei ole</b>, or in one word, <b lang="et">pole</b>.
        </Trans>,
        <Trans key="5">
          To answer no, say <b lang="et">ei</b>, or <b lang="et">ei</b> with the verb from the
          question: <b lang="et">Kas sa loed? Ei loe.</b>
        </Trans>,
      ]}
      sections={[
        {
          id: "ei",
          title: t`Ei before the verb`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    To say not, put <Word w="ei" /> before the verb. <Word w="Ma loen" /> is I read,
                    and <Word w="Ma ei loe" /> is I don’t read. The verb loses its ending, and{" "}
                    <Word w="ei" /> is the same whoever you’re talking about.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Switch between <Word w="jah" /> and <Word w="ei" /> to turn all six from yes to
                    no. Tap a line to hear it.
                  </Trans>
                </p>
              </Prose>
              <PersonFlip />
              <Prose>
                <p>
                  <Trans>
                    Yes has six endings to learn, and no has none. That makes the no the easy half.
                  </Trans>
                </p>
              </Prose>
            </>
          ),
        },
        {
          id: "stem",
          title: t`The verb without its ending`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    To find the form that follows ei, take the ma form from lesson {present} and
                    drop the -n. <Word w="Loen" /> becomes <Word w="ei loe" />, and{" "}
                    <Word w="räägin" /> becomes <Word w="ei räägi" />. It works for every verb
                    below. Tap either side to hear it with ma.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {NEGATION_VERBS.map((verb) => (
                    <StemPair key={verb.stem} stem={verb.stem} inf={verb.inf} />
                  ))}
                </div>
              </Panel>
              <Aside>
                <Trans>
                  In some verbs the stem changes: <Word w="lugema" />, but <Word w="loen" />. Start
                  from the ma form, not the dictionary form, and the no follows: <Word w="ei loe" />
                  .
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "make-no",
          title: t`Make it no`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Hear a sentence, then pick how to say its no.</Trans>
                </p>
              </Prose>
              <Quiz
                id="make-no"
                title={<Trans>Make it no</Trans>}
                items={makeNo}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>
                      All of them. <span lang="et">Ei</span>, and the ending goes.
                    </Trans>
                  ) : share >= 0.7 ? (
                    <Trans>
                      Nearly. Watch for endings that stay after <span lang="et">ei</span>.
                    </Trans>
                  ) : (
                    <Trans>Flip the six lines above once more, then come back.</Trans>
                  )
                }
                both={(item) => [item.src, item.reply]}
                recall={(item) => ({ label: item.said, src: item.reply })}
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "type",
          title: t`Type the form after ei`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each round shows a verb with its ending, such as <b lang="et">teevad</b>. Type
                    the form that follows <span lang="et">ei</span>: drop the ending, so{" "}
                    <b lang="et">teevad</b> becomes <b lang="et">ei tee</b>.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="type-after-ei"
                title={<Trans>Type the form after ei</Trans>}
                items={formItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six, each without its ending.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check that the whole ending went, -vad and -te too.</Trans>
                  ) : (
                    <Trans>Flip the six lines at the top once more, then try again.</Trans>
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
          id: "ole",
          title: t`Ei ole and pole`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Olema" />, to be, works the same way. <Word w="Ma olen väsinud" />{" "}
                    becomes <Word w="Ma ei ole väsinud" />, and <Word w="ei ole" /> is the same for
                    everyone.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    You’ll often hear it as one word, <Word w="pole" />, which means exactly{" "}
                    <Word w="ei ole" />. Try all three.
                  </Trans>
                </p>
              </Prose>
              <OlemaFlip />
            </>
          ),
        },
        {
          id: "answers",
          title: t`Answering no`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Ei" /> on its own is no, and <Word w="jah" /> is yes. A fuller answer
                    repeats the verb with ei: asked <Word w="Kas sa loed?" />, say{" "}
                    <Word w="ei loe" />. The no has no ending, so the same answer fits whoever is
                    asked.
                  </Trans>
                </p>
              </Prose>
              <Panel className="gap-6">
                <Exchange
                  ask="Kas sa loed?"
                  en={<Trans>Are you reading?</Trans>}
                  answers={[
                    { say: "Ei.", en: <Trans>No.</Trans> },
                    { say: "Ei loe.", en: <Trans>No, I’m not.</Trans> },
                    { say: "Ei, ma ei loe.", en: <Trans>No, I’m not reading.</Trans> },
                  ]}
                />
                <Exchange
                  ask="Kas ta on kodus?"
                  en={<Trans>Is he or she at home?</Trans>}
                  answers={[
                    { say: "Ei ole.", en: <Trans>No, he or she isn’t.</Trans> },
                    { say: "Pole.", en: <Trans>No, he or she isn’t.</Trans> },
                    { say: "Ma ei tea.", en: <Trans>I don’t know.</Trans> },
                  ]}
                />
              </Panel>
              <Aside>
                <Trans>
                  <Word w="Kas" /> at the start turns a sentence into a yes-or-no question. Lesson{" "}
                  {questions} covers kas and the question words.
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>
                    One sentence to keep from today: <Word w="Ma ei räägi eesti keelt" />.
                  </Trans>
                </p>
              </Prose>
            </>
          ),
        },
        {
          id: "answer-no",
          title: t`Say no`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Hear the question, then pick the short answer that says no.</Trans>
                </p>
              </Prose>
              <Quiz
                id="answer-no"
                title={<Trans>Say no</Trans>}
                items={answerNo}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>
                      All of them. <span lang="et">Ei</span>, then the verb from the question.
                    </Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Listen for the verb in the question.</Trans>
                  ) : (
                    <Trans>Hear the two questions above once more, then try again.</Trans>
                  )
                }
                both={(item) => [item.src, item.reply]}
                recall={(item) => ({ label: item.said, src: item.reply })}
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "rewrite",
          title: t`Turn it into a no`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Rewrite each sentence as a no. Put <span lang="et">ei</span> before the verb and
                    drop its ending. In these sentences the rest stays the same:{" "}
                    <b lang="et">Mari armastab kohvi</b> becomes{" "}
                    <b lang="et">Mari ei armasta kohvi</b>.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="rewrite-no"
                title={<Trans>Rewrite the sentence</Trans>}
                items={turnedItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>
                      All six, each with <span lang="et">ei</span> and no ending.
                    </Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the verb in the ones you missed.</Trans>
                  ) : (
                    <Trans>Flip the six lines at the top once more, then try again.</Trans>
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
          id: "fix",
          title: t`Fix the no`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In each sentence one word is wrong: a verb that keeps its ending after{" "}
                    <span lang="et">ei</span>, or a form of <span lang="et">olema</span> other than{" "}
                    <span lang="et">ole</span>. Tap the wrong word, then type it right.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-no"
                title={<Trans>Fix the sentence</Trans>}
                items={fixItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six, each found and fixed.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>
                      Nearly. Look at the word right after <span lang="et">ei</span>.
                    </Trans>
                  ) : (
                    <Trans>Flip the six lines at the top and the <span lang="et">olema</span> lines once more, then try again.</Trans>
                  )
                }
                recall={fixRecall}
                order={eachPairFirst}
                round={(props) => <FixRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "yes-or-no",
          title: t`Yes or no`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Write each sentence in Estonian: a yes keeps the verb’s ending, and a no takes{" "}
                    <span lang="et">ei</span> and drops it.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="yes-or-no"
                title={<Trans>Write it in Estonian</Trans>}
                items={yesNoItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six, every yes and every no.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check whether each one meant yes or no.</Trans>
                  ) : (
                    <Trans>Flip the six lines at the top once more, then try again.</Trans>
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
          title: t`Listening: Mari’s questions`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari asks Jaan three questions. Listen to how he answers each, and to what he
                    says after it.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="mari-asks"
                title={<Trans>Listen: Mari’s questions</Trans>}
                clip="d-mari"
                turns={NEGATION_TALK.turns}
                names={{ second: t`Mari`, main: t`Jaan` }}
                questions={talkQuestions}
              />
            </>
          ),
        },
      ]}
    />
  );
}
