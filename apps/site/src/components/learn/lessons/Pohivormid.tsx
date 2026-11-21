import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Fragment, type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  NOUN_FORMS,
  type NounForms,
  nounEntry,
  POHIVORMID_DIALOGUE,
  POHIVORMID_TYPED,
} from "../../../lib/learn/clips";
import { eachPairFirst } from "../../../lib/learn/quiz";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { Chips, type KeyItem, Keys, Panel } from "../Explore";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import { Aside, LessonView, Prose } from "../LessonView";
import type { Glossary } from "../lesson-context";
import { Match, type MatchPair } from "../Match";
import { Paradigm } from "../Paradigm";
import { Quiz } from "../Quiz";
import { PlayButton } from "../Sound";
import { Word } from "../Word";

const SLUG = "pohivormid";
type First = (typeof NOUN_FORMS)[number][0];
type TypedFirst = (typeof POHIVORMID_TYPED)[number]["forms"][0];
type LineId = keyof typeof POHIVORMID_DIALOGUE;

const wordSrc = (word: string) => clipUrl(SLUG, clipId(word));
const entrySrc = (forms: NounForms) => clipUrl(SLUG, clipId(nounEntry(forms)));
export const formsOf = (first: First) =>
  NOUN_FORMS.find((forms) => forms[0] === first) as NounForms;
const line = (id: LineId) => {
  const clip = POHIVORMID_DIALOGUE[id];
  return typeof clip === "string" ? clip : clip.text;
};

/** What each noun means, in the reader's language. */
const MEANS: Record<First | TypedFirst, MessageDescriptor> = {
  kool: msg`school`,
  pood: msg`shop`,
  raamat: msg`book`,
  maja: msg`house`,
  auto: msg`car`,
  linn: msg`town, city`,
  uks: msg`door`,
  mees: msg`man`,
  naine: msg`woman`,
  laps: msg`child`,
  kodu: msg({ message: "home", context: "kodu: the place you live" }),
  sõna: msg`word`,
  tuba: msg`room`,
  laud: msg`table`,
  turg: msg`market`,
  küsimus: msg`question`,
  töö: msg`work, job`,
  inimene: msg`person`,
  hobune: msg`horse`,
  vastus: msg`answer`,
  harjutus: msg`exercise`,
  maa: msg`land, country`,
  tee: msg`road; also tea`,
  puu: msg`tree`,
};

/** The ten nouns of the table, in its order. */
const TABLE = NOUN_FORMS.slice(0, 10);

/** The words the dictionary card can show. */
const ENTRY_WORDS: readonly First[] = ["pood", "mees", "raamat", "uks"];

/** The nouns whose second and third forms are the same word. */
const SAME: readonly First[] = ["kool", "linn", "maja", "kodu", "sõna"];

/** The nouns whose third form has back what the second dropped. */
const BACK: readonly First[] = ["pood", "tuba", "laud", "turg"];

/** The nouns whose ending gives the third form away. */
const TELLING: readonly First[] = ["naine", "küsimus", "töö"];

/** The match: words to pair with their second and third forms. pood is the card’s example above it. */
export const MATCHED: readonly First[] = ["raamat", "auto", "uks", "mees", "naine", "laps"];

function gloss(first: First | TypedFirst, form: string, forms: NounForms) {
  const [, two, three] = forms;
  const note =
    form === two && form === three
      ? msg`The second and third form of ${first}.`
      : form === two
        ? msg`The second form of ${first}.`
        : msg`The third form of ${first}.`;
  return { en: MEANS[first], note };
}

const ALL_FORMS: readonly NounForms[] = [
  ...NOUN_FORMS,
  ...POHIVORMID_TYPED.map(({ forms }) => forms),
];

const GLOSSARY: Glossary = {
  // Each later form first, so a word that is also a first form, as tuba is, keeps its own meaning.
  ...Object.fromEntries(
    ALL_FORMS.flatMap((forms) => {
      const first = forms[0] as First | TypedFirst;
      return forms
        .slice(1)
        .filter((form) => form !== first)
        .map((form) => [form, gloss(first, form, forms)]);
    }),
  ),
  ...Object.fromEntries(
    ALL_FORMS.map((forms) => [forms[0], { en: MEANS[forms[0] as First | TypedFirst] }]),
  ),
  põhivormid: { en: msg`the main forms: a word’s first, second and third form` },
  koolis: { en: msg`at school, in a school` },
};

/** The letters a form shares with the first form, then `|` before the rest, which Paradigm lights. */
function litFrom(first: string, form: string): string {
  let shared = 0;
  while (shared < first.length && first[shared] === form[shared]) shared++;
  return shared >= form.length ? form : `${form.slice(0, shared)}|${form.slice(shared)}`;
}

/** Ten nouns in their three forms, one column per form; a tap plays a form and says which it is. */
function FormTable({ notes }: { notes: Record<string, ReactNode> }) {
  const { t, i18n } = useLingui();
  const slotName = (slot: number, first: string) =>
    slot === 0 ? (
      <Trans>The first form: the word itself.</Trans>
    ) : slot === 1 ? (
      <Trans>
        The second form of <b lang="et">{first}</b>.
      </Trans>
    ) : (
      <Trans>
        The third form of <b lang="et">{first}</b>.
      </Trans>
    );
  return (
    <Panel>
      <Paradigm
        label={t`Ten nouns in their three forms`}
        columns={[t`First`, t`Second`, t`Third`]}
        rows={TABLE.map((forms) => ({
          id: forms[0],
          label: i18n._(MEANS[forms[0]]),
          cells: forms.map((form, slot) => ({
            form: slot === 0 ? form : litFrom(forms[0], form),
            src: wordSrc(form),
            note: (
              <>
                {slotName(slot, forms[0])} {notes[forms[0]]}
              </>
            ),
          })),
        }))}
        empty={{
          title: t`Tap a form`,
          tip: t`You’ll hear it and see how it changes from the first.`,
        }}
      />
    </Panel>
  );
}

/** One form in the dictionary card with a play button beside it, as Sõnaveeb shows each form. */
function EntryForm({ form }: { form: string }) {
  return (
    <span className="flex items-center gap-2">
      <span lang="et" className="text-lg font-medium">
        {form}
      </span>
      <PlayButton src={wordSrc(form)} label={<span lang="et">{form}</span>} className="size-8" />
    </span>
  );
}

/** A dictionary's word forms table, as Sõnaveeb lays it out: the three forms are its left column. */
function EntryCard() {
  const { t } = useLingui();
  const [first, setFirst] = useState<First>("pood");
  const forms = formsOf(first);
  const plural = lessonBySlug("mitmus")?.n;
  return (
    <Panel>
      <Chips
        label={t`Word to look up`}
        items={ENTRY_WORDS.map((word) => ({ label: word, value: word, lang: "et" }))}
        value={first}
        onPick={setFirst}
      />
      <div className="grid gap-3 rounded-lg bg-plate p-4 ring-1 ring-edge">
        <p lang="et" className="text-3xl font-semibold tracking-tight">
          {first}
        </p>
        <p lang="et" className="text-sm font-semibold text-ink-secondary">
          Sõnavormid
        </p>
        <div className="grid grid-cols-[1.25rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-3 gap-y-0.5">
          <span />
          <span className="text-xs text-ink-muted">
            <Trans context="grammatical number">Singular</Trans>
          </span>
          <span className="text-xs text-ink-muted">
            <Trans context="grammatical number">Plural: see lesson {plural}</Trans>
          </span>
          {forms.map((form, slot) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: a form can repeat in the column
            <Fragment key={slot}>
              <span aria-hidden="true" className="text-sm font-semibold text-(--form) tabular-nums">
                {slot + 1}
              </span>
              <EntryForm form={form} />
              <span aria-hidden="true" className="h-2.5 w-3/4 rounded-full bg-edge" />
            </Fragment>
          ))}
        </div>
      </div>
      <p className="text-md text-ink-secondary">
        <Trans>
          The left column, top to bottom: the first, second and third form. Pick another word and
          watch how they change.
        </Trans>
      </p>
    </Panel>
  );
}

type ThirdItem = FormItem & { pair: readonly [string, string] };

export function PohivormidLesson() {
  const { t, i18n } = useLingui();
  const stems = lessonBySlug("pood-poe")?.n;
  const genitive = lessonBySlug("omastav")?.n;
  const partitive = lessonBySlug("osastav")?.n;

  const notes: Record<string, ReactNode> = {
    kool: <Trans>Its second and third forms are the same.</Trans>,
    pood: (
      <Trans>
        The second drops the <b lang="et">d</b> and one <b lang="et">o</b>; the third has them back.
      </Trans>
    ),
    raamat: (
      <Trans>
        The third is the second with <b lang="et">-t</b>.
      </Trans>
    ),
    maja: <Trans>All three forms are the same.</Trans>,
    auto: (
      <Trans>
        The third adds <b lang="et">-t</b>.
      </Trans>
    ),
    linn: <Trans>Its second and third forms are the same.</Trans>,
    uks: (
      <Trans>
        The third drops the <b lang="et">k</b> and ends in <b lang="et">-st</b>.
      </Trans>
    ),
    mees: (
      <Trans>
        In the second, <b lang="et">ee</b> shortens and <b lang="et">s</b> becomes{" "}
        <b lang="et">h</b>; the third ends in <b lang="et">-st</b>.
      </Trans>
    ),
    naine: (
      <Trans>
        <b lang="et">-ne</b> becomes <b lang="et">-se</b>, then <b lang="et">-st</b>.
      </Trans>
    ),
    laps: (
      <Trans>
        The third drops the <b lang="et">p</b> and ends in <b lang="et">-st</b>.
      </Trans>
    ),
    tuba: (
      <Trans>
        The second loses the <b lang="et">b</b> and the <b lang="et">u</b> turns into{" "}
        <b lang="et">o</b>; the third is the first again.
      </Trans>
    ),
    laud: (
      <Trans>
        The second drops the <b lang="et">d</b>; the third has it back.
      </Trans>
    ),
    turg: (
      <Trans>
        The second drops the <b lang="et">g</b>; the third has it back.
      </Trans>
    ),
    küsimus: (
      <Trans>
        <b lang="et">-us</b> becomes <b lang="et">-use</b>, then <b lang="et">-ust</b>.
      </Trans>
    ),
    töö: (
      <Trans>
        One syllable ending in a long vowel: the second is the same, the third adds{" "}
        <b lang="et">-d</b>.
      </Trans>
    ),
    kodu: <Trans>All three forms are the same.</Trans>,
    sõna: <Trans>All three forms are the same.</Trans>,
  };

  const keysOf = (list: readonly First[]): KeyItem[] =>
    list.map((first) => {
      const forms = formsOf(first);
      return {
        label: first,
        sub: `${forms[1]}, ${forms[2]}`,
        src: entrySrc(forms),
        detail: {
          title: (
            <>
              <span lang="et">{nounEntry(forms)}</span>{" "}
              <span className="text-md font-normal text-ink-muted">{i18n._(MEANS[first])}</span>
            </>
          ),
          tip: notes[first],
        },
      };
    });

  const pairs: MatchPair[] = MATCHED.map((first) => {
    const forms = formsOf(first);
    return {
      id: first,
      left: first,
      right: `${forms[1]}, ${forms[2]}`,
      rightLang: "et",
      src: entrySrc(forms),
    };
  });

  const thirdItems = useMemo<ThirdItem[]>(() => {
    const RULES: Record<"ne" | "us" | "long", ReactNode> = {
      ne: (
        <Trans>
          <b lang="et">-ne</b> becomes <b lang="et">-st</b>.
        </Trans>
      ),
      us: (
        <Trans>
          <b lang="et">-us</b> takes <b lang="et">-t</b>.
        </Trans>
      ),
      long: (
        <Trans>
          One syllable ending in a long vowel takes <b lang="et">-d</b>.
        </Trans>
      ),
    };
    return POHIVORMID_TYPED.map(({ forms, pattern }) => ({
      base: forms[0],
      gloss: i18n._(MEANS[forms[0]]),
      cue: t`Third form`,
      answers: [forms[2]],
      src: entrySrc(forms),
      explain: RULES[pattern],
      said: nounEntry(forms),
      pair: [pattern, forms[0]] as const,
    }));
  }, [i18n, t]);

  const dialogue: DialogueTurn[] = [
    { who: "them", clip: "d-mari-1", line: line("d-mari-1") },
    {
      who: "you",
      clip: "d-sina-1",
      replies: [
        {
          line: "Pood, poe, poe.",
          why: (
            <Trans>
              <b lang="et">Poe</b> is the second form. The third has the <b lang="et">d</b> back:{" "}
              <b lang="et">poodi</b>.
            </Trans>
          ),
        },
        { line: line("d-sina-1"), right: true },
        {
          line: "Pood, poodi, poe.",
          why: (
            <Trans>
              The order is first, second, third. <b lang="et">Poe</b>, the one without the{" "}
              <b lang="et">d</b>, comes second.
            </Trans>
          ),
        },
      ],
    },
    { who: "them", clip: "d-mari-2", line: line("d-mari-2") },
    {
      who: "you",
      clip: "d-sina-2",
      replies: [
        { line: line("d-sina-2"), right: true },
        {
          line: "Laps, lapse, lapse.",
          why: (
            <Trans>
              The third form of <b lang="et">laps</b> ends in <b lang="et">-st</b>:{" "}
              <b lang="et">last</b>.
            </Trans>
          ),
        },
        {
          line: "Laps, last, lapse.",
          why: (
            <Trans>
              <b lang="et">Last</b> is the third form, so it comes after <b lang="et">lapse</b>.
            </Trans>
          ),
        },
      ],
    },
    { who: "them", clip: "d-mari-3", line: line("d-mari-3") },
    {
      who: "you",
      clip: "d-sina-3",
      replies: [
        {
          line: "Maja, majas, maja.",
          why: (
            <Trans>
              <b lang="et">Majas</b> means in the house: the second form with <b lang="et">-s</b>.
              The second form itself is <b lang="et">maja</b>.
            </Trans>
          ),
        },
        { line: line("d-sina-3"), right: true },
      ],
    },
    { who: "them", clip: "d-mari-4", line: line("d-mari-4") },
    {
      who: "you",
      clip: "d-sina-4",
      replies: [
        {
          line: "Vastus, vastus, vastust.",
          why: (
            <Trans>
              Like <b lang="et">küsimus</b>, <b lang="et">vastus</b> has a second form in{" "}
              <b lang="et">-use</b>: <b lang="et">vastuse</b>.
            </Trans>
          ),
        },
        {
          line: "Vastus, vastust, vastuse.",
          why: (
            <Trans>
              The order is first, second, third, so <b lang="et">vastuse</b> comes before{" "}
              <b lang="et">vastust</b>.
            </Trans>
          ),
        },
        { line: line("d-sina-4"), right: true },
      ],
    },
  ];

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Why a dictionary gives every Estonian noun in three forms, where to find them, and which
          endings tell you the third.
        </Trans>
      }
      facts={[
        <Trans key="m">12 minutes</Trans>,
        <Trans key="q">2 quizzes and a conversation</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "põhivormid",
        "sõna",
        "kool",
        "pood",
        "raamat",
        "maja",
        "auto",
        "linn",
        "uks",
        "mees",
        "naine",
        "laps",
        "tuba",
        "küsimus",
        "vastus",
        "inimene",
        "töö",
      ]}
      recap={[
        <Trans key="1">
          A dictionary gives a noun in three forms, always in the same order:{" "}
          <b lang="et">kool, kooli, kooli</b>.
        </Trans>,
        <Trans key="2">
          The second form is the one{" "}
          <b lang="et" className="whitespace-nowrap">
            -s
          </b>{" "}
          and{" "}
          <b lang="et" className="whitespace-nowrap">
            -l
          </b>{" "}
          go on: <b lang="et">kooli</b> gives <b lang="et">koolis</b>.
        </Trans>,
        <Trans key="3">
          On <span lang="et">Sõnaveeb</span>, the three forms are the left column under{" "}
          <b lang="et">Sõnavormid</b>.
        </Trans>,
        <Trans key="4">
          Most words in{" "}
          <b lang="et" className="whitespace-nowrap">
            -ne
          </b>{" "}
          or{" "}
          <b lang="et" className="whitespace-nowrap">
            -us
          </b>{" "}
          end their third form in{" "}
          <b lang="et" className="whitespace-nowrap">
            -st
          </b>
          , and a one-syllable word ending in a long vowel adds{" "}
          <b lang="et" className="whitespace-nowrap">
            -d
          </b>
          : <b lang="et">naist, küsimust, tööd</b>.
        </Trans>,
        <Trans key="5">
          Other words don’t show their third form, so learn all three together:{" "}
          <b lang="et">pood, poe, poodi</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "three",
          title: t`A noun has three forms`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Look up <Word w="kool" />, school, and a dictionary gives you three words:{" "}
                    <b lang="et">kool, kooli, kooli</b>. Every noun is listed this way, in the same
                    order. Most of its other forms are built on one of the three. Estonian calls
                    them <Word w="põhivormid" />, the main forms. This course calls them the first,
                    second and third form.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The first is the word on its own. The second is what lesson {stems} called the
                    stem: put{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -s
                    </b>{" "}
                    on it and you have <Word w="koolis" />. Lesson {genitive} shows what the second
                    form means by itself, and lesson {partitive} what the third is for.
                  </Trans>
                </p>
              </Prose>
              <FormTable notes={notes} />
            </>
          ),
        },
        {
          id: "dictionary",
          title: t`Finding the forms in a dictionary`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <a
                      href="https://sonaveeb.ee"
                      lang="et"
                      className="font-medium text-ink underline decoration-(--form) decoration-2 underline-offset-4 hoverable:hover:text-(--form)"
                    >
                      Sõnaveeb
                    </a>
                    , the free dictionary of the Institute of the Estonian Language, lists them
                    under <b lang="et">Sõnavormid</b>, word forms. Search for a word and scroll to
                    that table: its left column holds the three forms, top to bottom. The right
                    column is the plural.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    A printed dictionary puts them on one line instead:{" "}
                    <b lang="et">pood poe poodi</b>.
                  </Trans>
                </p>
              </Prose>
              <EntryCard />
              <Prose>
                <p>
                  <Trans>
                    Match each word with its second and third forms. A wrong pair counts against
                    you, so look for the letters that change.
                  </Trans>
                </p>
              </Prose>
              <Match
                id="match-forms"
                title={<Trans>Which forms go together?</Trans>}
                pairs={pairs}
                columns={[
                  <Trans key="f">First form</Trans>,
                  <Trans key="o">Second and third</Trans>,
                ]}
              />
            </>
          ),
        },
        {
          id: "same",
          title: t`When the third form is the same as the second`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In <b lang="et">kool, kooli, kooli</b> the second and third forms are the same
                    word. Many short words work this way, such as <Word w="linn" />, town. In some
                    words ending in a vowel all three match: <Word w="maja" />, house, is{" "}
                    <b lang="et">maja, maja, maja</b>.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Keys
                  label={t`Words whose second and third forms match`}
                  items={keysOf(SAME)}
                  columns={5}
                  phoneColumns={2}
                  empty={{
                    title: t`Tap a word`,
                    tip: t`You’ll hear its three forms.`,
                  }}
                />
              </Panel>
              <Aside>
                <Trans>
                  A final vowel doesn’t promise matching forms, though. <Word w="auto" />, car, ends
                  in a vowel like <Word w="maja" />, but its third form is <Word w="autot" />. And{" "}
                  <Word w="raamat" />, book, goes <b lang="et">raamatu, raamatut</b>. The dictionary
                  settles it.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "back",
          title: t`When the third form takes letters back`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Lesson {stems} showed letters dropping or changing before an ending:{" "}
                    <Word w="pood" /> becomes <Word w="poe" />. That change is the second form. In
                    these words the third form has the first form’s letters back: <Word w="poodi" />
                    .
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Keys
                  label={t`Words whose third form takes letters back`}
                  items={keysOf(BACK)}
                  columns={4}
                  phoneColumns={2}
                  empty={{
                    title: t`Tap a word`,
                    tip: t`You’ll hear its three forms.`,
                  }}
                />
              </Panel>
              <Prose>
                <p>
                  <Trans>
                    Learn the vowel at the end of the third form along with the word:{" "}
                    <b lang="et">poodi, lauda, turgu</b>.
                  </Trans>
                </p>
              </Prose>
            </>
          ),
        },
        {
          id: "endings",
          title: t`Endings that tell you the third form`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Some words give their third form away. Most words ending in{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -ne
                    </b>{" "}
                    have a second form in{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -se
                    </b>{" "}
                    and a third in{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -st
                    </b>
                    : <Word w="naine" />, <Word w="naise" />, <Word w="naist" />. Most words ending
                    in{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -us
                    </b>{" "}
                    do the same: <Word w="küsimus" />, question, goes{" "}
                    <b lang="et">küsimuse, küsimust</b>.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    A one-syllable word that ends in a long vowel, such as <Word w="töö" />, work,
                    keeps its second form the same and adds{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -d
                    </b>{" "}
                    for the third: <b lang="et">töö, töö, tööd</b>.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Keys
                  label={t`Words whose ending tells the third form`}
                  items={keysOf(TELLING)}
                  columns={3}
                  phoneColumns={2}
                  empty={{
                    title: t`Tap a word`,
                    tip: t`You’ll hear its three forms.`,
                  }}
                />
              </Panel>
              <Aside>
                <Trans>
                  Some short words ending in{" "}
                  <b lang="et" className="whitespace-nowrap">
                    -s
                  </b>{" "}
                  also end their third form in{" "}
                  <b lang="et" className="whitespace-nowrap">
                    -st
                  </b>
                  , but each changes in its own way: <b lang="et">uks, ukse, ust</b>;{" "}
                  <b lang="et">laps, lapse, last</b>; <b lang="et">mees, mehe, meest</b>. Learn all
                  three forms of those.
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>Each round shows a new word. Type its third form.</Trans>
                </p>
              </Prose>
              <Quiz
                id="third-form"
                title={<Trans>Type the third form</Trans>}
                items={thirdItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six. You typed the third form right every time.</Trans>
                  ) : share >= 0.6 ? (
                    <Trans>Nearly. Hear the ones you missed with all three forms.</Trans>
                  ) : (
                    <Trans>Read the three endings above once more, then try again.</Trans>
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
          id: "class",
          title: t`Practice: the forms in class`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    To ask for a word’s forms, Estonian says{" "}
                    <b lang="et">Mis on sõna … põhivormid?</b>, with the word in the gap.{" "}
                    <Word w="Sõna" /> means word. Answer with all three, in order.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="in-class"
                title={<Trans>Talk: in class</Trans>}
                part={
                  <Trans>
                    You’re in an Estonian class. Mari, the teacher, asks for the forms of four
                    words; pick your answer.
                  </Trans>
                }
                them={t`Mari`}
                turns={dialogue}
              />
            </>
          ),
        },
      ]}
    />
  );
}
