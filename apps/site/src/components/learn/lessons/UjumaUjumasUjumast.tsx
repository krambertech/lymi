import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo } from "react";
import { LESSONS, lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  GOING_KEYS,
  GOING_SCENE,
  GOING_SORT,
  GOING_VERBS,
  GOING_VOICE,
  type GoingVerb,
  goingForm,
  goingSentence,
  WAYS,
  type Way,
} from "../../../lib/learn/clips";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Keys, Panel } from "../Explore";
import { Aside, LessonView, Prose } from "../LessonView";
import type { Glossary } from "../lesson-context";
import { Lit, Paradigm, type ParadigmRow } from "../Paradigm";
import { Listening, type PassageQuestion } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { Scene, type ScenePlace } from "../Scene";
import { Sort, type SortBin, type SortItem } from "../Sort";
import { Word } from "../Word";

const SLUG = "ujuma-ujumas-ujumast";
/** A clip by what it says. */
const src = (text: string) => clipUrl(SLUG, clipId(text));

type Verb = GoingVerb["verb"];

/** What each activity means, by its -ma form. */
const VERB_MEANS: Record<Verb, MessageDescriptor> = {
  ujuma: msg`to swim`,
  jooksma: msg`to run`,
  sööma: msg`to eat`,
  "kohvi jooma": msg`to drink coffee`,
};

/** Each activity in each way, as the quiz’s answers say it. */
const WAY_MEANS: Record<Verb, Record<Way, MessageDescriptor>> = {
  ujuma: {
    ma: msg`going swimming`,
    mas: msg`out swimming`,
    mast: msg`back from swimming`,
  },
  jooksma: {
    ma: msg`going for a run`,
    mas: msg`out running`,
    mast: msg`back from a run`,
  },
  sööma: {
    ma: msg`going to eat`,
    mas: msg`out eating`,
    mast: msg`back from eating`,
  },
  "kohvi jooma": {
    ma: msg`going for a coffee`,
    mas: msg`out for a coffee`,
    mast: msg`back from coffee`,
  },
};

/** What each of Mari’s sentences in the table means. */
const MARI_MEANS: Record<Verb, Record<Way, MessageDescriptor>> = {
  ujuma: {
    ma: msg`Mari is going swimming.`,
    mas: msg`Mari is out swimming.`,
    mast: msg`Mari is coming back from swimming.`,
  },
  jooksma: {
    ma: msg`Mari is going for a run.`,
    mas: msg`Mari is out running.`,
    mast: msg`Mari is coming back from a run.`,
  },
  sööma: {
    ma: msg`Mari is going to eat.`,
    mas: msg`Mari is out eating.`,
    mast: msg`Mari is coming back from eating.`,
  },
  "kohvi jooma": {
    ma: msg`Mari is going for a coffee.`,
    mas: msg`Mari is out for a coffee.`,
    mast: msg`Mari is coming back from coffee.`,
  },
};

/** What each sentence of the verb keys says. */
const KEY_MEANS: Record<(typeof GOING_KEYS)[number]["said"], MessageDescriptor> = {
  "Ma lähen ujuma.": msg`I’m going swimming.`,
  "Ma olen ujumas.": msg`I’m out swimming.`,
  "Ma käin iga päev ujumas.": msg`I go swimming every day.`,
  "Ma tulen ujumast.": msg`I’m coming back from swimming.`,
  "Tule sööma!": msg`Come and eat.`,
};

const verbOf = (name: Verb) => GOING_VERBS.find((each) => each.verb === name) as GoingVerb;
const ujuma = verbOf("ujuma");
const jooksma = verbOf("jooksma");

/** Mari’s sentences glossed: “mari on ujumas.” for each activity the prose shows. */
const mariGlosses = (verb: GoingVerb) =>
  WAYS.map((way) => {
    const said = goingSentence(verb, way);
    return [said.toLowerCase(), { en: MARI_MEANS[verb.verb][way], show: said }] as const;
  });

const GLOSSARY: Glossary = {
  ...Object.fromEntries([...mariGlosses(ujuma), ...mariGlosses(jooksma)]),
  ...Object.fromEntries(
    GOING_KEYS.map(({ said }) => [said.toLowerCase(), { en: KEY_MEANS[said], show: said }]),
  ),
  majja: { en: msg`into the house`, note: msg`Kuhu? From maja, a house.` },
  majas: { en: msg`in the house`, note: msg`Kus? From maja, a house.` },
  majast: { en: msg`out of the house`, note: msg`Kust? From maja, a house.` },
  poodi: { en: msg`to the shop`, note: msg`Kuhu? From pood, a shop.` },
  poes: { en: msg`in the shop`, note: msg`Kus? From pood, a shop.` },
  poest: { en: msg`from the shop`, note: msg`Kust? From pood, a shop.` },
  ujuma: { en: msg`to swim`, note: msg`The -ma form. After lähen: going swimming.` },
  ujumas: { en: msg`out swimming`, note: msg`Kus? The -ma form plus -s.` },
  ujumast: { en: msg`back from swimming`, note: msg`Kust? The -ma form plus -st.` },
  "jooksmas.": { en: msg`Out running.`, show: "Jooksmas." },
  "kus mari on?": { en: msg`Where is Mari?`, show: "Kus Mari on?" },
  "kuhu sa lähed?": { en: msg`Where are you going?`, show: "Kuhu sa lähed?" },
  "kust sa tuled?": { en: msg`Where are you coming from?`, show: "Kust sa tuled?" },
  lähen: { en: msg`I go, I’m going`, note: msg`From minema, to go.` },
  olen: { en: msg`I am`, note: msg`From olema, to be.` },
  käin: {
    en: msg`I go and come back; I go regularly`,
    note: msg`From käima.`,
  },
  käima: { en: msg`to go and come back; to go regularly`, note: msg`Its I form is käin.` },
  tulen: { en: msg`I come, I’m coming`, note: msg`From tulema, to come.` },
  tulema: { en: msg`to come`, note: msg`Its I form is tulen.` },
  "iga päev": { en: msg`every day` },
};

/** An Estonian ending in running text: read in Estonian, never split after its hyphen. */
function End({ children }: { children: ReactNode }) {
  return (
    <span lang="et" className="whitespace-nowrap">
      {children}
    </span>
  );
}

/** The cat goes into the house to eat, eats, and comes back out. */
function CatScene() {
  const { t } = useLingui();
  const said: Record<(typeof GOING_SCENE)[number]["id"], { meaning: string; gloss: string }> = {
    majja: { meaning: t`going to eat`, gloss: t`The cat is going in to eat.` },
    majas: { meaning: t`busy eating`, gloss: t`The cat is in there, eating.` },
    majast: { meaning: t`back from eating`, gloss: t`The cat is coming back from eating.` },
  };
  const places: ScenePlace[] = GOING_SCENE.map((place) => ({
    ...place,
    ...said[place.id],
    src: src(place.sentence),
  }));
  return (
    <Panel>
      <Scene
        scene="house"
        label={t`A cat and a house`}
        keysLabel={t`Where the cat is`}
        places={places}
      />
    </Panel>
  );
}

/** Which question each column answers, as the line under the table says it. */
function WayNote({ way, means }: { way: Way; means: string }) {
  switch (way) {
    case "ma":
      return (
        <Trans>
          <b lang="et">Kuhu?</b> {means}
        </Trans>
      );
    case "mas":
      return (
        <Trans>
          <b lang="et">Kus?</b> {means}
        </Trans>
      );
    case "mast":
      return (
        <Trans>
          <b lang="et">Kust?</b> {means}
        </Trans>
      );
  }
}

/** Four activities going, there and coming back; a tap plays Mari’s sentence. */
function WayTable() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = GOING_VERBS.map((verb) => ({
    id: verb.verb,
    label: i18n._(VERB_MEANS[verb.verb]),
    et: verb.verb,
    cells: WAYS.map((way) => ({
      form: `${verb.stem}|${way}`,
      src: src(goingSentence(verb, way)),
      note: <WayNote way={way} means={i18n._(MARI_MEANS[verb.verb][way])} />,
    })),
  }));
  return (
    <Panel>
      <Paradigm
        label={t`Four activities: going, there and coming back`}
        columns={[
          t({ message: "Going", context: "setting off to do something" }),
          t({ message: "There", context: "away, doing something" }),
          t({ message: "Coming back", context: "from doing something" }),
        ]}
        rows={rows}
        empty={{ title: t`Tap a form`, tip: t`You’ll hear it in a sentence about Mari.` }}
      />
    </Panel>
  );
}

/** The line under a verb key: where the verb comes from and the form it takes. */
function KeyTip({ lead }: { lead: (typeof GOING_KEYS)[number]["lead"] }) {
  switch (lead) {
    case "lähen":
      return (
        <Trans>
          From <span lang="et">minema</span>. You set off to do it, so <End>-ma</End>.
        </Trans>
      );
    case "olen":
      return (
        <Trans>
          From <span lang="et">olema</span>. You’re there doing it, so <End>-mas</End>.
        </Trans>
      );
    case "käin":
      return (
        <Trans>
          From <span lang="et">käima</span>. You go and come back, or go regularly. It takes{" "}
          <End>-mas</End>.
        </Trans>
      );
    case "tulen":
      return (
        <Trans>
          From <span lang="et">tulema</span>. You’re coming back from it, so <End>-mast</End>.
        </Trans>
      );
    case "tule":
      return (
        <Trans>
          <span lang="et">Tulema</span> again, as a command: come here to do it, so <End>-ma</End>.
        </Trans>
      );
  }
}

/** Keys for the verbs before the forms: each plays its sentence, the form’s ending lit. */
function VerbKeys() {
  const { t, i18n } = useLingui();
  return (
    <Panel>
      <Keys
        label={t`Verbs before the form`}
        columns={5}
        phoneColumns={3}
        empty={{
          title: <Trans>Tap a verb</Trans>,
          tip: <Trans>You’ll hear it in a sentence.</Trans>,
        }}
        items={GOING_KEYS.map((key) => ({
          label: key.lead,
          sub: <Lit form={key.form} />,
          src: src(key.said),
          detail: {
            title: (
              <>
                <span lang="et">{key.said}</span>{" "}
                <small className="ms-1 text-md font-normal text-ink-secondary">
                  {i18n._(KEY_MEANS[key.said])}
                </small>
              </>
            ),
            tip: <KeyTip lead={key.lead} />,
          },
        }))}
      />
    </Panel>
  );
}

/**
 * “Going, out or back?”: each activity heard alone in each way, keyed by the way. The first is
 * not the lesson’s headline example, and its answer is not in the first place.
 */
export const HEARD = [
  ...GOING_VERBS.flatMap((verb) =>
    WAYS.map((way) => ({
      verb: verb.verb,
      way,
      said: goingForm(verb, way),
      pair: [way, goingForm(verb, way)] as const,
    })),
  ),
].sort((a, b) => Number(b.said === "jooksmast") - Number(a.said === "jooksmast"));

/** The three ways in a turned order, so the first round’s answer isn’t always in one place. */
const turned = (i: number): Way[] => {
  const turn = i % 3;
  return [...WAYS.slice(turn), ...WAYS.slice(0, turn)];
};

type HeardItem = ChoiceItem & {
  said: string;
  verb: Verb;
  pair: readonly [string, string];
};

const heardOptions = (verb: Verb, ways: readonly Way[], i18n: I18n) =>
  ways.map((way) => ({
    id: way,
    label: <span lang={i18n.locale}>{i18n._(WAY_MEANS[verb][way])}</span>,
  }));

/** The form and what it says, after an answer. */
function Explain({ verb, way }: { verb: Verb; way: Way }) {
  const { i18n } = useLingui();
  return (
    <>
      <span lang="et" className="font-medium text-ink">
        {goingForm(verbOf(verb), way)}
      </span>{" "}
      {i18n._(WAY_MEANS[verb][way])}
    </>
  );
}

/** Where Kati’s family is, by what her message says. */
function voiceQuestions(t: (descriptor: MessageDescriptor) => string): PassageQuestion[] {
  return [
    {
      id: "mum",
      ask: t(msg`Where is Kati’s mum?`),
      options: [
        { id: "home", label: t(msg`At home`) },
        { id: "out", label: t(msg`Out swimming`) },
        { id: "off", label: t(msg`On her way to swim`) },
      ],
      answer: "out",
      line: 1,
    },
    {
      id: "dad",
      ask: t(msg`What is her dad doing at five?`),
      options: [
        { id: "off", label: t(msg`Setting off for a run`) },
        { id: "town", label: t(msg`Running in town`) },
        { id: "back", label: t(msg`Coming back from his run`) },
      ],
      answer: "back",
      line: 3,
    },
    {
      id: "ask",
      ask: t(msg`What does Kati ask Jaan to do?`),
      options: [
        { id: "eat", label: t(msg`Come and eat`) },
        { id: "wait", label: t(msg`Wait for her dad at home`) },
        { id: "swim", label: t(msg`Go swimming with her mum`) },
      ],
      answer: "eat",
      line: 5,
    },
  ];
}

export function UjumaUjumasUjumastLesson() {
  const { t, i18n } = useLingui();
  const inOut = LESSONS.find((lesson) => lesson.et === "Majas, majja, majast")?.n;
  const infinitives = lessonBySlug("tegevusnimed")?.n;

  const heardItems = useMemo<HeardItem[]>(
    () =>
      HEARD.map(({ verb, way, said, pair }, i) => ({
        said,
        verb,
        pair,
        src: src(said),
        answer: way,
        options: heardOptions(verb, turned(i), i18n),
        explain: <Explain verb={verb} way={way} />,
      })),
    [i18n],
  );

  // The three ways are the same for each activity, so only their order changes between rounds.
  const heardRun = (items: readonly HeardItem[], pinned?: HeardItem): HeardItem[] =>
    eachPairFirst(items, pinned).map((item) =>
      item === pinned ? item : { ...item, options: heardOptions(item.verb, shuffle(WAYS), i18n) },
    );

  const bins: SortBin[] = [
    {
      id: "kuhu",
      label: "kuhu?",
      hint: <Trans>where to</Trans>,
      rule: (
        <Trans>
          Where to: an activity in <End>-ma</End>, or a place such as <span lang="et">poodi</span>.
        </Trans>
      ),
    },
    {
      id: "kus",
      label: "kus?",
      hint: <Trans>where</Trans>,
      rule: (
        <Trans>
          Where: an activity in <End>-mas</End>, or a place in <End>-s</End> such as{" "}
          <span lang="et">poes</span>.
        </Trans>
      ),
    },
    {
      id: "kust",
      label: "kust?",
      hint: <Trans>where from</Trans>,
      rule: (
        <Trans>
          Where from: an activity in <End>-mast</End>, or a place in <End>-st</End> such as{" "}
          <span lang="et">poest</span>.
        </Trans>
      ),
    },
  ];
  const sorted: SortItem[] = GOING_SORT.map(({ w, bin }) => ({ w, bin, src: src(w) }));

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          <span lang="et">Lähen ujuma</span> is I’m going swimming,{" "}
          <span lang="et">olen ujumas</span> I’m out swimming, and{" "}
          <span lang="et">tulen ujumast</span> I’m coming back from swimming. The ending says which.
        </Trans>
      }
      facts={[
        <Trans key="m">12 minutes</Trans>,
        <Trans key="q">A quiz by ear, a sort and a voice message</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["ujuma", "ujumas", "ujumast", "käima", "tulema", "iga päev", "kust sa tuled?"]}
      recap={[
        <Trans key="1">
          The <End>-ma</End> form says where someone is going: <b lang="et">Mari läheb ujuma.</b>
        </Trans>,
        <Trans key="2">
          With <End>-mas</End>, they’re there, busy with it: <b lang="et">Mari on ujumas.</b>{" "}
          <b lang="et">Käin</b> takes it too: <b lang="et">Ma käin iga päev ujumas.</b>
        </Trans>,
        <Trans key="3">
          With <End>-mast</End>, they’re coming back from it: <b lang="et">Mari tuleb ujumast.</b>
        </Trans>,
        <Trans key="4">
          The three answer <b lang="et">kuhu?</b>, <b lang="et">kus?</b> and <b lang="et">kust?</b>,
          as <b lang="et">poodi</b>, <b lang="et">poes</b> and <b lang="et">poest</b> do.
        </Trans>,
        <Trans key="5">
          <b lang="et">Tulema</b> takes <End>-mast</End> or <End>-ma</End>:{" "}
          <b lang="et">Ma tulen ujumast. Tule sööma!</b>
        </Trans>,
      ]}
      sections={[
        {
          id: "three-ways",
          title: t`Going, there, coming back`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In lesson {inOut}, a place has a form for each question: <Word w="majja" /> for{" "}
                    <b lang="et">kuhu?</b>, where to, <Word w="majas" /> for <b lang="et">kus?</b>,
                    where, and <Word w="majast" /> for <b lang="et">kust?</b>, where from.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    An activity has the same three, built on its <End>-ma</End> form:{" "}
                    <Word w="Mari läheb ujuma." /> <Word w="Mari on ujumas." />{" "}
                    <Word w="Mari tuleb ujumast." /> She’s going swimming, she’s out swimming, and
                    she’s on her way back.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Tap a word to hear its sentence and see the cat go in to eat, eat, and come back
                    out.
                  </Trans>
                </p>
              </Prose>
              <CatScene />
            </>
          ),
        },
        {
          id: "forms",
          title: t`Where to, where and where from`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    The <End>-ma</End> form says where someone is going:{" "}
                    <Word w="Mari läheb jooksma." /> You met it after <span lang="et">lähen</span>{" "}
                    in lesson {infinitives}.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Add <End>-s</End> and it says where someone is, away and busy with it:{" "}
                    <Word w="Mari on jooksmas." /> Add <End>-st</End> and it says what they’re
                    coming back from: <Word w="Mari tuleb jooksmast." />
                  </Trans>
                </p>
                <p>
                  <Trans>
                    They’re the <End>-s</End> and <End>-st</End> of <span lang="et">majas</span> and{" "}
                    <span lang="et">majast</span>. Asked <Word w="Kus Mari on?" />, you can answer
                    with the form alone: <Word w="Jooksmas." /> Tap a form to hear it in a sentence.
                  </Trans>
                </p>
              </Prose>
              <WayTable />
            </>
          ),
        },
        {
          id: "hear",
          title: t`Going, out or back?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each round plays one form on its own, with no sentence around it. Only its
                    ending tells you which: <End>-ma</End>, <End>-mas</End> or <End>-mast</End>.
                    Pick what it says.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="going-out-back"
                title={<Trans>Going, out or back?</Trans>}
                items={heardItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six. You heard every ending.</Trans>
                  ) : share >= 0.6 ? (
                    <Trans>
                      Nearly. Play the ones you missed and listen for the last sound:{" "}
                      <span lang="et">a</span>, <span lang="et">s</span> or <span lang="et">t</span>
                      .
                    </Trans>
                  ) : (
                    <Trans>Tap the forms in the table above once more, then try again.</Trans>
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
          id: "places",
          title: t`Places and activities`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    A place and an activity answer the same three questions. To{" "}
                    <Word w="Kuhu sa lähed?" /> you can answer <Word w="poodi" />, to the shop, or{" "}
                    <Word w="ujuma" />, swimming.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The same goes for <Word w="Kus Mari on?" />, with <Word w="poes" /> or{" "}
                    <Word w="ujumas" />, and for <Word w="Kust sa tuled?" />, with{" "}
                    <Word w="poest" /> or <Word w="ujumast" />.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Put each word under the question it answers. Tap a word to hear it, then tap its
                    question.
                  </Trans>
                </p>
              </Prose>
              <Sort
                id="sort-questions"
                title={<Trans>Which question does it answer?</Trans>}
                bins={bins}
                items={sorted}
              />
            </>
          ),
        },
        {
          id: "verbs",
          title: t`The verb before the form`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    The verb before the form fits it. <Word w="Lähen" /> means you’re setting off,
                    so it takes <End>-ma</End>: <Word w="Ma lähen ujuma." /> <Word w="Olen" /> means
                    you’re there, so <End>-mas</End>: <Word w="Ma olen ujumas." />
                  </Trans>
                </p>
                <p>
                  <Trans>
                    <Word w="Käin" />, from <Word w="käima" />, means you go and come back, or go
                    regularly. It takes <End>-mas</End>, not <End>-ma</End>:{" "}
                    <Word w="Ma käin iga päev ujumas." />
                  </Trans>
                </p>
                <p>
                  <Trans>
                    <Word w="Tulen" />, from <Word w="tulema" />, takes <End>-mast</End> when you
                    come back from something: <Word w="Ma tulen ujumast." /> It takes <End>-ma</End>{" "}
                    when you come to do something: <Word w="Tule sööma!" /> Tap a verb to hear its
                    sentence.
                  </Trans>
                </p>
              </Prose>
              <VerbKeys />
              <Aside>
                <Trans>
                  After <span lang="et">tulen</span>, only the ending tells you which way:{" "}
                  <span lang="et">tulen sööma</span> is I’m coming to eat, and{" "}
                  <span lang="et">tulen söömast</span> is I’m coming back from eating.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "voice",
          title: t`Where is everyone?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kati leaves Jaan a voice message about her family. Listen for where each of them
                    is and what she asks Jaan to do.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="kati-voice"
                title={<Trans>Listen: Kati’s message</Trans>}
                clip="p-voice"
                sentences={GOING_VOICE}
                questions={voiceQuestions((descriptor) => i18n._(descriptor))}
              />
            </>
          ),
        },
      ]}
    />
  );
}
