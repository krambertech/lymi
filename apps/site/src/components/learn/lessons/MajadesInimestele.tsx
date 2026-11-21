import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  PLURAL_CASE_MATCH,
  PLURAL_CASE_NOUNS,
  PLURAL_CASE_SHOPPING,
  PLURAL_CASE_USES,
  PLURAL_GENITIVES,
} from "../../../lib/learn/clips";
import { shuffledRun } from "../../../lib/learn/quiz";
import { Chips, Panel } from "../Explore";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Match, type MatchPair } from "../Match";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { type PassageQuestion, Reading } from "../Passage";
import { ChoiceRound, type ChoiceItem, Quiz } from "../Quiz";
import { Word } from "../Word";

const SLUG = "majades-inimestele";
const src = (text: string) => clipUrl(SLUG, clipId(text));

type Noun = keyof typeof PLURAL_CASE_NOUNS;

function Et({ children }: { children: ReactNode }) {
  return <span lang="et">{children}</span>;
}

const MEANS: Record<Noun, MessageDescriptor> = {
  maja: msg`house`,
  raamat: msg`book`,
  inimene: msg`person`,
  sõber: msg`friend`,
};

const CASES: { ending: string; label: MessageDescriptor }[] = [
  { ending: "", label: msg`of, the genitive` },
  { ending: "-s", label: msg`in` },
  { ending: "-sse", label: msg`into` },
  { ending: "-st", label: msg`out of` },
  { ending: "-le", label: msg`to` },
  { ending: "-l", label: msg`on, at` },
  { ending: "-ga", label: msg`with` },
];

const GLOSSARY: Glossary = {
  kingitusi: { en: msg`presents`, note: msg`The plural third form of kingitus, present.` },
  müüjatega: { en: msg`with the shop assistants`, note: msg`From müüja, shop assistant.` },
  kottidesse: { en: msg`into bags`, note: msg`From kott, bag.` },
  raamatupoodides: { en: msg`in bookshops`, note: msg`From raamatupood, bookshop.` },
  "ma räägin inimestega.": { en: msg`I talk with people.` },
  "ta kirjutab sõpradele.": { en: msg`She writes to her friends.` },
  "raamatutes on pilte.": { en: msg`There are pictures in the books.` },
  "linnud istuvad puudel.": { en: msg`The birds sit in the trees.` },
};

function CaseTable() {
  const { t, i18n } = useLingui();
  const [noun, setNoun] = useState<Noun>("maja");
  const forms = PLURAL_CASE_NOUNS[noun];
  const genitive = forms.many[0];
  const nouns = (Object.keys(PLURAL_CASE_NOUNS) as Noun[]).map((value) => ({
    value,
    label: value,
    lang: "et",
  }));
  const rows: ParadigmRow[] = CASES.map((kase, at) => ({
    id: kase.ending || "genitive",
    label: i18n._(kase.label),
    tip: kase.ending ? (
      <Trans>
        The plural genitive <Et>{genitive}</Et> plus <Et>{kase.ending}</Et>.
      </Trans>
    ) : (
      <Trans>The plural genitive: the stem for every other plural case.</Trans>
    ),
    cells: [
      { form: forms.one[at] as string, src: src(forms.one[at] as string) },
      { form: forms.many[at] as string, src: src(forms.many[at] as string) },
    ],
  }));
  return (
    <Panel className="gap-5">
      <Chips label={t`Word`} items={nouns} value={noun} onPick={setNoun} />
      <p className="m-0 text-sm">
        <Et>{noun}</Et>, {i18n._(MEANS[noun])}
      </p>
      <Paradigm
        key={noun}
        label={t`One and more than one, case by case`}
        columns={[t`One`, t`More than one`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{
          title: t`Tap a form`,
          tip: <Trans>Every plural form starts with the plural genitive.</Trans>,
        }}
      />
    </Panel>
  );
}

function SentenceList({ items }: { items: readonly string[] }) {
  return (
    <ul className="m-0 grid list-none gap-1 p-0">
      {items.map((said) => (
        <li key={said}>
          <Word w={said} />
        </li>
      ))}
    </ul>
  );
}

type GenitiveRun = ChoiceItem & { id: string; said: string };

function useContent() {
  const { t } = useLingui();
  return useMemo(() => {
    const endings = [
      { id: "de", label: <Et>+ de</Et> },
      { id: "e", label: <Et>+ e</Et> },
    ];
    const genitives: GenitiveRun[] = PLURAL_GENITIVES.map((item) => ({
      id: item.part,
      said: item.answer,
      src: src(item.part),
      answer: item.kind === "vowel" ? "de" : "e",
      options: endings,
      explain:
        item.kind === "vowel" ? (
          <Trans>
            <Et>{item.part}</Et> ends in a vowel, so add <Et>-de</Et>: <Et>{item.answer}</Et>.
          </Trans>
        ) : item.kind === "t" ? (
          <Trans>
            <Et>{item.part}</Et> ends in <Et>-t</Et>, so add <Et>-e</Et>: <Et>{item.answer}</Et>.
          </Trans>
        ) : (
          <Trans>
            <Et>{item.part}</Et> ends in <Et>-d</Et>, so add <Et>-e</Et>: <Et>{item.answer}</Et>.
          </Trans>
        ),
    }));

    const pairs: MatchPair[] = PLURAL_CASE_MATCH.map((pair) => ({
      id: pair.one,
      left: pair.one,
      right: pair.many,
      rightLang: "et",
      src: src(pair.many),
    }));

    const shopping: PassageQuestion[] = [
      {
        id: "where",
        ask: t`Where do Kati and Mari go on Saturday?`,
        options: [
          { id: "market", label: t`To the market` },
          { id: "shops", label: t`Round the shops` },
          { id: "friends", label: t`To see their friends at home` },
        ],
        answer: "shops",
        line: 0,
      },
      {
        id: "for",
        ask: t`Who are the presents for?`,
        options: [
          { id: "friends", label: t`Their friends` },
          { id: "staff", label: t`The shop assistants` },
          { id: "parents", label: t`Their parents` },
        ],
        answer: "friends",
        line: 1,
      },
      {
        id: "put",
        ask: t`Where do they put the presents?`,
        options: [
          { id: "car", label: t`In the car` },
          { id: "boxes", label: t`In big boxes` },
          { id: "bags", label: t`Into bags` },
        ],
        answer: "bags",
        line: 4,
      },
    ];

    return { genitives, pairs, shopping };
  }, [t]);
}

const genitiveRun = (items: readonly GenitiveRun[], pinned?: GenitiveRun): GenitiveRun[] =>
  shuffledRun(items, pinned);

export function MajadesInimesteleLesson() {
  const { t } = useLingui();
  const content = useContent();
  const cases = lessonBySlug("majas-majja-majast")?.n;
  const gradation = lessonBySlug("jalg-jala")?.n;

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          One plural stem and the endings you already know: <Et>majades</Et>, <Et>inimestele</Et>,{" "}
          <Et>sõpradega</Et>. How to build the stem with <Et>-de</Et> or <Et>-te</Et>.
        </Trans>
      }
      facts={[
        <Trans key="m">14 minutes</Trans>,
        <Trans key="q">3 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["kingitusi", "müüjatega", "kottidesse", "raamatupoodides"]}
      recap={[
        <Trans key="1">
          Every plural case is the plural genitive plus the singular ending:{" "}
          <b lang="et">majade, majades, majadele</b>.
        </Trans>,
        <Trans key="2">
          Third form ends in a vowel: add <b lang="et">-de</b>. <b lang="et">maja, majade</b>;{" "}
          <b lang="et">sõpra, sõprade</b>.
        </Trans>,
        <Trans key="3">
          Third form ends in <b lang="et">-d</b> or <b lang="et">-t</b>: add <b lang="et">-e</b>.{" "}
          <b lang="et">maad, maade</b>; <b lang="et">raamatut, raamatute</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "one-stem",
          title: t`One stem, the same endings`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In lesson {cases} you added endings to the genitive: <Et>maja, majas</Et>;{" "}
                    <Et>sõbra, sõbrale</Et>. The plural works the same way, with one step first.
                    Make the plural genitive, then add the same endings: <Et>majade, majades</Et>;{" "}
                    <Et>sõprade, sõpradele</Et>.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    English adds -s once and leaves the rest to small words: in the houses, to the
                    friends. Estonian puts it all in one word, and the plural part always comes
                    first.
                  </Trans>
                </p>
              </Prose>
              <SentenceList items={PLURAL_CASE_USES} />
            </>
          ),
        },
        {
          id: "table",
          title: t`Case by case`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Pick a word and compare its forms. The right column always starts with the
                    plural genitive in the first row.
                  </Trans>
                </p>
              </Prose>
              <CaseTable />
              <Aside>
                <Trans>
                  Look at <Et>sõber</Et>: <Et>sõbrale</Et>, but <Et>sõpradele</Et>. The plural
                  genitive is built on the third form <Et>sõpra</Et>, so it keeps the strong
                  consonant from lesson {gradation}.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "build",
          title: t`Build the plural genitive`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Start from the third form. If it ends in a vowel, add <Et>-de</Et>:{" "}
                    <Et>maja, majade</Et>; <Et>sõpra, sõprade</Et>. If it ends in <Et>-d</Et> or{" "}
                    <Et>-t</Et>, add <Et>-e</Et>: <Et>maad, maade</Et>; <Et>raamatut, raamatute</Et>
                    ; <Et>inimest, inimeste</Et>.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Hear the third form, then pick what it adds. Listen for its last sound.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="plural-genitive"
                title={
                  <Trans>
                    <Et>-de</Et> or <Et>-e</Et>?
                  </Trans>
                }
                items={content.genitives}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight. You can build the stem for every plural case.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Listen to the last sound of the third form.</Trans>
                  ) : (
                    <Trans>Read the rule above the quiz once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: src(item.said) })}
                order={genitiveRun}
                round={(props) => <ChoiceRound {...props} />}
              />
              <Aside>
                <Trans>
                  A few words such as <Et>auto</Et> and <Et>kino</Et> take <Et>-de</Et> even though
                  their third form ends in <Et>-t</Et>: <Et>autode</Et>, <Et>kinode</Et>.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "match",
          title: t`One to many`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Match each form with its plural. Keep the ending, change the stem.</Trans>
                </p>
              </Prose>
              <Match
                id="plural-cases"
                title={<Trans>Which plural?</Trans>}
                pairs={content.pairs}
                columns={[<Trans key="o">One</Trans>, <Trans key="m">More than one</Trans>]}
              />
            </>
          ),
        },
        {
          id: "shopping",
          title: t`Saturday shopping`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kati and Mari go shopping for presents, <Word w="kingitusi" />. Read about it
                    and answer.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="kati-shopping"
                title={<Trans>Saturday shopping</Trans>}
                clip="p-shopping"
                sentences={PLURAL_CASE_SHOPPING}
                questions={content.shopping}
              />
            </>
          ),
        },
      ]}
    />
  );
}
