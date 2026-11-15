import type { ActivityCardOut, ActivityEntryOut, ActivityPageOut } from "@lymi/core";
import { request } from "./request";

export type ActivityPage = ActivityPageOut;
export type ActivityEntry = ActivityEntryOut;
export type ActivityCard = ActivityCardOut;

export const activityApi = {
  /** One page of Activity, or of one app's writes. `cursor` comes from the previous page's `nextCursor`. */
  activity: (cursor?: string, app?: string) => {
    const query = new URLSearchParams();
    if (cursor) query.set("cursor", cursor);
    if (app) query.set("app", app);
    const search = query.toString();
    return request<ActivityPage>(`/api/activity${search ? `?${search}` : ""}`);
  },
};
