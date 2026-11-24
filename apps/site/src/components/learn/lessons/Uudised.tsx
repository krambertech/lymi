import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo } from "react";
import {
  clipId,
  clipUrl,
  NEWS_ANSWERS,
  NEWS_ARTICLE,
  NEWS_CONVERSATION,
  NEWS_FIX_ANSWERS,
  NEWS_FIXES,
  NEWS_FORMS,
  NEWS_GAPS,
  NEWS_LETTER_BODY,
  NEWS_LETTER_SIGN,
  NEWS_PHRASES,
  NEWS_SPARE,
  NEWS_TERMS,
  NEWS_TRANSLATE,
} from "../../../lib/learn/clips";
import { eachPairFirst } from "../../../lib/learn/quiz";
import { ListenRows, type RowItem } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import { type GapItem, GapPassage } from "../GapPassage";
import type { Glossary } from "../lesson-context";
import { LessonView, Prose } from "../LessonView";
import { Match, type MatchPair } from "../Match";
import { Listening, type PassageQuestion, Reading } from "../Passage";
import { Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Writing } from "../Writing";

const SLUG = "uudised";
const src = (text: string) => clipUrl(SLUG, clipId(text));

const PHRASE_MEANS: Record<(typeof NEWS_PHRASES)[number], MessageDescriptor> = {
  "Uus raamatukogu avatakse reedel.": msg`The new library opens on Friday.`,
  "Tee on remondi tõttu suletud.": msg`The road is closed for repairs.`,
  "Ilmateade lubab nädalavahetusel vihma.": msg`The weather forecast promises rain at the weekend.`,
  "Kohalikud elanikud ootavad uut bussi.": msg`Local residents are waiting for a new bus.`,
  "Üritus jääb tugeva tuule tõttu ära.": msg`The event is cancelled due to strong wind.`,
  "Hinnad on sel aastal tõusnud.": msg`Prices have risen this year.`,
};

const TERM_MEANS: Record<(typeof NEWS_TERMS)[number], MessageDescriptor> = {
  uudised: msg`news`,
  ilmateade: msg`weather forecast`,
  elanik: msg`resident`,
  üritus: msg`event`,
  "remondi tõttu": msg`due to repairs`,
  "jääb ära": msg`is cancelled`,
};

const GLOSSARY: Glossary = {
  uudised: { en: msg`news` },
  ilmateade: { en: msg`weather forecast` },
  elanik: { en: msg`resident` },
  üritus: { en: msg`event` },
  linnavalitsus: { en: msg`town government, city council` },
  jalgrattatee: { en: msg`cycle path` },
  jalakäijad: { en: msg`pedestrians` },
  ratturid: { en: msg`cyclists` },
  aednikud: { en: msg`gardeners` },
  linnapea: { en: msg`mayor` },
  varjualune: { en: msg`shelter` },
  korraldaja: { en: msg`organiser` },
  liiklusmuudatused: { en: msg`traffic changes` },
  vabatahtlikke: { en: msg`volunteers (partitive plural)` },
};

const FORM_GLOSS: Record<(typeof NEWS_FORMS)[number]["id"], MessageDescriptor> = {
  closed: msg`closed`,
  fallen: msg`fallen`,
  coming: msg`coming`,
  walking: msg`while walking`,
  paying: msg`without paying`,
  reading: msg`reading (noun)`,
  rider: msg`passenger, rider`,
  friendly: msg`friendly`,
  opened: msg`open, opened`,
  waiting: msg`while waiting`,
};

const FORM_WHY: Record<(typeof NEWS_FORMS)[number]["id"], ReactNode> = {
  closed: (
    <Trans>
      Someone closed the street, so the -tud form usually fits: <b lang="et">suletud</b>.
    </Trans>
  ),
  fallen: (
    <Trans>
      The tree fell itself, so the -nud form usually fits: <b lang="et">kukkunud</b>.
    </Trans>
  ),
  coming: (
    <Trans>
      The -v form changes with its noun <b lang="et">nädalat</b>: <b lang="et">tulevat</b>.
    </Trans>
  ),
  walking: (
    <Trans>
      Doing something at the same time usually takes -des: <b lang="et">jalutades</b>.
    </Trans>
  ),
  paying: (
    <Trans>
      Without doing something usually takes -mata: <b lang="et">maksmata</b>.
    </Trans>
  ),
  reading: (
    <Trans>
      The <b lang="et">-mine</b> ending turns a verb into the doing: <b lang="et">lugemine</b>.
    </Trans>
  ),
  rider: (
    <Trans>
      The <b lang="et">-ja</b> ending names the person who does the verb: <b lang="et">sõitja</b>.
    </Trans>
  ),
  friendly: (
    <Trans>
      The -lik ending makes an adjective from a noun: <b lang="et">sõbralik</b>.
    </Trans>
  ),
  opened: (
    <Trans>
      Someone opened the exhibition, so the -tud form usually fits: <b lang="et">avatud</b>.
    </Trans>
  ),
  waiting: (
    <Trans>
      Doing something at the same time usually takes -des: <b lang="et">oodates</b>.
    </Trans>
  ),
};

const TRANSLATE_PROMPTS: Record<(typeof NEWS_TRANSLATE)[number], MessageDescriptor> = {
  "Uus raamatukogu avatakse reedel.": msg`The new library opens on Friday.`,
  "Tee on remondi tõttu suletud.": msg`The road is closed for repairs.`,
  "Ma kuulsin, et üritus jääb ära.": msg`I heard that the event is cancelled.`,
  "Me jäime koju, sest sadas.": msg`We stayed home because it was raining.`,
  "Ma loen uudiseid kohvi juues.": msg`I read the news while drinking coffee.`,
  "Kohalikud elanikud ootavad uut bussi.": msg`Local residents are waiting for a new bus.`,
  "Tee läheb läbi pargi.": msg`The path goes through the park.`,
  "Sadas, nii et üritus jäi ära.": msg`It rained, so the event was cancelled.`,
};

const TRANSLATE_WHY: Partial<Record<(typeof NEWS_TRANSLATE)[number], ReactNode>> = {
  "Uus raamatukogu avatakse reedel.": (
    <Trans>
      News often uses the impersonal when no person is named: <b lang="et">avatakse</b>.
    </Trans>
  ),
  "Ma kuulsin, et üritus jääb ära.": (
    <Trans>
      <b lang="et">Et</b> introduces what you heard, and <b lang="et">ära jääma</b> means to be
      cancelled.
    </Trans>
  ),
  "Ma loen uudiseid kohvi juues.": (
    <Trans>
      Doing two things at once usually uses -des: <b lang="et">kohvi juues</b>.
    </Trans>
  ),
  "Tee läheb läbi pargi.": (
    <Trans>
      <b lang="et">Läbi</b> takes the genitive: <b lang="et">läbi pargi</b>.
    </Trans>
  ),
};

const FIX_PROMPTS: Partial<Record<(typeof NEWS_FIXES)[number]["id"], MessageDescriptor>> = {
  coffee: msg`I read the news while drinking coffee.`,
  library: msg`The new library is opened on Friday.`,
  party: msg`We didn’t go to the party because it rained.`,
};

const FIX_WHY: Record<(typeof NEWS_FIXES)[number]["id"], ReactNode> = {
  closed: (
    <Trans>
      Someone closed the road, so the -tud form usually fits: <b lang="et">suletud</b>.
    </Trans>
  ),
  forest: (
    <Trans>
      <b lang="et">Läbi</b> takes the genitive: <b lang="et">läbi metsa</b>.
    </Trans>
  ),
  coffee: (
    <Trans>
      While drinking takes -des (<b lang="et">juues</b>), not -mata (<b lang="et">joomata</b>,
      without drinking).
    </Trans>
  ),
  library: (
    <Trans>
      With no person named, Estonian uses the impersonal: <b lang="et">avatakse</b>.
    </Trans>
  ),
  party: (
    <Trans>
      A reason needs <b lang="et">sest</b> or <b lang="et">kuna</b>, not <b lang="et">et</b>.
    </Trans>
  ),
  water: (
    <Trans>
      The -v form changes with its noun: <b lang="et">jooksvat vett</b>.
    </Trans>
  ),
};

const pairRun = <T extends { pair: readonly [string, string] }>(items: readonly T[], pinned?: T) =>
  eachPairFirst(items, pinned);

const phraseRows = (i18n: I18n): RowItem[] =>
  NEWS_PHRASES.map((said) => ({
    main: said,
    sub: i18n._(PHRASE_MEANS[said]),
    src: src(said),
  }));

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const rows = phraseRows(i18n);
    const pairs: MatchPair[] = NEWS_TERMS.map((term) => ({
      id: clipId(term),
      left: term,
      right: i18n._(TERM_MEANS[term]),
      src: src(term),
    }));

    const article: PassageQuestion[] = [
      {
        id: "route",
        ask: t`Where does the new cycle path run?`,
        options: [
          { id: "river", label: t`Along the river` },
          { id: "harbour", label: t`Around the old harbour` },
          { id: "station", label: t`Behind the train station` },
        ],
        answer: "river",
        line: 0,
      },
      {
        id: "started",
        kind: "short",
        ask: t`When did building work start? Write two words as the text says.`,
        answers: ["eelmisel sügisel", "sügisel"],
        line: 1,
      },
      {
        id: "lights",
        kind: "truefalse",
        ask: t`The path is lit on dark autumn evenings.`,
        answer: true,
        line: 4,
      },
      {
        id: "rain",
        kind: "truefalse",
        ask: t`Nobody came to the opening because of the rain.`,
        answer: false,
        line: 6,
      },
      {
        id: "parents",
        ask: t`Why are many parents pleased?`,
        options: [
          { id: "houses", label: t`The path goes right past their houses.` },
          {
            id: "school",
            label: t`Children can cycle to school without crossing the busy main road.`,
          },
          { id: "bikes", label: t`The town bought bicycles for local schools.` },
        ],
        answer: "school",
        line: 8,
      },
      {
        id: "missing",
        ask: t`What do some local residents say is still missing?`,
        options: [
          { id: "benches", label: t`Benches by the river` },
          { id: "bins", label: t`Enough rubbish bins at the north end` },
          { id: "lamps", label: t`Street lamps along the southern side of the park` },
        ],
        answer: "bins",
        line: 9,
      },
      {
        id: "shelter",
        kind: "truefalse",
        ask: t`The small shelter for rain is already built.`,
        answer: false,
        line: 11,
      },
      {
        id: "club",
        kind: "short",
        ask: t`What is the sports club holding on Saturday? Write the word from the text.`,
        answers: ["perepäeva", "tasuta perepäeva"],
        line: 13,
      },
    ];

    const forms: (FormItem & { pair: readonly [string, string] })[] = NEWS_FORMS.map((item) => {
      const said = `${item.before} ${item.answers[0]} ${item.after}`;
      return {
        base: item.base,
        gloss: i18n._(FORM_GLOSS[item.id]),
        cue: `${item.before} … ${item.after}`,
        cueLang: "et",
        answers: item.answers,
        src: src(said),
        said,
        explain: FORM_WHY[item.id],
        pair: [item.id, item.id] as const,
      };
    });

    const gaps: GapItem[] = NEWS_GAPS.map((gap) => ({ ...gap }));

    const translations: (SentenceItem & { pair: readonly [string, string] })[] = NEWS_TRANSLATE.map(
      (said) => ({
        kind: "translate",
        id: clipId(said),
        prompt: i18n._(TRANSLATE_PROMPTS[said]),
        src: src(said),
        answers: NEWS_ANSWERS[said],
        pair: [clipId(said), clipId(said)] as const,
        explain: TRANSLATE_WHY[said],
      }),
    );

    const fixes: FixItem[] = NEWS_FIXES.map((item) => ({
      kind: "fix",
      id: `fix-${item.id}`,
      wrong: item.wrong,
      prompt: FIX_PROMPTS[item.id] ? i18n._(FIX_PROMPTS[item.id] as MessageDescriptor) : undefined,
      answers: NEWS_FIX_ANSWERS[item.right] ?? [item.right],
      src: src(item.right),
      explain: FIX_WHY[item.id],
    }));

    const radio: PassageQuestion[] = [
      {
        id: "hours",
        ask: t`When does the autumn day take place?`,
        options: [
          { id: "ten", label: t`Ten in the morning until six in the evening` },
          { id: "noon", label: t`Between noon and eight` },
          { id: "sunday", label: t`On Sunday morning` },
        ],
        answer: "ten",
        line: 7,
      },
      {
        id: "free",
        kind: "truefalse",
        ask: t`Visitors have to buy a ticket for the concerts.`,
        answer: false,
        line: 8,
      },
      {
        id: "street",
        ask: t`Why is Ülikooli Street closed to cars?`,
        options: [
          { id: "pipes", label: t`Workers are repairing water pipes under the road.` },
          { id: "stage", label: t`Market stalls and a stage are being set up.` },
          { id: "race", label: t`A cycling race runs through the town centre.` },
        ],
        answer: "stage",
        line: 12,
      },
      {
        id: "buses",
        kind: "truefalse",
        ask: t`City centre buses run more often on Saturday.`,
        answer: true,
        line: 13,
      },
      {
        id: "gardener",
        ask: t`What will the town gardener talk about?`,
        options: [
          { id: "trees", label: t`Fruit trees and autumn leaves` },
          { id: "flowers", label: t`Planting spring flowers in pots on balconies` },
          { id: "bees", label: t`Keeping bees in city parks` },
        ],
        answer: "trees",
        line: 17,
      },
      {
        id: "rain-plan",
        kind: "truefalse",
        ask: t`If it rains, the autumn day will be cancelled.`,
        answer: false,
        line: 21,
      },
      {
        id: "deadline",
        kind: "short",
        ask: t`Until when can new volunteers sign up? Write two words as Liisa says them.`,
        answers: ["reede lõunani", "lõunani"],
        line: 26,
      },
      {
        id: "who",
        kind: "match",
        ask: t`Who mentions each fact?`,
        options: [
          { id: "host", label: t`Kalev` },
          { id: "liisa", label: t`Liisa` },
        ],
        statements: [
          {
            id: "last-year",
            label: t`About three thousand people came last year.`,
            answer: "host",
            line: 28,
          },
          {
            id: "choir",
            label: t`A local choir closes the day at five.`,
            answer: "liisa",
            line: 31,
          },
          {
            id: "sunday",
            label: t`Sunday stays dry, up to eleven degrees.`,
            answer: "host",
            line: 35,
          },
        ],
      },
    ];

    const checks = [
      { id: "greet", label: <Trans>Greet the editorial office.</Trans> },
      {
        id: "topic",
        label: <Trans>Name the news item or local place you are writing about.</Trans>,
      },
      {
        id: "reason",
        label: (
          <Trans>
            Give a reason with <b lang="et">sest</b> or <b lang="et">kuna</b>.
          </Trans>
        ),
      },
      {
        id: "suggest",
        label: (
          <Trans>
            Suggest one improvement with <b lang="et">kui</b> or the would form.
          </Trans>
        ),
      },
      { id: "sign", label: <Trans>Close politely and sign your name.</Trans> },
    ];

    return { rows, pairs, article, forms, gaps, translations, fixes, radio, checks };
  }, [t, i18n]);
}

export function UudisedLesson() {
  const { t } = useLingui();
  const content = useContent();
  const names = { fourth: t`Kalev`, third: t`Liisa` };

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Read a local news article, fill a weather and traffic report, follow a radio interview and
          write a short letter to the paper using everything from stage 6.
        </Trans>
      }
      facts={[
        <Trans key="m">25 minutes</Trans>,
        <Trans key="q">7 exercises and a letter</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "uudised",
        "ilmateade",
        "elanik",
        "üritus",
        "linnavalitsus",
        "jalgrattatee",
        "jalakäijad",
        "linnapea",
        "varjualune",
        "korraldaja",
      ]}
      recap={[
        <Trans key="1">
          Estonian news often uses the impersonal when no person is named:{" "}
          <b lang="et">Uus tee avatakse reedel.</b>
        </Trans>,
        <Trans key="2">
          Participles and -des/-mata pack extra facts into one sentence:{" "}
          <b lang="et">remondi tõttu suletud</b>, <b lang="et">suurt teed ületamata</b>.
        </Trans>,
        <Trans key="3">
          Linking words connect facts with reasons and results: <b lang="et">et</b>,{" "}
          <b lang="et">sest</b>, <b lang="et">kuna</b>, <b lang="et">kui</b> and{" "}
          <b lang="et">nii et</b>.
        </Trans>,
        <Trans key="4">
          A polite letter to a newspaper opens with <b lang="et">Lugupeetud toimetus!</b> and
          usually closes with <b lang="et">Lugupidamisega</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "phrases",
          title: t`In the news`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Local news uses the same grammar from stage 6: the impersonal, participles,
                    particle verbs and linking words. Tap each sentence to hear it.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={content.rows} />
              <Prose>
                <p>
                  <Trans>Match each news word or phrase with what it means.</Trans>
                </p>
              </Prose>
              <Match
                id="news-phrases"
                title={<Trans>Match the news words</Trans>}
                pairs={content.pairs}
                columns={[<Trans key="a">Estonian</Trans>, <Trans key="b">Meaning</Trans>]}
              />
            </>
          ),
        },
        {
          id: "article",
          title: t`A local news story`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Read a short article from a town paper in Pärnu and answer the questions, as in
                    the B1 reading exam.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="local-news"
                title={<Trans>What does the article say?</Trans>}
                by={t`Pärnu local paper`}
                sentences={NEWS_ARTICLE}
                questions={content.article}
              />
            </>
          ),
        },
        {
          id: "forms",
          title: t`Tell the forms apart`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each sentence comes from a news report and mixes stage 6 forms: -tud, -nud, -v,
                    -des, -mata, <b lang="et">-ja</b>, <b lang="et">-mine</b> and -lik. Type the
                    form that fits.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="news-forms"
                title={<Trans>Type the right form</Trans>}
                items={content.forms}
                rounds={10}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All ten stage 6 forms right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Read the reason under each one you missed.</Trans>
                  ) : (
                    <Trans>Check What to remember below, then try again.</Trans>
                  )
                }
                recall={formRecall}
                order={pairRun}
                round={(props) => <FormRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "report",
          title: t`Weather and traffic`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Fill the radio weather and traffic bulletin from the word bank. Three words in
                    the bank are spare.
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="news-gaps"
                title={<Trans>Fill the bulletin</Trans>}
                mode="drag"
                gaps={content.gaps}
                spare={NEWS_SPARE}
                clip="p-ilmateade"
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
                  <Trans>Write each news sentence in Estonian.</Trans>
                </p>
              </Prose>
              <Quiz
                id="write-news"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.translations}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight news sentences right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the forms in the ones you missed.</Trans>
                  ) : (
                    <Trans>Read the phrases at the top once more, then try again.</Trans>
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
          title: t`Fix the report`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Each sentence has one wrong word. Tap it, then type the right form.</Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-news"
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
          id: "radio",
          title: t`Evening radio news`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kalev hosts the local evening news and talks to Liisa Tamm about Tartu’s autumn
                    day. You can play the recording twice, as in the B1 exam.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="radio-news"
                title={<Trans>Listen: evening news and interview</Trans>}
                clip="c-raadio"
                turns={NEWS_CONVERSATION.turns}
                names={names}
                questions={content.radio}
                plays={2}
              />
            </>
          ),
        },
        {
          id: "letter",
          title: t`A letter to the paper`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Write a short letter of about 90 words to a local paper about a path, park or
                    bus line in your town, then compare it with a model.
                  </Trans>
                </p>
              </Prose>
              <Writing
                id="letter-editor"
                title={<Trans>Write to the editorial office</Trans>}
                prompt={
                  <p>
                    <Trans>
                      Write to the local newspaper. Thank them or comment on a local change, give a
                      reason with <b lang="et">sest</b> or <b lang="et">kuna</b>, suggest one
                      improvement and sign your name.
                    </Trans>
                  </p>
                }
                model={NEWS_LETTER_BODY}
                signOff={NEWS_LETTER_SIGN}
                checks={content.checks}
              />
            </>
          ),
        },
      ]}
    />
  );
}
