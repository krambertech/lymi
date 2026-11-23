import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  CMP_CHAINS,
  CMP_FIX,
  CMP_HEARD,
  CMP_MAKE,
  CMP_MOST,
  CMP_ST,
  CMP_TALK,
  CMP_THAN,
  CMP_TRANSLATE,
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
import { Morph, type MorphChain } from "../Morph";
import { Listening } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Word } from "../Word";

const SLUG = "vordlus";
const src = (text: string) => clipUrl(SLUG, clipId(text));

const MEANS: Record<string, MessageDescriptor> = {
  "Tallinn on suurem kui Tartu.": msg`Tallinn is bigger than Tartu.`,
  "Minu auto on uuem kui sinu auto.": msg`My car is newer than your car.`,
  "Kohv on kallim kui tee.": msg`Coffee is more expensive than tea.`,
  "Tartu on väiksem kui Tallinn.": msg`Tartu is smaller than Tallinn.`,
  "Täna on soojem kui eile.": msg`It’s warmer today than yesterday.`,
  "Tallinn on Tartust suurem.": msg`Tallinn is bigger than Tartu.`,
  "Jaan on vanem kui Mari.": msg`Jaan is older than Mari.`,
  "Jaan on Marist vanem.": msg`Jaan is older than Mari.`,
  "Kohv on teest kallim.": msg`Coffee is more expensive than tea.`,
  "Minu tuba on suurem kui sinu tuba.": msg`My room is bigger than your room.`,
  "Minu tuba on sinu toast suurem.": msg`My room is bigger than your room.`,
  "Mari on noorem kui Kati.": msg`Mari is younger than Kati.`,
  "Mari on Katist noorem.": msg`Mari is younger than Kati.`,
  "Tartu on vanem kui Tallinn.": msg`Tartu is older than Tallinn.`,
  "Tartu on Tallinnast vanem.": msg`Tartu is older than Tallinn.`,
  "Tallinn on Eesti kõige suurem linn.": msg`Tallinn is the biggest town in Estonia.`,
  "See on kõige parem kohvik.": msg`This is the best café.`,
  "Jaan on kõige vanem.": msg`Jaan is the oldest.`,
  "Mari on minu parim sõber.": msg`Mari is my best friend.`,
  "Minu tuba on sama suur kui sinu tuba.": msg`My room is as big as your room.`,
  "Tallinn on suur linn.": msg`Tallinn is a big town.`,
  "Jaan on vana.": msg`Jaan is old.`,
  "See kohvik on hea.": msg`This café is good.`,
  "See kohvik on parem.": msg`This café is better.`,
};

const HEARD_LABELS: Record<string, Record<"plain" | "more" | "most", MessageDescriptor>> = {
  suur: { plain: msg`big`, more: msg`bigger`, most: msg`the biggest` },
  vana: { plain: msg`old`, more: msg`older`, most: msg`the oldest` },
  hea: { plain: msg`good`, more: msg`better`, most: msg`the best` },
};

const MAKE_GLOSS: Record<(typeof CMP_MAKE)[number]["id"], MessageDescriptor> = {
  suurem: msg`big`,
  vanem: msg`old`,
  kulmem: msg`cold`,
  uuem: msg`new`,
  kallim: msg`expensive`,
  ilusam: msg`beautiful`,
  parem: msg`good`,
  vaiksem: msg`small`,
};

const FIX_PROMPTS = {
  "fix-kui": msg`Tallinn is bigger than Tartu.`,
  "fix-kulmem": msg`It’s colder today than yesterday.`,
} as const;

const TRANSLATE_PROMPTS: Record<(typeof CMP_TRANSLATE)[number]["id"], MessageDescriptor> = {
  "suurem-kui": msg`Tallinn is bigger than Tartu.`,
  kallim: msg`Coffee is more expensive than tea.`,
  "koige-parem": msg`This is the best café.`,
  vanem: msg`Jaan is older than Mari.`,
  "sama-suur": msg`My room is as big as your room.`,
  "parim-sober": msg`Mari is my best friend.`,
};

const GLOSSARY: Glossary = {
  suurem: { en: msg`bigger` },
  "kõige suurem": { en: msg`the biggest` },
  parem: { en: msg`better`, note: msg`The comparative of hea, good.` },
  "kõige parem": { en: msg`the best` },
  parim: { en: msg`the best`, note: msg`The short form of kõige parem.` },
  kui: { en: msg`than; as`, note: msg`After a comparative: suurem kui, bigger than.` },
  sama: { en: msg`the same`, note: msg`Sama suur kui: as big as.` },
  kallis: { en: msg`expensive` },
  "tallinn on suurem kui tartu": {
    en: msg`Tallinn is bigger than Tartu.`,
    show: "Tallinn on suurem kui Tartu",
  },
  "tallinn on tartust suurem": {
    en: msg`Tallinn is bigger than Tartu.`,
    show: "Tallinn on Tartust suurem",
  },
};

const meaning = (said: string, i18n: I18n) => i18n._(MEANS[said] as MessageDescriptor);

type MakeItem = FormItem & { pair: readonly [string, string] };
type HeardItem = ChoiceItem & { said: string; pair: readonly [string, string] };

const heardLabel = (word: string, kind: "plain" | "more" | "most", i18n: I18n) => (
  <span lang={i18n.locale}>
    {i18n._((HEARD_LABELS[word] as (typeof HEARD_LABELS)[string])[kind])}
  </span>
);

export const shuffledKinds = () => shuffle(["plain", "more", "most"] as const);

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const rewrite: SentenceItem[] = CMP_ST.map(({ kui, st }, i) => ({
      kind: "rewrite",
      id: `st-${i}`,
      from: kui,
      cue: (
        <Trans>
          with <span lang="et">-st</span>, without <span lang="et">kui</span>
        </Trans>
      ),
      answers: [st],
      src: src(st),
      explain: (
        <Trans>
          The thing you compare with takes <span lang="et">-st</span> and goes before the
          comparative.
        </Trans>
      ),
    }));

    const sentences: SentenceItem[] = CMP_TRANSLATE.map(({ id, answers }) => ({
      kind: "translate",
      id,
      prompt: i18n._(TRANSLATE_PROMPTS[id]),
      answers,
      src: src(answers[0]),
    }));

    const fixWhy: Record<(typeof CMP_FIX)[number]["id"], ReactNode> = {
      "fix-kui": (
        <Trans>
          Than is <span lang="et">kui</span>. <span lang="et">Nagu</span> means like.
        </Trans>
      ),
      "fix-parem": (
        <Trans>
          Better is a word of its own: <span lang="et">parem</span>.
        </Trans>
      ),
      "fix-vaiksem": (
        <Trans>
          The <span lang="et">-m</span> goes on the genitive <span lang="et">väikese</span>, which
          usually drops an e: <span lang="et">väiksem</span>.
        </Trans>
      ),
      "fix-koige": (
        <Trans>
          After <span lang="et">kõige</span> comes the comparative:{" "}
          <span lang="et">kõige suurem</span>.
        </Trans>
      ),
      "fix-tartust": (
        <Trans>
          Without <span lang="et">kui</span>, the thing you compare with takes{" "}
          <span lang="et">-st</span>: <span lang="et">Tartust</span>.
        </Trans>
      ),
      "fix-kulmem": (
        <Trans>
          Colder than is the comparative with <span lang="et">kui</span>:{" "}
          <span lang="et">külmem kui eile</span>.
        </Trans>
      ),
    };
    const fix: FixItem[] = CMP_FIX.map(({ id, wrong, answers }) => ({
      kind: "fix",
      id,
      wrong,
      answers,
      src: src(answers[0]),
      prompt: id in FIX_PROMPTS ? i18n._(FIX_PROMPTS[id as keyof typeof FIX_PROMPTS]) : undefined,
      explain: fixWhy[id],
    }));

    const pairs: MatchPair[] = [
      { id: "hea", left: "hea", right: t`good`, src: src("hea") },
      { id: "parem", left: "parem", right: t`better`, src: src("parem") },
      { id: "parim", left: "parim", right: t`the best`, src: src("parim") },
      { id: "vaike", left: "väike", right: t`small`, src: src("väike") },
      { id: "vaiksem", left: "väiksem", right: t`smaller`, src: src("väiksem") },
      { id: "koige-suurem", left: "kõige suurem", right: t`the biggest`, src: src("kõige suurem") },
    ];

    const talk: PassageQuestion[] = [
      {
        id: "bigger",
        kind: "truefalse",
        ask: t`Mari says Tallinn is bigger than Tartu.`,
        answer: true,
        line: 3,
      },
      {
        id: "flat",
        kind: "truefalse",
        ask: t`Mari’s new flat is bigger than her old one.`,
        answer: false,
        line: 6,
      },
      {
        id: "why",
        ask: t`What is better about the new flat?`,
        options: [
          { id: "cheaper-quieter", label: t`It’s cheaper and quieter` },
          { id: "newer", label: t`It’s newer and warmer` },
          { id: "sea", label: t`It’s nearer the sea` },
        ],
        answer: "newer",
        line: 7,
      },
      {
        id: "coffee",
        kind: "short",
        ask: t`How much did a coffee cost in Tartu? Write the number as Mari says it.`,
        answers: ["kaks", "kaks eurot", "2", "2 eurot", "2 €"],
        line: 11,
      },
      {
        id: "cafe",
        ask: t`Where is the best café?`,
        options: [
          { id: "old-town", label: t`In the old town` },
          { id: "work", label: t`At her work` },
          { id: "home", label: t`Next to her home` },
        ],
        answer: "home",
        line: 14,
      },
      {
        id: "job",
        ask: t`What is better at Mari’s new job?`,
        options: [
          { id: "office", label: t`A bigger office and more money` },
          { id: "desk", label: t`A bigger desk and a newer computer` },
          { id: "days", label: t`Shorter days and a much nicer boss` },
        ],
        answer: "desk",
        line: 19,
      },
      {
        id: "until",
        ask: t`Until when does Mari work now?`,
        options: [
          { id: "six", label: t`Until six` },
          { id: "five", label: t`Until five` },
          { id: "seven", label: t`Until seven` },
        ],
        answer: "six",
        line: 20,
      },
      {
        id: "friend",
        kind: "short",
        ask: t`Who is Mari’s best friend? Write the name.`,
        answers: ["Kati"],
        line: 25,
      },
      {
        id: "visit",
        ask: t`When is Jaan coming to Tallinn?`,
        options: [
          { id: "tomorrow", label: t`Tomorrow` },
          { id: "week", label: t`In a week` },
          { id: "summer", label: t`Next summer` },
        ],
        answer: "week",
        line: 27,
      },
    ];
    return { rewrite, sentences, fix, pairs, talk };
  }, [t, i18n]);
}

export function VordlusLesson() {
  const { t, i18n } = useLingui();
  const content = useContent();
  const forms = lessonBySlug("pohivormid")?.n;
  const agree = lessonBySlug("omadussonad")?.n;
  const into = lessonBySlug("majas-majja-majast")?.n;

  const rows = (list: readonly string[]) =>
    list.map((said) => ({
      main: <span lang="et">{said}</span>,
      sub: meaning(said, i18n),
      src: src(said),
    }));

  const chains: MorphChain[] = CMP_CHAINS.map((chain) => ({
    id: chain.id,
    steps: chain.steps.map((word, i) => ({
      word,
      label: [t`adjective`, t`genitive`, t`comparative`][i] as string,
      src: src(word),
    })),
  }));

  const makeItems = useMemo<MakeItem[]>(
    () =>
      CMP_MAKE.map(({ id, kind, base, answer }) => ({
        base,
        gloss: i18n._(MAKE_GLOSS[id]),
        cue: t`comparative`,
        answers: id === "vaiksem" ? [answer, "väikesem"] : [answer],
        src: src(answer),
        pair: [kind, id] as const,
        explain:
          kind === "own" ? (
            <Trans>
              This one is its own word: <span lang="et">{answer}</span>.
            </Trans>
          ) : kind === "drop" ? (
            <Trans>
              The <span lang="et">-m</span> goes on the genitive <span lang="et">väikese</span>,
              which usually drops an e: <span lang="et">väiksem</span>.
            </Trans>
          ) : kind === "three" ? (
            <Trans>
              <span lang="et">Ilusa</span> has three syllables, so its a stays:{" "}
              <span lang="et">ilusam</span>.
            </Trans>
          ) : kind === "a-to-e" ? (
            <Trans>
              Before <span lang="et">-m</span>, the genitive’s a becomes e:{" "}
              <span lang="et">{answer}</span>.
            </Trans>
          ) : (
            <Trans>
              <span lang="et">-m</span> on the genitive: <span lang="et">{answer}</span>.
            </Trans>
          ),
      })),
    [t, i18n],
  );

  const heardItems = useMemo<HeardItem[]>(
    () =>
      CMP_HEARD.map(({ said, word, kind }, i) => {
        const kinds = ["plain", "more", "most"] as const;
        const turn = i === 0 ? 1 : i % 3;
        const order = [...kinds.slice(turn), ...kinds.slice(0, turn)];
        return {
          said,
          pair: [kind, said] as const,
          src: src(said),
          answer: kind,
          options: order.map((k) => ({ id: k, label: heardLabel(word, k, i18n) })),
          explain: (
            <>
              <span lang="et" className="font-medium text-ink">
                {said}
              </span>{" "}
              {meaning(said, i18n) || null}
            </>
          ),
        };
      }),
    [i18n],
  );

  const heardRun = (items: readonly HeardItem[], pinned?: HeardItem): HeardItem[] =>
    eachPairFirst(items, pinned).map((item) => {
      if (item === pinned) return item;
      const word = CMP_HEARD.find((h) => h.said === item.said)?.word ?? "suur";
      return {
        ...item,
        options: shuffledKinds().map((k) => ({ id: k, label: heardLabel(word, k, i18n) })),
      };
    });

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Bigger is <span lang="et">suurem</span>: the genitive with <span lang="et">-m</span>. Than
          is <span lang="et">kui</span>, and the biggest is <span lang="et">kõige suurem</span>.
        </Trans>
      }
      facts={[
        <Trans key="m">18 minutes</Trans>,
        <Trans key="q">6 exercises, 4 of them typed, and a conversation</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["suurem", "kõige suurem", "parem", "kõige parem", "parim", "kui", "sama", "kallis"]}
      recap={[
        <Trans key="1">
          A comparative is the genitive with <b lang="et">-m</b>:{" "}
          <b lang="et">suur, suure, suurem</b>; <b lang="et">uus, uue, uuem</b>. A two-syllable
          genitive’s a usually becomes e: <b lang="et">vana, vanem</b>.
        </Trans>,
        <Trans key="2">
          Than is <b lang="et">kui</b>: <b lang="et">suurem kui Tartu</b>. Or leave out{" "}
          <b lang="et">kui</b> and give the thing you compare with <b lang="et">-st</b>, before the
          comparative: <b lang="et">Tartust suurem</b>.
        </Trans>,
        <Trans key="3">
          For the biggest, put <b lang="et">kõige</b> before the comparative:{" "}
          <b lang="et">kõige suurem</b>.
        </Trans>,
        <Trans key="4">
          Good, better, best: <b lang="et">hea, parem, kõige parem</b> or <b lang="et">parim</b>.
          Small, smaller: <b lang="et">väike, väiksem</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "bigger",
          title: t`Bigger: -m on the genitive`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    To say bigger, take the adjective’s genitive from lesson {forms} and add{" "}
                    <span lang="et">-m</span>: <span lang="et">suur</span>,{" "}
                    <span lang="et">suure</span>, <Word w="suurem" />. This form is the comparative.
                    Than is <Word w="kui" />: <Word w="Tallinn on suurem kui Tartu" />.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    When the genitive has two syllables and ends in a, the a usually becomes e:{" "}
                    <span lang="et">vana, vana, vanem</span>;{" "}
                    <span lang="et">külm, külma, külmem</span>.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Some words change more. Two common ones: good, <span lang="et">hea</span>,
                    becomes <Word w="parem" />, a word of its own, and small,{" "}
                    <span lang="et">väike</span>, usually drops an e from its genitive{" "}
                    <span lang="et">väikese</span>: <span lang="et">väiksem</span>. Pick a word and
                    tap its forms.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Morph label={t`Adjectives`} chains={chains} />
              </Panel>
              <ListenRows items={rows(CMP_THAN)} />
              <Prose>
                <p>
                  <Trans>Now type the comparative of each adjective.</Trans>
                </p>
              </Prose>
              <Quiz
                id="make-comparative"
                title={<Trans>Big, bigger</Trans>}
                items={makeItems}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight comparatives.</Trans>
                  ) : share >= 0.6 ? (
                    <Trans>
                      Most of them. Find the genitive first, then add <span lang="et">-m</span>.
                    </Trans>
                  ) : (
                    <Trans>Tap the words above once more, then try again.</Trans>
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
          id: "than",
          title: t`Than: two ways`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    There is a second way to say than. Leave out <span lang="et">kui</span>, put the
                    thing you compare with before the comparative, and give it{" "}
                    <span lang="et">-st</span> from lesson {into}:{" "}
                    <Word w="Tallinn on Tartust suurem" />. Both mean the same.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rows(CMP_ST.flatMap(({ kui, st }) => [kui, st]))} />
              <Prose>
                <p>
                  <Trans>
                    Rewrite each sentence with <span lang="et">-st</span> instead of{" "}
                    <span lang="et">kui</span>.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="kui-to-st"
                title={
                  <Trans>
                    Without <span lang="et">kui</span>
                  </Trans>
                }
                items={content.rewrite}
                rounds={content.rewrite.length}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>
                      All six, with <span lang="et">-st</span> before the comparative.
                    </Trans>
                  ) : share >= 0.6 ? (
                    <Trans>
                      Most of them. Check the <span lang="et">-st</span> form and where it goes.
                    </Trans>
                  ) : (
                    <Trans>Listen to the pairs above once more, then try again.</Trans>
                  )
                }
                recall={sentenceRecall}
                round={(props) => <SentenceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "most",
          title: t`The biggest`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    For the biggest, put <span lang="et">kõige</span> before the comparative:{" "}
                    <Word w="kõige suurem" />, the biggest; <Word w="kõige parem" />, the best. Word
                    for word, <span lang="et">kõige</span> is of all. The best also has a short
                    form: <Word w="parim" />.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    As big as is <Word w="sama" /> and the adjective, then{" "}
                    <span lang="et">kui</span>: <span lang="et">sama suur kui</span>. Tap a line to
                    hear it.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rows(CMP_MOST)} />
              <Prose>
                <p>
                  <Trans>
                    Hear a sentence and pick what it says, such as big, bigger or the biggest.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="big-bigger-biggest"
                title={<Trans>Big, bigger or the biggest?</Trans>}
                items={heardItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>
                      All six, by the ending and by <span lang="et">kõige</span>.
                    </Trans>
                  ) : share >= 0.6 ? (
                    <Trans>
                      Most of them. Listen for <span lang="et">-m</span> and for{" "}
                      <span lang="et">kõige</span>.
                    </Trans>
                  ) : (
                    <Trans>Tap the lines above once more, then try again.</Trans>
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
          id: "own-words",
          title: t`Good, better, best`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Match each form with what it means.</Trans>
                </p>
              </Prose>
              <Match
                id="good-better-best"
                title={<Trans>What does it mean?</Trans>}
                pairs={content.pairs}
              />
              <Aside>
                <Trans>
                  A comparative takes the noun’s case like any adjective from lesson {agree}:{" "}
                  <span lang="et">suuremas majas</span>, in a bigger house.
                </Trans>
              </Aside>
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
                id="write-comparisons"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.sentences}
                rounds={content.sentences.length}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six sentences.</Trans>
                  ) : share >= 0.6 ? (
                    <Trans>Most of them. Check the comparative in the ones you missed.</Trans>
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
                  <Trans>In each sentence, one word is wrong. Tap it, then type it right.</Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-comparison"
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
          title: t`Tallinn or Tartu?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Mari has moved from Tartu to Tallinn. Jaan asks how she likes it.</Trans>
                </p>
              </Prose>
              <Listening
                id="mari-and-jaan"
                title={<Trans>Listen: Mari and Jaan</Trans>}
                clip="c-talk"
                turns={CMP_TALK.turns}
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
