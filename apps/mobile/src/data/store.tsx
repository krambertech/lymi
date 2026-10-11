import { emptyState, type FsrsCard, type Rating, schedule } from "@lymi/core";
import { createContext, type ReactNode, use, useCallback, useMemo, useState } from "react";
import { CARDS, DAILY_GOAL, type DemoCard, PAST_WEEK, STREAK_BEFORE_TODAY } from "./demo";

export interface Card extends DemoCard {
  fsrs: FsrsCard;
}

interface Store {
  cards: Card[];
  reviewsToday: number;
  /** Bumped by every accepted grade; the lantern breathes and sparks on it. */
  fed: number;
  forgottenToday: string[];
  goal: number;
  week: number[];
  streak: number;
  /** Today's draw has nothing left. With reviews below the goal that still counts the day. */
  dayDone: boolean;
  due: Card[];
  grade: (id: string, rating: Rating) => void;
  addCard: (card: Pick<DemoCard, "term" | "meaning" | "deck">) => void;
  reset: () => void;
}

const Context = createContext<Store | null>(null);

const initialCards = () => CARDS.map((c) => ({ ...c, fsrs: emptyState() }));

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cards, setCards] = useState<Card[]>(initialCards);
  const [reviewsToday, setReviews] = useState(0);
  const [fed, setFed] = useState(0);
  const [forgottenToday, setForgotten] = useState<string[]>([]);

  const grade = useCallback((id: string, rating: Rating) => {
    setCards((all) =>
      all.map((c) => {
        if (c.id !== id) return c;
        // The same FSRS scheduler the Worker runs, imported unchanged from packages/core.
        const next = schedule(c.fsrs, rating).card;
        // A forgotten card comes back later in the review, so it stays due until it is known.
        return {
          ...c,
          fsrs: next,
          due: rating === 1,
          state: rating === 1 ? "learning" : rating >= 3 ? "known" : c.state,
        };
      }),
    );
    if (rating === 1) setForgotten((f) => (f.includes(id) ? f : [...f, id]));
    setReviews((n) => n + 1);
    setFed((n) => n + 1);
  }, []);

  const addCard = useCallback((card: Pick<DemoCard, "term" | "meaning" | "deck">) => {
    setCards((all) => [
      { ...card, id: `new-${Date.now()}`, state: "new", due: false, fsrs: emptyState() },
      ...all,
    ]);
  }, []);

  const reset = useCallback(() => {
    setCards(initialCards());
    setReviews(0);
    setFed(0);
    setForgotten([]);
  }, []);

  const value = useMemo<Store>(() => {
    const due = cards.filter((c) => c.due);
    const dayDone = reviewsToday > 0 && due.length === 0;
    const satisfied = reviewsToday >= DAILY_GOAL || dayDone;
    return {
      cards,
      reviewsToday,
      fed,
      forgottenToday,
      goal: DAILY_GOAL,
      week: [...PAST_WEEK, reviewsToday],
      streak: STREAK_BEFORE_TODAY + (satisfied ? 1 : 0),
      dayDone,
      due,
      grade,
      addCard,
      reset,
    };
  }, [cards, reviewsToday, fed, forgottenToday, grade, addCard, reset]);

  return <Context value={value}>{children}</Context>;
}

export function useStore() {
  const store = use(Context);
  if (!store) throw new Error("useStore outside StoreProvider");
  return store;
}

/** Today's progress toward the goal, 0 to 1, as the lantern reads it. Finishing everything is full. */
export function useProgress() {
  const { reviewsToday, goal, dayDone } = useStore();
  return dayDone ? 1 : Math.min(1, reviewsToday / goal);
}
