import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { ANALYTICS_READY } from "@lymi/client/analytics";
import {
  DAILY_GOAL_PRESETS,
  LANGUAGE_TAGS,
  type LearningKind,
  STARTING_DAILY_GOAL,
} from "@lymi/core";
import { type PublicDeckSummary, shelvesOf, subjectOf, taughtLanguage } from "@lymi/core/catalog";
import { CHOICE_POP, endEmbers } from "@lymi/design";
import { clsx } from "clsx";
import {
  Bot,
  Check,
  ClipboardCheck,
  Download,
  Globe,
  Languages,
  Layers,
  PenLine,
  Search,
  Shapes,
} from "lucide-react";
import { AnimatePresence, motion, type Transition, type Variants } from "motion/react";
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { Avatar } from "../components/avatar";
import { Button } from "../components/button";
import { Chip } from "../components/chip";
import { languageName } from "../components/deck-fields";
import { DeckMeta, DeckTray } from "../components/deck-tray";
import { GOAL_NAMES } from "../components/goal-picker";
import { Lantern } from "../components/lantern";
import { LanternLight } from "../components/lantern-light";
import { Screen, ScreenBar } from "../components/layout/screen";
import { PublisherMark } from "../components/publisher-mark";
import { Input } from "../components/ui/input";
import { RadioGroup } from "../components/ui/radio-group";
import type { DeckSummary } from "../lib/api";
import { captureAnalytics } from "../lib/telemetry";
import { useReduceMotion } from "../lib/use-reduce-motion";
import { BackButton } from "./shell";

/** How a learner without decks gets started: bring their own, or add a ready-made deck. */
export type Own = "import" | "assistant" | "type";
export type WelcomeStart = { kind: "deck"; deck: PublicDeckSummary } | { kind: "own"; own: Own };

/** A deck an invitation or a public page added while signing up. */
export type JoinedDeck = Pick<
  DeckSummary,
  "name" | "defaultLanguage" | "total" | "owner" | "published"
>;

export interface WelcomeAnswers {
  learningKind: LearningKind;
  learningLanguage: string | null;
  dailyGoal: number;
  start: WelcomeStart;
}

interface Props {
  /** Explore's decks in the learner's meaning language; undefined while they load. */
  catalog: PublicDeckSummary[] | undefined;
  meaningLanguage: string;
  onFinish: (answers: WelcomeAnswers) => void;
  /** Welcome then opens on this deck and asks only the daily goal. */
  joined?: JoinedDeck | undefined;
  /** Finishing when `joined` is set. */
  onChooseGoal?: ((dailyGoal: number) => void) | undefined;
  onSkip: (step: Step) => void;
  /** The final press is saving and, for a deck, adding it. */
  busy?: boolean | undefined;
  /** What went wrong with the final press, in the learner's language. */
  error?: string | null | undefined;
}

export type Step = "hello" | "kind" | "language" | "goal" | "start";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Twelve languages as pills; the rest of the catalogue's languages sit behind Another language. */
const PILLS = 12;
/** A start step shows at most four decks: two rows of two. */
const START_DECKS = 4;
/** Shelves a test deck sits on; every other subject is a subject. */
const TEST_CATEGORIES = ["citizenship", "driving"];

// Minutes are a rough guide: about twenty seconds a review, rounded to a figure that reads as one.
const MINUTES: Record<(typeof DAILY_GOAL_PRESETS)[number], number> = {
  10: 3,
  25: 8,
  50: 15,
  100: 30,
};

function decksFor(
  catalog: PublicDeckSummary[],
  kind: LearningKind | null,
  language: string | null,
) {
  if (kind === "language") return catalog.filter((d) => taughtLanguage(d) === language);
  if (kind === "test") return catalog.filter((d) => TEST_CATEGORIES.includes(d.category ?? ""));
  if (kind === "subject") {
    return catalog.filter((d) => subjectOf(d) && !TEST_CATEGORIES.includes(d.category ?? ""));
  }
  return [];
}

interface Progress {
  trail: Step[];
  kind: LearningKind | null;
  language: string | null;
  goal: number;
}

// A reload keeps the answers in this tab, a convenience only: nothing here is the learner's record.
const PROGRESS_KEY = "lymi-welcome";

function readProgress(): Progress | null {
  try {
    const raw = sessionStorage.getItem(PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as Progress) : null;
  } catch {
    return null;
  }
}

// Back revisits a step, so each step is reported once per page load until Welcome ends.
const viewedSteps = new Set<Step>();
const finishedSteps = new Set<Step>();

export function finishWelcomeStep(step: Step, skipped: boolean) {
  if (finishedSteps.has(step)) return;
  if (captureAnalytics("welcome_step_finished", { step_name: step, skipped }))
    finishedSteps.add(step);
}

/** Called once Welcome is finished or skipped, so a later visit in this tab starts clean. */
export function clearWelcomeProgress() {
  viewedSteps.clear();
  finishedSteps.clear();
  try {
    sessionStorage.removeItem(PROGRESS_KEY);
  } catch {
    // Nothing was kept.
  }
}

function writeProgress(progress: Progress) {
  try {
    sessionStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Private windows and blocked storage simply start again after a reload.
  }
}

/** One deck from each of the first shelves, so a learner with nothing matched sees the range. */
function sampler(catalog: PublicDeckSummary[]) {
  return shelvesOf(catalog)
    .flatMap((shelf) => shelf.decks.slice(0, 1))
    .slice(0, START_DECKS);
}

/** Languages with decks, most decks first, leaving out the language meanings are written in. */
function catalogLanguages(catalog: PublicDeckSummary[], meaningLanguage: string) {
  return shelvesOf(catalog).flatMap((shelf) =>
    shelf.language && shelf.language !== meaningLanguage ? [shelf.language] : [],
  );
}

/**
 * Getting set up: what the learner is learning, a daily goal, and a way to start. Shown once to
 * an account with nothing in it, before Today. docs/design/onboarding.md.
 */
export function WelcomeView({
  catalog,
  meaningLanguage,
  onFinish,
  joined,
  onChooseGoal,
  onSkip,
  busy,
  error,
}: Props) {
  const { t, i18n } = useLingui();
  const reduce = useReduceMotion();
  const shortcut = joined !== undefined;
  // The shortcut is two short screens with its deck on the URL, so a reload has nothing to restore.
  const [saved] = useState(() => (shortcut ? null : readProgress()));
  const [trail, setTrail] = useState<Step[]>(saved?.trail ?? ["hello"]);
  const [dir, setDir] = useState<1 | -1>(1);
  // A key press changes the screen at once; motion answers a pointer. docs/design/system/motion.md.
  const [still, setStill] = useState(false);
  const [kind, setKind] = useState<LearningKind | null>(saved?.kind ?? null);
  const [language, setLanguage] = useState<string | null>(saved?.language ?? null);
  const [goal, setGoal] = useState<number>(saved?.goal ?? STARTING_DAILY_GOAL);
  const [start, setStart] = useState<WelcomeStart | null>(null);
  const [missing, setMissing] = useState<string | null>(null);
  const keyed = useRef(true);

  useEffect(() => {
    if (!shortcut) writeProgress({ trail, kind, language, goal });
  }, [shortcut, trail, kind, language, goal]);

  const step = trail.at(-1) ?? "kind";
  useEffect(() => {
    const viewed = () => {
      if (
        !viewedSteps.has(step) &&
        captureAnalytics("welcome_step_viewed", { step_name: step, skipped: false })
      )
        viewedSteps.add(step);
    };
    viewed();
    window.addEventListener(ANALYTICS_READY, viewed);
    return () => window.removeEventListener(ANALYTICS_READY, viewed);
  }, [step]);
  // A new question opens at its top, not where the last one was scrolled to.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the step is the trigger.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    document.querySelector("main")?.scrollTo({ top: 0 });
  }, [step]);
  // The learner's own path: the language question joins it only after A language.
  const path: Step[] =
    kind === "language" ? ["kind", "language", "goal", "start"] : ["kind", "goal", "start"];
  const position = path.indexOf(step) + 1;
  const languages = catalogLanguages(catalog ?? [], meaningLanguage);
  const matched = decksFor(catalog ?? [], kind, language).slice(0, START_DECKS);
  const ownFirst = matched.length === 0;
  const decks = ownFirst ? sampler(catalog ?? []) : matched;
  const name = (tag: string) =>
    (LANGUAGE_TAGS as readonly string[]).includes(tag) || languages.includes(tag)
      ? languageName(tag, i18n.locale)
      : tag;

  const move = (to: Step | null, keyed: boolean) => {
    setStill(keyed || !!reduce);
    setMissing(null);
    if (to === null) {
      setDir(-1);
      setTrail((t) => (t.length > 1 ? t.slice(0, -1) : t));
    } else {
      finishWelcomeStep(step, false);
      setDir(1);
      setTrail((t) => [...t, to]);
    }
  };

  const next = (keyed: boolean) => {
    if (step === "hello") return move(shortcut ? "goal" : "kind", keyed);
    if (step === "kind") {
      if (!kind) return setMissing(t`Choose one to continue.`);
      return move(kind === "language" ? "language" : "goal", keyed);
    }
    if (step === "language") {
      if (!language) return setMissing(t`Choose the language you’re learning.`);
      return move("goal", keyed);
    }
    if (step === "goal") return shortcut ? onChooseGoal?.(goal) : move("start", keyed);
    if (!start || !kind) return setMissing(t`Choose a deck or a way to bring your own.`);
    onFinish({
      learningKind: kind,
      learningLanguage: kind === "language" ? language : null,
      dailyGoal: goal,
      start,
    });
  };

  const screen: Variants = {
    enter: (d: number) => (still ? { opacity: 0 } : { opacity: 0, x: 28 * d, filter: "blur(2px)" }),
    shown: {
      opacity: 1,
      x: 0,
      filter: "blur(0px)",
      transition: still
        ? { duration: 0 }
        : { duration: 0.26, ease: EASE, staggerChildren: 0.035, delayChildren: 0.04 },
    },
    leave: (d: number) =>
      still
        ? { opacity: 0, transition: { duration: 0 } }
        : { opacity: 0, x: -18 * d, transition: { duration: 0.14, ease: EASE } },
  };
  const item: Variants = {
    enter: still ? { opacity: 1 } : { opacity: 0, y: 8 },
    shown: { opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE } },
  };

  const finalLabel = !start
    ? t`Continue`
    : start.kind === "deck"
      ? t`Add and review`
      : start.own === "import"
        ? t`Go to import`
        : start.own === "assistant"
          ? t`Connect an app`
          : t`New deck`;

  const bar = (
    <ScreenBar>
      <div className="flex w-full items-center">
        {trail.length > 1 && <BackButton label={t`Back`} onClick={() => move(null, false)} />}
        <Button
          variant="ghost"
          size="sm"
          className="-me-3 ms-auto"
          onClick={() => onSkip(step)}
          aria-disabled={busy}
        >
          <Trans>Skip for now</Trans>
        </Button>
      </div>
    </ScreenBar>
  );

  const heading = (title: string, lede: string) => (
    <>
      <motion.h1
        variants={item}
        tabIndex={-1}
        className="text-2xl font-medium tracking-[-0.02em] text-balance"
      >
        {title}
      </motion.h1>
      <motion.p variants={item} className="mt-2 mb-6 max-w-[52ch] text-md text-text-2 text-pretty">
        {lede}
      </motion.p>
    </>
  );

  const deckSection = (
    <section aria-labelledby="welcome-decks" className="grid gap-3">
      <motion.h2 variants={item} id="welcome-decks" className="text-lg font-medium">
        {kind === "language" && language && !ownFirst ? (
          <Trans>Ready-made decks in {name(language)}</Trans>
        ) : (
          <Trans>Ready-made decks</Trans>
        )}
      </motion.h2>
      {decks.length > 0 ? (
        <ChoiceGroup
          label={t`Ready-made decks`}
          value={start?.kind === "deck" ? start.deck.slug : null}
          onChange={(slug) => {
            const deck = decks.find((d) => d.slug === slug);
            if (deck) setStart({ kind: "deck", deck });
            setMissing(null);
          }}
          className="grid grid-cols-2 gap-3"
        >
          {decks.map((deck) => (
            <motion.div key={deck.slug} variants={item} className="grid">
              <DeckChoice deck={deck} />
            </motion.div>
          ))}
        </ChoiceGroup>
      ) : (
        <p className="text-base text-muted">
          {catalog ? <Trans>No ready-made decks yet.</Trans> : <Trans>Loading decks…</Trans>}
        </p>
      )}
    </section>
  );

  const ownSection = (
    <section aria-labelledby="welcome-own" className="grid gap-3">
      <motion.h2 variants={item} id="welcome-own" className="text-lg font-medium">
        <Trans>Bring your own</Trans>
      </motion.h2>
      <motion.div variants={item} className="grid">
        <ChoiceGroup
          label={t`Bring your own`}
          value={start?.kind === "own" ? start.own : null}
          onChange={(own) => {
            setStart({ kind: "own", own: own as Own });
            setMissing(null);
          }}
          className="grid gap-2"
        >
          {" "}
          <OwnRow
            value="import"
            icon={<Download />}
            title={<Trans>Import from Anki or Mochi</Trans>}
            detail={<Trans>Bring your decks and their review history.</Trans>}
          />
          <OwnRow
            value="assistant"
            icon={<Bot />}
            title={<Trans>Send a lesson from Claude or ChatGPT</Trans>}
            detail={<Trans>Connect it once, then send your notes as cards.</Trans>}
          />
          <OwnRow
            value="type"
            icon={<PenLine />}
            title={<Trans>Type your own cards</Trans>}
            detail={<Trans>Make a deck and add cards from your last lesson.</Trans>}
          />
        </ChoiceGroup>
      </motion.div>
    </section>
  );

  return (
    <Screen ownTitle backOnDesktop bar={bar} width="md">
      {/* One bar rather than a segment per question: the language question comes only after A language. */}
      {!shortcut && step !== "hello" && (
        <div
          role="progressbar"
          aria-label={t`Getting set up`}
          aria-valuemin={0}
          aria-valuemax={path.length}
          aria-valuenow={position}
          aria-valuetext={t`Question ${position} of ${path.length}`}
          className="-mt-1 mb-7 h-1 overflow-hidden rounded-full bg-plate-2"
        >
          <motion.div
            className="h-full origin-left rounded-full bg-text rtl:origin-right"
            initial={false}
            animate={{ scaleX: position / path.length }}
            transition={still ? { duration: 0 } : { duration: 0.32, ease: EASE }}
          />
        </div>
      )}
      <form
        className="flex flex-1 flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          next(keyed.current);
          keyed.current = true;
        }}
      >
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            variants={screen}
            initial="enter"
            animate="shown"
            exit="leave"
            className="grid content-start"
          >
            {step === "hello" && <Hello joined={joined} />}

            {step === "kind" && (
              <>
                {heading(
                  t`What are you learning?`,
                  t`Lymi works for anything you want to remember.`,
                )}
                <ChoiceGroup
                  label={t`What you’re learning`}
                  value={kind}
                  onChange={(k) => {
                    setKind(k as LearningKind);
                    setStart(null);
                    setMissing(null);
                  }}
                  className="grid gap-3 @xl/shell:grid-cols-2"
                >
                  <KindTile
                    variants={item}
                    value="language"
                    icon={<Languages />}
                    title={<Trans>A language</Trans>}
                    detail={<Trans>Words and phrases in a language you’re learning.</Trans>}
                  />
                  <KindTile
                    variants={item}
                    value="test"
                    icon={<ClipboardCheck />}
                    title={<Trans>For a test</Trans>}
                    detail={<Trans>A citizenship test, a driving test or another exam.</Trans>}
                  />
                  <KindTile
                    variants={item}
                    value="subject"
                    icon={<Globe />}
                    title={<Trans>A subject</Trans>}
                    detail={<Trans>Countries, stars, birds or anything else with names.</Trans>}
                  />
                  <KindTile
                    variants={item}
                    value="other"
                    icon={<Shapes />}
                    title={<Trans>Something else</Trans>}
                    detail={<Trans>Your own material, whatever it is.</Trans>}
                  />
                </ChoiceGroup>
              </>
            )}

            {step === "language" && (
              <>
                {heading(
                  t`Which language?`,
                  t`We’ll show ready-made decks in it. You can add more languages later.`,
                )}
                <LanguagePicker
                  item={item}
                  languages={languages}
                  value={language}
                  name={name}
                  onChange={(tag) => {
                    setLanguage(tag);
                    setStart(null);
                    setMissing(null);
                  }}
                />
              </>
            )}

            {step === "goal" && (
              <>
                {heading(
                  t`How much time a day?`,
                  t`Little and often works best. Meeting your daily goal keeps your streak going. You can change it any time.`,
                )}
                <ChoiceGroup
                  label={t`Daily goal`}
                  value={String(goal)}
                  onChange={(v) => setGoal(Number(v))}
                  className="grid gap-2"
                >
                  {DAILY_GOAL_PRESETS.map((n) => (
                    <GoalRow
                      key={n}
                      variants={item}
                      value={String(n)}
                      title={
                        <span className="flex flex-wrap items-center gap-2">
                          {i18n._(GOAL_NAMES[n])}
                          {n === STARTING_DAILY_GOAL && (
                            <Chip>
                              <Trans>Good to start</Trans>
                            </Chip>
                          )}
                        </span>
                      }
                      detail={
                        <Trans>
                          About <Plural value={MINUTES[n]} one="# minute" other="# minutes" />,{" "}
                          <Plural value={n} one="# review" other="# reviews" />
                        </Trans>
                      }
                    />
                  ))}
                </ChoiceGroup>
              </>
            )}

            {step === "start" && (
              <>
                {heading(
                  t`How do you want to start?`,
                  ownFirst
                    ? t`Bring what you’re learning, or start with a ready-made deck.`
                    : t`Pick a ready-made deck, or bring what you already have.`,
                )}
                <div className="grid gap-8">
                  {ownFirst ? (
                    <>
                      {ownSection}
                      {deckSection}
                    </>
                  ) : (
                    <>
                      {deckSection}
                      {ownSection}
                    </>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {(missing || error) && (
          <p role="alert" className="mt-4 text-sm text-danger">
            {missing ?? error}
          </p>
        )}
        {/* The page keeps room for the pill, which this screen hides, so the foot takes it back on a phone. */}
        <div
          className={clsx(
            step === "hello" && "@3xl/shell:flex @3xl/shell:justify-center",
            "sticky bottom-0 -mx-5 mt-auto -mb-[calc(env(safe-area-inset-bottom)+96px)] border-t border-edge bg-canvas px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] @3xl/shell:static @3xl/shell:mx-0 @3xl/shell:mt-8 @3xl/shell:mb-0 @3xl/shell:border-0 @3xl/shell:bg-transparent @3xl/shell:p-0",
          )}
        >
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={busy}
            // A click has a detail; Enter and Space on the button do not.
            onClick={(e) => {
              keyed.current = e.detail === 0;
            }}
            className="w-full @3xl/shell:w-auto"
          >
            {step === "start" ? (
              finalLabel
            ) : shortcut && step === "goal" ? (
              <Trans>Start review</Trans>
            ) : (
              <Trans>Continue</Trans>
            )}
          </Button>
        </div>
      </form>
    </Screen>
  );
}

const at = (ms: number) => ({ "--at": `${ms}ms` }) as CSSProperties;

/** When each part comes in: the lantern catches from its ember first, then the room fills in. */
const HELLO = { pool: 180, embers: 520, heading: 420, lede: 520, body: 700 } as const;

/**
 * The first screen of getting set up, for every new account: the lantern catches and lights the
 * room, then what comes next. A deck the learner arrived with leads, so they see it made it.
 */
function Hello({ joined }: { joined: JoinedDeck | undefined }) {
  const reduce = useReduceMotion();
  const [embers] = useState(() => (reduce ? [] : endEmbers(9)));
  return (
    <div className="mx-auto grid w-full max-w-md justify-items-center pt-2 text-center">
      <div className="relative isolate mb-7 size-28 @3xl/shell:size-32">
        <LanternLight poolAt={HELLO.pool} embers={embers} embersAt={HELLO.embers}>
          <Lantern className="size-full" from="out" flicker glow />
        </LanternLight>
      </div>
      <h1
        tabIndex={-1}
        className="seq text-3xl font-medium tracking-[-0.03em] text-balance @3xl/shell:text-4xl"
        style={at(HELLO.heading)}
      >
        <Trans>Welcome to Lymi</Trans>
      </h1>
      <p className="seq mt-2 max-w-[36ch] text-md text-text-2 text-pretty" style={at(HELLO.lede)}>
        {joined ? (
          <Trans>Your deck is ready. Choose your daily goal, then review your first cards.</Trans>
        ) : (
          <Trans>A few quick questions, then your first review.</Trans>
        )}
      </p>
      {/* One thing to anchor the screen: the deck they arrived with, or else how review works. */}
      <div className="seq mt-8 grid w-full text-start" style={at(HELLO.body)}>
        {joined ? <JoinedPlate deck={joined} /> : <HowItWorks startAt={HELLO.body + 520} />}
      </div>
    </div>
  );
}

const HOW_STEP_MS = 650;

/**
 * Review in three steps down one line. Once the card has risen, the line fills with the flame's light
 * from step to step and each number lights as the light reaches it; then it rests.
 */
function HowItWorks({ startAt }: { startAt: number }) {
  const reduce = useReduceMotion();
  const [reached, setReached] = useState(reduce ? 3 : 0);
  useEffect(() => {
    if (reduce) return;
    const timers = [0, 1, 2].map((i) =>
      window.setTimeout(() => setReached(i + 1), startAt + i * HOW_STEP_MS),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [reduce, startAt]);
  const steps = [
    <Trans key="see">See a card and recall the answer.</Trans>,
    <Trans key="say">Say how well you knew it.</Trans>,
    <Trans key="back">Lymi brings it back just before you’d forget it.</Trans>,
  ];
  return (
    <section aria-labelledby="welcome-how" className="edge grid gap-4 rounded-xl bg-plate p-5">
      <h2 id="welcome-how" className="text-sm font-medium text-muted">
        <Trans>How it works</Trans>
      </h2>
      <ol className="grid gap-5">
        {steps.map((line, i) => {
          const lit = reached > i;
          return (
            <li key={line.key} className="relative flex items-start gap-3">
              {/* A segment from this number down to the next, so the line ends on the last number however lines wrap. */}
              {i < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className="well absolute start-[11px] top-7 -bottom-4 w-0.5 overflow-hidden rounded-full bg-plate-2"
                >
                  <motion.span
                    className="lit block size-full origin-top rounded-full bg-amber"
                    initial={false}
                    animate={{ scaleY: reached > i ? 1 : 0 }}
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { duration: (HOW_STEP_MS * 0.8) / 1000, ease: EASE }
                    }
                  />
                </span>
              )}
              <span
                aria-hidden="true"
                className={clsx(
                  "grid size-6 shrink-0 place-items-center rounded-full text-xs font-medium tabular-nums transition-[background-color,color,box-shadow] duration-300",
                  lit ? "lit bg-amber text-amber-ink" : "well bg-plate-2 text-muted",
                )}
              >
                {i + 1}
              </span>
              <span
                className={clsx(
                  "pt-0.5 text-base text-pretty transition-colors duration-300",
                  lit ? "text-text" : "text-muted",
                )}
              >
                {line}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Whose deck it is and what is in it, in the join page's words, so the learner sees what they signed up for. */
function JoinedPlate({ deck }: { deck: JoinedDeck }) {
  const { i18n } = useLingui();
  const owner = deck.owner.name;
  return (
    <section className="edge grid gap-3 rounded-xl bg-plate p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-2 text-base text-text-2">
          {deck.published ? (
            <PublisherMark name={owner} src={deck.owner.avatarUrl} size={24} />
          ) : (
            <Avatar name={owner} size={24} />
          )}
          {deck.published ? (
            <Trans>From {deck.owner.name}</Trans>
          ) : (
            <Trans>{deck.owner.name} shared a deck</Trans>
          )}
        </p>
        <Chip>
          <Check aria-hidden="true" strokeWidth={2.5} className="size-3.5" />
          <Trans>In Library</Trans>
        </Chip>
      </div>
      <h2 className="text-xl font-medium tracking-[-0.02em] break-words text-balance">
        {deck.name}
      </h2>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-base text-muted">
        {deck.defaultLanguage && (
          <li className="flex items-center gap-1.5">
            <Languages aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0" />
            {languageName(deck.defaultLanguage, i18n.locale)}
          </li>
        )}
        <li className="flex items-center gap-1.5 tabular-nums">
          <Layers aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0" />
          <Plural value={deck.total} one="# card" other="# cards" />
        </li>
      </ul>
    </section>
  );
}

/* A radio group whose items are whole tiles and rows: Base UI gives the arrow keys and the semantics. */
function ChoiceGroup({
  label,
  value,
  onChange,
  className,
  children,
}: {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <RadioGroup<string>
      aria-label={label}
      value={value ?? ""}
      onValueChange={(v) => onChange(v)}
      className={className}
    >
      {children}
    </RadioGroup>
  );
}

function Tick() {
  const reduce = useReduceMotion();
  const pop: Transition = reduce ? { duration: 0 } : CHOICE_POP;
  return (
    <motion.span
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, transition: pop }}
      className="grid size-6 shrink-0 place-items-center rounded-full bg-text text-canvas"
      aria-hidden="true"
    >
      <Check className="size-3.5" strokeWidth={3} />
    </motion.span>
  );
}

const choiceBase =
  "relative cursor-pointer text-start transition-[box-shadow,background-color,scale] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function KindTile({
  value,
  icon,
  title,
  detail,
  variants,
}: {
  value: string;
  icon: ReactNode;
  title: ReactNode;
  detail: ReactNode;
  variants: Variants;
}) {
  return (
    <motion.div variants={variants} className="grid">
      <RadioPrimitive.Root
        value={value}
        className={clsx(
          choiceBase,
          "group flex gap-4 rounded-xl bg-plate p-4 active:scale-[0.98] motion-reduce:active:scale-100 @xl/shell:min-h-36 @xl/shell:flex-col @xl/shell:gap-3 @xl/shell:p-5",
          "edge hoverable:hover:edge-2 data-checked:shadow-[0_0_0_2px_var(--text)]",
        )}
      >
        <span
          className="shrink-0 text-text-2 [&_svg]:size-6 [&_svg]:stroke-[1.6]"
          aria-hidden="true"
        >
          {icon}
        </span>
        <span className="grid flex-1 gap-0.5 pe-8">
          <span className="text-md font-medium text-text">{title}</span>
          <span className="text-sm text-muted text-pretty">{detail}</span>
        </span>
        <RadioPrimitive.Indicator keepMounted={false} className="absolute end-3.5 top-3.5">
          <Tick />
        </RadioPrimitive.Indicator>
      </RadioPrimitive.Root>
    </motion.div>
  );
}

function GoalRow({
  value,
  title,
  detail,
  variants,
}: {
  value: string;
  title: ReactNode;
  detail: ReactNode;
  variants: Variants;
}) {
  return (
    <motion.div variants={variants} className="grid">
      <RadioPrimitive.Root
        value={value}
        className={clsx(
          choiceBase,
          "flex min-h-16 items-center gap-4 rounded-xl bg-plate px-4 py-3 active:scale-[0.99] motion-reduce:active:scale-100",
          "edge hoverable:hover:edge-2 data-checked:shadow-[0_0_0_2px_var(--text)]",
        )}
      >
        <span className="grid flex-1 gap-0.5">
          <span className="text-md font-medium text-text">{title}</span>
          <span className="text-sm text-muted tabular-nums">{detail}</span>
        </span>
        <RadioPrimitive.Indicator keepMounted={false}>
          <Tick />
        </RadioPrimitive.Indicator>
      </RadioPrimitive.Root>
    </motion.div>
  );
}

function DeckChoice({ deck }: { deck: PublicDeckSummary }) {
  return (
    <RadioPrimitive.Root
      value={deck.slug}
      className={clsx(
        choiceBase,
        "deck-tile grid content-start gap-3 overflow-hidden rounded-xl bg-plate pb-3.5 active:scale-[0.99] motion-reduce:active:scale-100",
        "edge hoverable:hover:edge-2 data-checked:shadow-[0_0_0_2px_var(--text)]",
      )}
    >
      <DeckTray
        slug={deck.slug}
        cardCount={deck.cardCount}
        card={deck.card}
        language={deck.language}
        meaningLanguage={deck.meaningLanguage}
        className="[--cw:120px]"
      />
      <span className="grid gap-1 px-3.5">
        <span
          lang={deck.meaningLanguage}
          className="text-lg font-medium leading-tight tracking-[-0.025em] text-balance text-text"
        >
          {deck.name}
        </span>
        <DeckMeta deck={deck} />
      </span>
      <RadioPrimitive.Indicator keepMounted={false} className="absolute end-2.5 top-2.5 z-10">
        <Tick />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  );
}

function OwnRow({
  value,
  icon,
  title,
  detail,
}: {
  value: Own;
  icon: ReactNode;
  title: ReactNode;
  detail: ReactNode;
}) {
  return (
    <RadioPrimitive.Root
      value={value}
      className={clsx(
        choiceBase,
        "group flex min-h-18 items-center gap-4 rounded-xl bg-plate px-4 py-3.5 active:scale-[0.99] motion-reduce:active:scale-100",
        "edge hoverable:hover:edge-2 data-checked:shadow-[0_0_0_2px_var(--text)]",
      )}
    >
      <span className="shrink-0 text-text-2 [&_svg]:size-6 [&_svg]:stroke-[1.6]" aria-hidden="true">
        {icon}
      </span>
      <span className="grid flex-1 gap-0.5">
        <span className="text-md font-medium">{title}</span>
        <span className="text-sm text-muted">{detail}</span>
      </span>
      {/* An empty ring says this is a choice, as a deck's tick does once picked; a chevron read as a link. */}
      <span
        className="size-6 shrink-0 rounded-full shadow-[inset_0_0_0_1.5px_var(--edge-2)] group-data-checked:hidden"
        aria-hidden="true"
      />
      <RadioPrimitive.Indicator keepMounted={false}>
        <Tick />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  );
}

/** Ukrainian and Russian name a language in lower case; a pill starts with a capital, as a choice does. */
function asChoice(label: string, locale: string) {
  return label.charAt(0).toLocaleUpperCase(locale) + label.slice(1);
}

/** Pills for the catalogue's most stocked languages, then Another language with the rest and a search. */
function LanguagePicker({
  languages,
  value,
  name,
  onChange,
  item,
}: {
  languages: string[];
  value: string | null;
  name: (tag: string) => string;
  onChange: (tag: string | null) => void;
  item: Variants;
}) {
  const { t, i18n } = useLingui();
  const reduce = useReduceMotion();
  const pills = languages.slice(0, PILLS);
  const [other, setOther] = useState(value !== null && !pills.includes(value));
  const [typed, setTyped] = useState(value !== null && !pills.includes(value) ? name(value) : "");
  const open: Transition = reduce ? { duration: 0 } : { duration: 0.24, ease: EASE };
  const close: Transition = reduce ? { duration: 0 } : { duration: 0.14, ease: EASE };

  return (
    <div className="grid gap-4">
      <RadioGroup<string>
        aria-label={t`Language`}
        value={other ? "other" : (value ?? "")}
        onValueChange={(v) => {
          if (v === "other") {
            setOther(true);
            onChange(typed.trim() || null);
            return;
          }
          setOther(false);
          onChange(v);
        }}
        className="flex flex-wrap gap-2"
      >
        {pills.map((tag) => (
          <Pill key={tag} value={tag} variants={item}>
            {asChoice(name(tag), i18n.locale)}
          </Pill>
        ))}
        <Pill value="other" variants={item}>
          <Trans>Another language</Trans>
        </Pill>
      </RadioGroup>
      <AnimatePresence initial={false}>
        {other && (
          <motion.div
            key="other"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1, transition: open }}
            exit={{ height: 0, opacity: 0, transition: close }}
            // The panel's own room around it, so the field's focus ring is not cut by the clip.
            className="-mx-1 -mb-1 overflow-hidden"
          >
            <div className="p-1">
              <div className="edge grid gap-4 rounded-xl bg-plate p-4">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute start-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted"
                    aria-hidden="true"
                  />
                  <Input
                    autoFocus
                    value={typed}
                    onChange={(e) => {
                      setTyped(e.target.value);
                      onChange(e.target.value.trim() || null);
                    }}
                    placeholder={t`Find a language`}
                    aria-label={t`Language you’re learning`}
                    className="ps-10"
                  />
                </div>
                <Suggestions
                  query={typed}
                  value={value}
                  rest={languages.slice(PILLS)}
                  pills={pills}
                  name={name}
                  onPick={(tag) => {
                    setTyped(asChoice(name(tag), i18n.locale));
                    onChange(tag);
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Pill({
  value,
  variants,
  children,
}: {
  value: string;
  variants: Variants;
  children: ReactNode;
}) {
  return (
    <motion.span variants={variants} className="inline-flex">
      <RadioPrimitive.Root
        value={value}
        className={clsx(
          choiceBase,
          "group inline-flex h-12 items-center rounded-full px-5 text-md font-medium active:scale-[0.96] motion-reduce:active:scale-100",
          "edge bg-plate text-text hoverable:hover:edge-2 hoverable:hover:veil",
          "data-checked:bg-text data-checked:text-canvas data-checked:shadow-none",
        )}
      >
        <RadioPrimitive.Indicator keepMounted={false} className="-ms-1 me-1.5 inline-flex">
          <Check className="size-4" strokeWidth={2.5} aria-hidden="true" />
        </RadioPrimitive.Indicator>
        {children}
      </RadioPrimitive.Root>
    </motion.span>
  );
}

/** Under Another language: the rest of the catalogue's languages, narrowed to what the learner types. */
function Suggestions({
  query,
  value,
  rest,
  pills,
  name,
  onPick,
}: {
  query: string;
  value: string | null;
  rest: string[];
  pills: string[];
  name: (tag: string) => string;
  onPick: (tag: string) => void;
}) {
  const { i18n } = useLingui();
  const q = query.trim().toLocaleLowerCase(i18n.locale);
  const pool = [...new Set([...rest, ...LANGUAGE_TAGS])].filter((tag) => !pills.includes(tag));
  const shown = q
    ? pool.filter((tag) => name(tag).toLocaleLowerCase(i18n.locale).startsWith(q)).slice(0, 10)
    : [...rest].sort((a, b) => name(a).localeCompare(name(b), i18n.locale));
  return (
    <div className="grid gap-2.5">
      {shown.length > 0 && (
        <p className="text-sm font-medium text-text-2">
          {q ? (
            <Trans>Matching languages</Trans>
          ) : (
            <Trans>More languages with ready-made decks</Trans>
          )}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {shown.map((tag) => {
          const chosen = value === tag;
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={chosen}
              onClick={() => onPick(tag)}
              className={clsx(
                "inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-base font-medium transition-[background-color,color,scale] duration-150 active:scale-[0.96] motion-reduce:active:scale-100",
                chosen ? "bg-text text-canvas" : "bg-plate-2 text-text hoverable:hover:bg-hover",
              )}
            >
              {chosen && (
                <Check className="-ms-0.5 size-3.5" strokeWidth={2.5} aria-hidden="true" />
              )}
              {name(tag)}
              {q && rest.includes(tag) && !chosen && (
                <span className="text-xs font-normal text-muted">
                  <Trans>decks</Trans>
                </span>
              )}
            </button>
          );
        })}
      </div>
      {q && shown.length === 0 && (
        <p className="text-base text-text-2">
          <Trans>No ready-made decks in “{query.trim()}” yet. You can still bring your own.</Trans>
        </p>
      )}
    </div>
  );
}
