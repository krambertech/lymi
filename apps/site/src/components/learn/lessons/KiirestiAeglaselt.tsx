import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  ADV_ANSWERS,
  ADV_CONVERSATION,
  ADV_FIX_ALSO,
  ADV_FIXES,
  ADV_FORM_ALSO,
  ADV_FORMS,
  ADV_GROUPS,
  ADV_MATCH,
  ADV_NOTE,
  ADV_TELL,
  ADV_TRANSLATE,
  clipId,
  clipUrl,
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

const SLUG = "kiiresti-aeglaselt";
const src = (text: string) => clipUrl(SLUG, clipId(text));

type Group = keyof typeof ADV_GROUPS;

const ADV_MEANS: Record<string, MessageDescriptor> = {
  aeglaselt: msg`slowly`,
  vaikselt: msg`quietly`,
  selgelt: msg`clearly`,
  lihtsalt: msg`in a simple way`,
  tavaliselt: msg`usually`,
  rahulikult: msg`calmly`,
  täpselt: msg`exactly, on time`,
  kiiresti: msg`quickly, fast`,
  kindlasti: msg`certainly, definitely`,
  ilusasti: msg`neatly, prettily`,
  kõvasti: msg`hard, loudly`,
  hästi: msg`well`,
  halvasti: msg`badly`,
};

const ADJ_MEANS: Record<string, MessageDescriptor> = {
  aeglane: msg`slow`,
  vaikne: msg`quiet`,
  selge: msg`clear`,
  lihtne: msg`simple`,
  tavaline: msg`usual`,
  rahulik: msg`calm`,
  täpne: msg`exact`,
  kiire: msg`fast`,
  kindel: msg`sure`,
  ilus: msg`pretty, lovely`,
  kõva: msg`hard, loud`,
  hea: msg`good`,
  halb: msg`bad`,
};

const GLOSSARY: Glossary = {
  aeglaselt: { en: msg`slowly`, note: msg`Palun räägi aeglaselt.` },
  vaikselt: { en: msg`quietly`, note: msg`Laps magab vaikselt.` },
  selgelt: { en: msg`clearly`, note: msg`Õpetaja räägib selgelt.` },
  lihtsalt: { en: msg`in a simple way`, note: msg`Ta selgitab seda lihtsalt.` },
  tavaliselt: { en: msg`usually`, note: msg`Tavaliselt joon ma hommikul teed.` },
  rahulikult: { en: msg`calmly`, note: msg`Kõik läks rahulikult.` },
  täpselt: { en: msg`exactly, on time`, note: msg`Rong saabus täpselt kell kolm.` },
  kiiresti: { en: msg`quickly, fast`, note: msg`Rong sõidab kiiresti.` },
  kindlasti: { en: msg`certainly, definitely`, note: msg`Ma tulen kindlasti.` },
  ilusasti: { en: msg`neatly, prettily`, note: msg`Ta kirjutab ilusasti.` },
  kõvasti: { en: msg`hard, loudly`, note: msg`Väljas sajab kõvasti vihma.` },
  hästi: { en: msg`well`, note: msg`Ta räägib eesti keelt hästi.` },
  halvasti: { en: msg`badly`, note: msg`Ma magasin öösel halvasti.` },
};

const lit = (adv: string) => {
  if (adv.endsWith("sti")) return `${adv.slice(0, -3)}|sti`;
  if (adv.endsWith("lt")) return `${adv.slice(0, -2)}|lt`;
  return adv;
};

function AdverbTable() {
  const { t, i18n } = useLingui();
  const [group, setGroup] = useState<Group>("lt");
  const rows: ParadigmRow[] = ADV_GROUPS[group].map((row) => ({
    id: row.adv,
    label: i18n._(ADV_MEANS[row.adv] as MessageDescriptor),
    cells: [
      { form: row.adj, src: src(row.adj) },
      { form: lit(row.adv), src: src(row.adv), note: <b lang="et">{row.said}</b> },
    ],
  }));
  return (
    <Panel className="gap-5">
      <Chips
        label={t`Ending`}
        items={[
          { label: "-lt", value: "lt" as Group, lang: "et" },
          { label: "-sti", value: "sti" as Group, lang: "et" },
        ]}
        value={group}
        onPick={setGroup}
      />
      <Paradigm
        key={group}
        label={t`Adjectives and adverbs`}
        columns={[t`Adjective`, t`Adverb`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{
          title: t`Tap a form`,
          tip:
            group === "lt" ? (
              <Trans>
                Many adjectives, above all those ending in <b lang="et">-ne</b>, usually add{" "}
                <b lang="et">-lt</b> to the genitive stem:{" "}
                <b lang="et">aeglane → aeglase → aeglaselt</b>.
              </Trans>
            ) : (
              <Trans>
                Many other adjectives take <b lang="et">-sti</b> on the genitive stem, and{" "}
                <b lang="et">hea</b> becomes <b lang="et">hästi</b>.
              </Trans>
            ),
        }}
      />
    </Panel>
  );
}

const FORM_WHY: Record<(typeof ADV_FORMS)[number]["id"], ReactNode> = {
  slow: (
    <Trans>
      Genitive <b lang="et">aeglase</b> plus <b lang="et">-lt</b> gives <b lang="et">aeglaselt</b>.
    </Trans>
  ),
  quiet: (
    <Trans>
      Genitive <b lang="et">vaikse</b> plus <b lang="et">-lt</b> gives <b lang="et">vaikselt</b>.
    </Trans>
  ),
  clear: (
    <Trans>
      Genitive <b lang="et">selge</b> plus <b lang="et">-lt</b> gives <b lang="et">selgelt</b>.
    </Trans>
  ),
  simple: (
    <Trans>
      Genitive <b lang="et">lihtsa</b> plus <b lang="et">-lt</b> gives <b lang="et">lihtsalt</b>.
    </Trans>
  ),
  fast: (
    <Trans>
      <b lang="et">Kiire</b> takes <b lang="et">-sti</b>: <b lang="et">kiiresti</b>.
    </Trans>
  ),
  good: (
    <Trans>
      The adverb from <b lang="et">hea</b> is <b lang="et">hästi</b>.
    </Trans>
  ),
  bad: (
    <Trans>
      Genitive <b lang="et">halva</b> plus <b lang="et">-sti</b> gives <b lang="et">halvasti</b>.
    </Trans>
  ),
  sure: (
    <Trans>
      Genitive <b lang="et">kindla</b> plus <b lang="et">-sti</b> gives <b lang="et">kindlasti</b>.
    </Trans>
  ),
};

const TELL_OPTIONS = {
  adj: msg`Describes a thing`,
  adv: msg`Says how it happens`,
} as const;

const TELL_MEANS: Record<(typeof ADV_TELL)[number]["id"], MessageDescriptor> = {
  "fast-adj": msg`This is a fast train.`,
  "fast-adv": msg`The train goes fast.`,
  "quiet-adj": msg`This is a quiet room.`,
  "quiet-adv": msg`The child sleeps quietly.`,
  "good-adj": msg`This is a good book.`,
  "good-adv": msg`He or she speaks Estonian well.`,
  "slow-adj": msg`This is a slow bus.`,
  "slow-adv": msg`The bus goes slowly.`,
};

const TRANSLATE_PROMPTS: Record<(typeof ADV_TRANSLATE)[number], MessageDescriptor> = {
  "Ta räägib eesti keelt hästi.": msg`He or she speaks Estonian well.`,
  "Palun räägi aeglaselt.": msg`Please speak slowly.`,
  "Rong sõidab kiiresti.": msg`The train goes fast.`,
  "Laps magab vaikselt.": msg`The child sleeps quietly.`,
  "Ma tulen kindlasti.": msg`I will definitely come.`,
  "Ta vastas selgelt.": msg`He or she answered clearly.`,
};

const FIX_PROMPTS: Record<(typeof ADV_FIXES)[number]["id"], MessageDescriptor> = {
  good: msg`He or she speaks Estonian well.`,
  slow: msg`Please speak slowly.`,
  fast: msg`The bus goes fast.`,
  clear: msg`He or she explained it clearly.`,
  bad: msg`I slept badly at night.`,
  quiet: msg`We came in quietly.`,
};

const FIX_WHY: Record<(typeof ADV_FIXES)[number]["id"], ReactNode> = {
  good: (
    <Trans>
      To say how someone speaks, use <b lang="et">hästi</b>, not the adjective <b lang="et">hea</b>.
    </Trans>
  ),
  slow: (
    <Trans>
      How to speak takes the adverb <b lang="et">aeglaselt</b>, not <b lang="et">aeglane</b>.
    </Trans>
  ),
  fast: (
    <Trans>
      How the bus goes takes <b lang="et">kiiresti</b>, not <b lang="et">kiire</b>.
    </Trans>
  ),
  clear: (
    <Trans>
      How it was explained takes <b lang="et">selgelt</b>, not <b lang="et">selge</b>.
    </Trans>
  ),
  bad: (
    <Trans>
      How you slept takes <b lang="et">halvasti</b>, not <b lang="et">halb</b>.
    </Trans>
  ),
  quiet: (
    <Trans>
      How you came in takes <b lang="et">vaikselt</b>, not <b lang="et">vaikne</b>.
    </Trans>
  ),
};

const gapSaid = (item: { before: string; answer: string; after: string }) =>
  `${item.before} ${item.answer}${/^[.,!?]/.test(item.after) ? "" : " "}${item.after}`;

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const pairs: MatchPair[] = ADV_MATCH.map((word) => ({
      id: word,
      left: word,
      right: i18n._(ADV_MEANS[word] as MessageDescriptor),
      src: src(word),
    }));

    const forms: (FormItem & { pair: readonly [string, string] })[] = ADV_FORMS.map((item) => {
      const said = gapSaid(item);
      return {
        base: item.base,
        gloss: i18n._(ADJ_MEANS[item.base] as MessageDescriptor),
        cue: `${item.before} ___${/^[.,!?]/.test(item.after) ? "" : " "}${item.after}`,
        cueLang: "et",
        answers: [item.answer, ...(ADV_FORM_ALSO[item.id] ?? [])],
        src: src(said),
        said: <span lang="et">{said}</span>,
        explain: FORM_WHY[item.id],
        pair: [item.id, item.id] as const,
      };
    });

    const tellOptions = (["adj", "adv"] as const).map((id) => ({
      id,
      label: (
        <span lang={i18n.locale} className="text-lg font-medium tracking-normal">
          {i18n._(TELL_OPTIONS[id])}
        </span>
      ),
    }));
    const tell: (ChoiceItem & { said: string; pair: readonly [string, string] })[] = ADV_TELL.map(
      (item) => ({
        said: item.said,
        src: src(item.said),
        answer: item.kind,
        options: tellOptions,
        pair: [item.id.split("-")[0] as string, item.id] as const,
        explain: (
          <Trans>
            <b lang="et">{item.said}</b> {i18n._(TELL_MEANS[item.id])}
          </Trans>
        ),
      }),
    );

    const translations: (SentenceItem & { pair: readonly [string, string] })[] = ADV_TRANSLATE.map(
      (said) => ({
        kind: "translate",
        id: clipId(said),
        prompt: i18n._(TRANSLATE_PROMPTS[said]),
        src: src(said),
        answers: ADV_ANSWERS[said],
        pair: [clipId(said), clipId(said)] as const,
      }),
    );

    const fixes: FixItem[] = ADV_FIXES.map((item) => ({
      kind: "fix",
      id: `fix-${item.id}`,
      wrong: item.wrong,
      prompt: i18n._(FIX_PROMPTS[item.id]),
      answers: [item.right, ...(ADV_FIX_ALSO[item.id] ?? [])],
      src: src(item.right),
      explain: FIX_WHY[item.id],
    }));

    const note: PassageQuestion[] = [
      {
        id: "time",
        kind: "short",
        ask: t`What time does tomorrow’s lesson start? Write two words from the message.`,
        answers: ["kell kümme", "kümme", "kell 10", "10"],
        line: 2,
      },
      {
        id: "plan",
        ask: t`What will the class do tomorrow instead of reading long texts?`,
        options: [
          { id: "talk", label: t`Only talk` },
          { id: "test", label: t`Take a written test` },
          { id: "text", label: t`Read one long text together` },
        ],
        answer: "talk",
        line: 3,
      },
      {
        id: "ask-again",
        kind: "truefalse",
        ask: t`The teacher tells students to ask again if they do not understand right away.`,
        answer: true,
        line: 5,
      },
      {
        id: "pace",
        ask: t`Why does Kadri advise speaking slowly?`,
        options: [
          { id: "short", label: t`The lesson finishes early.` },
          { id: "notes", label: t`Students have to copy every sentence into a notebook.` },
          { id: "clear", label: t`Everyone can hear each word better.` },
        ],
        answer: "clear",
        line: 6,
      },
      {
        id: "spring",
        kind: "truefalse",
        ask: t`Kadri thinks the class studied poorly this spring.`,
        answer: false,
        line: 7,
      },
      {
        id: "after",
        ask: t`What will happen right after the lesson ends?`,
        options: [
          { id: "walk", label: t`They will go outside.` },
          { id: "homework", label: t`They will get new homework.` },
          { id: "tea", label: t`They will drink tea and eat cake together.` },
        ],
        answer: "tea",
        line: 8,
      },
    ];

    const drive: PassageQuestion[] = [
      {
        id: "mood",
        kind: "truefalse",
        ask: t`Mart felt completely calm from the very start of the lesson.`,
        answer: false,
        line: 3,
      },
      {
        id: "teacher",
        ask: t`How did Mart’s driving teacher speak?`,
        options: [
          { id: "loud", label: t`Loudly, rushing` },
          { id: "calm", label: t`Calmly, softly, clearly` },
          { id: "fast", label: t`Fast, never explaining anything twice` },
        ],
        answer: "calm",
        line: 5,
      },
      {
        id: "first-place",
        ask: t`Where did Mart drive first?`,
        options: [
          { id: "empty", label: t`Slowly across an empty training lot` },
          { id: "city", label: t`Downtown` },
          { id: "highway", label: t`Along a busy avenue` },
        ],
        answer: "empty",
        line: 8,
      },
      {
        id: "main-road",
        kind: "truefalse",
        ask: t`Mart drove on the big main street during this first lesson.`,
        answer: false,
        line: 10,
      },
      {
        id: "parking",
        kind: "short",
        ask: t`How did parking go on Mart’s first try? Write one word as he says it.`,
        answers: ["halvasti"],
        line: 12,
      },
      {
        id: "third-try",
        kind: "truefalse",
        ask: t`By the third try, the car stood right between the lines.`,
        answer: true,
        line: 13,
      },
      {
        id: "next-day",
        kind: "short",
        ask: t`On which day is Mart’s next driving lesson? Write the word as he says it.`,
        answers: ["neljapäeval"],
        line: 15,
      },
      {
        id: "next-goal",
        ask: t`Where does Mart want to drive next time?`,
        options: [
          { id: "center", label: t`Into town` },
          { id: "park", label: t`Beside a quiet suburban park` },
          { id: "highway", label: t`All the way out toward Tartu on the motorway` },
        ],
        answer: "center",
        line: 16,
      },
    ];

    return { pairs, forms, tell, translations, fixes, note, drive };
  }, [t, i18n]);
}

export function KiirestiAeglaseltLesson() {
  const { t } = useLingui();
  const content = useContent();
  const genitive = lessonBySlug("omastav")?.n;
  const adjectives = lessonBySlug("omadussonad")?.n;
  const names = { third: t`Kati`, fourth: t`Mart` };

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Turn an adjective into a word that says how something happens: many adjectives, above all
          those ending in <b lang="et">-ne</b>, usually add <b lang="et">-lt</b> to the genitive (
          <b lang="et">aeglaselt</b>), many others take <b lang="et">-sti</b> (
          <b lang="et">kiiresti</b>), and <b lang="et">hea</b> becomes <b lang="et">hästi</b>.
        </Trans>
      }
      facts={[
        <Trans key="m">20 minutes</Trans>,
        <Trans key="q">7 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "aeglaselt",
        "vaikselt",
        "selgelt",
        "lihtsalt",
        "tavaliselt",
        "rahulikult",
        "täpselt",
        "kiiresti",
        "kindlasti",
        "ilusasti",
        "kõvasti",
        "hästi",
        "halvasti",
      ]}
      recap={[
        <Trans key="1">
          Many adjectives, above all those ending in <b lang="et">-ne</b>, usually build their
          adverb by adding <b lang="et">-lt</b> to the genitive stem:{" "}
          <b lang="et">aeglane → aeglase → aeglaselt</b>,{" "}
          <b lang="et">vaikne → vaikse → vaikselt</b>.
        </Trans>,
        <Trans key="2">
          Many other adjectives take <b lang="et">-sti</b> on the genitive stem:{" "}
          <b lang="et">kiiresti</b>, <b lang="et">kindlasti</b>, <b lang="et">ilusasti</b>,{" "}
          <b lang="et">kõvasti</b>.
        </Trans>,
        <Trans key="3">
          Two everyday adverbs to know by heart: <b lang="et">hea → hästi</b> (well) and{" "}
          <b lang="et">halb → halvasti</b> (badly).
        </Trans>,
        <Trans key="4">
          An adjective describes a noun (<b lang="et">kiire rong</b>); an adverb says how an action
          happens (<b lang="et">rong sõidab kiiresti</b>).
        </Trans>,
      ]}
      sections={[
        {
          id: "forms",
          title: t`Building adverbs from adjectives`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In lesson {adjectives} you used adjectives with nouns:{" "}
                    <b lang="et">aeglane buss</b>, a slow bus. To say how an action happens,
                    Estonian often adds <b lang="et">-lt</b> to the genitive stem from lesson{" "}
                    {genitive}, above all with adjectives ending in <b lang="et">-ne</b>:{" "}
                    <Word w="aeglaselt" />, <Word w="vaikselt" />, <Word w="selgelt" />.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Many other adjectives take <b lang="et">-sti</b> instead: <Word w="kiiresti" />,{" "}
                    <Word w="kindlasti" />, <Word w="ilusasti" />. And <b lang="et">hea</b> becomes{" "}
                    <Word w="hästi" />, while <b lang="et">halb</b> becomes <Word w="halvasti" />.
                    Switch groups and tap a form to hear it.
                  </Trans>
                </p>
              </Prose>
              <AdverbTable />
              <Aside>
                <Trans>
                  Some adjectives take either ending: <b lang="et">kiiresti</b> or{" "}
                  <b lang="et">kiirelt</b>, <b lang="et">ilusasti</b> or <b lang="et">ilusalt</b>.
                  The exercises ask for the form in the table.
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>Match each adverb with its meaning.</Trans>
                </p>
              </Prose>
              <Match
                id="adverb-meaning"
                title={<Trans>What does each adverb mean?</Trans>}
                pairs={content.pairs}
                columns={[<Trans key="a">Adverb</Trans>, <Trans key="b">Meaning</Trans>]}
              />
            </>
          ),
        },
        {
          id: "make",
          title: t`Make the adverb`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Type the adverb form of each adjective to complete the sentence, then hear the
                    whole line.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="make-adverb"
                title={<Trans>Type the adverb</Trans>}
                items={content.forms}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight adverbs right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the stem and ending in the ones you missed.</Trans>
                  ) : (
                    <Trans>Go through the table once more, then try again.</Trans>
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
          id: "tell",
          title: t`Adjective or adverb`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Compare <b lang="et">See on kiire rong</b> (describing the train) with{" "}
                    <b lang="et">Rong sõidab kiiresti</b> (saying how it moves). Listen to each
                    sentence and pick which one you hear.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="adj-or-adv"
                title={<Trans>Thing or how?</Trans>}
                items={content.tell}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight: you told adjectives and adverbs apart by ear.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Listen for the ending at the end of the word, then try again.</Trans>
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
          id: "write",
          title: t`Write it in Estonian`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Write each sentence in Estonian using an adverb.</Trans>
                </p>
              </Prose>
              <Quiz
                id="write-adverb"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.translations}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six sentences right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the adverb ending in the ones you missed.</Trans>
                  ) : (
                    <Trans>Read What to remember below, then try again.</Trans>
                  )
                }
                recall={sentenceRecall}
                order={eachPairFirst}
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
                    Each sentence uses an adjective where Estonian needs an adverb. Tap the wrong
                    word, then type the right form.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-adverb"
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
          id: "note",
          title: t`A message from the teacher`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Teacher Kadri sends a message before the last Estonian lesson of the spring.
                    Read it and answer.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="teacher-note"
                title={<Trans>What does Kadri write?</Trans>}
                by={t`Kadri writes`}
                sentences={ADV_NOTE}
                questions={content.note}
              />
            </>
          ),
        },
        {
          id: "drive",
          title: t`Mart’s first driving lesson`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kati asks Mart how his first driving lesson went. Listen and answer. You can
                    play the conversation twice.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="driving-lesson"
                title={<Trans>Listen: Kati and Mart</Trans>}
                clip="c-soit"
                turns={ADV_CONVERSATION.turns}
                names={names}
                questions={content.drive}
                plays={2}
              />
            </>
          ),
        },
      ]}
    />
  );
}
