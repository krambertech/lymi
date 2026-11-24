import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  AGENT_ACTIONS,
  AGENT_AD,
  AGENT_ANSWERS,
  AGENT_CONVERSATION,
  AGENT_DOERS,
  AGENT_FIX_ANSWERS,
  AGENT_FIXES,
  AGENT_FORMS,
  AGENT_HEARD,
  AGENT_MODEL,
  AGENT_SORT,
  AGENT_TRANSLATE,
  clipId,
  clipUrl,
} from "../../../lib/learn/clips";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Panel } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { Listening, type PassageQuestion, Reading } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Sort, type SortItem } from "../Sort";
import { Word } from "../Word";
import { Writing } from "../Writing";

const SLUG = "opetaja-lugemine";
const src = (text: string) => clipUrl(SLUG, clipId(text));
const plain = (form: string) => form.replace("|", "");

const VERBS: Record<string, MessageDescriptor> = {
  õpetama: msg`to teach`,
  müüma: msg`to sell`,
  lugema: msg`to read`,
  laulma: msg`to sing`,
  ostma: msg`to buy`,
  töötama: msg`to work`,
  tegema: msg`to do, to make`,
  ujuma: msg`to swim`,
  õppima: msg`to learn, to study`,
  suitsetama: msg`to smoke`,
  magama: msg`to sleep`,
  jooksma: msg`to run`,
  parkima: msg`to park`,
  kuulama: msg`to listen`,
};

const GLOSSARY: Glossary = {
  õpetaja: { en: msg`teacher`, note: msg`From õpetama, to teach: one who teaches.` },
  lugeja: { en: msg`reader` },
  müüja: { en: msg`seller, shop assistant` },
  lugemine: { en: msg`reading`, note: msg`From lugema. Partitive: lugemist.` },
  ujumine: { en: msg`swimming` },
  õppimine: { en: msg`learning, studying` },
  tegija: { en: msg`doer, someone who gets things done` },
};

function DoerTable() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = AGENT_DOERS.map((each) => ({
    id: each.verb,
    label: i18n._(VERBS[each.verb] as MessageDescriptor),
    et: each.verb,
    cells: [
      {
        form: each.doer,
        src: src(plain(each.doer)),
        ...(each.verb === "tegema"
          ? {
              note: (
                <Trans>
                  An exception: <b lang="et">tegema</b> gives <b lang="et">tegija</b>, with{" "}
                  <b lang="et">i</b>.
                </Trans>
              ),
            }
          : {}),
      },
      { form: each.said.replace(/\.$/, ""), src: src(each.said) },
    ],
  }));
  return (
    <Panel>
      <Paradigm
        label={t`Who does it`}
        columns={[t`Who does it`, t`In a sentence`]}
        rows={rows}
        highlight={{ column: 0 }}
        empty={{
          title: t`Tap a form`,
          tip: (
            <Trans>
              Here, replace <b lang="et">-ma</b> with <b lang="et">-ja</b>:{" "}
              <b lang="et">õpetama, õpetaja</b>.
            </Trans>
          ),
        }}
      />
    </Panel>
  );
}

function ActionTable() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = AGENT_ACTIONS.map((each) => ({
    id: each.verb,
    label: i18n._(VERBS[each.verb] as MessageDescriptor),
    et: each.verb,
    cells: [
      { form: each.action, src: src(plain(each.action)) },
      { form: each.part, src: src(plain(each.part)) },
      { form: each.said.replace(/\.$/, ""), src: src(each.said) },
    ],
  }));
  return (
    <Panel>
      <Paradigm
        label={t`The doing`}
        columns={[t`The doing`, t`Partitive`, t`In a sentence`]}
        rows={rows}
        highlight={{ column: 0 }}
        empty={{
          title: t`Tap a form`,
          tip: (
            <Trans>
              Usually replace <b lang="et">-ma</b> with <b lang="et">-mine</b>. The partitive ends
              in <b lang="et">-mist</b>.
            </Trans>
          ),
        }}
      />
    </Panel>
  );
}

type Kind = "ja" | "mine" | "ma";
const KINDS: readonly Kind[] = ["ja", "mine", "ma"];
const HEARD_MEANS: Record<(typeof AGENT_HEARD)[number]["id"], Record<Kind, MessageDescriptor>> = {
  laul: { ja: msg`a singer`, mine: msg`singing`, ma: msg`to sing` },
  luge: { ja: msg`a reader`, mine: msg`reading`, ma: msg`to read` },
  ost: { ja: msg`a buyer`, mine: msg`buying`, ma: msg`to buy` },
};

const heardOptions = (id: (typeof AGENT_HEARD)[number]["id"], i18n: I18n) =>
  KINDS.map((kind) => ({
    id: kind,
    label: (
      <span lang={i18n.locale} className="text-lg font-medium tracking-normal">
        {i18n._(HEARD_MEANS[id][kind])}
      </span>
    ),
  }));

const pairRun = <T extends { pair: readonly [string, string] }>(items: readonly T[], pinned?: T) =>
  eachPairFirst(items, pinned);

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const heardWhy: Record<Kind, ReactNode> = {
      ja: (
        <Trans>
          <b lang="et">-ja</b>: the person who does it.
        </Trans>
      ),
      mine: (
        <Trans>
          <b lang="et">-mine</b>: the doing itself.
        </Trans>
      ),
      ma: (
        <Trans>
          <b lang="et">-ma</b>: the verb, as a dictionary lists it.
        </Trans>
      ),
    };
    const heard: (ChoiceItem & { said: string; pair: readonly [string, string] })[] =
      AGENT_HEARD.flatMap((group) =>
        KINDS.map((kind) => ({
          said: group[kind],
          src: src(group[kind]),
          answer: kind,
          options: heardOptions(group.id, i18n),
          pair: [kind, group[kind]] as const,
          explain: heardWhy[kind],
        })),
      );

    const sort: SortItem[] = AGENT_SORT.map((each) => ({
      w: each.w,
      bin: each.bin,
      src: src(each.w),
    }));

    const forms: FormItem[] = AGENT_FORMS.map((item) => ({
      base: item.verb,
      gloss: i18n._(VERBS[item.verb] as MessageDescriptor),
      cue: item.kind === "ja" ? t`who does it` : t`the doing`,
      answers: [item.answer],
      src: src(item.answer),
      explain:
        item.kind === "ja" ? (
          <Trans>
            Here, replace <b lang="et">-ma</b> with <b lang="et">-ja</b>:{" "}
            <b lang="et">{item.answer}</b>.
          </Trans>
        ) : (
          <Trans>
            Here, replace <b lang="et">-ma</b> with <b lang="et">-mine</b>:{" "}
            <b lang="et">{item.answer}</b>.
          </Trans>
        ),
    }));

    const prompts: Record<(typeof AGENT_TRANSLATE)[number], MessageDescriptor> = {
      "Mulle meeldib lugemine.": msg`I like reading.`,
      "Ujumine on tervisele hea.": msg`Swimming is good for your health.`,
      "Mu õde on õpetaja.": msg`My sister is a teacher.`,
      "Müüja on väga lahke.": msg`The shop assistant is very kind.`,
      "Suitsetamine on siin keelatud.": msg`Smoking is not allowed here.`,
      "Eesti keele õppimine võtab aega.": msg`Learning Estonian takes time.`,
      "Ostja maksis sularahas.": msg`The buyer paid in cash.`,
    };
    const translateWhy: Partial<Record<(typeof AGENT_TRANSLATE)[number], ReactNode>> = {
      "Mulle meeldib lugemine.": (
        <Trans>
          With <b lang="et">meeldima</b>, what you like is the subject: <b lang="et">lugemine</b>.
        </Trans>
      ),
      "Eesti keele õppimine võtab aega.": (
        <Trans>
          What is learnt usually goes in the genitive before it:{" "}
          <b lang="et">eesti keele õppimine</b>.
        </Trans>
      ),
    };
    const translations: (SentenceItem & { pair: readonly [string, string] })[] =
      AGENT_TRANSLATE.map((said) => ({
        kind: "translate",
        id: clipId(said),
        prompt: i18n._(prompts[said]),
        src: src(said),
        answers: AGENT_ANSWERS[said] as readonly [string, ...string[]],
        pair: [clipId(said), clipId(said)] as const,
        explain: translateWhy[said],
      }));

    const fixWhy: Record<(typeof AGENT_FIXES)[number]["right"], ReactNode> = {
      "Mulle meeldib lugemine.": (
        <Trans>
          With <b lang="et">meeldima</b>, the thing you like is the subject:{" "}
          <b lang="et">lugemine</b>.
        </Trans>
      ),
      "Ma armastan ujumist.": (
        <Trans>
          <b lang="et">Armastama</b> takes the partitive: <b lang="et">ujumist</b>.
        </Trans>
      ),
      "Ta töötab müüjana.": (
        <Trans>
          You work as something: <b lang="et">-na</b>, <b lang="et">müüjana</b>.
        </Trans>
      ),
      "Mu vend on hea laulja.": (
        <Trans>
          A person who sings is <b lang="et">laulja</b>; <b lang="et">laulmine</b> is the singing.
        </Trans>
      ),
      "Siin on parkimine keelatud.": (
        <Trans>
          Use the noun <b lang="et">parkimine</b> or the -da infinitive <b lang="et">parkida</b>.
        </Trans>
      ),
      "Kõik õpetajad olid koosolekul.": (
        <Trans>
          Here the subject is plural and ends in <b lang="et">-d</b>: <b lang="et">õpetajad</b>.
        </Trans>
      ),
    };
    const fixPrompts: Partial<Record<(typeof AGENT_FIXES)[number]["right"], MessageDescriptor>> = {
      "Mu vend on hea laulja.": msg`My brother is a good singer.`,
    };
    const fixes: FixItem[] = AGENT_FIXES.map((item) => {
      const prompt = fixPrompts[item.right];
      return {
        kind: "fix",
        id: `fix-${clipId(item.right)}`,
        wrong: item.wrong,
        answers: AGENT_FIX_ANSWERS[item.right] ?? [item.right],
        src: src(item.right),
        explain: fixWhy[item.right],
        ...(prompt ? { prompt: i18n._(prompt) } : {}),
      };
    });

    const ad: PassageQuestion[] = [
      {
        id: "open",
        kind: "truefalse",
        ask: t`The shop is open every day.`,
        answer: true,
        line: 1,
      },
      {
        id: "job",
        ask: t`What is part of the job?`,
        options: [
          { id: "order", label: t`Ordering books` },
          { id: "write", label: t`Writing` },
          { id: "clean", label: t`Cleaning the shop every evening after closing` },
        ],
        answer: "order",
        line: 2,
      },
      {
        id: "experience",
        kind: "truefalse",
        ask: t`You need work experience for this job.`,
        answer: false,
        line: 6,
      },
      {
        id: "saturday",
        kind: "short",
        ask: t`What happens for children on Saturdays? Write one word, as the advert does.`,
        answers: ["ettelugemine"],
        line: 9,
      },
      {
        id: "letter",
        ask: t`What should your letter say?`,
        options: [
          { id: "job", label: t`Your last job` },
          { id: "book", label: t`Your favourite book, and why you like it` },
          { id: "why", label: t`Why you want this job` },
        ],
        answer: "book",
        line: 13,
      },
      {
        id: "phone",
        kind: "short",
        ask: t`Who should you phone with questions? Write it as the advert does.`,
        answers: ["poe juhatajale", "juhatajale"],
        line: 15,
      },
    ];

    const checks = [
      { id: "greet", label: <Trans>Say hello and which job you want.</Trans> },
      { id: "experience", label: <Trans>Say what work you have done.</Trans> },
      { id: "book", label: <Trans>Name your favourite book and say why.</Trans> },
      { id: "words", label: <Trans>Use at least one -ja word and one -mine word.</Trans> },
      { id: "sign", label: <Trans>Sign off politely.</Trans> },
    ];

    const exam: PassageQuestion[] = [
      {
        id: "work",
        ask: t`What is Anne’s job?`,
        options: [
          { id: "library", label: t`She works as a librarian.` },
          { id: "teacher", label: t`She teaches English at a school.` },
          { id: "writer", label: t`She writes books for a living.` },
        ],
        answer: "teacher",
        line: 1,
      },
      {
        id: "start",
        kind: "truefalse",
        ask: t`A pupil’s mother gave Anne the idea for the club.`,
        answer: true,
        line: 5,
      },
      {
        id: "members",
        kind: "short",
        ask: t`How many readers are in the club? Write it as Anne says it.`,
        answers: ["kaksteist", "12"],
        line: 8,
      },
      {
        id: "where",
        ask: t`Where do they meet?`,
        options: [
          { id: "library", label: t`The library` },
          { id: "cafe", label: t`A café near the school` },
          { id: "class", label: t`Anne’s classroom, after lessons` },
        ],
        answer: "library",
        line: 9,
      },
      {
        id: "estonians",
        kind: "truefalse",
        ask: t`All the readers are Estonian.`,
        answer: false,
        line: 16,
      },
      {
        id: "matters",
        ask: t`What does Anne think matters most?`,
        options: [
          { id: "books", label: t`Good books` },
          { id: "friends", label: t`Reading only the books you enjoy` },
          { id: "time", label: t`Making the time to read` },
        ],
        answer: "time",
        line: 20,
      },
      {
        id: "phone",
        kind: "truefalse",
        ask: t`Anne mostly reads on her phone.`,
        answer: false,
        line: 23,
      },
      {
        id: "when",
        kind: "short",
        ask: t`When should you read for ten minutes? Write it as Anne says it.`,
        answers: ["enne magamist"],
        line: 34,
      },
      {
        id: "who",
        kind: "match",
        ask: t`Who does it?`,
        options: [
          { id: "mother", label: t`A pupil’s mother` },
          { id: "worker", label: t`A library worker` },
          { id: "abroad", label: t`The readers from abroad` },
          { id: "pupils", label: t`Anne’s pupils` },
          { id: "kalev", label: t`Kalev` },
        ],
        statements: [
          { id: "asked", label: t`Asked about a reading club.`, answer: "mother", line: 5 },
          { id: "nine", label: t`Sometimes sends them out at nine.`, answer: "worker", line: 13 },
          { id: "talk", label: t`Now talk the most at meetings.`, answer: "abroad", line: 18 },
          {
            id: "story",
            label: t`Write a few sentences about a story.`,
            answer: "pupils",
            line: 31,
          },
        ],
      },
      {
        id: "free",
        kind: "truefalse",
        ask: t`Joining the club costs money.`,
        answer: false,
        line: 43,
      },
    ];

    return { heard, sort, forms, translations, fixes, ad, checks, exam };
  }, [t, i18n]);
}

export function OpetajaLugemineLesson() {
  const { t, i18n } = useLingui();
  const content = useContent();
  const infinitives = lessonBySlug("tegevusnimed")?.n;
  const government = lessonBySlug("ootan-sind")?.n;
  const names = { fourth: t`Kalev`, second: t`Anne` };

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          From <b lang="et">õpetama</b>, to teach, comes <b lang="et">õpetaja</b>, a teacher; from{" "}
          <b lang="et">lugema</b>, to read, comes <b lang="et">lugemine</b>, reading. Two endings
          make new nouns from almost any verb.
        </Trans>
      }
      facts={[
        <Trans key="m">24 minutes</Trans>,
        <Trans key="q">7 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["õpetaja", "lugeja", "müüja", "lugemine", "ujumine", "õppimine"]}
      recap={[
        <Trans key="1">
          For the person who does something, usually drop <b lang="et">-ma</b> and add{" "}
          <b lang="et">-ja</b>: <b lang="et">õpetama, õpetaja; müüma, müüja</b>.{" "}
          <b lang="et">Tegema</b> gives <b lang="et">tegija</b>.
        </Trans>,
        <Trans key="2">
          For the doing itself, usually drop <b lang="et">-ma</b> and add <b lang="et">-mine</b>:{" "}
          <b lang="et">lugemine, ujumine, suitsetamine</b>.
        </Trans>,
        <Trans key="3">
          Both are ordinary nouns: <b lang="et">õpetajad</b>, <b lang="et">õpetajat</b>;{" "}
          <b lang="et">lugemise</b>, <b lang="et">lugemist</b>, like{" "}
          <b lang="et">inimene, inimese, inimest</b>.
        </Trans>,
        <Trans key="4">
          The verb around them picks the case: <b lang="et">mulle meeldib lugemine</b>,{" "}
          <b lang="et">ma armastan lugemist</b>, <b lang="et">ta töötab müüjana</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "who",
          title: t`The person who does it`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Take the <b lang="et">-ma</b> infinitive from lesson {infinitives}, drop{" "}
                    <b lang="et">-ma</b> and add <b lang="et">-ja</b>, and you usually have the
                    person who does it. <b lang="et">Õpetama</b> is to teach, so{" "}
                    <Word w="õpetaja" /> is a teacher; <b lang="et">lugema</b> gives{" "}
                    <Word w="lugeja" />, a reader.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    A few verbs change a letter: <b lang="et">tegema</b> gives <Word w="tegija" />.
                    Tap the forms to hear them.
                  </Trans>
                </p>
              </Prose>
              <DoerTable />
              <Aside>
                <Trans>
                  Some jobs have a word of their own, and the <b lang="et">-ja</b> word can refer to
                  anyone doing the action. A writer is <b lang="et">kirjanik</b>;{" "}
                  <b lang="et">kirjutaja</b> is whoever is writing.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "doing",
          title: t`The doing itself`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    For the doing itself, usually replace <b lang="et">-ma</b> with{" "}
                    <b lang="et">-mine</b>: <Word w="lugemine" /> is reading, <Word w="ujumine" />{" "}
                    is swimming. Almost every verb has one, and signs use them a lot:{" "}
                    <b lang="et">Suitsetamine keelatud</b>, no smoking.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    A <b lang="et">-mine</b> word changes like <b lang="et">inimene</b>:{" "}
                    <b lang="et">lugemise</b> in the genitive, <b lang="et">lugemist</b> in the
                    partitive.
                  </Trans>
                </p>
              </Prose>
              <ActionTable />
              <Aside>
                <Trans>
                  A few common verbs prefer a shorter word: <b lang="et">minek</b> for going and{" "}
                  <b lang="et">tulek</b> for coming are more usual than <b lang="et">minemine</b>{" "}
                  and <b lang="et">tulemine</b>.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "hear",
          title: t`Person, doing or verb`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <b lang="et">Laulja</b>, <b lang="et">laulmine</b> and <b lang="et">laulma</b>{" "}
                    start the same way, and only the end tells them apart. Hear a word, then pick
                    what it means.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="hear-ending"
                title={<Trans>What does it mean?</Trans>}
                items={content.heard}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six: you heard the ending every time.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you got wrong once more.</Trans>
                  ) : (
                    <Trans>Tap the words in both tables once more, then try again.</Trans>
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
              <Prose>
                <p>
                  <Trans>Now sort the words: a person, or the doing?</Trans>
                </p>
              </Prose>
              <Sort
                id="person-or-doing"
                title={<Trans>Person or doing?</Trans>}
                bins={[
                  {
                    id: "ja",
                    label: t`A person`,
                    lang: i18n.locale,
                    rule: (
                      <Trans>
                        <b lang="et">-ja</b>: who does it.
                      </Trans>
                    ),
                  },
                  {
                    id: "mine",
                    label: t`The doing`,
                    lang: i18n.locale,
                    rule: (
                      <Trans>
                        <b lang="et">-mine</b>: the doing itself.
                      </Trans>
                    ),
                  },
                ]}
                items={content.sort}
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
                    Each round gives a verb and asks for the person or the doing. Type the word.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="make-word"
                title={<Trans>Type the word</Trans>}
                items={content.forms}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight, typed in full.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the ending in the ones you got wrong.</Trans>
                  ) : (
                    <Trans>Tap the words in both tables once more, then try again.</Trans>
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
                    These are ordinary nouns, so the verb around them picks their case, as in lesson{" "}
                    {government}. With <b lang="et">meeldima</b>, what you like is the subject:{" "}
                    <b lang="et">Mulle meeldib lugemine.</b> <b lang="et">Armastama</b> takes the
                    partitive: <b lang="et">Ma armastan lugemist.</b>
                  </Trans>
                </p>
                <p>
                  <Trans>Write each sentence in Estonian.</Trans>
                </p>
              </Prose>
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
                    Each sentence has one wrong word: a person for the doing, or the wrong case. Tap
                    it, then type it right.
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
          title: t`A job advert`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Job adverts are full of these words. Read this one and answer the questions, as
                    in the reading part of the B1 exam.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="bookshop-advert"
                title={<Trans>A bookshop needs a seller</Trans>}
                sentences={AGENT_AD}
                questions={content.ad}
              />
              <Prose>
                <p>
                  <Trans>
                    Now apply for the job in about 80 words, then compare your letter with a model.
                  </Trans>
                </p>
              </Prose>
              <Writing
                id="apply-job"
                title={<Trans>Write: apply for the job</Trans>}
                prompt={
                  <p>
                    <Trans>
                      Write to the bookshop. Say which job you want, what work you have done and
                      which book you like best.
                    </Trans>
                  </p>
                }
                model={AGENT_MODEL}
                checks={content.checks}
              />
            </>
          ),
        },
        {
          id: "radio",
          title: t`A reading club`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Kalev talks to Anne, a teacher who runs a reading club in Pärnu.</Trans>
                </p>
              </Prose>
              <Listening
                id="anne-interview"
                title={<Trans>Listen: Kalev and Anne</Trans>}
                clip="c-anne"
                turns={AGENT_CONVERSATION.turns}
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
