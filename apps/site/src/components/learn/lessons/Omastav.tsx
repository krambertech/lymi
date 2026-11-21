import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { CornerDownRight } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { LESSONS, lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  type GenitiveKind,
  OMASTAV_DIALOGUE,
  OMASTAV_FORMS,
  OMASTAV_PHRASES,
  OMASTAV_PRONOUNS,
  OMASTAV_WHOSE,
  ownedBook,
  phraseOf,
} from "../../../lib/learn/clips";
import { playSound, usePlaying } from "../../../lib/learn/player";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { Chips, Panel } from "../Explore";
import { GapPassage, type GapItem as PassageGap } from "../GapPassage";
import { Aside, LessonView, Prose } from "../LessonView";
import type { Glossary } from "../lesson-context";
import { Answer, Feedback, Quiz, type RoundProps } from "../Quiz";
import { Listen, PlayMark } from "../Sound";
import { Word } from "../Word";

const SLUG = "omastav";
/** A clip by what it says. */
const src = (text: string) => clipUrl(SLUG, clipId(text));

type Who = (typeof OMASTAV_PRONOUNS)[number]["who"];
type Phrase = (typeof OMASTAV_PHRASES)[number];

/** Each pronoun, and its whose form before raamat, in the reader's language. */
const PERSON: Record<
  Who,
  { who: MessageDescriptor; whose: MessageDescriptor; book: MessageDescriptor }
> = {
  mina: { who: msg`I`, whose: msg`my`, book: msg`my book` },
  sina: {
    who: msg`you, to one person`,
    whose: msg`your, to one person`,
    book: msg`your book, to one person`,
  },
  tema: { who: msg`he or she`, whose: msg`his or her`, book: msg`his or her book` },
  meie: { who: msg`we`, whose: msg`our`, book: msg`our book` },
  teie: {
    who: msg`you, to more than one; polite you`,
    whose: msg`your, to more than one; polite your`,
    book: msg`your book, to more than one or polite`,
  },
  nemad: { who: msg`they`, whose: msg`their`, book: msg`their book` },
};

/** What each sentence means, by what it says. */
const MEANS: Record<string, MessageDescriptor> = {
  "Minu nimi on Mari.": msg`My name is Mari.`,
  "Mina elan Tartus.": msg`I live in Tartu.`,
  "Mis su nimi on?": msg`What’s your name?`,
  "Kelle raamat see on?": msg`Whose book is this?`,
  "See on minu raamat.": msg`It’s my book.`,
  "See on Mari raamat.": msg`It’s Mari’s book.`,
  "Kelle kass see on?": msg`Whose cat is this?`,
  "See on Jaani kass.": msg`It’s Jaan’s cat.`,
  "Eesti pealinn on Tallinn.": msg`The capital of Estonia is Tallinn.`,
  "Mu nimi on Kati.": msg`My name is Kati.`,
  "See on sinu kohv.": msg`This is your coffee.`,
  "Kas see on su kass?": msg`Is this your cat?`,
  "Tema raamat on laual.": msg`His or her book is on the table.`,
  "Tema vend töötab haiglas.": msg`His or her brother works in a hospital.`,
  "Meie kool on Tartus.": msg`Our school is in Tartu.`,
  "Meie ema on õpetaja.": msg`Our mother is a teacher.`,
  "Kas see on teie kohvik?": msg`Is this your café? To more than one, or polite.`,
  "Teie kass on kodus.": msg`Your cat is at home. To more than one, or polite.`,
  "Nende kontor on Tallinnas.": msg`Their office is in Tallinn.`,
  "See on nende pilt.": msg`This is their picture.`,
};

/** What each phrase of “Which form?” means. */
const PHRASE_MEANS: Record<string, MessageDescriptor> = {
  "kooli uks": msg`the school door`,
  "kohviku nimi": msg`the café’s name`,
  "kontori aken": msg`the office window`,
  "Tallinna turg": msg`the Tallinn market`,
  "poe uks": msg`the shop door`,
  "toa aken": msg`the room’s window`,
  "turu kohvik": msg`the market café`,
  "jõe nimi": msg`the river’s name`,
  "haigla aken": msg`the hospital window`,
  "Tartu kohvik": msg`a café in Tartu`,
  "Pärnu turg": msg`the Pärnu market`,
  "Eesti pealinn": msg`the capital of Estonia`,
};

/** What each noun of the three-form table means, as a word, as an owner, and with -s or -l. */
const FORM_MEANS: Record<string, MessageDescriptor> = {
  kool: msg`school`,
  kooli: msg`the school’s, of the school`,
  koolis: msg`at school, in a school`,
  Tallinn: msg`Tallinn`,
  Tallinna: msg`Tallinn’s, of Tallinn`,
  Tallinnas: msg`in Tallinn`,
  kohvik: msg`café`,
  kohviku: msg`the café’s, of the café`,
  kohvikus: msg`in a café`,
  raamat: msg`book`,
  raamatu: msg`the book’s, of the book`,
  raamatus: msg`in the book`,
  pood: msg`shop`,
  poe: msg`the shop’s, of the shop`,
  poes: msg`in the shop`,
  tuba: msg`room`,
  toa: msg`the room’s, of the room`,
  toas: msg`in the room`,
  turg: msg`market`,
  turu: msg`the market’s, of the market`,
  turul: msg`at the market`,
  laud: msg`table`,
  laua: msg`the table’s, of the table`,
  laual: msg`on the table`,
  Tartu: msg`Tartu; Tartu’s, of Tartu`,
  Tartus: msg`in Tartu`,
  haigla: msg`hospital; the hospital’s`,
  haiglas: msg`in a hospital`,
  kodu: msg`home; of home`,
  kodus: msg`at home`,
  töö: msg`work; of work`,
  tööl: msg`at work`,
  kontor: msg`office`,
  kontori: msg`the office’s, of the office`,
  kontoris: msg`in an office`,
  jõgi: msg`river`,
  jõe: msg`the river’s, of the river`,
  jões: msg`in the river`,
  Pärnu: msg`Pärnu, a town by the sea`,
  Pärnus: msg`in Pärnu`,
  Eesti: msg`Estonia; Estonia’s`,
  Eestis: msg`in Estonia`,
};

const GLOSSARY: Glossary = {
  ...Object.fromEntries(
    OMASTAV_PRONOUNS.flatMap(({ who, whose }) => [
      [who, { en: PERSON[who].who }],
      [whose, { en: PERSON[who].whose }],
      [ownedBook(whose), { en: PERSON[who].book }],
    ]),
  ),
  minu: { en: msg`my`, note: msg`The genitive of mina. Short: mu.` },
  sinu: { en: msg`your, to one person`, note: msg`The genitive of sina. Short: su.` },
  nende: { en: msg`their`, note: msg`The genitive of nemad. It has no short form.` },
  mu: { en: msg`my`, note: msg`The short form of minu.` },
  su: { en: msg`your, to one person`, note: msg`The short form of sinu.` },
  ...Object.fromEntries(
    Object.entries(FORM_MEANS).map(([word, en]) => [word.toLowerCase(), { en, show: word }]),
  ),
  ...Object.fromEntries(
    OMASTAV_PHRASES.map((each) => [
      phraseOf(each).toLowerCase(),
      { en: PHRASE_MEANS[phraseOf(each)] as MessageDescriptor, show: phraseOf(each) },
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(MEANS).map(([said, en]) => [said.toLowerCase(), { en, show: said }]),
  ),
  kes: { en: msg`who`, clip: false },
  kelle: { en: msg`whose`, note: msg`The genitive of kes, who.` },
  pealinn: { en: msg`capital city`, note: msg`Pea, head, and linn, town.` },
  uks: { en: msg`door` },
  aken: { en: msg`window` },
  nimi: { en: msg`name` },
  kass: { en: msg`cat` },
  kassi: { en: msg`the cat’s`, note: msg`The genitive of kass: kassi nimi, the cat’s name.` },
  jaan: { en: msg`Jaan, a man’s name`, show: "Jaan" },
  jaani: {
    en: msg`Jaan’s`,
    note: msg`A name ending in a consonant gains a vowel.`,
    show: "Jaani",
  },
  mari: { en: msg`Mari, a woman’s name`, show: "Mari" },
  "mari raamat": { en: msg`Mari’s book`, show: "Mari raamat" },
  vend: { en: msg`brother`, clip: false },
  miisu: { en: msg`Miisu, a name for a cat`, show: "Miisu", clip: false },
};

/** Where the genitive's own letters start: after what it shares with the word it comes from. */
export function sharedLength(word: string, form: string): number {
  let i = 0;
  while (i < word.length && i < form.length && word[i] === form[i]) i++;
  return form === word ? form.length : i;
}

/** A form with the letters it doesn't share with `word` lit. */
function Lit({ word, form }: { word: string; form: string }) {
  const at = sharedLength(word, form);
  return (
    <>
      {form.slice(0, at)}
      <span className="text-(--form)">{form.slice(at)}</span>
    </>
  );
}

/** A tile to tap: a word and what it means. */
function WordTile(props: { src: string; word: ReactNode; means: string; swap: string }) {
  const playing = usePlaying(props.src);
  return (
    <button
      type="button"
      onClick={() => void playSound(props.src)}
      className="grid h-full w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 py-3 ps-4 pe-3 text-start transition-colors duration-150 hoverable:hover:bg-plate-hover"
    >
      <span className="grid min-w-0">
        <span
          key={props.swap}
          lang="et"
          className="learn-swap text-xl font-semibold tracking-tight max-sm:text-lg"
        >
          {props.word}
        </span>
        <span className="text-sm text-ink-muted">{props.means}</span>
      </span>
      <PlayMark playing={playing} />
    </button>
  );
}

/** The six pronouns, switched together between who and whose. */
function WhoseSwitch() {
  const { t, i18n } = useLingui();
  const [whose, setWhose] = useState(false);
  return (
    <Panel>
      <Chips
        label={t`Who or whose`}
        items={[
          { label: t`Who`, value: "who" },
          { label: t`Whose`, value: "whose" },
        ]}
        value={whose ? "whose" : "who"}
        onPick={(value) => setWhose(value === "whose")}
      />
      <ul className="m-0 grid list-none grid-cols-2 overflow-hidden rounded-lg bg-plate p-0 ring-1 ring-edge sm:grid-cols-3">
        {OMASTAV_PRONOUNS.map((each) => {
          const said = whose ? ownedBook(each.whose) : each.who;
          return (
            <li key={each.who} className="border-b border-edge">
              <WordTile
                src={src(said)}
                word={
                  whose ? (
                    <>
                      <Lit word={each.who} form={each.whose} /> raamat
                    </>
                  ) : (
                    each.who
                  )
                }
                means={i18n._(whose ? PERSON[each.who].book : PERSON[each.who].who)}
                swap={said}
              />
            </li>
          );
        })}
      </ul>
      <p aria-live="polite" className="text-md text-ink-secondary">
        {whose
          ? t`Mina, sina and nemad change: minu, sinu, nende. Tema, meie and teie stay as they are.`
          : t`Switch to Whose and watch which pronouns change.`}
      </p>
    </Panel>
  );
}

/** A sentence that plays when tapped, with its meaning under it. */
function Line({ said, reply }: { said: string; reply?: boolean }) {
  const { i18n } = useLingui();
  const clip = src(said);
  const playing = usePlaying(clip);
  // No aria-label: the sentence and its meaning are the button's name.
  return (
    <button
      type="button"
      onClick={() => void playSound(clip)}
      className={clsx(
        "grid w-full cursor-pointer items-center gap-x-3.5 py-2.5 pe-3 text-start transition-colors duration-150 hoverable:hover:bg-plate-hover",
        reply ? "grid-cols-[auto_minmax(0,1fr)_auto] ps-5" : "grid-cols-[minmax(0,1fr)_auto] ps-4",
      )}
    >
      {reply && (
        <CornerDownRight aria-hidden="true" className="size-4 text-ink-faint rtl:-scale-x-100" />
      )}
      <span
        lang="et"
        className={clsx(
          "min-w-0 tracking-tight max-sm:text-lg",
          reply ? "text-lg" : "text-xl font-medium",
        )}
      >
        {said}
        <span
          lang={i18n.locale}
          className="block text-sm font-normal tracking-normal text-ink-muted"
        >
          {i18n._(MEANS[said] as MessageDescriptor)}
        </span>
      </span>
      <PlayMark playing={playing} />
    </button>
  );
}

/** Questions on a plate, each with the answers that fit it under it. */
function Exchanges({ items }: { items: readonly { q: string; a: readonly string[] }[] }) {
  return (
    <ul className="m-0 list-none overflow-hidden rounded-lg bg-plate p-0 ring-1 ring-edge">
      {items.map((item) => (
        <li key={item.q} className="border-b border-edge pb-1 last:border-b-0">
          <Line said={item.q} />
          {item.a.map((answer) => (
            <Line key={answer} said={answer} reply />
          ))}
        </li>
      ))}
    </ul>
  );
}

/** One form in the table, to tap. */
function FormCell({ form, word, lit }: { form: string; word: string; lit: "new" | "end" | null }) {
  const clip = src(form);
  const playing = usePlaying(clip);
  return (
    <td className="p-0.5">
      <button
        type="button"
        onClick={() => void playSound(clip)}
        className={clsx(
          "flex w-full min-w-0 cursor-pointer items-center rounded-xs px-2 py-2 text-start text-xl font-semibold tracking-tight transition-colors duration-150 hoverable:hover:bg-plate-hover max-sm:px-1.5 max-sm:text-lg",
          playing && "bg-plate-hover",
        )}
      >
        <span lang="et" className="min-w-0 break-words">
          {lit === "new" ? (
            <Lit word={word} form={form} />
          ) : lit === "end" ? (
            <>
              {form.slice(0, -1)}
              <span className="text-(--form)">{form.slice(-1)}</span>
            </>
          ) : (
            form
          )}
        </span>
      </button>
    </td>
  );
}

/** Nouns by how their genitive is made: the word, its genitive, and the genitive with -s or -l. */
function FormTable() {
  const { t } = useLingui();
  const [kind, setKind] = useState<GenitiveKind>("vowel");
  const rows = OMASTAV_FORMS.filter((each) => each.kind === kind);
  const notes: Record<GenitiveKind, { title: ReactNode; tip: ReactNode }> = {
    vowel: {
      title: <Trans>A vowel at the end</Trans>,
      tip: (
        <Trans>
          <span lang="et">Kool</span> gains an i: <span lang="et">kooli</span>. It’s the vowel you
          heard in <span lang="et">koolis</span>.
        </Trans>
      ),
    },
    inside: {
      title: <Trans>A change inside</Trans>,
      tip: (
        <Trans>
          <span lang="et">Pood</span> loses its d, and its o turns to e: <span lang="et">poe</span>.
          Learn these words in pairs.
        </Trans>
      ),
    },
    same: {
      title: <Trans>No change</Trans>,
      tip: (
        <Trans>
          <span lang="et">Tartu</span> and <span lang="et">haigla</span> stay as they are, and{" "}
          <span lang="et" className="whitespace-nowrap">
            -s
          </span>{" "}
          or{" "}
          <span lang="et" className="whitespace-nowrap">
            -l
          </span>{" "}
          goes straight on.
        </Trans>
      ),
    },
  };
  return (
    <Panel>
      <Chips
        label={t`How the genitive is made`}
        items={[
          { label: t`Gains a vowel`, value: "vowel" },
          { label: t`Changes inside`, value: "inside" },
          { label: t`No change`, value: "same" },
        ]}
        value={kind}
        onPick={setKind}
      />
      <div className="overflow-hidden rounded-lg bg-plate ring-1 ring-edge">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="border-b border-edge text-start text-sm text-ink-muted">
              <th scope="col" className="px-3 py-2 text-start font-normal max-sm:px-2">
                <Trans>The word</Trans>
              </th>
              <th scope="col" className="px-3 py-2 text-start font-normal max-sm:px-2">
                <Trans>Genitive</Trans>
              </th>
              <th scope="col" className="px-3 py-2 text-start font-normal max-sm:px-2">
                <Trans>With -s or -l</Trans>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((each) => (
              <tr
                key={`${kind}-${each.word}`}
                className="learn-swap border-b border-edge last:border-b-0"
              >
                <FormCell form={each.word} word={each.word} lit={null} />
                <FormCell form={each.whose} word={each.word} lit={kind === "same" ? null : "new"} />
                <FormCell form={each.where} word={each.whose} lit="end" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div aria-live="polite" className="min-h-13">
        <p key={kind} className="learn-swap grid gap-0.5">
          <span className="text-xl font-medium">{notes[kind].title}</span>
          <span className="text-md text-ink-secondary">{notes[kind].tip}</span>
        </p>
      </div>
    </Panel>
  );
}

interface WhoseItem {
  src: string;
  said: string;
  answer: Who;
  /** Keyed by pronoun, so a run hears each pronoun once before any comes back. */
  pair: readonly [string, string];
}

/** Hear a sentence, then pick whose it is from the six whose forms. */
function WhoseRound({ item, state, heard, answer, autoplay }: RoundProps<WhoseItem>) {
  const { t, i18n } = useLingui();
  const [nudged, setNudged] = useState(false);
  const round = state.status === "asking" || state.status === "answered" ? state.round : -1;
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new round replays even when its clip is the last one's
  useEffect(() => {
    setNudged(false);
    if (autoplay) void playSound(item.src);
  }, [autoplay, round, item.src]);
  const done = state.status === "answered";
  const picked = done ? state.picked : null;
  return (
    <>
      <Listen src={item.src} onPlay={heard} />
      {nudged && !done && (
        <p role="status" className="text-sm text-ink-muted">
          <Trans>Listen first.</Trans>
        </p>
      )}
      <fieldset className="m-0 grid w-full min-w-0 grid-cols-3 gap-2 border-0 p-0 max-sm:gap-1.5">
        <legend className="sr-only">{t`Answers`}</legend>
        {OMASTAV_PRONOUNS.map((each) => (
          <Answer
            key={each.who}
            label={each.whose}
            lang="et"
            sub={i18n._(PERSON[each.who].whose)}
            mark={
              !done
                ? undefined
                : each.who === item.answer
                  ? "right"
                  : each.who === picked
                    ? "wrong"
                    : "out"
            }
            onPick={() => {
              if (done) return;
              if (state.status === "asking" && !state.heard) return setNudged(true);
              answer(each.who, each.who === item.answer);
            }}
          />
        ))}
      </fieldset>
      {done && (
        <Feedback right={state.right}>
          <span lang="et" className="font-medium text-ink">
            {item.said}
          </span>{" "}
          {i18n._(MEANS[item.said] as MessageDescriptor)}
        </Feedback>
      )}
    </>
  );
}

interface FormItem {
  src: string;
  phrase: Phrase;
  answer: string;
  options: readonly string[];
  /** Keyed by how the genitive is made, so a run meets all three kinds early. */
  pair: readonly [string, string];
}

/** The forms a “Which form?” round offers: the word, its genitive and its -s form, once each. */
export const formsOf = (phrase: Phrase): string[] => [
  ...new Set([phrase.word, phrase.whose, phrase.where]),
];

/** The first round's order, turned by the item's place so the answer isn't always in one spot. */
export function firstOrder(phrase: Phrase, i: number): string[] {
  const forms = formsOf(phrase);
  const turn = i % forms.length;
  return [...forms.slice(turn), ...forms.slice(0, turn)];
}

/** See a thing and its owner's three forms; pick the one that goes first, then hear the phrase. */
function FormRound({ item, state, heard, answer }: RoundProps<FormItem>) {
  const { t, i18n } = useLingui();
  const round = state.status === "asking" || state.status === "answered" ? state.round : -1;
  // The phrase would say the answer, so the round opens answerable and plays after the pick.
  // biome-ignore lint/correctness/useExhaustiveDependencies: each round, including a restart, opens answerable
  useEffect(() => heard(), [round]);
  const done = state.status === "answered";
  const picked = done ? state.picked : null;
  const said = phraseOf(item.phrase);
  return (
    <>
      {done && <Listen src={item.src} />}
      <p className="text-md text-ink-secondary">
        {i18n._(PHRASE_MEANS[said] as MessageDescriptor)}
      </p>
      <p
        lang="et"
        className="flex flex-wrap items-baseline gap-x-3 text-[clamp(2.25rem,8vw,3.25rem)] leading-tight font-semibold tracking-tight"
      >
        <span
          data-mark={picked === null ? undefined : picked === item.answer ? "right" : "wrong"}
          className="learn-gap inline-block min-w-[3ch] text-center"
        >
          {done ? item.answer : " "}
        </span>
        <span>{item.phrase.noun}</span>
      </p>
      <p className="sr-only">{t`blank ${item.phrase.noun}`}</p>
      <fieldset className="m-0 flex min-w-0 flex-wrap gap-2.5 border-0 p-0">
        <legend className="sr-only">{t`Fill the gap`}</legend>
        {item.options.map((option) => (
          <Answer
            key={option}
            big
            lang="et"
            label={option}
            mark={
              !done
                ? undefined
                : option === item.answer
                  ? "right"
                  : option === picked
                    ? "wrong"
                    : "out"
            }
            onPick={() => {
              if (done) return;
              answer(option, option === item.answer);
              void playSound(item.src);
            }}
          />
        ))}
      </fieldset>
      {done && (
        <Feedback right={state.right}>
          <span lang="et" className="font-medium text-ink">
            {said}
          </span>{" "}
          {i18n._(PHRASE_MEANS[said] as MessageDescriptor)}.{" "}
          {item.phrase.kind === "same" ? (
            <Trans>
              <span lang="et">{item.phrase.word}</span> stays as it is.
            </Trans>
          ) : (
            <Trans>
              <span lang="et">{item.phrase.whose}</span> is{" "}
              <span lang="et">{item.phrase.where}</span> without its last letter.
            </Trans>
          )}
        </Feedback>
      )}
    </>
  );
}

/**
 * Kati's note, gap by gap: each gap is who or whose. The right word sits first in some gaps and
 * second in others. omastav.test.ts checks that the filled gaps spell the recording.
 */
export const KATI_GAPS: readonly PassageGap[] = [
  {
    id: "minu-nimi",
    before: "Tere!",
    after: "nimi on Kati.",
    answer: "Minu",
    options: ["Mina", "Minu"],
  },
  { id: "mina-elan", before: "", after: "elan Tartus.", answer: "Mina", options: ["Mina", "Minu"] },
  { id: "minu-vend", before: "Jaan on", after: "vend.", answer: "minu", options: ["minu", "mina"] },
  {
    id: "jaani",
    before: "",
    after: "kohvik on Tallinnas.",
    answer: "Jaani",
    options: ["Jaan", "Jaani"],
  },
  {
    id: "kassi",
    before: "Ema ja isa elavad Pärnus. Nende",
    after: "nimi on Miisu.",
    answer: "kassi",
    options: ["kass", "kassi"],
  },
  { id: "sinu", before: "Mis", after: "nimi on?", answer: "sinu", options: ["sina", "sinu"] },
];

const dialogueLine = (id: keyof typeof OMASTAV_DIALOGUE) => {
  const clip = OMASTAV_DIALOGUE[id];
  return typeof clip === "string" ? clip : clip.text;
};

export function OmastavLesson() {
  const { t } = useLingui();
  const questions = lessonBySlug("kusimused")?.n;
  const places = lessonBySlug("kohad")?.n;
  const stems = LESSONS.find((lesson) => lesson.et === "Pood, poe")?.n;

  const whoseItems = useMemo<WhoseItem[]>(
    () =>
      OMASTAV_WHOSE.map(({ who, said }) => ({
        src: src(said),
        said,
        answer: who,
        pair: [who, said] as const,
      })),
    [],
  );

  const formItems = useMemo<FormItem[]>(
    () =>
      OMASTAV_PHRASES.map((phrase, i) => ({
        src: src(phraseOf(phrase)),
        phrase,
        answer: phrase.whose,
        options: firstOrder(phrase, i),
        pair: [phrase.kind, phraseOf(phrase)] as const,
      })),
    [],
  );

  // Every round but the first shuffles its forms afresh, so the answer has no fixed place.
  const formRun = (items: readonly FormItem[], pinned?: FormItem): FormItem[] =>
    eachPairFirst(items, pinned).map((item) =>
      item === pinned ? item : { ...item, options: shuffle(formsOf(item.phrase)) },
    );

  // The right reply moves between first, second and third place from turn to turn.
  const dialogue: DialogueTurn[] = [
    { who: "them", clip: "d-mari-1", line: dialogueLine("d-mari-1") },
    {
      who: "you",
      clip: "d-sina-1",
      replies: [
        { line: "See on mina raamat.", why: t`Mina is I. To say my, use minu: minu raamat.` },
        { line: dialogueLine("d-sina-1"), right: true },
        { line: "See on raamat minu.", why: t`The owner goes first: minu raamat.` },
      ],
    },
    { who: "them", clip: "d-mari-2", line: dialogueLine("d-mari-2") },
    {
      who: "you",
      clip: "d-sina-2",
      replies: [
        { line: "See on Jaan kohv.", why: t`Before a noun, Jaan takes its genitive: Jaani kohv.` },
        { line: "See on sinu kohv.", why: t`Sinu is your: that says the coffee is Mari’s.` },
        { line: dialogueLine("d-sina-2"), right: true },
      ],
    },
    { who: "them", clip: "d-mari-3", line: dialogueLine("d-mari-3") },
    {
      who: "you",
      clip: "d-sina-3",
      replies: [
        { line: dialogueLine("d-sina-3"), right: true },
        {
          line: "Jah, see on nende kass.",
          why: t`Nende is their. For you and Jaan, say meie, our.`,
        },
        { line: "Jah, see on teie kass.", why: t`Teie is your. About yourselves, say meie, our.` },
      ],
    },
    { who: "them", clip: "d-mari-4", line: dialogueLine("d-mari-4") },
    {
      who: "you",
      clip: "d-sina-4",
      replies: [
        {
          line: "Kass nimi on Miisu.",
          why: t`The cat owns the name, so kass takes its genitive: kassi nimi.`,
        },
        { line: dialogueLine("d-sina-4"), right: true },
        { line: "Miisu nimi on kass.", why: t`That says Miisu’s name is Kass.` },
      ],
    },
  ];

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          To say whose something is, put the owner first, in the genitive:{" "}
          <span lang="et">minu raamat</span> is my book, and <span lang="et">Mari raamat</span> is
          Mari’s book.
        </Trans>
      }
      facts={[
        <Trans key="m">12 minutes</Trans>,
        <Trans key="q">2 quizzes, a text and a conversation</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "minu",
        "sinu",
        "tema",
        "meie",
        "teie",
        "nende",
        "mu",
        "su",
        "kelle",
        "kelle raamat see on?",
        "mari raamat",
        "jaani",
        "pealinn",
        "kooli",
        "poe",
        "toa",
      ]}
      recap={[
        <Trans key="1">
          The genitive says whose, and the owner goes first: <b lang="et">minu raamat</b>, my book;{" "}
          <b lang="et">Mari raamat</b>, Mari’s book.
        </Trans>,
        <Trans key="2">
          The pronouns: <b lang="et">minu, sinu, tema, meie, teie, nende</b>. In speech,{" "}
          <b lang="et">minu</b> and <b lang="et">sinu</b> shorten to <b lang="et">mu</b> and{" "}
          <b lang="et">su</b>.
        </Trans>,
        <Trans key="3">
          Ask whose with <b lang="et">kelle</b>: <b lang="et">Kelle raamat see on?</b>
        </Trans>,
        <Trans key="4">
          A noun’s genitive is its form before{" "}
          <b lang="et" className="whitespace-nowrap">
            -s
          </b>{" "}
          or{" "}
          <b lang="et" className="whitespace-nowrap">
            -l
          </b>
          : <b lang="et">kooli</b> in <b lang="et">koolis</b>, <b lang="et">poe</b> in{" "}
          <b lang="et">poes</b>. A dictionary lists it second: <b lang="et">pood, poe</b>.
        </Trans>,
        <Trans key="5">
          A name ending in a vowel stays as it is: <b lang="et">Mari raamat</b>. A name ending in a
          consonant gains a vowel: <b lang="et">Jaani kass</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "my-your",
          title: t`Minu, sinu, nende: my, your, their`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In lesson {questions} you said <Word w="Minu nimi on Mari." /> The word{" "}
                    <Word w="minu" />, my, is <Word w="mina" /> in the form that says whose. That
                    form is the genitive.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Every pronoun has a genitive, and it goes before the thing it owns. Switch to
                    Whose and tap a word to hear it.
                  </Trans>
                </p>
              </Prose>
              <WhoseSwitch />
              <Aside>
                <Trans>
                  In speech, <span lang="et">minu</span> and <span lang="et">sinu</span> often
                  shorten to <Word w="mu" /> and <Word w="su" />. You met one in lesson {questions}:{" "}
                  <Word w="Mis su nimi on?" />, what’s your name?
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "whose",
          title: t`Hearing whose`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Hear a sentence and pick whose it’s about. A short <span lang="et">mu</span> is{" "}
                    <span lang="et">minu</span>, and <span lang="et">su</span> is{" "}
                    <span lang="et">sinu</span>.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="whose"
                title={<Trans>Whose?</Trans>}
                items={whoseItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All of them. You heard whose in every sentence.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Switch between Who and Whose above once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: item.src })}
                order={eachPairFirst}
                round={(props) => <WhoseRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "owner",
          title: t`The owner comes first`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    A name or a noun owns things the same way: it goes first, in the genitive.{" "}
                    <Word w="Mari raamat" /> is Mari’s book. Estonian adds no ’s, and Mari stays as
                    it is: a name ending in a vowel doesn’t change.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    A name ending in a consonant gains a vowel, often an i: <Word w="Jaan" />,{" "}
                    <Word w="Jaani" />. A country works the same way:{" "}
                    <Word w="Eesti pealinn on Tallinn." />
                  </Trans>
                </p>
                <p>
                  <Trans>
                    To ask whose, say <Word w="kelle" />. It’s the genitive of <Word w="kes" />,
                    who, from lesson {questions}. Tap a line to hear it.
                  </Trans>
                </p>
              </Prose>
              <Exchanges
                items={[
                  { q: "Kelle raamat see on?", a: ["See on minu raamat.", "See on Mari raamat."] },
                  { q: "Kelle kass see on?", a: ["See on Jaani kass."] },
                ]}
              />
            </>
          ),
        },
        {
          id: "before-s",
          title: t`The genitive is the form before -s`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In lesson {places} you learned <Word w="koolis" />, at school, and{" "}
                    <Word w="Tallinnas" />, in Tallinn. Take off the{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -s
                    </b>{" "}
                    and you have the genitive: <Word w="kooli" />, <Word w="Tallinna" />. The vowel
                    that appeared before the{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -s
                    </b>{" "}
                    belongs to the genitive.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    So <Word w="kooli uks" /> is the school door, and <Word w="koolis" /> is at
                    school. The endings{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -s
                    </b>{" "}
                    and{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -l
                    </b>{" "}
                    go on the genitive.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Lesson {stems} showed words that change inside, such as <Word w="pood" /> and{" "}
                    <Word w="poes" />. The changed form is the genitive too: <Word w="poe uks" />,
                    the shop door. A dictionary lists it second: pood, poe. Pick a kind of word and
                    tap any form.
                  </Trans>
                </p>
              </Prose>
              <FormTable />
            </>
          ),
        },
        {
          id: "which-form",
          title: t`Choosing the genitive`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each round shows a thing and three forms of its owner. Pick the one that goes in
                    front, then hear the phrase. If you know the form with{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -s
                    </b>{" "}
                    or{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -l
                    </b>
                    , take off its last letter.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="which-form"
                title={<Trans>Which form goes first?</Trans>}
                items={formItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All of them. You picked the genitive every time.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>
                      Go through the three kinds of word above once more, then try again.
                    </Trans>
                  )
                }
                recall={(item) => ({ label: phraseOf(item.phrase), src: item.src })}
                order={formRun}
                round={(props) => <FormRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "who-or-whose",
          title: t`Who or whose?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Mina" /> is the one who does something: <Word w="Mina elan Tartus." />{" "}
                    <Word w="Minu" /> is the one who owns something: <Word w="Minu nimi on Mari." />
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Kati writes about her family. Pick the word for each gap: the one who does
                    something, or the one who owns it.
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="kati-family"
                title={<Trans>Fill the gaps</Trans>}
                gaps={KATI_GAPS}
                mode="pick"
                clip="p-kati"
              />
            </>
          ),
        },
        {
          id: "at-home",
          title: t`Whose is it?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari is at your home and asks whose things are whose. Pick each answer.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="whose-is-it"
                title={<Trans>Talk: whose is it?</Trans>}
                part={
                  <Trans>
                    You live with your brother Jaan and your cat Miisu. The book is yours, and the
                    coffee is Jaan’s. Mari speaks first; pick what you say back.
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
