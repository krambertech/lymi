import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  objectGapSaid,
  PLURAL_PART_FORMS,
  PLURAL_PART_GAPS,
  PLURAL_PART_KINDS,
  PLURAL_PART_MATCH,
  PLURAL_PART_PARTY,
  PLURAL_PART_USES,
} from "../../../lib/learn/clips";
import { shuffle, shuffledRun } from "../../../lib/learn/quiz";
import { Chips, Panel } from "../Explore";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Match, type MatchPair } from "../Match";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { type PassageQuestion, Reading } from "../Passage";
import { type GapItem, GapRound, Quiz } from "../Quiz";
import { Word } from "../Word";

const SLUG = "raamatuid-maju";
const src = (text: string) => clipUrl(SLUG, clipId(text));

type Kind = keyof typeof PLURAL_PART_KINDS;

function Et({ children }: { children: ReactNode }) {
  return <span lang="et">{children}</span>;
}

const MEANS: Record<string, MessageDescriptor> = {
  auto: msg`car`,
  kino: msg`cinema`,
  ema: msg`mother`,
  raamat: msg`book`,
  õpik: msg`textbook`,
  kohvik: msg`café`,
  maja: msg`house`,
  õun: msg`apple`,
  kool: msg`school`,
  lind: msg`bird`,
  maa: msg`land, country`,
  puu: msg`tree`,
  tee: msg`road, way`,
};

const GLOSSARY: Glossary = {
  palju: { en: msg`many, a lot` },
  sünnipäev: { en: msg`birthday` },
  külalisi: { en: msg`guests`, note: msg`The plural third form of külaline, guest.` },
  lilli: { en: msg`flowers`, note: msg`The plural third form of lill, flower.` },
  kooke: { en: msg`cakes`, note: msg`The plural third form of kook, cake.` },
  banaane: { en: msg`bananas`, note: msg`The plural third form of banaan, banana.` },
  "mul on palju raamatuid.": { en: msg`I have a lot of books.` },
  "poes on õunu.": { en: msg`There are apples in the shop.` },
  "mul ei ole autosid.": { en: msg`I don’t have any cars.` },
  "ma armastan linde.": { en: msg`I love birds.` },
};

type GapRun = GapItem & { id: string; said: string };

function KindTable() {
  const { t, i18n } = useLingui();
  const [kind, setKind] = useState<Kind>("id");
  const tips: Record<Kind, ReactNode> = {
    sid: (
      <Trans>
        Most words that end in a vowel and have no other change add <Et>-sid</Et>:{" "}
        <Et>auto, autosid</Et>.
      </Trans>
    ),
    id: (
      <Trans>
        Longer words that end in a consonant add <Et>-id</Et> to the genitive:{" "}
        <Et>raamatu, raamatuid</Et>.
      </Trans>
    ),
    vowel: (
      <Trans>
        Short words change the last vowel of the third form: <Et>maja, maju</Et>;{" "}
        <Et>kooli, koole</Et>; <Et>lindu, linde</Et>.
      </Trans>
    ),
    long: (
      <Trans>
        Words of one long syllable shorten it and add <Et>-id</Et>: <Et>maa, maid</Et>.
      </Trans>
    ),
  };
  const kinds: { value: Kind; label: string; lang?: string }[] = [
    { value: "sid", label: "-sid", lang: "et" },
    { value: "id", label: "-id", lang: "et" },
    { value: "vowel", label: t`A new last vowel` },
    { value: "long", label: t`One long syllable` },
  ];
  const rows: ParadigmRow[] = PLURAL_PART_KINDS[kind].map((noun) => ({
    id: noun.word,
    label: i18n._(MEANS[noun.word] as MessageDescriptor),
    tip: tips[kind],
    cells: [
      { form: noun.word, src: src(noun.word) },
      { form: noun.part, src: src(noun.part) },
      { form: noun.many, src: src(noun.many) },
    ],
  }));
  return (
    <Panel className="gap-5">
      <Chips label={t`Endings`} items={kinds} value={kind} onPick={setKind} />
      <Paradigm
        key={kind}
        label={t`Dictionary form, third form and plural third form`}
        columns={[t`Dictionary form`, t`Third form`, t`Third form, more than one`]}
        rows={rows}
        highlight={{ column: 2 }}
        empty={{ title: t`Tap a form`, tip: tips[kind] }}
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

function useContent() {
  const { t } = useLingui();
  return useMemo(() => {
    const whys: Record<string, ReactNode> = {
      two: <Trans>After a number, the singular third form.</Trans>,
      many: (
        <Trans>
          After <Et>palju</Et>, the plural third form.
        </Trans>
      ),
      where: (
        <Trans>
          These are the things the sentence is about, so the plural dictionary form with -d.
        </Trans>
      ),
    };
    const gaps: GapRun[] = PLURAL_PART_GAPS.map((gap) => {
      const said = objectGapSaid(gap);
      const kind = gap.id.split("-").at(-1) as string;
      return {
        id: gap.id,
        said,
        src: src(said),
        before: gap.before,
        after: gap.after,
        options: PLURAL_PART_FORMS[gap.noun],
        answer: gap.answer,
        explain: whys[kind],
      };
    });

    const pairs: MatchPair[] = PLURAL_PART_MATCH.map((noun) => ({
      id: noun.word,
      left: noun.word,
      right: noun.many,
      rightLang: "et",
      src: src(noun.many),
    }));

    const party: PassageQuestion[] = [
      {
        id: "bought",
        ask: t`What did Kati buy?`,
        options: [
          { id: "bread", label: t`Bread and cheese` },
          { id: "fruit", label: t`Apples and bananas` },
          { id: "cakes", label: t`Cakes` },
        ],
        answer: "fruit",
        line: 1,
      },
      {
        id: "flowers",
        ask: t`Who is bringing flowers?`,
        options: [
          { id: "friends", label: t`Kati’s friends` },
          { id: "mother", label: t`Her mother and father` },
          { id: "children", label: t`The neighbours’ children` },
        ],
        answer: "friends",
        line: 3,
      },
      {
        id: "children",
        ask: t`What are the children eating?`,
        options: [
          { id: "soup", label: t`Soup` },
          { id: "cakes", label: t`Cakes` },
          { id: "fruit", label: t`Bananas and apples` },
        ],
        answer: "cakes",
        line: 4,
      },
    ];

    return { gaps, pairs, party };
  }, [t]);
}

const gapRun = (items: readonly GapRun[], pinned?: GapRun): GapRun[] =>
  shuffledRun(items, pinned).map((item) =>
    item === pinned ? item : { ...item, options: shuffle([...item.options]) },
  );

export function RaamatuidMajuLesson() {
  const { t } = useLingui();
  const content = useContent();
  const partitive = lessonBySlug("osastav")?.n;
  const plural = lessonBySlug("mitmus")?.n;
  const forms = lessonBySlug("pohivormid")?.n;

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          The third form for more than one: <Et>palju raamatuid</Et>, <Et>poes on õunu</Et>. Its
          three endings, and how it differs from <Et>kaks raamatut</Et> and <Et>raamatud</Et>.
        </Trans>
      }
      facts={[
        <Trans key="m">14 minutes</Trans>,
        <Trans key="q">3 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["palju", "sünnipäev", "külalisi", "lilli"]}
      recap={[
        <Trans key="1">
          Some or many things, no number: the plural third form.{" "}
          <b lang="et">Mul on palju raamatuid.</b>
        </Trans>,
        <Trans key="2">
          After a number, still the singular: <b lang="et">kaks raamatut</b>.
        </Trans>,
        <Trans key="3">
          Three endings: <b lang="et">-sid</b> (<b lang="et">autosid</b>), <b lang="et">-id</b> (
          <b lang="et">raamatuid</b>), or a new last vowel (<b lang="et">maju, koole</b>).
        </Trans>,
        <Trans key="4">
          Learn it as the fourth key form, with the dictionary form, the genitive and the third
          form.
        </Trans>,
      ]}
      sections={[
        {
          id: "some-many",
          title: t`Some and many`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Lesson {partitive} used the third form for some of a thing: <Et>leiba</Et>,{" "}
                    <Et>kohvi</Et>. For some or many things you can count, the third form goes into
                    the plural. In English it’s the difference between some bread and some apples, a
                    lot of coffee and a lot of books.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    It comes after <Word w="palju" />, many, when something is there or isn’t, after{" "}
                    <Et>ei</Et>, and for things in general.
                  </Trans>
                </p>
              </Prose>
              <SentenceList items={PLURAL_PART_USES} />
              <Aside>
                <Trans>
                  A number still takes the singular: <Et>kaks raamatut</Et>, two books. The plural
                  with <Et>-d</Et> from lesson {plural}, <Et>raamatud</Et>, is for the things the
                  sentence is about: <Et>Raamatud on laual.</Et>
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "endings",
          title: t`Three endings`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    The plural third form ends in <Et>-sid</Et>, <Et>-id</Et>, or a vowel. Which one
                    a word takes is hard to guess, so a dictionary gives it as a fourth key form,
                    after the three of lesson {forms}. The patterns below cover most everyday words.
                  </Trans>
                </p>
              </Prose>
              <KindTable />
              <Aside>
                <Trans>
                  Many words with a vowel ending also allow <Et>-sid</Et>: <Et>maju</Et> or{" "}
                  <Et>majasid</Et>. Both are right, and <Et>-sid</Et> is the safe guess when you’re
                  not sure.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "which-form",
          title: t`Two, many or the ones you mean`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Pick the form that fits the words before the gap, then hear the sentence.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="two-or-many"
                title={<Trans>Which form?</Trans>}
                items={content.gaps}
                rounds={9}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All nine. Two, many and the ones you mean, every time.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Look at the word just before each gap.</Trans>
                  ) : (
                    <Trans>Read the box under the sentences once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: item.src })}
                order={gapRun}
                round={(props) => <GapRound {...props} listen="after" />}
              />
            </>
          ),
        },
        {
          id: "new-words",
          title: t`Six more words`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Match each word with its plural third form. Use the patterns in the table.
                  </Trans>
                </p>
              </Prose>
              <Match
                id="plural-third-forms"
                title={<Trans>Which plural third form?</Trans>}
                pairs={content.pairs}
                columns={[<Trans key="w">Word</Trans>, <Trans key="p">Many of them</Trans>]}
              />
            </>
          ),
        },
        {
          id: "party",
          title: t`Kati’s birthday`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kati is having a <Word w="sünnipäev" />, a birthday party. Read about it and
                    answer. Every plural third form is there because no number counts the things.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="kati-party"
                title={<Trans>Kati’s birthday</Trans>}
                clip="p-party"
                sentences={PLURAL_PART_PARTY}
                questions={content.party}
              />
            </>
          ),
        },
      ]}
    />
  );
}
