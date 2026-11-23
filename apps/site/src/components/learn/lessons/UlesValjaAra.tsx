import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  PV_BUILD,
  PV_FIX,
  PV_HOUSE,
  PV_MATCH,
  PV_ORDER,
  PV_PLACE,
  PV_PLACE_SEEN,
  PV_TABLE,
  PV_TALK,
  PV_TRANSLATE,
  PV_VERBS,
  clipId,
  clipUrl,
} from "../../../lib/learn/clips";
import type { PassageQuestion } from "../../../lib/learn/questions";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { ListenRows, Panel } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Match, type MatchPair } from "../Match";
import { type OrderItem, OrderRound } from "../OrderRound";
import { Listening } from "../Passage";
import { Quiz } from "../Quiz";
import { Scene } from "../Scene";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Word } from "../Word";

const SLUG = "ules-valja-ara";
const src = (text: string) => clipUrl(SLUG, clipId(text));

const MEANS: Record<string, MessageDescriptor> = {
  "Kass läheb sisse.": msg`The cat goes in.`,
  "Kass on sees.": msg`The cat is inside.`,
  "Kass tuleb välja.": msg`The cat comes out.`,
  "Kass hüppab üles.": msg`The cat jumps up.`,
  "Kass on üleval.": msg`The cat is up there.`,
  "Kass hüppab alla.": msg`The cat jumps down.`,
  "Ma tõusen kell seitse üles.": msg`I get up at seven.`,
  "Tule sisse!": msg`Come in!`,
  "Me läheme õhtul välja.": msg`We’re going out in the evening.`,
  "Jaan tuleb alla.": msg`Jaan is coming down.`,
  "Kati läks ära.": msg`Kati left.`,
  "Ma tulen homme tagasi.": msg`I’ll come back tomorrow.`,
  "Võta mind kaasa!": msg`Take me with you!`,
  "Me kolime reedel sisse.": msg`We’re moving in on Friday.`,
  "Lapsed mängivad väljas.": msg`The children are playing outside.`,
  "Kass on väljas.": msg`The cat is outside.`,
  "Kass läheb välja.": msg`The cat goes out.`,
  "Kati on sees.": msg`Kati is inside.`,
  "Kati on juba sees.": msg`Kati is already inside.`,
  "Tulge sisse!": msg`Come in! (to more than one, or politely)`,
  "Mari on üleval.": msg`Mari is upstairs.`,
  "Ma lähen üles.": msg`I’m going up.`,
  "Jaan on all.": msg`Jaan is downstairs.`,
  "Tule alla!": msg`Come down!`,
  "Ära mine ära!": msg`Don’t go away!`,
  "Ma pean homme vara üles tõusma.": msg`I have to get up early tomorrow.`,
};

const PLACE_MEANS: Record<string, MessageDescriptor> = {
  sisse: msg`in: where to`,
  sees: msg`inside: where`,
  välja: msg`out: where to`,
  üles: msg`up: where to`,
  üleval: msg`up there: where`,
  alla: msg`down: where to`,
};

const MATCH_MEANS: Record<(typeof PV_MATCH)[number]["id"], MessageDescriptor> = {
  ules: msg`to get up`,
  valja: msg`to go out`,
  sisse: msg`to come in`,
  tagasi: msg`to come back`,
  ara: msg`to leave`,
  kaasa: msg`to take along`,
};

const ORDER_MEANS: Record<(typeof PV_ORDER)[number]["id"], MessageDescriptor> = {
  tousen: msg`I get up at seven.`,
  pean: msg`I have to get up early tomorrow.`,
  lahme: msg`We’re going out in the evening.`,
  tahab: msg`Kati wants to leave.`,
  "ei-tule": msg`I’m not coming back today.`,
};

const BUILD_CUES: Record<(typeof PV_BUILD)[number]["id"], MessageDescriptor> = {
  tousen: msg`I get up at six.`,
  lahme: msg`We’re going out in the evening.`,
  tagasi: msg`I’ll come back tomorrow.`,
  kolib: msg`Jaan is moving in on Friday.`,
  kaasa: msg`I’ll take you along.`,
  alla: msg`Mari is coming down right away.`,
};

const TRANSLATE_PROMPTS: Record<(typeof PV_TRANSLATE)[number]["id"], MessageDescriptor> = {
  tousen: msg`I get up at seven.`,
  sisse: msg`Come in!`,
  valja: msg`We’re going out tonight.`,
  ara: msg`Kati left yesterday.`,
  pean: msg`I have to get up early tomorrow.`,
  kaasa: msg`Take me with you!`,
};

const FIX_PROMPTS: Record<(typeof PV_FIX)[number]["id"], MessageDescriptor> = {
  "fix-valjas": msg`The children are playing outside.`,
  "fix-valja": msg`We’re going out in the evening.`,
  "fix-sisse": msg`Come in!`,
  "fix-sees": msg`Kati is already inside.`,
  "fix-ules": msg`I get up at seven.`,
  "fix-all": msg`Jaan is downstairs.`,
};

const GLOSSARY: Glossary = {
  üles: { en: msg`up, upstairs: where to` },
  üleval: { en: msg`up, upstairs: where` },
  alla: { en: msg`down, downstairs: where to` },
  all: { en: msg`down, downstairs: where` },
  sisse: { en: msg`in: where to` },
  sees: { en: msg`inside: where` },
  välja: { en: msg`out: where to` },
  väljas: { en: msg`outside: where` },
  ära: { en: msg`away, off; don’t`, note: msg`Ära mine ära! Don’t go away!` },
  tagasi: { en: msg`back` },
  kaasa: { en: msg`along, with you` },
  "üles tõusma": { en: msg`to get up`, note: msg`Ma tõusen üles: I get up.` },
  tõusma: { en: msg`to rise` },
  kolima: {
    en: msg`to move house`,
    note: msg`Sisse kolima: to move in. Välja kolima: to move out.`,
  },
  hüppama: { en: msg`to jump` },
  vara: { en: msg`early` },
  kohe: { en: msg`right away` },
  appi: { en: msg`to someone’s aid, to help`, note: msg`Appi tulema: to come and help.` },
  lifti: { en: msg`a lift`, note: msg`Lift; after ei ole: lifti.` },
  kesklinnas: { en: msg`in the city centre` },
  restoran: { en: msg`a restaurant` },
  "ära mine ära": { en: msg`Don’t go away!` },
  "ma pean homme vara üles tõusma": {
    en: msg`I have to get up early tomorrow.`,
    show: "Ma pean homme vara üles tõusma",
  },
};

const meaning = (said: string, i18n: I18n) => {
  const descriptor = MEANS[said];
  return descriptor ? i18n._(descriptor) : null;
};

type PlaceItem = FormItem & { pair: readonly [string, string]; options: readonly string[] };

export const placeRun = (items: readonly PlaceItem[], pinned?: PlaceItem): PlaceItem[] =>
  eachPairFirst(items, pinned).map((item) =>
    item === pinned ? item : { ...item, options: shuffle([...item.options]) },
  );

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const lastWhy = (
      <Trans>The small word usually goes last, or just before a second verb at the end.</Trans>
    );
    const ordered: OrderItem[] = PV_ORDER.map(({ id, answers }) => ({
      answers,
      src: src(answers[0]),
      meaning: i18n._(ORDER_MEANS[id]),
      explain: lastWhy,
    }));

    const built: SentenceItem[] = PV_BUILD.map(({ id, words, answers }) => ({
      kind: "build",
      id: `build-${id}`,
      words,
      cue: i18n._(BUILD_CUES[id]),
      answers,
      src: src(answers[0]),
      explain: lastWhy,
    }));

    const sentences: SentenceItem[] = PV_TRANSLATE.map(({ id, answers }) => ({
      kind: "translate",
      id,
      prompt: i18n._(TRANSLATE_PROMPTS[id]),
      answers,
      src: src(answers[0]),
    }));

    const fixWhy: Record<(typeof PV_FIX)[number]["id"], ReactNode> = {
      "fix-valjas": (
        <Trans>
          They are somewhere, not going there: <span lang="et">väljas</span>.
        </Trans>
      ),
      "fix-valja": (
        <Trans>
          <span lang="et">Minema</span> goes somewhere, so <span lang="et">välja</span>.
        </Trans>
      ),
      "fix-sisse": (
        <Trans>
          Come in says where to: <span lang="et">sisse</span>.
        </Trans>
      ),
      "fix-sees": (
        <Trans>
          She is somewhere already: <span lang="et">sees</span>.
        </Trans>
      ),
      "fix-ules": (
        <Trans>
          <span lang="et">Tõusma</span> says where to: <span lang="et">üles</span>, not{" "}
          <span lang="et">üleval</span>.
        </Trans>
      ),
      "fix-all": (
        <Trans>
          He is somewhere, not going there: <span lang="et">all</span>.
        </Trans>
      ),
    };
    const fix: FixItem[] = PV_FIX.map(({ id, wrong, answers }) => ({
      kind: "fix",
      id,
      wrong,
      answers,
      src: src(answers[0]),
      prompt: i18n._(FIX_PROMPTS[id]),
      explain: fixWhy[id],
    }));

    const pairs: MatchPair[] = PV_MATCH.map(({ id, verb, said }) => ({
      id,
      left: verb,
      right: i18n._(MATCH_MEANS[id]),
      src: src(said),
    }));

    const talk: PassageQuestion[] = [
      {
        id: "new",
        ask: t`What does Kati have that is new?`,
        options: [
          { id: "flat", label: t`A flat` },
          { id: "car", label: t`A car` },
          { id: "job", label: t`A job in the centre` },
        ],
        answer: "flat",
        line: 4,
      },
      {
        id: "when",
        kind: "short",
        ask: t`When does Kati move in? Write the day as she says it.`,
        answers: ["laupäeval"],
        line: 7,
      },
      {
        id: "friday",
        ask: t`What does Kati have to do on Friday?`,
        options: [
          { id: "out", label: t`Move out of her old flat` },
          { id: "tartu", label: t`Go to Tartu` },
          { id: "work", label: t`Work` },
        ],
        answer: "out",
        line: 8,
      },
      {
        id: "dear",
        kind: "truefalse",
        ask: t`Kati’s old flat is expensive.`,
        answer: true,
        line: 10,
      },
      {
        id: "rooms",
        ask: t`How many rooms does the new flat have?`,
        options: [
          { id: "one", label: t`One` },
          { id: "two", label: t`Two` },
          { id: "five", label: t`Five` },
        ],
        answer: "two",
        line: 13,
      },
      {
        id: "lift",
        kind: "truefalse",
        ask: t`The building has a lift.`,
        answer: false,
        line: 17,
      },
      {
        id: "brother",
        kind: "short",
        ask: t`Where is Kati’s brother coming from? Write the town as she says it.`,
        answers: ["Tartust"],
        line: 21,
      },
      {
        id: "up",
        ask: t`What time does Kati get up on Saturday?`,
        options: [
          { id: "six", label: t`At six` },
          { id: "seven", label: t`At seven` },
          { id: "eight", label: t`At eight` },
        ],
        answer: "six",
        line: 24,
      },
      {
        id: "evening",
        ask: t`What will they do in the evening?`,
        options: [
          { id: "eat", label: t`Go out to eat` },
          { id: "cook", label: t`Cook at Kati’s new flat` },
          { id: "home", label: t`Stay at home` },
        ],
        answer: "eat",
        line: 31,
      },
    ];
    return { ordered, built, sentences, fix, pairs, talk };
  }, [t, i18n]);
}

export function UlesValjaAraLesson() {
  const { t, i18n } = useLingui();
  const content = useContent();
  const places = lessonBySlug("majas-majja-majast")?.n;
  const commands = lessonBySlug("kaskiv")?.n;
  const order = lessonBySlug("sonajarg")?.n;

  const rows = (list: readonly string[]) =>
    list.map((said) => ({
      main: <span lang="et">{said}</span>,
      sub: meaning(said, i18n),
      src: src(said),
    }));

  const scenePlaces = (list: typeof PV_HOUSE | typeof PV_TABLE) =>
    list.map(({ id, word, sentence }) => ({
      id,
      word,
      meaning: i18n._(PLACE_MEANS[word] as MessageDescriptor),
      sentence,
      gloss: meaning(sentence, i18n) ?? "",
      src: src(sentence),
    }));

  const placeItems = useMemo<PlaceItem[]>(
    () =>
      PV_PLACE.map(({ id, said, answer, other, base, to }) => ({
        base,
        cue: said.replace(answer, "…"),
        cueLang: "et",
        answers: [answer],
        options: [answer, other],
        src: src(said),
        pair: [to ? "to" : "at", base] as const,
        explain: to ? (
          <Trans>
            Where to: <span lang="et">{answer}</span>.
          </Trans>
        ) : (
          <Trans>
            Where: <span lang="et">{answer}</span>.
          </Trans>
        ),
      })),
    [],
  );

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Many Estonian verbs take a small word that says where to:{" "}
          <span lang="et">tõusen üles</span>, I get up; <span lang="et">lähen välja</span>, I go
          out; <span lang="et">läks ära</span>, left. In a statement it usually goes last.
        </Trans>
      }
      facts={[
        <Trans key="m">18 minutes</Trans>,
        <Trans key="q">6 exercises, 3 of them typed, and a conversation</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["üles", "alla", "sisse", "välja", "ära", "tagasi", "kaasa", "väljas", "sees"]}
      recap={[
        <Trans key="1">
          A small word often gives the verb a direction: <b lang="et">üles</b>, up;{" "}
          <b lang="et">alla</b>, down; <b lang="et">sisse</b>, in; <b lang="et">välja</b>, out;{" "}
          <b lang="et">ära</b>, away; <b lang="et">tagasi</b>, back; <b lang="et">kaasa</b>, along.
        </Trans>,
        <Trans key="2">
          Where to and where are different words: <b lang="et">välja, väljas</b>;{" "}
          <b lang="et">sisse, sees</b>; <b lang="et">üles, üleval</b>; <b lang="et">alla, all</b>.
        </Trans>,
        <Trans key="3">
          In a statement the small word usually goes last:{" "}
          <b lang="et">Ma tõusen kell seitse üles</b>. With a second verb, it usually goes just
          before it: <b lang="et">Ma pean vara üles tõusma</b>.
        </Trans>,
        <Trans key="4">
          <b lang="et">Ära</b> at the start says don’t; after a verb of moving it usually means
          away: <b lang="et">Ära mine ära!</b>
        </Trans>,
      ]}
      sections={[
        {
          id: "up-down",
          title: t`Up, down, in, out`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Estonian puts a small word after many verbs to say where to: <Word w="üles" />,
                    up; <Word w="alla" />, down; <Word w="sisse" />, in; <Word w="välja" />, out.{" "}
                    <span lang="et">Hüppama</span> is to jump, so{" "}
                    <span lang="et">Kass hüppab üles</span> is the cat jumps up.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Each has a partner for where something is, as <span lang="et">majja</span> and{" "}
                    <span lang="et">majas</span> are in lesson {places}: <Word w="üleval" />, up
                    there; <Word w="sees" />, inside. Tap a word to move the cat.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Scene
                  scene="table"
                  label={t`A cat and a table`}
                  keysLabel={t`Where the cat is and goes`}
                  places={scenePlaces(PV_TABLE)}
                />
              </Panel>
              <Panel>
                <Scene
                  scene="house"
                  label={t`A cat and a house`}
                  keysLabel={t`Where the cat is and goes`}
                  places={scenePlaces(PV_HOUSE)}
                />
              </Panel>
            </>
          ),
        },
        {
          id: "away-back",
          title: t`Away, back, along`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Three more often go with verbs of moving: <Word w="ära" />, away;{" "}
                    <Word w="tagasi" />, back; <Word w="kaasa" />, along. A dictionary lists the
                    pair with the small word first: <Word w="üles tõusma" />, to get up;{" "}
                    <span lang="et">ära minema</span>, to leave. Tap a line to hear it.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rows(PV_VERBS)} />
              <Aside>
                <Trans>
                  <span lang="et">Ära</span> at the start of a command is don’t, as in lesson{" "}
                  {commands}. After a verb of moving, it usually means away:{" "}
                  <Word w="Ära mine ära" />, don’t go away.
                </Trans>
              </Aside>
              <Match
                id="particle-verbs"
                title={<Trans>What does it mean?</Trans>}
                pairs={content.pairs}
              />
            </>
          ),
        },
        {
          id: "where-or-where-to",
          title: t`Where to, or where`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Going somewhere takes one word, and being somewhere usually takes its partner:{" "}
                    <span lang="et">Kass läheb välja</span>, the cat goes out;{" "}
                    <span lang="et">Lapsed mängivad väljas</span>, the children are playing outside.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rows(PV_PLACE_SEEN)} />
              <Quiz
                id="to-or-at"
                title={<Trans>Where to, or where?</Trans>}
                items={placeItems}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight: going there or being there.</Trans>
                  ) : share >= 0.6 ? (
                    <Trans>
                      Most of them. Ask whether someone goes somewhere or is already there.
                    </Trans>
                  ) : (
                    <Trans>Listen to the lines above once more, then try again.</Trans>
                  )
                }
                recall={formRecall}
                order={placeRun}
                round={(props) => <FormRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "last",
          title: t`The small word usually goes last`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In a statement the small word usually goes to the end, however long the
                    sentence: <span lang="et">Ma tõusen kell seitse üles</span>. With a second verb,
                    as in lesson {order}, it usually goes just before that verb:{" "}
                    <Word w="Ma pean homme vara üles tõusma" />.
                  </Trans>
                </p>
              </Prose>
              <ListenRows
                items={rows(["Ma tõusen kell seitse üles.", "Ma pean homme vara üles tõusma."])}
              />
              <Aside>
                <Trans>
                  In a question with a question word, it often comes just before the verb, which
                  goes last: <span lang="et">Millal sa sisse kolid?</span>
                </Trans>
              </Aside>
              <Quiz
                id="build-order"
                title={<Trans>Put the words in order</Trans>}
                items={content.ordered}
                rounds={content.ordered.length}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All five, the small word in its place.</Trans>
                  ) : share >= 0.6 ? (
                    <Trans>Most of them. Look where the small word went.</Trans>
                  ) : (
                    <Trans>Read the two lines above once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.answers[0] ?? "", src: item.src })}
                round={(props) => <OrderRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "make",
          title: t`Make the sentence`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Put the words into a sentence that means what the line says: the verb in its
                    form, the small word in its place.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="make-particle"
                title={<Trans>Make the sentence</Trans>}
                items={content.built}
                rounds={content.built.length}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six sentences.</Trans>
                  ) : share >= 0.6 ? (
                    <Trans>Most of them. Check the verb’s form and the small word’s place.</Trans>
                  ) : (
                    <Trans>Read What to remember at the end, then try again.</Trans>
                  )
                }
                recall={sentenceRecall}
                round={(props) => <SentenceRound {...props} />}
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
                  <Trans>Write each sentence in Estonian.</Trans>
                </p>
              </Prose>
              <Quiz
                id="write-particle"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.sentences}
                rounds={content.sentences.length}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six sentences.</Trans>
                  ) : share >= 0.6 ? (
                    <Trans>Most of them. Check the small word in the ones you missed.</Trans>
                  ) : (
                    <Trans>Read What to remember at the end, then try again.</Trans>
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
                    Each sentence should say what the line above it says, and one word is wrong. Tap
                    it, then type it right.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-particle"
                title={<Trans>Fix the sentence</Trans>}
                items={content.fix}
                rounds={content.fix.length}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six found and fixed.</Trans>
                  ) : share >= 0.6 ? (
                    <Trans>Most of them. Read the reason under each one you missed.</Trans>
                  ) : (
                    <Trans>Read What to remember at the end, then try again.</Trans>
                  )
                }
                recall={fixRecall}
                round={(props) => <FixRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "talk",
          title: t`Moving house`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kati has found a new flat, and Jaan offers to help.{" "}
                    <span lang="et">Kolima</span> is to move house.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="kati-moves"
                title={<Trans>Listen: Kati and Jaan</Trans>}
                clip="c-talk"
                turns={PV_TALK.turns}
                names={{ main: t`Jaan`, second: t`Kati` }}
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
