import { Trans, useLingui } from "@lingui/react/macro";
import { ANALYTICS_READY } from "@lymi/client/analytics";
import { decksFor } from "@lymi/client/welcome";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import { taughtLanguage } from "@lymi/core/catalog";
import { endEmbers } from "@lymi/design";
import { clsx } from "clsx";
import {
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardPaste,
  FileUp,
  Plug,
  Plus,
} from "lucide-react";
import { motion } from "motion/react";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { DeckSummary } from "../lib/api";
import { publicSiteUrl } from "../lib/origins";
import { captureAnalytics } from "../lib/telemetry";
import { useReduceMotion } from "../lib/use-reduce-motion";
import { identifyApp } from "./app-mark";
import { Button } from "./button";
import { DeckTile } from "./deck-tray";
import { Lantern } from "./lantern";
import { LanternLight } from "./lantern-light";
import { NavLink, useStaticNav } from "./nav-link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

// Today until the first review. docs/design/onboarding.md.

const ASSISTANTS = [
  { app: identifyApp("https://claude.ai/"), guide: "/docs/mcp/claude" },
  { app: identifyApp("https://chatgpt.com/"), guide: "/docs/mcp/chatgpt" },
  { app: identifyApp("https://accountlinking.google.com/"), guide: "/docs/mcp/gemini" },
  { app: identifyApp("https://grok.com/"), guide: "/docs/mcp/grok" },
];
const IMPORTS = ["Anki", "Mochi", "Noji", "Quizlet"];
const LIT_KEY = "lymi-first-run-lit";
const STEP_NAMES = ["deck", "cards", "review"] as const;

/** When each part arrives on the first visit: the lantern catches, then the guide, then the rest. */
const T = { pool: 120, embers: 420, heading: 260, lede: 360, steps: 520, gap: 140, below: 820 };

const at = (ms: number) => ({ "--at": `${ms}ms` }) as CSSProperties;

/** The first deck with cards: one the learner made, joined or added. */
export function startedDeck(decks: DeckSummary[] | undefined) {
  return decks?.find((d) => d.total > 0);
}

/**
 * Whether this is the first visit on this device, read once: the lantern catches and the page
 * arrives in order only then; every later visit finds it already lit.
 */
export function useFirstArrival() {
  const reduce = useReduceMotion();
  const [first] = useState(() => {
    if (reduce) return false;
    try {
      if (localStorage.getItem(LIT_KEY)) return false;
      localStorage.setItem(LIT_KEY, "1");
      return true;
    } catch {
      return false;
    }
  });
  return first;
}

/**
 * The step the learner is on: 0 until a deck exists, 1 until it has cards, then 2 until reviewed.
 * An empty deck someone shared does not count, because its member cannot add to it.
 */
export function currentStep(decks: DeckSummary[] | undefined) {
  if (startedDeck(decks)) return 2;
  return decks?.some((d) => d.role === "owner") ? 1 : 0;
}

/** Each step seen and each step finished, once, as Today's guide always reported them. */
function useStepAnalytics(current: number) {
  const observed = useRef<number | null>(null);
  useEffect(() => {
    const observe = () => {
      const previous = observed.current;
      if (previous === current) return;
      if (previous !== null && current > previous) {
        for (const step_name of STEP_NAMES.slice(previous, current))
          captureAnalytics("welcome_step_finished", { step_name, skipped: false });
      }
      const step_name = STEP_NAMES[current];
      if (step_name && captureAnalytics("welcome_step_viewed", { step_name, skipped: false }))
        observed.current = current;
    };
    observe();
    window.addEventListener(ANALYTICS_READY, observe);
    return () => window.removeEventListener(ANALYTICS_READY, observe);
  }, [current]);
}

interface GuideProps {
  name: string | undefined;
  decks: DeckSummary[] | undefined;
  play: boolean;
  /** Opens a new card in the learner's deck. */
  onAddCard: (() => void) | undefined;
  /** Smart add, where the learner may use it. */
  onSmartAdd: (() => void) | undefined;
}

/**
 * How Lymi works, as the learner does it: three numbered steps on the bare canvas, dashed like
 * every empty state, lit by the lantern. Each is ticked by the learner's own data, and the current
 * one holds its action.
 */
export function FirstRunGuide({ name, decks, play, onAddCard, onSmartAdd }: GuideProps) {
  const { t } = useLingui();
  const reduce = useReduceMotion();
  const [embers] = useState(() => (play && !reduce ? endEmbers(7) : []));
  const current = currentStep(decks);
  useStepAnalytics(current);
  const deck = startedDeck(decks);
  const empty = decks?.find((d) => d.total === 0 && d.role === "owner");
  const first = name?.trim().split(/\s+/)[0];
  const steps: { key: string; title: ReactNode; detail: ReactNode; action?: ReactNode }[] = [
    {
      key: "deck",
      title: <Trans>Create a deck</Trans>,
      detail: (
        <Trans>From your notes, your AI assistant or another app, or a ready-made one.</Trans>
      ),
    },
    {
      key: "cards",
      title: <Trans>Add cards</Trans>,
      detail: empty ? (
        <Trans>{empty.name} is empty. Add the words you want to remember.</Trans>
      ) : (
        <Trans>The words you want to remember, one card each.</Trans>
      ),
      action: (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button variant="primary" onClick={onAddCard} aria-disabled={!onAddCard} kbd="N">
            <Plus data-icon="inline-start" aria-hidden="true" />
            <Trans>Add a card</Trans>
          </Button>
          {onSmartAdd && (
            <button
              type="button"
              onClick={() => {
                pick("lesson");
                onSmartAdd();
              }}
              className="text-base font-medium text-text-2 underline decoration-edge-2 underline-offset-4 transition-colors duration-150 hoverable:hover:text-text hoverable:hover:decoration-text"
            >
              <Trans>Turn your notes into cards</Trans>
            </button>
          )}
        </div>
      ),
    },
    {
      key: "review",
      title: <Trans>Finish your first review</Trans>,
      detail: <Trans>Recall each card, then say how well you knew it.</Trans>,
      action: deck && (
        <Button
          variant="primary"
          kbd="R"
          render={<NavLink to="/review" search={{ deck: deck.id }} />}
        >
          <Trans>Review</Trans>
        </Button>
      ),
    },
  ];
  return (
    <section
      aria-labelledby="first-run-title"
      className="relative isolate grid gap-5 overflow-hidden rounded-xl border-[1.5px] border-dashed border-edge-2 p-5 @3xl:gap-6 @3xl:p-6"
    >
      {/* The panel clips the lantern's pool, so its light stays on the guide rather than the rail. */}
      {/* The lantern stands in the numbers' column, so its middle is theirs and the heading starts where the step titles do. */}
      <div className="flex min-h-16 items-center gap-3">
        <div className="relative w-7 shrink-0 self-stretch">
          <div className="absolute start-1/2 top-1/2 isolate size-16 -translate-x-1/2 -translate-y-1/2 rtl:translate-x-1/2">
            <LanternLight poolAt={T.pool} embers={embers} embersAt={T.embers}>
              <Lantern className="size-full" from={play ? "out" : undefined} flicker glow />
            </LanternLight>
          </div>
        </div>
        <div className="grid min-w-0 flex-1 gap-0.5">
          <h2
            id="first-run-title"
            className={clsx("text-xl font-medium text-balance @3xl:text-2xl", play && "seq")}
            style={play ? at(T.heading) : undefined}
          >
            {first ? <Trans>Welcome, {first}</Trans> : <Trans>Welcome to Lymi</Trans>}
          </h2>
          <p
            className={clsx("text-md text-text-2 text-pretty", play && "seq")}
            style={play ? at(T.lede) : undefined}
          >
            {current === 2 && deck ? (
              <Trans>{deck.name} is ready. Your first review takes a few minutes.</Trans>
            ) : (
              <Trans>Three steps to your first review.</Trans>
            )}
          </p>
        </div>
        <span className="hidden self-start text-sm text-muted tabular-nums @xl:block">
          {t`${current} of 3 done`}
        </span>
      </div>
      <ol className="grid gap-5 @3xl:grid-cols-3 @3xl:gap-6">
        {steps.map((step, i) => {
          const done = i < current;
          const here = i === current;
          return (
            <li
              key={step.key}
              className={clsx("flex gap-3", play && "seq")}
              style={play ? at(T.steps + i * T.gap) : undefined}
              aria-current={here ? "step" : undefined}
            >
              <span
                className={clsx(
                  "grid size-7 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums",
                  done
                    ? "bg-amber text-amber-ink"
                    : here
                      ? "bg-text text-canvas"
                      : "edge bg-plate text-muted",
                )}
              >
                {done ? <Check className="size-4" aria-label={t`Done`} /> : i + 1}
              </span>
              <div className="grid min-w-0 content-start justify-items-start gap-0.5 pt-0.5">
                <span
                  className={clsx(
                    "text-md font-medium",
                    here ? "text-text" : "text-text-2",
                    done && "line-through decoration-edge-2",
                  )}
                >
                  {step.title}
                </span>
                <span className="text-sm text-muted text-pretty">{step.detail}</span>
                {here && step.action && <div className="mt-2.5">{step.action}</div>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function pick(option: "lesson" | "ai_mcp" | "import" | "create_deck" | "explore") {
  captureAnalytics("empty_state_option_picked", { option });
}

/** The assistants' marks, each leading to its own setup guide; they pop in on the first visit. */
function AssistantMarks({ play, startAt }: { play: boolean; startAt: number }) {
  const { t } = useLingui();
  return (
    <ul className="-ms-0.5 flex -space-x-1 rtl:space-x-reverse">
      {ASSISTANTS.map(({ app, guide }, i) => {
        const name = app.name;
        return (
          <motion.li
            key={name}
            className="flex"
            initial={play ? { opacity: 0, scale: 0.6, y: 6 } : false}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              delay: (startAt + 140 + i * 70) / 1000,
              type: "spring",
              stiffness: 420,
              damping: 26,
            }}
          >
            <a
              href={publicSiteUrl(guide)}
              aria-label={t`Connect ${name}`}
              onClick={() => pick("ai_mcp")}
              className="relative rounded-[13px] transition-transform duration-200 ease-out hoverable:hover:z-10 hoverable:hover:-translate-y-0.5 motion-reduce:transition-none"
            >
              {/* The card's plate behind the tile cuts it out of the one it overlaps. */}
              <span className="block rounded-[13px] bg-plate p-0.5">
                <span className="edge grid size-9 place-items-center rounded-[11px] bg-plate">
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="size-[18px]"
                    fill={app.brand ?? "currentColor"}
                  >
                    {app.path && <path d={app.path} />}
                  </svg>
                </span>
              </span>
            </a>
          </motion.li>
        );
      })}
    </ul>
  );
}

const NOTE_MARKS = [
  { key: "photo", Icon: Camera },
  { key: "file", Icon: FileUp },
  { key: "paste", Icon: ClipboardPaste },
];

/** Camera, file and paste: the three ways a page of notes arrives. */
function NotesMarks() {
  return (
    <ul aria-hidden="true" className="-ms-0.5 flex -space-x-1 rtl:space-x-reverse">
      {NOTE_MARKS.map(({ key, Icon }) => (
        <li key={key} className="block rounded-[13px] bg-plate p-0.5">
          <span className="edge grid size-9 place-items-center rounded-[11px] bg-plate text-text">
            <Icon className="size-[18px]" />
          </span>
        </li>
      ))}
    </ul>
  );
}

function ImportNames() {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {IMPORTS.map((n) => (
        <li key={n} className="edge rounded-md bg-plate px-2 py-1 text-sm font-medium text-text-2">
          {n}
        </li>
      ))}
    </ul>
  );
}

interface CreateProps {
  /** The learner already has a deck, so this offers to fill it. */
  started: boolean;
  play: boolean;
  onSmartAdd: (() => void) | undefined;
  onCreateDeck: (() => void) | undefined;
}

/** Every way to make a deck of one's own, each a card with its own press, in the order people use them. */
export function CreateFirstDeck({ started, play, onSmartAdd, onCreateDeck }: CreateProps) {
  const st = useStaticNav();
  const card = clsx("edge grid content-between gap-5 rounded-xl bg-plate p-5", play && "seq");
  return (
    <section aria-labelledby="create-title" className="grid gap-2.5">
      <div
        className={clsx(
          "flex min-h-8 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1",
          play && "seq",
        )}
        style={play ? at(T.below) : undefined}
      >
        <h2 id="create-title" className="text-lg font-medium">
          {started ? <Trans>More ways to add cards</Trans> : <Trans>Create your first deck</Trans>}
        </h2>
        {!started && (
          <button
            type="button"
            onClick={() => {
              pick("create_deck");
              onCreateDeck?.();
            }}
            aria-disabled={!onCreateDeck}
            className="text-sm font-medium text-text-2 underline decoration-edge-2 underline-offset-4 transition-colors duration-150 hoverable:hover:text-text hoverable:hover:decoration-text"
          >
            <Trans>Or start an empty deck</Trans>
          </button>
        )}
      </div>
      <div className="grid gap-3 @3xl:grid-cols-3 @3xl:gap-4">
        <article className={card} style={play ? at(T.below + 60) : undefined}>
          <div className="grid gap-3">
            <NotesMarks />
            <div className="grid gap-1">
              <h3 className="text-md font-medium">
                <Trans>From your notes</Trans>
              </h3>
              <p className="text-sm text-muted text-pretty">
                <Trans>
                  Photograph a page, upload a PDF or paste text. Lymi picks the words worth a card.
                </Trans>
              </p>
            </div>
          </div>
          <Button
            className="justify-self-start"
            onClick={() => {
              pick("lesson");
              onSmartAdd?.();
            }}
            aria-disabled={!onSmartAdd}
          >
            <Camera data-icon="inline-start" aria-hidden="true" />
            <Trans>Add your notes</Trans>
          </Button>
        </article>
        <article className={card} style={play ? at(T.below + 140) : undefined}>
          <div className="grid gap-3">
            <AssistantMarks play={play} startAt={T.below + 140} />
            <div className="grid gap-1">
              <h3 className="text-md font-medium">
                <Trans>Connect your AI assistant</Trans>
              </h3>
              <p className="text-sm text-muted text-pretty">
                <Trans>Then ask Claude, ChatGPT, Gemini or Grok for cards right in the chat.</Trans>
              </p>
            </div>
          </div>
          <Button
            className="justify-self-start"
            render={
              <a
                href={publicSiteUrl("/docs/mcp")}
                onClick={(e) => {
                  if (st) e.preventDefault();
                  else pick("ai_mcp");
                }}
              />
            }
          >
            <Plug data-icon="inline-start" aria-hidden="true" />
            <Trans>Connect</Trans>
          </Button>
        </article>
        <article className={card} style={play ? at(T.below + 220) : undefined}>
          <div className="grid gap-3">
            <ImportNames />
            <div className="grid gap-1">
              <h3 className="text-md font-medium">
                <Trans>Import a deck</Trans>
              </h3>
              <p className="text-sm text-muted text-pretty">
                <Trans>From Anki, Mochi, Noji or Quizlet. Its review history comes with it.</Trans>
              </p>
            </div>
          </div>
          <Button
            className="justify-self-start"
            render={<NavLink to="/settings" hash="import" onClick={() => pick("import")} />}
          >
            <FileUp data-icon="inline-start" aria-hidden="true" />
            <Trans>Import</Trans>
          </Button>
        </article>
      </div>
    </section>
  );
}

interface ReadyProps {
  ready: PublicDeckSummary[];
  /** The language the learner most likely came for, chosen before they choose. */
  initialLanguage: string | null;
  play: boolean;
  /** Adds the deck and opens its first review. */
  onAdd: ((deck: PublicDeckSummary) => void) | undefined;
  /** The deck being added, so its tile shows it. */
  adding: string | undefined;
}

/** How many decks the row holds before Explore takes over. */
const ROW_DECKS = 12;

/**
 * Ready-made decks under one sentence, "I'm learning …", whose last words are the choice. The decks
 * sit in one row that scrolls sideways, faded at its end while more follow.
 */
export function ReadyToStart({ ready, initialLanguage, play, onAdd, adding }: ReadyProps) {
  const { t, i18n } = useLingui();
  const names = useMemo(() => new Intl.DisplayNames([i18n.locale], { type: "language" }), [i18n]);
  const languages = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of ready) {
      const lang = taughtLanguage(d);
      if (lang) counts.set(lang, (counts.get(lang) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([l]) => l);
  }, [ready]);
  const tests = ready.some((d) => !taughtLanguage(d));
  const [choice, setChoice] = useState(() =>
    initialLanguage && languages.includes(initialLanguage) ? initialLanguage : "all",
  );
  const label = (l: string) => {
    try {
      return names.of(l) ?? l;
    } catch {
      return l;
    }
  };
  const items = [
    { value: "all", label: t`Anything` },
    ...languages.map((l) => ({ value: l, label: label(l) })),
    ...(tests ? [{ value: "test", label: t`For a test` }] : []),
  ];
  // A language leads with the decks a beginner starts from, as Welcome on the phone offers them.
  const decks = (
    choice === "all"
      ? ready
      : choice === "test"
        ? ready.filter((d) => !taughtLanguage(d))
        : decksFor(ready, "language", choice)
  ).slice(0, ROW_DECKS);
  return (
    <section
      aria-labelledby="ready-title"
      className={clsx("grid gap-3", play && "seq")}
      style={play ? at(T.below + 320) : undefined}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
        <h2 id="ready-title" className="text-lg font-medium">
          <Trans>Or start with a ready-made deck</Trans>
        </h2>
        <NavLink
          to="/explore"
          onClick={() => pick("explore")}
          className="relative -me-1 inline-flex items-center gap-0.5 rounded-sm px-1.5 py-1 text-sm font-medium text-text-2 transition-colors duration-150 hoverable:hover:text-text"
        >
          <Trans>Explore all decks</Trans>
          <ChevronRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        </NavLink>
      </div>
      {/* A quiet line under the heading: the choice is a pill, so it reads as a control and never outweighs the title. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-base text-text-2">
        <span id="learning-label">
          <Trans>I’m learning</Trans>
        </span>
        <Select value={choice} onValueChange={(v) => setChoice(v as string)} items={items}>
          <SelectTrigger
            look="chip"
            aria-labelledby="learning-label"
            className="group edge inline-flex h-8 cursor-pointer items-center gap-1 rounded-full bg-plate ps-3 pe-2 text-base font-medium text-text shadow-[0_1px_2px_oklch(0_0_0/0.06)] outline-none transition-[background-color,box-shadow] duration-150 hoverable:hover:veil focus-visible:ring-2 focus-visible:ring-ring data-open:edge-2"
          >
            <SelectValue />
            <ChevronDown
              className="size-4 shrink-0 text-text-2 transition-transform duration-150 group-data-open:rotate-180 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* Keyed by the choice, so a new choice starts the row at its first deck. */}
      <DeckRow key={choice} decks={decks} onAdd={onAdd} adding={adding} />
    </section>
  );
}

/** The decks in one row that scrolls sideways, faded at its end while more follow. */
function DeckRow({
  decks,
  onAdd,
  adding,
}: {
  decks: PublicDeckSummary[];
  onAdd: ReadyProps["onAdd"];
  adding: string | undefined;
}) {
  const strip = useRef<HTMLUListElement>(null);
  const [more, setMore] = useState(false);
  useLayoutEffect(() => {
    const el = strip.current;
    if (!el) return;
    const measure = () => setMore(el.scrollWidth - (Math.abs(el.scrollLeft) + el.clientWidth) > 4);
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, []);
  return (
    <ul
      ref={strip}
      aria-labelledby="ready-title"
      data-fade={more || undefined}
      className="shelf-strip -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-1 px-1 pb-1 @3xl:gap-4"
    >
      {decks.map((deck) => (
        <li key={deck.slug} className="w-[min(15rem,72%)] shrink-0 snap-start @3xl:w-60">
          <DeckTile
            deck={deck}
            adding={adding === deck.slug}
            onAdd={onAdd && (() => onAdd(deck))}
          />
        </li>
      ))}
    </ul>
  );
}
