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
import { Chips, Panel } from "../Explore";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
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
  lugema: { en: msg`to read`, note: msg`Its I form in the present is loen.`, clip: false },
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

/** One verb as a pair: the I form of the present with its -n lit, and its no, each to tap. */
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
        <Trans key="m">8 minutes</Trans>,
        <Trans key="q">2 quizzes</Trans>,
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
          After <b lang="et">ei</b> comes the I form of the present without its -n:{" "}
          <b lang="et">loen</b>, <b lang="et">ei loe</b>.
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
                    To find the form that follows ei, take the I form of the present from lesson{" "}
                    {present} and drop the -n. <Word w="Loen" /> becomes <Word w="ei loe" />, and{" "}
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
                  from the I form of the present, not the -ma infinitive, and the no follows:{" "}
                  <Word w="ei loe" />.
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
      ]}
    />
  );
}
