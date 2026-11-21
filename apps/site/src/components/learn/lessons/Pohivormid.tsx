import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Fragment, type ReactNode, useMemo, useState } from "react";
import { LESSONS } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  firstTwo,
  NOUN_FORMS,
  type NounForms,
  nounEntry,
  POHIVORMID_DIALOGUE,
  POHIVORMID_TYPED,
} from "../../../lib/learn/clips";
import { playSound, usePlaying } from "../../../lib/learn/player";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { Chips, type KeyItem, Keys, Panel } from "../Explore";
import { Aside, LessonView, Prose } from "../LessonView";
import type { Glossary } from "../lesson-context";
import { type ChoiceItem, ChoiceRound, Quiz, type TypedItem, TypedRound } from "../Quiz";
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

/** “Which two come next?”: nouns whose second and third forms differ, so each offer is distinct. */
export const NEXT: readonly First[] = ["pood", "raamat", "uks", "mees", "naine", "laps"];

export type Offer = "right" | "swapped" | "twice" | "first";

/** Two forms to follow the first: the right pair, or a slip a learner makes. */
export function offer(forms: NounForms, kind: Offer): string {
  const [one, two, three] = forms;
  if (kind === "right") return `${two}, ${three}`;
  if (kind === "swapped") return `${three}, ${two}`;
  if (kind === "twice") return `${two}, ${two}`;
  return `${one}, ${three}`;
}

/** The order of the first round's offers, fixed so the server and the browser agree. */
export const FIRST_OFFERS: readonly Offer[] = ["twice", "right", "first", "swapped"];

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

/** One form in the table: tap to hear it. */
function FormCell({ form, active, onPick }: { form: string; active: boolean; onPick: () => void }) {
  const src = wordSrc(form);
  const playing = usePlaying(src);
  return (
    <button
      type="button"
      lang="et"
      aria-pressed={active}
      onClick={() => {
        onPick();
        void playSound(src);
      }}
      className={clsx(
        "w-full cursor-pointer rounded-md px-2 py-2 text-start text-lg font-semibold tracking-tight transition-colors duration-150 hoverable:hover:bg-plate-hover max-sm:px-1.5 max-sm:text-base",
        (active || playing) && "text-(--form)",
      )}
    >
      {form}
    </button>
  );
}

/** Ten nouns in their three forms, one column per form; a tap plays a form and says which it is. */
function FormTable({ notes }: { notes: Record<string, ReactNode> }) {
  const { t, i18n } = useLingui();
  const [picked, setPicked] = useState<{ row: number; slot: number } | null>(null);
  const slots = [t`First`, t`Second`, t`Third`];
  const forms = picked ? TABLE[picked.row] : undefined;
  const slotName = (slot: number, first: string) =>
    slot === 0
      ? t`The first form: the word itself.`
      : slot === 1
        ? t`The second form of ${first}.`
        : t`The third form of ${first}.`;
  return (
    <Panel>
      <div className="overflow-hidden rounded-lg bg-plate ring-1 ring-edge">
        <table className="w-full table-fixed border-collapse">
          <caption className="sr-only">{t`Ten nouns in their three forms`}</caption>
          <thead>
            <tr>
              {slots.map((slot) => (
                <th
                  key={slot}
                  scope="col"
                  className="px-3.5 pt-3 pb-1 text-start text-sm font-medium text-ink-muted max-sm:px-3"
                >
                  {slot}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TABLE.map((row, r) => (
              <tr key={row[0]} className="border-t border-edge">
                {row.map((form, slot) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: a form can repeat in its row
                  <td key={slot} className="px-1.5 py-1 align-top">
                    <FormCell
                      form={form}
                      active={picked?.row === r && picked.slot === slot}
                      onPick={() => setPicked({ row: r, slot })}
                    />
                    {slot === 0 && (
                      <span className="block px-2 pb-1.5 text-sm text-ink-muted max-sm:px-1.5">
                        {i18n._(MEANS[row[0]])}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div aria-live={picked ? "polite" : undefined} className="min-h-14">
        {forms && picked ? (
          <p key={`${picked.row}-${picked.slot}`} className="learn-swap text-md text-ink-secondary">
            <b lang="et" className="text-xl font-semibold text-ink">
              {nounEntry(forms)}
            </b>
            <br />
            {slotName(picked.slot, forms[0])} {notes[forms[0]]}
          </p>
        ) : (
          <p className="text-md text-ink-secondary">
            <Trans>Tap a form to hear it and see how it relates to the first.</Trans>
          </p>
        )}
      </div>
    </Panel>
  );
}

/** One form in the dictionary card, to hear. */
function EntryForm({ form }: { form: string }) {
  const src = wordSrc(form);
  const playing = usePlaying(src);
  return (
    <button
      type="button"
      lang="et"
      onClick={() => void playSound(src)}
      className={clsx(
        "cursor-pointer justify-self-start rounded-md px-1.5 py-1 text-lg font-medium transition-colors duration-150 hoverable:hover:bg-plate-hover",
        playing && "text-(--form)",
      )}
    >
      {form}
    </button>
  );
}

/** A dictionary's word forms table, as Sõnaveeb lays it out: the three forms are its left column. */
function EntryCard() {
  const { t } = useLingui();
  const [first, setFirst] = useState<First>("pood");
  const forms = formsOf(first);
  const plural = LESSONS.find((lesson) => lesson.et === "Kassid")?.n;
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

/** A noun's three forms and its meaning, under an answered round. */
function explainEntry(forms: NounForms, first: First, i18n: I18n) {
  return (
    <>
      <span lang="et" className="font-medium text-ink">
        {nounEntry(forms)}
      </span>{" "}
      {i18n._(MEANS[first])}
    </>
  );
}

const offersOf = (forms: NounForms, kinds: readonly Offer[]) =>
  kinds.map((kind) => ({ id: kind, label: <span lang="et">{offer(forms, kind)}</span> }));

type NextItem = ChoiceItem & { first: First };
type ThirdItem = TypedItem & { forms: NounForms; pair: readonly [string, string] };

export function PohivormidLesson() {
  const { t, i18n } = useLingui();
  const at = (et: string) => LESSONS.find((lesson) => lesson.et === et)?.n;
  const stems = at("Pood, poe");
  const genitive = at("Minu raamat");
  const partitive = at("Kaks kassi");

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

  const nextItems = useMemo<NextItem[]>(
    () =>
      NEXT.map((first) => {
        const forms = formsOf(first);
        return {
          first,
          src: wordSrc(first),
          answer: "right",
          options: offersOf(forms, FIRST_OFFERS),
          explain: explainEntry(forms, first, i18n),
        };
      }),
    [i18n],
  );

  // Every round but the first shuffles its offers, so the right pair has no place of its own.
  const nextRun = (items: readonly NextItem[], pinned?: NextItem): NextItem[] => {
    const rest = shuffle(items.filter((item) => item !== pinned));
    return (pinned ? [pinned, ...rest] : rest).map((item) =>
      item === pinned ? item : { ...item, options: shuffle(item.options) },
    );
  };

  const thirdItems = useMemo<ThirdItem[]>(
    () =>
      POHIVORMID_TYPED.map(({ forms, pattern }) => ({
        forms,
        src: clipUrl(SLUG, clipId(firstTwo(forms))),
        answers: [forms[2]],
        said: (
          <>
            {nounEntry(forms)}{" "}
            <span lang={i18n.locale} className="text-md text-ink-muted">
              {i18n._(MEANS[forms[0]])}
            </span>
          </>
        ),
        prompt: t`Third form after ${firstTwo(forms)}`,
        keyboard: "text",
        pair: [pattern, forms[0]] as const,
      })),
    [i18n, t],
  );

  const dialogue: DialogueTurn[] = [
    { who: "them", clip: "d-mari-1", line: line("d-mari-1") },
    {
      who: "you",
      clip: "d-sina-1",
      replies: [
        {
          line: "Pood, poe, poe.",
          why: t`Poe is the second form. The third has the d back: poodi.`,
        },
        { line: line("d-sina-1"), right: true },
        {
          line: "Pood, poodi, poe.",
          why: t`The order is first, second, third. Poe, the one without the d, comes second.`,
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
          why: t`The third form of laps ends in -st: last.`,
        },
        {
          line: "Laps, last, lapse.",
          why: t`Last is the third form, so it comes after lapse.`,
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
          why: t`Majas means in the house: the second form with -s. The second form itself is maja.`,
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
          why: t`Like küsimus, vastus has a second form in -use: vastuse.`,
        },
        {
          line: "Vastus, vastuse, vastuse.",
          why: t`Like küsimus, vastus ends its third form in -ust: vastust.`,
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
                    Hear the first form of a word, then pick the second and third, in order.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="next-forms"
                title={<Trans>Which two come next?</Trans>}
                items={nextItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six. You picked the second and third form every time.</Trans>
                  ) : share >= 0.6 ? (
                    <Trans>Nearly. Look at the table above for the ones you missed.</Trans>
                  ) : (
                    <Trans>Tap through the table above once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({
                  label: nounEntry(formsOf(item.first)),
                  src: entrySrc(formsOf(item.first)),
                })}
                order={nextRun}
                round={(props) => <ChoiceRound {...props} />}
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
                  <Trans>Each round plays the first two forms of a new word. Type the third.</Trans>
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
                    <Trans>Nearly. Hear the ones you missed with their third form.</Trans>
                  ) : (
                    <Trans>Read the three endings above once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: nounEntry(item.forms), src: entrySrc(item.forms) })}
                order={eachPairFirst}
                round={(props) => <TypedRound {...props} />}
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
