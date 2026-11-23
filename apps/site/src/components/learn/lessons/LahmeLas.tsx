import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  LAS_USES,
  LETS_CONVERSATION,
  LETS_DIALOGUE,
  LETS_FIXES,
  LETS_FIX_ANSWERS,
  LETS_GAPS,
  LETS_GO_TO,
  LETS_HEARD,
  LETS_OPTIONS,
  LETS_VERBS,
  LETS_ANSWERS,
} from "../../../lib/learn/clips";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { ListenRows, Panel, type RowItem } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { Listening, type PassageQuestion } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Word } from "../Word";

const SLUG = "lahme-las";
const src = (text: string) => clipUrl(SLUG, clipId(text));

const VERBS: Record<string, MessageDescriptor> = {
  vaatama: msg`to watch`,
  tegema: msg`to do, to make`,
  lugema: msg`to read`,
  sõitma: msg`to drive, to ride`,
  õppima: msg`to learn`,
  ostma: msg`to buy`,
  jooma: msg`to drink`,
  minema: msg`to go`,
  sööma: msg`to eat`,
  mängima: msg`to play`,
};

const FIX_PROMPTS: Record<string, MessageDescriptor> = {
  "Las nad mängivad õues.": msg`Let them play outside.`,
  "Las ma aitan sind.": msg`Let me help you.`,
  "Me sööme koos.": msg`We eat together.`,
  "Vaatame filmi!": msg`Let’s watch a film!`,
  "Ostame koogi!": msg`Let’s buy a cake!`,
};

const MEANS: Record<string, MessageDescriptor> = {
  "Las ta magab.": msg`Let him or her sleep.`,
  "Las lapsed mängivad õues.": msg`Let the children play outside.`,
  "Las ma aitan sind.": msg`Let me help you.`,
  "Las Mari otsustab.": msg`Let Mari decide.`,
  "Lähme ujuma!": msg`Let’s go swimming!`,
  "Lähme sööma!": msg`Let’s go and eat!`,
  "Lähme koju!": msg`Let’s go home!`,
};

const means = (text: string, i18n: I18n) => {
  const found = MEANS[text];
  return found ? i18n._(found) : "";
};

const GLOSSARY: Glossary = {
  ...Object.fromEntries(
    Object.entries(MEANS).map(([text, en]) => [text.toLowerCase(), { en, show: text }]),
  ),
  las: {
    en: msg`let`,
    note: msg`With a person and usually the present: las ta tuleb, let him or her come.`,
  },
  koos: { en: msg`together` },
  kahekesi: { en: msg`the two of us, just two` },
  õues: { en: msg`outside` },
  lähme: { en: msg`let’s go`, note: msg`Shorter than me läheme, we go.` },
};

type Who = "lets" | "we" | "one" | "las";
const WHOS: readonly Who[] = ["lets", "we", "one", "las"];

const HEARD_MEANS: Record<(typeof LETS_HEARD)[number]["id"], Record<Who, MessageDescriptor>> = {
  minema: {
    lets: msg`Let’s go to the cinema.`,
    we: msg`We’re going to the cinema.`,
    one: msg`Go to the cinema!`,
    las: msg`Let him or her go to the cinema.`,
  },
  sooma: {
    lets: msg`Let’s eat pizza.`,
    we: msg`We’re eating pizza.`,
    one: msg`Eat pizza!`,
    las: msg`Let him or her eat pizza.`,
  },
  vaatama: {
    lets: msg`Let’s watch a film.`,
    we: msg`We’re watching a film.`,
    one: msg`Watch a film!`,
    las: msg`Let him or her watch a film.`,
  },
  mangima: {
    lets: msg`Let’s play outside.`,
    we: msg`We’re playing outside.`,
    one: msg`Play outside!`,
    las: msg`Let him or her play outside.`,
  },
};

export const heardOptions = (id: (typeof LETS_HEARD)[number]["id"], i18n: I18n) =>
  WHOS.map((who) => ({
    id: who,
    label: (
      <span lang={i18n.locale} className="text-lg font-medium tracking-normal">
        {i18n._(HEARD_MEANS[id][who])}
      </span>
    ),
  }));

export const pairRun = <T extends { pair: readonly [string, string] }>(
  items: readonly T[],
  pinned?: T,
): T[] => eachPairFirst(items, pinned);

function LetsTable() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = LETS_VERBS.map((verb) => ({
    id: verb.ma,
    label: i18n._(VERBS[verb.ma] as MessageDescriptor),
    et: verb.ma,
    cells: [
      { form: verb.we, src: src(verb.we) },
      { form: verb.lets, src: src(verb.lets) },
    ],
  }));
  return (
    <Panel>
      <Paradigm
        label={t`We do and let’s of eight verbs`}
        columns={[t`We do`, t`Let’s`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{
          title: t`Tap a form`,
          tip: (
            <Trans>
              Usually, drop <b lang="et">me</b> and say it as a suggestion. Only{" "}
              <b lang="et">minema</b> gets shorter: <b lang="et">lähme</b>.
            </Trans>
          ),
        }}
      />
    </Panel>
  );
}

type GapRun = FormItem & {
  said: string;
  options: readonly string[];
  pair: readonly [string, string];
};

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const forms: FormItem[] = LETS_VERBS.map((verb) => ({
      base: `${verb.ma}, ${verb.n}`,
      gloss: i18n._(VERBS[verb.ma] as MessageDescriptor),
      cue: t`let’s`,
      answers:
        verb.ma === "minema" ? LETS_ANSWERS["lähme"] : [verb.lets.replace(/!$/, "").toLowerCase()],
      src: src(verb.lets),
      said: verb.lets,
      explain:
        verb.ma === "minema" ? (
          <Trans>
            <b lang="et">Me läheme</b> gets shorter: <b lang="et">lähme</b>.
          </Trans>
        ) : (
          <Trans>
            The <b lang="et">me</b> form without <b lang="et">me</b>:{" "}
            <b lang="et">{verb.we.replace(/^me /, "")}</b>.
          </Trans>
        ),
    }));

    const whys: Record<string, ReactNode> = {
      ta: (
        <Trans>
          <b lang="et">Las ta</b>: the present form for <b lang="et">ta</b>.
        </Trans>
      ),
      nad: (
        <Trans>
          <b lang="et">Las nad</b>, <b lang="et">las lapsed</b>: the present form for{" "}
          <b lang="et">nad</b>.
        </Trans>
      ),
      lets: <Trans>You speak to someone and suggest doing it together: let’s.</Trans>,
    };
    const gaps: GapRun[] = LETS_GAPS.map((gap) => {
      const said = `${gap.before} ${gap.answer} ${gap.after}`;
      const kind = gap.id.split("-").at(-1) as string;
      return {
        said,
        base: gap.verb,
        gloss: i18n._(VERBS[gap.verb] as MessageDescriptor),
        cue: `${gap.before} … ${gap.after}`,
        cueLang: "et",
        src: src(said),
        options: LETS_OPTIONS[gap.verb],
        answers: [gap.answer],
        pair: [kind, gap.id] as const,
        explain: whys[kind],
      };
    });

    const heard: (ChoiceItem & { said: string; pair: readonly [string, string] })[] =
      LETS_HEARD.flatMap((group) =>
        WHOS.map((who) => ({
          said: group[who],
          src: src(group[who]),
          answer: who,
          options: heardOptions(group.id, i18n),
          pair: [who, group[who]] as const,
          explain:
            who === "lets" ? (
              <Trans>
                No <b lang="et">me</b>, said as a suggestion: let’s.
              </Trans>
            ) : who === "we" ? (
              <Trans>
                <b lang="et">Me</b> and the <b lang="et">me</b> form: we do it.
              </Trans>
            ) : who === "one" ? (
              <Trans>The command form: you, one person, do it.</Trans>
            ) : (
              <Trans>
                <b lang="et">Las</b> and the form for <b lang="et">ta</b>: let him or her.
              </Trans>
            ),
        })),
      );

    const translations: (SentenceItem & { pair: readonly [string, string] })[] = [
      {
        kind: "translate",
        id: "swim",
        prompt: t`Let’s go swimming!`,
        src: src("Lähme ujuma!"),
        answers: LETS_ANSWERS["Lähme ujuma!"],
        pair: ["lets", "swim"],
        explain: (
          <Trans>
            <b lang="et">Lähme</b> with the <b lang="et">-ma</b> infinitive: go and do it.
          </Trans>
        ),
      },
      {
        kind: "translate",
        id: "children-play",
        prompt: t`Let them play outside.`,
        src: src("Las nad mängivad õues."),
        answers: LETS_ANSWERS["Las nad mängivad õues."],
        pair: ["las", "children-play"],
      },
      {
        kind: "translate",
        id: "help-you",
        prompt: t`Let me help you.`,
        src: src("Las ma aitan sind."),
        answers: LETS_ANSWERS["Las ma aitan sind."],
        pair: ["las", "help-you"],
      },
      {
        kind: "translate",
        id: "eat-together",
        prompt: t`Let’s eat together!`,
        src: src("Sööme koos!"),
        answers: LETS_ANSWERS["Sööme koos!"],
        pair: ["lets", "eat-together"],
      },
      {
        kind: "translate",
        id: "decide",
        prompt: t`Let him decide.`,
        src: src("Las ta otsustab."),
        answers: LETS_ANSWERS["Las ta otsustab."],
        pair: ["las", "decide"],
      },
      {
        kind: "translate",
        id: "buy-cake",
        prompt: t`Let’s buy a cake!`,
        src: src("Ostame koogi!"),
        answers: LETS_ANSWERS["Ostame koogi!"],
        pair: ["lets", "buy-cake"],
        explain: (
          <Trans>
            One whole cake takes the genitive: <b lang="et">koogi</b>.
          </Trans>
        ),
      },
      {
        kind: "translate",
        id: "film-tonight",
        prompt: t`Let’s watch a film tonight!`,
        src: src("Vaatame täna õhtul filmi!"),
        answers: LETS_ANSWERS["Vaatame täna õhtul filmi!"],
        pair: ["lets", "film-tonight"],
      },
    ];

    const fixWhy: Record<string, ReactNode> = {
      "Las ta tuleb.": (
        <Trans>
          After <b lang="et">las</b>, usually the present form: <b lang="et">tuleb</b>.
        </Trans>
      ),
      "Las nad mängivad õues.": (
        <Trans>
          For <b lang="et">nad</b>, the present usually ends in <b lang="et">-vad</b>:{" "}
          <b lang="et">mängivad</b>.
        </Trans>
      ),
      "Las ma aitan sind.": (
        <Trans>
          For <b lang="et">ma</b>, the present ends in <b lang="et">-n</b>: <b lang="et">aitan</b>.
        </Trans>
      ),
      "Vaatame filmi!": (
        <Trans>
          A bare <b lang="et">-ma</b> infinitive is a curt order, like <b lang="et">Magama!</b>, to
          bed! To suggest doing it together: <b lang="et">vaatame</b>.
        </Trans>
      ),
      "Las ta magab.": (
        <Trans>
          After <b lang="et">las</b>, usually the present form: <b lang="et">magab</b>.
        </Trans>
      ),
      "Me sööme koos.": (
        <Trans>
          With <b lang="et">me</b>, the present’s <b lang="et">me</b> form: <b lang="et">sööme</b>.
        </Trans>
      ),
      "Ostame koogi!": (
        <Trans>
          One whole cake takes the genitive: <b lang="et">koogi</b>.
        </Trans>
      ),
    };
    const fixes: FixItem[] = LETS_FIXES.map((item) => ({
      kind: "fix",
      id: `fix-${clipId(item.right)}`,
      wrong: item.wrong,
      prompt: FIX_PROMPTS[item.right]
        ? i18n._(FIX_PROMPTS[item.right] as MessageDescriptor)
        : undefined,
      answers: LETS_FIX_ANSWERS[item.right] ?? [item.right],
      src: src(item.right),
      explain: fixWhy[item.right],
    }));

    const line = (id: keyof typeof LETS_DIALOGUE) => {
      const clip = LETS_DIALOGUE[id];
      return typeof clip === "string" ? clip : clip.text;
    };
    const talk: DialogueTurn[] = [
      { who: "them", clip: "d-kati-1", line: line("d-kati-1") },
      {
        who: "you",
        clip: clipId("Lähme kinno!"),
        replies: [
          { line: "Lähme kinno!", right: true },
          {
            line: "Mine kinno!",
            why: (
              <Trans>
                <b lang="et">Mine</b> tells one person to go. To go together: <b lang="et">lähme</b>
                .
              </Trans>
            ),
          },
          {
            line: "Minema kinno!",
            why: (
              <Trans>
                A bare <b lang="et">-ma</b> infinitive is a curt order, like{" "}
                <b lang="et">Magama!</b>, to bed! To suggest doing it together:{" "}
                <b lang="et">lähme</b>.
              </Trans>
            ),
          },
        ],
      },
      { who: "them", clip: "d-kati-2", line: line("d-kati-2") },
      {
        who: "you",
        clip: "d-sina-2",
        replies: [
          {
            line: "Tule ka!",
            why: (
              <Trans>
                <b lang="et">Tule ka</b> tells Kati to come. About Jaan:{" "}
                <b lang="et">las ta tuleb</b>.
              </Trans>
            ),
          },
          {
            line: "Las ta tulla!",
            why: (
              <Trans>
                After <b lang="et">las</b>, usually the present form: <b lang="et">tuleb</b>.
              </Trans>
            ),
          },
          { line: line("d-sina-2"), right: true },
        ],
      },
      { who: "them", clip: "d-kati-3", line: line("d-kati-3") },
      {
        who: "you",
        clip: "d-sina-3",
        replies: [
          {
            line: "Söö pitsat!",
            why: (
              <Trans>
                <b lang="et">Söö</b> tells one person to eat. To eat together:{" "}
                <b lang="et">sööme</b>.
              </Trans>
            ),
          },
          { line: line("d-sina-3"), right: true },
          {
            line: "Sööma pitsat!",
            why: (
              <Trans>
                A bare <b lang="et">-ma</b> infinitive is a curt order, like{" "}
                <b lang="et">Magama!</b>, to bed! To suggest doing it together:{" "}
                <b lang="et">sööme</b>.
              </Trans>
            ),
          },
        ],
      },
    ];

    const exam: PassageQuestion[] = [
      {
        id: "from",
        ask: t`Where is Liisa coming from?`,
        options: [
          {
            id: "tartu",
            label: (
              <Trans>
                <span lang="et">Tartu</span>, inland
              </Trans>
            ),
          },
          {
            id: "parnu",
            label: (
              <Trans>
                <span lang="et">Pärnu</span>, by the sea
              </Trans>
            ),
          },
          {
            id: "narva",
            label: (
              <Trans>
                <span lang="et">Narva</span>, on the border
              </Trans>
            ),
          },
        ],
        answer: "tartu",
        line: 0,
      },
      {
        id: "hours",
        kind: "short",
        ask: t`How many hours is Liisa’s bus ride? Write the number as Mari says it.`,
        answers: ["kolm", "3"],
        line: 12,
      },
      {
        id: "cafe",
        ask: t`Why doesn’t the café by the sea suit Liisa?`,
        options: [
          { id: "far", label: t`It’s too far` },
          { id: "fish", label: t`She doesn’t eat fish` },
          { id: "shut", label: t`It’s shut` },
        ],
        answer: "fish",
        line: 17,
      },
      {
        id: "football",
        kind: "truefalse",
        ask: t`Jaan would rather watch football.`,
        answer: true,
        line: 26,
      },
      {
        id: "pizza",
        kind: "short",
        ask: t`What will Jaan make? Write it as he says it.`,
        answers: ["pitsa", "pitsat"],
        line: 36,
      },
      {
        id: "many",
        kind: "truefalse",
        ask: t`Mari wants to invite a lot of people.`,
        answer: false,
        line: 42,
      },
      {
        id: "bus",
        ask: t`When does Liisa’s bus leave on Sunday?`,
        options: [
          { id: "one", label: t`At one` },
          { id: "three", label: t`At three` },
          { id: "five", label: t`At five, after dinner` },
        ],
        answer: "three",
        line: 48,
      },
      {
        id: "who",
        kind: "match",
        ask: t`Who says it?`,
        options: [
          { id: "mari", label: t`Mari` },
          { id: "jaan", label: t`Jaan` },
        ],
        statements: [
          { id: "tram", label: t`Let’s take the tram.`, answer: "jaan", line: 9 },
          { id: "rest", label: t`Let her rest.`, answer: "mari", line: 11 },
          { id: "cake", label: t`Let them bring a cake.`, answer: "jaan", line: 33 },
          { id: "invite", label: t`Let’s invite Peeter and Kati too.`, answer: "jaan", line: 32 },
          { id: "eat", label: t`Let’s go and eat now.`, answer: "mari", line: 57 },
        ],
      },
    ];

    return { forms, gaps, heard, translations, fixes, talk, exam };
  }, [t, i18n]);
}

const gapRun = (items: readonly GapRun[], pinned?: GapRun): GapRun[] =>
  eachPairFirst(items, pinned).map((item) =>
    item === pinned ? item : { ...item, options: shuffle([...item.options]) },
  );

export function LahmeLasLesson() {
  const { t, i18n } = useLingui();
  const content = useContent();
  const commands = lessonBySlug("kaskiv")?.n;
  const goingTo = lessonBySlug("ujuma-ujumas-ujumast")?.n;
  const names = { second: t`Mari`, main: t`Jaan` };
  const rowsOf = (texts: readonly string[]): RowItem[] =>
    texts.map((text) => ({ main: text, sub: means(text, i18n), src: src(text) }));

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Let’s go, <b lang="et">lähme</b>, and let him come, <b lang="et">las ta tuleb</b>: two
          short ways to suggest and to allow.
        </Trans>
      }
      facts={[
        <Trans key="m">20 minutes</Trans>,
        <Trans key="q">7 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["las", "koos", "kahekesi", "õues"]}
      recap={[
        <Trans key="1">
          Let’s: usually the present’s <b lang="et">me</b> form without <b lang="et">me</b>.{" "}
          <b lang="et">Teeme! Vaatame!</b> Only <b lang="et">minema</b> gets shorter:{" "}
          <b lang="et">Lähme!</b>
        </Trans>,
        <Trans key="2">
          Let’s go and do it: <b lang="et">lähme</b> with the <b lang="et">-ma</b> infinitive.{" "}
          <b lang="et">Lähme ujuma!</b>
        </Trans>,
        <Trans key="3">
          Let him, let them, let me: <b lang="et">las</b>, the person, and usually the present.{" "}
          <b lang="et">Las ta magab. Las nad mängivad. Las ma aitan.</b>
        </Trans>,
        <Trans key="4">
          To one person, the command form instead: <b lang="et">Mine! Söö!</b>
        </Trans>,
      ]}
      sections={[
        {
          id: "lets",
          title: t`Let’s`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Lesson {commands} taught commands: <b lang="et">istu!</b>, sit! To suggest doing
                    something together, usually take the present’s <b lang="et">me</b> form and drop{" "}
                    <b lang="et">me</b>: <b lang="et">me vaatame</b>, we watch, becomes{" "}
                    <b lang="et">vaatame!</b>, let’s watch. Tap each form in the table to hear it.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Without <b lang="et">me</b>, a sentence can still be a plain statement:{" "}
                    <b lang="et">pühapäeval magame kaua</b>, on Sunday we sleep in. The voice and
                    the exclamation mark make it a suggestion.
                  </Trans>
                </p>
              </Prose>
              <LetsTable />
              <Prose>
                <p>
                  <Trans>
                    Only <b lang="et">minema</b> has a shorter form: <Word w="lähme" />. Careful
                    speech can say <b lang="et">läheme!</b>, but people mostly say{" "}
                    <b lang="et">lähme</b>. With a <b lang="et">-ma</b> infinitive from lesson{" "}
                    {goingTo}, it means let’s go and do it. With a place, it means let’s go there.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rowsOf(LETS_GO_TO)} />
              <Aside>
                <Trans>
                  To say let’s not, use <b lang="et">ärme</b> and the form after <b lang="et">ei</b>
                  : <b lang="et">ärme kutsu</b>, let’s not invite. Formal writing uses{" "}
                  <b lang="et">ärgem</b> with a form in <b lang="et">-gem</b> or{" "}
                  <b lang="et">-kem</b>: <b lang="et">ärgem kutsugem</b>, and{" "}
                  <b lang="et">tehkem</b> for let’s do. You will read those in slogans.
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>
                    Each round gives a verb’s <b lang="et">-ma</b> infinitive and its present for{" "}
                    <b lang="et">ma</b>. Type its let’s form.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="make-lets"
                title={<Trans>Type the let’s form</Trans>}
                items={content.forms}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight, typed in full.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Find the me form of the ones you got wrong.</Trans>
                  ) : (
                    <Trans>Tap each form in the table once more, then try again.</Trans>
                  )
                }
                recall={formRecall}
                round={(props) => <FormRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "las",
          title: t`Let him, let them`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    To let someone do something, or to say you don’t mind, put <Word w="las" />{" "}
                    before the person and the present: <b lang="et">las ta tuleb</b>, let him come.
                    With <b lang="et">ma</b>, it offers to do something yourself:{" "}
                    <b lang="et">las ma aitan</b>, let me help. In writing you’ll also see a form in{" "}
                    <b lang="et">-gu</b>: <b lang="et">las ta tulgu</b>.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rowsOf(LAS_USES)} />
              <Prose>
                <p>
                  <Trans>
                    Pick the form that fits the words before the gap, then hear the sentence.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="lets-or-las"
                title={<Trans>Which form?</Trans>}
                items={content.gaps}
                rounds={9}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All nine: the right form every time.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Look at who comes before the gap.</Trans>
                  ) : (
                    <Trans>Listen to the sentences above once more, then try again.</Trans>
                  )
                }
                recall={formRecall}
                order={gapRun}
                round={(props) => <FormRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "hear",
          title: t`Let’s, we do, do it, let him`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    One verb can suggest, state, order or allow. Hear a sentence, then pick what it
                    means. Listen for <b lang="et">me</b>, for <b lang="et">las</b>, and for the
                    short command form.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="hear-who"
                title={<Trans>What does it mean?</Trans>}
                items={content.heard}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight: right every time.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you got wrong once more.</Trans>
                  ) : (
                    <Trans>Play the sentences you missed once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: item.src })}
                order={(items, pinned) =>
                  eachPairFirst(items, pinned).map((item) =>
                    item === pinned ? item : { ...item, options: shuffle(item.options) },
                  )
                }
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "sentences",
          title: t`Suggest or allow`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Write each sentence in Estonian. Ask first: is it a suggestion to do it
                    together, or is it <b lang="et">las</b>, letting someone do it?
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="write-lets"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.translations}
                rounds={7}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All seven, each with the right form.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the verb in the ones you got wrong.</Trans>
                  ) : (
                    <Trans>Read What to remember below, then try again.</Trans>
                  )
                }
                recall={sentenceRecall}
                order={pairRun}
                round={(props) => <SentenceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "fix",
          title: t`Fix the mistake`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each sentence has one word in the wrong form. Tap it, then type it right.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-lets"
                title={<Trans>Fix the sentence</Trans>}
                items={content.fixes}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six found and fixed.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Read the reason under each one you got wrong.</Trans>
                  ) : (
                    <Trans>Read What to remember below, then try again.</Trans>
                  )
                }
                recall={fixRecall}
                round={(props) => <FixRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "plans",
          title: t`Making plans`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    You and Kati plan Saturday. Pick what you say back. A wrong reply says why, then
                    you hear the right one.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="saturday-plans"
                title={<Trans>Talk: what shall we do?</Trans>}
                part={
                  <Trans>
                    You want to go to the cinema, you’re happy for Jaan to come, and after the film
                    you want pizza.
                  </Trans>
                }
                them={t`Kati`}
                turns={content.talk}
              />
            </>
          ),
        },
        {
          id: "weekend",
          title: t`A weekend with Liisa`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Mari’s sister is coming to Tallinn. Mari and Jaan plan her weekend.</Trans>
                </p>
              </Prose>
              <Listening
                id="liisa-weekend"
                title={<Trans>Listen: Mari and Jaan</Trans>}
                clip="c-weekend"
                turns={LETS_CONVERSATION.turns}
                names={names}
                questions={content.exam}
                plays={2}
              />
            </>
          ),
        },
      ]}
    />
  );
}
