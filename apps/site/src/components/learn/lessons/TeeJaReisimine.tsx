import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  TRAVEL_ANSWERS,
  TRAVEL_CONVERSATION,
  TRAVEL_DIALOGUE,
  TRAVEL_FIXES,
  TRAVEL_GROUPS,
  TRAVEL_MATCH,
  TRAVEL_NOTE,
  TRAVEL_TELL,
  TRAVEL_TRANSLATE,
} from "../../../lib/learn/clips";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { Chips, Panel } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Match, type MatchPair } from "../Match";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { Listening, type PassageQuestion, Reading } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Word } from "../Word";

const SLUG = "tee-ja-reisimine";
const src = (text: string) => clipUrl(SLUG, clipId(text));

type Group = keyof typeof TRAVEL_GROUPS;

const WORD_MEANS: Record<string, MessageDescriptor> = {
  otse: msg`straight ahead`,
  vasakule: msg`to the left`,
  paremale: msg`to the right`,
  peatus: msg`stop (bus, tram)`,
  pilet: msg`ticket`,
  jaam: msg`station`,
  vasakul: msg`on the left`,
  paremal: msg`on the right`,
};

const GLOSSARY: Glossary = {
  otse: { en: msg`straight ahead`, note: msg`Minge otse edasi.` },
  vasakule: { en: msg`to the left`, note: msg`Pöörake vasakule.` },
  paremale: { en: msg`to the right`, note: msg`Pöörake paremale.` },
  vasakul: { en: msg`on the left`, note: msg`Kohvik on vasakul.` },
  paremal: { en: msg`on the right`, note: msg`Jaam on paremal.` },
  peatus: { en: msg`stop (bus, tram)`, note: msg`Kus on bussipeatus?` },
  pilet: { en: msg`ticket`, note: msg`Palun üks pilet Tartusse.` },
  jaam: { en: msg`station`, note: msg`Rongijaam on siin lähedal.` },
};

const ROW_LABELS: Record<string, MessageDescriptor> = {
  straight: msg`Straight ahead`,
  turnLeft: msg`Turn left (where to)`,
  turnRight: msg`Turn right (where to)`,
  onLeft: msg`On the left (where)`,
  onRight: msg`On the right (where)`,
  near: msg`Nearby (where)`,
};

function DirectionsTable() {
  const { t, i18n } = useLingui();
  const [group, setGroup] = useState<Group>("turn");
  const rows: ParadigmRow[] = TRAVEL_GROUPS[group].map((row) => ({
    id: row.id,
    label: i18n._(ROW_LABELS[row.id] as MessageDescriptor),
    cells: [
      { form: row.word, src: src(row.word) },
      { form: row.said, src: src(row.said) },
    ],
  }));
  return (
    <Panel className="gap-5">
      <Chips
        label={t`Kind`}
        items={[
          { label: t`Turning`, value: "turn" as Group },
          { label: t`Location`, value: "side" as Group },
        ]}
        value={group}
        onPick={setGroup}
      />
      <Paradigm
        key={group}
        label={t`Directions in Estonian`}
        columns={[t`Word`, t`In a sentence`]}
        rows={rows}
        highlight={{ column: 0 }}
        empty={{
          title: t`Tap a word`,
          tip:
            group === "turn" ? (
              <Trans>
                Turning takes <b lang="et">-le</b>: <b lang="et">vasakule</b> (to the left) and{" "}
                <b lang="et">paremale</b> (to the right).
              </Trans>
            ) : (
              <Trans>
                Saying which side something is on takes <b lang="et">-l</b>:{" "}
                <b lang="et">vasakul</b> (on the left) and <b lang="et">paremal</b> (on the right).
              </Trans>
            ),
        }}
      />
    </Panel>
  );
}

const TELL_OPTIONS = {
  turn: msg`Turning (where to)`,
  side: msg`Location (which side)`,
} as const;

const TELL_MEANS: Record<(typeof TRAVEL_TELL)[number]["id"], MessageDescriptor> = {
  "left-turn": msg`Turn left!`,
  "left-side": msg`The café is on the left.`,
  "right-turn": msg`Turn right!`,
  "right-side": msg`The station is on the right.`,
  "corner-turn": msg`Go to the left at the park.`,
  "corner-side": msg`The bus stop is on the left.`,
  "shop-turn": msg`Turn right at the school.`,
  "shop-side": msg`The shop is on the right.`,
};

const TRANSLATE_PROMPTS: Record<(typeof TRAVEL_TRANSLATE)[number], MessageDescriptor> = {
  "Kus on bussipeatus?": msg`Where is the bus stop?`,
  "Palun üks pilet Tartusse.": msg`One ticket to Tartu, please.`,
  "Minge otse edasi.": msg`Go straight ahead (polite).`,
  "Pöörake vasakule.": msg`Turn left (polite).`,
  "Jaam on paremal.": msg`The station is on the right.`,
  "Mis kell rong väljub?": msg`What time does the train leave?`,
};

const FIX_PROMPTS: Record<(typeof TRAVEL_FIXES)[number]["id"], MessageDescriptor> = {
  turnLeft: msg`Turn left!`,
  turnRight: msg`Turn right!`,
  onLeft: msg`The café is on the left.`,
  onRight: msg`The station is on the right.`,
  toTartu: msg`One ticket to Tartu, please.`,
  whereStop: msg`Where is the bus stop?`,
};

const FIX_WHY: Record<(typeof TRAVEL_FIXES)[number]["id"], ReactNode> = {
  turnLeft: (
    <Trans>
      Turning takes <b lang="et">-le</b>: <b lang="et">vasakule</b>, not <b lang="et">vasakul</b>.
    </Trans>
  ),
  turnRight: (
    <Trans>
      Turning takes <b lang="et">-le</b>: <b lang="et">paremale</b>, not <b lang="et">paremal</b>.
    </Trans>
  ),
  onLeft: (
    <Trans>
      Saying which side something is on takes <b lang="et">-l</b>: <b lang="et">vasakul</b>, not{" "}
      <b lang="et">vasakule</b>.
    </Trans>
  ),
  onRight: (
    <Trans>
      Saying which side something is on takes <b lang="et">-l</b>: <b lang="et">paremal</b>, not{" "}
      <b lang="et">paremale</b>.
    </Trans>
  ),
  toTartu: (
    <Trans>
      A ticket to a city takes the into form: <b lang="et">Tartusse</b>, not <b lang="et">Tartus</b>
      .
    </Trans>
  ),
  whereStop: (
    <Trans>
      Asking where something is uses <b lang="et">Kus</b>, not <b lang="et">Kuhu</b>.
    </Trans>
  ),
};

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const pairs: MatchPair[] = TRAVEL_MATCH.map((word) => ({
      id: word,
      left: word,
      right: i18n._(WORD_MEANS[word] as MessageDescriptor),
      src: src(word),
    }));

    const tellOptions = (["turn", "side"] as const).map((id) => ({
      id,
      label: (
        <span lang={i18n.locale} className="text-lg font-medium tracking-normal">
          {i18n._(TELL_OPTIONS[id])}
        </span>
      ),
    }));
    const tell: (ChoiceItem & { said: string; pair: readonly [string, string] })[] =
      TRAVEL_TELL.map((item) => ({
        said: item.said,
        src: src(item.said),
        answer: item.kind,
        options: tellOptions,
        pair: [item.id.split("-")[0] as string, item.id] as const,
        explain: (
          <Trans>
            <b lang="et">{item.said}</b> {i18n._(TELL_MEANS[item.id])}
          </Trans>
        ),
      }));

    const translations: (SentenceItem & { pair: readonly [string, string] })[] =
      TRAVEL_TRANSLATE.map((said) => ({
        kind: "translate",
        id: clipId(said),
        prompt: i18n._(TRANSLATE_PROMPTS[said]),
        src: src(said),
        answers: TRAVEL_ANSWERS[said],
        pair: [clipId(said), clipId(said)] as const,
      }));

    const fixes: FixItem[] = TRAVEL_FIXES.map((item) => ({
      kind: "fix",
      id: `fix-${item.id}`,
      wrong: item.wrong,
      prompt: i18n._(FIX_PROMPTS[item.id]),
      answers: [item.right],
      src: src(item.right),
      explain: FIX_WHY[item.id],
    }));

    const turns: DialogueTurn[] = [
      { who: "them", clip: clipId(TRAVEL_DIALOGUE[0].hear), line: TRAVEL_DIALOGUE[0].hear },
      {
        who: "you",
        clip: clipId(TRAVEL_DIALOGUE[0].right),
        replies: [
          { line: TRAVEL_DIALOGUE[0].right, right: true },
          {
            line: TRAVEL_DIALOGUE[0].wrong1,
            why: t`That says where you live instead of asking for the railway station.`,
          },
          {
            line: TRAVEL_DIALOGUE[0].wrong2,
            why: t`That asks for coffee, not directions to the station.`,
          },
        ],
      },
      { who: "them", clip: clipId(TRAVEL_DIALOGUE[1].hear), line: TRAVEL_DIALOGUE[1].hear },
      {
        who: "you",
        clip: clipId(TRAVEL_DIALOGUE[1].right),
        replies: [
          {
            line: TRAVEL_DIALOGUE[1].wrong1,
            why: t`The passer-by is not selling tickets; ask whether it is far.`,
          },
          { line: TRAVEL_DIALOGUE[1].right, right: true },
          {
            line: TRAVEL_DIALOGUE[1].wrong2,
            why: t`That asks their name rather than how far the station is.`,
          },
        ],
      },
      { who: "them", clip: clipId(TRAVEL_DIALOGUE[2].hear), line: TRAVEL_DIALOGUE[2].hear },
      {
        who: "you",
        clip: clipId(TRAVEL_DIALOGUE[2].right),
        replies: [
          {
            line: TRAVEL_DIALOGUE[2].wrong1,
            why: t`That says you do not know, instead of checking whether the station is on the right.`,
          },
          {
            line: TRAVEL_DIALOGUE[2].wrong2,
            why: t`That asks what time it is, not which side the station is on.`,
          },
          { line: TRAVEL_DIALOGUE[2].right, right: true },
        ],
      },
      { who: "them", clip: clipId(TRAVEL_DIALOGUE[3].hear), line: TRAVEL_DIALOGUE[3].hear },
      {
        who: "you",
        clip: clipId(TRAVEL_DIALOGUE[3].right),
        replies: [
          { line: TRAVEL_DIALOGUE[3].right, right: true },
          {
            line: TRAVEL_DIALOGUE[3].wrong1,
            why: t`You already have the directions — thank the person and say goodbye.`,
          },
          {
            line: TRAVEL_DIALOGUE[3].wrong2,
            why: t`Wait until the station to buy a ticket.`,
          },
        ],
      },
    ];

    const note: PassageQuestion[] = [
      {
        id: "bus-time",
        kind: "short",
        ask: t`What time does the bus to Pärnu leave? Write two words from the message.`,
        answers: ["kell üheksa", "üheksa"],
        line: 1,
      },
      {
        id: "platform",
        ask: t`Which side is platform four on?`,
        options: [
          { id: "left", label: t`On the left side` },
          { id: "middle", label: t`On the right side` },
          { id: "far", label: t`Behind the café` },
        ],
        answer: "left",
        line: 2,
      },
      {
        id: "coffee",
        kind: "truefalse",
        ask: t`There is a small kiosk next to the waiting hall.`,
        answer: true,
        line: 3,
      },
      {
        id: "arrive",
        ask: t`When does the bus reach Pärnu?`,
        options: [
          { id: "nine", label: t`At nine o’clock` },
          { id: "eleven", label: t`At eleven o’clock` },
          { id: "evening", label: t`At seven at night` },
        ],
        answer: "eleven",
        line: 4,
      },
      {
        id: "taxi",
        kind: "truefalse",
        ask: t`They will take a taxi from Pärnu bus station to the beach.`,
        answer: false,
        line: 5,
      },
      {
        id: "meet",
        ask: t`Where is Mari waiting in Pärnu?`,
        options: [
          { id: "home", label: t`At her own home` },
          { id: "hotel", label: t`Near a big hotel` },
          { id: "park", label: t`Right by the park` },
        ],
        answer: "park",
        line: 6,
      },
    ];

    const call: PassageQuestion[] = [
      {
        id: "dest",
        kind: "short",
        ask: t`Which city is Mart buying a train ticket to? Write one word as he says it.`,
        answers: ["Tartusse", "Tartu"],
        line: 1,
      },
      {
        id: "next-train",
        ask: t`When does the next train leave?`,
        options: [
          { id: "noon", label: t`In ten minutes` },
          { id: "half", label: t`In twenty minutes` },
          { id: "evening", label: t`In two full hours` },
        ],
        answer: "half",
        line: 3,
      },
      {
        id: "return",
        kind: "truefalse",
        ask: t`Mart buys a return ticket for the same evening.`,
        answer: false,
        line: 5,
      },
      {
        id: "price",
        kind: "short",
        ask: t`How many euros does the ticket cost? Write the number word as the clerk says it.`,
        answers: ["kaksteist"],
        line: 6,
      },
      {
        id: "card",
        kind: "truefalse",
        ask: t`Mart pays by card.`,
        answer: true,
        line: 7,
      },
      {
        id: "track",
        ask: t`Where does the train leave from?`,
        options: [
          { id: "track2", label: t`Track two on the right` },
          { id: "outside", label: t`Track four on the left` },
          { id: "far", label: t`Track one by the exit` },
        ],
        answer: "track2",
        line: 9,
      },
    ];

    return { pairs, tell, translations, fixes, turns, note, call };
  }, [t, i18n]);
}

export function TeeJaReisimineLesson() {
  const { t } = useLingui();
  const content = useContent();
  const surface = lessonBySlug("laual-lauale-laualt")?.n;
  const names = { third: t`Clerk`, fourth: t`Mart` };

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Ask for directions and buy a ticket: <b lang="et">otse</b> (straight ahead),{" "}
          <b lang="et">vasakule</b> and <b lang="et">paremale</b> for turning,{" "}
          <b lang="et">vasakul</b> and <b lang="et">paremal</b> for which side something is on, and
          everyday station phrases.
        </Trans>
      }
      facts={[
        <Trans key="m">18 minutes</Trans>,
        <Trans key="q">7 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["otse", "vasakule", "paremale", "vasakul", "paremal", "peatus", "pilet", "jaam"]}
      recap={[
        <Trans key="1">
          Turning takes <b lang="et">-le</b>: <b lang="et">Pöörake vasakule</b> (turn left),{" "}
          <b lang="et">Pöörake paremale</b> (turn right); straight ahead is <b lang="et">otse</b>.
        </Trans>,
        <Trans key="2">
          Saying which side a place is on takes <b lang="et">-l</b>:{" "}
          <b lang="et">Kohvik on vasakul</b>, <b lang="et">Jaam on paremal</b>.
        </Trans>,
        <Trans key="3">
          Useful travel questions: <b lang="et">Kus on bussipeatus?</b>,{" "}
          <b lang="et">Palun üks pilet Tartusse.</b>, <b lang="et">Mis kell rong väljub?</b>
        </Trans>,
      ]}
      sections={[
        {
          id: "directions",
          title: t`Left, right and straight ahead`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Directions follow the same <b lang="et">-le</b> / <b lang="et">-l</b> pattern
                    from lesson {surface}: <Word w="vasakule" /> and <Word w="paremale" /> mean
                    turning toward a side, while <Word w="vasakul" /> and <Word w="paremal" /> say
                    which side a place is on. Straight ahead is <Word w="otse" />.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    At a station or stop, three words come up right away: <Word w="peatus" />,{" "}
                    <Word w="jaam" /> and <Word w="pilet" />.
                  </Trans>
                </p>
              </Prose>
              <DirectionsTable />
              <Aside>
                <Trans>
                  To a stranger on the street, Estonians usually use polite <b lang="et">te</b>{" "}
                  commands: <b lang="et">Minge otse</b> (go straight),{" "}
                  <b lang="et">Pöörake vasakule</b> (turn left).
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>Match each Estonian travel word with its meaning.</Trans>
                </p>
              </Prose>
              <Match
                id="travel-words"
                title={<Trans>What does each word mean?</Trans>}
                pairs={content.pairs}
                columns={[<Trans key="a">Estonian</Trans>, <Trans key="b">Meaning</Trans>]}
              />
            </>
          ),
        },
        {
          id: "tell",
          title: t`Turning or location?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Hear each sentence and decide whether it tells you which way to turn (
                    <b lang="et">-le</b>) or which side a place is on (<b lang="et">-l</b>).
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="tell-direction"
                title={<Trans>Turning or location?</Trans>}
                items={content.tell}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Listen for -le versus -l at the end.</Trans>
                  ) : (
                    <Trans>Check the table above, then try again.</Trans>
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
          id: "write",
          title: t`Write it in Estonian`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Write each travel phrase in Estonian.</Trans>
                </p>
              </Prose>
              <Quiz
                id="write-travel"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.translations}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six sentences right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the direction ending in the ones you missed.</Trans>
                  ) : (
                    <Trans>Read What to remember below, then try again.</Trans>
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
          title: t`Fix the sentence`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each sentence has one wrong direction or place word. Tap the wrong word, then
                    type the right one.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-travel"
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
          id: "street",
          title: t`Ask the way`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    You are looking for the railway station. Listen to the passer-by and pick the
                    right reply.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="ask-the-way"
                title={t`On the street`}
                part={t`You are asking a passer-by for the way to the railway station.`}
                them={t`Passer-by`}
                turns={content.turns}
              />
            </>
          ),
        },
        {
          id: "reading",
          title: t`Bus to Pärnu`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>A friend sends bus details before a trip to Pärnu. Read and answer.</Trans>
                </p>
              </Prose>
              <Reading
                id="parnu-bus"
                title={t`Trip details`}
                sentences={TRAVEL_NOTE}
                questions={content.note}
              />
            </>
          ),
        },
        {
          id: "listening",
          title: t`Listen: at the ticket desk`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mart buys a train ticket to Tartu at the station. Listen and answer. You can
                    play the conversation twice.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="ticket-desk"
                title={t`At the train station`}
                clip="c-rong"
                turns={TRAVEL_CONVERSATION.turns}
                names={names}
                plays={2}
                questions={content.call}
              />
            </>
          ),
        },
      ]}
    />
  );
}
