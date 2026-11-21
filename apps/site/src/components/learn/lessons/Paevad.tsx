import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { LESSONS } from "../../../lib/learn/catalogue";
import { clipId, clipUrl, WEEK } from "../../../lib/learn/clips";
import { type Day, dayChoices, weekDay } from "../../../lib/learn/days";
import { playSound, usePlaying } from "../../../lib/learn/player";
import { shuffledRun } from "../../../lib/learn/quiz";
import { Chips, Keys, Panel } from "../Explore";
import { Aside, LessonView, Prose } from "../LessonView";
import type { Glossary } from "../lesson-context";
import { OpeningHours } from "../OpeningHours";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { PlayButton, Playing } from "../Sound";
import { Word } from "../Word";

const SLUG = "paevad";
const src = (text: string) => clipUrl(SLUG, clipId(text));

const day = weekDay;

const MEANINGS: Record<Day, MessageDescriptor> = {
  esmaspäev: msg`Monday`,
  teisipäev: msg`Tuesday`,
  kolmapäev: msg`Wednesday`,
  neljapäev: msg`Thursday`,
  reede: msg`Friday`,
  laupäev: msg`Saturday`,
  pühapäev: msg`Sunday`,
};

/** The one-letter day on calendars and opening hours, Monday first. */
const LETTERS = ["E", "T", "K", "N", "R", "L", "P"] as const;

const GLOSSARY: Glossary = {
  esmaspäev: { en: MEANINGS.esmaspäev, note: msg`The first day of the week.` },
  teisipäev: { en: MEANINGS.teisipäev, note: msg`The second day of the week.` },
  kolmapäev: { en: MEANINGS.kolmapäev, note: msg`The third day of the week.` },
  neljapäev: { en: MEANINGS.neljapäev, note: msg`The fourth day of the week.` },
  reede: { en: MEANINGS.reede, note: msg`Borrowed from Low German or Old Swedish.` },
  laupäev: { en: MEANINGS.laupäev, note: msg`From a Scandinavian word: the day for washing.` },
  pühapäev: { en: MEANINGS.pühapäev, note: msg`Püha, holy, and päev, day.` },
  päev: { en: msg`day` },
  nädal: { en: msg`week` },
  esimene: { en: msg`first` },
  teine: { en: msg`second`, note: msg`Also “other”.` },
  kolm: { en: msg`three` },
  neli: { en: msg`four` },
  püha: { en: msg`holy; a holiday` },
  avatud: { en: msg`open`, note: msg`On a door or a sign.` },
  suletud: { en: msg`closed`, note: msg`On a door or a sign.` },
  täna: { en: msg`today` },
  homme: { en: msg`tomorrow` },
  eile: { en: msg`yesterday` },
  ülehomme: { en: msg`the day after tomorrow` },
  üleeile: { en: msg`the day before yesterday` },
  "mis päev täna on?": {
    en: msg`What day is it today?`,
    show: "Mis päev täna on?",
  },
  "täna on esmaspäev": { en: msg`Today is Monday.`, show: "Täna on esmaspäev." },
  esmaspäeval: {
    en: msg`on Monday`,
    note: msg`Esmaspäev with an ending that says when.`,
  },
};

/** The part of a day's name before päev, or the whole name when it has none. */
const head = (word: Day) => {
  const at = word.indexOf("päev");
  return at < 0 ? word : word.slice(0, at);
};

/** The day's word with päev in the stage's hue, so the shared half shows. */
function DayWord({ word, stacked }: { word: Day; stacked?: boolean }) {
  const at = word.indexOf("päev");
  return (
    <>
      <span className={clsx(stacked && "sm:block")}>{head(word)}</span>
      {at >= 0 && <span className={clsx("text-(--form)", stacked && "sm:block")}>päev</span>}
    </>
  );
}

/** Monday first, from the visitor's own clock, once the page is in the browser. */
function useToday(): number | null {
  const [today, setToday] = useState<number | null>(null);
  useEffect(() => setToday((new Date().getDay() + 6) % 7), []);
  return today;
}

/**
 * The week as a strip of days to tap: a row on a wide screen, a list on a phone. The first four
 * carry their number; the line under the keys says where the pressed day's name comes from.
 */
function WeekStrip({ details }: { details: readonly ReactNode[] }) {
  const { t, i18n } = useLingui();
  const today = useToday();
  const [picked, setPicked] = useState<number | null>(null);
  const shown = picked === null ? null : day(picked);
  return (
    <Panel>
      <ol className="m-0 grid list-none gap-1.5 p-0 sm:grid-cols-7">
        {WEEK.map((word, i) => (
          <li key={word} className="grid">
            <DayTile
              word={word}
              meaning={i18n._(MEANINGS[word])}
              count={i < 4 ? i + 1 : null}
              today={today === i}
              pressed={picked === i}
              onPress={() => setPicked(i)}
              // The tile shows the meaning, so its label says it too.
              label={
                today === i
                  ? t`${word}, ${i18n._(MEANINGS[word])}, today`
                  : `${word}, ${i18n._(MEANINGS[word])}`
              }
            />
          </li>
        ))}
      </ol>
      {/* The live region stays put; only what is inside it is swapped. */}
      <div aria-live="polite">
        <div key={picked ?? "empty"} className="learn-swap flex min-h-16 items-center gap-4">
          <span
            lang="et"
            aria-hidden="true"
            className="grid h-16 min-w-16 shrink-0 place-items-center rounded-tile bg-plate px-3 pb-1 text-3xl font-semibold whitespace-nowrap text-(--form) max-sm:text-2xl"
          >
            {shown ? head(shown) : "?"}
          </span>
          <span className="grid min-w-0 gap-0.5">
            <span className="text-xl font-medium">
              {shown ? (
                <>
                  <span lang="et">{shown}</span>{" "}
                  <small className="ms-1 text-md font-normal text-ink-secondary">
                    {i18n._(MEANINGS[shown])}
                  </small>
                </>
              ) : (
                t`Tap a day`
              )}
            </span>
            <span className="text-md text-ink-secondary">
              {picked === null
                ? t`You’ll hear it, and where its name comes from.`
                : details[picked]}
            </span>
          </span>
        </div>
      </div>
    </Panel>
  );
}

function DayTile(props: {
  word: Day;
  meaning: string;
  /** Its place in the week, for the four whose names count. */
  count: number | null;
  today: boolean;
  pressed: boolean;
  onPress: () => void;
  label: string;
}) {
  const { word, meaning, count, today, pressed, onPress, label } = props;
  const { i18n } = useLingui();
  const clip = src(word);
  const playing = usePlaying(clip);
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      data-playing={playing ? "" : undefined}
      onClick={() => {
        onPress();
        void playSound(clip);
      }}
      className="learn-key flex cursor-pointer items-center gap-2 rounded-tile bg-plate px-4 py-3 text-start hoverable:hover:bg-plate-hover sm:grid sm:grid-rows-[1.25rem_auto_auto] sm:justify-items-center sm:gap-1.5 sm:px-1 sm:pt-2 sm:pb-3 sm:text-center"
    >
      {/* The number and today's marker share a row of their own on a wide screen. */}
      <span className="order-2 flex items-center gap-1 max-sm:empty:hidden sm:order-first">
        {count !== null && (
          <span
            aria-hidden="true"
            className="grid size-5 place-items-center rounded-full bg-(--form-soft) text-xs font-semibold text-(--form) tabular-nums"
          >
            {count}
          </span>
        )}
        {today && (
          <span
            lang="et"
            className="rounded-full bg-(--form) px-2 text-xs leading-5 font-medium text-plate"
          >
            täna
          </span>
        )}
      </span>
      {/* Two lines tall on a wide screen; a one-line word such as reede sits in the middle. */}
      <b
        lang="et"
        className="order-1 text-lg/tight font-semibold tracking-tight sm:flex sm:min-h-[2lh] sm:flex-col sm:justify-center"
      >
        <DayWord word={word} stacked />
      </b>
      <span
        lang={i18n.locale}
        className="order-3 ms-auto flex min-h-4 items-center text-sm text-ink-muted sm:ms-0 sm:text-xs"
      >
        {playing ? <Playing className="h-3 text-(--form)" /> : meaning}
      </span>
    </button>
  );
}

/** A shop's door sign, the one the days lesson reads. */
function DoorSign() {
  const { t } = useLingui();
  return (
    <OpeningHours
      name="avatud"
      rows={[
        ["E–R", "9–18"],
        ["L", "10–16"],
        ["P", "suletud"],
      ]}
      caption={t`A shop’s opening hours`}
    />
  );
}

const RELATIVE = [
  { word: "üleeile", shift: -2 },
  { word: "eile", shift: -1 },
  { word: "täna", shift: 0 },
  { word: "homme", shift: 1 },
  { word: "ülehomme", shift: 2 },
] as const;

/** Pick today; yesterday, tomorrow and the days either side follow it. */
function TodayLine() {
  const { t, i18n } = useLingui();
  const today = useToday();
  const [picked, setPicked] = useState<number | null>(null);
  // Nothing names a day until the browser knows today's, so the page never jumps from Monday.
  const now = picked ?? today;
  const sentence = now === null ? null : `Täna on ${day(now)}.`;
  return (
    <Panel className="gap-4.5">
      <div className="flex items-center gap-3">
        {sentence ? (
          <PlayButton src={src(sentence)} label={t`Play ${sentence}`} />
        ) : (
          <span aria-hidden="true" className="size-9 shrink-0" />
        )}
        <p
          lang="et"
          aria-live={picked === null ? undefined : "polite"}
          className="text-2xl font-semibold tracking-tight"
        >
          Täna on <span className="text-(--form)">{now === null ? "…" : day(now)}</span>.
        </p>
      </div>
      <Chips
        label={t`Today is`}
        items={WEEK.map((word, i) => ({ label: word, value: i, lang: "et" }))}
        value={now}
        onPick={(i) => {
          setPicked(i);
          void playSound(src(`Täna on ${day(i)}.`));
        }}
      />
      <ol className="m-0 grid list-none gap-1.5 p-0 sm:grid-cols-5">
        {RELATIVE.map(({ word, shift }) => (
          <li key={word} className="grid">
            <RelativeDay
              word={word}
              day={now === null ? null : day(now + shift)}
              meaning={i18n._(GLOSSARY[word]?.en ?? msg`today`)}
              lit={shift === 0}
            />
          </li>
        ))}
      </ol>
    </Panel>
  );
}

function RelativeDay(props: { word: string; day: Day | null; meaning: string; lit: boolean }) {
  const { word, day: shown, meaning, lit } = props;
  const { i18n } = useLingui();
  const clip = src(word);
  const playing = usePlaying(clip);
  return (
    <button
      type="button"
      aria-current={lit ? "date" : undefined}
      data-playing={playing ? "" : undefined}
      onClick={() => void playSound(clip)}
      className={clsx(
        "learn-key grid cursor-pointer items-center gap-x-3 gap-y-1.5 rounded-tile bg-plate px-4 py-2.5 text-start hoverable:hover:bg-plate-hover max-sm:grid-cols-[7rem_minmax(0,1fr)] sm:grid-rows-[1fr_auto] sm:justify-items-center sm:px-1.5 sm:pt-3 sm:pb-3 sm:text-center",
        lit && "outline-2 outline-(--form)",
      )}
    >
      <span className="grid content-start">
        <b
          lang="et"
          className={clsx(
            "flex min-h-[1lh] items-center text-md font-semibold sm:justify-center",
            lit && "text-(--form)",
          )}
        >
          {playing ? <Playing className="h-3 text-(--form)" /> : word}
        </b>
        <small lang={i18n.locale} className="text-xs text-ink-muted">
          {meaning}
        </small>
      </span>
      <span lang="et" className="text-lg/tight font-semibold tracking-tight">
        {shown ?? "…"}
      </span>
    </button>
  );
}

export function PaevadLesson() {
  const { t, i18n } = useLingui();
  const numbers = LESSONS.find((lesson) => lesson.slug === "numbrid")?.n;
  const when = LESSONS.find((lesson) => lesson.et === "Esmaspäeval, aasta pärast")?.n;
  const meaning = (word: Day) => i18n._(MEANINGS[word]);

  // What the first half of each day's name means, in the order of the week.
  const dayTips: ReactNode[] = [
    <Trans key="1">
      The first day. Esmas- sounds like <Word w="esimene" />, first.
    </Trans>,
    <Trans key="2">
      The second day. Teisi- sounds like <Word w="teine" />, second.
    </Trans>,
    <Trans key="3">
      The third day. You can hear <Word w="kolm" />, three, from lesson {numbers}.
    </Trans>,
    <Trans key="4">
      The fourth day. You can hear <Word w="neli" />, four.
    </Trans>,
    <Trans key="5">
      Borrowed from the Low German or Old Swedish name for Friday. It’s the one day without{" "}
      <b lang="et">päev</b>.
    </Trans>,
    <Trans key="6">From a Scandinavian name: the day people washed.</Trans>,
    <Trans key="7">
      <Word w="Püha" /> means holy, so this is the holy day.
    </Trans>,
  ];
  const letterTips: Partial<Record<(typeof LETTERS)[number], ReactNode>> = {
    E: (
      <Trans>
        <i lang="et">E–R</i> on a sign: Monday to Friday.
      </Trans>
    ),
    N: (
      <Trans>
        On a toilet door, N stands for <i lang="et">naistele</i>, for women.
      </Trans>
    ),
    P: (
      <Trans>
        <i lang="et">P suletud</i> on a sign: closed on Sunday.
      </Trans>
    ),
  };

  // A round's wrong answers are picked again for every run, after the page loads, so neither
  // their pattern nor a repeat run gives the answer away. The server renders the first pick.
  const hearItem = useCallback(
    (word: Day, random?: () => number): ChoiceItem => ({
      src: src(word),
      answer: word,
      options: dayChoices(word, [], random).map((option) => ({
        id: option,
        label: <span lang={i18n.locale}>{i18n._(MEANINGS[option])}</span>,
      })),
      explain: (
        <>
          <span lang="et">{word}</span> · {i18n._(MEANINGS[word])}
        </>
      ),
    }),
    [i18n],
  );
  const hearItems = useMemo(() => WEEK.map((word) => hearItem(word, () => 0)), [hearItem]);
  const hearOrder = useCallback(
    (items: readonly ChoiceItem[], pinned?: ChoiceItem) =>
      shuffledRun(items, pinned).map((item) => hearItem(item.answer as Day)),
    [hearItem],
  );

  // Today is always among the wrong answers: it's the usual slip when asked for tomorrow.
  const tomorrowItem = useCallback(
    (today: Day, random?: () => number): ChoiceItem & { today: Day } => {
      const tomorrow = day(WEEK.indexOf(today) + 1);
      return {
        src: src(`Täna on ${today}.`),
        today,
        answer: tomorrow,
        options: dayChoices(tomorrow, [today], random).map((option) => ({
          id: option,
          label: option,
        })),
        explain: (
          <span lang="et">
            Täna on {today}, homme on {tomorrow}.
          </span>
        ),
      };
    },
    [],
  );
  const tomorrowItems = useMemo(
    () => WEEK.map((today) => tomorrowItem(today, () => 0)),
    [tomorrowItem],
  );
  const tomorrowOrder = useCallback(
    (items: readonly (ChoiceItem & { today: Day })[], pinned?: ChoiceItem & { today: Day }) =>
      shuffledRun(items, pinned).map((item) => tomorrowItem(item.today)),
    [tomorrowItem],
  );

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={<Trans>The seven days, the four that count, and how to say what day it is.</Trans>}
      facts={[
        <Trans key="m">8 minutes</Trans>,
        <Trans key="q">2 quizzes</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[...WEEK, "päev", "nädal", "täna", "homme", "eile", "ülehomme", "üleeile"]}
      recap={[
        <Trans key="1">
          The week starts on <b lang="et">esmaspäev</b>. Day names start with a small letter.
        </Trans>,
        <Trans key="2">
          Six days end in <b lang="et">päev</b>, day. <b lang="et">Reede</b> doesn’t.
        </Trans>,
        <Trans key="3">
          The first four count: <b lang="et">esmaspäev</b> is the first day, and{" "}
          <b lang="et">neljapäev</b> the fourth.
        </Trans>,
        <Trans key="4">
          Calendars and signs use one capital letter a day: <b lang="et">E T K N R L P</b>.
        </Trans>,
        <Trans key="5">
          <b lang="et">Täna</b>, <b lang="et">homme</b>, <b lang="et">eile</b>: today, tomorrow,
          yesterday. <b lang="et">Üle-</b> goes one day further.
        </Trans>,
      ]}
      sections={[
        {
          id: "week",
          title: t`Seven days`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    The Estonian week, <Word w="nädal" />, starts on Monday. Six of its days end in{" "}
                    <Word w="päev" />, day. <Word w="Reede" />, Friday, is the one that doesn’t. Day
                    names start with a small letter, like any other word.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The first four count: <Word w="esmaspäev" /> is the first day,{" "}
                    <Word w="teisipäev" /> the second, <Word w="kolmapäev" /> the third and{" "}
                    <Word w="neljapäev" /> the fourth. The other three have names of their own. Tap
                    a day to hear it and see where its name comes from.
                  </Trans>
                </p>
              </Prose>
              <WeekStrip details={dayTips} />
            </>
          ),
        },
        {
          id: "letters",
          title: t`One letter a day`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Calendars, timetables and shop doors write each day as its first letter, a
                    capital: <b lang="et">E, T, K, N, R, L, P</b>. A sign that says{" "}
                    <span lang="et" className="whitespace-nowrap">
                      E–R 9–18
                    </span>{" "}
                    is open Monday to Friday, nine to six.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    On a door you’ll also see <Word w="avatud" />, open, and <Word w="suletud" />,
                    closed.
                  </Trans>
                </p>
              </Prose>
              <Panel className="gap-5">
                <Keys
                  label={t`The days as letters`}
                  columns={7}
                  phoneColumns={7}
                  empty={{
                    title: t`Tap a letter`,
                    tip: t`You’ll hear the day it stands for.`,
                  }}
                  items={LETTERS.map((letter, i) => {
                    const word = day(i);
                    return {
                      label: letter,
                      src: src(word),
                      label2: `${letter}, ${word}`,
                      detail: {
                        title: (
                          <>
                            <span lang="et">{word}</span>{" "}
                            <small className="ms-1 text-md font-normal text-ink-secondary">
                              {meaning(word)}
                            </small>
                          </>
                        ),
                        tip: letterTips[letter] ?? null,
                      },
                    };
                  })}
                />
                <DoorSign />
              </Panel>
            </>
          ),
        },
        {
          id: "hear",
          title: t`Hear a day`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Listen and pick the day. Most of them end the same way, so listen to how each
                    one starts.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="hear-day"
                title={<Trans>Which day did you hear?</Trans>}
                items={hearItems}
                order={hearOrder}
                rounds={7}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All seven. You know the week by ear.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Listen to how the ones you missed start.</Trans>
                  ) : (
                    <Trans>Play the week above once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.answer, src: item.src })}
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "today",
          title: t`Today, tomorrow, yesterday`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    To ask what day it is, say <Word w="Mis päev täna on?" /> To answer, put the day
                    after <b lang="et">täna on</b>: <Word w="Täna on esmaspäev" />.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    <Word w="Homme" /> is tomorrow and <Word w="eile" /> yesterday. Put{" "}
                    <b lang="et">üle-</b> in front to go one day further: <Word w="ülehomme" />, the
                    day after tomorrow, and <Word w="üleeile" />, the day before yesterday. Pick a
                    day to be today.
                  </Trans>
                </p>
              </Prose>
              <TodayLine />
              <Aside>
                <Trans>
                  “On Monday” takes an ending: <Word w="esmaspäeval" />. That comes in lesson {when}
                  .
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "tomorrow",
          title: t`Count forward`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>You’ll hear what day it is today. Pick the day that comes next.</Trans>
                </p>
              </Prose>
              <Quiz
                id="tomorrow"
                title={<Trans>Which day is tomorrow?</Trans>}
                items={tomorrowItems}
                order={tomorrowOrder}
                rounds={7}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All of them. You can count the week forward.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Good. Say the week through in your head before you pick.</Trans>
                  ) : (
                    <Trans>Say the week through with the strip above, then try again.</Trans>
                  )
                }
                both={(item) => [item.src, src(`Homme on ${item.answer}.`)]}
                recall={(item) => ({ label: `${item.today} → ${item.answer}`, src: item.src })}
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
      ]}
    />
  );
}
