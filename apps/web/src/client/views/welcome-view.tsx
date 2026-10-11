import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import {
  DAILY_GOAL_PRESETS,
  LANGUAGE_TAGS,
  type LearningKind,
  STARTING_DAILY_GOAL,
} from "@lymi/core";
import { type PublicDeckSummary, shelvesOf, subjectOf, taughtLanguage } from "@lymi/core/catalog";
import { clsx } from "clsx";
import {
  Bot,
  Check,
  ChevronRight,
  ClipboardCheck,
  Download,
  Globe,
  Languages,
  PenLine,
  Search,
  Shapes,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  type Transition,
  useReducedMotionConfig,
  type Variants,
} from "motion/react";
import { type ReactNode, useRef, useState } from "react";
import { Button } from "../components/button";
import { Chip } from "../components/chip";
import { languageName } from "../components/deck-fields";
import { DeckMeta, DeckTray } from "../components/deck-tray";
import { GOAL_NAMES } from "../components/goal-picker";
import { Lantern } from "../components/lantern";
import { Screen, ScreenBar } from "../components/layout/screen";
import { Input } from "../components/ui/input";
import { RadioGroup } from "../components/ui/radio-group";
import { CHOICE_POP } from "../lib/choice-motion";
import { BackButton } from "./shell";

/** How a learner without decks gets started: bring their own, or add a ready-made deck. */
export type Own = "import" | "assistant" | "type";
export type WelcomeStart = { kind: "deck"; deck: PublicDeckSummary } | { kind: "own"; own: Own };

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
  onSkip: () => void;
  /** The final press is saving and, for a deck, adding it. */
  busy?: boolean | undefined;
  /** What went wrong with the final press, in the learner's language. */
  error?: string | null | undefined;
}

type Step = "kind" | "language" | "goal" | "start";

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
export function WelcomeView({ catalog, meaningLanguage, onFinish, onSkip, busy, error }: Props) {
  const { t, i18n } = useLingui();
  const reduce = useReducedMotionConfig();
  const [trail, setTrail] = useState<Step[]>(["kind"]);
  const [dir, setDir] = useState<1 | -1>(1);
  // A key press changes the screen at once; motion answers a pointer. docs/design/system/motion.md.
  const [still, setStill] = useState(false);
  const [kind, setKind] = useState<LearningKind | null>(null);
  const [language, setLanguage] = useState<string | null>(null);
  const [goal, setGoal] = useState<number>(STARTING_DAILY_GOAL);
  const [start, setStart] = useState<WelcomeStart | null>(null);
  const [missing, setMissing] = useState<string | null>(null);
  const keyed = useRef(true);

  const step = trail.at(-1) ?? "kind";
  const count = step === "kind" || step === "language" ? 1 : step === "goal" ? 2 : 3;
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
      setDir(1);
      setTrail((t) => [...t, to]);
    }
  };

  const next = (keyed: boolean) => {
    if (step === "kind") {
      if (!kind) return setMissing(t`Choose one to continue.`);
      return move(kind === "language" ? "language" : "goal", keyed);
    }
    if (step === "language") {
      if (!language) return setMissing(t`Choose the language you’re learning.`);
      return move("goal", keyed);
    }
    if (step === "goal") return move("start", keyed);
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

  const finalLabel =
    !start || start.kind === "deck"
      ? t`Add and review`
      : start.own === "import"
        ? t`Go to import`
        : start.own === "assistant"
          ? t`Connect an app`
          : t`New deck`;

  const bar = (
    <ScreenBar>
      {/* Three columns, so the track stays put whether Back or the lantern holds the start. */}
      <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex">
          {trail.length > 1 ? (
            <BackButton label={t`Back`} onClick={() => move(null, false)} />
          ) : (
            <Lantern className="-ms-2 size-11" />
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="grid w-20 grid-cols-3 gap-1" aria-hidden="true">
            {[1, 2, 3].map((n) => (
              <span key={n} className="block h-1 overflow-hidden rounded-full bg-plate-2">
                <motion.span
                  className="block h-full origin-left rounded-full bg-text rtl:origin-right"
                  initial={false}
                  animate={{ scaleX: n <= count ? 1 : 0 }}
                  transition={still ? { duration: 0 } : { duration: 0.32, ease: EASE }}
                />
              </span>
            ))}
          </div>
          <span className="text-sm text-muted tabular-nums">
            <Trans>{count} of 3</Trans>
          </span>
        </div>
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" className="-me-3" onClick={onSkip} aria-disabled={busy}>
            <Trans>Skip for now</Trans>
          </Button>
        </div>
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
      <motion.div variants={item}>
        <ChoiceGroup
          label={t`Bring your own`}
          value={start?.kind === "own" ? start.own : null}
          onChange={(own) => {
            setStart({ kind: "own", own: own as Own });
            setMissing(null);
          }}
          className="edge grid overflow-hidden rounded-xl bg-plate"
        >
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
                  t`Little and often works best. Reaching your daily goal keeps your streak, and you can change it any time from the streak.`,
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
        <div className="sticky bottom-0 -mx-5 mt-auto -mb-[calc(env(safe-area-inset-bottom)+96px)] border-t border-edge bg-canvas px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] @3xl/shell:static @3xl/shell:mx-0 @3xl/shell:mt-8 @3xl/shell:mb-0 @3xl/shell:border-0 @3xl/shell:bg-transparent @3xl/shell:p-0">
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
            {step === "start" ? finalLabel : <Trans>Continue</Trans>}
          </Button>
        </div>
      </form>
    </Screen>
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
  const reduce = useReducedMotionConfig();
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
        "group flex min-h-18 items-center gap-4 border-t border-edge px-4 py-3.5 first:border-0 focus-visible:-outline-offset-2 hoverable:hover:veil data-checked:bg-plate-2",
      )}
    >
      <span className="shrink-0 text-text-2 [&_svg]:size-6 [&_svg]:stroke-[1.6]" aria-hidden="true">
        {icon}
      </span>
      <span className="grid flex-1 gap-0.5">
        <span className="text-md font-medium">{title}</span>
        <span className="text-sm text-muted">{detail}</span>
      </span>
      <span className="grid size-6 place-items-center group-data-checked:hidden" aria-hidden="true">
        <ChevronRight className="size-5 text-muted rtl:-scale-x-100" />
      </span>
      <RadioPrimitive.Indicator keepMounted={false}>
        <Tick />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  );
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
  const { t } = useLingui();
  const reduce = useReducedMotionConfig();
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
            {name(tag)}
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
                    setTyped(name(tag));
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
