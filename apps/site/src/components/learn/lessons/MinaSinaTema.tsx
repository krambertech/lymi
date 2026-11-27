import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  capital,
  clipId,
  clipUrl,
  PRONOUN_BUILT,
  PRONOUN_HEARD,
  PRONOUN_PASSAGE,
  PRONOUN_SENTENCES,
  PRONOUNS,
  pronounOrders,
  pronounWithOlema,
} from "../../../lib/learn/clips";
import { playSound, toggleSound, usePlaying } from "../../../lib/learn/player";
import { eachPairFirst } from "../../../lib/learn/quiz";
import { Chips, Keys, ListenRows, Panel } from "../Explore";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Listening, type PassageQuestion } from "../Passage";
import { Answer, Feedback, type GapItem, GapRound, Quiz, type RoundProps } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { type SortBin, type SortItem, Sort } from "../Sort";
import { Listen, Playing } from "../Sound";
import { Word } from "../Word";

const SLUG = "mina-sina-tema";
const wordSrc = (word: string) => clipUrl(SLUG, clipId(word));
const pairSrc = (pronoun: string, verb: string) =>
  clipUrl(SLUG, clipId(pronounWithOlema(pronoun, verb)));
const sentenceSrc = (id: keyof typeof PRONOUN_SENTENCES) => clipUrl(SLUG, id);

type Short = (typeof PRONOUNS)[number]["short"];
type SeatId = "you" | "liis" | "mari" | "jaan" | "peeter" | "kadri";

/** What each pronoun means, how it reads with olema, and who it lights at the table. */
const PEOPLE: readonly {
  long: string;
  short: Short;
  verb: string;
  /** The pronoun alone, short enough for an answer button. */
  means: MessageDescriptor;
  /** The pronoun with its olema. */
  is: MessageDescriptor;
  who: MessageDescriptor;
  seats: readonly SeatId[];
}[] = [
  {
    ...PRONOUNS[0],
    means: msg`I`,
    is: msg`I am`,
    who: msg`You, the one speaking.`,
    seats: ["you"],
  },
  {
    ...PRONOUNS[1],
    means: msg`you`,
    is: msg`you are`,
    who: msg`One person you’re talking to, such as Mari.`,
    seats: ["mari"],
  },
  {
    ...PRONOUNS[2],
    means: msg`he or she`,
    is: msg`he or she is`,
    who: msg`Someone else, a man or a woman: one word for both.`,
    seats: ["peeter"],
  },
  {
    ...PRONOUNS[3],
    means: msg`we`,
    is: msg`we are`,
    who: msg`You and someone else.`,
    seats: ["you", "liis"],
  },
  {
    ...PRONOUNS[4],
    means: msg`you all`,
    is: msg`you are, to more than one; polite you are`,
    who: msg`The people you’re talking to, or one person, politely.`,
    seats: ["mari", "jaan"],
  },
  {
    ...PRONOUNS[5],
    means: msg`they`,
    is: msg`they are`,
    who: msg`Other people, not the ones you’re talking to.`,
    seats: ["peeter", "kadri"],
  },
];

/** Six places round an oval table, in percent of its box. A seat on its own is its pronoun. */
const SEATS: readonly { id: SeatId; x: number; y: number; alone: Short }[] = [
  { id: "you", x: 50, y: 88, alone: "ma" },
  { id: "liis", x: 15, y: 69, alone: "ta" },
  { id: "mari", x: 15, y: 31, alone: "sa" },
  { id: "jaan", x: 50, y: 12, alone: "sa" },
  { id: "peeter", x: 85, y: 31, alone: "ta" },
  { id: "kadri", x: 85, y: 69, alone: "ta" },
];
const NAMES: Record<Exclude<SeatId, "you">, string> = {
  liis: "Liis",
  mari: "Mari",
  jaan: "Jaan",
  peeter: "Peeter",
  kadri: "Kadri",
};

const GLOSSARY: Glossary = {
  mina: { en: msg`I`, note: msg`The short form is ma.` },
  ma: { en: msg`I`, note: msg`Short for mina.` },
  sina: { en: msg`you, to one person`, note: msg`The short form is sa.` },
  sa: { en: msg`you, to one person`, note: msg`Short for sina.` },
  tema: { en: msg`he or she`, note: msg`The short form is ta.` },
  ta: { en: msg`he or she`, note: msg`Short for tema.` },
  meie: { en: msg`we`, note: msg`The short form is me.` },
  me: { en: msg`we`, note: msg`Short for meie.` },
  teie: {
    en: msg`you, to more than one; polite you`,
    note: msg`The short form is te.`,
  },
  te: { en: msg`you, to more than one; polite you`, note: msg`Short for teie.` },
  nemad: { en: msg`they`, note: msg`The short form is nad.` },
  nad: { en: msg`they`, note: msg`Short for nemad.` },
  olema: { en: msg`to be` },
  olen: { en: msg`I am` },
  oled: { en: msg`you are` },
  on: { en: msg`he or she is; they are` },
  oleme: { en: msg`we are` },
  olete: { en: msg`you are, to more than one; polite you are` },
  ...Object.fromEntries(
    PEOPLE.flatMap((person) =>
      [person.long, person.short].map((form) => [
        `${form} ${person.verb}`,
        { en: person.is, show: pronounWithOlema(form, person.verb) },
      ]),
    ),
  ),
  "kes? mina!": { en: msg`Who? Me!`, show: "Kes? Mina!", clip: "c-kes" },
  valmis: { en: msg`ready` },
  väsinud: { en: msg`tired` },
  õpetaja: { en: msg`teacher` },
  õpetajad: { en: msg`teachers` },
  kodus: { en: msg`at home` },
  sõbrad: { en: msg`friends` },
  ja: { en: msg`and` },
  "ma olen valmis": { en: msg`I’m ready.`, show: "Ma olen valmis.", clip: "s-ma-valmis" },
  "mina olen liis ja tema on peeter": {
    en: msg`I’m Liis, and he’s Peeter.`,
    note: msg`Long forms, because the two people are set side by side.`,
    show: "Mina olen Liis ja tema on Peeter.",
    clip: "c-liis",
  },
};

const WHO: readonly { id: keyof typeof PRONOUN_SENTENCES; who: Short; en: MessageDescriptor }[] = [
  { id: "s-olen-kodus", who: "ma", en: msg`I’m at home.` },
  { id: "s-ma-valmis", who: "ma", en: msg`I’m ready.` },
  { id: "s-oled-tubli", who: "sa", en: msg`You’re doing great.` },
  { id: "s-sa-sober", who: "sa", en: msg`You’re a good friend.` },
  { id: "s-ta-opetaja", who: "ta", en: msg`He or she is a teacher.` },
  { id: "s-ta-vasinud", who: "ta", en: msg`He or she is tired.` },
  { id: "s-oleme-valmis", who: "me", en: msg`We’re ready.` },
  { id: "s-me-sobrad", who: "me", en: msg`We’re friends.` },
  { id: "s-olete-tublid", who: "te", en: msg`You’re all doing great.` },
  { id: "s-te-opetajad", who: "te", en: msg`You’re teachers.` },
  { id: "s-nad-kodus", who: "nad", en: msg`They’re at home.` },
  { id: "s-nad-vasinud", who: "nad", en: msg`They’re tired.` },
];

const KEEP_OR_DROP: readonly (keyof typeof PRONOUN_SENTENCES)[] = [
  "s-ma-valmis",
  "s-ta-opetaja",
  "s-sa-sober",
  "s-nad-kodus",
  "s-me-sobrad",
  "s-ta-vasinud",
  "s-te-opetajad",
  "s-nad-vasinud",
];

/** The endings a gap offers: the answer and two near misses, so three fit on a phone. */
const ENDINGS = ["n", "d", "me", "te"] as const;
const LEAVE_OUT: Record<string, readonly string[]> = { n: ["te"], d: ["me"], me: ["d"], te: ["n"] };

/** A form of olema with its ending in the stage's hue; on, which has none, is lit whole. */
function Olema({ verb }: { verb: string }) {
  if (!verb.startsWith("ole")) return <span className="text-(--form)">{verb}</span>;
  return (
    <>
      ole<span className="text-(--form)">{verb.slice(3)}</span>
    </>
  );
}

/** One pronoun form to tap. The short one, the everyday one, is in the stage's hue. */
function Form({ word, short }: { word: string; short?: boolean }) {
  const { t } = useLingui();
  const src = wordSrc(word);
  const playing = usePlaying(src);
  return (
    <button
      type="button"
      aria-label={t`Play ${word}`}
      data-playing={playing ? "" : undefined}
      onClick={() => void toggleSound(src)}
      className={clsx(
        "learn-key grid h-11 cursor-pointer place-items-center rounded-tile bg-plate px-2 text-xl font-semibold tracking-tight hoverable:hover:bg-plate-hover",
        short && "text-(--form)",
      )}
    >
      <span lang="et">{word}</span>
    </button>
  );
}

/** The six pronouns in two rows, one person and more than one, each long over short. */
function Pronouns() {
  const { i18n } = useLingui();
  const row = (people: typeof PEOPLE) => (
    <div className="grid grid-cols-3 gap-2.5 max-sm:gap-1.5">
      {people.map((person) => (
        <div key={person.short} className="grid content-start gap-1.5">
          <span className="ps-1 text-sm text-ink-secondary">{i18n._(person.means)}</span>
          <Form word={person.long} />
          <Form word={person.short} short />
        </div>
      ))}
    </div>
  );
  return (
    <Panel className="gap-5">
      <div className="grid gap-2">
        <h3 className="text-md font-medium">
          <Trans>One person</Trans>
        </h3>
        {row(PEOPLE.slice(0, 3))}
      </div>
      <div className="grid gap-2">
        <h3 className="text-md font-medium">
          <Trans>More than one</Trans>
        </h3>
        {row(PEOPLE.slice(3))}
      </div>
    </Panel>
  );
}

/** A seat at the table: tap it to hear the pronoun for that person alone. */
function Seat(props: {
  x: number;
  y: number;
  name: string;
  you: boolean;
  lit: boolean;
  dim: boolean;
  onPick: () => void;
}) {
  const { x, y, name, you, lit, dim, onPick } = props;
  return (
    <button
      type="button"
      aria-pressed={lit}
      onClick={onPick}
      style={{ insetInlineStart: `${x}%`, top: `${y}%` }}
      className={clsx(
        "absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-200",
        lit
          ? "bg-(--form) text-plate"
          : clsx(
              "bg-plate hoverable:hover:bg-plate-hover",
              you ? "ring-2 ring-(--form)" : "ring-1 ring-edge-strong",
              dim ? "text-ink-muted" : "text-ink",
            ),
      )}
    >
      {name}
    </button>
  );
}

function PronounKey(props: {
  word: string;
  means: string;
  src: string;
  pressed: boolean;
  onPress: () => void;
}) {
  const { word, means, src, pressed, onPress } = props;
  const playing = usePlaying(src);
  return (
    <button
      type="button"
      aria-pressed={pressed}
      data-playing={playing ? "" : undefined}
      onClick={onPress}
      className="learn-key grid cursor-pointer justify-items-center gap-0.5 rounded-tile bg-plate px-1 pt-2.5 pb-2 hoverable:hover:bg-plate-hover"
    >
      <b lang="et" className="text-2xl/none font-semibold tracking-tight">
        {word}
      </b>
      <span className="grid min-h-4 place-items-center">
        {playing ? (
          <Playing className="h-3 text-(--form)" />
        ) : (
          <small className="text-xs leading-tight text-ink-muted">{means}</small>
        )}
      </span>
    </button>
  );
}

/**
 * People round a table: a pronoun lights who it means, and a seat on its own picks its pronoun.
 * Each plays the pronoun with its olema.
 */
function Table() {
  const { t, i18n } = useLingui();
  const [picked, setPicked] = useState<number | null>(null);
  /** A seat tapped on its own lights only itself; a pronoun lights everyone it means. */
  const [seat, setSeat] = useState<SeatId | null>(null);
  const [long, setLong] = useState(false);
  const person = picked === null ? undefined : PEOPLE[picked];
  const lit = new Set<SeatId>(seat ? [seat] : (person?.seats ?? []));
  const say = (i: number, inLong: boolean) => {
    const each = PEOPLE[i];
    if (each) void playSound(pairSrc(inLong ? each.long : each.short, each.verb));
  };
  const pick = (i: number, from: SeatId | null = null) => {
    setPicked(i);
    setSeat(from);
    say(i, long);
  };
  return (
    <Panel className="gap-5">
      <div className="grid items-center gap-5 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="relative aspect-[4/3] w-full">
          <div
            aria-hidden="true"
            className="@container absolute inset-x-[25%] inset-y-[26%] grid place-items-center rounded-[50%] bg-plate shadow-[0_0_0_1px_var(--edge),0_10px_24px_-16px_oklch(0.2_0.03_60/0.35)]"
          >
            {person && (
              <div key={`${picked}-${long}`} className="learn-swap">
                <span
                  lang="et"
                  className="block text-[clamp(1rem,16cqi,1.75rem)] leading-none font-semibold tracking-tight whitespace-nowrap"
                >
                  {capital(long ? person.long : person.short)} <Olema verb={person.verb} />
                </span>
              </div>
            )}
          </div>
          {SEATS.map((place) => (
            <Seat
              key={place.id}
              x={place.x}
              y={place.y}
              name={place.id === "you" ? t`You` : NAMES[place.id]}
              you={place.id === "you"}
              lit={lit.has(place.id)}
              dim={person !== undefined}
              onPick={() =>
                pick(
                  PEOPLE.findIndex((each) => each.short === place.alone),
                  place.id,
                )
              }
            />
          ))}
        </div>
        <div className="grid gap-3.5">
          <Chips
            label={t({ message: "Form", context: "pronoun form" })}
            items={[
              { label: t({ message: "Short", context: "pronoun form" }), value: "short" },
              { label: t({ message: "Long", context: "pronoun form" }), value: "long" },
            ]}
            value={long ? "long" : "short"}
            onPick={(value) => {
              const next = value === "long";
              setLong(next);
              if (picked !== null) say(picked, next);
            }}
          />
          <fieldset className="m-0 grid min-w-0 grid-cols-3 gap-1.5 border-0 p-0">
            <legend className="sr-only">{t`Pronouns`}</legend>
            {PEOPLE.map((each, i) => {
              const word = long ? each.long : each.short;
              return (
                <PronounKey
                  key={each.short}
                  word={word}
                  means={i18n._(each.means)}
                  src={pairSrc(word, each.verb)}
                  pressed={picked === i}
                  onPress={() => pick(i)}
                />
              );
            })}
          </fieldset>
        </div>
      </div>
      <div aria-live="polite" className="min-h-13">
        {person ? (
          <p key={`${picked}-${long}`} className="learn-swap grid gap-0.5">
            <span className="text-xl font-medium">
              <span lang="et">
                {pronounWithOlema(long ? person.long : person.short, person.verb)}
              </span>
              <small className="ms-2 text-md font-normal text-ink-secondary">
                {i18n._(person.is)}
              </small>
            </span>
            <span className="text-md text-ink-secondary">{i18n._(person.who)}</span>
          </p>
        ) : (
          <p className="grid gap-0.5">
            <span className="text-xl font-medium">
              <Trans>Tap a word or a person</Trans>
            </span>
            <span className="text-md text-ink-secondary">
              <Trans>The table lights up who the word means.</Trans>
            </span>
          </p>
        )}
      </div>
    </Panel>
  );
}

interface WhoItem {
  src: string;
  /** Keyed by pronoun, so a run hears each pronoun once before any comes back. */
  pair: readonly [string, string];
  said: string;
  answer: Short;
  en: MessageDescriptor;
}

/** Hear a sentence, then pick who it is about from the six pronouns, laid out as in the table. */
function WhoRound({ item, state, heard, answer, autoplay }: RoundProps<WhoItem>) {
  const { t, i18n } = useLingui();
  const [nudged, setNudged] = useState(false);
  const round = state.status === "asking" || state.status === "answered" ? state.round : -1;
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- a new round replays even when its clip is the last one's
  useEffect(() => {
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
        {PEOPLE.map((person) => (
          <Answer
            key={person.short}
            label={person.short}
            sub={i18n._(person.means)}
            mark={
              !done
                ? undefined
                : person.short === item.answer
                  ? "right"
                  : person.short === picked
                    ? "wrong"
                    : "out"
            }
            onPick={() => {
              if (done) return;
              if (state.status === "asking" && !state.heard) return setNudged(true);
              answer(person.short, person.short === item.answer);
            }}
          />
        ))}
      </fieldset>
      {done && (
        <Feedback right={state.right}>
          <span lang="et" className="font-medium text-ink">
            {item.said}
          </span>{" "}
          {i18n._(item.en)}
        </Feedback>
      )}
    </>
  );
}

const verdict = (share: number): ReactNode =>
  share === 1 ? (
    <Trans>All of them. You can hear who it’s about.</Trans>
  ) : share >= 0.7 ? (
    <Trans>Most of them. Play the ones you missed once more.</Trans>
  ) : (
    <Trans>Listen to the end of the verb. Try the table above, then come back.</Trans>
  );

export function MinaSinaTemaLesson() {
  const { t, i18n } = useLingui();
  const regularVerbs = lessonBySlug("olevik")?.n;

  const whoItems = useMemo<WhoItem[]>(
    () =>
      WHO.map((each) => ({
        src: sentenceSrc(each.id),
        pair: [each.who, each.id] as const,
        said: PRONOUN_SENTENCES[each.id],
        answer: each.who,
        en: each.en,
      })),
    [],
  );

  const gapItems = useMemo<(GapItem & { said: string; pair: readonly [string, string] })[]>(
    () =>
      PEOPLE.filter((person) => person.verb !== "on").flatMap((person) =>
        [person.short, person.long].map((form) => ({
          src: pairSrc(form, person.verb),
          before: `${capital(form)} ole`,
          after: "",
          options: ENDINGS.filter((ending) => !LEAVE_OUT[person.verb.slice(3)]?.includes(ending)),
          answer: person.verb.slice(3),
          said: pronounWithOlema(form, person.verb),
          pair: [person.verb, form] as const,
          explain: (
            <>
              <Word w={pronounWithOlema(form, person.verb)} /> {i18n._(person.is)}
            </>
          ),
        })),
      ),
    [i18n],
  );

  const endings = useMemo(
    () =>
      [
        { label: "-n", verb: "olen", tip: t`The ending for ma, I.` },
        { label: "-d", verb: "oled", tip: t`The ending for sa, you.` },
        { label: "on", verb: "on", tip: t`No ending. Ta on and nad on: he or she is, they are.` },
        { label: "-me", verb: "oleme", tip: t`The ending for me, we.` },
        {
          label: "-te",
          verb: "olete",
          tip: t`The ending for te: you, to more than one; polite you.`,
        },
      ].map(({ label, verb, tip }) => {
        const gloss = GLOSSARY[verb];
        return {
          label,
          sub: <Olema verb={verb} />,
          src: wordSrc(verb),
          label2: `${label}, ${verb}`,
          detail: {
            title: (
              <>
                <span lang="et">
                  <Olema verb={verb} />
                </span>{" "}
                <small className="ms-1 text-md font-normal text-ink-secondary">
                  {gloss ? i18n._(gloss.en) : ""}
                </small>
              </>
            ),
            tip,
          },
        };
      }),
    [t, i18n],
  );

  const formItems = useMemo<(FormItem & { pair: readonly [string, string] })[]>(
    () =>
      PEOPLE.flatMap((person) =>
        [person.short, person.long].map((form) => ({
          base: "olema",
          gloss: t`to be`,
          cue: form,
          cueLang: "et",
          answers: [person.verb],
          src: pairSrc(form, person.verb),
          said: pronounWithOlema(form, person.verb),
          pair: [person.short, form] as const,
          explain: (
            <>
              <span lang="et" className="font-medium text-ink">
                {pronounWithOlema(form, person.verb)}
              </span>{" "}
              {i18n._(person.is)}
            </>
          ),
        })),
      ),
    [t, i18n],
  );

  const sortBins = useMemo<SortBin[]>(
    () => [
      {
        id: "drop",
        label: t`The pronoun can go`,
        lang: i18n.locale,
        rule: (
          <Trans>
            <span lang="et">Olen, oled, oleme, olete</span>: the ending says who.
          </Trans>
        ),
      },
      {
        id: "keep",
        label: t`The pronoun usually stays`,
        lang: i18n.locale,
        rule: (
          <Trans>
            <span lang="et">On</span> has no ending, so here only <span lang="et">ta</span> or{" "}
            <span lang="et">nad</span> says who.
          </Trans>
        ),
      },
    ],
    [t, i18n],
  );
  const sortItems = useMemo<SortItem[]>(
    () =>
      KEEP_OR_DROP.map((id) => {
        const said = PRONOUN_SENTENCES[id];
        return { w: said, bin: said.includes(" on ") ? "keep" : "drop", src: sentenceSrc(id) };
      }),
    [],
  );

  const writtenItems = useMemo<(SentenceItem & { pair: readonly [string, string] })[]>(
    () =>
      PRONOUN_HEARD.map(({ said, who }) => ({
        kind: "dictation" as const,
        id: `write-${clipId(said)}`,
        src: wordSrc(said),
        answers: [said],
        pair: [who, said] as const,
      })),
    [],
  );

  const builtItems = useMemo<(SentenceItem & { pair: readonly [string, string] })[]>(
    () =>
      PRONOUN_BUILT.slice(0, 6).map(({ pronoun, word, said }) => ({
        kind: "build" as const,
        id: `build-${pronoun}`,
        words: [pronoun, "olema", word],
        src: wordSrc(said),
        answers: pronounOrders(said),
        pair: [pronoun, said] as const,
      })),
    [],
  );

  const passageQuestions = useMemo<PassageQuestion[]>(
    () => [
      {
        id: "liis",
        ask: t`What does Liis say about herself?`,
        options: [
          { id: "home", label: t`She’s at home.` },
          { id: "teacher", label: t`She’s a teacher.` },
          { id: "tired", label: t`She’s tired.` },
        ],
        answer: "teacher",
        line: 1,
      },
      {
        id: "peeter",
        ask: t`What does Liis say about Peeter?`,
        options: [
          { id: "teacher", label: t`He’s a teacher.` },
          { id: "home", label: t`He’s at home.` },
          { id: "tired", label: t`He’s tired.` },
        ],
        answer: "tired",
        line: 3,
      },
      {
        id: "friends",
        kind: "truefalse",
        ask: t`Liis and Peeter are friends.`,
        answer: true,
        line: 4,
      },
      {
        id: "where",
        kind: "truefalse",
        ask: t`Mari and Jaan are at school.`,
        answer: false,
        line: 5,
      },
    ],
    [t],
  );

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Six words for people, each with a long and a short form, and olema, to be, whose ending
          usually tells you who.
        </Trans>
      }
      facts={[
        <Trans key="m">15 minutes</Trans>,
        <Trans key="q">5 quizzes, a sort and a passage</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "mina",
        "sina",
        "tema",
        "meie",
        "teie",
        "nemad",
        "olema",
        "olen",
        "oled",
        "on",
        "oleme",
        "olete",
        "kodus",
        "valmis",
        "väsinud",
        "õpetaja",
      ]}
      recap={[
        <Trans key="1">
          As the subject, each pronoun has two forms. Usually say the short one, <b lang="et">ma</b>
          , and keep the long one, <b lang="et">mina</b>, for stress.
        </Trans>,
        <Trans key="2">
          <b lang="et">Ta</b> is both he and she. <b lang="et">Te</b> is you, to more than one, and
          polite you to one person.
        </Trans>,
        <Trans key="3">
          The forms of olema, to be: <b lang="et">olen, oled, on, oleme, olete, on</b>.
        </Trans>,
        <Trans key="4">
          Where the ending tells who, the pronoun can go: <b lang="et">Olen Mari.</b>
        </Trans>,
        <Trans key="5">
          <b lang="et">On</b> is both he or she is and they are. Usually only the pronoun tells them
          apart.
        </Trans>,
      ]}
      sections={[
        {
          id: "pronouns",
          title: t`Six pronouns, two forms`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Estonian has six words for people, and as the subject each comes in a long and a
                    short form that mean the same. <Word w="Mina" /> and <Word w="ma" /> are both I.
                    The short one, in colour below, is the one you’ll hear most. Tap any word.
                  </Trans>
                </p>
              </Prose>
              <Pronouns />
              <Prose>
                <p>
                  <Trans>
                    Say the long form when the pronoun carries the stress: when it stands alone, or
                    when you set one person against another. <Word w="Kes? Mina!" />
                  </Trans>
                </p>
              </Prose>
              <Aside>
                <Trans>
                  <Word w="Tema" /> is he and she alike; Estonian pronouns have no gender.{" "}
                  <Word w="Teie" /> is also the polite you to one person, like French vous.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "olema",
          title: t`Olema, to be`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Olema" /> means to be. Its ending changes with the person:{" "}
                    <Word w="olen" /> is I am, <Word w="oled" /> is you are. Tap an ending.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Keys
                  label={t`Endings of olema`}
                  columns={5}
                  phoneColumns={3}
                  empty={{
                    title: t`Tap an ending`,
                    tip: t`You’ll hear the form and who it’s for.`,
                  }}
                  items={endings}
                />
              </Panel>
              <Prose>
                <p>
                  <Trans>
                    Because the ending already says who, the pronoun can go. Both lines below mean
                    I’m Mari. A sentence can drop the pronoun, but usually not the verb.
                  </Trans>
                </p>
              </Prose>
              <ListenRows
                items={(["c-mari", "c-olen-mari"] as const).map((id) => ({
                  main: PRONOUN_SENTENCES[id],
                  sub: t`I’m Mari.`,
                  src: sentenceSrc(id),
                }))}
              />
              <Aside>
                <Trans>
                  <Word w="On" /> has no ending, and it serves both he or she and they. That makes{" "}
                  <Word w="olema" /> irregular: other verbs add an ending there too, as lesson{" "}
                  {regularVerbs} shows.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "table",
          title: t`Round the table`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    You sit at the bottom, talking to Mari and Jaan across the table. Liis and Kadri
                    sit either side of you, and Peeter on the right. Tap a word to see who it means,
                    or tap a person.
                  </Trans>
                </p>
              </Prose>
              <Table />
              <Aside>
                <Trans>
                  Setting two people side by side usually takes the long forms:{" "}
                  <Word w="Mina olen Liis ja tema on Peeter" />
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "who",
          title: t`Who is it about?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Hear a sentence and pick who it’s about. Some drop the pronoun, so listen to the
                    end of the verb. With <Word w="on" />, only the pronoun tells <Word w="ta" />{" "}
                    from <Word w="nad" />.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="who"
                title={<Trans>Who is it about?</Trans>}
                items={whoItems}
                rounds={6}
                verdict={verdict}
                recall={(item) => ({ label: item.said, src: item.src })}
                order={eachPairFirst}
                round={(props) => <WhoRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "endings",
          title: t`Fill the ending`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Pick the ending that goes with the pronoun, then hear the sentence.</Trans>
                </p>
              </Prose>
              <Quiz
                id="olema-endings"
                title={<Trans>Which ending?</Trans>}
                items={gapItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six. Every ending was right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Tap the endings above once more.</Trans>
                  ) : (
                    <Trans>Go back to the endings above, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: item.src })}
                order={eachPairFirst}
                round={(props) => <GapRound {...props} listen="after" />}
              />
            </>
          ),
        },
        {
          id: "type",
          title: t`Type the form`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Now type the form of <Word w="olema" /> for each pronoun. A long pronoun takes
                    the same form as its short one.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="type-olema"
                title={<Trans>Type the form</Trans>}
                items={formItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>
                      All six, each with the right form of <span lang="et">olema</span>.
                    </Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Tap the endings above once more.</Trans>
                  ) : (
                    <Trans>Go back to the endings above, then try again.</Trans>
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
          id: "drop",
          title: t`When the pronoun can go`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Olen" /> can only mean I am, so <Word w="ma" /> can go. <Word w="On" />{" "}
                    means both he or she is and they are, so <Word w="ta" /> or <Word w="nad" />{" "}
                    usually has to stay.
                  </Trans>
                </p>
                <p>
                  <Trans>Put each sentence where it belongs. Tap a sentence to hear it.</Trans>
                </p>
              </Prose>
              <Sort
                id="sort-pronoun"
                title={<Trans>Can the pronoun go?</Trans>}
                bins={sortBins}
                items={sortItems}
              />
            </>
          ),
        },
        {
          id: "write",
          title: t`Write what you hear`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Hear a sentence and write it. Some have no pronoun, so write only what you hear.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="write-olema"
                title={<Trans>Write the sentence</Trans>}
                items={writtenItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six, every word in place.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Try again, and tap Slower before you write each sentence.</Trans>
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
          id: "build",
          title: t`Make a sentence`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each round gives a pronoun, <Word w="olema" /> and a word. Change{" "}
                    <span lang="et">olema</span> to the form for that pronoun and write the
                    sentence: <span lang="et">ma · olema · valmis</span> is{" "}
                    <Word w="Ma olen valmis" />.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="build-olema"
                title={<Trans>Make a sentence</Trans>}
                items={builtItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six sentences, each with the right form.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>
                      Nearly. Check the form of <span lang="et">olema</span> in the ones you missed.
                    </Trans>
                  ) : (
                    <Trans>Type the forms above once more, then try again.</Trans>
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
          id: "listen",
          title: t`Listening: Liis introduces people`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Liis says who she is, who Peeter is, and where Mari and Jaan are. Listen for the
                    pronoun and the form of <Word w="olema" />.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="liis-and-friends"
                title={<Trans>Listen: Liis introduces people</Trans>}
                clip="p-liis"
                sentences={PRONOUN_PASSAGE}
                questions={passageQuestions}
              />
            </>
          ),
        },
      ]}
    />
  );
}
