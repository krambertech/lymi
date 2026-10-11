import {
  deckCardsQuery,
  decksQuery,
  queueQuery,
  roundsQuery,
  streakQuery,
} from "@lymi/client/queries";
import { type CardInput, DEFAULT_DAILY_GOAL, type Rating, type Round } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { demoServer } from "./demo-server";

// Each screen reads one resource under the web's query key, so a grade refreshes only what it
// moves. The demo server answers until the phone signs in; real data replaces only `queryFn`.

export const useDecks = () =>
  useQuery({ queryKey: [...decksQuery.queryKey], queryFn: async () => demoServer.decks() });

export const useDeckCards = (deckId: string) =>
  useQuery({
    queryKey: [...deckCardsQuery(deckId).queryKey],
    queryFn: async () => demoServer.deckCards(deckId),
  });

export const useStreak = () =>
  useQuery({ queryKey: [...streakQuery.queryKey], queryFn: async () => demoServer.streak() });

export const useRounds = () =>
  useQuery({ queryKey: [...roundsQuery.queryKey], queryFn: async () => demoServer.rounds() });

export interface ReviewScope {
  deck?: string | undefined;
  round?: Round | undefined;
}

/** A review's cards, fetched once as it opens; a review keeps its order, and the next one starts afresh. */
export const useReviewQueue = ({ deck, round }: ReviewScope) =>
  useQuery({
    queryKey: [...queueQuery({ deck }, round).queryKey],
    queryFn: async () => demoServer.queue({ deck }, round),
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

/** Today against the goal, as the lantern, the flame and the seven lights read it. */
export function useDay() {
  const { data } = useStreak();
  const reviewsToday = data?.today.attempts ?? 0;
  const goal = data?.today.goal ?? data?.goal ?? DEFAULT_DAILY_GOAL;
  // Finishing everything due counts the day, even below the goal.
  const dayDone = data?.today.outcome === "goal_met" || data?.today.outcome === "exhausted";
  const attempts = new Map(data?.days.map((d) => [d.date, d.attempts]));
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - i));
    return attempts.get(localDate(day)) ?? 0;
  });
  return {
    streak: data?.current ?? 0,
    reviewsToday,
    goal,
    dayDone,
    week,
    /** Bumped by every accepted grade; the lantern breathes and sparks on it. */
    fed: reviewsToday,
    /** 0 to 1. Finishing everything is full. */
    progress: dayDone ? 1 : Math.min(1, reviewsToday / goal),
  };
}

const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Grades a card, then refreshes what a grade moves: due counts and deck cards, the rounds, the streak. */
export function useGrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ cardId, rating }: { cardId: string; rating: Rating }) =>
      demoServer.grade(cardId, rating),
    onSuccess: () => {
      for (const queryKey of [decksQuery.queryKey, roundsQuery.queryKey, streakQuery.queryKey]) {
        void qc.invalidateQueries({ queryKey: [...queryKey] });
      }
    },
  });
}

export function useAddCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CardInput) => demoServer.addCard(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...decksQuery.queryKey] });
      void qc.invalidateQueries({ queryKey: [...roundsQuery.queryKey] });
    },
  });
}

/** Puts the demo back to the start of the day. */
export function useResetDemo() {
  const qc = useQueryClient();
  return () => {
    demoServer.reset();
    void qc.invalidateQueries();
  };
}

export type Standing = "new" | "learning" | "known";

/** How the learner reads an FSRS state: Review is Known, and Relearning is Learning again. */
export function standing(fsrsState: number | undefined): Standing {
  if (fsrsState === 2) return "known";
  return fsrsState === 1 || fsrsState === 3 ? "learning" : "new";
}
