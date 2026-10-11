import type { ActivityCardOut, ActivityEntryOut, ActivityPageOut } from "@lymi/core";
import { request } from "./request";

export type ActivityPage = ActivityPageOut;
export type ActivityEntry = ActivityEntryOut;
export type ActivityCard = ActivityCardOut;

export const activityApi = {
  /** One page of Activity. `cursor` comes from the previous page's `nextCursor`. */
  activity: (cursor?: string) =>
    request<ActivityPage>(`/api/activity${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`),
};
