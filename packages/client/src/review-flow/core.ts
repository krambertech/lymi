import {
  countedRating,
  type Drawn,
  drawKey,
  modeKey,
  type Rating,
  type ReviewAid,
} from "@lymi/core";
import type { ReviewScopeKind } from "@lymi/core/analytics";
import type { QueueItem, ReviewScope } from "../api";
import type { Recorded } from "../grades";
import {
  type DrawData,
  type DrawState,
  type LocalGrade,
  reviewItem,
  stateBefore,
} from "../review-draw";
import {
  type Ending,
  type EndScreen,
  forgottenRound,
  legFinish,
  type Offer,
  type RoundAsk,
  type RoundFetch,
  reviewEnd,
  roundWalk,
} from "../review-end";
import type { ReviewLeg } from "./legs";

/** Cards drawn ahead of the one on screen; fewer left than this and the draw is fetched again. */
export const LOOKAHEAD = 3;
/** Local grades a fetch can fall behind by before the draw data is refreshed. */
export const REFRESH_AFTER = 20;

export type Pinned = { cardId: string; mode: string };

/** One part of a review, ADR 0021: a draw, which may stop at `until`, or a fixed list. */
export type Leg = { date: string } & (
  | { kind: "draw"; from: number; until: number | null }
  | { kind: "list"; size: number }
  | { kind: "forgotten"; items: Drawn[] }
);

/** Where the last end screen left the day, or where it stood when the review opened. */
export type Mark = { attempts: number; satisfied: boolean };

/** A list leg's cards by key: graded, sent to the end by a refused grade, or out because the card is gone. */
export type LegCards = {
  graded: ReadonlySet<string>;
  returned: ReadonlySet<string>;
  dropped: ReadonlySet<string>;
};

/** The last grade, so Undo can bring its card back. */
export type LastGrade = { item: QueueItem; grade: LocalGrade; listed: boolean };

export interface FlowState {
  leg: Leg | null;
  mark: Mark | null;
  /** Left partway: the leg waits behind the end screen, and Continue picks it up again. */
  paused: boolean;
  /** The card on screen stays put while a refetch lands; only a grade moves it. */
  pinned: Pinned | null;
  cards: LegCards;
  /** Cards archived from this review, gone from it at once rather than when the draw is fetched again. */
  archived: ReadonlySet<string>;
  /** Grades this review has recorded that the server has not answered yet. */
  sending: number;
  /** The refetch asked for once this leg's page in hand ran out; a new leg forgets it. */
  ask: (RoundAsk & { leg: Leg }) | null;
  /** Grades on screen so far, which moves with Undo, so a card shown again is a new showing. */
  position: number;
  last: LastGrade | null;
  /** Grades taken back, by when they were made, whose answers from the server no longer apply. */
  undone: ReadonlySet<string>;
}

const NO_CARDS: LegCards = { graded: new Set(), returned: new Set(), dropped: new Set() };

export const startFlow = (): FlowState => ({
  leg: null,
  mark: null,
  paused: false,
  pinned: null,
  cards: NO_CARDS,
  archived: new Set(),
  sending: 0,
  ask: null,
  position: 0,
  last: null,
  undone: new Set(),
});

export const cardKey = (item: Pick<QueueItem, "card" | "mode">) =>
  drawKey(item.card.id, modeKey(item.mode));

const withKey = (keys: ReadonlySet<string>, key: string) => new Set(keys).add(key);
const withoutKey = (keys: ReadonlySet<string>, key: string) => {
  const next = new Set(keys);
  next.delete(key);
  return next;
};

/** What is left of a list leg, with the cards a refused grade sent back at the end. */
function leftInLeg<T>(items: readonly T[], cards: LegCards, key: (item: T) => string): T[] {
  const left = items.filter(
    (item) => !cards.graded.has(key(item)) && !cards.dropped.has(key(item)),
  );
  return [
    ...left.filter((item) => !cards.returned.has(key(item))),
    ...left.filter((item) => cards.returned.has(key(item))),
  ];
}

export type FlowEvent =
  | { type: "began"; leg: Leg; mark: Mark }
  | { type: "pinned"; pinned: Pinned }
  | { type: "asked"; ask: RoundAsk & { leg: Leg } }
  | { type: "graded"; last: LastGrade }
  /** The server's answer to a grade this review made. */
  | { type: "settled"; last: LastGrade; outcome: Recorded }
  /** That grade's send is over, however it went. */
  | { type: "sent" }
  | { type: "undone"; last: LastGrade }
  /** The server kept a grade Undo tried to take back; `step` unless a new grade came first. */
  | { type: "undoRefused"; last: LastGrade; step: boolean }
  | { type: "archived"; cardId: string; keys: readonly string[]; pin?: Pinned | undefined }
  | { type: "restored"; cardId: string; keys: readonly string[]; pin?: Pinned | undefined }
  | { type: "paused" }
  | { type: "movedOn"; mark: Mark }
  | { type: "nextLeg"; leg: Leg; mark: Mark };

export function flowReducer(flow: FlowState, event: FlowEvent): FlowState {
  switch (event.type) {
    case "began":
      return { ...flow, leg: event.leg, mark: event.mark, cards: NO_CARDS, paused: false };
    case "pinned":
      return { ...flow, pinned: event.pinned };
    case "asked":
      return { ...flow, ask: event.ask };
    case "graded": {
      const { last } = event;
      return {
        ...flow,
        cards: last.listed
          ? { ...flow.cards, graded: withKey(flow.cards.graded, cardKey(last.item)) }
          : flow.cards,
        sending: flow.sending + 1,
        pinned: null,
        position: flow.position + 1,
        last,
      };
    }
    case "settled": {
      const { last, outcome } = event;
      if (!last.listed || (outcome !== "refused" && outcome !== "gone")) return flow;
      if (flow.undone.has(last.grade.reviewedAt)) return flow;
      const key = cardKey(last.item);
      return {
        ...flow,
        cards: {
          graded: withoutKey(flow.cards.graded, key),
          returned: outcome === "refused" ? withKey(flow.cards.returned, key) : flow.cards.returned,
          dropped: outcome === "gone" ? withKey(flow.cards.dropped, key) : flow.cards.dropped,
        },
      };
    }
    case "sent":
      return { ...flow, sending: flow.sending - 1 };
    case "undone": {
      const { last } = event;
      return {
        ...flow,
        undone: withKey(flow.undone, last.grade.reviewedAt),
        last: null,
        cards: last.listed
          ? { ...flow.cards, graded: withoutKey(flow.cards.graded, cardKey(last.item)) }
          : flow.cards,
        pinned: { cardId: last.item.card.id, mode: modeKey(last.item.mode) },
        position: flow.position - 1,
      };
    }
    case "undoRefused": {
      const { last } = event;
      const undone = withoutKey(flow.undone, last.grade.reviewedAt);
      if (!event.step) return { ...flow, undone };
      return {
        ...flow,
        undone,
        cards: last.listed
          ? { ...flow.cards, graded: withKey(flow.cards.graded, cardKey(last.item)) }
          : flow.cards,
        pinned: null,
        position: flow.position + 1,
        last,
      };
    }
    case "archived":
      return {
        ...flow,
        archived: withKey(flow.archived, event.cardId),
        cards: {
          ...flow.cards,
          dropped: event.keys.reduce(withKey, flow.cards.dropped),
        },
        pinned: event.pin ?? null,
      };
    case "restored":
      return {
        ...flow,
        archived: withoutKey(flow.archived, event.cardId),
        cards: {
          ...flow.cards,
          dropped: event.keys.reduce(withoutKey, flow.cards.dropped),
        },
        // It comes back to the top, where it was, rather than wherever the draw would put it.
        pinned: event.pin ?? flow.pinned,
      };
    case "paused":
      return { ...flow, paused: true };
    case "movedOn":
      return { ...flow, mark: event.mark, paused: false, pinned: null, last: null };
    case "nextLeg":
      return {
        ...flow,
        leg: event.leg,
        mark: event.mark,
        paused: false,
        pinned: null,
        last: null,
        cards: NO_CARDS,
      };
  }
}

/** A deck as the end screen weighs it. */
export interface FlowDeck {
  id: string;
  seriesId?: string | null | undefined;
  due: number;
}

export interface FlowInputs {
  scope: ReviewScope;
  /** A fixed list rather than a draw: a round from Today, or cards chosen on a deck page. */
  list: "round" | "chosen" | null;
  /** The draw from this mount's fetch on, less the cards archived in this review. */
  data: (DrawData & { fetchedAt: number }) | undefined;
  state: DrawState | undefined;
  /** Cards the draw still holds, the number Today shows; a forgotten card owed a return stays in it. */
  left: number;
  drawFetching: boolean;
  /** The last fetch failed, or the device is offline. */
  unreachable: boolean;
  /** The round's list from this mount's fetch on. */
  round: { items: QueueItem[]; total: number } | undefined;
  roundFetch: RoundFetch;
  /** When the last local grade was made. */
  lastChange: number;
  decks: readonly FlowDeck[] | undefined;
  /** The section the review is scoped to, once known. */
  scopeSection: { due: number } | undefined;
  /** A scoped end names its deck, series or section and weighs the decks outside it, so it waits for them. */
  decksLoading: boolean;
  /** The day's streak read is from this mount's fetch on. */
  streakSettled: boolean;
  /** Today already counts for the streak. */
  daySatisfied: boolean;
}

export interface FlowView {
  leg: Leg | null;
  mark: Mark | null;
  paused: boolean;
  position: number;
  /** The card on screen. */
  current: QueueItem | null;
  /** The cards coming after it, for fetching pictures ahead. */
  upcoming: QueueItem[];
  /** Where the draw's goal stop sits, or null when this leg has none. */
  until: number | null;
  /** The leg's own count, the header's in a leg with no stop at the goal. */
  progress: { done: number; total: number } | null;
  /** The leg stopped: at the goal, by running out, or by the learner leaving. */
  stopped: boolean;
  ending: Ending;
  /** The end screen once it can be shown, or `unchecked` when the day cannot be judged. */
  end: EndScreen | "unchecked" | null;
  forgotten: Drawn[];
  /** The learner graded since the last end screen, so leaving ends on one. */
  added: boolean;
  /** Changes the review owes itself: the first leg, and a card to pin. */
  steps: FlowEvent[];
  /** An empty draw needs a fetch begun after the last grade before it is believed. */
  owesDrawFetch: boolean;
  /** An emptied page of a round asks for the round again. */
  askRound: (RoundAsk & { leg: Leg }) | null;
  legReport: ReviewLeg;
}

/** Cards due in decks outside the review's scope, or null while unknown. */
function dueElsewhere({ scope, decks, scopeSection }: FlowInputs): number | null {
  const { deck, series, section } = scope;
  if (!deck && !series) return 0;
  if (!decks || (section && !scopeSection)) return null;
  const outside = decks
    .filter((d) => (series ? d.seriesId !== series : d.id !== deck))
    .reduce((n, d) => n + d.due, 0);
  // The rest of a section's deck is its other sections.
  if (!section || !scopeSection) return outside;
  return outside + Math.max(0, (decks.find((d) => d.id === deck)?.due ?? 0) - scopeSection.due);
}

function legScope(leg: Leg | null, inputs: FlowInputs): ReviewScopeKind {
  if (leg?.kind === "forgotten") return "round";
  if (leg?.kind === "list") return inputs.list === "chosen" ? "chosen" : "round";
  const { deck, series, section } = inputs.scope;
  return section ? "section" : deck ? "deck" : series ? "series" : "day";
}

/** Where the review stands, from what it has done and what was fetched. */
export function flowView(flow: FlowState, inputs: FlowInputs): FlowView {
  const { data, state, left, scope, round } = inputs;
  const { deck, series } = scope;
  const scoped = !!deck || !!series;
  const listed = inputs.list !== null;
  const { mark, paused, pinned, cards } = flow;

  const pinnedItem = data && state && pinned ? reviewItem(data, state.log, pinned) : null;
  // Past midnight, yesterday's data does not know yesterday's grades moved the schedule, so a new card waits for today's.
  const staleDay = !!data && !!state && data.day.date !== state.day.date && inputs.drawFetching;
  const drawn =
    pinnedItem ??
    (data && state?.next && !staleDay ? reviewItem(data, state.log, state.next) : null);

  // A leg belongs to its day, so one left open past midnight gives way to a fresh one.
  const leg = flow.leg && state && flow.leg.date === state.day.date ? flow.leg : null;
  const drawLeg = leg?.kind === "draw" ? leg : null;
  const until = drawLeg?.until ?? null;
  // A goal lowered on another device meanwhile stops the leg there instead.
  const atStop =
    until !== null && !!data && !!state && state.attempts >= Math.min(until, data.goal);
  const listLeft: QueueItem[] =
    leg?.kind === "list"
      ? leftInLeg(round?.items ?? [], cards, cardKey)
      : leg?.kind === "forgotten" && data && state
        ? leftInLeg(leg.items, cards, (d) => drawKey(d.cardId, d.mode)).flatMap(
            (d) => reviewItem(data, state.log, d) ?? [],
          )
        : [];
  const current = !leg || paused ? null : drawLeg ? (atStop ? null : drawn) : (listLeft[0] ?? null);

  const done = !leg || !state ? 0 : drawLeg ? state.attempts - drawLeg.from : cards.graded.size;
  const total = !leg
    ? 0
    : leg.kind === "list"
      ? leg.size - cards.dropped.size
      : leg.kind === "forgotten"
        ? leg.items.length - cards.dropped.size
        : until !== null && drawLeg
          ? Math.min(until - drawLeg.from, done + left)
          : done + left;

  const counted = cards.graded.size + cards.dropped.size;
  const ask = flow.ask?.leg === leg ? flow.ask : null;
  // The queue serves a round a page at a time, so an emptied page asks for the round again, and the
  // end waits while it loads. The round is walked once every card in it is graded or dropped, or
  // when that fetch lands with nothing left for it. Offline or failed, the end shows unwalked.
  const roundState =
    leg?.kind === "list"
      ? roundWalk({
          size: leg.size,
          done: counted,
          left: current ? 1 : listLeft.length,
          ask,
          fetch: inputs.roundFetch,
        })
      : null;
  // A forgotten round holds every card from the start, so it is walked once none is left to show.
  const walked = roundState
    ? roundState.walked
    : leg?.kind === "forgotten" && !current && listLeft.length === 0;
  const roundOwed = !!roundState?.owed && !current;

  // An empty draw is confirmed by a fetch begun after the last change, or taken as it is offline.
  // Confirmed stays confirmed through a background refetch, so the end never blinks out and replays.
  const confirmed = !!data && data.fetchedAt >= inputs.lastChange;
  const exhausted = !!data && !state?.next;
  const stopped =
    !!leg && !!data && !!state && !current && (paused || !drawLeg || atStop || exhausted);
  const ending: Ending = paused ? "left" : atStop ? "goal" : "empty";
  const forgotten = stopped && data && state ? forgottenRound(data, state, deck) : [];
  // An empty draw waits for a fetch begun after the last grade, so the heading never changes once shown.
  const checking =
    stopped &&
    !paused &&
    (left === 0 || (!!drawLeg && !atStop)) &&
    !confirmed &&
    !(inputs.unreachable && !inputs.drawFetching);
  // The end waits for the last grades to land, so a refusal never takes back an end already shown.
  const landing = flow.sending > 0 && !inputs.unreachable;
  const end =
    stopped && !checking && !landing && !roundOwed && !inputs.decksLoading && mark && data && state
      ? reviewEnd({
          stretch: !drawLeg ? "list" : scoped ? "scope" : "day",
          ending,
          goal: data.goal,
          from: mark.attempts,
          attempts: state.attempts,
          satisfiedBefore: mark.satisfied,
          left,
          confirmed,
          elsewhere: dueElsewhere(inputs),
          forgotten: forgotten.length,
        })
      : null;

  const steps: FlowEvent[] = [];
  if (!leg && data && state && inputs.streakSettled && !(listed && !round)) {
    const { attempts } = state;
    const date = state.day.date;
    steps.push({
      type: "began",
      mark: { attempts, satisfied: attempts >= data.goal || inputs.daySatisfied },
      // The queue serves a round a page at a time, so the leg is sized by the round's total, not the first page.
      leg:
        listed && round
          ? { kind: "list", date, size: round.total }
          : // The draw stops at the goal only for the whole day below it; decks and rounds run to their end.
            {
              kind: "draw",
              date,
              from: attempts,
              until: !scoped && attempts < data.goal ? data.goal : null,
            },
    });
  }
  // A pinned card a refetch no longer holds, such as one archived meanwhile, gives way.
  if (state?.next && !staleDay && (!pinned || !pinnedItem)) {
    steps.push({ type: "pinned", pinned: { cardId: state.next.cardId, mode: state.next.mode } });
  }

  return {
    leg,
    mark,
    paused,
    position: flow.position,
    current,
    upcoming: drawLeg ? (state?.upcoming ?? []) : listLeft,
    until,
    progress: leg ? { done, total } : null,
    stopped,
    ending,
    end,
    forgotten,
    added: !!state && !!mark && state.attempts > mark.attempts,
    steps,
    // A read begun before the last grade lands can miss what it changed, such as the next section opening.
    owesDrawFetch: checking && !landing && !inputs.unreachable && !inputs.drawFetching,
    askRound:
      roundState?.refetch && !current && leg
        ? { leg, at: inputs.roundFetch.updatedAt, done: counted }
        : null,
    legReport: {
      key: leg && mark ? `${leg.date}:${leg.kind}:${mark.attempts}` : null,
      date: leg?.date ?? null,
      scope: legScope(leg, inputs),
      before: mark?.attempts ?? 0,
      done,
      count: total,
      presenting: !!current,
      stopped,
      paused,
      finished: legFinish(
        end,
        ending,
        drawLeg ? { stretch: "day", confirmed } : { stretch: "list", walked },
      ),
    },
  };
}

/** What the screen adds to a grade: the aid before the reveal, and its timings and faded readings. */
export type GradeExtras = Partial<
  Pick<LocalGrade, "recallMs" | "gradeMs" | "readingsFaded" | "aid">
>;

/** A grade of the card on screen, as the outbox keeps it. Easy on a second try counts as Good, ADR 0031. */
export function gradeRecord(
  data: DrawData,
  state: DrawState,
  item: QueueItem,
  rating: Rating,
  reviewedAt: string,
  extras: GradeExtras & { aid?: ReviewAid | undefined },
): LocalGrade {
  const repeat = state.log.some((e) => e.cardId === item.card.id && e.mode === modeKey(item.mode));
  return {
    cardId: item.card.id,
    mode: item.mode,
    rating: countedRating(rating, repeat),
    reviewedAt,
    stateBefore: repeat ? stateBefore(data, state.log, item.card.id, item.mode) : item.fsrsState,
    ...extras,
  };
}

/** What taking an offer does to the leg: where the end screen leaves the day, and what comes next. */
export function offerEvent(
  offer: Offer,
  view: FlowView,
  inputs: Pick<FlowInputs, "data" | "state">,
): Extract<FlowEvent, { type: "movedOn" | "nextLeg" }> | null {
  const { data, state } = inputs;
  if (!data || !state) return null;
  const end = view.end === "unchecked" ? null : view.end;
  const mark = {
    attempts: state.attempts,
    satisfied: !!view.mark?.satisfied || !!end?.satisfied,
  };
  if (offer.kind === "continue" && offer.to === "resume") return { type: "movedOn", mark };
  const date = state.day.date;
  return {
    type: "nextLeg",
    mark,
    leg:
      offer.kind === "forgotten"
        ? { kind: "forgotten", date, items: view.forgotten }
        : {
            kind: "draw",
            date,
            from: state.attempts,
            until: state.attempts < data.goal ? data.goal : null,
          },
  };
}
