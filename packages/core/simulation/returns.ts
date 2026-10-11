import { State } from "ts-fsrs";
import {
  type DayWindow,
  DRAW_POLICY,
  type DrawPolicy,
  drawKey,
  forgottenToday,
  missed,
  RETURN_RULE,
  type ReturnRule,
} from "../src/draw";
import { emptyState, retrievability } from "../src/fsrs";
import { type Attempt, collection, DAY_MS, playDay, rng, type SimMode, utcDay } from "./learner";

const START = Date.parse("2026-01-01T12:00:00Z");
const MODE = "term_to_meaning";

const rule = (returns: Partial<ReturnRule>): DrawPolicy => ({
  ...DRAW_POLICY,
  returns: { ...RETURN_RULE, ...returns },
});

/** The return rules weighed for ADR 0031, each run through the real draw with only the rule swapped. */
export const RETURN_RULES = {
  /** ADR 0024: Forgot or a learning Hard returns after 5, 10 and 20, early when nothing else is left. */
  widening: rule({ gaps: [5, 10, 20], jitter: 1, owes: missed, early: true }),
  once10: rule({ gaps: [10] }),
  /** Lymi's rule with Hard still owing a return, to show what Hard alone costs. */
  hardToo: rule({ owes: missed }),
  once30: rule({ gaps: [30] }),
  none: rule({ gaps: [] }),
  lymi: DRAW_POLICY,
} satisfies Record<string, DrawPolicy>;

export type ReturnRuleId = keyof typeof RETURN_RULES;

export const RETURN_STUDY = {
  days: 365,
  goal: 50,
  seeds: [42, 7, 99, 1234],
  unseenPool: 20,
  /** Short reviews of one small deck, played until the deck has nothing left. */
  sittings: 200,
  sittingCards: 30,
} as const;

/** What one day's attempts spent on returns, and how close to the miss each came back. */
function tally(attempts: readonly Attempt[]) {
  const lastMiss = new Map<string, number>();
  const views = new Map<string, number>();
  let returns = 0;
  let lagSum = 0;
  attempts.forEach((a, i) => {
    const k = drawKey(a.cardId, a.mode);
    views.set(k, (views.get(k) ?? 0) + 1);
    if (a.kind === "return") {
      returns++;
      lagSum += i - (lastMiss.get(k) ?? i) - 1;
    }
    if (a.missed) lastMiss.set(k, i);
  });
  return {
    returns,
    lagSum,
    thrice: [...views.values()].filter((n) => n >= 3).length,
  };
}

function yearRun(policy: DrawPolicy, seed: number) {
  const { days, goal, unseenPool } = RETURN_STUDY;
  const random = rng(seed);
  const modes: SimMode[] = [];
  let returns = 0;
  let lagSum = 0;
  let thrice = 0;
  let waiting = 0;
  for (let d = 0; d < days; d++) {
    const day = utcDay(START + d * DAY_MS);
    const unseen = modes.filter((m) => m.card.state === State.New).length;
    for (let i = unseen; i < unseenPool; i++) {
      modes.push({
        cardId: `c${modes.length}`,
        deckId: "d",
        mode: MODE,
        card: emptyState(day.start),
        added: day.start,
        hasCue: true,
      });
    }
    const { log, attempts } = playDay(modes, day, random, goal, { policy });
    const t = tally(attempts);
    returns += t.returns;
    lagSum += t.lagSum;
    thrice += t.thrice;
    waiting += forgottenToday(log).length;
  }
  const end = new Date(START + days * DAY_MS);
  const introduced = modes.filter((m) => m.card.state !== State.New);
  return {
    introduced: introduced.length,
    remembered: introduced.reduce((sum, m) => sum + retrievability(m.card, end), 0),
    returnsPerDay: returns / days,
    lag: returns ? lagSum / returns : 0,
    thricePerWeek: (thrice / days) * 7,
    waitingPerDay: waiting / days,
  };
}

/** One deck reviewed to its end, where the old rule served returns early once the deck ran dry. */
function sittingRun(policy: DrawPolicy, seed: number) {
  const day: DayWindow = utcDay(Date.parse("2026-09-14T12:00:00Z"));
  const modes = collection(seed, day, RETURN_STUDY.sittingCards);
  const { log, attempts } = playDay(modes, day, rng(seed), 1_000, { policy });
  const t = tally(attempts);
  return { attempts: attempts.length, ...t, waiting: forgottenToday(log).length };
}

const round = (n: number, places = 1) => Math.round(n * 10 ** places) / 10 ** places;

/** A year at the default goal, and a run of short deck reviews, under each return rule. */
export function returnStudy() {
  const { seeds, sittings } = RETURN_STUDY;
  return (Object.keys(RETURN_RULES) as ReturnRuleId[]).map((id) => {
    const policy = RETURN_RULES[id];
    const years = seeds.map((seed) => yearRun(policy, seed));
    const mean = (key: keyof (typeof years)[number]) =>
      years.reduce((sum, run) => sum + run[key], 0) / years.length;
    const runs = Array.from({ length: sittings }, (_, i) => sittingRun(policy, i + 1));
    const total = (key: keyof (typeof runs)[number]) =>
      runs.reduce((sum, run) => sum + run[key], 0);
    return {
      id,
      introduced: Math.round(mean("introduced")),
      remembered: Math.round(mean("remembered")),
      returnsPerDay: round(mean("returnsPerDay")),
      lag: round(mean("lag")),
      thricePerWeek: round(mean("thricePerWeek")),
      waitingPerDay: round(mean("waitingPerDay")),
      sitting: {
        attempts: round(total("attempts") / sittings),
        returns: round(total("returns") / sittings),
        lag: round(total("returns") ? total("lagSum") / total("returns") : 0),
        waiting: round(total("waiting") / sittings),
      },
    };
  });
}
