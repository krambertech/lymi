import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  SUFFIX_AD,
  SUFFIX_ANSWERS,
  SUFFIX_CONVERSATION,
  SUFFIX_FIX_ANSWERS,
  SUFFIX_FIXES,
  SUFFIX_FORMS,
  HOUSE_DIMINUTIVES,
  SUFFIX_HEARD,
  SUFFIX_MODEL,
  SUFFIX_TABLE,
  SUFFIX_TRANSLATE,
} from "../../../lib/learn/clips";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Chips, Panel } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Match, type MatchPair } from "../Match";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { Listening, type PassageQuestion, Reading } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Word } from "../Word";
import { Writing } from "../Writing";

const SLUG = "sobralik-kodutu";
const src = (text: string) => clipUrl(SLUG, clipId(text));
const plain = (form: string) => form.replace("|", "");

type Kind = keyof typeof SUFFIX_TABLE;
const KINDS: readonly Kind[] = ["lik", "tu", "ke"];

const MEANS: Record<string, MessageDescriptor> = {
  sõbralik: msg`friendly`,
  lapselik: msg`childish`,
  kohalik: msg`local`,
  ohtlik: msg`dangerous`,
  tervislik: msg`healthy`,
  kodutu: msg`homeless`,
  töötu: msg`unemployed`,
  maitsetu: msg`tasteless`,
  lõputu: msg`endless`,
  abitu: msg`helpless`,
  majake: msg`a little house`,
  tükike: msg`a little piece`,
  kassike: msg`a little cat`,
  poisike: msg`a little boy`,
  linnake: msg`a small town`,
};

const NOUNS: Record<string, MessageDescriptor> = {
  kodu: msg`home`,
  maja: msg`house`,
  sõber: msg`friend`,
  töö: msg`work, job`,
  tükk: msg`piece`,
  koht: msg`place`,
  viga: msg`mistake`,
  laps: msg`child`,
};

const GLOSSARY: Glossary = {
  sõbralik: { en: msg`friendly`, note: msg`From sõber, friend.` },
  kohalik: { en: msg`local`, note: msg`From koht, place.` },
  kodutu: { en: msg`homeless`, note: msg`From kodu, home.` },
  töötu: { en: msg`unemployed`, note: msg`From töö, work.` },
  majake: { en: msg`a little house`, note: msg`From maja. Majakeses, in the little house.` },
  tükike: { en: msg`a little piece`, note: msg`From tükk, genitive tüki.` },
};

function SuffixTable() {
  const { t, i18n } = useLingui();
  const [kind, setKind] = useState<Kind>("lik");
  const labels: Record<Kind, string> = {
    lik: t`Adjective with -lik`,
    tu: t`Without it`,
    ke: t`A small one`,
  };
  const tips: Record<Kind, ReactNode> = {
    lik: (
      <Trans>
        <b lang="et">-lik</b> usually makes an adjective meaning like it, having it or to do with
        it.
      </Trans>
    ),
    tu: (
      <Trans>
        <b lang="et">-tu</b> means without, like English -less. It usually joins the genitive.
      </Trans>
    ),
    ke: (
      <Trans>
        <b lang="et">-ke</b> makes a thing small or dear. It usually joins the genitive.
      </Trans>
    ),
  };
  const rows: ParadigmRow[] = SUFFIX_TABLE[kind].map((each) => ({
    id: plain(each.word),
    label: i18n._(MEANS[plain(each.word)] as MessageDescriptor),
    cells: [
      { form: each.from, src: src(each.from) },
      { form: each.word, src: src(plain(each.word)) },
      { form: each.said.replace(/[.!]$/, ""), src: src(each.said) },
    ],
  }));
  return (
    <Panel className="gap-5">
      <Chips
        label={t`Endings`}
        items={KINDS.map((each) => ({ label: labels[each], value: each }))}
        value={kind}
        onPick={setKind}
      />
      <Paradigm
        key={kind}
        label={t`New words from nouns`}
        columns={[t`The noun`, t`The new word`, t`In a sentence`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{ title: t`Tap a form`, tip: tips[kind] }}
      />
    </Panel>
  );
}

const KIND_LABELS: Record<Kind, MessageDescriptor> = {
  lik: msg`like it, having it or to do with it`,
  tu: msg`without it`,
  ke: msg`a small one`,
};

const pairRun = <T extends { pair: readonly [string, string] }>(items: readonly T[], pinned?: T) =>
  eachPairFirst(items, pinned);

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const options = KINDS.map((kind) => ({
      id: kind,
      label: (
        <span lang={i18n.locale} className="text-lg font-medium tracking-normal">
          {i18n._(KIND_LABELS[kind])}
        </span>
      ),
    }));
    const heardWhy: Record<Kind, ReactNode> = {
      lik: (
        <Trans>
          <b lang="et">-lik</b> usually makes an adjective meaning like it, having it or to do with
          it.
        </Trans>
      ),
      tu: (
        <Trans>
          <b lang="et">-tu</b>: without it.
        </Trans>
      ),
      ke: (
        <Trans>
          <b lang="et">-ke</b>: a small one.
        </Trans>
      ),
    };
    const heard: (ChoiceItem & { said: string; pair: readonly [string, string] })[] =
      SUFFIX_HEARD.map((each) => ({
        said: each.said,
        src: src(each.said),
        answer: each.kind,
        options,
        pair: [each.kind, each.said] as const,
        explain: heardWhy[each.kind],
      }));

    const pairs: MatchPair[] = (
      ["sõbralik", "kodutu", "töötu", "kohalik", "majake", "ohtlik"] as const
    ).map((word) => ({
      id: word,
      left: word,
      right: i18n._(MEANS[word] as MessageDescriptor),
      src: src(word),
    }));

    const cues: Record<Kind, string> = {
      lik: t`like it, having it or to do with it`,
      tu: t`without it`,
      ke: t`a small one`,
    };
    const forms: FormItem[] = SUFFIX_FORMS.map((item) => ({
      base: item.from,
      gloss: i18n._(NOUNS[item.from] as MessageDescriptor),
      cue: cues[item.kind],
      answers: item.answer === HOUSE_DIMINUTIVES[0] ? HOUSE_DIMINUTIVES : [item.answer],
      src: src(item.answer),
      explain:
        item.answer === "veatu" ? (
          <Trans>
            The genitive of <b lang="et">viga</b> is <b lang="et">vea</b>, so <b lang="et">veatu</b>
            , without mistakes.
          </Trans>
        ) : item.answer === "tükike" ? (
          <Trans>
            The genitive of <b lang="et">tükk</b> is <b lang="et">tüki</b>, so{" "}
            <b lang="et">tükike</b>.
          </Trans>
        ) : (
          <Trans>
            <b lang="et">{item.answer}</b>: {i18n._(KIND_LABELS[item.kind])}.
          </Trans>
        ),
    }));

    const prompts: Record<(typeof SUFFIX_TRANSLATE)[number], MessageDescriptor> = {
      "Uus naaber on väga sõbralik.": msg`The new neighbour is very friendly.`,
      "See supp on maitsetu.": msg`This soup is tasteless.`,
      "Me elame väikeses linnakeses.": msg`We live in a small town.`,
      "Kohalik pood on kinni.": msg`The local shop is closed.`,
      "Talvel on tee ohtlik.": msg`The road is dangerous in winter.`,
      "Me leidsime kodutu kassi.": msg`We found a homeless cat.`,
      "Anna mulle tükike kooki.": msg`Give me a little piece of cake.`,
    };
    const translateWhy: Partial<Record<(typeof SUFFIX_TRANSLATE)[number], ReactNode>> = {
      "Me leidsime kodutu kassi.": (
        <Trans>
          The adjective and noun are both genitive here: <b lang="et">kodutu kassi</b>.
        </Trans>
      ),
      "Anna mulle tükike kooki.": (
        <Trans>
          After <b lang="et">tükike</b>, use the partitive: <b lang="et">kooki</b>.
        </Trans>
      ),
    };
    const translations: (SentenceItem & { pair: readonly [string, string] })[] =
      SUFFIX_TRANSLATE.map((said) => ({
        kind: "translate",
        id: clipId(said),
        prompt: i18n._(prompts[said]),
        src: src(said),
        answers: SUFFIX_ANSWERS[said] as readonly [string, ...string[]],
        pair: [clipId(said), clipId(said)] as const,
        explain: translateWhy[said],
      }));

    const fixWhy: Record<(typeof SUFFIX_FIXES)[number]["right"], ReactNode> = {
      "Nad elavad väikeses majakeses.": (
        <Trans>
          A <b lang="et">-ke</b> word changes like <b lang="et">-ne</b>: <b lang="et">majakese</b>,
          so <b lang="et">majakeses</b>.
        </Trans>
      ),
      "Ta rääkis sõbraliku naisega.": (
        <Trans>
          The adjective takes the genitive before <b lang="et">-ga</b>:{" "}
          <b lang="et">sõbraliku naisega</b>.
        </Trans>
      ),
      "Supp oli maitsetu.": (
        <Trans>
          Without taste is <b lang="et">-tu</b>: <b lang="et">maitsetu</b>.
        </Trans>
      ),
      "Lapsed ehitasid liivast kaks majakest.": (
        <Trans>
          The partitive of <b lang="et">majake</b> is <b lang="et">majakest</b>.
        </Trans>
      ),
      "Ta on kolmkümmend, aga väga lapselik.": (
        <Trans>
          Like a child is <b lang="et">lapselik</b>. With <b lang="et">-tu</b>, the word would mean
          without children.
        </Trans>
      ),
      "Kodutud koerad otsivad toitu.": (
        <Trans>
          The adjective is plural like its noun: <b lang="et">kodutud koerad</b>.
        </Trans>
      ),
    };
    const fixPrompts: Partial<Record<(typeof SUFFIX_FIXES)[number]["right"], MessageDescriptor>> = {
      "Supp oli maitsetu.": msg`The soup had no taste.`,
      "Ta on kolmkümmend, aga väga lapselik.": msg`He’s thirty, but very childish.`,
    };
    const fixes: FixItem[] = SUFFIX_FIXES.map((item) => {
      const prompt = fixPrompts[item.right];
      return {
        kind: "fix",
        id: `fix-${clipId(item.right)}`,
        wrong: item.wrong,
        answers: SUFFIX_FIX_ANSWERS[item.right] ?? [item.right],
        src: src(item.right),
        explain: fixWhy[item.right],
        ...(prompt ? { prompt: i18n._(prompt) } : {}),
      };
    });

    const ad: PassageQuestion[] = [
      {
        id: "rooms",
        kind: "truefalse",
        ask: t`The cottage has two rooms.`,
        answer: false,
        line: 1,
      },
      {
        id: "quiet",
        ask: t`Why is it quiet there?`,
        options: [
          { id: "far", label: t`The nearest neighbour lives a kilometre away` },
          { id: "no-tv", label: t`There’s no television` },
          { id: "winter", label: t`There’s no shop nearby` },
        ],
        answer: "far",
        line: 4,
      },
      {
        id: "beach",
        kind: "truefalse",
        ask: t`The beach is safe for children.`,
        answer: true,
        line: 5,
      },
      {
        id: "fish",
        kind: "short",
        ask: t`What else local does the shop sell besides bread? Write it as the advert does.`,
        answers: ["suitsukala"],
        line: 7,
      },
      {
        id: "cats",
        ask: t`Why is the garden dangerous for cats?`,
        options: [
          { id: "road", label: t`A busy road` },
          { id: "foxes", label: t`Foxes live in the forest` },
          { id: "sea", label: t`The sea is only two hundred metres away and cats can’t swim` },
        ],
        answer: "foxes",
        line: 10,
      },
      {
        id: "week",
        ask: t`What does the advert say about a week?`,
        options: [
          { id: "cheaper", label: t`Cheaper per night` },
          { id: "more", label: t`It costs the same as seven nights` },
          { id: "same", label: t`It can only be rented by the week in summer` },
        ],
        answer: "cheaper",
        line: 13,
      },
    ];

    const checks = [
      { id: "interest", label: <Trans>Say what you’re writing about.</Trans> },
      { id: "dates", label: <Trans>Ask if the cottage is free when you want it.</Trans> },
      { id: "questions", label: <Trans>Ask two more questions.</Trans> },
      { id: "suffix", label: <Trans>Use one word with -lik, -tu or -ke.</Trans> },
      { id: "sign", label: <Trans>Sign off politely.</Trans> },
    ];

    const exam: PassageQuestion[] = [
      {
        id: "dogs",
        ask: t`How many dogs does the shelter have now?`,
        options: [
          { id: "12", label: "12" },
          { id: "22", label: "22" },
          { id: "40", label: "40" },
        ],
        answer: "22",
        line: 4,
      },
      {
        id: "summer",
        kind: "truefalse",
        ask: t`There are more homeless animals in summer.`,
        answer: true,
        line: 5,
      },
      {
        id: "calls",
        ask: t`Who usually calls the shelter?`,
        options: [
          { id: "police", label: t`The police` },
          { id: "local", label: t`Someone local who has seen a dog in the street` },
          { id: "owner", label: t`The owners of the animals` },
        ],
        answer: "local",
        line: 8,
      },
      {
        id: "muki",
        kind: "truefalse",
        ask: t`Muki was friendly from the first day.`,
        answer: false,
        line: 14,
      },
      {
        id: "kittens",
        kind: "short",
        ask: t`Where were the five kittens found? Write it as Kati says it.`,
        answers: ["ühest kastist", "kastist"],
        line: 17,
      },
      {
        id: "kati",
        kind: "truefalse",
        ask: t`Kati first came to the shelter when she had no job.`,
        answer: true,
        line: 25,
      },
      {
        id: "task",
        ask: t`What is the most important job for volunteers?`,
        options: [
          { id: "clean", label: t`Cleaning` },
          { id: "photos", label: t`Taking photos of the animals for the website` },
          { id: "walk", label: t`Walking the dogs` },
        ],
        answer: "walk",
        line: 27,
      },
      {
        id: "first-visit",
        kind: "truefalse",
        ask: t`You can take an animal home on your first visit.`,
        answer: false,
        line: 33,
      },
      {
        id: "cat-price",
        kind: "short",
        ask: t`How much does it cost to take a cat home? Write the number as Kati says it.`,
        answers: ["kolmkümmend", "30"],
        line: 36,
      },
      {
        id: "who",
        kind: "match",
        ask: t`Who says it?`,
        options: [
          { id: "kalev", label: t`Kalev` },
          { id: "kati", label: t`Kati` },
        ],
        statements: [
          { id: "sad", label: t`That’s sad.`, answer: "kalev", line: 6 },
          {
            id: "grateful",
            label: t`A dog is grateful even for a short walk.`,
            answer: "kati",
            line: 40,
          },
          { id: "blankets", label: t`Bring old blankets and towels.`, answer: "kati", line: 41 },
          { id: "open", label: t`The shelter is open every day.`, answer: "kalev", line: 43 },
        ],
      },
    ];

    return { heard, pairs, forms, translations, fixes, ad, checks, exam };
  }, [t, i18n]);
}

export function SobralikKodutuLesson() {
  const { t } = useLingui();
  const content = useContent();
  const without = lessonBySlug("sobraga-rahata")?.n;
  const adjectives = lessonBySlug("omadussonad")?.n;
  const names = { fourth: t`Kalev`, third: t`Kati` };

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          <b lang="et">Sõber</b> gives <b lang="et">sõbralik</b>, friendly; <b lang="et">kodu</b>{" "}
          gives <b lang="et">kodutu</b>, homeless; <b lang="et">maja</b> gives{" "}
          <b lang="et">majake</b>, a little house. Three endings make new words from nouns you know.
        </Trans>
      }
      facts={[
        <Trans key="m">24 minutes</Trans>,
        <Trans key="q">7 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["sõbralik", "kohalik", "kodutu", "töötu", "majake", "tükike"]}
      recap={[
        <Trans key="1">
          <b lang="et">-lik</b> usually makes an adjective meaning like it, having it or to do with
          it. <b lang="et">Kohalik</b> means local, of the place. <b lang="et">Tervislik</b> means
          healthy, good for your health.
        </Trans>,
        <Trans key="2">
          <b lang="et">-tu</b> means without, and usually joins the genitive:{" "}
          <b lang="et">kodutu, töötu, veatu</b>.
        </Trans>,
        <Trans key="3">
          <b lang="et">-ke</b> makes something small or dear, and usually joins the genitive:{" "}
          <b lang="et">majake, tükike, linnake</b>. It changes like <b lang="et">-ne</b>:{" "}
          <b lang="et">majakese, majakest</b>.
        </Trans>,
        <Trans key="4">
          The new words change like any adjective or noun:{" "}
          <b lang="et">sõbraliku naisega, kodutud koerad</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "endings",
          title: t`Three endings`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Add an ending to a noun and you get a new word. <Word w="sõbralik" /> is like a
                    friend, so friendly. <Word w="kodutu" /> is without a home. <Word w="majake" />{" "}
                    is a little house.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    <b lang="et">-tu</b> and <b lang="et">-ke</b> usually join the genitive:{" "}
                    <b lang="et">viga, vea, veatu</b>. Before <b lang="et">-lik</b> the stem varies:{" "}
                    <b lang="et">sõbra-lik</b> but <b lang="et">oht-lik</b>. Pick an ending and tap
                    the words.
                  </Trans>
                </p>
              </Prose>
              <SuffixTable />
              <Prose>
                <p>
                  <Trans>Match each word with its meaning.</Trans>
                </p>
              </Prose>
              <Match
                id="word-meaning"
                title={<Trans>What does it mean?</Trans>}
                pairs={content.pairs}
                columns={[<Trans key="w">Word</Trans>, <Trans key="m">Meaning</Trans>]}
              />
            </>
          ),
        },
        {
          id: "hear",
          title: t`What the ending adds`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Hear a word, then pick what its ending usually adds.</Trans>
                </p>
              </Prose>
              <Quiz
                id="hear-ending"
                title={<Trans>What does the ending add?</Trans>}
                items={content.heard}
                rounds={9}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All nine: you heard the ending every time.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you got wrong once more.</Trans>
                  ) : (
                    <Trans>Tap the words for each ending once more, then try again.</Trans>
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
          id: "make",
          title: t`Make the word`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each round gives a noun and what to add. Type the new word. In these examples
                    with <b lang="et">-tu</b> and <b lang="et">-ke</b>, start from the genitive.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="make-word"
                title={<Trans>Type the new word</Trans>}
                items={content.forms}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight, typed in full.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the stem in the ones you got wrong.</Trans>
                  ) : (
                    <Trans>Tap the words in the table once more, then try again.</Trans>
                  )
                }
                recall={formRecall}
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
                  <Trans>
                    The new words are ordinary adjectives and nouns, so they agree as lesson{" "}
                    {adjectives} showed: <b lang="et">kodutu kass</b>, <b lang="et">kodutu kassi</b>
                    , <b lang="et">kodutud kassid</b>. Write each sentence in Estonian.
                  </Trans>
                </p>
              </Prose>
              <Aside>
                <Trans>
                  <b lang="et">-tu</b> gives an adjective the same meaning as the case ending{" "}
                  <b lang="et">-ta</b> from lesson {without}: <b lang="et">koer on koduta</b> and{" "}
                  <b lang="et">kodutu koer</b> both describe a dog without a home.
                </Trans>
              </Aside>
              <Quiz
                id="write-words"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.translations}
                rounds={7}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All seven, each word with its ending.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the ending in the ones you missed.</Trans>
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
                    Each sentence has one wrong word: the wrong ending, or a form that doesn’t
                    agree. Tap it, then type it right.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-words"
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
          id: "advert",
          title: t`A cottage by the sea`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Read an advert for a summer cottage and answer the questions, as in the reading
                    part of the B1 exam.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="cottage-advert"
                title={<Trans>A little house on Saaremaa</Trans>}
                sentences={SUFFIX_AD}
                questions={content.ad}
              />
              <Prose>
                <p>
                  <Trans>
                    Now write to the owner in about 80 words, then compare your letter with a model.
                  </Trans>
                </p>
              </Prose>
              <Writing
                id="ask-owner"
                title={<Trans>Write to the owner</Trans>}
                prompt={
                  <p>
                    <Trans>
                      You want to rent the cottage for a week in July. Ask if it’s free and ask two
                      more questions.
                    </Trans>
                  </p>
                }
                model={SUFFIX_MODEL}
                checks={content.checks}
              />
            </>
          ),
        },
        {
          id: "radio",
          title: t`An animal shelter`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kalev visits an animal shelter in Viljandi and talks to Kati, a volunteer.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="shelter-interview"
                title={<Trans>Listen: Kalev and Kati</Trans>}
                clip="c-varjupaik"
                turns={SUFFIX_CONVERSATION.turns}
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
