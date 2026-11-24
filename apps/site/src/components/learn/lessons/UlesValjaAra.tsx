import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  PV_ANSWERS,
  PV_CONVERSATION,
  PV_FIX_ANSWERS,
  PV_FIXES,
  PV_GAPS,
  PV_GROUPS,
  PV_NOTE,
  PV_ORDER,
  PV_PARTICLES,
  PV_TELL,
  PV_TRANSLATE,
} from "../../../lib/learn/clips";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Chips, Panel } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Match, type MatchPair } from "../Match";
import { type OrderItem, OrderRound } from "../OrderRound";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { Listening, type PassageQuestion, Reading } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Word } from "../Word";

const SLUG = "ules-valja-ara";
const src = (text: string) => clipUrl(SLUG, clipId(text));
const gapSaid = (gap: { before: string; answer: string; after: string }) =>
  `${gap.before} ${gap.answer}${/^[.,!?]/.test(gap.after) ? "" : " "}${gap.after}`;

type Group = keyof typeof PV_GROUPS;

const VERB_MEANS: Record<string, MessageDescriptor> = {
  "üles tõusma": msg`to get up`,
  "üles ärkama": msg`to wake up`,
  "üles kirjutama": msg`to write down`,
  "alla tulema": msg`to come down`,
  "maha istuma": msg`to sit down`,
  "sisse tulema": msg`to come in`,
  "sisse minema": msg`to go in`,
  "välja minema": msg`to go out`,
  "välja võtma": msg`to take out`,
  "ära minema": msg`to leave, to go away`,
  "ära sööma": msg`to eat up`,
  "ära viskama": msg`to throw away`,
  "tagasi tulema": msg`to come back`,
  "lahti tegema": msg`to open`,
  "kinni panema": msg`to close`,
};

const PARTICLE_MEANS: Record<(typeof PV_PARTICLES)[number], MessageDescriptor> = {
  üles: msg`up`,
  alla: msg`down`,
  sisse: msg`in, inside`,
  välja: msg`out`,
  ära: msg`away, completely`,
  tagasi: msg`back`,
  lahti: msg`open`,
  kinni: msg`closed, shut`,
};

const GLOSSARY: Glossary = {
  üles: { en: msg`up`, note: msg`Ma tõusen kell seitse üles.` },
  alla: { en: msg`down`, note: msg`Tule palun alla!` },
  sisse: { en: msg`in, inside`, note: msg`Tule sisse!` },
  välja: { en: msg`out`, note: msg`Me läheme õhtul välja.` },
  ära: { en: msg`away, completely`, note: msg`Ta läks juba ära.` },
  tagasi: { en: msg`back`, note: msg`Ma tulen kell kuus tagasi.` },
  lahti: { en: msg`open`, note: msg`Ma tegin akna lahti.` },
  kinni: { en: msg`closed, shut`, note: msg`Pane palun uks kinni.` },
  "üles tõusma": { en: msg`to get up` },
  "üles kirjutama": { en: msg`to write down` },
  "ära viskama": { en: msg`to throw away` },
  "lahti tegema": { en: msg`to open` },
  "kinni panema": { en: msg`to close` },
};

const GAP_MEANS: Record<(typeof PV_GAPS)[number]["id"], MessageDescriptor> = {
  rise: msg`I get up at seven.`,
  in: msg`Please come in, it’s warm here.`,
  out: msg`We’re going out in the evening.`,
  close: msg`Please close the door.`,
  open: msg`Open the window, it’s hot here.`,
  back: msg`I’m coming back tomorrow.`,
  eat: msg`He ate up the whole cake.`,
  down: msg`We’re taking the boxes down.`,
};

const GAP_WHY: Record<(typeof PV_GAPS)[number]["id"], ReactNode> = {
  rise: (
    <Trans>
      <b lang="et">Üles tõusma</b> is to get up.
    </Trans>
  ),
  in: (
    <Trans>
      <b lang="et">Sisse tulema</b> is to come in.
    </Trans>
  ),
  out: (
    <Trans>
      <b lang="et">Välja minema</b> is to go out.
    </Trans>
  ),
  close: (
    <Trans>
      <b lang="et">Kinni panema</b> is to close.
    </Trans>
  ),
  open: (
    <Trans>
      <b lang="et">Lahti tegema</b> is to open.
    </Trans>
  ),
  back: (
    <Trans>
      <b lang="et">Tagasi tulema</b> is to come back.
    </Trans>
  ),
  eat: (
    <Trans>
      <b lang="et">Ära sööma</b> is to eat something all up.
    </Trans>
  ),
  down: (
    <Trans>
      <b lang="et">Alla viima</b> is to take down.
    </Trans>
  ),
};

const TELL_OPTIONS = {
  particle: msg`Away or finished`,
  dont: msg`Don’t do it`,
} as const;
type TellKind = keyof typeof TELL_OPTIONS;

const TELL_WHY: Record<TellKind, ReactNode> = {
  particle: (
    <Trans>
      After the verb, <b lang="et">ära</b> usually means away or finished.
    </Trans>
  ),
  dont: (
    <Trans>
      Before a command, <b lang="et">ära</b> says don’t.
    </Trans>
  ),
};

const ORDER_MEANS: Record<(typeof PV_ORDER)[number]["id"], MessageDescriptor> = {
  rise: msg`I get up at seven.`,
  write: msg`I’ll write down the number.`,
  "must-rise": msg`I have to get up early.`,
  "close-door": msg`Can you close the door?`,
  "go-out": msg`We’re going out in the evening.`,
  "give-back": msg`I’ll give the book back tomorrow.`,
};

const ORDER_WHY: Record<(typeof PV_ORDER)[number]["id"], ReactNode> = {
  rise: (
    <Trans>
      In a statement with one verb, the particle usually goes to the end:{" "}
      <b lang="et">tõusen … üles</b>.
    </Trans>
  ),
  write: (
    <Trans>
      In a statement with one verb, the particle usually comes after the object:{" "}
      <b lang="et">kirjutan numbri üles</b>.
    </Trans>
  ),
  "must-rise": (
    <Trans>
      With <b lang="et">pean</b>, the particle usually stays right before the <b lang="et">-ma</b>{" "}
      verb: <b lang="et">üles tõusma</b>.
    </Trans>
  ),
  "close-door": (
    <Trans>
      With <b lang="et">saad</b>, the particle usually stays right before the <b lang="et">-da</b>{" "}
      verb: <b lang="et">kinni panna</b>.
    </Trans>
  ),
  "go-out": (
    <Trans>
      In a statement with one verb, <b lang="et">välja</b> usually comes at the end.
    </Trans>
  ),
  "give-back": (
    <Trans>
      In a statement with one verb, <b lang="et">tagasi</b> usually comes at the end.
    </Trans>
  ),
};

const TRANSLATE_PROMPTS: Record<(typeof PV_TRANSLATE)[number], MessageDescriptor> = {
  "Ma tõusen kell seitse üles.": msg`I get up at seven.`,
  "Pane palun uks kinni.": msg`Please close the door.`,
  "Ma tegin akna lahti.": msg`I opened the window.`,
  "Ta läks juba ära.": msg`He or she already left.`,
  "Ma tulen kell kuus tagasi.": msg`I’ll come back at six.`,
  "Ma kirjutan numbri üles.": msg`I’ll write the number down.`,
  "Ma pean vara üles tõusma.": msg`I have to get up early.`,
  "Me läheme õhtul välja.": msg`We’re going out in the evening.`,
};

const FIX_PROMPTS: Record<(typeof PV_FIXES)[number]["id"], MessageDescriptor> = {
  open: msg`I opened the window.`,
  close: msg`Please close the door.`,
  "come-in": msg`Come in, it’s warm here!`,
  rise: msg`I get up at seven.`,
  back: msg`I’m coming back tomorrow.`,
  write: msg`I’ll write the number down.`,
};

const FIX_WHY: Record<(typeof PV_FIXES)[number]["id"], ReactNode> = {
  open: (
    <Trans>
      To open is <b lang="et">lahti tegema</b>, not <b lang="et">kinni</b>.
    </Trans>
  ),
  close: (
    <Trans>
      To close is <b lang="et">kinni panema</b>, not <b lang="et">lahti</b>.
    </Trans>
  ),
  "come-in": (
    <Trans>
      To come in is <b lang="et">sisse tulema</b>, not <b lang="et">välja</b>.
    </Trans>
  ),
  rise: (
    <Trans>
      To get up is <b lang="et">üles tõusma</b>, not <b lang="et">alla</b>.
    </Trans>
  ),
  back: (
    <Trans>
      To come back is <b lang="et">tagasi tulema</b>, not <b lang="et">ära</b>.
    </Trans>
  ),
  write: (
    <Trans>
      To write down is <b lang="et">üles kirjutama</b>, literally write up.
    </Trans>
  ),
};

function ParticleTable() {
  const { t, i18n } = useLingui();
  const [group, setGroup] = useState<Group>("updown");
  const rows: ParadigmRow[] = PV_GROUPS[group].map((each) => ({
    id: each.verb,
    label: i18n._(VERB_MEANS[each.verb] as MessageDescriptor),
    cells: [
      { form: each.verb, src: src(each.verb) },
      { form: each.said, src: src(each.said) },
    ],
  }));
  const tips: Record<Group, ReactNode> = {
    updown: (
      <Trans>
        <b lang="et">Üles</b> is up, <b lang="et">alla</b> is down, and <b lang="et">maha</b> is
        down onto a surface.
      </Trans>
    ),
    inout: (
      <Trans>
        <b lang="et">Sisse</b> is in, and <b lang="et">välja</b> is out.
      </Trans>
    ),
    away: (
      <Trans>
        <b lang="et">Ära</b> means away or finished, <b lang="et">tagasi</b> back,{" "}
        <b lang="et">lahti</b> open and <b lang="et">kinni</b> closed.
      </Trans>
    ),
  };
  return (
    <Panel className="gap-5">
      <Chips
        label={t`Group`}
        items={[
          { label: t`Up and down`, value: "updown" as const },
          { label: t`In and out`, value: "inout" as const },
          { label: t`Away, back, open`, value: "away" as const },
        ]}
        value={group}
        onPick={setGroup}
      />
      <Paradigm
        key={group}
        label={t`Particle verbs`}
        columns={[t`Dictionary`, t`In a sentence`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{ title: t`Tap a form`, tip: tips[group] }}
      />
    </Panel>
  );
}

type GapPick = FormItem & {
  said: string;
  pool: readonly string[];
  pair: readonly [string, string];
};

const pickOptions = (answer: string, pool: readonly string[]) =>
  shuffle([answer, ...shuffle(pool).slice(0, 3)]);

const gapRun = (items: readonly GapPick[], pinned?: GapPick): GapPick[] =>
  eachPairFirst(items, pinned).map((item) =>
    item === pinned
      ? item
      : { ...item, options: pickOptions(item.answers[0] as string, item.pool) },
  );

const pairRun = <T extends { pair: readonly [string, string] }>(items: readonly T[], pinned?: T) =>
  eachPairFirst(items, pinned);

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const pairs: MatchPair[] = (["üles", "alla", "sisse", "välja", "tagasi", "kinni"] as const).map(
      (particle) => ({
        id: clipId(particle),
        left: particle,
        right: i18n._(PARTICLE_MEANS[particle]),
        src: src(particle),
      }),
    );

    const gaps: GapPick[] = PV_GAPS.map((gap) => {
      const said = gapSaid(gap);
      const pool = PV_PARTICLES.filter((p) => p !== gap.answer);
      return {
        said,
        base: "…",
        gloss: i18n._(GAP_MEANS[gap.id]),
        cue: `${gap.before} …${/^[.,!?]/.test(gap.after) ? "" : " "}${gap.after}`,
        cueLang: "et",
        src: src(said),
        options: [gap.answer, ...pool.slice(0, 3)],
        pool,
        answers: [gap.answer],
        pair: [gap.id, gap.id] as const,
        explain: GAP_WHY[gap.id],
      };
    });

    const tellOptions = (["particle", "dont"] as const).map((id) => ({
      id,
      label: (
        <span lang={i18n.locale} className="text-lg font-medium tracking-normal">
          {i18n._(TELL_OPTIONS[id])}
        </span>
      ),
    }));
    const tell: (ChoiceItem & { said: string; pair: readonly [string, string] })[] = PV_TELL.map(
      (item) => ({
        said: item.said,
        src: src(item.said),
        answer: item.kind,
        options: tellOptions,
        pair: [item.kind, item.id] as const,
        explain: TELL_WHY[item.kind],
      }),
    );

    const built: (OrderItem & { id: string })[] = PV_ORDER.map(({ id, answers }) => ({
      id,
      answers,
      src: src(answers[0]),
      meaning: i18n._(ORDER_MEANS[id]),
      explain: ORDER_WHY[id],
    }));

    const translations: (SentenceItem & { pair: readonly [string, string] })[] = PV_TRANSLATE.map(
      (said) => ({
        kind: "translate",
        id: clipId(said),
        prompt: i18n._(TRANSLATE_PROMPTS[said]),
        src: src(said),
        answers: PV_ANSWERS[said],
        pair: [clipId(said), clipId(said)] as const,
      }),
    );

    const fixes: FixItem[] = PV_FIXES.map((item) => ({
      kind: "fix",
      id: `fix-${item.id}`,
      wrong: item.wrong,
      prompt: i18n._(FIX_PROMPTS[item.id]),
      answers: PV_FIX_ANSWERS[item.right] ?? [item.right],
      src: src(item.right),
      explain: FIX_WHY[item.id],
    }));

    const note: PassageQuestion[] = [
      {
        id: "window",
        ask: t`Why did Peeter open the kitchen window?`,
        options: [
          { id: "warm", label: t`The morning air felt warm outside.` },
          { id: "smoke", label: t`He burnt toast.` },
          { id: "paint", label: t`He painted the wall.` },
        ],
        answer: "warm",
        line: 2,
      },
      {
        id: "bread",
        kind: "truefalse",
        ask: t`There is still plenty of bread left at home.`,
        answer: false,
        line: 4,
      },
      {
        id: "buy",
        kind: "short",
        ask: t`What fruit should Kati buy at the shop? Write the word from the note.`,
        answers: ["õunu"],
        line: 5,
      },
      {
        id: "papers",
        ask: t`What should Kati do with the old newspapers?`,
        options: [
          { id: "keep", label: t`Put them in a box in the hallway` },
          { id: "throw", label: t`Throw them in the bin` },
          { id: "give", label: t`Give them to the neighbour downstairs` },
        ],
        answer: "throw",
        line: 6,
      },
      {
        id: "return",
        kind: "truefalse",
        ask: t`Peeter comes back from work at six.`,
        answer: true,
        line: 8,
      },
      {
        id: "brother",
        ask: t`What should Kati tell the brother if he calls?`,
        options: [
          { id: "visit", label: t`To come round at five` },
          { id: "call", label: t`That Peeter will call back later` },
          { id: "email", label: t`To write Peeter an email about the weekend` },
        ],
        answer: "call",
        line: 9,
      },
    ];

    const move: PassageQuestion[] = [
      {
        id: "woke",
        kind: "short",
        ask: t`What time did Mari wake up? Write two words as she says them.`,
        answers: ["kell kuus", "kuus"],
        line: 4,
      },
      {
        id: "door",
        ask: t`Why does Mari ask Jaan to close the door?`,
        options: [
          { id: "cold", label: t`Cold air comes in from the hallway.` },
          { id: "noise", label: t`Loud music plays next door.` },
          { id: "cat", label: t`The cat might escape.` },
        ],
        answer: "cold",
        line: 5,
      },
      {
        id: "papers",
        kind: "truefalse",
        ask: t`Mari wants to take the old newspapers to the new flat.`,
        answer: false,
        line: 11,
      },
      {
        id: "book",
        ask: t`What must Mari do with the blue book tomorrow?`,
        options: [
          { id: "pack", label: t`Pack it away` },
          { id: "return", label: t`Bring back the library copy` },
          { id: "lend", label: t`Lend it to Jaan until Monday morning` },
        ],
        answer: "return",
        line: 12,
      },
      {
        id: "lunch",
        kind: "truefalse",
        ask: t`They plan to go out to eat for lunch once the boxes are in the car.`,
        answer: true,
        line: 16,
      },
      {
        id: "owner",
        ask: t`When does the owner of the new flat arrive?`,
        options: [
          { id: "noon", label: t`Right before lunch at noon` },
          { id: "two", label: t`At two o’clock` },
          { id: "five", label: t`After work around five in the evening` },
        ],
        answer: "two",
        line: 19,
      },
      {
        id: "number",
        kind: "truefalse",
        ask: t`Jaan writes down the owner’s phone number.`,
        answer: true,
        line: 21,
      },
    ];

    return { pairs, gaps, tell, built, translations, fixes, note, move };
  }, [t, i18n]);
}

export function UlesValjaAraLesson() {
  const { t } = useLingui();
  const content = useContent();
  const commands = lessonBySlug("kaskiv")?.n;
  const order = lessonBySlug("sonajarg")?.n;
  const names = { third: t`Mari`, fourth: t`Jaan` };

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          A small word like <b lang="et">üles</b>, <b lang="et">välja</b> or <b lang="et">ära</b>{" "}
          adds direction or completion to a verb: <b lang="et">Ma tõusen kell seitse üles.</b>
        </Trans>
      }
      facts={[
        <Trans key="m">20 minutes</Trans>,
        <Trans key="q">8 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "üles",
        "alla",
        "sisse",
        "välja",
        "ära",
        "tagasi",
        "lahti",
        "kinni",
        "üles tõusma",
        "üles kirjutama",
        "ära viskama",
        "lahti tegema",
        "kinni panema",
      ]}
      recap={[
        <Trans key="1">
          Particles add direction or completion to a verb: <b lang="et">üles tõusma</b> (get up),{" "}
          <b lang="et">välja minema</b> (go out), <b lang="et">kinni panema</b> (close).
        </Trans>,
        <Trans key="2">
          In a normal statement with one verb, the particle usually moves after the verb, often to
          the end: <b lang="et">Ma tõusen kell seitse üles.</b>
        </Trans>,
        <Trans key="3">
          With a second verb, the particle usually stays right before the infinitive:{" "}
          <b lang="et">Ma pean vara üles tõusma.</b>
        </Trans>,
        <Trans key="4">
          <b lang="et">Ära</b> after a verb usually means away or completely (
          <b lang="et">Ta läks ära</b>); <b lang="et">ära</b> before a command means don’t (
          <b lang="et">Ära mine!</b>).
        </Trans>,
      ]}
      sections={[
        {
          id: "particles",
          title: t`Small words that steer the verb`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Estonian builds everyday verbs by adding a direction word to a verb:{" "}
                    <Word w="üles tõusma" /> is to get up, <Word w="lahti tegema" /> is to open and{" "}
                    <Word w="kinni panema" /> is to close.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    In a dictionary, the particle stands first. In a sentence with one verb, it
                    usually moves after the verb: <b lang="et">Ma tõusen kell seitse üles.</b>{" "}
                    Switch groups and tap a form to hear it.
                  </Trans>
                </p>
              </Prose>
              <ParticleTable />
              <Aside>
                <Trans>
                  Notice <Word w="üles kirjutama" />: Estonian writes things “up” (
                  <b lang="et">üles</b>), where English says write down.
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>Match each particle with its meaning.</Trans>
                </p>
              </Prose>
              <Match
                id="particle-pairs"
                title={<Trans>What does each particle mean?</Trans>}
                pairs={content.pairs}
                columns={[<Trans key="a">Particle</Trans>, <Trans key="b">Meaning</Trans>]}
              />
            </>
          ),
        },
        {
          id: "pick",
          title: t`Pick the particle`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Pick the particle that completes each sentence, then hear the whole line.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="pick-particle"
                title={<Trans>Which particle fits?</Trans>}
                items={content.gaps}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight particles right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Read the reason under each one you missed.</Trans>
                  ) : (
                    <Trans>Go through the table once more, then try again.</Trans>
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
          id: "ara",
          title: t`Away or don’t?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Lesson {commands} showed <Word w="ära" /> for saying don’t:{" "}
                    <b lang="et">Ära mine!</b> As a particle after the verb, <b lang="et">ära</b>{" "}
                    usually means away or finished: <b lang="et">Ta läks ära</b> (he left) and{" "}
                    <b lang="et">Ma sõin võileiva ära</b> (I ate the sandwich up).
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Hear each sentence and pick which job <b lang="et">ära</b> is doing.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="tell-ara"
                title={<Trans>Away or don’t?</Trans>}
                items={content.tell}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>
                      All six: you told both uses of <b lang="et">ära</b> apart.
                    </Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>
                      Check where <b lang="et">ära</b> stands in the sentence, then try again.
                    </Trans>
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
          id: "order",
          title: t`Where the particle usually goes`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Lesson {order} showed that the main verb usually stands second. With one verb,
                    the particle usually goes after the verb, often to the end:{" "}
                    <b lang="et">Ma kirjutan numbri üles.</b>
                  </Trans>
                </p>
                <p>
                  <Trans>
                    When another verb such as <b lang="et">pean</b> or <b lang="et">saan</b> comes
                    first, the particle usually stays right before the second verb:{" "}
                    <b lang="et">Ma pean vara üles tõusma.</b> Build each sentence from its meaning.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="build-particle"
                title={<Trans>Build the sentence</Trans>}
                items={content.built}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six in a natural order.</Trans>
                  ) : (
                    <Trans>Read why under each one you missed, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.answers[0] ?? "", src: item.src })}
                round={(props) => <OrderRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "write",
          title: t`Write it in Estonian`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Write each sentence in Estonian using a particle verb.</Trans>
                </p>
              </Prose>
              <Quiz
                id="write-particle"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.translations}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight particle verbs right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the particle and its place in the ones you missed.</Trans>
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
          title: t`Fix the sentence`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each sentence uses the wrong particle for its meaning. Tap the wrong word, then
                    type the right one.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-particle"
                title={<Trans>Fix the sentence</Trans>}
                items={content.fixes}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six found and fixed.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Read the reason under each one you missed.</Trans>
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
          id: "note",
          title: t`A note on the kitchen table`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Peeter leaves a morning note for Kati. Read it and answer.</Trans>
                </p>
              </Prose>
              <Reading
                id="morning-note"
                title={<Trans>What does Peeter write?</Trans>}
                by={t`Peeter writes`}
                sentences={PV_NOTE}
                questions={content.note}
              />
            </>
          ),
        },
        {
          id: "move",
          title: t`Packing for a new flat`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Jaan comes to help Mari move out of her flat. Listen and answer. You can play
                    the conversation twice.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="moving-day"
                title={<Trans>Listen: Mari and Jaan</Trans>}
                clip="c-kolimine"
                turns={PV_CONVERSATION.turns}
                names={names}
                questions={content.move}
                plays={2}
              />
            </>
          ),
        },
      ]}
    />
  );
}
