import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  TRA_AGREE,
  TRA_BECOME,
  TRA_CHAINS,
  TRA_FIX,
  TRA_FOR,
  TRA_MAKE,
  TRA_NA_KS,
  TRA_TALK,
  TRA_TRANSLATE,
  clipId,
  clipUrl,
} from "../../../lib/learn/clips";
import type { PassageQuestion } from "../../../lib/learn/questions";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { ListenRows, Panel } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import { type GapItem, GapPassage } from "../GapPassage";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Match, type MatchPair } from "../Match";
import { Morph, type MorphChain } from "../Morph";
import { Listening } from "../Passage";
import { Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Word } from "../Word";

const SLUG = "saav";
const src = (text: string) => clipUrl(SLUG, clipId(text));

const MEANS: Record<string, MessageDescriptor> = {
  "Mari tahab saada arstiks.": msg`Mari wants to become a doctor.`,
  "Jaan sai õpetajaks.": msg`Jaan became a teacher.`,
  "Ma jäin haigeks.": msg`I fell ill.`,
  "Ilm muutub külmaks.": msg`The weather is turning cold.`,
  "Tuba läheb soojaks.": msg`The room is getting warm.`,
  "Ma tulen reedeks tagasi.": msg`I’ll be back by Friday.`,
  "Ma lähen nädalaks Pärnusse.": msg`I’m going to Pärnu for a week.`,
  "Mida sa hommikusöögiks sööd?": msg`What do you eat for breakfast?`,
  "Mida sa sünnipäevaks tahad?": msg`What do you want for your birthday?`,
  "Kas sa oled õhtuks kodus?": msg`Will you be home by the evening?`,
  "Ta sai heaks arstiks.": msg`He or she became a good doctor.`,
  "Ta alustas uue arstina.": msg`He or she started as the new doctor.`,
  "Ilm muutus väga külmaks.": msg`The weather turned very cold.`,
  "Ta töötab arstina.": msg`He or she works as a doctor.`,
  "Ta sai arstiks.": msg`He or she became a doctor.`,
  "Ta alustas haiglas arstina.": msg`He or she started at the hospital as a doctor.`,
};

const MAKE_GLOSS: Record<(typeof TRA_MAKE)[number]["id"], MessageDescriptor> = {
  arstiks: msg`a doctor`,
  nadalaks: msg`a week`,
  opetajaks: msg`a teacher`,
  haigeks: msg`ill`,
  reedeks: msg`Friday`,
  kulmaks: msg`cold`,
  soojaks: msg`warm`,
  sobraks: msg`a friend`,
};

const NOUN_GLOSS: Record<(typeof TRA_NA_KS)[number]["noun"], MessageDescriptor> = {
  arst: msg`a doctor`,
  opetaja: msg`a teacher`,
  kokk: msg`a cook`,
  muuja: msg`a shop assistant`,
};

const TRANSLATE_PROMPTS: Record<(typeof TRA_TRANSLATE)[number]["id"], MessageDescriptor> = {
  "saada-arstiks": msg`I want to become a doctor.`,
  kulmaks: msg`The weather is turning cold.`,
  reedeks: msg`I’ll be back by Friday.`,
  nadalaks: msg`I’m going to Tartu for a week.`,
  sunnipaevaks: msg`What do you want for your birthday?`,
  "heaks-opetajaks": msg`She became a good teacher.`,
};

const FIX_PROMPTS: Record<(typeof TRA_FIX)[number]["id"], MessageDescriptor> = {
  "fix-arstiks": msg`She became a doctor.`,
  "fix-arstina": msg`She works as a doctor.`,
  "fix-haigeks": msg`I fell ill.`,
  "fix-heaks": msg`She became a good doctor.`,
  "fix-reedeks": msg`I’ll be back by Friday.`,
  "fix-kulmaks": msg`The weather is turning cold.`,
};

const GLOSSARY: Glossary = {
  arstiks: { en: msg`into a doctor`, note: msg`Ta sai arstiks: he or she became a doctor.` },
  saama: { en: msg`to become; to get; can`, note: msg`With -ks it means become.` },
  jääma: { en: msg`to stay; to become (ill)`, note: msg`Haigeks jääma: to fall ill.` },
  muutuma: { en: msg`to change, to turn` },
  reedeks: { en: msg`by Friday` },
  nädalaks: { en: msg`for a week` },
  "heaks arstiks": { en: msg`into a good doctor` },
  kingiks: { en: msg`as a present` },
  alustas: { en: msg`started` },
  "ta töötab arstina": { en: msg`He or she works as a doctor.`, show: "Ta töötab arstina" },
  "ta sai arstiks": { en: msg`He or she became a doctor.`, show: "Ta sai arstiks" },
};

const MESSAGE_GAPS: readonly GapItem[] = [
  {
    id: "heaks",
    before: "Tere, Mari! Mu vend sai",
    after: ".",
    answer: "heaks arstiks",
    options: ["heaks arstiks", "hea arstiks", "hea arstina"],
  },
  {
    id: "arstina",
    before: "Ta töötab nüüd Pärnus",
    after: ".",
    answer: "arstina",
    options: ["arstile", "arstina", "arst"],
  },
  {
    id: "nadalaks",
    before: "Ma lähen",
    after: "Pärnusse.",
    answer: "nädalaks",
    options: ["nädalast", "nädalana", "nädalaks"],
  },
  {
    id: "reedeks",
    before: "Ma tulen",
    after: "tagasi.",
    answer: "reedeks",
    options: ["reedeks", "reedeni", "reedele"],
  },
  {
    id: "sunnipaevaks",
    before: "Mida sa",
    after: "tahad?",
    answer: "sünnipäevaks",
    options: ["sünnipäevas", "sünnipäevaks", "sünnipäevani"],
  },
];

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
    const why: Record<string, ReactNode> = {
      heaks: (
        <Trans>
          With <span lang="et">-ks</span>, both words take the ending:{" "}
          <span lang="et">heaks arstiks</span>.
        </Trans>
      ),
      arstina: (
        <Trans>
          He works as a doctor, so <span lang="et">-na</span>: <span lang="et">arstina</span>.
        </Trans>
      ),
      nadalaks: (
        <Trans>
          For a week is <span lang="et">-ks</span>: <span lang="et">nädalaks</span>.
        </Trans>
      ),
      reedeks: (
        <Trans>
          By Friday is <span lang="et">-ks</span>: <span lang="et">reedeks</span>.
        </Trans>
      ),
      sunnipaevaks: (
        <Trans>
          For a birthday is <span lang="et">-ks</span>: <span lang="et">sünnipäevaks</span>.
        </Trans>
      ),
    };
    const gaps = MESSAGE_GAPS.map((gap) => ({ ...gap, why: why[gap.id] }));

    const sentences: SentenceItem[] = TRA_TRANSLATE.map(({ id, answers }) => ({
      kind: "translate",
      id,
      prompt: i18n._(TRANSLATE_PROMPTS[id]),
      answers,
      src: src(answers[0]),
    }));

    const fixWhy: Record<(typeof TRA_FIX)[number]["id"], ReactNode> = {
      "fix-arstiks": (
        <Trans>
          Became is <span lang="et">saama</span> with <span lang="et">-ks</span>:{" "}
          <span lang="et">sai arstiks</span>.
        </Trans>
      ),
      "fix-arstina": (
        <Trans>
          Works as is <span lang="et">-na</span>: <span lang="et">töötab arstina</span>.
        </Trans>
      ),
      "fix-haigeks": (
        <Trans>
          Fell ill is <span lang="et">jääma</span> with <span lang="et">-ks</span>:{" "}
          <span lang="et">jäin haigeks</span>.
        </Trans>
      ),
      "fix-heaks": (
        <Trans>
          With <span lang="et">-ks</span>, the adjective takes the ending as well:{" "}
          <span lang="et">heaks arstiks</span>.
        </Trans>
      ),
      "fix-reedeks": (
        <Trans>
          By Friday is <span lang="et">-ks</span>: <span lang="et">reedeks</span>.
        </Trans>
      ),
      "fix-kulmaks": (
        <Trans>
          <span lang="et">-ks</span> goes on the genitive <span lang="et">külma</span>:{" "}
          <span lang="et">külmaks</span>.
        </Trans>
      ),
    };
    const fix: FixItem[] = TRA_FIX.map(({ id, wrong, answers }) => ({
      kind: "fix",
      id,
      wrong,
      answers,
      src: src(answers[0]),
      prompt: i18n._(FIX_PROMPTS[id]),
      explain: fixWhy[id],
    }));

    const pairs: MatchPair[] = [
      { id: "reedeks", left: "reedeks", right: t`by Friday`, src: src("reedeks") },
      { id: "nadalaks", left: "nädalaks", right: t`for a week`, src: src("nädalaks") },
      {
        id: "hommikusoogiks",
        left: "hommikusöögiks",
        right: t`for breakfast`,
        src: src("hommikusöögiks"),
      },
      {
        id: "sunnipaevaks",
        left: "sünnipäevaks",
        right: t`for a birthday`,
        src: src("sünnipäevaks"),
      },
      { id: "ohtuks", left: "õhtuks", right: t`by the evening`, src: src("õhtuks") },
      { id: "homseks", left: "homseks", right: t`by tomorrow`, src: src("homseks") },
    ];

    const talk: PassageQuestion[] = [
      {
        id: "yesterday",
        ask: t`What happened to Liisa yesterday?`,
        options: [
          { id: "job", label: t`She started a new job` },
          { id: "ill", label: t`She fell ill` },
          { id: "tartu", label: t`She went to Tartu` },
        ],
        answer: "ill",
        line: 4,
      },
      {
        id: "home",
        kind: "truefalse",
        ask: t`Liisa has to stay at home for a couple of days.`,
        answer: true,
        line: 9,
      },
      {
        id: "work",
        ask: t`Where does Liisa work now?`,
        options: [
          { id: "hospital", label: t`At a hospital` },
          { id: "market", label: t`At the market` },
          { id: "school", label: t`At a school` },
        ],
        answer: "school",
        line: 13,
      },
      {
        id: "wanted",
        kind: "truefalse",
        ask: t`Liisa wanted to become a teacher.`,
        answer: false,
        line: 15,
      },
      {
        id: "doctor",
        kind: "short",
        ask: t`Who became a doctor a year ago? Write it as Peeter says it.`,
        answers: ["minu õde", "õde", "mu õde"],
        line: 20,
      },
      {
        id: "how-long",
        kind: "short",
        ask: t`How long is Peeter’s sister coming home for? Write it as he says it.`,
        answers: ["nädalaks"],
        line: 26,
      },
      {
        id: "present",
        ask: t`What is Peeter giving his mother?`,
        options: [
          { id: "flowers", label: t`Flowers` },
          { id: "fish", label: t`Fish` },
          { id: "book", label: t`A book` },
        ],
        answer: "book",
        line: 27,
      },
      {
        id: "weather",
        kind: "truefalse",
        ask: t`The weather is getting colder.`,
        answer: false,
        line: 31,
      },
      {
        id: "well",
        ask: t`When does Liisa say she will be well?`,
        options: [
          { id: "friday", label: t`By Friday` },
          { id: "today", label: t`Today` },
          { id: "sunday", label: t`On Sunday` },
        ],
        answer: "friday",
        line: 36,
      },
    ];
    return { gaps, sentences, fix, pairs, talk };
  }, [t, i18n]);
}

export function SaavLesson() {
  const { t, i18n } = useLingui();
  const content = useContent();
  const forms = lessonBySlug("pohivormid")?.n;
  const asLesson = lessonBySlug("sobraga-rahata")?.n;
  const agree = lessonBySlug("omadussonad")?.n;
  const past = lessonBySlug("lihtminevik")?.n;

  const rows = (list: readonly string[]) =>
    list.map((said) => ({
      main: <span lang="et">{said}</span>,
      sub: meaning(said, i18n),
      src: src(said),
    }));

  const chains: MorphChain[] = TRA_CHAINS.map((chain) => ({
    id: chain.id,
    steps: chain.steps.map((word, i) => ({
      word,
      label: [t`dictionary form`, t`genitive`, t`translative`][i] as string,
      src: src(word),
    })),
  }));

  const makeItems = useMemo<MakeItem[]>(
    () =>
      TRA_MAKE.map(({ id, kind, base, gen, cue, said }) => {
        const answer = said.match(/\S+ks\b/u)?.[0] ?? "";
        return {
          base,
          gloss: i18n._(MAKE_GLOSS[id]),
          cue,
          cueLang: "et",
          answers: [answer],
          src: src(said),
          pair: [kind, id] as const,
          explain: (
            <Trans>
              <span lang="et">-ks</span> on the genitive <span lang="et">{gen}</span>:{" "}
              <span lang="et">{answer}</span>.
            </Trans>
          ),
        };
      }),
    [i18n],
  );

  const whichItems = useMemo<WhichItem[]>(
    () =>
      TRA_NA_KS.map(({ id, noun, base, way, cue, answer, said }) => ({
        base,
        gloss: i18n._(NOUN_GLOSS[noun]),
        cue,
        cueLang: "et",
        answers: [answer],
        options: [
          `${answer.slice(0, -2)}s`,
          `${answer.slice(0, -2)}na`,
          `${answer.slice(0, -2)}ks`,
        ],
        src: src(said),
        pair: [way, id] as const,
        explain:
          way === "na" ? (
            <Trans>
              As: <span lang="et">-na</span>, <span lang="et">{answer}</span>.
            </Trans>
          ) : (
            <Trans>
              Becomes: <span lang="et">-ks</span>, <span lang="et">{answer}</span>.
            </Trans>
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
          To become a doctor is <span lang="et">saada arstiks</span>: the ending{" "}
          <span lang="et">-ks</span> on the genitive. It also says by and for:{" "}
          <span lang="et">reedeks</span>, by Friday; <span lang="et">nädalaks</span>, for a week.
        </Trans>
      }
      facts={[
        <Trans key="m">18 minutes</Trans>,
        <Trans key="q">6 exercises, 3 of them typed, and a conversation</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "arstiks",
        "saama",
        "jääma",
        "muutuma",
        "reedeks",
        "nädalaks",
        "heaks arstiks",
        "kingiks",
      ]}
      recap={[
        <Trans key="1">
          The translative is the genitive with <b lang="et">-ks</b>:{" "}
          <b lang="et">arst, arsti, arstiks</b>; <b lang="et">külm, külma, külmaks</b>.
        </Trans>,
        <Trans key="2">
          Become is <b lang="et">saama</b> with <b lang="et">-ks</b>:{" "}
          <b lang="et">Ta sai arstiks</b>. Also <b lang="et">haigeks jääma</b>, to fall ill, and{" "}
          <b lang="et">muutub külmaks</b>, turns cold.
        </Trans>,
        <Trans key="3">
          Works as is <b lang="et">-na</b>, becomes is <b lang="et">-ks</b>:{" "}
          <b lang="et">töötab arstina</b>, <b lang="et">sai arstiks</b>.
        </Trans>,
        <Trans key="4">
          By and for a time: <b lang="et">reedeks</b>, by Friday; <b lang="et">nädalaks</b>, for a
          week. With a meal or an occasion, <b lang="et">-ks</b> says what for:{" "}
          <b lang="et">sünnipäevaks</b>, for a birthday.
        </Trans>,
        <Trans key="5">
          An adjective takes <b lang="et">-ks</b> too: <b lang="et">heaks arstiks</b>. With{" "}
          <b lang="et">-na</b> it stays in the genitive: <b lang="et">uue arstina</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "become",
          title: t`Become: -ks on the genitive`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    To say what someone or something becomes, take the genitive from lesson {forms}{" "}
                    and add <span lang="et">-ks</span>: <span lang="et">arst</span>,{" "}
                    <span lang="et">arsti</span>, <Word w="arstiks" />. This case is the
                    translative. Become is <Word w="saama" /> with it:{" "}
                    <span lang="et">Ta sai arstiks</span>, he or she became a doctor.{" "}
                    <span lang="et">Sai</span> is its past, built like <span lang="et">sõi</span>{" "}
                    from <span lang="et">sööma</span> in lesson {past}:{" "}
                    <span lang="et">ma sain, ta sai</span>.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Other verbs take it too. <Word w="Jääma" /> with <span lang="et">haigeks</span>{" "}
                    is to fall ill, and its past is built the same way:{" "}
                    <span lang="et">ma jäin</span>. <Word w="Muutuma" /> and{" "}
                    <span lang="et">minema</span> with <span lang="et">-ks</span> mean to turn:{" "}
                    <span lang="et">Ilm muutub külmaks</span>,{" "}
                    <span lang="et">Tuba läheb soojaks</span>. Pick a word and tap its forms.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Morph label={t`Words`} chains={chains} />
              </Panel>
              <ListenRows items={rows(TRA_BECOME)} />
              <Prose>
                <p>
                  <Trans>
                    Now type each word with <span lang="et">-ks</span>, as the sentence needs it.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="make-ks"
                title={<Trans>Add -ks</Trans>}
                items={makeItems}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight, each on its genitive.</Trans>
                  ) : share >= 0.6 ? (
                    <Trans>
                      Most of them. Find the genitive first, then add <span lang="et">-ks</span>.
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
          id: "na-or-ks",
          title: t`Works as or becomes`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Lesson {asLesson} gave you <span lang="et">-na</span> for “as”:{" "}
                    <Word w="Ta töötab arstina" />. That says the role someone has.{" "}
                    <span lang="et">-ks</span> says what someone becomes:{" "}
                    <Word w="Ta sai arstiks" />. After <span lang="et">töötab</span> you may also
                    hear <span lang="et">-ks</span>, but <span lang="et">-na</span> is the usual
                    form.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rows(TRA_NA_KS.slice(0, 2).map(({ said }) => said))} />
              <Prose>
                <p>
                  <Trans>Pick the form the sentence needs.</Trans>
                </p>
              </Prose>
              <Quiz
                id="na-or-ks"
                title={<Trans>Works as or becomes?</Trans>}
                items={whichItems}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>
                      All eight: as with <span lang="et">-na</span>, becomes with{" "}
                      <span lang="et">-ks</span>.
                    </Trans>
                  ) : share >= 0.6 ? (
                    <Trans>Most of them. Look at the verb before you pick.</Trans>
                  ) : (
                    <Trans>Listen to the two lines above once more, then try again.</Trans>
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
          id: "by-and-for",
          title: t`By Friday, for a week`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    With a time, <span lang="et">-ks</span> says by when, or how long something is
                    planned for: <Word w="reedeks" />, by Friday; <Word w="nädalaks" />, for a week.
                    With a meal or an occasion, it says what for:{" "}
                    <span lang="et">hommikusöögiks</span>, for breakfast. A day can take either
                    meaning: <span lang="et">reedeks tagasi</span>, back by Friday;{" "}
                    <span lang="et">laupäevaks</span>, for Saturday. Tap a line to hear it.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rows(TRA_FOR)} />
              <Match
                id="by-or-for"
                title={<Trans>What does it mean?</Trans>}
                pairs={content.pairs}
              />
              <Aside>
                <Trans>
                  <span lang="et">Kingiks</span>, as a present, is the same ending:{" "}
                  <span lang="et">Mul on emale kingiks raamat</span>.
                </Trans>
              </Aside>
              <Aside>
                <Trans>
                  <span lang="et">Homseks</span>, by tomorrow, comes from{" "}
                  <span lang="et">homne</span>, tomorrow’s: its genitive is{" "}
                  <span lang="et">homse</span>.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "both-words",
          title: t`A good doctor`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    With <span lang="et">-ks</span>, an adjective takes the ending as well, as with{" "}
                    <span lang="et">-s</span> in lesson {agree}: <Word w="heaks arstiks" />. With{" "}
                    <span lang="et">-na</span>, only the noun takes the ending; the adjective stays
                    in the genitive, as with <span lang="et">-ga</span>:{" "}
                    <span lang="et">uue arstina</span>.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rows(TRA_AGREE)} />
              <Prose>
                <p>
                  <Trans>
                    Kati writes to Mari. Pick the form for each gap: the words around it say which
                    one.
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="katis-message"
                title={<Trans>Fill the gaps</Trans>}
                gaps={content.gaps}
                mode="pick"
                clip="p-message"
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
                id="write-translative"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.sentences}
                rounds={content.sentences.length}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six sentences.</Trans>
                  ) : share >= 0.6 ? (
                    <Trans>
                      Most of them. Check the <span lang="et">-ks</span> word in the ones you
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
                id="fix-translative"
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
          title: t`A new job`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Peeter calls Liisa to ask how she is.</Trans>
                </p>
              </Prose>
              <Listening
                id="peeter-and-liisa"
                title={<Trans>Listen: Peeter and Liisa</Trans>}
                clip="c-talk"
                turns={TRA_TALK.turns}
                names={{ main: t`Peeter`, second: t`Liisa` }}
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
