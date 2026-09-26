import {
  CARRY_OVER_EVERY,
  NEW_CARD_SLOT_EVERY,
  OLDEST_UNSEEN_SLOT_EVERY,
  RETURN_GAPS,
  RETURN_JITTER,
  REVIEW_ODDS_POWER,
  SLIPPING_RETURN_GAP,
  UNSEEN_HALF_LIFE_DAYS,
} from "../src/draw";
import { DESIRED_RETENTION, LEARNING_STEPS } from "../src/fsrs";
import { SLIPPING_FORGOTTEN_DAYS, SLIPPING_RECENT_DAYS } from "../src/slipping";
import { DAY_STUDY, dayStudy } from "./day";
import { intervalGuide } from "./intervals";
import { RECALL } from "./learner";
import results from "./results.json";
import { NEW_CARD_STUDY, REVIEW_ORDER_STUDY } from "./year";

export type { DayStudy, DayTile } from "./day";
export type { IntervalGuide, Step } from "./intervals";
export type { NewCardRuleId, ReviewOrderId } from "./year";

/**
 * Everything the public scheduling page shows, computed from the rules in `src`. The interval
 * examples and the day run at build time; the year-long studies are read from `results.json`,
 * which `pnpm --filter @lymi/core simulate` writes and a test keeps current.
 */
export function schedulingGuide() {
  return {
    constants: {
      retention: DESIRED_RETENTION,
      learningStep: LEARNING_STEPS[0],
      newCardSlotEvery: NEW_CARD_SLOT_EVERY,
      oldestSlotEvery: OLDEST_UNSEEN_SLOT_EVERY,
      returnGaps: [...RETURN_GAPS],
      returnJitter: RETURN_JITTER,
      slippingReturnGap: SLIPPING_RETURN_GAP,
      slippingForgottenDays: SLIPPING_FORGOTTEN_DAYS,
      slippingRecentDays: SLIPPING_RECENT_DAYS,
      carryOverEvery: CARRY_OVER_EVERY,
      reviewOddsPower: REVIEW_ODDS_POWER,
      unseenHalfLifeDays: UNSEEN_HALF_LIFE_DAYS,
    },
    intervals: intervalGuide(),
    day: { ...DAY_STUDY, ...dayStudy() },
    recall: RECALL,
    reviewOrder: {
      ...REVIEW_ORDER_STUDY,
      seeds: [...REVIEW_ORDER_STUDY.seeds],
      rows: results.reviewOrder,
    },
    newCards: { ...NEW_CARD_STUDY, rows: results.newCards },
  };
}

export type SchedulingGuide = ReturnType<typeof schedulingGuide>;
