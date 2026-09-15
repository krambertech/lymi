import { t } from "@lingui/core/macro";
import type {
  ApiKeyInput,
  AppLanguage,
  CardImageImportInput,
  CardImageOut,
  CardImagePatch,
  CardInput,
  CardPatch,
  CardSectionInput,
  DeckInput,
  Direction,
  DrawOut,
  GradeInput,
  GradeOut,
  ImportChoicesInput,
  ImportOut,
  ImportPreviewOut,
  InsightsOut,
  JoinLinkOut,
  JoinOut,
  JoinPreviewOut,
  MemberRole,
  PushEndpointInput,
  PushSubscriptionInput,
  Rating,
  ReminderTime,
  ReviewDayProgress,
  ReviewMode,
  Round,
  RoundsOut,
  Scope,
  SectionArchiveInput,
  SectionInput,
  SectionOut,
  SectionsOut,
  SeriesArchiveInput,
  SeriesDecksInput,
  SeriesInput,
  SeriesOut,
  SettingsPatch,
  StreakOut,
} from "@lymi/core";
import type {
  Card as CardRow,
  CardState as CardStateRow,
  Deck,
  Review as ReviewRow,
} from "@lymi/core/schema";

export type CardImage = CardImageOut;
/** A card as the API sends it: its own review modes or null when it follows its deck, and its picture. */
export type Card = Omit<CardRow, "reviewModeKeys"> & {
  reviewModes: ReviewMode[] | null;
  image: CardImage | null;
};
/** `direction` is the legacy name of a text mode, and null for a picture mode. */
export type CardState = Omit<CardStateRow, "mode" | "direction"> & {
  mode: ReviewMode;
  direction: Direction | null;
};
export type Review = Omit<ReviewRow, "mode" | "direction"> & {
  mode: ReviewMode;
  direction: Direction | null;
};

/** The device's IANA zone. The server decides whether it moves the review day. */
export function deviceTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      // A form body sets its own multipart boundary.
      headers: {
        ...(init?.body instanceof FormData ? {} : { "content-type": "application/json" }),
        ...(init?.headers ?? {}),
      },
      credentials: "include",
    });
  } catch {
    // Status 0 is what the grade outbox reads as offline.
    throw new ApiError(0, unreachable());
  }
  if (res.status === 401) throw new ApiError(401, t`Sign in required`);
  if (!res.ok) throw new ApiError(res.status, await failureMessage(res));
  return (await res.json()) as T;
}

function unreachable() {
  return t`Couldn’t reach Lymi. Check your connection and try again.`;
}

/**
 * The server's `error` is English and meant for integrations, so the learner sees a catalog
 * sentence instead; a 400 keeps the schema's own message, which is written for a person.
 */
async function failureMessage(res: Response): Promise<string> {
  if (res.status === 400) {
    const body = (await res.json().catch(() => null)) as { issues?: unknown } | null;
    const issue: unknown = Array.isArray(body?.issues) ? body.issues[0] : undefined;
    if (issue && typeof issue === "object" && "message" in issue) {
      if (typeof issue.message === "string" && issue.message) return issue.message;
    }
  }
  if (res.status >= 500) return unreachable();
  if (res.status === 403) return t`Only the deck’s owner can change this.`;
  if (res.status === 404) return t`That’s no longer here. Reload to see what changed.`;
  return t`That didn’t go through. Reload and try again.`;
}

/** The sentence to show for a failed request, whatever was thrown. */
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : unreachable();
}

export type Me = { id: string; name: string; email: string };
export type Settings = {
  userId: string;
  appLanguage: AppLanguage | null;
  meaningLanguage: string;
  dailyGoal: number;
  dailyGoalChosenAt: string | null;
  reviewTimezone: string | null;
  reviewTimezoneMode: "automatic" | "manual";
  createdAt: string;
  updatedAt: string;
};
export type DeckSummary = Pick<
  Deck,
  | "id"
  | "name"
  | "description"
  | "defaultLanguage"
  | "directions"
  | "position"
  | "seriesId"
  | "sectionsInOrder"
> & {
  reviewModes: ReviewMode[];
  total: number;
  due: number;
  /** The learner's role in the deck and who owns it. Only the owner writes. ADR 0011. */
  role: MemberRole;
  owner: { id: string; name: string };
};
/** A deck's section with the learner's standing in it. */
export type Section = SectionOut;
/** A deck's sections in order and where the learner is. */
export type Sections = SectionsOut;
/** A series as the API sends it: its active decks in order, and what they add up to. */
export type Series = SeriesOut;
/** What a review draws from: every deck, one deck, or one of the learner's series. */
export type ReviewScope = { deck?: string | undefined; series?: string | undefined };
/** One cache key per scope, so a series review and a deck review never share a draw. */
export const scopeKey = (scope: ReviewScope = {}) =>
  scope.deck ? `deck:${scope.deck}` : scope.series ? `series:${scope.series}` : "all";
const scopeParams = (scope: ReviewScope = {}) => ({
  ...(scope.deck ? { deck: scope.deck } : {}),
  ...(scope.series ? { series: scope.series } : {}),
});

export type QueueItem = {
  card: Card;
  mode: ReviewMode;
  /** Present for text modes only. */
  direction?: Direction;
  stateId: string;
  fsrsState: number;
  /** Absent once a grade since the fetch has moved the schedule. */
  next?: Record<Rating, string> | undefined;
};
export type Queue = { total: number; items: QueueItem[] };
/** `GET /api/review/draw`, with cards in the shape the rest of the client reads. */
export type Draw = Omit<DrawOut, "cards"> & {
  cards: (Omit<DrawOut["cards"][number], "card"> & { card: Card })[];
};
export type CardEvent = {
  id: string;
  actor: Card["createdBy"];
  action: string;
  at: string;
  payload: unknown;
};
export type CardHistory = { states: CardState[]; reviews: Review[]; events: CardEvent[] };
/** Mirrors AddCardOutcome on the server. A duplicate is skipped and names the card that exists. */
export type AddCardOutcome =
  | { status: "added"; card: Card }
  | { status: "skipped"; term: string; existing: Card; deckName: string };

export type ApiKeySummary = {
  id: string;
  name: string | null;
  start: string | null;
  scope: Scope;
  lastRequest: string | null;
  createdAt: string;
};
/** Only the create response carries the plain key. */
export type ApiKeyCreated = ApiKeySummary & { key: string };

/** An MCP client the learner let in on the consent screen. */
export type ConnectedApp = {
  id: string;
  clientId: string;
  name: string | null;
  scope: Scope;
  createdAt: string;
  updatedAt: string;
};

export type Import = ImportOut;
export type ImportPreview = ImportPreviewOut;

export type PushSubscriptionStatus = {
  enabled: boolean;
  reminderTime: ReminderTime | null;
  timezone: string | null;
};

export const api = {
  me: () => request<Me>("/api/me"),
  imports: () => request<Import[]>("/api/imports"),
  import: (id: string) => request<Import>(`/api/imports/${id}`),
  startImport: (file: { name: string; size: number }) =>
    request<Import>("/api/imports", {
      method: "POST",
      body: JSON.stringify({ fileName: file.name, byteSize: file.size }),
    }),
  /** One part of the file. A Blob body carries its own length, which the route requires. */
  uploadImportPart: (id: string, part: number, body: Blob, signal?: AbortSignal) =>
    request<Import>(`/api/imports/${id}/parts/${part}`, {
      method: "PUT",
      body,
      headers: { "content-type": "application/octet-stream" },
      ...(signal ? { signal } : {}),
    }),
  completeImport: (id: string) =>
    request<Import>(`/api/imports/${id}/complete`, { method: "POST" }),
  previewImport: (id: string, choices: ImportChoicesInput) =>
    request<ImportPreview>(`/api/imports/${id}/preview`, {
      method: "POST",
      body: JSON.stringify(choices),
    }),
  confirmImport: (id: string, choices: ImportChoicesInput) =>
    request<Import>(`/api/imports/${id}/confirm`, {
      method: "POST",
      body: JSON.stringify(choices),
    }),
  cancelImport: (id: string) => request<Import>(`/api/imports/${id}/cancel`, { method: "POST" }),
  archiveImport: (id: string) => request<Import>(`/api/imports/${id}/archive`, { method: "POST" }),
  restoreImport: (id: string) => request<Import>(`/api/imports/${id}/restore`, { method: "POST" }),
  settings: () => request<Settings>("/api/settings"),
  updateSettings: (body: SettingsPatch) =>
    request<Settings>("/api/settings", { method: "PATCH", body: JSON.stringify(body) }),
  decks: () => request<DeckSummary[]>("/api/decks"),
  createDeck: (body: DeckInput) =>
    request<Deck>("/api/decks", { method: "POST", body: JSON.stringify(body) }),
  updateDeck: (id: string, body: { [K in keyof DeckInput]?: DeckInput[K] | undefined }) =>
    request<Deck>(`/api/decks/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  archiveDeck: (id: string) =>
    request<{ ok: true }>(`/api/decks/${id}/archive`, { method: "POST" }),
  restoreDeck: (id: string) =>
    request<{ ok: true }>(`/api/decks/${id}/restore`, { method: "POST" }),
  series: () => request<Series[]>("/api/series"),
  archivedSeries: () => request<Series[]>("/api/series?archived=true"),
  createSeries: (body: SeriesInput) =>
    request<Series>("/api/series", { method: "POST", body: JSON.stringify(body) }),
  renameSeries: (id: string, name: string) =>
    request<Series>(`/api/series/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
  setSeriesDecks: (id: string, body: SeriesDecksInput) =>
    request<Series>(`/api/series/${id}/decks`, { method: "PUT", body: JSON.stringify(body) }),
  reorderSeries: (seriesIds: string[]) =>
    request<Series[]>("/api/series/order", {
      method: "PUT",
      body: JSON.stringify({ seriesIds }),
    }),
  archiveSeries: (id: string, body: SeriesArchiveInput) =>
    request<{ ok: true }>(`/api/series/${id}/archive`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  restoreSeries: (id: string) =>
    request<{ ok: true }>(`/api/series/${id}/restore`, { method: "POST" }),
  sections: (deckId: string) => request<Sections>(`/api/decks/${deckId}/sections`),
  archivedSections: (deckId: string) =>
    request<Sections>(`/api/decks/${deckId}/sections?archived=true`),
  createSection: (deckId: string, body: SectionInput) =>
    request<Section>(`/api/decks/${deckId}/sections`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  renameSection: (id: string, name: string) =>
    request<Section>(`/api/sections/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
  reorderSections: (deckId: string, sectionIds: string[]) =>
    request<Sections>(`/api/decks/${deckId}/sections/order`, {
      method: "PUT",
      body: JSON.stringify({ sectionIds }),
    }),
  moveCardsToSection: (deckId: string, body: CardSectionInput) =>
    request<Sections>(`/api/decks/${deckId}/cards/section`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  archiveSection: (id: string, body: SectionArchiveInput) =>
    request<{ ok: true }>(`/api/sections/${id}/archive`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  restoreSection: (id: string) =>
    request<{ ok: true }>(`/api/sections/${id}/restore`, { method: "POST" }),
  startSection: (id: string) => request<Sections>(`/api/sections/${id}/start`, { method: "POST" }),
  joinLink: (deckId: string) => request<JoinLinkOut>(`/api/decks/${deckId}/join-link`),
  turnOnJoinLink: (deckId: string) =>
    request<JoinLinkOut>(`/api/decks/${deckId}/join-link`, { method: "POST" }),
  turnOffJoinLink: (deckId: string) =>
    request<{ ok: true }>(`/api/decks/${deckId}/join-link`, { method: "DELETE" }),
  joinPreview: (token: string) => request<JoinPreviewOut>(`/api/join/${encodeURIComponent(token)}`),
  /** Holds the link in a short-lived cookie so the sign-in that follows joins the deck. */
  holdJoinLink: (token: string) =>
    request<{ ok: true }>(`/api/join/${encodeURIComponent(token)}/sign-in`, { method: "POST" }),
  join: (token: string) =>
    request<JoinOut>(`/api/join/${encodeURIComponent(token)}`, { method: "POST" }),
  deckCards: (deckId: string) =>
    request<{ card: Card; state: CardState | null }[]>(`/api/decks/${deckId}/cards`),
  addCard: (body: CardInput) =>
    request<AddCardOutcome>("/api/cards", { method: "POST", body: JSON.stringify(body) }),
  /** Send only the fields that changed. `deckId` moves the card to another deck. */
  updateCard: (id: string, body: CardPatch) =>
    request<Card>(`/api/cards/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  /** Every review and every write, newest first. */
  cardHistory: (id: string) => request<CardHistory>(`/api/cards/${id}/history`),
  audioUrl: (cardId: string) => `/api/audio/${encodeURIComponent(cardId)}`,
  /** `version` is the card's `imageVersion` as last read; null expects a card with no picture yet. */
  uploadCardImage: (id: string, file: Blob, version: string | null, description?: string) => {
    const form = new FormData();
    form.set("file", file);
    form.set("version", version ?? "");
    if (description) form.set("description", description);
    return request<Card>(`/api/cards/${id}/image`, { method: "PUT", body: form });
  },
  importCardImage: (id: string, body: CardImageImportInput) =>
    request<Card>(`/api/cards/${id}/image/import`, { method: "POST", body: JSON.stringify(body) }),
  describeCardImage: (id: string, body: CardImagePatch) =>
    request<Card>(`/api/cards/${id}/image`, { method: "PATCH", body: JSON.stringify(body) }),
  archiveCardImage: (id: string, version: string | null) =>
    request<Card>(`/api/cards/${id}/image/archive`, {
      method: "POST",
      body: JSON.stringify({ version }),
    }),
  archiveCard: (id: string) =>
    request<{ ok: true }>(`/api/cards/${id}/archive`, { method: "POST" }),
  restoreCard: (id: string) =>
    request<{ ok: true }>(`/api/cards/${id}/restore`, { method: "POST" }),
  keys: () => request<ApiKeySummary[]>("/api/keys"),
  createKey: (body: ApiKeyInput) =>
    request<ApiKeyCreated>("/api/keys", { method: "POST", body: JSON.stringify(body) }),
  revokeKey: (id: string) => request<{ ok: true }>(`/api/keys/${id}`, { method: "DELETE" }),
  connectedApps: () => request<ConnectedApp[]>("/api/connected-apps"),
  disconnect: (id: string) =>
    request<{ ok: true }>(`/api/connected-apps/${id}`, { method: "DELETE" }),
  pushConfig: () => request<{ publicKey: string }>("/api/push/config"),
  pushStatus: (body: PushEndpointInput) =>
    request<PushSubscriptionStatus>("/api/push/status", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  savePushSubscription: (body: PushSubscriptionInput) =>
    request<PushSubscriptionStatus>("/api/push/subscription", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  removePushSubscription: (body: PushEndpointInput) =>
    request<{ ok: true }>("/api/push/subscription", {
      method: "DELETE",
      body: JSON.stringify(body),
    }),
  queue: (scope?: ReviewScope, round?: Round) => {
    const params = new URLSearchParams(scopeParams(scope));
    if (round) params.set("round", round);
    const search = params.toString();
    return request<Queue>(`/api/review/queue${search ? `?${search}` : ""}`);
  },
  rounds: () => request<RoundsOut>(`/api/review/rounds?tz=${encodeURIComponent(deviceTimezone())}`),
  /** What the review draws from; `tz` only matters until the review zone is known. */
  draw: (scope?: ReviewScope) =>
    request<Draw>(
      `/api/review/draw?${new URLSearchParams({ tz: deviceTimezone(), ...scopeParams(scope) })}`,
    ),
  streak: () => request<StreakOut>(`/api/stats/streak?tz=${encodeURIComponent(deviceTimezone())}`),
  /** Settle today: confirms a nothing-due day, or an exhausted one. Send from a visible page. */
  checkToday: () =>
    request<ReviewDayProgress>("/api/review/today", {
      method: "POST",
      body: JSON.stringify({ timezone: deviceTimezone() }),
    }),
  reportTimezone: () =>
    request<Settings>("/api/settings/timezone/device", {
      method: "PUT",
      body: JSON.stringify({ timezone: deviceTimezone() }),
    }),
  insights: (period: 30 | 90 | 0 = 30) =>
    request<InsightsOut>(
      `/api/stats/insights?period=${period}&tz=${encodeURIComponent(
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      )}`,
    ),
  grade: (body: GradeInput) =>
    request<GradeOut>("/api/review/grade", {
      method: "POST",
      body: JSON.stringify({
        ...body,
        reviewedAt: (body.reviewedAt ?? new Date()).toISOString(),
        timezone: body.timezone ?? deviceTimezone(),
      }),
    }),
};
