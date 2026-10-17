import { emptyState, type FsrsCard, State, schedule } from "./fsrs";
import type { ImportedCard, ImportedProgress } from "./import";
import { directionsFromModes, introductionOrder, isImageMode } from "./modes";
import type { Rating, ReviewModeKey } from "./types";

const DAY_MS = 86_400_000;

/** One imported recall as Lymi's scheduler saw it, ready to store as a review row. */
export type ReplayedReview = {
  rating: Rating;
  reviewedAt: Date;
  /** FSRS state before the recall. */
  state: State;
  elapsedDays: number;
  scheduledDays: number;
  stability: number;
  difficulty: number;
};

/**
 * A mode's imported progress run through Lymi's scheduler one grade at a time, so every review
 * row carries Lymi's memory state. The source's due date is kept, so the learner's schedule does
 * not move on import. The source's own memory state is used only for a mode with a schedule and
 * no log, and a mode the source treats as not started stays new with its log as history.
 */
export function replayProgress(
  progress: ImportedProgress,
  now: Date,
): { state: FsrsCard; reviews: ReplayedReview[] } {
  const grades = progress.reviews
    .filter((review) => review.at.getTime() <= now.getTime())
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .filter((review, i, all) => i === 0 || review.at.getTime() !== all[i - 1]?.at.getTime());

  const reviews: ReplayedReview[] = [];
  let state = grades[0] ? emptyState(grades[0].at) : emptyState(now);
  for (const grade of grades) {
    const result = schedule(state, grade.rating, grade.at);
    reviews.push({
      rating: grade.rating,
      reviewedAt: grade.at,
      state: result.log.state,
      elapsedDays: result.log.elapsedDays,
      scheduledDays: result.log.scheduledDays,
      stability: result.card.stability,
      difficulty: result.card.difficulty,
    });
    state = result.card;
  }

  if (progress.unstarted) return { state: emptyState(now), reviews };

  if (grades.length === 0) {
    if (!progress.memory) return { state: emptyState(now), reviews };
    const { stability, difficulty, lastReview } = progress.memory;
    const due = progress.due ?? new Date(lastReview.getTime() + stability * DAY_MS);
    return {
      state: {
        ...emptyState(lastReview),
        state: State.Review,
        stability,
        difficulty,
        last_review: lastReview,
        due,
        scheduled_days: Math.max(0, Math.round((due.getTime() - lastReview.getTime()) / DAY_MS)),
        reps: 1,
      },
      reviews,
    };
  }

  const last = state.last_review?.getTime() ?? 0;
  if (progress.due && progress.due.getTime() >= last) {
    state = {
      ...state,
      due: progress.due,
      scheduled_days: Math.max(0, Math.round((progress.due.getTime() - last) / DAY_MS)),
    };
  }
  return { state, reviews };
}

/**
 * The rank of a mode in the order the card will be taught, lowest first. A card with picture
 * modes keeps its own list; a text-only card is ranked as following its deck, the common case.
 */
function taughtRank(card: Pick<ImportedCard, "modes"> & Partial<Pick<ImportedCard, "fields">>) {
  const order = card.modes.some(isImageMode)
    ? card.modes
    : introductionOrder(
        { directions: null, reviewModeKeys: null },
        directionsFromModes(card.modes),
      );
  const hasMeaning = (card.fields?.meaning ?? "").trim().length > 0;
  return (mode: ReviewModeKey) =>
    (mode === "meaning_to_term" && !hasMeaning ? 1000 : 0) + order.indexOf(mode);
}

/**
 * Whether a card arrives Known: the mode it is taught first replays to Review, the state a deck's
 * list marks Known. A suspended card arrives archived and is not counted.
 */
export function arrivesKnown(
  card: Pick<ImportedCard, "modes" | "progress" | "archived"> &
    Partial<Pick<ImportedCard, "fields">>,
  now: Date,
): boolean {
  if (card.archived) return false;
  const rank = taughtRank(card);
  const [leading] = card.progress
    .filter((progress) => card.modes.includes(progress.mode))
    .sort((a, b) => rank(a.mode) - rank(b.mode));
  return leading !== undefined && replayProgress(leading, now).state.state === State.Review;
}
