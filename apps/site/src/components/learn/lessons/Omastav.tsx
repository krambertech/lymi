import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { CornerDownRight } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  capital,
  clipId,
  clipUrl,
  type GenitiveKind,
  OMASTAV_DIALOGUE,
  OMASTAV_FIX,
  OMASTAV_FORMS,
  OMASTAV_PHRASES,
  OMASTAV_PRONOUNS,
  OMASTAV_SAY,
  OMASTAV_SORT,
  OMASTAV_TALK,
  OMASTAV_WHOSE,
  ownedBook,
  phraseOf,
} from "../../../lib/learn/clips";
import { playSound, toggleSound, usePlaying } from "../../../lib/learn/player";
import { eachPairFirst } from "../../../lib/learn/quiz";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { Chips, Panel } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import { GapPassage, type GapItem as PassageGap } from "../GapPassage";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { Listening, type PassageQuestion } from "../Passage";
import { Answer, Feedback, Quiz, type RoundProps } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Sort, type SortBin, type SortItem } from "../Sort";
import { Listen, PlayMark } from "../Sound";
import { Word } from "../Word";

const SLUG = "omastav";
/** A clip by what it says. */
const src = (text: string) => clipUrl(SLUG, clipId(text));

type Who = (typeof OMASTAV_PRONOUNS)[number]["who"];

/**
 * Each pronoun in the reader's language: who, whose, whose in a quiz answer's short line, and the
 * whose form before raamat.
 */
const PERSON: Record<
  Who,
  {
    who: MessageDescriptor;
    whose: MessageDescriptor;
    short: MessageDescriptor;
    book: MessageDescriptor;
  }
> = {
  mina: { who: msg`I`, whose: msg`my`, short: msg`my`, book: msg`my book` },
  sina: {
    who: msg`you, to one person`,
    whose: msg`your, to one person`,
    short: msg`your, to one`,
    book: msg`your book, to one person`,
  },
  tema: {
    who: msg`he or she`,
    whose: msg`his or her`,
    short: msg`his or her`,
    book: msg`his or her book`,
  },
  meie: { who: msg`we`, whose: msg`our`, short: msg`our`, book: msg`our book` },
  teie: {
    who: msg`you, to more than one; polite you`,
    whose: msg`your, to more than one; polite your`,
    short: msg`your, to several`,
    book: msg`your book, to more than one or polite`,
  },
  nemad: { who: msg`they`, whose: msg`their`, short: msg`their`, book: msg`their book` },
};

/** The pronouns whose who and whose are one word, glossed with both meanings. */
const BOTH: Partial<Record<Who, MessageDescriptor>> = {
  tema: msg`he or she; his or her`,
  meie: msg`we; our`,
  teie: msg`you, to more than one; polite you; your`,
};

/** What each sentence means, by what it says. */
const MEANS: Record<string, MessageDescriptor> = {
  "Minu nimi on Mari.": msg({ message: "My name is Mari.", context: "genitive lesson" }),
  "Mina elan Tartus.": msg`I live in Tartu.`,
  "Mis su nimi on?": msg`What’s your name?`,
  "Kelle raamat see on?": msg`Whose book is this?`,
  "See on minu raamat.": msg`This is my book.`,
  "See on Mari raamat.": msg`This is Mari’s book.`,
  "Kelle kass see on?": msg`Whose cat is this?`,
  "See on Jaani kass.": msg`This is Jaan’s cat.`,
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
  kodu: msg`home; the home’s`,
  kodus: msg`at home`,
  töö: msg`work; of work`,
  tööl: msg`at work`,
  kontor: msg`office`,
  kontori: msg`the office’s, of the office`,
  kontoris: msg`in an office`,
  jõgi: msg`river`,
  jõe: msg`the river’s, of the river`,
  jões: msg`in the river`,
  Eesti: msg`Estonia; Estonia’s`,
  Eestis: msg`in Estonia`,
};

const GLOSSARY: Glossary = {
  ...Object.fromEntries(
    // Tema, meie and teie are the same word for who and whose, so their card gives both.
    OMASTAV_PRONOUNS.flatMap(({ who, whose }) => [
      [who, { en: BOTH[who] ?? PERSON[who].who }],
      ...(who === whose ? [] : [[whose, { en: PERSON[who].whose }]]),
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
  pilt: { en: msg`picture`, clip: false },
  "kümne minuti pärast": { en: msg`in ten minutes`, show: "kümne minuti pärast" },
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

/** The pronoun as it is written in the table: the letters the genitive changes come after a |. */
const marked = (who: string, whose: string): string => {
  const at = sharedLength(who, whose);
  return at === whose.length ? whose : `${whose.slice(0, at)}|${whose.slice(at)}`;
};

/** The six pronouns, who beside whose, the genitive's own letters lit. */
function WhoseTable() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = OMASTAV_PRONOUNS.map(({ who, whose }) => ({
    id: who,
    label: i18n._(PERSON[who].who),
    tip: (
      <>
        <Trans>
          <span lang="et">{capital(ownedBook(whose))}</span> is {i18n._(PERSON[who].book)}.
        </Trans>
        {who === whose && (
          <>
            {" "}
            <Trans>Who and whose are the same word.</Trans>
          </>
        )}
      </>
    ),
    cells: [
      { form: who, src: src(who) },
      { form: marked(who, whose), src: src(whose) },
    ],
  }));
  return (
    <Panel>
      <Paradigm
        label={t`Who and whose`}
        columns={[t`Who`, t`Whose`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{
          title: <Trans>Tap a form</Trans>,
          tip: (
            <Trans>
              <span lang="et">Mina</span>, <span lang="et">sina</span> and{" "}
              <span lang="et">nemad</span> change: <span lang="et">minu, sinu, nende</span>.{" "}
              <span lang="et">Tema</span>, <span lang="et">meie</span> and{" "}
              <span lang="et">teie</span> stay as they are.
            </Trans>
          ),
        }}
      />
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
      onClick={() => void toggleSound(clip)}
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
        onClick={() => void toggleSound(clip)}
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
          <span lang="et">Pood</span> loses its d, and the second o turns to e:{" "}
          <span lang="et">poe</span>. <span lang="et">Turg</span> and <span lang="et">laud</span>{" "}
          drop their last letter and gain a vowel: <span lang="et">turu, laua</span>.
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
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- a new round replays even when its clip is the last one's
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
            sub={i18n._(PERSON[each.who].short)}
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
    why: (
      <Trans>
        The name is Kati’s own, so my: <b lang="et">minu</b>.
      </Trans>
    ),
  },
  {
    id: "mina-elan",
    before: "",
    after: "elan Tartus.",
    answer: "Mina",
    options: ["Mina", "Minu"],
    why: (
      <Trans>
        Kati is the one who lives in Tartu, so I: <b lang="et">mina</b>.
      </Trans>
    ),
  },
  {
    id: "minu-vend",
    before: "Jaan on",
    after: "vend.",
    answer: "minu",
    options: ["minu", "mina"],
    why: (
      <Trans>
        Jaan is Kati’s brother, so my: <b lang="et">minu</b>.
      </Trans>
    ),
  },
  {
    id: "jaani",
    before: "",
    after: "kohvik on Tallinnas.",
    answer: "Jaani",
    options: ["Jaan", "Jaani"],
    why: (
      <Trans>
        The café is Jaan’s, so <b lang="et">Jaan</b> takes the genitive: <b lang="et">Jaani</b>.
      </Trans>
    ),
  },
  {
    id: "kassi",
    before: "Ema ja isa elavad Pärnus. Nende",
    after: "nimi on Miisu.",
    answer: "kassi",
    options: ["kass", "kassi"],
    why: (
      <Trans>
        The name is the cat’s, so <b lang="et">kass</b> takes the genitive: <b lang="et">kassi</b>.
      </Trans>
    ),
  },
  {
    id: "sinu",
    before: "Mis",
    after: "nimi on?",
    answer: "sinu",
    options: ["sinu", "sina"],
    why: (
      <Trans>
        Kati asks for your name, so your: <b lang="et">sinu</b>.
      </Trans>
    ),
  },
  {
    id: "sina",
    before: "Kus",
    after: "elad?",
    answer: "sina",
    options: ["sinu", "sina"],
    why: (
      <Trans>
        Now Kati asks where you live, and you do the living, so you: <b lang="et">sina</b>.
      </Trans>
    ),
  },
];

const SAY_MEANS: Record<(typeof OMASTAV_SAY)[number]["id"], MessageDescriptor> = {
  jaani: msg`This is Jaan’s book.`,
  kelle: msg`Whose coffee is this?`,
  vend: msg`My brother lives in Tallinn.`,
  nende: msg`Their cat is at home.`,
  mari: msg`Mari’s café is in Tartu.`,
  opetaja: msg`Our teacher’s name is Kati.`,
};

export const sortItems = (): SortItem[] =>
  OMASTAV_SORT.map(({ w, bin }) => ({ w, bin, src: src(w) }));

export function sayItems(i18n: I18n): SentenceItem[] {
  return OMASTAV_SAY.map(({ id, said, also }) => ({
    kind: "translate",
    id: `say-${id}`,
    prompt: i18n._(SAY_MEANS[id]),
    src: src(said),
    answers: [said, ...also],
  }));
}

function FixWhy({ id }: { id: (typeof OMASTAV_FIX)[number]["id"] }) {
  switch (id) {
    case "minu":
      return (
        <Trans>
          The name belongs to the speaker, so my: <b lang="et">minu</b>.
        </Trans>
      );
    case "mina":
      return (
        <Trans>
          The speaker does the living, so I: <b lang="et">mina</b>.
        </Trans>
      );
    case "nende":
      return (
        <Trans>
          The cat is theirs, so their: <b lang="et">nende</b>.
        </Trans>
      );
    case "jaani":
      return (
        <Trans>
          The owner goes first in the genitive: <b lang="et">Jaani kass</b>.
        </Trans>
      );
    case "poe":
      return (
        <Trans>
          The shop owns the door, so the genitive: <b lang="et">pood, poe</b>,{" "}
          <b lang="et">poe uks</b>.
        </Trans>
      );
    case "tallinnas":
      return (
        <Trans>
          To say in Tallinn, put <b lang="et">-s</b> on the genitive: <b lang="et">Tallinnas</b>.
        </Trans>
      );
  }
}

const FIX_MEANS: Record<(typeof OMASTAV_FIX)[number]["id"], MessageDescriptor> = {
  minu: msg`My name is Kati.`,
  mina: msg`I live in Tartu.`,
  nende: msg`Their cat is in Pärnu.`,
  jaani: msg`Jaan’s cat is at home.`,
  poe: msg`This is the shop’s door.`,
  tallinnas: msg`I live in Tallinn.`,
};

export function fixItems(i18n: I18n): FixItem[] {
  return OMASTAV_FIX.map(({ id, wrong, right, also }) => ({
    kind: "fix",
    id: `fix-${id}`,
    wrong,
    prompt: i18n._(FIX_MEANS[id]),
    answers: [right, ...also],
    src: src(right),
    explain: <FixWhy id={id} />,
  }));
}

function useTalkQuestions(): PassageQuestion[] {
  const { t } = useLingui();
  return [
    {
      id: "who",
      ask: t`Who is in the picture?`,
      options: [
        { id: "brother", label: t`Jaan’s brother` },
        { id: "mother", label: t`Jaan’s mother` },
        { id: "mari", label: t`Mari’s brother` },
      ],
      answer: "brother",
      line: 3,
    },
    {
      kind: "short",
      id: "martin-lives",
      ask: t`Where does Martin live? Write the place in Estonian, with its ending.`,
      answers: ["Tartus"],
      line: 4,
    },
    {
      kind: "truefalse",
      id: "cat-jaan",
      ask: t`The cat is Jaan’s.`,
      answer: false,
      line: 6,
    },
    {
      kind: "short",
      id: "cat-name",
      ask: t`What is the cat’s name?`,
      answers: ["Miisu"],
      line: 7,
    },
    {
      id: "house",
      ask: t`Whose house is it?`,
      options: [
        { id: "mother", label: t`Jaan’s mother’s` },
        { id: "brothers", label: t`Jaan and Martin’s` },
        { id: "mari", label: t`Mari’s` },
      ],
      answer: "mother",
      line: 9,
    },
    {
      kind: "truefalse",
      id: "car",
      ask: t`The car is Jaan’s.`,
      answer: true,
      line: 12,
    },
  ];
}

const dialogueLine = (id: keyof typeof OMASTAV_DIALOGUE) => {
  const clip = OMASTAV_DIALOGUE[id];
  return typeof clip === "string" ? clip : clip.text;
};

export function OmastavLesson() {
  const { t, i18n } = useLingui();
  const questions = lessonBySlug("kusimused")?.n;
  const places = lessonBySlug("kohad")?.n;
  const time = lessonBySlug("kell")?.n;
  const stems = lessonBySlug("pood-poe")?.n;
  const talkQuestions = useTalkQuestions();
  const bins: SortBin[] = [
    {
      id: "whose",
      label: t`Whose`,
      lang: i18n.locale,
      hint: (
        <Trans>
          the genitive, as in <b lang="et">kooli</b>
        </Trans>
      ),
      rule: (
        <Trans>
          The genitive says whose and goes before a noun: <b lang="et">kooli uks</b>.
        </Trans>
      ),
    },
    {
      id: "where",
      label: t`Where`,
      lang: i18n.locale,
      hint: (
        <Trans>
          with <b lang="et">-s</b> or <b lang="et">-l</b>, as in <b lang="et">koolis</b>
        </Trans>
      ),
      rule: (
        <Trans>
          <b lang="et">-s</b> or <b lang="et">-l</b> on the genitive says where:{" "}
          <b lang="et">koolis</b>.
        </Trans>
      ),
    },
  ];

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

  // Typed, so no set of options can name the answer. Keyed by the word, so a run meets each once.
  const formItems = useMemo<(FormItem & { pair: readonly [string, string] })[]>(
    () =>
      OMASTAV_PHRASES.map((phrase) => {
        const said = phraseOf(phrase);
        return {
          base: phrase.word,
          gloss: i18n._(FORM_MEANS[phrase.word] as MessageDescriptor),
          cue: `… ${phrase.noun}`,
          cueLang: "et",
          answers: [phrase.whose],
          src: src(said),
          said: (
            <>
              {said}{" "}
              <span lang={i18n.locale} className="text-md">
                {i18n._(PHRASE_MEANS[said] as MessageDescriptor)}
              </span>
            </>
          ),
          explain: (
            <Trans>
              <span lang="et">{capital(phrase.whose)}</span> is{" "}
              <span lang="et">{phrase.where}</span> without its last letter.
            </Trans>
          ),
          pair: [phrase.word, said] as const,
        };
      }),
    [i18n],
  );

  // The right reply moves between first, second and third place from turn to turn.
  const dialogue: DialogueTurn[] = [
    { who: "them", clip: "d-mari-1", line: dialogueLine("d-mari-1") },
    {
      who: "you",
      clip: "d-sina-1",
      replies: [
        {
          line: "See on mina raamat.",
          why: (
            <Trans>
              <b lang="et">Mina</b> is I. To say my, use <b lang="et">minu</b>:{" "}
              <b lang="et">minu raamat</b>.
            </Trans>
          ),
        },
        { line: dialogueLine("d-sina-1"), right: true },
        {
          line: "See on raamat minu.",
          why: (
            <Trans>
              The owner goes first: <b lang="et">minu raamat</b>.
            </Trans>
          ),
        },
      ],
    },
    { who: "them", clip: "d-mari-2", line: dialogueLine("d-mari-2") },
    {
      who: "you",
      clip: "d-sina-2",
      replies: [
        {
          line: "See on Martin kohv.",
          why: (
            <Trans>
              Before a noun, <b lang="et">Martin</b> takes its genitive:{" "}
              <b lang="et">Martini kohv</b>.
            </Trans>
          ),
        },
        {
          line: "See on sinu kohv.",
          why: (
            <Trans>
              <b lang="et">Sinu</b> is your: that says the coffee is Mari’s.
            </Trans>
          ),
        },
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
          why: (
            <Trans>
              <b lang="et">Nende</b> is their. For you and Martin, say <b lang="et">meie</b>, our.
            </Trans>
          ),
        },
        {
          line: "Jah, see on teie kass.",
          why: (
            <Trans>
              <b lang="et">Teie</b> is your. For you and Martin, say <b lang="et">meie</b>, our.
            </Trans>
          ),
        },
      ],
    },
    { who: "them", clip: "d-mari-4", line: dialogueLine("d-mari-4") },
    {
      who: "you",
      clip: "d-sina-4",
      replies: [
        {
          line: "Kass nimi on Liisu.",
          why: (
            <Trans>
              The cat owns the name, so <b lang="et">kass</b> takes its genitive:{" "}
              <b lang="et">kassi nimi</b>.
            </Trans>
          ),
        },
        { line: dialogueLine("d-sina-4"), right: true },
        {
          line: "Liisu nimi on kass.",
          why: (
            <Trans>
              That says Liisu’s name is <b lang="et">Kass</b>, Cat.
            </Trans>
          ),
        },
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
        <Trans key="m">20 minutes</Trans>,
        <Trans key="q">8 exercises</Trans>,
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
          The pronouns: <b lang="et">minu, sinu, tema, meie, teie, nende</b>. Their short forms are{" "}
          <b lang="et">mu, su, ta, me</b> and <b lang="et">te</b>; <b lang="et">nende</b> has none.
        </Trans>,
        <Trans key="3">
          Ask whose with <b lang="et">kelle</b>: <b lang="et">Kelle raamat see on?</b> means “Whose
          book is this?”
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
          A name ending in a vowel usually stays as it is: <b lang="et">Mari raamat</b>. A name
          ending in a consonant gains a vowel: <b lang="et">Jaani kass</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "my-your",
          title: t`My, your and their`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In lesson {questions} you heard <Word w="Minu nimi on Mari." /> The word{" "}
                    <Word w="minu" />, my, is <Word w="mina" /> in the form that says whose. That
                    form is the genitive.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Every pronoun has a genitive, and it goes before the thing it owns. Tap a form
                    to hear it.
                  </Trans>
                </p>
              </Prose>
              <WhoseTable />
              <Aside>
                <Trans>
                  <span lang="et">Minu</span> and <span lang="et">sinu</span> often shorten to{" "}
                  <Word w="mu" /> and <Word w="su" />. <span lang="et">Tema</span>,{" "}
                  <span lang="et">meie</span> and <span lang="et">teie</span> shorten to{" "}
                  <span lang="et">ta, me</span> and <span lang="et">te</span>, the same short forms
                  you met for he or she, we and you. Lesson {questions} used{" "}
                  <span lang="et">su</span>: <Word w="Mis su nimi on?" /> means “What’s your name?”
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
                    <Trans>Tap the Whose column above once more, then try again.</Trans>
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
                    <Word w="Mari raamat" /> is Mari’s book. Estonian adds no ’s, and{" "}
                    <span lang="et">Mari</span> stays as it is, as most names ending in a vowel do.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    A name ending in a consonant gains a vowel, often an i: <Word w="Jaan" />,{" "}
                    <Word w="Jaani" />. A country goes first in the same way, and{" "}
                    <span lang="et">Eesti</span> stays as it is:{" "}
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
                    Some words change inside before an ending: <Word w="pood" />, a shop, gives{" "}
                    <Word w="poes" />, in the shop. That changed form is the genitive too:{" "}
                    <Word w="poe uks" />, the shop door. A dictionary lists the genitive second:{" "}
                    <span lang="et">pood, poe</span>. Lesson {stems} shows how these changes work.
                  </Trans>
                </p>
                <p>
                  <Trans>Pick a kind of word and tap any form to hear it.</Trans>
                </p>
              </Prose>
              <FormTable />
              <Aside>
                <Trans>
                  Numbers have a genitive too. In lesson {time}, <Word w="kümne minuti pärast" /> is
                  in ten minutes: <span lang="et">kümne</span> is the genitive of{" "}
                  <span lang="et">kümme</span>, and <span lang="et">minuti</span> of{" "}
                  <span lang="et">minut</span>.
                </Trans>
              </Aside>
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
                    Each round gives a word and the noun it owns. Type the word’s genitive, the form
                    that goes in front, and hear the phrase. If you know the word with{" "}
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
                rounds={OMASTAV_PHRASES.length}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All of them. You made the genitive every time.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>
                      Go through the three kinds of word above once more, then try again.
                    </Trans>
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
          id: "who-or-whose",
          title: t`Who or whose?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Mina" /> is I, the one who does something:{" "}
                    <Word w="Mina elan Tartus." /> <Word w="Minu" /> is my, for what you own:{" "}
                    <Word w="Minu nimi on Mari." />
                  </Trans>
                </p>
                <p>
                  <Trans>Kati writes about her family. For each gap, pick who or whose.</Trans>
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
          id: "whose-or-where",
          title: t`Whose or where?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    The genitive alone says whose: <Word w="kooli uks" />. With{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -s
                    </b>{" "}
                    or{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -l
                    </b>{" "}
                    it says where: <Word w="koolis" />. Put each word in its group. Tap a word to
                    hear it.
                  </Trans>
                </p>
              </Prose>
              <Sort
                id="whose-or-where"
                title={<Trans>Whose or where?</Trans>}
                bins={bins}
                items={sortItems()}
              />
            </>
          ),
        },
        {
          id: "say-it",
          title: t`Write it in Estonian`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Write each sentence in Estonian. Put the owner first, in the genitive.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="say-whose"
                title={<Trans>Write it in Estonian</Trans>}
                items={sayItems(i18n)}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six written right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Read the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Read “The owner comes first” once more, then try again.</Trans>
                  )
                }
                recall={sentenceRecall}
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
                    Each sentence has one word in the wrong form: who and whose mixed up, an owner
                    without the genitive, or a place without its ending. Tap it, then write the
                    right form.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-whose"
                title={<Trans>Find and fix the mistake</Trans>}
                items={fixItems(i18n)}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six found and fixed.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Look again at the ones you missed.</Trans>
                  ) : (
                    <Trans>
                      Read “Who or whose?” and “The owner comes first” once more, then try again.
                    </Trans>
                  )
                }
                recall={fixRecall}
                round={(props) => <FixRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "at-home",
          title: t`Saying whose at home`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari is at your home and asks who owns what. Answer with the genitive.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="whose-is-it"
                title={<Trans>Talk: whose is it?</Trans>}
                part={
                  <Trans>
                    You and your brother Martin share a flat and a cat, Liisu. The book is yours,
                    and the coffee is Martin’s. Mari speaks first; pick what you say back.
                  </Trans>
                }
                them={t`Mari`}
                turns={dialogue}
              />
            </>
          ),
        },
        {
          id: "listen",
          title: t`Listen: whose is it?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari looks at a picture on Jaan’s phone. Read the questions, then listen.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="jaan-picture"
                title={<Trans>Listen: Jaan’s picture</Trans>}
                clip="c-photo"
                turns={OMASTAV_TALK.turns}
                names={{ third: "Mari", fourth: "Jaan" }}
                questions={talkQuestions}
              />
            </>
          ),
        },
      ]}
    />
  );
}
