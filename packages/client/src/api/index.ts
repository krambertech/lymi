/**
 * The client's calls to the product API, one module per resource. `api` is one flat object so
 * every caller keeps a single import; each resource owns its own methods and response types.
 */
export type { Me } from "./account";
export type { ActivityCard, ActivityEntry, ActivityPage } from "./activity";
export type {
  AddCardOutcome,
  Card,
  CardEvent,
  CardHistory,
  CardHit,
  CardImage,
  CardSearch,
  CardSearchPage,
  CardState,
  Review,
} from "./cards";
export type { ConnectedApp } from "./connected-apps";
export type { Deck, DeckSummary } from "./decks";
export type { Export } from "./exports";
export type { Import, ImportPreview } from "./imports";
export type { ApiKeyCreated, ApiKeySummary } from "./keys";
export type { LessonEvent, LessonQuestion, LessonRead, LessonTerm } from "./lessons";
export type { PushSubscriptionStatus } from "./push";
export {
  ApiError,
  apiUrl,
  deviceTimezone,
  errorMessage,
  RequestTimeout,
  refusalCode,
  refusalDetail,
} from "./request";
export type { Draw, Queue, QueueItem, ReviewScope } from "./review";
export { scopeKey } from "./review";
export type { Section, Sections } from "./sections";
export type { Series } from "./series";
export type { Settings } from "./settings";
export type { Invitation, Member } from "./sharing";
export type { DeckTags, Tag } from "./tags";

import { accountApi } from "./account";
import { activityApi } from "./activity";
import { cardsApi } from "./cards";
import { connectedAppsApi } from "./connected-apps";
import { decksApi } from "./decks";
import { exploreApi } from "./explore";
import { exportsApi } from "./exports";
import { feedbackApi } from "./feedback";
import { importsApi } from "./imports";
import { keysApi } from "./keys";
import { lessonsApi } from "./lessons";
import { pushApi } from "./push";
import { reviewApi } from "./review";
import { sectionsApi } from "./sections";
import { seriesApi } from "./series";
import { settingsApi } from "./settings";
import { sharingApi } from "./sharing";
import { statsApi } from "./stats";
import { tagsApi } from "./tags";

export const api = {
  ...accountApi,
  ...activityApi,
  ...cardsApi,
  ...connectedAppsApi,
  ...decksApi,
  ...exploreApi,
  ...exportsApi,
  ...feedbackApi,
  ...importsApi,
  ...keysApi,
  ...lessonsApi,
  ...pushApi,
  ...reviewApi,
  ...sectionsApi,
  ...seriesApi,
  ...settingsApi,
  ...sharingApi,
  ...statsApi,
  ...tagsApi,
};
