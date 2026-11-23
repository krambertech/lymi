import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  GI_EXCEPT,
  GI_FIX,
  GI_MAKE,
  GI_MITTE,
  GI_NOT,
  GI_SOME,
  GI_TALK,
  GI_TRANSLATE,
  GI_WHICH,
  capital,
  clipId,
  clipUrl,
} from "../../../lib/learn/clips";
import type { PassageQuestion } from "../../../lib/learn/questions";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { ListenRows } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Match, type MatchPair } from "../Match";
import { Listening } from "../Passage";
import { Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Word } from "../Word";

const SLUG = "keegi";
const src = (text: string) => clipUrl(SLUG, clipId(text));

const MEANS: Record<string, MessageDescriptor> = {
  "Keegi helistas.": msg`Somebody called.`,
  "Kas sa tahad midagi?": msg`Do you want something?`,
  "Mu võtmed on kuskil siin.": msg`My keys are somewhere here.`,
  "Ma tahan kuhugi minna.": msg`I want to go somewhere.`,
  "Kas sa käid kunagi Pärnus?": msg`Do you ever go to Pärnu?`,
  "Tule millalgi külla!": msg`Come and visit some time!`,
  "Keegi tuleb.": msg`Somebody is coming.`,
  "Keegi ei tule.": msg`Nobody is coming.`,
  "Ma näen kedagi.": msg`I see somebody.`,
  "Ma ei näe kedagi.": msg`I don’t see anybody.`,
  "Mul on midagi.": msg`I have something.`,
  "Mul ei ole midagi.": msg`I have nothing.`,
  "Ta läheb kuhugi.": msg`He or she is going somewhere.`,
  "Ta ei lähe kuhugi.": msg`He or she isn’t going anywhere.`,
  "Kati ostab midagi.": msg`Kati is buying something.`,
  "Kati ei osta midagi.": msg`Kati isn’t buying anything.`,
  "Ma räägin kellegagi.": msg`I’m talking to somebody.`,
  "Ma ei räägi kellegagi.": msg`I’m not talking to anybody.`,
  "Kes tuli? Mitte keegi.": msg`Who came? Nobody.`,
  "Mida sa tahad? Mitte midagi.": msg`What do you want? Nothing.`,
  "Kodus on keegi.": msg`Somebody is at home.`,
  "Kodus ei ole kedagi.": msg`Nobody is at home.`,
  "Ma helistasin kellelegi.": msg`I called somebody.`,
  "Kas kellelgi on pliiats?": msg`Does anybody have a pencil?`,
  "Me rääkisime kellestki.": msg`We talked about somebody.`,
  "Ta ei räägi millestki.": msg`He or she doesn’t talk about anything.`,
  "Ma mõtlen millelegi.": msg`I’m thinking about something.`,
  "Kas sul on millegagi kirjutada?": msg`Do you have something to write with?`,
  "See on kellegi kott.": msg`This is somebody’s bag.`,
  "Ma sain kelleltki kirja.": msg`I got a letter from somebody.`,
  "Ta tahab kellekski saada.": msg`He or she wants to become somebody.`,
};

const MAKE_CUES: Record<(typeof GI_MAKE)[number]["id"], MessageDescriptor> = {
  kellelegi: msg`to somebody`,
  kellelgi: msg`somebody has`,
  kellegagi: msg`with somebody`,
  kedagi: msg`somebody, as the object`,
  midagi: msg`something`,
  kuhugi: msg`to somewhere`,
  kellestki: msg`about somebody`,
  millestki: msg`about something`,
};

const MAKE_GLOSS: Record<(typeof GI_MAKE)[number]["id"], MessageDescriptor> = {
  kellelegi: msg`to whom`,
  kellelgi: msg`who has`,
  kellegagi: msg`with whom`,
  kedagi: msg`whom`,
  midagi: msg`what`,
  kuhugi: msg`where to`,
  kellestki: msg`about whom`,
  millestki: msg`about what`,
};

const TRANSLATE_PROMPTS: Record<(typeof GI_TRANSLATE)[number]["id"], MessageDescriptor> = {
  helistas: msg`Somebody called.`,
  kedagi: msg`I don’t see anybody.`,
  midagi: msg`I have nothing.`,
  tahad: msg`Do you want something?`,
  kuhugi: msg`She isn’t going anywhere.`,
  keegi: msg`Nobody is coming.`,
};

const FIX_PROMPTS: Record<(typeof GI_FIX)[number]["id"], MessageDescriptor> = {
  "fix-kedagi": msg`I don’t see anybody.`,
  "fix-kellelegi": msg`I called somebody.`,
  "fix-kellestki": msg`We talked about somebody.`,
  "fix-midagi": msg`I have nothing.`,
  "fix-kuhugi": msg`She isn’t going anywhere.`,
  "fix-kellegagi": msg`I’m not talking to anybody.`,
};

const GLOSSARY: Glossary = {
  keegi: { en: msg`somebody, anybody`, note: msg`With ei: nobody.` },
  midagi: { en: msg`something, anything`, note: msg`With ei: nothing.` },
  kuskil: { en: msg`somewhere, anywhere` },
  kuhugi: { en: msg`(to) somewhere, anywhere` },
  kunagi: { en: msg`ever; some day`, note: msg`With ei: never.` },
  millalgi: { en: msg`some time` },
  millal: { en: msg`when` },
  "mitte keegi": { en: msg`nobody`, note: msg`An answer on its own: Kes tuli? Mitte keegi.` },
  "mitte midagi": { en: msg`nothing` },
};

const meaning = (said: string, i18n: I18n) => {
  const descriptor = MEANS[said];
  return descriptor ? i18n._(descriptor) : null;
};

type MakeItem = FormItem & { pair: readonly [string, string] };
type WhichItem = FormItem & { pair: readonly [string, string]; options: readonly string[] };

export const whichRun = (items: readonly WhichItem[], pinned?: WhichItem): WhichItem[] =>
  eachPairFirst(items, pinned).map((item) =>
    item === pinned ? item : { ...item, options: shuffle([...item.options]) },
  );

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const rewrite: SentenceItem[] = GI_NOT.map(({ pos, neg, also }, i) => ({
      kind: "rewrite",
      id: `not-${i}`,
      from: pos,
      cue: (
        <Trans>
          with <span lang="et">ei</span>
        </Trans>
      ),
      answers: [neg, ...also],
      src: src(neg),
      explain: (
        <Trans>
          Put <span lang="et">ei</span> before the verb; the <span lang="et">-gi</span> word stays
          as it is.
        </Trans>
      ),
    }));

    const sentences: SentenceItem[] = GI_TRANSLATE.map(({ id, answers }) => ({
      kind: "translate",
      id,
      prompt: i18n._(TRANSLATE_PROMPTS[id]),
      answers,
      src: src(answers[0]),
    }));

    const fixWhy: Record<(typeof GI_FIX)[number]["id"], ReactNode> = {
      "fix-kedagi": (
        <Trans>
          The object is <span lang="et">kedagi</span>, built on <span lang="et">keda</span>.
        </Trans>
      ),
      "fix-kellelegi": (
        <Trans>
          <span lang="et">Kellele</span> ends in a vowel, so <span lang="et">-gi</span>:{" "}
          <span lang="et">kellelegi</span>.
        </Trans>
      ),
      "fix-kellestki": (
        <Trans>
          <span lang="et">Kellest</span> ends in t, so <span lang="et">-ki</span>:{" "}
          <span lang="et">kellestki</span>.
        </Trans>
      ),
      "fix-midagi": (
        <Trans>
          Nothing is <span lang="et">ei … midagi</span>; <span lang="et">mida</span> alone asks
          what.
        </Trans>
      ),
      "fix-kuhugi": (
        <Trans>
          Anywhere is <span lang="et">kuhugi</span>; <span lang="et">kuhu</span> alone asks where
          to.
        </Trans>
      ),
      "fix-kellegagi": (
        <Trans>
          <span lang="et">Kellega</span> ends in a vowel, so <span lang="et">-gi</span>:{" "}
          <span lang="et">kellegagi</span>.
        </Trans>
      ),
    };
    const fix: FixItem[] = GI_FIX.map(({ id, wrong, answers }) => ({
      kind: "fix",
      id,
      wrong,
      answers,
      src: src(answers[0]),
      prompt: i18n._(FIX_PROMPTS[id]),
      explain: fixWhy[id],
    }));

    const pairs: MatchPair[] = [
      { id: "keegi", left: "keegi", right: t`somebody`, src: src("keegi") },
      { id: "midagi", left: "midagi", right: t`something`, src: src("midagi") },
      { id: "kuskil", left: "kuskil", right: t`somewhere`, src: src("kuskil") },
      { id: "kuhugi", left: "kuhugi", right: t`to somewhere`, src: src("kuhugi") },
      { id: "kunagi", left: "kunagi", right: t`ever; never, when negated`, src: src("kunagi") },
      { id: "millalgi", left: "millalgi", right: t`some time`, src: src("millalgi") },
    ];

    const talk: PassageQuestion[] = [
      {
        id: "lost",
        ask: t`What can’t Kati find?`,
        options: [
          { id: "phone", label: t`Her phone` },
          { id: "keys", label: t`Her keys` },
          { id: "wallet", label: t`Her wallet` },
        ],
        answer: "keys",
        line: 0,
      },
      {
        id: "saw",
        kind: "truefalse",
        ask: t`Peeter saw the keys.`,
        answer: false,
        line: 1,
      },
      {
        id: "yesterday",
        ask: t`Where were the keys yesterday?`,
        options: [
          { id: "table", label: t`On the table` },
          { id: "kitchen", label: t`In the kitchen` },
          { id: "shop", label: t`At the shop` },
        ],
        answer: "table",
        line: 3,
      },
      {
        id: "mari",
        kind: "truefalse",
        ask: t`Mari took something.`,
        answer: false,
        line: 8,
      },
      {
        id: "answered",
        ask: t`Who answered when Kati called Mari?`,
        options: [
          { id: "mother", label: t`Mari’s mother` },
          { id: "friend", label: t`Kati’s friend` },
          { id: "nobody", label: t`Nobody` },
        ],
        answer: "nobody",
        line: 10,
      },
      {
        id: "where",
        kind: "short",
        ask: t`Where was Kati yesterday? Write one place as she says it.`,
        answers: ["poes", "kohvikus"],
        line: 14,
      },
      {
        id: "phone",
        kind: "truefalse",
        ask: t`A week ago Kati left her phone in a shop.`,
        answer: true,
        line: 19,
      },
      {
        id: "found",
        ask: t`Where are the keys?`,
        options: [
          { id: "shop", label: t`At the shop` },
          { id: "cafe", label: t`At the café` },
          { id: "home", label: t`At home` },
        ],
        answer: "cafe",
        line: 25,
      },
      {
        id: "evening",
        ask: t`What will they do in the evening?`,
        options: [
          { id: "eat", label: t`Go somewhere to eat` },
          { id: "cook", label: t`Cook at home together` },
          { id: "shop", label: t`Go to the shop` },
        ],
        answer: "eat",
        line: 30,
      },
    ];
    return { rewrite, sentences, fix, pairs, talk };
  }, [t, i18n]);
}

export function KeegiLesson() {
  const { t, i18n } = useLingui();
  const content = useContent();
  const partitive = lessonBySlug("osastav")?.n;
  const negation = lessonBySlug("eitus")?.n;

  const rows = (list: readonly string[]) =>
    list.map((said) => ({
      main: <span lang="et">{said}</span>,
      sub: meaning(said, i18n),
      src: src(said),
    }));

  const makeItems = useMemo<MakeItem[]>(
    () =>
      GI_MAKE.map(({ id, kind, base, said }) => {
        const last = base.at(-1);
        const Base = capital(base);
        return {
          base,
          gloss: i18n._(MAKE_GLOSS[id]),
          cue: i18n._(MAKE_CUES[id]),
          answers: [id],
          src: src(said),
          pair: [kind, id] as const,
          explain:
            kind === "ki" ? (
              <Trans>
                <span lang="et">{Base}</span> ends in {last}, so <span lang="et">-ki</span>:{" "}
                <span lang="et">{id}</span>.
              </Trans>
            ) : base.endsWith("l") ? (
              <Trans>
                <span lang="et">{Base}</span> ends in l, so <span lang="et">-gi</span>:{" "}
                <span lang="et">{id}</span>.
              </Trans>
            ) : (
              <Trans>
                <span lang="et">{Base}</span> ends in a vowel, so <span lang="et">-gi</span>:{" "}
                <span lang="et">{id}</span>.
              </Trans>
            ),
        };
      }),
    [i18n],
  );

  const whichItems = useMemo<WhichItem[]>(
    () =>
      GI_WHICH.map(({ id, kind, base, cue, said }) => {
        const last = base.at(-1);
        const Base = capital(base);
        return {
          base,
          cue,
          cueLang: "et",
          answers: [`-${kind}`],
          options: ["-gi", "-ki"],
          src: src(said),
          pair: [kind, id] as const,
          explain:
            kind === "ki" ? (
              <Trans>
                <span lang="et">{Base}</span> ends in {last}, so <span lang="et">-ki</span>:{" "}
                <span lang="et">{id}</span>.
              </Trans>
            ) : base.endsWith("l") ? (
              <Trans>
                <span lang="et">{Base}</span> ends in l, so <span lang="et">-gi</span>:{" "}
                <span lang="et">{id}</span>.
              </Trans>
            ) : (
              <Trans>
                <span lang="et">{Base}</span> ends in a vowel, so <span lang="et">-gi</span>:{" "}
                <span lang="et">{id}</span>.
              </Trans>
            ),
        };
      }),
    [],
  );

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Add <span lang="et">-gi</span> or <span lang="et">-ki</span> to most question words and
          they mean some: <span lang="et">keegi</span>, somebody; <span lang="et">midagi</span>,
          something. With <span lang="et">ei</span>, the same words mean nobody and nothing.
        </Trans>
      }
      facts={[
        <Trans key="m">18 minutes</Trans>,
        <Trans key="q">6 exercises, 4 of them typed, and a conversation</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "keegi",
        "midagi",
        "kuskil",
        "kuhugi",
        "kunagi",
        "millalgi",
        "mitte keegi",
        "mitte midagi",
      ]}
      recap={[
        <Trans key="1">
          Most question words with <b lang="et">-gi</b> or <b lang="et">-ki</b> mean some:{" "}
          <b lang="et">keegi</b>, somebody; <b lang="et">midagi</b>, something;{" "}
          <b lang="et">kuhugi</b>, to somewhere.
        </Trans>,
        <Trans key="2">
          With <b lang="et">ei</b>, they mean nobody, nothing, nowhere:{" "}
          <b lang="et">Keegi ei tule</b>. On its own: <b lang="et">mitte keegi</b>.
        </Trans>,
        <Trans key="3">
          Every case of <b lang="et">kes</b> and <b lang="et">mis</b> takes <b lang="et">-gi</b> or{" "}
          <b lang="et">-ki</b> at the end: <b lang="et">kellelegi</b>, <b lang="et">kellegagi</b>,{" "}
          <b lang="et">millestki</b>.
        </Trans>,
        <Trans key="4">
          <b lang="et">-ki</b> after k, p, t, g, b, d, s, h, f, š, z or ž; <b lang="et">-gi</b>{" "}
          after anything else.
        </Trans>,
      ]}
      sections={[
        {
          id: "some",
          title: t`Somebody, something`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Take most question words and add <span lang="et">-gi</span>, and they mean some:{" "}
                    <span lang="et">mida</span>, what, becomes <Word w="midagi" />, something;{" "}
                    <span lang="et">kuhu</span>, where to, becomes <Word w="kuhugi" />, to
                    somewhere. <span lang="et">Kes</span>, who, is the odd one: <Word w="keegi" />,
                    somebody.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Two don’t follow the pattern, so learn them as words: <Word w="kuskil" />,
                    somewhere, and <Word w="kunagi" />, ever. <Word w="Millal" />, when, does:{" "}
                    <Word w="millalgi" />, some time. Tap a line to hear it.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rows(GI_SOME)} />
              <Match
                id="some-words"
                title={<Trans>What does it mean?</Trans>}
                pairs={content.pairs}
              />
            </>
          ),
        },
        {
          id: "not",
          title: t`Nobody, nothing`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    For nobody or nothing, put <span lang="et">ei</span> before the verb, as in
                    lesson {negation}, and mostly keep the <span lang="et">-gi</span> word as it is:{" "}
                    <span lang="et">Keegi tuleb</span>, somebody is coming;{" "}
                    <span lang="et">Keegi ei tule</span>, nobody is coming.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rows(GI_NOT.flatMap(({ pos, neg }) => [pos, neg]))} />
              <Aside>
                <Trans>
                  As an answer on its own, say <Word w="mitte keegi" /> or <Word w="mitte midagi" />
                  : <span lang="et">Kes tuli? Mitte keegi.</span>
                </Trans>
              </Aside>
              <ListenRows items={rows(GI_MITTE)} />
              <Aside>
                <Trans>
                  One exception: when <span lang="et">ei ole</span> says nobody is there,{" "}
                  <span lang="et">keegi</span> takes the partitive, as <span lang="et">kassi</span>{" "}
                  does in <span lang="et">Mul pole kassi</span> in lesson {partitive}:{" "}
                  <span lang="et">Kodus ei ole kedagi</span>.
                </Trans>
              </Aside>
              <ListenRows items={rows(GI_EXCEPT)} />
              <Prose>
                <p>
                  <Trans>
                    Rewrite each sentence with <span lang="et">ei</span>, so it says nobody, nothing
                    or nowhere.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="make-not"
                title={<Trans>Nobody, nothing</Trans>}
                items={content.rewrite}
                rounds={content.rewrite.length}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>
                      All six: <span lang="et">ei</span> before the verb, the word unchanged.
                    </Trans>
                  ) : share >= 0.6 ? (
                    <Trans>
                      Most of them. Check the verb’s form after <span lang="et">ei</span>.
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
          id: "cases",
          title: t`To somebody, with somebody`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Put the question word in its case first, then add the ending:{" "}
                    <span lang="et">kellele</span>, to whom, becomes{" "}
                    <span lang="et">kellelegi</span>, to somebody; <span lang="et">kellega</span>,
                    with whom, becomes <span lang="et">kellegagi</span>, with somebody. Only{" "}
                    <span lang="et">keegi</span> itself is built differently. After t, the ending is{" "}
                    <span lang="et">-ki</span>: <span lang="et">kellest</span>, about whom, becomes{" "}
                    <span lang="et">kellestki</span>. The next section gives the other sounds that
                    take <span lang="et">-ki</span>.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rows(GI_MAKE.map(({ said }) => said))} />
              <Prose>
                <p>
                  <Trans>Type the form that means what the cue says.</Trans>
                </p>
              </Prose>
              <Quiz
                id="make-gi"
                title={<Trans>Add the ending</Trans>}
                items={makeItems}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight, each on its case.</Trans>
                  ) : share >= 0.6 ? (
                    <Trans>Most of them. Find the case first, then add the ending.</Trans>
                  ) : (
                    <Trans>Tap the lines above once more, then try again.</Trans>
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
          id: "gi-or-ki",
          title: t`-gi or -ki`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    The last sound decides. After k, p, t, g, b, d, s, h, f, š, z or ž, the ending
                    is <span lang="et">-ki</span>: <span lang="et">kellestki</span>,{" "}
                    <span lang="et">kustki</span>, from somewhere. After anything else, a vowel or
                    l, m, n, r, it is <span lang="et">-gi</span>: <span lang="et">kellelegi</span>,{" "}
                    <span lang="et">millalgi</span>.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rows(GI_WHICH.map(({ said }) => said))} />
              <Quiz
                id="gi-or-ki"
                title={<Trans>-gi or -ki?</Trans>}
                items={whichItems}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight, by the last sound.</Trans>
                  ) : share >= 0.6 ? (
                    <Trans>Most of them. Listen for the last sound before the ending.</Trans>
                  ) : (
                    <Trans>Read the rule above once more, then try again.</Trans>
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
                id="write-somebody"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.sentences}
                rounds={content.sentences.length}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six sentences.</Trans>
                  ) : share >= 0.6 ? (
                    <Trans>
                      Most of them. Check the <span lang="et">-gi</span> word in the ones you
                      missed.
                    </Trans>
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
                id="fix-somebody"
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
          title: t`Where are the keys?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kati can’t find something and asks Peeter. <span lang="et">Ei näinud</span> is
                    didn’t see; a later lesson builds that form.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="kati-and-peeter"
                title={<Trans>Listen: Kati and Peeter</Trans>}
                clip="c-talk"
                turns={GI_TALK.turns}
                names={{ main: t`Peeter`, second: t`Kati` }}
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
