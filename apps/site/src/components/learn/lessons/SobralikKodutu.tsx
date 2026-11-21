import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  COTTAGE_PASSAGE,
  SUFFIX_HEARD,
  SUFFIX_KINDS,
} from "../../../lib/learn/clips";
import { shuffledRun } from "../../../lib/learn/quiz";
import { Chips, Panel } from "../Explore";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { type PassageQuestion, Reading } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { Word } from "../Word";

const SLUG = "sobralik-kodutu";
const src = (text: string) => clipUrl(SLUG, clipId(text));

type Kind = keyof typeof SUFFIX_KINDS;

function Et({ children }: { children: ReactNode }) {
  return <span lang="et">{children}</span>;
}

const MEANS: Record<string, MessageDescriptor> = {
  sõbralik: msg`friendly`,
  kasulik: msg`useful`,
  lapselik: msg`childlike`,
  emalik: msg`motherly`,
  kodutu: msg`homeless`,
  töötu: msg`unemployed`,
  lõputu: msg`endless`,
  mõttetu: msg`pointless`,
  majake: msg`little house`,
  kassike: msg`kitty`,
  raamatuke: msg`little book`,
  pojake: msg`little son`,
};

const GLOSSARY: Glossary = {
  naaber: { en: msg`neighbour`, note: msg`More than one: naabrid.` },
  puhkama: { en: msg`to rest, to be on holiday`, note: msg`After tahame it is puhata.` },
};

function SuffixTable() {
  const { t, i18n } = useLingui();
  const [kind, setKind] = useState<Kind>("lik");
  const tips: Record<Kind, ReactNode> = {
    lik: (
      <Trans>
        <Et>-lik</Et> gives a quality, like English -ly or -ful: <Et>sõbralik</Et>, friendly.
      </Trans>
    ),
    tu: (
      <Trans>
        <Et>-tu</Et> means without, like English -less: <Et>kodutu</Et>, homeless.
      </Trans>
    ),
    ke: (
      <Trans>
        <Et>-ke</Et> makes something small or dear: <Et>majake</Et>, a little house.
      </Trans>
    ),
  };
  const kinds: { value: Kind; label: string; lang?: string }[] = [
    { value: "lik", label: "-lik", lang: "et" },
    { value: "tu", label: "-tu", lang: "et" },
    { value: "ke", label: "-ke", lang: "et" },
  ];
  const rows: ParadigmRow[] = SUFFIX_KINDS[kind].map((item) => ({
    id: item.word,
    label: i18n._(MEANS[item.word] as MessageDescriptor),
    tip: tips[kind],
    cells: [
      { form: item.base, src: src(item.base) },
      { form: item.second, src: src(item.second) },
      { form: item.word, src: src(item.word) },
    ],
  }));
  return (
    <Panel className="gap-5">
      <Chips label={t`Ending`} items={kinds} value={kind} onPick={setKind} />
      <Paradigm
        key={kind}
        label={t`Nouns and the words made from them`}
        columns={[t`Noun`, t`Second form`, t`New word`]}
        rows={rows}
        highlight={{ column: 2 }}
        empty={{ title: t`Tap a form`, tip: tips[kind] }}
      />
    </Panel>
  );
}

type HeardRun = ChoiceItem & { id: string; said: string };

function content(t: (descriptor: MessageDescriptor) => string, locale: string) {
  const kinds = [
    { id: "lik", label: <span lang={locale}>{t(msg`It has that quality`)}</span> },
    { id: "tu", label: <span lang={locale}>{t(msg`It is without it`)}</span> },
    { id: "ke", label: <span lang={locale}>{t(msg`A small or dear one`)}</span> },
  ];
  const whys: Record<Kind, ReactNode> = {
    lik: (
      <Trans>
        It ends in <Et>-lik</Et>, a quality.
      </Trans>
    ),
    tu: (
      <Trans>
        It ends in <Et>-tu</Et>, without.
      </Trans>
    ),
    ke: (
      <Trans>
        It ends in <Et>-ke</Et>, small or dear.
      </Trans>
    ),
  };
  const heard: HeardRun[] = SUFFIX_HEARD.map((item) => ({
    id: item.word,
    said: item.word,
    src: src(item.word),
    answer: item.kind,
    options: kinds,
    explain: (
      <>
        <Et>{item.word}</Et>: {whys[item.kind]}
      </>
    ),
  }));

  const cottage: PassageQuestion[] = [
    {
      id: "where",
      ask: t(msg`Where is the little house?`),
      options: [
        { id: "sea", label: t(msg`By the sea`) },
        { id: "tallinn", label: t(msg`In the middle of Tallinn`) },
        { id: "forest", label: t(msg`In a forest near Tartu`) },
      ],
      answer: "sea",
      line: 0,
    },
    {
      id: "neighbours",
      ask: t(msg`What are the neighbours like?`),
      options: [
        { id: "quiet", label: t(msg`Quiet`) },
        { id: "friendly", label: t(msg`Friendly and helpful`) },
        { id: "away", label: t(msg`Often away`) },
      ],
      answer: "friendly",
      line: 2,
    },
    {
      id: "phone",
      ask: t(msg`Why is the phone useless there?`),
      options: [
        { id: "battery", label: t(msg`The battery is old`) },
        { id: "calls", label: t(msg`Nobody calls them there`) },
        { id: "internet", label: t(msg`There is no internet`) },
      ],
      answer: "internet",
      line: 3,
    },
  ];

  return { heard, cottage };
}

const heardRun = (items: readonly HeardRun[], pinned?: HeardRun): HeardRun[] =>
  shuffledRun(items, pinned);

export function SobralikKodutuLesson() {
  const { t, i18n } = useLingui();
  const lesson = content((descriptor) => i18n._(descriptor), i18n.locale);
  const genitive = lessonBySlug("omastav")?.n;

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          <Et>Sõbralik</Et>, <Et>kodutu</Et>, <Et>majake</Et>: three endings that turn a noun into a
          new word, so one word you know gives you three more.
        </Trans>
      }
      facts={[
        <Trans key="m">10 minutes</Trans>,
        <Trans key="q">2 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["naaber", "puhkama"]}
      recap={[
        <Trans key="1">
          The ending usually goes on the second form: <b lang="et">sõber, sõbra, sõbralik</b>.
        </Trans>,
        <Trans key="2">
          <b lang="et">-lik</b> gives a quality: <b lang="et">kasulik</b>, useful.{" "}
          <b lang="et">-tu</b> means without: <b lang="et">kasutu</b>, useless.
        </Trans>,
        <Trans key="3">
          <b lang="et">-ke</b> makes something small or dear: <b lang="et">kassike</b>, a kitty.
        </Trans>,
      ]}
      sections={[
        {
          id: "endings",
          title: t`Three endings`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Usually you take the second form from lesson {genitive} and add an ending.{" "}
                    <Et>-lik</Et> gives a quality, <Et>-tu</Et> means without, and <Et>-ke</Et>{" "}
                    makes it small or dear. Pick an ending to see its words.
                  </Trans>
                </p>
              </Prose>
              <SuffixTable />
              <Aside>
                <Trans>
                  The same noun can take two endings with opposite meanings: <Et>kasulik</Et>,
                  useful, and <Et>kasutu</Et>, useless. In songs and poems you will also hear the
                  longer <Et>-kene</Et>: <Et>majakene</Et>. Some <Et>-lik</Et> words are shorter
                  than the second form: <Et>ohtlik</Et>, <Et>tervislik</Et>. And this <Et>-ke</Et>{" "}
                  is not the one in <Et>tehke</Et>, which tells several people to do something.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "quiz",
          title: t`What does the ending say?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Listen to each word and pick what its ending says. Some of these words are new:
                    the ending is enough.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="which-ending"
                title={<Trans>Which ending?</Trans>}
                items={lesson.heard}
                rounds={9}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All nine. You can read a new word from its ending.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>
                      Most of them. Listen to the last sound: <Et>-lik</Et>, <Et>-tu</Et> or{" "}
                      <Et>-ke</Et>.
                    </Trans>
                  ) : (
                    <Trans>Look through the table once more, then try again.</Trans>
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
          id: "cottage",
          title: t`A little house by the sea`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kati writes about her family’s summer place. Look for words with <Et>-lik</Et>,{" "}
                    <Et>-tu</Et> and <Et>-ke</Et>, and for her <Word w="naaber" />, her neighbours.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="kati-cottage"
                title={<Trans>What does Kati write?</Trans>}
                by={t`Kati writes`}
                clip="p-kati"
                sentences={COTTAGE_PASSAGE}
                questions={lesson.cottage}
              />
            </>
          ),
        },
      ]}
    />
  );
}
