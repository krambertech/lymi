import { emptyState, type FsrsCard, type Rating, schedule } from "@lymi/core";
import * as Linking from "expo-linking";
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CARDS, DAILY_GOAL, type DemoCard, PAST_WEEK, STREAK_BEFORE_TODAY } from "./demo";

/** The design choices this proof of concept puts side by side. */
export interface Directions {
  /** Glass: the web's pill and top bar drawn in Liquid Glass. Lymi: the same, opaque. */
  chrome: "glass" | "lymi";
  /** Plate: Today's due card as on the web. Lit: the lantern lights the top of the screen. */
  today: "plate" | "lit";
  /** Buttons: the four grades as plates. Glass: the same four in Liquid Glass. Swipe: plates plus swiping the card. */
  review: "buttons" | "glass" | "swipe";
  /** Onest: the brand face everywhere. System: San Francisco everywhere. Mixed: Onest for display, SF for the rest. */
  type: "onest" | "system" | "mixed";
}

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
  directions: Directions;
  setDirection: <K extends keyof Directions>(key: K, value: Directions[K]) => void;
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
  const [directions, setDirections] = useState<Directions>({
    chrome: "glass",
    today: "lit",
    review: "buttons",
    type: "onest",
  });

  // lymi://today?chrome=lymi&lead=lit&grade=swipe&font=system opens the proof of concept in one combination.
  const url = Linking.useLinkingURL();
  useEffect(() => {
    if (!url) return;
    const { queryParams } = Linking.parse(url);
    const chrome = queryParams?.chrome;
    const lead = queryParams?.lead;
    const grading = queryParams?.grade;
    const type = queryParams?.font;
    setDirections((d) => ({
      chrome: chrome === "glass" || chrome === "lymi" ? chrome : d.chrome,
      today: lead === "plate" || lead === "lit" ? lead : d.today,
      review:
        grading === "buttons" || grading === "glass" || grading === "swipe" ? grading : d.review,
      type: type === "onest" || type === "system" || type === "mixed" ? type : d.type,
    }));
  }, [url]);

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

  const setDirection = useCallback(
    <K extends keyof Directions>(key: K, value: Directions[K]) =>
      setDirections((d) => ({ ...d, [key]: value })),
    [],
  );

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
      directions,
      setDirection,
      grade,
      addCard,
      reset,
    };
  }, [cards, reviewsToday, fed, forgottenToday, directions, setDirection, grade, addCard, reset]);

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
